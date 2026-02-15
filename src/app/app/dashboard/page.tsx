'use client'

import React, { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import {
    Video,
    MessageSquare,
    TrendingUp,
    Clock,
    Star,
    Wallet,
    Power,
    CheckCircle2,
    XCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function OracleDashboard() {
    const { profile, setProfile } = useAuthStore()
    const [stats, setStats] = useState({
        totalEarnings: 0,
        completedConsultations: 0,
        averageRating: 0,
        totalHours: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (profile?.id) {
            fetchStats()
        }
    }, [profile?.id])

    const fetchStats = async () => {
        try {
            // 1. Ganhos Totais (Transações do tipo 'consultation_fee' para o oráculo)
            // Nota: Isso depende da estrutura exata da tabela de transações
            const { data: earnings } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', profile!.id)
                .eq('type', 'earnings')

            const total = earnings?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

            // 2. Consultas concluídas
            const { count: completed } = await supabase
                .from('consultations')
                .select('*', { count: 'exact', head: true })
                .eq('oracle_id', profile!.id)
                .eq('status', 'answered')

            // 3. Média de Avaliações
            const { data: ratings } = await supabase
                .from('ratings')
                .select('stars')
                .eq('oracle_id', profile!.id)

            const avg = ratings?.length
                ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
                : 0

            setStats({
                totalEarnings: total,
                completedConsultations: completed || 0,
                averageRating: Number(avg.toFixed(1)),
                totalHours: 0 // Placeholder por enquanto
            })
        } catch (err) {
            console.error('Error fetching stats:', err)
        } finally {
            setLoading(false)
        }
    }

    const toggleStatus = async (type: 'video' | 'message') => {
        const field = type === 'video' ? 'video_enabled' : 'message_enabled'
        const newValue = !profile![field as keyof typeof profile]

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ [field]: newValue })
                .eq('id', profile!.id)

            if (error) throw error

            setProfile({ ...profile!, [field]: newValue })
            toast.success(`${type === 'video' ? 'Vídeo' : 'Mensagens'} ${newValue ? 'ativado' : 'desativado'}`)
        } catch (err) {
            toast.error('Erro ao atualizar status')
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">Painel do <span className="neon-text-purple">Oraculista</span></h1>
                    <p className="text-slate-400">Gerencie seus atendimentos e acompanhe seus resultados.</p>
                </div>

                <div className="flex bg-white/5 border border-white/10 rounded-2xl p-2 gap-2">
                    <button
                        onClick={() => toggleStatus('message')}
                        className={`flex items-center px-4 py-2 rounded-xl transition-all ${profile?.message_enabled
                                ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                : 'text-slate-500 hover:text-white'
                            }`}
                    >
                        <MessageSquare size={18} className="mr-2" />
                        Mensagens
                    </button>
                    <button
                        onClick={() => toggleStatus('video')}
                        className={`flex items-center px-4 py-2 rounded-xl transition-all ${profile?.video_enabled
                                ? 'bg-neon-cyan text-deep-space font-bold shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                                : 'text-slate-500 hover:text-white'
                            }`}
                    >
                        <Video size={18} className="mr-2" />
                        Vídeo
                    </button>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <GlassCard className="border-white/5">
                    <div className="flex items-center text-neon-gold mb-3">
                        <Wallet size={20} className="mr-2" />
                        <span className="text-sm font-bold uppercase tracking-wider">Ganhos Totais</span>
                    </div>
                    <p className="text-3xl font-bold text-white tracking-tight">{stats.totalEarnings} <span className="text-sm text-slate-500 font-normal">CR</span></p>
                </GlassCard>

                <GlassCard className="border-white/5">
                    <div className="flex items-center text-neon-purple mb-3">
                        <CheckCircle2 size={20} className="mr-2" />
                        <span className="text-sm font-bold uppercase tracking-wider">Consultas</span>
                    </div>
                    <p className="text-3xl font-bold text-white tracking-tight">{stats.completedConsultations}</p>
                </GlassCard>

                <GlassCard className="border-white/5">
                    <div className="flex items-center text-neon-gold mb-3">
                        <Star size={20} className="mr-2" />
                        <span className="text-sm font-bold uppercase tracking-wider">Avaliação</span>
                    </div>
                    <p className="text-3xl font-bold text-white tracking-tight">{stats.averageRating}</p>
                </GlassCard>

                <GlassCard className="border-white/5">
                    <div className="flex items-center text-neon-cyan mb-3">
                        <Clock size={20} className="mr-2" />
                        <span className="text-sm font-bold uppercase tracking-wider">Horas Online</span>
                    </div>
                    <p className="text-3xl font-bold text-white tracking-tight">{stats.totalHours}h</p>
                </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    <GlassCard className="border-white/5 h-full" hover={false}>
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-white flex items-center">
                                <TrendingUp className="text-neon-cyan mr-3" />
                                Visão Geral de Desempenho
                            </h2>
                        </div>
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/5 rounded-2xl">
                            <p className="text-slate-500 italic">Gráficos de evolução serão carregados aqui...</p>
                        </div>
                    </GlassCard>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    <GlassCard className="border-white/5" hover={false}>
                        <h2 className="text-lg font-bold text-white mb-6">Configurações Rápidas</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                <div>
                                    <p className="text-sm font-bold text-white">Tarifa por Minuto</p>
                                    <p className="text-xs text-slate-500">Valor para Video Chamadas</p>
                                </div>
                                <span className="text-neon-cyan font-bold">5.00 CR</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                <div>
                                    <p className="text-sm font-bold text-white">Tarifa Inicial</p>
                                    <p className="text-xs text-slate-500">Taxa para abrir chat</p>
                                </div>
                                <span className="text-neon-gold font-bold">0.00 CR</span>
                            </div>
                            <NeonButton variant="purple" fullWidth size="sm" className="mt-4">
                                Editar Tarifas
                            </NeonButton>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
