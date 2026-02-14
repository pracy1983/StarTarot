'use client'

import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import {
    Users,
    Brain,
    MessageSquare,
    TrendingUp,
    Plus,
    Clock,
    Sparkles,
    ArrowUpRight
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
    const router = useRouter()
    const [stats, setStats] = useState({
        totalOracles: 0,
        activeSessions: 0,
        aiOracles: 0,
        totalCreditsConsumed: 0,
    })
    const [oracles, setOracles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            // Buscar oraculistas reais
            const { data: oracleData } = await supabase
                .from('profiles')
                .select('id, full_name, is_ai, specialty, oracle_type')
                .eq('role', 'oracle')

            const oracleList = oracleData || []
            const aiCount = oracleList.filter(o => o.is_ai).length

            // Buscar sessões ativas
            const { count: activeCount } = await supabase
                .from('chats')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'active')

            // Buscar créditos consumidos hoje
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const { data: txData } = await supabase
                .from('transactions')
                .select('amount')
                .eq('type', 'consultation_charge')
                .gte('created_at', today.toISOString())

            const todayCredits = txData?.reduce((sum, t) => sum + t.amount, 0) || 0

            setStats({
                totalOracles: oracleList.length,
                activeSessions: activeCount || 0,
                aiOracles: aiCount,
                totalCreditsConsumed: todayCredits,
            })
            setOracles(oracleList)
        } catch (err) {
            console.error('Dashboard data error:', err)
        } finally {
            setLoading(false)
        }
    }

    const statCards = [
        { label: 'Total Oraculistas', value: stats.totalOracles.toString(), icon: <Users size={20} />, color: 'purple' },
        { label: 'Sessões Ativas', value: stats.activeSessions.toString(), icon: <MessageSquare size={20} />, color: 'cyan' },
        { label: 'IA Atendendo', value: stats.aiOracles.toString(), icon: <Brain size={20} />, color: 'gold' },
        { label: 'Créditos Hoje', value: `${stats.totalCreditsConsumed} CR`, icon: <TrendingUp size={20} />, color: 'cyan' },
    ]

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-raleway">Bem-vindo, <span className="neon-text-purple">Mestre do Tarot</span></h2>
                    <p className="text-slate-400 text-sm">O marketplace está pulsando. Veja as métricas de hoje.</p>
                </div>
                <button
                    onClick={() => router.push('/admin/oraculistas/novo')}
                    className="flex items-center px-6 py-2.5 bg-neon-purple rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] text-white font-bold hover:scale-105 transition-all"
                >
                    <Plus size={20} className="mr-2" /> Novo Oraculista
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, idx) => (
                    <GlassCard key={idx} className="border-white/5" glowColor={stat.color as any}>
                        <div className="flex justify-between items-center mb-4">
                            <div className={`p-3 rounded-xl bg-deep-space border border-white/10 text-neon-${stat.color}`}>
                                {stat.icon}
                            </div>
                        </div>
                        <p className="text-slate-400 text-sm mb-1">{stat.label}</p>
                        <h3 className="text-2xl font-bold text-white">{loading ? '...' : stat.value}</h3>
                    </GlassCard>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Atividade Recente */}
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard className="border-white/5" hover={false}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold flex items-center">
                                <Clock size={18} className="mr-2 text-neon-cyan" /> Consultas em Tempo Real
                            </h3>
                        </div>

                        <div className="space-y-4">
                            {stats.activeSessions === 0 ? (
                                <p className="text-center text-sm text-slate-500 py-8">Nenhuma consulta ativa no momento.</p>
                            ) : (
                                <p className="text-center text-sm text-slate-400 py-4">
                                    {stats.activeSessions} consulta(s) em andamento
                                </p>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* Oraculistas Cadastrados */}
                <div className="lg:col-span-1 space-y-6">
                    <GlassCard className="border-white/5" glowColor="purple" hover={false}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold flex items-center">
                                <Sparkles size={18} className="mr-2 text-neon-gold" /> Oraculistas
                            </h3>
                        </div>
                        <div className="space-y-4">
                            {oracles.length === 0 ? (
                                <p className="text-center text-xs text-slate-500">Nenhum oraculista cadastrado.</p>
                            ) : (
                                oracles.slice(0, 5).map((o, idx) => (
                                    <div key={o.id} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xs font-bold text-slate-600">#{idx + 1}</span>
                                            <span className="text-sm font-medium text-white">{o.full_name}</span>
                                        </div>
                                        <div className={`text-[10px] px-2 py-0.5 rounded-full ${o.is_ai ? 'bg-neon-cyan/10 text-neon-cyan' : 'bg-neon-purple/10 text-neon-purple'}`}>
                                            {o.is_ai ? 'IA' : 'Humano'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
