'use client'

import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Wallet, TrendingUp, History, Calendar, ArrowUpRight, Sparkles } from 'lucide-react'
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
            // Fetch finished consultations
            const { data: consultations, error } = await supabase
                .from('consultations')
                .select('*, profiles!client_id(full_name)')
                .eq('oracle_id', profile!.id)
                .order('created_at', { ascending: false })

            if (error) throw error

            const total = consultations?.reduce((acc, c) => acc + (c.credits_consumed || 0), 0) || 0

            const firstDayOfMonth = new Date()
            firstDayOfMonth.setDate(1)
            firstDayOfMonth.setHours(0, 0, 0, 0)

            const monthly = consultations
                ?.filter(c => new Date(c.created_at) >= firstDayOfMonth)
                .reduce((acc, c) => acc + (c.credits_consumed || 0), 0) || 0

            setStats({
                totalEarned: total,
                monthlyEarned: monthly,
                pendingPayout: total // Simplified for now
            })
            setHistory(consultations || [])
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
                    <h3 className="text-3xl font-bold text-white tracking-tight">{stats.totalEarned.toLocaleString()} <span className="text-sm font-normal text-slate-500">CR</span></h3>
                </GlassCard>

                <GlassCard glowColor="cyan" className="border-white/5">
                    <div className="p-3 rounded-xl bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 w-fit mb-4">
                        <TrendingUp size={20} />
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Este Mês</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{stats.monthlyEarned.toLocaleString()} <span className="text-sm font-normal text-slate-500">CR</span></h3>
                </GlassCard>

                <GlassCard glowColor="gold" className="border-white/5">
                    <div className="p-3 rounded-xl bg-neon-gold/10 text-neon-gold border border-neon-gold/20 w-fit mb-4">
                        <Sparkles size={20} />
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Pendente Payout</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{stats.pendingPayout.toLocaleString()} <span className="text-sm font-normal text-slate-500">CR</span></h3>
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
                                <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ganhos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {history.map((item) => (
                                <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="py-4">
                                        <div className="flex items-center text-sm text-white">
                                            <Calendar size={14} className="mr-2 text-slate-500" />
                                            {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </div>
                                    </td>
                                    <td className="py-4 font-medium text-slate-300">{(item.profiles as any)?.full_name || 'Anônimo'}</td>
                                    <td className="py-4">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${item.type === 'video' ? 'bg-neon-cyan/10 text-neon-cyan' : 'bg-neon-purple/10 text-neon-purple'}`}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="py-4 text-sm text-slate-400">{item.duration_seconds ? `${Math.floor(item.duration_seconds / 60)} min` : '-'}</td>
                                    <td className="py-4 text-right">
                                        <span className="text-sm font-bold text-neon-gold">+{item.credits_consumed || 0} CR</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    )
}
