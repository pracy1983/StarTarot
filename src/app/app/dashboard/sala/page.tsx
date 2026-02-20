'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import {
    Mic,
    MicOff,
    VideoOff,
    PhoneOff,
    Video as VideoIcon,
    Loader2,
    AlertTriangle,
    User as UserIcon,
    RefreshCcw,
    Maximize2,
    Minimize2,
    LayoutDashboard
} from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng'
import { VideoChat } from '@/components/video/VideoChat'

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
    const { profile } = useAuthStore()

    // Video Call State
    const [joined, setJoined] = React.useState(false)
    const [remoteUsers, setRemoteUsers] = React.useState<any[]>([])
    const [localVideoTrack, setLocalVideoTrack] = React.useState<ICameraVideoTrack | null>(null)
    const [localAudioTrack, setLocalAudioTrack] = React.useState<IMicrophoneAudioTrack | null>(null)

    const localPlayerRef = React.useRef<HTMLDivElement>(null)

    const [videoEnabled, setVideoEnabled] = React.useState(true)
    const [audioEnabled, setAudioEnabled] = React.useState(true)
    const clientRef = React.useRef<IAgoraRTCClient | null>(null)
    const stabilizationTimer = React.useRef<NodeJS.Timeout | null>(null)
    const [hasEstablishedConnection, setHasEstablishedConnection] = React.useState(false)

    // Timer & Duration
    const [now, setNow] = useState(Date.now())
    const [duration, setDuration] = useState(0)

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

    // Fullscreen toggle for the video container
    const [isExpanded, setIsExpanded] = useState(false)

    useEffect(() => {
        if (localVideoTrack && localPlayerRef.current) {
            localVideoTrack.play(localPlayerRef.current)
        }
    }, [localVideoTrack, joined])

    useEffect(() => {
        // Global timer tick
        const interval = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        // Calculate duration based on DB timestamp if available
        if (consultation?.started_at && consultation.status === 'active') {
            const seconds = Math.floor((now - new Date(consultation.started_at).getTime()) / 1000)
            setDuration(Math.max(0, seconds))
        } else if (consultation?.duration_seconds) {
            // Keep showing final duration if finished
            setDuration(consultation.duration_seconds)
        }
    }, [now, consultation])

    useEffect(() => {
        if (!consultationId) {
            toast.error('Consulta não encontrada')
            router.push('/app/dashboard')
            return
        }
        fetchConsultation()
        getCameras()

        const channelQueue = supabase
            .channel('room_queue_count')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'consultations', filter: `oracle_id=eq.${profile?.id}` },
                () => fetchQueueCount()
            )
            .subscribe()

        const channelStatus = supabase
            .channel(`consultation_${consultationId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'consultations', filter: `id=eq.${consultationId}` },
                (payload) => {
                    const newStatus = payload.new.status
                    // Update local consultation state to keep timer in sync
                    setConsultation((prev: any) => ({ ...prev, ...payload.new }))

                    if (newStatus === 'completed' || newStatus === 'ended' || newStatus === 'cancelled') {
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

    useEffect(() => {
        if (consultationId && !joined && !callError && !loading && !isAutoStarting) {
            setIsAutoStarting(true)
            startCall()
        }
    }, [consultationId, joined, callError, loading, isAutoStarting])


    const getCameras = async () => {
        try {
            const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
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
            const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
            clientRef.current = client

            client.on('user-published', async (user, mediaType) => {
                await client.subscribe(user, mediaType)
                if (mediaType === 'video') {
                    setRemoteUsers(prev => {
                        if (prev.find(u => u.uid === user.uid)) return prev
                        return [...prev, user]
                    })

                    // Stabilization logic for Oracle too
                    if (!stabilizationTimer.current) {
                        stabilizationTimer.current = setTimeout(async () => {
                            setHasEstablishedConnection(true)

                            // Try to set active if client hasn't yet (atomic RPC)
                            await supabase.rpc('start_video_consultation', { p_consultation_id: consultationId })

                            stabilizationTimer.current = null
                        }, 3000)
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

            client.on('user-left', async (user) => {
                setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid))
                setCallEndedBy('client')
                autoFinalizeCall('client')
            })

            client.on('connection-state-change', (curState, prevState) => {
                if (curState === 'DISCONNECTED' && prevState === 'CONNECTED') {
                    toast.error('Conexão perdida. Tentando reconectar...')
                }
            })

            const response = await fetch('/api/agora/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelName: consultationId,
                    uid: profile!.id,
                    role: 'publisher'
                })
            })

            if (!response.ok) throw new Error('Falha ao obter token de vídeo')

            const { token, appId } = await response.json()

            await client.join(appId, consultationId, token, profile!.id)

            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
            const videoTrack = await AgoraRTC.createCameraVideoTrack()

            setLocalAudioTrack(audioTrack)
            setLocalVideoTrack(videoTrack)
            setCurrentCameraId(videoTrack.getMediaStreamTrack().getSettings().deviceId || '')

            await client.publish([audioTrack, videoTrack])

            setJoined(true)
            if (localPlayerRef.current) {
                videoTrack.play(localPlayerRef.current, { fit: 'cover' })
            }

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
                }, 60000) // 1 minute (60,000ms)
            }

            // Removed: premature DB update to 'active' here. 
            // Now handled in user-published stabilization logic.

        } catch (err: any) {
            console.error('Error starting call:', err)

            let errorMessage = err.message || 'Erro desconhecido'
            if (err.name === 'NotReadableError' || errorMessage.includes('NotReadableError')) {
                errorMessage = 'Sua câmera ou microfone já está sendo usada por outro aplicativo. Feche-os e tente novamente.'
            } else if (err.name === 'NotAllowedError') {
                errorMessage = 'Permissão de câmera/microfone negada.'
            }

            setCallError(errorMessage)

            if (clientRef.current) {
                clientRef.current.leave().catch(() => { })
                clientRef.current = null
            }
            toast.error('Erro ao conectar: ' + errorMessage)
        }
    }

    const leaveCall = async () => {
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

        // If not joined, simple exit
        if (!joined) {
            if (confirm('Deseja sair da sala? A consulta não será finalizada nem cobrada.')) {
                router.push('/app/dashboard')
            }
            return
        }

        if (confirm('Deseja realmente finalizar o atendimento?')) {
            setCallEndedBy('oracle')
            await autoFinalizeCall('oracle')
        }
    }

    const autoFinalizeCall = async (endedBy: 'client' | 'oracle') => {
        if (!consultationId || isFinalizing) return
        setIsFinalizing(true)

        try {
            const { data: result, error } = await supabase.rpc('finalize_video_consultation', {
                p_consultation_id: consultationId,
                p_duration_seconds: Math.floor(duration),
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
            toast.success(endedBy === 'oracle' ? 'Consulta encerrada.' : 'O cliente desconectou.')
        } catch (err: any) {
            console.error('Finalize error:', err)
            // If error, force local summary
            setShowSummary(true)
        } finally {
            setIsFinalizing(false)
        }
    }

    const handleNextPatient = async () => {
        router.push('/app/dashboard')
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[500px] h-full">
            <Loader2 className="animate-spin text-neon-cyan" size={40} />
        </div>
    )

    return (
        <div className="w-full flex-1 p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] relative">

            {/* Header/Breadcrumbs */}
            <div className="absolute top-4 left-4 md:left-8 z-10 flex items-center space-x-2 text-slate-400 hover:text-white transition-colors cursor-pointer" onClick={() => router.push('/app/dashboard')}>
                <LayoutDashboard size={16} />
                <span className="text-sm font-bold uppercase tracking-wider">Voltar ao Painel</span>
            </div>

            {/* Main Video Container - Adaptive Size */}
            <motion.div
                layout
                className={`relative w-full transition-all duration-500 bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 ${isExpanded ? 'fixed inset-0 z-50 rounded-none' : 'max-w-5xl aspect-video mx-auto'}`}
            >
                {/* Expand/Collapse Toggle */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="absolute top-4 right-4 z-40 p-2 bg-black/40 text-white/60 hover:text-white rounded-lg backdrop-blur-md opacity-0 hover:opacity-100 transition-opacity"
                    title={isExpanded ? "Reduzir" : "Tela Cheia"}
                >
                    {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>

                {/* Info Bar Overlay */}
                <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start bg-gradient-to-b from-black/80 via-black/40 to-transparent pb-20 pointer-events-none">
                    <div className="flex items-center gap-4 pointer-events-auto">
                        <div className="relative group">
                            <div className="w-12 h-12 rounded-full border-2 border-neon-purple overflow-hidden">
                                <img src={consultation?.client?.avatar_url || `https://ui-avatars.com/api/?name=${consultation?.client?.full_name}`} className="w-full h-full object-cover" />
                            </div>
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${joined && remoteUsers.length > 0 ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-none shadow-black drop-shadow-md">{consultation?.client?.full_name}</h3>
                            <p className="text-slate-300 text-xs mt-1 font-medium">
                                {joined && remoteUsers.length > 0 ? 'Conectado' : 'Aguardando...'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-lg min-w-[100px] flex justify-center">
                        {consultation?.started_at ? (
                            <span className="font-mono text-neon-cyan text-xl font-bold tracking-widest">
                                {Math.floor(duration / 60).toString().padStart(2, '0')}:{(duration % 60).toString().padStart(2, '0')}
                            </span>
                        ) : (
                            <span className="text-[10px] text-slate-500 uppercase font-bold animate-pulse">Aguardando...</span>
                        )}
                    </div>
                </div>

                {/* Remote Video Area */}
                <div className="absolute inset-0 z-0 bg-zinc-900 flex items-center justify-center">
                    {remoteUsers.length > 0 ? (
                        <RemotePlayer user={remoteUsers[0]} />
                    ) : (
                        <div className="text-center p-8 space-y-6 max-w-md">
                            {callError ? (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                                        <AlertTriangle size={32} />
                                    </div>
                                    <p className="text-red-400 font-medium">{callError}</p>
                                    <NeonButton variant="purple" onClick={startCall} size="sm">
                                        <RefreshCcw className="mr-2" size={16} /> Tentar Novamente
                                    </NeonButton>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative w-20 h-20 mx-auto">
                                        <div className="absolute inset-0 bg-neon-purple/20 blur-xl rounded-full animate-pulse" />
                                        <Loader2 size={80} className="relative z-10 text-neon-purple animate-spin opacity-50" />
                                    </div>
                                    <p className="text-slate-400 text-sm animate-pulse">Aguardando vídeo do cliente...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Local Video - PiP */}
                {joined && (
                    <motion.div
                        drag
                        dragConstraints={{ left: 0, right: 300, top: 0, bottom: 300 }}
                        className="absolute right-6 bottom-24 w-32 h-44 md:w-40 md:h-56 bg-zinc-800 rounded-2xl border border-white/20 overflow-hidden shadow-2xl z-30 group"
                    >
                        <div ref={localPlayerRef} className="w-full h-full bg-black object-cover" />
                        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white backdrop-blur-sm">Você</div>
                        {cameras.length > 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); switchCamera(); }}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <RefreshCcw size={12} />
                            </button>
                        )}
                    </motion.div>
                )}

                {/* Controls - Bottom Panel */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-center items-end pb-8">
                    <div className="flex items-center gap-4 bg-black/40 backdrop-blur-xl p-2 rounded-full border border-white/10 shadow-2xl">

                        {/* Audio Toggle */}
                        <button
                            onClick={toggleAudio}
                            disabled={!joined}
                            className={`p-4 rounded-full transition-all ${!joined ? 'opacity-50 cursor-not-allowed bg-white/5' : audioEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500 border border-red-500/50'}`}
                            title={audioEnabled ? "Desativar Microfone" : "Ativar Microfone"}
                        >
                            {audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                        </button>

                        {/* End Call - Main Action */}
                        <button
                            onClick={endCall}
                            className="p-5 rounded-full bg-red-600 text-white shadow-lg shadow-red-600/30 hover:bg-red-700 transform hover:scale-105 transition-all mx-2"
                            title="Encerrar Atendimento"
                        >
                            <PhoneOff size={28} fill="currentColor" />
                        </button>

                        {/* Video Toggle */}
                        <button
                            onClick={toggleVideo}
                            disabled={!joined}
                            className={`p-4 rounded-full transition-all ${!joined ? 'opacity-50 cursor-not-allowed bg-white/5' : videoEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500 border border-red-500/50'}`}
                            title={videoEnabled ? "Desativar Câmera" : "Ativar Câmera"}
                        >
                            {videoEnabled ? <VideoIcon size={24} /> : <VideoOff size={24} />}
                        </button>
                    </div>
                </div>

                {/* End Call Overlay */}
                {callEndedBy && !showSummary && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="text-center space-y-4">
                            <Loader2 size={40} className="text-neon-purple animate-spin mx-auto" />
                            <h3 className="text-xl font-bold text-white">Finalizando atendimento...</h3>
                            <p className="text-slate-400 text-sm">Registrando duração e créditos.</p>
                        </div>
                    </div>
                )}
                {/* Chat sidecar */}
                {consultationId && profile && (
                    <VideoChat
                        channelId={consultationId}
                        userId={profile.id}
                        userName={profile.full_name || 'Oraculista'}
                    />
                )}
            </motion.div>

            {/* Queue Info Widget */}
            <div className="mt-8 flex items-center gap-4 text-slate-500 text-sm font-medium">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                    <UserIcon size={14} />
                    <span>{queueCount} pessoas na fila</span>
                </div>
                <div className="h-1 w-1 rounded-full bg-slate-700" />
                <span>Próxima consulta em breve</span>
            </div>

            {/* Finished Summary Modal */}
            <AnimatePresence>
                {showSummary && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <GlassCard className="max-w-md w-full p-8 text-center space-y-8 border-neon-purple/30 shadow-[0_0_50px_rgba(168,85,247,0.2)]">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-green-500/10">
                                <VideoIcon size={32} className="text-green-400" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-white">Atendimento Concluído</h2>
                                <p className="text-slate-400 text-sm">Os créditos foram transferidos para sua carteira.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Duração Total</p>
                                    <p className="text-2xl font-bold text-white font-mono">
                                        {Math.floor(summaryData.duration / 60)}:{(summaryData.duration % 60).toString().padStart(2, '0')}
                                    </p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Você Ganhou</p>
                                    <p className="text-2xl font-bold text-neon-gold">
                                        {summaryData.credits} <span className="text-xs text-neon-gold/50">créditos</span>
                                    </p>
                                </div>
                            </div>

                            <NeonButton variant="purple" fullWidth onClick={handleNextPatient} size="lg">
                                Voltar ao Painel
                            </NeonButton>
                        </GlassCard>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
