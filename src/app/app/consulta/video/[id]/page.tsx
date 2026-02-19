'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    PhoneOff,
    Clock,
    AlertCircle,
    Maximize2,
    MessageSquare,
    RefreshCw,
    Camera,
    User
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng'

const WARNING_THRESHOLD = 50.00 // Avisar quando saldo for < 50 Créditos

export default function VideoConsultationPage() {
    const { id } = useParams() // consultation_id
    const { profile, setProfile } = useAuthStore()
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [consultation, setConsultation] = useState<any>(null)
    const [oracle, setOracle] = useState<any>(null)

    // Video Call State
    const [joined, setJoined] = useState(false)
    const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null)
    const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null)
    const [remoteUsers, setRemoteUsers] = useState<any[]>([])
    const [videoEnabled, setVideoEnabled] = useState(true)
    const [audioEnabled, setAudioEnabled] = useState(true)

    // Billing State
    const [duration, setDuration] = useState(0)
    const durationRef = useRef(0)
    const [currentCost, setCurrentCost] = useState(0)
    const [currentCameraId, setCurrentCameraId] = useState<string>('')
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
    const billingInterval = useRef<NodeJS.Timeout | null>(null)
    const clientRef = useRef<IAgoraRTCClient | null>(null)
    const hasChargedInitialFee = useRef(false)
    const stabilizationTimer = useRef<NodeJS.Timeout | null>(null)
    const [hasEstablishedConnection, setHasEstablishedConnection] = useState(false)
    const [callError, setCallError] = useState<string | null>(null)
    const [callEndedBy, setCallEndedBy] = useState<'client' | 'oracle' | null>(null)
    const [isFinalizing, setIsFinalizing] = useState(false)

    useEffect(() => {
        if (id) fetchDetails()

        return () => {
            endCall()
        }
    }, [id])

    const fetchDetails = async () => {
        try {
            const { data: cons } = await supabase.from('consultations').select('*').eq('id', id).single()
            if (!cons) throw new Error('Consulta não encontrada')

            setConsultation(cons)

            const { data: o } = await supabase.from('profiles').select('*').eq('id', cons.oracle_id).single()
            setOracle(o)

            // Verificar saldo antes de começar (Taxa inicial + pelo menos 1 minuto)
            const minRequired = (o.initial_fee_credits || 0) + (o.credits_per_minute || 5)
            if (profile?.role === 'client' && (profile.credits || 0) < minRequired) {
                toast.error(`Saldo insuficiente. Você precisa de pelo menos ${minRequired} Créditos para iniciar.`)
                router.push('/app/planos')
                return
            }

            initAgora()
        } catch (err: any) {
            toast.error(err.message)
            router.push('/app/mensagens')
        } finally {
            setLoading(false)
        }
    }

    const initAgora = async () => {
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
        clientRef.current = client

        // Handlers
        client.on('user-published', async (user, mediaType) => {
            await client.subscribe(user, mediaType)
            if (mediaType === 'video') {
                setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user])

                // Stabilization: Only consider connection "established" after 3 seconds of video
                if (!stabilizationTimer.current) {
                    stabilizationTimer.current = setTimeout(async () => {
                        setHasEstablishedConnection(true)

                        // Charge initial fee only once connection is established
                        if (profile?.role === 'client' && !hasChargedInitialFee.current) {
                            if (oracle?.initial_fee_credits > 0) {
                                await processInitialFee()
                                hasChargedInitialFee.current = true
                            }
                        }

                        stabilizationTimer.current = null
                    }, 3000) // 3 seconds of stable video before charging anything
                }
            }
            if (mediaType === 'audio') {
                user.audioTrack?.play()
            }
        })

        client.on('user-unpublished', (user, mediaType) => {
            if (mediaType === 'video') {
                setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid))

                // Pause billing if video stops (temporary interruption)
                if (billingInterval.current) {
                    clearInterval(billingInterval.current)
                    billingInterval.current = null
                }
            }
        })

        client.on('user-left', async (user) => {
            setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid))
            setCallEndedBy('oracle')
            // Se o oráculo saiu de vez, o cliente finaliza
            setTimeout(() => autoFinalizeCall('oracle'), 1000)
        })

        // AUTO-PREVIEW: Start local tracks on init
        try {
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
            const videoTrack = await AgoraRTC.createCameraVideoTrack()

            setLocalAudioTrack(audioTrack)
            setLocalVideoTrack(videoTrack)

            // Get available cameras
            const devices = await AgoraRTC.getCameras()
            setCameras(devices)
            setCurrentCameraId(videoTrack.getMediaStreamTrack().getSettings().deviceId || '')

            // Play local preview immediately if container exists
            const playerContainer = document.getElementById('local-player')
            if (playerContainer) {
                videoTrack.play(playerContainer, { fit: 'cover' })
            }
        } catch (err) {
            console.error('Error initializing client preview:', err)
            toast.error('Erro ao acessar câmera/microfone. Por favor, autorize o acesso.')
        }
    }

    const switchCamera = async () => {
        if (!localVideoTrack || cameras.length < 2) return

        const currentIdx = cameras.findIndex(c => c.deviceId === currentCameraId)
        const nextIdx = (currentIdx + 1) % cameras.length
        const nextDevice = cameras[nextIdx]

        try {
            await localVideoTrack.setDevice(nextDevice.deviceId)
            setCurrentCameraId(nextDevice.deviceId)
            toast.success('Câmera alterada')
        } catch (err) {
            toast.error('Erro ao trocar câmera')
        }
    }

    const startCall = async () => {
        if (!clientRef.current) return

        try {
            // 1. Get Token from our API
            const response = await fetch('/api/agora/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelName: id,
                    uid: profile!.id,
                    role: profile?.role === 'oracle' ? 'publisher' : 'subscriber'
                })
            })
            const { token, appId } = await response.json()

            if (!appId) throw new Error('Configuração de vídeo incompleta no servidor')

            // 2. Join Channel
            await clientRef.current.join(appId, id as string, token, profile!.id)

            // 3. Publish Tracks (Reuse created ones)
            if (localAudioTrack && localVideoTrack) {
                await clientRef.current.publish([localAudioTrack, localVideoTrack])
            }

            setJoined(true)
            // No need to play again, it's already playing via preview

            // Billing is now triggered in user-published event
        } catch (err: any) {
            console.error('Error starting call:', err)
            let msg = err.message || 'Erro desconhecido'
            if (msg.includes('Agora credentials')) {
                msg = 'Erro de configuração do servidor (Vídeo). Contate o suporte.'
            }
            setCallError(msg)
            toast.error('Erro ao conectar: ' + msg)
        }
    }

    // Unified Billing Effect for Client
    useEffect(() => {
        if (joined && remoteUsers.length > 0 && hasEstablishedConnection && profile?.role === 'client') {
            if (!billingInterval.current) {
                billingInterval.current = setInterval(async () => {
                    setDuration(prev => {
                        const newDuration = prev + 1

                        // Cobrança a cada minuto (60 segundos)
                        if (newDuration > 0 && newDuration % 60 === 0) {
                            processMinuteBilling().then(success => {
                                if (!success) {
                                    toast.error('Saldo esgotado. Chamada encerrada.')
                                    endCall()
                                }
                            })
                        }
                        return newDuration
                    })
                }, 1000)
            }
        } else {
            if (billingInterval.current) {
                clearInterval(billingInterval.current)
                billingInterval.current = null
            }
        }

        return () => {
            if (billingInterval.current) {
                clearInterval(billingInterval.current)
                billingInterval.current = null
            }
        }
    }, [joined, remoteUsers.length, hasEstablishedConnection])

    const processInitialFee = async () => {
        try {
            const { error } = await supabase.rpc('deduct_video_fee', {
                client_id: profile!.id,
                oracle_id: oracle.id,
                amount: oracle.initial_fee_credits,
                consultation_id: id,
                is_initial: true
            })
            if (error) throw error
            setProfile({ ...profile!, credits: (profile?.credits || 0) - oracle.initial_fee_credits })
            toast.success('Taxa inicial processada.')
        } catch (err: any) {
            console.error('Initial fee error:', err)
        }
    }

    const processMinuteBilling = async () => {
        const cost = oracle?.credits_per_minute || 5
        try {
            const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', profile!.id).single()

            if (!wallet || wallet.balance < cost) return false

            const { error } = await supabase.rpc('deduct_video_fee', {
                client_id: profile!.id,
                oracle_id: oracle.id,
                amount: cost,
                consultation_id: id,
                is_initial: false
            })

            if (error) throw error

            const newBalance = wallet.balance - cost
            setProfile({ ...profile!, credits: newBalance })

            if (newBalance < WARNING_THRESHOLD) {
                toast('Seu saldo está acabando!', { icon: '⚠️', position: 'top-center' })
            }

            return true
        } catch (err) {
            return false
        }
    }

    const [showFeedback, setShowFeedback] = useState(false)
    const [stars, setStars] = useState(0)
    const [comment, setComment] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const endCall = async () => {
        if (!id || isFinalizing) return
        setCallEndedBy('client')
        await autoFinalizeCall('client')
    }

    const autoFinalizeCall = async (endedBy: 'client' | 'oracle') => {
        if (isFinalizing) return
        setIsFinalizing(true)

        if (billingInterval.current) clearInterval(billingInterval.current)

        try {
            await supabase.rpc('finalize_video_consultation', {
                p_consultation_id: id,
                p_duration_seconds: duration,
                p_end_reason: endedBy === 'client' ? 'client_ended' : 'oracle_left'
            })
        } catch (err) {
            console.error('Error finalizing call:', err)
        }

        localAudioTrack?.stop()
        localAudioTrack?.close()
        localVideoTrack?.stop()
        localVideoTrack?.close()

        if (clientRef.current) {
            await clientRef.current.leave().catch(() => { })
        }

        setJoined(false)

        if (duration >= 300) {
            setShowFeedback(true)
        } else {
            toast.success(endedBy === 'client' ? 'Você encerrou a chamada.' : 'O oraculista encerrou a chamada.')
            router.push(`/app/consulta/resposta/${id}`)
        }
    }

    const handleFeedbackSubmit = async () => {
        if (stars === 0) {
            toast.error('Por favor, selecione uma nota.')
            return
        }

        setIsSubmitting(true)
        try {
            const { error } = await supabase.rpc('submit_consultation_feedback', {
                p_consultation_id: id,
                p_stars: stars,
                p_comment: comment
            })

            if (error) throw error

            toast.success('Obrigado pelo seu feedback! ✨')
            router.push(`/app/consulta/resposta/${id}`)
        } catch (err: any) {
            toast.error('Erro ao enviar feedback: ' + err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleVideo = async () => {
        if (localVideoTrack) {
            await localVideoTrack.setEnabled(!videoEnabled)
            setVideoEnabled(!videoEnabled)
        }
    }

    const toggleAudio = async () => {
        if (localAudioTrack) {
            await localAudioTrack.setEnabled(!audioEnabled)
            setAudioEnabled(!audioEnabled)
        }
    }

    if (loading) return null

    return (
        <div className="fixed inset-0 bg-deep-space z-50 flex flex-col pt-16 md:pt-20 overflow-hidden">
            {/* Feedback Modal */}
            {showFeedback && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <GlassCard className="max-w-md w-full p-8 space-y-6 border-neon-purple/20">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">Como foi sua consulta?</h2>
                            <p className="text-slate-400 text-sm">Sua avaliação ajuda outros consulentes e motiva o oraculista.</p>
                        </div>

                        <div className="flex justify-center gap-2 py-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setStars(star)}
                                    className={`p-2 transition-all ${stars >= star ? 'text-neon-gold scale-125' : 'text-slate-600 hover:text-neon-gold/50'}`}
                                >
                                    <StarIcon fill={stars >= star ? 'currentColor' : 'none'} size={32} />
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Escreva um breve comentário (opcional)..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-neon-purple/50 min-h-[120px]"
                        />

                        <div className="flex gap-4">
                            <button
                                onClick={() => router.push(`/app/consulta/resposta/${id}`)}
                                className="flex-1 py-3 text-slate-400 hover:text-white transition-colors"
                            >
                                Pular
                            </button>
                            <NeonButton variant="purple" fullWidth onClick={handleFeedbackSubmit} disabled={isSubmitting}>
                                {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
                            </NeonButton>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Header / Info */}
            <div className="w-full px-4 py-3 md:py-4 flex flex-row items-center justify-between text-white z-10 gap-2 border-b border-white/5">
                <div className="flex items-center space-x-2 md:space-x-4 min-w-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-neon-purple/50 overflow-hidden shrink-0">
                        <img src={oracle?.avatar_url || `https://ui-avatars.com/api/?name=${oracle?.full_name}`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-sm md:text-base truncate">{oracle?.full_name}</h3>
                        <p className="text-[10px] md:text-xs text-neon-cyan uppercase truncate">{oracle?.specialty}</p>
                    </div>
                </div>

                <div className="flex flex-row items-center space-x-2 md:space-x-6 shrink-0">
                    <div className="flex items-center bg-white/5 px-2 md:px-4 py-1.5 md:py-2 rounded-full border border-white/10">
                        <Clock size={14} className="text-neon-cyan mr-1.5 md:mr-2" />
                        <span className="font-mono text-xs md:text-sm">
                            {Math.floor(duration / 60).toString().padStart(2, '0')}:{(duration % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                    {profile?.role === 'client' && (
                        <div className={`hidden sm:flex items-center px-4 py-2 rounded-full border ${profile.credits! < WARNING_THRESHOLD ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-white/5 border-white/10 text-neon-gold'}`}>
                            <AlertCircle size={16} className="mr-2" />
                            <span className="text-sm">{profile.credits?.toFixed(0)} créditos</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Video Grid */}
            <div className="flex-1 relative container mx-auto px-4 flex items-center justify-center py-6 overflow-hidden">
                {/* Main View (Remote User / Oracle) */}
                <div className="relative w-full h-full max-h-[80vh] bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl group">
                    <div id="remote-player" className="w-full h-full bg-slate-900 flex items-center justify-center">
                        {remoteUsers.length > 0 && hasEstablishedConnection ? (
                            <RemotePlayer user={remoteUsers[0]} />
                        ) : callError ? (
                            <div className="max-w-md w-full px-6 py-12 text-center space-y-6 animate-in fade-in duration-500">
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/40">
                                    <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-red-500" />
                                </div>
                                <div className="space-y-2 text-center">
                                    <h2 className="text-xl md:text-2xl font-bold text-white">Falha na Conexão</h2>
                                    <p className="text-slate-400 text-sm leading-relaxed px-4">
                                        Não foi possível estabelecer o sinal de vídeo. Verifique sua internet.
                                    </p>
                                </div>
                                <div className="pt-4 flex justify-center">
                                    <NeonButton variant="purple" onClick={() => { setCallError(null); startCall(); }} size="lg">
                                        <RefreshCw className="mr-2 w-4 h-4 md:w-5 md:h-5" />
                                        Tentar Reiniciar
                                    </NeonButton>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center space-y-4 md:space-y-6 p-4">
                                <div className="relative">
                                    <div className="w-20 h-20 md:w-24 md:h-24 bg-neon-purple/20 rounded-full flex items-center justify-center mx-auto relative z-10">
                                        <Video className="w-10 h-10 md:w-12 md:h-12 text-neon-purple animate-pulse" />
                                    </div>
                                    <div className="absolute inset-0 bg-neon-purple blur-3xl opacity-20 animate-pulse" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-white font-bold text-base md:text-lg">Conectando...</p>
                                    <p className="text-slate-500 italic text-xs md:text-sm px-4">
                                        {remoteUsers.length > 0 ? 'Estabilizando sinal...' : `Aguardando ${oracle?.full_name} entrar...`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Draggable Local View (PiP) */}
                    <motion.div
                        drag
                        dragConstraints={{ left: -300, right: 300, top: -500, bottom: 500 }}
                        initial={{ x: 20, y: 20 }}
                        className="absolute right-4 top-4 w-28 h-40 md:w-48 md:h-64 bg-slate-800 rounded-2xl border-2 border-neon-purple/50 overflow-hidden shadow-2xl z-30 touch-none"
                    >
                        <div id="local-player" className="w-full h-full bg-slate-900 overflow-hidden">
                            {!joined && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none p-2">
                                    <div className="text-center space-y-2 pointer-events-auto bg-black/60 p-2 md:p-3 rounded-xl backdrop-blur-sm border border-white/10">
                                        <p className="text-white font-bold text-[8px] md:text-[10px]">Câmera OK?</p>
                                        <button onClick={startCall} className="bg-neon-purple px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[10px] text-white font-bold hover:bg-neon-purple/80 transition-all">
                                            Entrar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-2 left-2 flex items-center space-x-1 bg-black/40 px-2 py-0.5 rounded-lg backdrop-blur-md">
                            <User size={10} className="text-neon-cyan" />
                            <span className="text-[8px] text-white">Você</span>
                        </div>
                    </motion.div>

                    {/* Call Ended Modal Overlay */}
                    {callEndedBy && !showFeedback && (
                        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <GlassCard className="max-w-xs w-full p-6 text-center space-y-4 border-red-500/20">
                                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                                    <PhoneOff size={32} className="text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Chamada Encerrada</h3>
                                <p className="text-slate-400 text-sm">
                                    {callEndedBy === 'oracle' ? 'O oraculista encerrou a chamada.' : 'Você encerrou a chamada.'}
                                </p>
                                <div className="animate-pulse text-neon-cyan text-[10px] md:text-xs font-bold uppercase">
                                    Finalizando sessão...
                                </div>
                            </GlassCard>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white/5 border-t border-white/10 py-6 md:py-8 backdrop-blur-xl shrink-0">
                <div className="container mx-auto flex items-center justify-center space-x-4 md:space-x-6 px-4">
                    <button
                        onClick={toggleAudio}
                        className={`p-3 md:p-4 rounded-full transition-all ${audioEnabled ? 'bg-white/10 text-white' : 'bg-red-500 text-white'}`}
                    >
                        {audioEnabled ? <Mic className="w-5 h-5 md:w-6 md:h-6" /> : <MicOff className="w-5 h-5 md:w-6 md:h-6" />}
                    </button>

                    <button
                        onClick={endCall}
                        className="p-4 md:p-6 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all transform hover:scale-105 shadow-2xl"
                    >
                        <PhoneOff className="w-6 h-6 md:w-8 md:h-8" />
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`p-3 md:p-4 rounded-full transition-all ${videoEnabled ? 'bg-white/10 text-white' : 'bg-red-500 text-white'}`}
                    >
                        {videoEnabled ? <Video className="w-5 h-5 md:w-6 md:h-6" /> : <VideoOff className="w-5 h-5 md:w-6 md:h-6" />}
                    </button>

                    {cameras.length > 1 && (
                        <button
                            onClick={switchCamera}
                            className="p-3 md:p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                        >
                            <RefreshCw className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function StarIcon({ fill, size, ...props }: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fill}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    )
}

function RemotePlayer({ user }: { user: any }) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (user.videoTrack && containerRef.current) {
            user.videoTrack.play(containerRef.current, { fit: 'cover' })
        }
    }, [user.videoTrack])

    return <div ref={containerRef} className="w-full h-full" />
}
