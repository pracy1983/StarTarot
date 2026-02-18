'use client'

import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { BarChart3, TrendingUp, Wallet, ArrowUpRight, DollarSign, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AdminFinanceiroPage() {
    const [stats, setStats] = useState({
        monthlyRevenue: 0,
        creditsInCirculation: 0,
        aiCosts: 0,
        recentRecharges: [] as any[],
        oracleSplits: [] as any[]
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchFinanceData()
    }, [])

    const fetchFinanceData = async () => {
        setLoading(true)
        try {
            // 1. Monthly Revenue (confirmed credit_purchase)
            const firstDayOfMonth = new Date()
            firstDayOfMonth.setDate(1)
            firstDayOfMonth.setHours(0, 0, 0, 0)

            const { data: recharges } = await supabase
                .from('transactions')
                .select('money_amount, amount, created_at, status, profiles(full_name)')
                .eq('type', 'credit_purchase')
                .eq('status', 'confirmed')
                .order('created_at', { ascending: false })

            const monthlyRevenue = recharges
                ?.filter(r => new Date(r.created_at) >= firstDayOfMonth)
                .reduce((acc, r) => acc + (Number(r.money_amount) || 0), 0) || 0

            // 2. Credits in Circulation
            const { data: wallets } = await supabase
                .from('wallets')
                .select('balance')

            const creditsInCirculation = wallets?.reduce((acc, w) => acc + (w.balance || 0), 0) || 0

            // 3. Oracle Splits (simplified for now: sum of consultation_charge per oracle)
            const { data: consultationTx } = await supabase
                .from('consultations')
                .select('*, oracle:profiles!oracle_id(full_name, is_ai)')
                .eq('status', 'active') // Or finished

            // Mapping oracle splits (assuming 70% for human, 0% for AI in this view)
            const splitsMap = new Map()
            consultationTx?.forEach(c => {
                const name = c.oracle?.full_name || 'Desconhecido'
                const amount = Number(c.credits_consumed || 0)
                const current = splitsMap.get(name) || 0
                splitsMap.set(name, current + amount)
            })

            const oracleSplits = Array.from(splitsMap.entries()).map(([name, amount]) => ({
                name,
                amount: amount / 10, // approximate R$
                credits: amount,
                isAi: consultationTx?.find(c => c.oracle?.full_name === name)?.oracle?.is_ai
            })).sort((a, b) => b.credits - a.credits)

            setStats({
                monthlyRevenue,
                creditsInCirculation,
                aiCosts: 0, // Placeholder for actual API costs if integrated later
                recentRecharges: recharges?.slice(0, 5) || [],
                oracleSplits
            })
        } catch (err) {
            console.error('Error fetching finance data:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-neon-gold animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-full overflow-hidden">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">Fluxo <span className="neon-text-gold">Financeiro</span></h1>
                    <p className="text-slate-400 text-sm md:text-base">Controle de ganhos, comissões de oraculistas e recargas de clientes.</p>
                </div>
                <button
                    onClick={fetchFinanceData}
                    className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                >
                    Atualizar
                </button>
            </header>

            {/* Resumo Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <GlassCard glowColor="gold" className="border-white/5 overflow-hidden">
                    <div className="flex justify-between items-start mb-2 md:mb-4">
                        <div className="p-2 md:p-3 rounded-xl bg-neon-gold/10 text-neon-gold border border-neon-gold/20">
                            <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                    <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1">Receita Mensal (Est.)</p>
                    <h3 className="text-xl md:text-3xl font-bold text-white tracking-tight truncate">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.monthlyRevenue)}
                    </h3>
                </GlassCard>

                <GlassCard glowColor="purple" className="border-white/5 overflow-hidden">
                    <div className="flex justify-between items-start mb-2 md:mb-4">
                        <div className="p-2 md:p-3 rounded-xl bg-neon-purple/10 text-neon-purple border border-neon-purple/20">
                            <Wallet className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                    <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1">Total em Circulação</p>
                    <h3 className="text-xl md:text-3xl font-bold text-white tracking-tight truncate">
                        {stats.creditsInCirculation.toLocaleString()} <span className="text-[10px] md:text-sm font-normal text-slate-500">cr</span>
                    </h3>
                </GlassCard>

                <GlassCard glowColor="cyan" className="border-white/5 overflow-hidden">
                    <div className="flex justify-between items-start mb-2 md:mb-4">
                        <div className="p-2 md:p-3 rounded-xl bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">
                            <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                    <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1">Ganhos em Aberto</p>
                    <h3 className="text-xl md:text-3xl font-bold text-white tracking-tight truncate">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.oracleSplits.reduce((acc, s) => acc + s.amount, 0))}
                    </h3>
                </GlassCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Tabela de Transações Recentes */}
                <div className="xl:col-span-2">
                    <GlassCard className="border-white/5 p-4" hover={false}>
                        <h3 className="text-white font-bold mb-6 flex items-center">
                            <BarChart3 size={18} className="mr-2 text-neon-gold" /> Vendas de Créditos Recentes
                        </h3>
                        <div className="space-y-4">
                            {stats.recentRecharges.length > 0 ? stats.recentRecharges.map((tx, i) => (
                                <div key={tx.created_at + i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 transition-all hover:border-white/10">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center font-bold text-xs md:text-base">
                                            $
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{(tx.profiles as any)?.full_name || 'Cliente'}</p>
                                            <p className="text-[10px] md:text-xs text-slate-500 line-clamp-1">
                                                {format(new Date(tx.created_at), "dd/MM, HH:mm", { locale: ptBR })} • {tx.amount} cr
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white">
                                            {tx.money_amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.money_amount) : '-'}
                                        </p>
                                        <p className={`text-[10px] uppercase font-bold ${tx.status === 'confirmed' ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {tx.status === 'confirmed' ? 'Confirmado' : tx.status}
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-slate-500 italic">Nenhuma recarga confirmada encontrada.</div>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* Resumo de Pagamento a Oraculistas */}
                <div className="xl:col-span-1">
                    <GlassCard className="border-white/5 p-4" hover={true}>
                        <h3 className="text-white font-bold mb-6">Ganhos por Oraculista</h3>
                        <div className="space-y-6">
                            {stats.oracleSplits.length > 0 ? stats.oracleSplits.map((o, idx) => (
                                <div key={idx} className="flex flex-col space-y-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm text-slate-300 truncate">{o.name}</span>
                                        <span className="text-sm font-bold text-white shrink-0">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.amount)}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter truncate">
                                        {o.credits} cr • {o.isAi ? 'IA' : 'Payout'}
                                    </span>
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                                        <div
                                            className={`h-full ${o.isAi ? 'bg-neon-cyan' : 'bg-neon-purple'}`}
                                            style={{ width: `${Math.min(100, (o.credits / (stats.creditsInCirculation || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-slate-500 italic">Sem atendimentos registrados.</div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
