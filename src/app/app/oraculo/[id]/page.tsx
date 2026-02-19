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
    const [schedules, setSchedules] = useState<any[]>([])
    const [consultationCount, setConsultationCount] = useState(0)
    const [ratings, setRatings] = useState<any[]>([])
    const [avgResponseTime, setAvgResponseTime] = useState<string>('30 minutos')
    const [loading, setLoading] = useState(true)
    const [favCount, setFavCount] = useState(0)
    const { profile, setShowAuthModal } = useAuthStore()

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
            // 1. Fetch profile first to check if AI
            const { data: profileData, error: pError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single()

            if (pError) throw pError
            setOracle(profileData)

            const isAI = profileData.is_ai || profileData.oracle_type === 'ai'

            // 2. Fetch everything else in parallel
            const [
                { data: scheduleData },
                { count: consultationsDone },
                { data: ratingsData },
                { data: qData } // For response time
            ] = await Promise.all([
                supabase.from('oracle_schedules').select('*').eq('oracle_id', id).eq('is_active', true),
                supabase.from('consultations').select('id', { count: 'exact', head: true }).eq('oracle_id', id).eq('status', 'answered'),
                supabase.from('ratings').select('*, client:client_id(full_name, avatar_url)').eq('oracle_id', id).order('created_at', { ascending: false }),
                !isAI ? supabase.from('consultations').select('created_at, answered_at').eq('oracle_id', id).eq('status', 'answered').not('answered_at', 'is', null).limit(20) : Promise.resolve({ data: null })
            ])

            setSchedules(scheduleData || [])
            setConsultationCount(consultationsDone || 0)
            setRatings(ratingsData || [])

            // Calculate response time
            if (isAI) {
                const oracleIdStr = String(id)
                const hash = oracleIdStr.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
                const stableRandom = (hash % (40 - 15 + 1)) + 15
                setAvgResponseTime(`${stableRandom} minutos`)
            } else if (qData && qData.length > 0) {
                const diffs = qData.map(c => {
                    const start = new Date(c.created_at).getTime()
                    const end = new Date((c as any).answered_at).getTime()
                    return end - start
                })
                const avgMs = diffs.reduce((a, b) => a + b, 0) / diffs.length
                const avgMin = Math.round(avgMs / (1000 * 60))
                setAvgResponseTime(`${avgMin > 0 ? avgMin : 15} minutos`)
            } else {
                setAvgResponseTime('30 minutos')
            }
        } catch (err) {
            console.error('Erro ao carregar oráculo:', err)
        } finally {
            setLoading(false)
        }
    }

    const toggleFavorite = async () => {
        if (!profile?.id) {
            setShowAuthModal(true)
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
            setShowAuthModal(true)
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
    const { status: effectiveStatus } = getOracleStatus(oracle.is_online, schedules, oracle.last_heartbeat_at, isAI)
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
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-neon-purple/10 to-transparent" />
                <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 p-5">
                    {/* Avatar Container */}
                    <div className="relative flex-shrink-0">
                        {/* Rating Badge - Top Left */}
                        {oracle.rating && (
                            <div className="absolute -top-1 -left-1 z-30 flex items-center bg-white px-2 py-0.5 rounded-full shadow-xl border border-white/20">
                                <Star size={10} className="text-neon-gold fill-neon-gold mr-1" />
                                <span className="text-[10px] font-black text-deep-space">{oracle.rating.toFixed(1)}</span>
                            </div>
                        )}

                        {/* Outer Glow for Online Status */}
                        {isOnline && (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-6 bg-green-500/60 blur-xl rounded-full z-10 animate-pulse" />
                        )}

                        <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-neon-purple to-neon-cyan relative z-10 shadow-[0_0_20px_rgba(168,85,247,0.2)] overflow-visible">
                            <img
                                src={oracle.avatar_url || `https://ui-avatars.com/api/?name=${oracle.full_name}&background=12122a&color=a855f7&size=256`}
                                alt={oracle.full_name}
                                className="w-full h-full rounded-full object-cover border-2 border-[#0f0f2d]"
                            />
                        </div>

                        {/* Status Capsule Badge */}
                        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full border-2 border-[#0f0f2d] z-20 flex items-center justify-center whitespace-nowrap shadow-xl ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}>
                            <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-between gap-4 mb-3">
                            <div>
                                <div className="flex items-center justify-center md:justify-start space-x-2">
                                    <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{oracle.full_name}</h1>
                                </div>
                                <p className="text-neon-cyan text-[10px] md:text-xs font-bold uppercase tracking-[0.2em]">
                                    {oracle.specialty}
                                </p>
                            </div>

                            {/* Actions Group */}
                            {!isAI && profile?.id && profile.id !== oracle.id && (
                                <div className="flex items-center justify-center space-x-2">
                                    <button
                                        onClick={toggleFavorite}
                                        disabled={isUpdatingMeta}
                                        className={`p-2 rounded-xl border transition-all ${isFavorite ? 'bg-neon-gold/10 border-neon-gold/50 text-neon-gold' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
                                        title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                                    >
                                        <Star size={18} className={isFavorite ? 'fill-neon-gold' : ''} />
                                    </button>

                                    <button
                                        onClick={toggleNotify}
                                        disabled={isUpdatingMeta}
                                        className={`p-2 rounded-xl border transition-all ${notifyOnline ? 'bg-neon-cyan/10 border-neon-cyan/50 text-neon-cyan' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
                                        title={notifyOnline ? 'Desativar notificações' : 'Me avisar quando online'}
                                    >
                                        {notifyOnline ? <Bell size={18} /> : <BellOff size={18} />}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                            {!isAI && oracle.allows_video && (
                                <div className="flex items-center text-slate-400 text-[11px] font-medium bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                    <Video size={14} className="mr-2 text-neon-cyan" />
                                    {oracle.credits_per_minute} <span className="opacity-60 ml-1">créditos/min</span>
                                </div>
                            )}
                            {oracle.allows_text && (
                                <div className="flex items-center text-slate-400 text-[11px] font-medium bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                    <MessageSquare size={14} className="mr-2 text-neon-purple" />
                                    {(oracle.price_per_message || 10)} <span className="opacity-60 ml-1">créditos/msg</span>
                                </div>
                            )}
                            <div className="flex items-center text-slate-400 text-[11px] font-medium bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                <Clock size={14} className="mr-2 text-neon-gold" />
                                {avgResponseTime} <span className="opacity-60 ml-1">média</span>
                            </div>
                        </div>

                        <p className="text-slate-400 text-sm leading-relaxed max-w-xl mx-auto md:mx-0">
                            {oracle.bio || 'Este oraculista ainda não adicionou uma descrição.'}
                        </p>
                    </div>
                </div>
            </GlassCard>

            {/* Horários de Atendimento */}
            {schedules.length > 0 && (
                <GlassCard className="border-white/5 p-6" hover={false}>
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-neon-purple/20 rounded-lg text-neon-purple">
                            <Clock size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider">Horários de Atendimento</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6, 0].map(day => {
                            const daySchedules = schedules.filter(s => s.day_of_week === day);
                            if (daySchedules.length === 0) return null;

                            const dayName = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][day];

                            return (
                                <div key={day} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col space-y-2">
                                    <span className="text-xs font-black text-neon-cyan uppercase tracking-widest">{dayName}</span>
                                    <div className="space-y-1">
                                        {daySchedules.map((s, idx) => (
                                            <div key={idx} className="flex items-center text-sm text-slate-300 font-mono">
                                                <Sparkles size={12} className="mr-2 text-neon-gold" />
                                                {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>
            )}

            {/* Iniciar Consulta Buttons */}
            {profile?.id !== oracle.id && (oracle.allows_video || oracle.allows_text) && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    {!isAI && oracle.allows_video && (
                        <NeonButton
                            variant="green"
                            size="md"
                            disabled={!isOnline}
                            onClick={() => {
                                if (!profile?.id) {
                                    setShowAuthModal(true)
                                    return
                                }
                                router.push(`/app/consulta/${oracle.id}?type=video`)
                            }}
                            className="py-4 w-full sm:w-64"
                        >
                            <div className="flex items-center space-x-2">
                                <Video size={18} />
                                <span className="font-bold">Vídeo Chamada</span>
                            </div>
                        </NeonButton>
                    )}
                    {oracle.allows_text && (
                        <NeonButton
                            variant="purple"
                            size="md"
                            onClick={() => {
                                if (!profile?.id) {
                                    setShowAuthModal(true)
                                    return
                                }
                                router.push(`/app/consulta/${oracle.id}?type=message`)
                            }}
                            className="py-4 w-full sm:w-64"
                        >
                            <div className="flex items-center space-x-2">
                                <MessageSquare size={18} />
                                <span className="font-bold">Enviar Mensagem</span>
                            </div>
                        </NeonButton>
                    )}
                </div>
            )}

            {/* If it's the oracle themselves */}
            {
                profile?.id === oracle.id && (
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                        <p className="text-sm text-slate-400">Clique na sua foto no topo para acessar o painel de atendimento.</p>
                    </div>
                )
            }

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
        </div >
    )
}
