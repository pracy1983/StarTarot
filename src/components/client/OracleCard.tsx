import React from 'react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Sparkles, MessageSquare, Video, DollarSign, Calendar, Star } from 'lucide-react'
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
    }
}

export const OracleCard = ({ oracle }: OracleCardProps) => {
    const router = useRouter()
    const pathname = usePathname()
    const { isAuthenticated, profile } = useAuthStore()

    // Call States
    const [isChecking, setIsChecking] = React.useState(false)
    const [callModalOpen, setCallModalOpen] = React.useState(false)
    const [queueModalOpen, setQueueModalOpen] = React.useState(false)
    const [queuePosition, setQueuePosition] = React.useState(1)
    const [consultationId, setConsultationId] = React.useState<string | null>(null)

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

    const { status, label } = getOracleStatus(oracle.is_online, oracle.schedules || [])
    const isZeroFee = oracle.initial_fee_credits === 0

    const handleStartConsultation = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!isAuthenticated) {
            toast.error('Faça login para iniciar uma consulta')
            // Se estiver na landing, abrimos o modal via algum estado global ou simplesmente avisamos
            // Como não temos estado global de modal fácil, vamos redirecionar pro topo or trigger local
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        router.push(`/app/consulta/${oracle.id}`)
    }

    const handleViewProfile = () => {
        if (!isAuthenticated && pathname === '/') {
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        router.push(`/app/oraculo/${oracle.id}`)
    }

    const getStatusColor = () => {
        if (status === 'online') return 'bg-green-500 text-green-400'
        if (status === 'horario') return 'bg-neon-gold text-neon-gold'
        return 'bg-slate-800 text-slate-500'
    }

    return (
        <GlassCard
            className="relative flex flex-col h-full border-white/5 group hover:border-white/20 transition-all duration-500 cursor-pointer"
            glowColor={status === 'online' ? 'purple' : (status === 'horario' ? 'gold' : 'none')}
            onClick={handleViewProfile}
        >
            {/* Zero Fee Badge */}
            {isZeroFee && (
                <div className="absolute top-4 right-4 z-20 px-2 py-0.5 bg-neon-gold text-deep-space text-[9px] font-black uppercase tracking-wider rounded shadow-lg animate-pulse">
                    ZERO TARIFA
                </div>
            )}

            {/* Rating Stars - Top Left */}
            <div className="absolute top-4 left-4 z-20 group/rating" title={oracle.rating ? `Avaliação: ${oracle.rating.toFixed(1)}` : 'Sem avaliações ainda'}>
                <div className="flex items-center space-x-0.5 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-white/5 cursor-pointer hover:bg-black/60 transition-colors">
                    <Star size={10} className="text-neon-gold fill-neon-gold" />
                    <span className="text-[10px] font-bold text-white ml-1">{oracle.rating?.toFixed(1) || '5.0'}</span>
                </div>
            </div>

            {/* Status Badge */}
            <div className={`absolute top-4 right-4 flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest z-10 border shadow-lg ${isZeroFee ? 'mt-8' : ''} ${status === 'online' ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/10' :
                status === 'horario' ? 'bg-neon-gold/10 text-neon-gold border-neon-gold/20 shadow-neon-gold/10' :
                    'bg-slate-800/50 text-slate-500 border-white/5'
                }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-green-400 animate-pulse' :
                    status === 'horario' ? 'bg-neon-gold' : 'bg-slate-600'
                    }`} />
                <span>{label}</span>
            </div>

            <div className="flex flex-col items-center text-center space-y-4 pt-4">
                {/* Avatar */}
                <div className="relative">
                    <div className={`absolute inset-0 rounded-full blur-xl opacity-20 transition-all duration-500 group-hover:scale-110 ${status === 'online' ? 'bg-neon-cyan' : status === 'horario' ? 'bg-neon-gold' : 'bg-slate-500'
                        }`} />
                    <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-white/10 to-white/5 relative z-10">
                        <img
                            src={oracle.avatar_url || `https://ui-avatars.com/api/?name=${oracle.full_name}&background=12122a&color=a855f7`}
                            alt={oracle.full_name}
                            className="w-full h-full rounded-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all"
                        />
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-neon-purple transition-colors duration-300">
                        {oracle.full_name}
                    </h3>
                    <p className="text-neon-cyan text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                        {oracle.specialty}
                    </p>
                </div>

                {/* Info Tags */}
                <div className="flex flex-col items-center space-y-1">
                    {oracle.allows_video && (
                        <div className="flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                            <Video size={12} className="mr-1 text-neon-cyan/50" />
                            {oracle.credits_per_minute} | MINUTO (VÍDEO)
                        </div>
                    )}
                    {oracle.allows_text && oracle.price_per_message && (
                        <div className="flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                            <MessageSquare size={12} className="mr-1 text-neon-purple/50" />
                            {oracle.price_per_message} | MENSAGEM
                        </div>
                    )}
                </div>

                <p className="text-slate-400 text-sm line-clamp-2 min-h-[40px] px-2 leading-relaxed">
                    {oracle.bio}
                </p>

                {/* Feature Icons */}
                <div className="flex items-center justify-center space-x-6 py-2 text-slate-500 border-t border-white/5 w-full">
                    <div className="flex flex-col items-center space-y-1">
                        <MessageSquare size={16} className={status === 'online' || oracle.allows_text ? 'text-neon-purple/60' : ''} />
                        <span className="text-[8px] uppercase font-black tracking-tighter">Mensagem</span>
                    </div>
                    {(oracle.oracle_type === 'human' || oracle.allows_video) && (
                        <div className="flex flex-col items-center space-y-1">
                            <Video size={16} className={status === 'online' && oracle.allows_video ? 'text-neon-cyan/60' : ''} />
                            <span className="text-[8px] uppercase font-black tracking-tighter">Vídeo</span>
                        </div>
                    )}
                </div>

                <div className="mt-2 flex gap-2 w-full">
                    {status === 'online' ? (
                        oracle.oracle_type === 'human' ? (
                            <>
                                <NeonButton
                                    variant="green"
                                    fullWidth
                                    size="sm"
                                    disabled={!oracle.allows_video}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (!isAuthenticated) return handleStartConsultation(e)
                                        // Specific logic for video
                                        if (oracle.allows_video) {
                                            startCallFlow()
                                        }
                                    }}
                                    loading={isChecking}
                                    className={!oracle.allows_video ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                                >
                                    <Video size={16} className="mr-1" />
                                    Vídeo
                                </NeonButton>
                                <NeonButton
                                    variant="purple"
                                    fullWidth
                                    size="sm"
                                    disabled={!oracle.allows_text}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (!isAuthenticated) return handleStartConsultation(e)
                                        if (oracle.allows_text) {
                                            router.push(`/app/consulta/${oracle.id}?type=mensagem`)
                                        }
                                    }}
                                >
                                    <MessageSquare size={16} className="mr-1" />
                                    {oracle.allows_text ? 'Mensagem' : 'Indisp.'}
                                </NeonButton>
                            </>
                        ) : (

                            <NeonButton
                                variant="purple"
                                fullWidth
                                size="md"
                                onClick={handleViewProfile}
                            >
                                <Sparkles size={16} className="mr-2" />
                                Mais Informações
                            </NeonButton>
                        )
                    ) : (
                        // Offline State - Still show buttons but Video Disabled
                        oracle.oracle_type === 'human' ? (
                            <>
                                <NeonButton
                                    variant="green"
                                    fullWidth
                                    size="sm"
                                    disabled={true} // Always disabled when offline
                                    className="opacity-50 cursor-not-allowed grayscale"
                                >
                                    <Video size={16} className="mr-1" />
                                    Vídeo
                                </NeonButton>
                                <NeonButton
                                    variant="gold"
                                    fullWidth
                                    size="sm"
                                    disabled={!oracle.allows_text}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (!isAuthenticated) return handleStartConsultation(e)
                                        // Allow sending message even if offline (async response)
                                        router.push(`/app/consulta/${oracle.id}?type=mensagem`)
                                    }}
                                >
                                    <MessageSquare size={16} className="mr-1" />
                                    {oracle.allows_text ? 'Deixar Mensagem' : 'Indisp.'}
                                </NeonButton>
                            </>
                        ) : (
                            <NeonButton
                                variant="gold"
                                fullWidth
                                size="md"
                                onClick={handleViewProfile}
                            >
                                Mais Informações
                            </NeonButton>
                        )
                    )}
                </div>
            </div>

            <ClientCallModal
                isOpen={callModalOpen}
                oracleName={oracle.full_name}
                avatarUrl={oracle.avatar_url || ''}
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
