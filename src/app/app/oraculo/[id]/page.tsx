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
    const [ratings, setRatings] = useState<any[]>([])
    const [avgResponseTime, setAvgResponseTime] = useState<string>('30 minutos')
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

            const isAI = data.is_ai || data.oracle_type === 'ai'

            // Calcular média de resposta
            if (isAI) {
                // Estável baseado no ID
                const oracleIdStr = String(id)
                const hash = oracleIdStr.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
                const stableRandom = (hash % (40 - 15 + 1)) + 15
                setAvgResponseTime(`${stableRandom} minutos`)
            } else {
                const { data: qData } = await supabase
                    .from('consultations')
                    .select('created_at, answered_at')
                    .eq('oracle_id', id)
                    .eq('status', 'answered')
                    .not('answered_at', 'is', null)
                    .limit(20)

                if (qData && qData.length > 0) {
                    const diffs = qData.map(c => {
                        const start = new Date(c.created_at).getTime()
                        const end = new Date(c.answered_at).getTime()
                        return end - start
                    })
                    const avgMs = diffs.reduce((a, b) => a + b, 0) / diffs.length
                    const avgMin = Math.round(avgMs / (1000 * 60))
                    setAvgResponseTime(`${avgMin > 0 ? avgMin : 15} minutos`)
                } else {
                    setAvgResponseTime('30 minutos')
                }
            }

            // Contar consultas realizadas
            const { count } = await supabase
                .from('consultations')
                .select('id', { count: 'exact', head: true })
                .eq('oracle_id', id)
                .eq('status', 'answered')

            setConsultationCount(count || 0)

            // Buscar avaliações
            const { data: ratingsData } = await supabase
                .from('ratings')
                .select('*, client:client_id(full_name, avatar_url)')
                .eq('oracle_id', id)
                .order('created_at', { ascending: false })

            setRatings(ratingsData || [])
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
                    <div className={`p-3 rounded-xl relative ${oracle.is_online ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                        {oracle.is_online ? <Shield size={24} /> : <Shield size={24} className="opacity-50" />}
                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse ${oracle.is_online ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">{oracle.is_online ? 'Online Agora' : 'Offline'}</p>
                        <p className="text-[10px] text-slate-500">
                            {oracle.is_online ? 'Pronto para guiar você agora' : 'Deixe suas perguntas e eu responderei'}
                        </p>
                    </div>
                </GlassCard>

                {/* Tempo de Resposta */}
                <GlassCard className="flex-1 border-white/5 flex items-center space-x-4" hover={false}>
                    <div className="p-3 rounded-xl bg-neon-cyan/10 text-neon-cyan">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">Média de Resposta</p>
                        <p className="text-[10px] text-slate-500">
                            {avgResponseTime}
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
                            <MessageSquare size={18} className="mr-2" />
                            Enviar minhas perguntas
                        </NeonButton>
                    )}
                </div>
            </div>

            {/* Avaliações */}
            <GlassCard className="border-white/5 space-y-6" hover={false}>
                <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center">
                    <Star size={18} className="mr-2 text-neon-gold" />
                    Avaliações ({ratings.length})
                </h3>

                {ratings.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        Sem avaliações ainda.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {ratings.map((rating: any) => {
                            // Format Name: Ana S.
                            const fullName = rating.client?.full_name || 'Anônimo'
                            const names = fullName.split(' ')
                            const displayName = names.length > 1
                                ? `${names[0]} ${names[names.length - 1][0]}.`
                                : names[0]

                            return (
                                <div key={rating.id} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 rounded-full bg-deep-space overflow-hidden border border-white/10">
                                                <img
                                                    src={rating.client?.avatar_url || `https://ui-avatars.com/api/?name=${fullName}&background=random`}
                                                    alt={fullName}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{displayName}</p>
                                                <div className="flex space-x-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            size={10}
                                                            className={i < rating.stars ? "text-neon-gold fill-neon-gold" : "text-slate-700"}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-slate-500">
                                            {new Date(rating.created_at).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    {rating.testimonial && (
                                        <p className="text-sm text-slate-300 italic pl-10">"{rating.testimonial}"</p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </GlassCard>
        </div>
    )
}
