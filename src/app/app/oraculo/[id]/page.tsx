'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import {
    ArrowLeft,
    Sparkles,
    Clock,
    MessageSquare,
    Video,
    Star,
    Shield,
    Brain,
    User
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

export default function OracleProfilePage() {
    const { id } = useParams()
    const router = useRouter()
    const [oracle, setOracle] = useState<any>(null)
    const [consultationCount, setConsultationCount] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) fetchOracle()
    }, [id])

    const fetchOracle = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            setOracle(data)

            // Contar consultas realizadas
            const { count } = await supabase
                .from('consultations')
                .select('id', { count: 'exact', head: true })
                .eq('oracle_id', id)
                .eq('status', 'answered')

            setConsultationCount(count || 0)
        } catch (err) {
            console.error('Erro ao carregar oráculo:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!oracle) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <p className="text-slate-400">Oraculista não encontrado.</p>
                <NeonButton variant="purple" onClick={() => router.push('/app')}>Voltar ao Templo</NeonButton>
            </div>
        )
    }

    const isAI = oracle.is_ai || oracle.oracle_type === 'ai'
    const price = isAI ? (oracle.price_per_message || 10) : oracle.credits_per_minute
    const priceLabel = isAI ? 'créditos por mensagem' : 'créditos por minuto'

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Voltar */}
            <button
                onClick={() => router.back()}
                className="flex items-center text-slate-400 hover:text-white transition-colors text-sm"
            >
                <ArrowLeft size={18} className="mr-2" /> Voltar
            </button>

            {/* Hero Card */}
            <GlassCard className="relative overflow-hidden border-white/5" hover={false}>
                <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-transparent" />
                <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8 p-6">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 rounded-full bg-neon-purple blur-2xl opacity-20" />
                        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-neon-purple to-neon-cyan relative z-10">
                            <img
                                src={oracle.avatar_url || `https://ui-avatars.com/api/?name=${oracle.full_name}&background=12122a&color=a855f7&size=256`}
                                alt={oracle.full_name}
                                className="w-full h-full rounded-full object-cover"
                            />
                        </div>
                        {/* Status */}
                        <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-deep-space z-20 ${oracle.is_online ? 'bg-green-500' : 'bg-slate-600'}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start space-x-3 mb-2">
                            <h1 className="text-2xl font-bold text-white">{oracle.full_name}</h1>
                            {isAI && (
                                <span className="px-2 py-0.5 bg-neon-cyan/10 text-neon-cyan text-[10px] font-bold rounded-full flex items-center">
                                    <Brain size={10} className="mr-1" /> IA
                                </span>
                            )}
                        </div>
                        <p className="text-neon-cyan text-sm font-medium uppercase tracking-widest mb-4">
                            {oracle.specialty}
                        </p>

                        {/* Stats */}
                        <div className="flex flex-col space-y-2 mb-6">
                            <div className="flex items-center text-slate-400 text-sm">
                                <MessageSquare size={16} className="mr-2 text-neon-purple" />
                                {consultationCount} consultas realizadas
                            </div>
                            {oracle.allows_video && oracle.oracle_type === 'human' && (
                                <div className="flex items-center text-slate-400 text-sm">
                                    <Video size={16} className="mr-2 text-neon-cyan" />
                                    {oracle.credits_per_minute} créditos por vídeo (minuto)
                                </div>
                            )}
                            {oracle.allows_text && (
                                <div className="flex items-center text-slate-400 text-sm">
                                    <MessageSquare size={16} className="mr-2 text-neon-purple" />
                                    {(oracle.price_per_message || 10)} créditos por mensagem
                                </div>
                            )}
                        </div>

                        <p className="text-slate-300 text-sm leading-relaxed">
                            {oracle.bio || 'Este oraculista ainda não adicionou uma descrição.'}
                        </p>
                    </div>
                </div>
            </GlassCard>

            {/* Personality / System Prompt (se AI) */}
            {isAI && oracle.personality && (
                <GlassCard className="border-white/5" hover={false}>
                    <h3 className="font-bold text-white mb-3 flex items-center">
                        <Sparkles size={18} className="mr-2 text-neon-gold" /> Estilo de Atendimento
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{oracle.personality}</p>
                </GlassCard>
            )}

            {/* Status & CTA */}
            <div className="flex flex-col sm:flex-row gap-4">
                <GlassCard className="flex-1 border-white/5 flex items-center space-x-4" hover={false}>
                    <div className={`p-3 rounded-xl ${oracle.is_online ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Shield size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">{oracle.is_online ? 'Disponível Agora' : 'Indisponível'}</p>
                        <p className="text-[10px] text-slate-500">
                            {oracle.is_online ? 'Pronto para iniciar uma consulta' : 'Você pode deixar uma mensagem'}
                        </p>
                    </div>
                </GlassCard>

                <div className="flex flex-col sm:flex-row gap-3">
                    {oracle.allows_video && oracle.oracle_type === 'human' && (
                        <NeonButton
                            variant="green"
                            size="lg"
                            className="px-8"
                            disabled={!oracle.is_online}
                            onClick={() => router.push(`/app/consulta/${oracle.id}?type=video`)}
                        >
                            <Video size={18} className="mr-2" />
                            Consulta por Vídeo
                        </NeonButton>
                    )}
                    {oracle.allows_text && (
                        <NeonButton
                            variant="purple"
                            size="lg"
                            className="px-8"
                            onClick={() => router.push(`/app/consulta/${oracle.id}?type=message`)}
                        >
                            {oracle.is_online ? (
                                <><MessageSquare size={18} className="mr-2" /> Iniciar Mensagem</>
                            ) : (
                                <><MessageSquare size={18} className="mr-2" /> Deixar Mensagem</>
                            )}
                        </NeonButton>
                    )}
                </div>
            </div>
        </div>
    )
}
