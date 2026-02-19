'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import {
    Video,
    Mic,
    MicOff,
    VideoOff,
    PhoneOff,
    MessageSquare,
    Video as VideoIcon,
    Loader2,
    PhoneIncoming,
    AlertTriangle,
    User as UserIcon,
    Power,
    RefreshCcw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

import { useSearchParams } from 'next/navigation'
import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng'

function RemotePlayer({ user }: { user: any }) {
    const containerRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        if (user.videoTrack && containerRef.current) {
            user.videoTrack.play(containerRef.current, { fit: 'cover' })
        }
    }, [user.videoTrack])

    return <div ref={containerRef} className="w-full h-full" />
}

export default function ServiceRoomPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const consultationId = searchParams.get('consultationId')

    const [consultation, setConsultation] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [queueCount, setQueueCount] = useState(0)
    const [nextClientName, setNextClientName] = useState<string | null>(null)
    const { profile } = useAuthStore()

    // Video Call State
    const [joined, setJoined] = React.useState(false) // Means "I have joined"
    const [remoteUsers, setRemoteUsers] = React.useState<any[]>([]) // Remote users present
    const [localVideoTrack, setLocalVideoTrack] = React.useState<ICameraVideoTrack | null>(null)
    const [localAudioTrack, setLocalAudioTrack] = React.useState<IMicrophoneAudioTrack | null>(null)

    const localPlayerRef = React.useRef<HTMLDivElement>(null)

    const [videoEnabled, setVideoEnabled] = React.useState(true)
    const [audioEnabled, setAudioEnabled] = React.useState(true)
    const clientRef = React.useRef<IAgoraRTCClient | null>(null)
    const [duration, setDuration] = React.useState(0)
    const timerRef = React.useRef<NodeJS.Timeout | null>(null)

    // Camera Switch state
    const [cameras, setCameras] = React.useState<MediaDeviceInfo[]>([])
    const [currentCameraId, setCurrentCameraId] = React.useState<string>('')

    // Summary/Termination
    const [showSummary, setShowSummary] = useState(false)
    const [summaryData, setSummaryData] = useState({ duration: 0, credits: 0 })
    const [callEndedBy, setCallEndedBy] = useState<'client' | 'oracle' | null>(null)
    const [isFinalizing, setIsFinalizing] = useState(false)

    // Error State
    const [callError, setCallError] = useState<string | null>(null)
    const [isAutoStarting, setIsAutoStarting] = useState(false)
    const connectionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (localVideoTrack && localPlayerRef.current) {
            localVideoTrack.play(localPlayerRef.current)
        }
    }, [localVideoTrack, joined])

    useEffect(() => {
        if (!consultationId) {
            toast.error('Consulta não encontrada')
            router.push('/app/dashboard')
            return
        }
        fetchConsultation()
        // Get cameras list early
        getCameras()

        // Subscribe to Queue Updates
        const channelQueue = supabase
            .channel('room_queue_count')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'consultations',
                    filter: `oracle_id=eq.${profile?.id}`,
                },
                () => fetchQueueCount()
            )
            .subscribe()

        // Subscribe to Consultation Status changes (Termination Sync)
        const channelStatus = supabase
            .channel(`consultation_${consultationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'consultations',
                    filter: `id=eq.${consultationId}`,
                },
                (payload) => {
                    const newStatus = payload.new.status
                    if (newStatus === 'completed' || newStatus === 'ended' || newStatus === 'cancelled') {
                        // Check if we are already seeing summary or joined
                        if (joined || !showSummary) {
                            toast('A consulta foi encerrada.', { icon: 'ℹ️' })
                            leaveCall()
                            setSummaryData({
                                duration: payload.new.duration_seconds || duration,
                                credits: payload.new.total_credits || 0
                            })
                            setShowSummary(true)
                        }
                    }
                }
            )
            .subscribe()

        fetchQueueCount()

        // Prevent accidental tab close
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (joined) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            supabase.removeChannel(channelQueue)
            supabase.removeChannel(channelStatus)
            window.removeEventListener('beforeunload', handleBeforeUnload)
            leaveCall()
        }
    }, [consultationId])

    // Auto-start call when arrival in sala
    useEffect(() => {
        if (consultationId && !joined && !callError && !loading && !isAutoStarting) {
            setIsAutoStarting(true)
            startCall()
        }
    }, [consultationId, joined, callError, loading, isAutoStarting])

    // Timer Logic: Only run when BOTH joined (i.e. joined=true AND remoteUsers.length > 0)
    useEffect(() => {
        if (joined && remoteUsers.length > 0) {
            // Start timer if not running
            if (!timerRef.current) {
                timerRef.current = setInterval(() => {
                    setDuration(prev => prev + 1)
                }, 1000)
            }
        } else {
            // Pause timer if condition fails 
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }, [joined, remoteUsers.length])


    const getCameras = async () => {
        try {
            const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
            // Request permission first if not granted, or just try listing
            const cams = await AgoraRTC.getCameras()
            setCameras(cams)
            if (cams.length > 0) {
                setCurrentCameraId(cams[0].deviceId)
            }
        } catch (e) {
            console.error('Error getting cameras', e)
        }
    }

    const switchCamera = async () => {
        if (!localVideoTrack || cameras.length < 2) return

        try {
            // Find next camera index
            const currentIndex = cameras.findIndex(c => c.deviceId === currentCameraId)
            const nextIndex = (currentIndex + 1) % cameras.length
            const nextCamera = cameras[nextIndex]

            await localVideoTrack.setDevice(nextCamera.deviceId)
            setCurrentCameraId(nextCamera.deviceId)
            toast.success('Câmera alterada')
        } catch (err) {
            toast.error('Erro ao trocar câmera')
        }
    }


    const fetchQueueCount = async () => {
        if (!profile?.id) return
        const { count } = await supabase
            .from('consultations')
            .select('*', { count: 'exact', head: true })
            .eq('oracle_id', profile.id)
            .eq('status', 'pending')

        setQueueCount(count || 0)
    }

    const fetchConsultation = async () => {
        if (!consultationId) return

        const { data, error } = await supabase
            .from('consultations')
            .select('*, client:client_id(full_name, avatar_url)')
            .eq('id', consultationId)
            .single()

        if (error) {
            toast.error('Erro ao carregar consulta')
            router.push('/app/dashboard')
            return
        }
        setConsultation(data)
        setLoading(false)
    }

    const startCall = async () => {
        if (!consultationId) return
        setCallError(null)

        try {
            const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
            // Use 'marketing' mode or 'live' if 'rtc' fails? No, 'rtc' is fine.
            const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
            clientRef.current = client

            // Listeners
            client.on('user-published', async (user, mediaType) => {
                await client.subscribe(user, mediaType)
                if (mediaType === 'video') {
                    setRemoteUsers(prev => {
                        // Avoid duplicates
                        if (prev.find(u => u.uid === user.uid)) return prev
                        return [...prev, user]
                    })
                }
                if (mediaType === 'audio') {
                    user.audioTrack?.play()
                }
            })

            client.on('user-unpublished', (user, mediaType) => {
                if (mediaType === 'video') {
                    setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid))
                    // If client stops video but is still in room, we just wait
                }
            })

            client.on('user-left', async (user) => {
                setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid))
                setCallEndedBy('client')
                // Se o cliente saiu de vez, finaliza a consulta automaticamente
                autoFinalizeCall('client')
            })

            client.on('connection-state-change', (curState, prevState) => {
                if (curState === 'DISCONNECTED' && prevState === 'CONNECTED') {
                    // Maybe attempt reconnect or just notify
                    toast.error('Conexão perdida. Tentando reconectar...')
                }
            })

            // Token Fetch
            const response = await fetch('/api/agora/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelName: consultationId,
                    uid: profile!.id,
                })
            })

            if (!response.ok) throw new Error('Falha ao obter token de vídeo')

            const { token, appId } = await response.json()

            // Join
            await client.join(appId, consultationId, token, profile!.id)

            // Tracks
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
            const videoTrack = await AgoraRTC.createCameraVideoTrack() // default camera

            setLocalAudioTrack(audioTrack)
            setLocalVideoTrack(videoTrack)
            setCurrentCameraId(videoTrack.getMediaStreamTrack().getSettings().deviceId || '')

            await client.publish([audioTrack, videoTrack])

            setJoined(true)
            if (localPlayerRef.current) {
                videoTrack.play(localPlayerRef.current, { fit: 'cover' })
            }

            // Start connection timeout (30 seconds to establish connection with client)
            if (consultation?.status === 'pending') {
                connectionTimeoutRef.current = setTimeout(async () => {
                    if (remoteUsers.length === 0) {
                        toast.error('O cliente não conectou a tempo. Cancelando consulta sem cobrança.')
                        await supabase.from('consultations').update({
                            status: 'cancelled',
                            metadata: { cancel_reason: 'client_timeout_no_connection' }
                        }).eq('id', consultationId)
                        leaveCall()
                        router.push('/app/dashboard')
                    }
                }, 30000)
            }

            // Update status to 'active' if not already
            if (consultation?.status === 'pending') {
                await supabase.from('consultations').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', consultationId)
            }

        } catch (err: any) {
            console.error('Error starting call:', err)

            let errorMessage = err.message || 'Erro desconhecido'
            if (err.name === 'NotReadableError' || errorMessage.includes('NotReadableError')) {
                errorMessage = 'Sua câmera ou microfone já está sendo usada por outro aplicativo ou aba. Por favor, feche-os e tente novamente.'
            } else if (err.name === 'NotAllowedError') {
                errorMessage = 'Permissão de câmera/microfone negada. Verifique as configurações do seu navegador.'
            }

            setCallError(errorMessage)

            // Cleanup if partial failure
            if (clientRef.current) {
                clientRef.current.leave().catch(() => { })
                clientRef.current = null
            }

            if (errorMessage.includes('Agora credentials')) {
                toast.error('Sistema de vídeo não configurado.')
            } else {
                toast.error('Erro ao conectar: ' + errorMessage)
            }
        }
    }

    const leaveCall = async () => {
        if (timerRef.current) clearInterval(timerRef.current)
        if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current)

        localAudioTrack?.stop()
        localAudioTrack?.close()
        localVideoTrack?.stop()
        localVideoTrack?.close()

        setLocalAudioTrack(null)
        setLocalVideoTrack(null)

        if (clientRef.current) {
            await clientRef.current.leave()
            clientRef.current = null
        }
        setJoined(false)
        setRemoteUsers([])
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

    const endCall = async () => {
        if (!consultationId || isFinalizing) return
        setCallEndedBy('oracle')
        await autoFinalizeCall('oracle')
    }

    const autoFinalizeCall = async (endedBy: 'client' | 'oracle') => {
        if (!consultationId || isFinalizing) return
        setIsFinalizing(true)

        try {
            // Finalize in DB
            const { data: result, error } = await supabase.rpc('finalize_video_consultation', {
                p_consultation_id: consultationId,
                p_duration_seconds: duration,
                p_end_reason: endedBy === 'oracle' ? 'oracle_ended' : 'client_left'
            })

            if (error) throw error

            const earnings = (result as any)?.[0]?.oracle_earnings || 0

            setSummaryData({
                duration: duration,
                credits: Math.round(earnings)
            })

            await leaveCall()
            setShowSummary(true)
            toast.success(endedBy === 'oracle' ? 'Consulta encerrada por você.' : 'O cliente encerrou a consulta.')
        } catch (err: any) {
            console.error('Finalize error:', err)
            toast.error('Erro ao finalizar ganhos: ' + err.message)
            // Still show summary if possible
            setShowSummary(true)
        } finally {
            setIsFinalizing(false)
        }
    }

    const handleNextPatient = async () => {
        const { data: next } = await supabase
            .from('consultations')
            .select('id, client:client_id(full_name)')
            .eq('oracle_id', profile!.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1)
            .single()

        if (next) {
            const nextClient = Array.isArray(next.client) ? next.client[0] : next.client
            if (confirm(`Próximo: ${nextClient?.full_name}. Atender?`)) {
                // Hard refresh for clean state
                window.location.href = `/app/dashboard/sala?consultationId=${next.id}`
            } else {
                router.push('/app/dashboard')
            }
        } else {
            router.push('/app/dashboard')
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-deep-space">
            <Loader2 className="animate-spin text-neon-cyan" size={40} />
        </div>
    )

    return (
        <div className="fixed inset-0 bg-black overflow-hidden z-[50] flex flex-col">

            {/* Summary Modal w/ High Z-Index */}
            {showSummary && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <GlassCard className="max-w-md w-full p-6 md:p-8 text-center space-y-6 border-neon-purple/20 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-neon-purple/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <VideoIcon size={32} className="text-neon-purple" />
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-white">Consulta Finalizada</h2>
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                            <div className="bg-white/5 p-3 md:p-4 rounded-2xl border border-white/5">
                                <p className="text-[8px] md:text-[10px] text-slate-500 uppercase font-black mb-1">Duração</p>
                                <p className="text-base md:text-xl font-bold text-white">
                                    {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                                </p>
                            </div>
                            <div className="bg-white/5 p-3 md:p-4 rounded-2xl border border-white/5 overflow-hidden">
                                <p className="text-[8px] md:text-[10px] text-slate-500 uppercase font-black mb-1">Ganhos Líquidos</p>
                                <p className="text-base md:text-xl font-bold text-neon-gold truncate">
                                    {summaryData?.credits || 0} créditos
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4">
                            <NeonButton variant="purple" fullWidth onClick={handleNextPatient}>
                                {queueCount > 0 ? 'Atender Próximo' : 'Voltar ao Painel'}
                            </NeonButton>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Main Video Area (Remote) */}
            <div className="flex-1 relative z-0 bg-zinc-900 flex items-center justify-center overflow-hidden">
                {remoteUsers.length > 0 ? (
                    <div className="w-full h-full">
                        <RemotePlayer user={remoteUsers[0]} />
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-6">
                        {callError ? (
                            <div className="max-w-md w-full text-center space-y-6">
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/40">
                                    <AlertTriangle size={32} className="text-red-500" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-xl md:text-2xl font-bold text-white">Falha na Conexão</h2>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        {callError}
                                    </p>
                                </div>
                                <div className="pt-4 flex flex-col space-y-3">
                                    <NeonButton variant="purple" onClick={startCall} size="lg" fullWidth>
                                        <RefreshCcw className="mr-2" size={20} />
                                        Tentar Reiniciar
                                    </NeonButton>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center space-y-6">
                                <div className="relative group mx-auto w-fit">
                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden mx-auto mb-4 border-4 border-white/10 relative z-10">
                                        <img src={consultation?.client?.avatar_url || `https://ui-avatars.com/api/?name=${consultation?.client?.full_name}`} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="absolute inset-0 bg-neon-purple blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full animate-pulse" />
                                </div>

                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{consultation?.client?.full_name}</h2>
                                    <p className="text-white/60 animate-pulse text-sm">Aguardando conexão do cliente...</p>
                                </div>

                                {!joined ? (
                                    <div className="mt-8 flex justify-center">
                                        <style jsx>{`
                                            @keyframes pulse-red {
                                                0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); transform: scale(1); }
                                                70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); transform: scale(1.05); }
                                                100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); transform: scale(1); }
                                            }
                                            .pulse-button {
                                                animation: pulse-red 2s infinite;
                                                background-color: #ef4444 !important;
                                                color: white !important;
                                            }
                                        `}</style>
                                        <NeonButton
                                            variant="red"
                                            onClick={startCall}
                                            size="lg"
                                            className="pulse-button font-bold px-8 md:px-12 py-4 md:py-6 text-lg md:text-xl uppercase tracking-tighter"
                                        >
                                            <VideoIcon className="mr-3" size={24} />
                                            Iniciar Atendimento
                                        </NeonButton>
                                    </div>
                                ) : (
                                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl max-w-xs mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <Loader2 size={24} className="text-neon-cyan animate-spin mx-auto mb-2" />
                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Aguardando vídeo dele...</p>
                                        <p className="text-[9px] text-slate-600 mt-2">Se ele não conectar em 30s, a consulta será cancelada automaticamente.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Mensagem de Encerramento Superior */}
                {callEndedBy && !showSummary && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <GlassCard className="max-w-xs w-full p-6 text-center space-y-4 border-red-500/20">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                                <PhoneOff size={32} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Chamada Encerrada</h3>
                                <p className="text-slate-400 text-sm">
                                    {callEndedBy === 'client' ? 'O cliente encerrou a chamada.' : 'O oraculista encerrou a chamada.'}
                                </p>
                            </div>
                            <div className="animate-pulse text-neon-cyan text-xs font-bold uppercase">
                                Calculando ganhos...
                            </div>
                        </GlassCard>
                    </div>
                )}
            </div>

            {/* Local Video (Floating PiP) */}
            {joined && (
                <motion.div
                    drag
                    dragConstraints={{ left: -300, right: 300, top: -500, bottom: 500 }}
                    initial={{ x: 20, y: 20 }}
                    className="absolute right-4 bottom-32 w-28 h-40 md:w-48 md:h-64 bg-slate-800 rounded-2xl border-2 border-neon-purple/50 overflow-hidden shadow-2xl z-30 touch-none"
                >
                    <div ref={localPlayerRef} className="w-full h-full bg-slate-900 overflow-hidden" />

                    <div className="absolute bottom-2 left-2 flex items-center space-x-1 bg-black/40 px-2 py-0.5 rounded-lg backdrop-blur-md">
                        <UserIcon size={10} className="text-neon-cyan" />
                        <span className="text-[8px] text-white">Você</span>
                    </div>

                    {cameras.length > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); switchCamera(); }}
                            className="absolute top-2 right-2 p-1.5 bg-black/40 rounded-full text-white hover:bg-black/60 transition-all z-30"
                        >
                            <RefreshCcw size={14} />
                        </button>
                    )}
                </motion.div>
            )}

            {/* Top Bar - Info */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pb-12">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${joined && remoteUsers.length > 0 ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                    <div className="min-w-0">
                        <p className="text-white font-bold text-xs md:text-sm shadow-black drop-shadow-md truncate">
                            {joined && remoteUsers.length > 0 ? 'Online' : 'Conectando...'}
                        </p>
                        <p className="text-white/60 text-[10px] md:text-xs">
                            {queueCount} na fila
                        </p>
                    </div>
                </div>

                <div className="bg-black/40 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-white/10">
                    <span className="font-mono text-neon-cyan text-base md:text-lg font-bold">
                        {Math.floor(duration / 60).toString().padStart(2, '0')}:{(duration % 60).toString().padStart(2, '0')}
                    </span>
                </div>
            </div>

            {/* Bottom Controls */}
            {joined && (
                <div className="absolute bottom-6 md:bottom-8 left-0 right-0 z-20 flex justify-center items-center gap-4 md:gap-6 px-4 max-w-full">
                    <button
                        onClick={toggleAudio}
                        className={`p-3 md:p-4 rounded-full transition-all shadow-xl backdrop-blur-md ${audioEnabled ? 'bg-white/10 text-white border border-white/20' : 'bg-red-500 text-white border border-red-400'}`}
                    >
                        {audioEnabled ? <Mic size={20} className="md:w-6 md:h-6" /> : <MicOff size={20} className="md:w-6 md:h-6" />}
                    </button>

                    <button
                        onClick={endCall}
                        className="p-3 md:p-4 rounded-full bg-red-600 text-white shadow-xl shadow-red-900/50 hover:bg-red-700 hover:scale-105 transition-all border border-red-400"
                    >
                        <PhoneOff size={24} className="md:w-8 md:h-8" />
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`p-3 md:p-4 rounded-full transition-all shadow-xl backdrop-blur-md ${videoEnabled ? 'bg-white/10 text-white border border-white/20' : 'bg-red-500 text-white border border-red-400'}`}
                    >
                        {videoEnabled ? <VideoIcon size={20} className="md:w-6 md:h-6" /> : <VideoOff size={20} className="md:w-6 md:h-6" />}
                    </button>
                </div>
            )}
        </div>
    )
}
