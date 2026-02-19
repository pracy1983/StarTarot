import React from 'react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Sparkles, MessageSquare, Video, DollarSign, Calendar, Star, Bell, BellOff, Heart, Clock } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { getOracleStatus } from '@/lib/status'

import { ClientCallModal } from './ClientCallModal'
import { ClientQueueModal } from './ClientQueueModal'
import { supabase } from '@/lib/supabase'

interface OracleCardProps {
    oracle: {
        id: string
        full_name: string
        name_fantasy?: string | null
        specialty: string
        bio: string
        avatar_url: string | null
        is_online: boolean
        credits_per_minute: number
        price_per_message?: number
        is_ai?: boolean
        oracle_type: 'human' | 'ai'
        schedules?: any[]
        initial_fee_credits?: number
        allows_video?: boolean
        allows_text?: boolean
        rating?: number
        is_owner?: boolean
        last_heartbeat_at?: string
        categories?: string[]
        topics?: string[]
        custom_category?: string | null
        custom_topic?: string | null
    }
}

export const OracleCard = ({ oracle }: OracleCardProps) => {
    const router = useRouter()
    const pathname = usePathname()
    const { isAuthenticated, profile, setShowAuthModal } = useAuthStore()

    // Call States
    const [isChecking, setIsChecking] = React.useState(false)
    const [callModalOpen, setCallModalOpen] = React.useState(false)
    const [queueModalOpen, setQueueModalOpen] = React.useState(false)
    const [queuePosition, setQueuePosition] = React.useState(1)
    const [consultationId, setConsultationId] = React.useState<string | null>(null)

    // Favorite/Notify State
    const [isFavorite, setIsFavorite] = React.useState(false)
    const [notifyOnline, setNotifyOnline] = React.useState(false)
    const [isUpdatingMeta, setIsUpdatingMeta] = React.useState(false)

    // Initial fetch for favorites
    React.useEffect(() => {
        if (profile?.id && oracle.id) {
            fetchFavoriteStatus()
        }
    }, [profile?.id, oracle.id])

    const fetchFavoriteStatus = async () => {
        const { data } = await supabase
            .from('user_favorites')
            .select('*')
            .eq('user_id', profile!.id)
            .eq('oracle_id', oracle.id)
            .maybeSingle()

        if (data) {
            setIsFavorite(true)
            setNotifyOnline(data.notify_online)
        }
    }

    const toggleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!isAuthenticated) {
            setShowAuthModal(true)
            return
        }
        setIsUpdatingMeta(true)
        try {
            if (isFavorite) {
                await supabase.from('user_favorites').delete().eq('user_id', profile!.id).eq('oracle_id', oracle.id)
                setIsFavorite(false)
                toast.success('Removido dos favoritos')
            } else {
                await supabase.from('user_favorites').upsert({ user_id: profile!.id, oracle_id: oracle.id })
                setIsFavorite(true)
                toast.success('Adicionado aos favoritos')
            }
        } catch (err) {
            toast.error('Erro ao favoritar')
        } finally {
            setIsUpdatingMeta(false)
        }
    }

    const toggleNotify = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!isAuthenticated) {
            setShowAuthModal(true)
            return
        }
        setIsUpdatingMeta(true)
        const newState = !notifyOnline
        try {
            await supabase.from('user_favorites').upsert({ user_id: profile!.id, oracle_id: oracle.id, notify_online: newState })
            setNotifyOnline(newState)
            toast.success(newState ? 'Notificações ativadas! 🔔' : 'Notificações desativadas')
        } catch (err) {
            toast.error('Erro ao atualizar notificações')
        } finally {
            setIsUpdatingMeta(false)
        }
    }

    const getScheduleSummary = () => {
        if (!oracle.schedules || oracle.schedules.length === 0) return 'Horário flexível'

        const activeSchedules = oracle.schedules.filter(s => s.is_active)
        if (activeSchedules.length === 0) return 'Horário flexível'

        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

        // Group by same time range
        const timeGroups: Record<string, number[]> = {}
        activeSchedules.forEach(s => {
            const timeRange = `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`
            if (!timeGroups[timeRange]) timeGroups[timeRange] = []
            timeGroups[timeRange].push(s.day_of_week)
        })

        const summaries = Object.entries(timeGroups).map(([time, days]) => {
            days.sort((a, b) => a - b)

            // Check for ranges (e.g., Seg-Fri)
            let dayStr = ''
            if (days.length === 7) {
                dayStr = 'Todos os dias'
            } else if (days.length >= 5 && days[0] === 1 && days[days.length - 1] === 5 && days.length === (days[days.length - 1] - days[0] + 1)) {
                dayStr = 'Seg a Sex'
            } else {
                dayStr = days.map(d => dayNames[d]).join(', ')
            }

            return `${dayStr}: ${time}`
        })

        return summaries.join(' | ')
    }

    // Listen to consultation changes when modal is open
    React.useEffect(() => {
        if (!consultationId || !callModalOpen) return

        const channel = supabase
            .channel(`consultation_${consultationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'consultations',
                    filter: `id=eq.${consultationId}`
                },
                (payload) => {
                    const newStatus = payload.new.status
                    if (newStatus === 'active') {
                        // Accepted!
                        router.push(`/app/consulta/${oracle.id}?consultationId=${consultationId}&type=video`)
                    } else if (newStatus === 'canceled' || newStatus === 'missed') {
                        // Rejected/Timeout
                        setCallModalOpen(false)
                        setConsultationId(null)
                        toast.error('O oraculista não pôde atender no momento.')
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [consultationId, callModalOpen])

    const startCallFlow = async () => {
        if (!isAuthenticated) return handleStartConsultation({ stopPropagation: () => { } } as any)

        setIsChecking(true)
        try {
            // Check if oracle is busy
            const { count } = await supabase
                .from('consultations')
                .select('*', { count: 'exact', head: true })
                .eq('oracle_id', oracle.id)
                .eq('status', 'active')

            if (count && count > 0) {
                // Busy -> Offer Queue
                // Get queue position
                const { count: pendingCount } = await supabase
                    .from('consultations')
                    .select('*', { count: 'exact', head: true })
                    .eq('oracle_id', oracle.id)
                    .eq('status', 'pending')

                setQueuePosition((pendingCount || 0) + 1)
                setQueueModalOpen(true)
            } else {
                // Available -> Call
                await createConsultation()
            }
        } catch (err) {
            toast.error('Erro ao verificar disponibilidade')
        } finally {
            setIsChecking(false)
        }
    }

    const createConsultation = async () => {
        try {
            const { data, error } = await supabase
                .from('consultations')
                .insert({
                    oracle_id: oracle.id,
                    client_id: profile?.id,
                    type: 'video',
                    status: 'pending',
                    is_using_bonus: false // Todo: Check logic
                })
                .select()
                .single()

            if (error) throw error

            setConsultationId(data.id)
            setCallModalOpen(true)
            setQueueModalOpen(false)
        } catch (err) {
            console.error(err)
            toast.error('Erro ao iniciar chamada')
        }
    }

    const cancelCall = async () => {
        if (!consultationId) return

        try {
            await supabase
                .from('consultations')
                .update({ status: 'canceled' })
                .eq('id', consultationId)

            setCallModalOpen(false)
            setConsultationId(null)
        } catch (err) {
            console.error(err)
        }
    }

    const { status, label } = getOracleStatus(
        oracle.is_online,
        oracle.schedules || [],
        oracle.last_heartbeat_at,
        oracle.is_ai || oracle.oracle_type === 'ai'
    )
    const isZeroFee = oracle.initial_fee_credits === 0 && oracle.allows_video && !oracle.is_ai && oracle.oracle_type !== 'ai'

    const handleStartConsultation = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!isAuthenticated) {
            setShowAuthModal(true)
            return
        }
        router.push(`/app/consulta/${oracle.id}`)
    }

    const handleViewProfile = () => {
        router.push(`/app/oraculo/${oracle.id}`)
    }

    const getStatusColor = () => {
        if (status === 'online') return 'bg-green-500 text-green-400'
        return 'bg-slate-800 text-slate-500'
    }

    return (
        <GlassCard
            className="relative flex flex-col h-full border-white/5 group hover:border-white/20 transition-all duration-500 cursor-pointer"
            glowColor={status === 'online' ? 'purple' : 'none'}
            onClick={handleViewProfile}
        >
            {/* Zero Fee Badge - Top Right */}
            {isZeroFee && (
                <div className="absolute top-4 right-4 z-20 px-2 py-0.5 bg-neon-gold text-deep-space text-[9px] font-black uppercase tracking-wider rounded shadow-lg animate-pulse">
                    ZERO TARIFA INICIAL
                </div>
            )}

            {/* Favorite & Notify - Floating Right */}
            {profile?.id !== oracle.id && (
                <div className={`absolute right-4 z-20 flex flex-col space-y-2 ${isZeroFee ? 'top-10' : 'top-4'}`}>
                    <button
                        onClick={toggleFavorite}
                        disabled={isUpdatingMeta}
                        className={`group/btn flex items-center h-10 rounded-full border backdrop-blur-md transition-all duration-300 relative overflow-hidden w-10 hover:w-32 hover:px-3 justify-center ${isFavorite ? 'bg-neon-purple border-neon-purple text-white shadow-lg shadow-neon-purple/20' : 'bg-black/40 border-white/10 text-white/40 hover:text-white hover:bg-black/60'}`}
                        title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    >
                        <div className="flex items-center justify-center shrink-0 w-10 h-10 absolute left-0 top-0">
                            <Heart size={16} className={`${isFavorite ? 'fill-white' : 'group-hover/btn:scale-110 transition-transform duration-300'}`} />
                        </div>
                        <span className="text-[10px] font-bold uppercase transition-all duration-300 whitespace-nowrap ml-8 opacity-0 group-hover/btn:opacity-100 hidden group-hover/btn:block">
                            {isFavorite ? 'Favorito' : 'Favoritar'}
                        </span>
                    </button>

                    <button
                        onClick={toggleNotify}
                        disabled={isUpdatingMeta}
                        className={`group/btn flex items-center h-10 rounded-full border backdrop-blur-md transition-all duration-300 relative overflow-hidden w-10 hover:w-32 hover:px-3 justify-center ${notifyOnline ? 'bg-neon-cyan/80 border-neon-cyan text-white shadow-lg shadow-neon-cyan/20' : 'bg-black/40 border-white/10 text-white/40 hover:text-white hover:bg-black/60'}`}
                        title={notifyOnline ? 'Desativar notificações' : 'Ativar notificações'}
                    >
                        <div className="flex items-center justify-center shrink-0 w-10 h-10 absolute left-0 top-0">
                            <Bell size={16} className={`${notifyOnline ? 'fill-white' : 'group-hover/btn:scale-110 transition-transform duration-300'}`} />
                        </div>
                        <span className="text-[10px] font-bold uppercase transition-all duration-300 whitespace-nowrap ml-8 opacity-0 group-hover/btn:opacity-100 hidden group-hover/btn:block">
                            {notifyOnline ? 'Avisar' : 'Me Avise'}
                        </span>
                    </button>
                </div>
            )}

            <div className="flex flex-col items-center text-center space-y-3 pt-4">
                {/* Avatar container with status capsule and rating */}
                <div className="relative">
                    {/* Rating Badge - Top Right of Avatar */}
                    {oracle.rating && (
                        <div className="absolute -top-1 -right-1 z-30 flex items-center bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-lg border border-white/20">
                            <Star size={8} className="text-neon-gold fill-neon-gold mr-0.5" />
                            <span className="text-[9px] font-black text-deep-space">{oracle.rating.toFixed(1)}</span>
                        </div>
                    )}

                    {/* Outer Glow Wrapper (for online pulse without transparency) */}
                    {status === 'online' && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-5 bg-green-500/60 blur-xl rounded-full z-10 animate-pulse" />
                    )}

                    <div className={`absolute inset-0 rounded-full blur-lg opacity-20 transition-all duration-500 group-hover:scale-110 ${status === 'online' ? 'bg-neon-cyan' : 'bg-red-500/10'
                        }`} />
                    <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-white/10 to-white/5 relative z-10 transition-transform duration-500 group-hover:scale-105">
                        <img
                            src={oracle.avatar_url || `https://ui-avatars.com/api/?name=${oracle.full_name}&background=12122a&color=a855f7`}
                            alt={oracle.full_name}
                            className="w-full h-full rounded-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all border-2 border-[#0f0f2d]"
                        />
                    </div>

                    {/* Centered Status Capsule */}
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full border-2 border-[#0f0f2d] z-20 flex items-center justify-center whitespace-nowrap shadow-lg ${status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}>
                        <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">
                            {status === 'online' ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>

                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-neon-purple transition-colors duration-300 leading-tight">
                        {oracle.name_fantasy || oracle.full_name}
                    </h3>
                    <p className="text-neon-cyan text-[10px] font-bold uppercase tracking-[0.2em] line-clamp-1 px-4">
                        {oracle.categories && oracle.categories.length > 0
                            ? oracle.categories.map(c => c === 'Outros' ? oracle.custom_category : c).join(' • ')
                            : oracle.specialty}
                    </p>
                    <p className="text-slate-500 text-[9px] uppercase tracking-widest line-clamp-1 px-4">
                        {oracle.topics && oracle.topics.length > 0
                            ? oracle.topics.map(t => t === 'Outros' ? oracle.custom_topic : t).join(' • ')
                            : ''}
                    </p>
                </div>

                {/* Info Tags */}
                <div className="flex flex-col items-center space-y-0.5">
                    {!oracle.is_ai && oracle.oracle_type !== 'ai' && oracle.allows_video && (
                        <div className={`flex items-center text-[9px] font-bold uppercase tracking-wider ${status === 'online' ? 'text-neon-cyan' : 'text-slate-500'}`}>
                            <Video size={10} className="mr-1" />
                            {oracle.credits_per_minute} <span className="opacity-60 ml-1">créditos/min</span>
                        </div>
                    )}
                    {oracle.allows_text && (
                        <div className={`flex items-center text-[9px] font-bold uppercase tracking-wider ${status === 'online' ? 'text-neon-purple' : 'text-slate-500'}`}>
                            <MessageSquare size={10} className="mr-1" />
                            {oracle.price_per_message || 10} <span className="opacity-60 ml-1">créditos/msg</span>
                        </div>
                    )}
                </div>

                <p className="text-slate-400 text-[13px] line-clamp-2 min-h-[40px] px-1 leading-relaxed">
                    {oracle.bio}
                </p>

                {/* Schedule info */}
                <div className="flex items-start space-x-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 w-full">
                    <Clock size={11} className="text-slate-500 shrink-0 mt-0.5" />
                    <span className="text-[9px] text-slate-400 font-medium leading-relaxed text-left flex-1">
                        {getScheduleSummary()}
                    </span>
                </div>

                {/* Feature Icons - Always visible based on config */}
                {profile?.id !== oracle.id && (
                    <div className="flex items-center justify-center space-x-6 py-2 text-slate-500 border-t border-white/5 w-full">
                        {oracle.allows_text && (
                            <div className={`flex flex-col items-center space-y-1 ${status === 'online' ? 'text-neon-purple/80' : 'opacity-40'}`}>
                                <MessageSquare size={16} />
                                <span className="text-[8px] uppercase font-black tracking-tighter">Mensagem</span>
                            </div>
                        )}
                        {!oracle.is_ai && oracle.oracle_type !== 'ai' && oracle.allows_video && (
                            <div className={`flex flex-col items-center space-y-1 ${status === 'online' ? 'text-neon-cyan/80' : 'opacity-40'}`}>
                                <Video size={16} />
                                <span className="text-[8px] uppercase font-black tracking-tighter">Vídeo</span>
                            </div>
                        )}
                    </div>
                )}

                {profile?.id !== oracle.id ? (
                    <div className="mt-2 w-full">
                        {(!oracle.is_ai && oracle.oracle_type !== 'ai' && oracle.allows_video) && oracle.allows_text ? (
                            /* Human with both options */
                            <div className="grid grid-cols-2 gap-2">
                                <NeonButton
                                    variant="green"
                                    size="sm"
                                    disabled={status !== 'online'}
                                    className={`h-9 px-0 ${status !== 'online' ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                                    onClick={(e) => {
                                        if (status !== 'online') return
                                        e.stopPropagation()
                                        if (!isAuthenticated) return handleStartConsultation(e)
                                        router.push(`/app/consulta/${oracle.id}?type=video`)
                                    }}
                                >
                                    <Video size={14} className="mr-1" />
                                    <span className="text-[10px]">Vídeo</span>
                                </NeonButton>
                                <NeonButton
                                    variant={status === 'online' ? "purple" : "gold"}
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (!isAuthenticated) return handleStartConsultation(e)
                                        router.push(`/app/consulta/${oracle.id}?type=message`)
                                    }}
                                    className="h-9 px-0"
                                >
                                    <MessageSquare size={14} className="mr-1" />
                                    <span className="text-[10px] whitespace-nowrap">Mensagem</span>
                                </NeonButton>
                            </div>
                        ) : (
                            /* Only one option (AI or limited Human) - Centered and half width */
                            <div className="flex justify-center">
                                {oracle.allows_text ? (
                                    <NeonButton
                                        variant={status === 'online' ? "purple" : "gold"}
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (!isAuthenticated) return handleStartConsultation(e)
                                            router.push(`/app/consulta/${oracle.id}?type=message`)
                                        }}
                                        className="h-9 w-1/2"
                                    >
                                        <MessageSquare size={14} className="mr-1" />
                                        <span className="text-[10px] whitespace-nowrap">{status === 'online' ? 'Mensagem' : 'Mensagem'}</span>
                                    </NeonButton>
                                ) : (
                                    <NeonButton
                                        variant="green"
                                        size="sm"
                                        disabled={status !== 'online'}
                                        className={`h-9 w-1/2 ${status !== 'online' ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                                        onClick={(e) => {
                                            if (status !== 'online') return
                                            e.stopPropagation()
                                            if (!isAuthenticated) return handleStartConsultation(e)
                                            router.push(`/app/consulta/${oracle.id}?type=video`)
                                        }}
                                    >
                                        <Video size={14} className="mr-1" />
                                        <span className="text-[10px]">Vídeo</span>
                                    </NeonButton>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-2 py-2 px-4 rounded-xl bg-white/5 border border-white/5 text-[10px] text-slate-500 uppercase font-bold tracking-widest italic">
                        Seu Perfil de Oraculista
                    </div>
                )}
            </div>

            <ClientCallModal
                isOpen={callModalOpen}
                oracleName={oracle.full_name}
                avatarUrl={oracle.avatar_url || ''}
                creditsPerMinute={oracle.credits_per_minute || 0}
                initialFee={oracle.initial_fee_credits || 0}
                onCancel={cancelCall}
            />

            <ClientQueueModal
                isOpen={queueModalOpen}
                oracleName={oracle.full_name}
                queuePosition={queuePosition}
                onConfirm={createConsultation}
                onCancel={() => setQueueModalOpen(false)}
            />
        </GlassCard>
    )
}
