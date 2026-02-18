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
    User,
    Bell,
    BellOff,
    Heart
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { getOracleStatus } from '@/lib/status'
import toast from 'react-hot-toast'

export default function OracleProfilePage() {
    const { id } = useParams()
    const router = useRouter()
    const [oracle, setOracle] = useState<any>(null)
    const [consultationCount, setConsultationCount] = useState(0)
    const [ratings, setRatings] = useState<any[]>([])
    const [avgResponseTime, setAvgResponseTime] = useState<string>('30 minutos')
    const [loading, setLoading] = useState(true)
    const [favCount, setFavCount] = useState(0)
    const { profile } = useAuthStore()

    // Favorite/Notify State
    const [isFavorite, setIsFavorite] = useState(false)
    const [notifyOnline, setNotifyOnline] = useState(false)
    const [isUpdatingMeta, setIsUpdatingMeta] = useState(false)

    useEffect(() => {
        if (id) {
            fetchOracle()
            fetchFavoriteStatus()
            fetchFavoriteCount()
        }
    }, [id, profile?.id])

    const fetchFavoriteStatus = async () => {
        if (!id || !profile?.id) return

        const { data } = await supabase
            .from('user_favorites')
            .select('*')
            .eq('user_id', profile.id)
            .eq('oracle_id', id)
            .single()

        if (data) {
            setIsFavorite(true)
            setNotifyOnline(data.notify_online)
        } else {
            setIsFavorite(false)
            setNotifyOnline(false)
        }
    }

    const fetchFavoriteCount = async () => {
        if (!id) return
        const { count } = await supabase
            .from('user_favorites')
            .select('*', { count: 'exact', head: true })
            .eq('oracle_id', id)

        setFavCount(count || 0)
    }

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

    const toggleFavorite = async () => {
        if (!profile?.id) {
            toast.error('Faça login para favoritar')
            return
        }

        setIsUpdatingMeta(true)
        try {
            if (isFavorite) {
                const { error } = await supabase
                    .from('user_favorites')
                    .delete()
                    .eq('user_id', profile.id)
                    .eq('oracle_id', id)

                if (error) throw error
                setIsFavorite(false)
                toast.success('Removido dos favoritos')
            } else {
                const { error } = await supabase
                    .from('user_favorites')
                    .upsert({ user_id: profile.id, oracle_id: id }, { onConflict: 'user_id,oracle_id' })

                if (error) throw error
                setIsFavorite(true)
                toast.success('Adicionado aos favoritos! ⭐')
            }
            fetchFavoriteCount()
        } catch (err: any) {
            toast.error('Erro: ' + err.message)
        } finally {
            setIsUpdatingMeta(false)
        }
    }

    const toggleNotify = async () => {
        if (!profile?.id) {
            toast.error('Faça login para ativar notificações')
            return
        }

        setIsUpdatingMeta(true)
        const newState = !notifyOnline
        try {
            const { error } = await supabase
                .from('user_favorites')
                .upsert({ user_id: profile.id, oracle_id: id, notify_online: newState }, { onConflict: 'user_id,oracle_id' })

            if (error) throw error
            setNotifyOnline(newState)
            toast.success(newState ? 'Notificações ativadas! 🔔' : 'Notificações desativadas')
        } catch (err: any) {
            toast.error('Erro: ' + err.message)
        } finally {
            setIsUpdatingMeta(false)
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
    const { status: effectiveStatus } = getOracleStatus(oracle.is_online, [], oracle.last_heartbeat_at)
    const isOnline = effectiveStatus === 'online'

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
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
                        <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-deep-space z-20 ${isOnline ? 'bg-green-500' : 'bg-slate-600'}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start space-x-3 mb-2">
                            <h1 className="text-2xl font-bold text-white">{oracle.full_name}</h1>

                            {/* Favorite & Notify Icons */}
                            {!isAI && profile?.id && profile.id !== oracle.id && (
                                <div className="flex items-center space-x-2 ml-4">
                                    <button
                                        onClick={toggleFavorite}
                                        disabled={isUpdatingMeta}
                                        className={`p-2 rounded-full transition-all ${isFavorite ? 'bg-gold/10 text-neon-gold' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                                        title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                                    >
                                        <Star size={20} className={isFavorite ? 'fill-neon-gold' : ''} />
                                    </button>

                                    <button
                                        onClick={toggleNotify}
                                        disabled={isUpdatingMeta}
                                        className={`p-2 rounded-full transition-all ${notifyOnline ? 'bg-neon-cyan/10 text-neon-cyan' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                                        title={notifyOnline ? 'Desativar notificações de online' : 'Ativar notificações de online'}
                                    >
                                        {notifyOnline ? <Bell size={20} className="fill-neon-cyan/20" /> : <BellOff size={20} />}
                                    </button>
                                </div>
                            )}

                            {/* Removed IA Badge */}
                        </div>

                        {favCount > 0 && (
                            <div className="flex items-center space-x-1 text-xs text-neon-gold mb-4 justify-center md:justify-start">
                                <Star size={12} className="fill-neon-gold" />
                                <span>{favCount} {favCount === 1 ? 'pessoa favoritou' : 'pessoas favoritaram'}</span>
                            </div>
                        )}

                        <p className="text-neon-cyan text-sm font-medium uppercase tracking-widest mb-4">
                            {oracle.specialty}
                        </p>

                        <div className="flex flex-col space-y-2 mb-6">
                            {oracle.allows_video && (
                                <div className="flex items-center justify-center md:justify-start text-slate-400 text-sm">
                                    <Video size={16} className="mr-2 text-neon-cyan" />
                                    {oracle.credits_per_minute} créditos por vídeo (minuto)
                                </div>
                            )}
                            {oracle.allows_text && (
                                <div className="flex items-center justify-center md:justify-start text-slate-400 text-sm">
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

            {/* Personality section hidden for client to obscure AI nature */}

            {/* Status & CTA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GlassCard className="flex items-center space-x-4 border-white/5" hover={false}>
                    <div className={`p-3 rounded-xl relative ${isOnline ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                        {isOnline ? <Shield size={24} /> : <Shield size={24} className="opacity-50" />}
                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">{isOnline ? 'Online Agora' : 'Offline'}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Status Atual</p>
                    </div>
                </GlassCard>

                <GlassCard className="flex items-center space-x-4 border-white/5" hover={false}>
                    <div className="p-3 rounded-xl bg-neon-cyan/10 text-neon-cyan">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">{avgResponseTime}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Média de Resposta</p>
                    </div>
                </GlassCard>
            </div>

            {/* Iniciar Consulta Buttons */}
            {profile?.id !== oracle.id && (oracle.allows_video || oracle.allows_text) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {oracle.allows_video && (
                        <NeonButton
                            variant="green"
                            size="lg"
                            className="px-8 py-6 h-auto"
                            disabled={!isOnline}
                            onClick={() => router.push(`/app/consulta/${oracle.id}?type=video`)}
                        >
                            <div className="flex flex-col items-center">
                                <div className="flex items-center mb-1">
                                    <Video size={20} className="mr-2" />
                                    <span className="font-bold">Vídeo Chamada</span>
                                </div>
                                <span className="text-[10px] opacity-70">Atendimento em tempo real</span>
                            </div>
                        </NeonButton>
                    )}
                    {oracle.allows_text && (
                        <NeonButton
                            variant="purple"
                            size="lg"
                            className="px-8 py-6 h-auto"
                            onClick={() => router.push(`/app/consulta/${oracle.id}?type=message`)}
                        >
                            <div className="flex flex-col items-center">
                                <div className="flex items-center mb-1">
                                    <MessageSquare size={20} className="mr-2" />
                                    <span className="font-bold">Enviar Mensagem</span>
                                </div>
                                <span className="text-[10px] opacity-70">Receba sua resposta no chat</span>
                            </div>
                        </NeonButton>
                    )}
                </div>
            )}

            {/* If it's the oracle themselves */}
            {profile?.id === oracle.id && (
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <p className="text-sm text-slate-400">Clique na sua foto no topo para acessar o painel de atendimento.</p>
                </div>
            )}

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
                                    {rating.comment && (
                                        <p className="text-sm text-slate-300 italic pl-10">"{rating.comment}"</p>
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
