'use client'

import React from 'react'
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

export default function AdminDashboard() {
    const router = useRouter()

    const stats = [
        { label: 'Total Oraculistas', value: '12', icon: <Users size={20} />, color: 'purple' },
        { label: 'Sessões Ativas', value: '4', icon: <MessageSquare size={20} />, color: 'cyan' },
        { label: 'IA Atendendo', value: '7', icon: <Brain size={20} />, color: 'gold' },
        { label: 'Ganhos Hoje', value: 'R$ 450', icon: <TrendingUp size={20} />, color: 'cyan' },
    ]

    return (
        <div className="p-8 space-y-8">
            {/* Header com Boas-vindas */}
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
                {stats.map((stat, idx) => (
                    <GlassCard key={idx} className="border-white/5" glowColor={stat.color as any}>
                        <div className="flex justify-between items-center mb-4">
                            <div className={`p-3 rounded-xl bg-deep-space border border-white/10 text-neon-${stat.color}`}>
                                {stat.icon}
                            </div>
                            <span className="flex items-center text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                                +12% <ArrowUpRight size={12} className="ml-1" />
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm mb-1">{stat.label}</p>
                        <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
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
                            <button className="text-xs text-neon-cyan hover:underline">Ver todas</button>
                        </div>

                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 group hover:border-white/10 transition-all">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-neon-purple">
                                            C
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">Cliente {i} <span className="text-slate-500 font-normal">com</span> Oraculista {i}</p>
                                            <p className="text-[10px] text-slate-500">Iniciado há 12 minutos • Consumindo 10 cr/min</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-green-500">AO VIVO</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>

                {/* Oraculistas em Destaque */}
                <div className="lg:col-span-1 space-y-6">
                    <GlassCard className="border-white/5" glowColor="purple" hover={false}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold flex items-center">
                                <Sparkles size={18} className="mr-2 text-neon-gold" /> Ranking IA
                            </h3>
                        </div>
                        <div className="space-y-4">
                            {[
                                { name: 'Mestre Arcanus', role: 'IA', rating: '4.9' },
                                { name: 'Sacerdotisa Lunar', role: 'IA', rating: '4.8' },
                                { name: 'Dr. Cosmos', role: 'Humano', rating: '4.7' }
                            ].map((o, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-xs font-bold text-slate-600">#{idx + 1}</span>
                                        <span className="text-sm font-medium">{o.name}</span>
                                    </div>
                                    <div className={`text-[10px] px-2 py-0.5 rounded-full ${o.role === 'IA' ? 'bg-neon-cyan/10 text-neon-cyan' : 'bg-neon-purple/10 text-neon-purple'}`}>
                                        {o.role}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
