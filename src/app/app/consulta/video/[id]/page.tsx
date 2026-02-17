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

                // CLIENT SIDE: Charge initial fee when oracle first connects (Stabilized)
                if (profile?.role === 'client' && !hasChargedInitialFee.current) {
                    if (oracle?.initial_fee_credits > 0) {
                        await processInitialFee()
                    }
                    hasChargedInitialFee.current = true
                }

                // CLIENT SIDE: Start regular billing only when Oracle video is received
                if (profile?.role === 'client') {
                    startBilling()
                }
            }
            if (mediaType === 'audio') {
                user.audioTrack?.play()
            }
        })

        client.on('user-unpublished', (user, mediaType) => {
            if (mediaType === 'video') {
                setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid))
            }
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
            if (err.message.includes('Agora credentials')) {
                toast.error('Erro de configuração do servidor (Vídeo). Contate o suporte.')
            } else {
                toast.error('Erro ao conectar: ' + err.message)
            }
        }
    }

    const startBilling = () => {
        if (billingInterval.current) return // Prevent duplicate billing loops

        billingInterval.current = setInterval(async () => {
            durationRef.current += 1
            setDuration(durationRef.current)

            // Cobrança a cada minuto (60 segundos)
            if (durationRef.current > 0 && durationRef.current % 60 === 0) {
                const success = await processMinuteBilling()
                if (!success) {
                    toast.error('Saldo esgotado. Chamada encerrada.')
                    endCall()
                }
            }
        }, 1000)
    }

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
        if (billingInterval.current) clearInterval(billingInterval.current)

        localAudioTrack?.stop()
        localAudioTrack?.close()
        localVideoTrack?.stop()
        localVideoTrack?.close()

        if (clientRef.current) {
            await clientRef.current.leave()
        }

        setJoined(false)

        try {
            await supabase.rpc('finalize_video_consultation', {
                p_consultation_id: id,
                p_duration_seconds: duration,
                p_end_reason: 'client_ended'
            })
        } catch (err) {
            console.error('Error finalizing call:', err)
        }

        if (duration >= 300) {
            setShowFeedback(true)
        } else {
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
        <div className="fixed inset-0 bg-deep-space z-50 flex flex-col pt-20">
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
            <div className="container mx-auto px-4 py-4 flex items-center justify-between text-white z-10">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full border border-neon-purple/50 overflow-hidden">
                        <img src={oracle?.avatar_url || `https://ui-avatars.com/api/?name=${oracle?.full_name}`} alt="" />
                    </div>
                    <div>
                        <h3 className="font-bold">{oracle?.full_name}</h3>
                        <p className="text-xs text-neon-cyan uppercase">{oracle?.specialty}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-6">
                    <div className="flex items-center bg-white/5 px-4 py-2 rounded-full border border-white/10">
                        <Clock size={16} className="text-neon-cyan mr-2" />
                        <span className="font-mono">{Math.floor(duration / 3600).toString().padStart(2, '0')}:
                            {Math.floor((duration % 3600) / 60).toString().padStart(2, '0')}:
                            {(duration % 60).toString().padStart(2, '0')}</span>
                    </div>
                    {profile?.role === 'client' && (
                        <div className={`flex items-center px-4 py-2 rounded-full border ${profile.credits! < WARNING_THRESHOLD ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-white/5 border-white/10 text-neon-gold'}`}>
                            <AlertCircle size={16} className="mr-2" />
                            <span>{profile.credits?.toFixed(2)} Créditos</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Video Grid */}
            <div className="flex-1 relative container mx-auto px-4 flex items-center justify-center py-6 overflow-hidden">
                {/* Main View (Remote User / Oracle) */}
                <div className="relative w-full h-full max-h-[80vh] bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl group">
                    <div id="remote-player" className="w-full h-full bg-slate-900 flex items-center justify-center">
                        {remoteUsers.length > 0 ? (
                            <RemotePlayer user={remoteUsers[0]} />
                        ) : (
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-neon-purple/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                                    <Video size={40} className="text-neon-purple" />
                                </div>
                                <p className="text-slate-500 italic">Aguardando {oracle?.full_name}...</p>
                            </div>
                        )}
                    </div>

                    {/* Draggable Local View (PiP) */}
                    <motion.div
                        drag
                        dragConstraints={{ left: -300, right: 300, top: -500, bottom: 500 }}
                        initial={{ x: 20, y: 20 }}
                        className="absolute right-4 top-4 w-32 h-44 sm:w-48 sm:h-64 bg-slate-800 rounded-2xl border-2 border-neon-purple/50 overflow-hidden shadow-2xl z-30 touch-none"
                    >
                        <div id="local-player" className="w-full h-full bg-slate-900 overflow-hidden">
                            {!joined && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none p-2">
                                    <div className="text-center space-y-2 pointer-events-auto bg-black/60 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                                        <p className="text-white font-bold text-[10px]">Câmera OK?</p>
                                        <button onClick={startCall} className="bg-neon-purple px-3 py-1 rounded-full text-[10px] text-white font-bold hover:bg-neon-purple/80 transition-all">
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

                        {/* Switch Camera Overlay Button */}
                        {cameras.length > 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); switchCamera(); }}
                                className="absolute top-2 right-2 p-1.5 bg-black/40 rounded-full text-white hover:bg-black/60 transition-all"
                            >
                                <RefreshCw size={14} />
                            </button>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white/5 border-t border-white/10 py-8 backdrop-blur-xl">
                <div className="container mx-auto flex items-center justify-center space-x-6">
                    <button
                        onClick={toggleAudio}
                        className={`p-4 rounded-full transition-all ${audioEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white'}`}
                        title={audioEnabled ? 'Silenciar Áudio' : 'Ativar Áudio'}
                    >
                        {audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                    </button>

                    <button
                        onClick={endCall}
                        className="p-6 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all transform hover:scale-110 shadow-2xl"
                        title="Encerrar Consulta"
                    >
                        <PhoneOff size={32} />
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`p-4 rounded-full transition-all ${videoEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white'}`}
                        title={videoEnabled ? 'Desativar Câmera' : 'Ativar Câmera'}
                    >
                        {videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                    </button>

                    {cameras.length > 1 && (
                        <button
                            onClick={switchCamera}
                            className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all sm:hidden"
                            title="Inverter Câmera"
                        >
                            <RefreshCw size={24} />
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
