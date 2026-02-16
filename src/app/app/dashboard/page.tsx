'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
    XCircle,
    Radio
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function OracleDashboard() {
    const router = useRouter()
    const { profile, setProfile } = useAuthStore()
    const [stats, setStats] = useState({
        totalEarnings: 0,
        completedConsultations: 0,
        averageRating: 0,
        totalHours: 0
    })
    const [loading, setLoading] = useState(true)

    const [pendingConsultations, setPendingConsultations] = useState<any[]>([])

    useEffect(() => {
        if (profile?.id) {
            fetchStats()
            fetchPendingConsultations()
        }
    }, [profile?.id])

    const fetchPendingConsultations = async () => {
        if (!profile?.id) return
        const { data } = await supabase
            .from('consultations')
            .select('*, client:profiles!client_id(full_name, avatar_url)')
            .eq('oracle_id', profile.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (data) setPendingConsultations(data)
    }

    const fetchStats = async () => {
        try {
            // 1. Ganhos Totais
            const { data: earnings, error: eError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', profile!.id)
                .eq('type', 'earnings')

            if (eError) console.warn('Earnings fetch issue (likely migration pending):', eError)

            const total = earnings?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0

            // 2. Consultas concluídas
            const { count: completed, error: cError } = await supabase
                .from('consultations')
                .select('*', { count: 'exact', head: true })
                .eq('oracle_id', profile!.id)
                .in('status', ['answered', 'completed'])

            if (cError) console.warn('Consultations fetch issue:', cError)

            // 3. Média de Avaliações
            const { data: ratings, error: rError } = await supabase
                .from('ratings')
                .select('stars')
                .eq('oracle_id', profile!.id)

            if (rError) console.warn('Ratings fetch issue (likely migration pending):', rError)

            const avg = ratings && ratings.length > 0
                ? ratings.reduce((sum: number, r: any) => sum + r.stars, 0) / ratings.length
                : 0

            setStats({
                totalEarnings: total,
                completedConsultations: completed || 0,
                averageRating: Number(avg.toFixed(1)),
                totalHours: 0
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

    // const handleEnterServiceRoom = () => {
    //     if (!profile?.video_enabled) {
    //         toast.error('Habilite o atendimento por vídeo primeiro.')
    //         return
    //     }
    //     router.push('/app/dashboard/sala')
    // }

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            {/* Alert for Pending Consultations */}
            {pendingConsultations.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-neon-purple/20 border border-neon-purple/50 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(168,85,247,0.15)]"
                >
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-neon-purple rounded-xl text-white animate-bounce">
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Você tem {pendingConsultations.length} mensagem{pendingConsultations.length > 1 ? 's' : ''} pendente{pendingConsultations.length > 1 ? 's' : ''}!</h3>
                            <p className="text-sm text-slate-300">Responda para liberar seus créditos e guiar seus consulentes.</p>
                        </div>
                    </div>
                    <NeonButton
                        variant="purple"
                        onClick={() => router.push('/app/mensagens?view=oracle')}
                    >
                        Ver Mensagens
                    </NeonButton>
                </motion.div>
            )}

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">Painel do <span className="neon-text-purple">Oraculista</span></h1>
                    <p className="text-slate-400">Gerencie seus atendimentos e acompanhe seus resultados.</p>
                </div>

                <div className="flex flex-wrap bg-white/5 border border-white/10 rounded-2xl p-2 gap-2">
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

                    {/* Botão de Status Online/Offline - AGORA NO HEADER GLOBAL */}
                    {profile?.video_enabled && (
                        <div className="pl-2 border-l border-white/10 ml-2 flex items-center">
                            <span className={`text-xs font-bold ${profile?.is_online ? 'text-green-400' : 'text-slate-500'}`}>
                                {profile?.is_online ? 'ONLINE GLOBALMENTE' : 'OFFLINE'}
                            </span>
                        </div>
                    )}
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <GlassCard className="border-white/5">
                    <div className="flex items-center text-neon-gold mb-3">
                        <Wallet size={20} className="mr-2" />
                        <span className="text-sm font-bold uppercase tracking-wider">Ganhos Totais</span>
                    </div>
                    <p className="text-3xl font-bold text-white tracking-tight">{stats.totalEarnings} <span className="text-sm text-slate-500 font-normal">Créditos</span></p>
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

                    {/* Call to Action for Video */}
                    {profile?.video_enabled && !profile?.is_online && (
                        <div className="bg-gradient-to-r from-neon-cyan/10 to-transparent p-6 rounded-2xl border border-neon-cyan/20 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-neon-cyan/20 rounded-full text-neon-cyan animate-pulse">
                                    <Radio size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Você está Offline para vídeo</h3>
                                    <p className="text-sm text-slate-400">Clique no botão "Offline" no topo da página para ficar Online.</p>
                                </div>
                            </div>
                        </div>
                    )}

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
                                <span className="text-neon-cyan font-bold">{profile?.credits_per_minute || 0} Créditos</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                <div>
                                    <p className="text-sm font-bold text-white">Tarifa Inicial</p>
                                    <p className="text-xs text-slate-500">Taxa para abrir mensagem</p>
                                </div>
                                <span className="text-neon-gold font-bold">{profile?.initial_fee_credits || 0} Créditos</span>
                            </div>
                            <NeonButton
                                variant="purple"
                                fullWidth
                                size="sm"
                                className="mt-4"
                                onClick={() => router.push('/app/dashboard/perfil')}
                            >
                                Editar Tarifas
                            </NeonButton>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
