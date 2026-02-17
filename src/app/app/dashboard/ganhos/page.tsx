'use client'

import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Wallet, TrendingUp, History, Calendar, ArrowUpRight, Sparkles, Video, Clock, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function OracleGanhosPage() {
    const { profile } = useAuthStore()
    const [stats, setStats] = useState({
        totalEarned: 0,
        monthlyEarned: 0,
        pendingPayout: 0
    })
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (profile) fetchGanhos()
    }, [profile])

    const fetchGanhos = async () => {
        setLoading(true)
        try {
            // Fetch all earnings transactions
            // We join with profiles (via metadata.client_id or sender_id)
            // and consultations (via metadata.consultation_id)
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    consultation:consultations!transactions_metadata_consultation_id_fkey (
                        type,
                        duration_seconds,
                        total_credits
                    )
                `)
                .eq('user_id', profile!.id)
                .in('type', ['earnings', 'gift_receive'])
                .order('created_at', { ascending: false })

            if (error) throw error

            // Enrichment: Fetch client profile names for those that are not in the join
            // (transactions metadata often has client_id or sender_id)
            const enrichedHistory = await Promise.all((transactions || []).map(async (tx: any) => {
                const clientId = tx.metadata?.client_id || tx.metadata?.sender_id
                let clientName = 'Consulente'

                if (clientId) {
                    const { data: userData } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', clientId)
                        .single()

                    if (userData) clientName = userData.full_name
                }

                return { ...tx, clientName }
            }))

            const safeAmount = (amount: any) => Math.abs(Number(amount) || 0)

            const confirmedTransactions = enrichedHistory.filter(t => t.status === 'confirmed')
            const pendingTransactions = enrichedHistory.filter(t => t.status === 'pending')

            const total = confirmedTransactions.reduce((acc, t) => acc + safeAmount(t.amount), 0)

            const firstDayOfMonth = new Date()
            firstDayOfMonth.setDate(1)
            firstDayOfMonth.setHours(0, 0, 0, 0)

            const monthly = confirmedTransactions
                ?.filter(t => new Date(t.created_at) >= firstDayOfMonth)
                .reduce((acc, t) => acc + safeAmount(t.amount), 0) || 0

            const pending = pendingTransactions.reduce((acc, t) => acc + safeAmount(t.amount), 0)

            setStats({
                totalEarned: total,
                monthlyEarned: monthly,
                pendingPayout: pending
            })
            setHistory(enrichedHistory)
        } catch (err) {
            console.error('Error fetching gains:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            <header>
                <h1 className="text-3xl font-bold text-white mb-2">Meus <span className="neon-text-purple">Ganhos</span></h1>
                <p className="text-slate-400">Acompanhe seu desempenho financeiro e histórico de atendimentos.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard glowColor="purple" className="border-white/5">
                    <div className="p-3 rounded-xl bg-neon-purple/10 text-neon-purple border border-neon-purple/20 w-fit mb-4">
                        <Wallet size={20} />
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Total Ganho</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{stats.totalEarned.toLocaleString()} <span className="text-sm font-normal text-slate-500 italic">Créditos</span></h3>
                </GlassCard>

                <GlassCard glowColor="cyan" className="border-white/5">
                    <div className="p-3 rounded-xl bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 w-fit mb-4">
                        <TrendingUp size={20} />
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Este Mês</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{stats.monthlyEarned.toLocaleString()} <span className="text-sm font-normal text-slate-500 italic">Créditos</span></h3>
                </GlassCard>

                <GlassCard glowColor="gold" className="border-white/5">
                    <div className="p-3 rounded-xl bg-neon-gold/10 text-neon-gold border border-neon-gold/20 w-fit mb-4">
                        <Sparkles size={20} />
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Pendente Payout</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{stats.pendingPayout.toLocaleString()} <span className="text-sm font-normal text-slate-500 italic">Créditos</span></h3>
                </GlassCard>
            </div>

            <GlassCard className="border-white/5" hover={false}>
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-white flex items-center">
                        <History size={20} className="mr-3 text-neon-purple" /> Histórico de Atendimentos
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b border-white/5">
                                <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Data</th>
                                <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cliente</th>
                                <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo</th>
                                <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Duração</th>
                                <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ganhos Liq.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {history.map((item) => {
                                const isGift = item.type === 'gift_receive'
                                const isVideo = item.metadata?.mode === 'video' || item.consultation?.type === 'video'
                                const amount = Math.abs(Number(item.amount))
                                const duration = item.consultation?.duration_seconds || item.metadata?.duration_seconds || 0

                                return (
                                    <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 text-xs sm:text-sm">
                                            <div className="flex items-center text-white">
                                                <Calendar size={14} className="mr-2 text-slate-500 hidden sm:block" />
                                                {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                            </div>
                                        </td>
                                        <td className="py-4 font-bold text-slate-300">
                                            {item.clientName}
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center space-x-2">
                                                {isGift ? <Sparkles size={14} className="text-neon-gold" /> : isVideo ? <Video size={14} className="text-neon-cyan" /> : <MessageSquare size={14} className="text-neon-purple" />}
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${isGift ? 'bg-neon-gold/10 text-neon-gold' : isVideo ? 'bg-neon-cyan/10 text-neon-cyan' : 'bg-neon-purple/10 text-neon-purple'}`}>
                                                    {isGift ? 'Presente' : isVideo ? 'Vídeo' : 'Mensagem'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-sm text-slate-400">
                                            {isVideo && duration > 0 ? (
                                                <div className="flex items-center space-x-1">
                                                    <Clock size={12} />
                                                    <span>{Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')} min</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="py-4 text-right">
                                            <span className="text-sm font-bold text-white">+{amount} <span className="text-[10px] text-slate-500 font-normal">Créditos</span></span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    )
}
