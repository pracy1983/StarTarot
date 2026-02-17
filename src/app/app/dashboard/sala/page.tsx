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

import { useSearchParams } from 'next/navigation'
import type { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng'

function RemotePlayer({ user }: { user: any }) {
    const containerRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        if (user.videoTrack && containerRef.current) {
            user.videoTrack.play(containerRef.current)
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
    const [summaryData, setSummaryData] = useState<any>(null)

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
    }, [consultationId]) // Removed 'joined' from dependency to avoid re-subscribing

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
            // Pause timer if condition fails (e.g. remote user disconnects temporarily)
            // But we might want to keep it running if it's just a blip? 
            // The user requested "creditos só computam quando o video é estabelecido". 
            // Safer to pause if connection is lost.
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
        // Auto-init agora if possible, but don't join yet
    }

    const startCall = async () => {
        if (!consultationId) return

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

            client.on('user-unpublished', (user) => {
                setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid))
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
                videoTrack.play(localPlayerRef.current)
            }

            // Update status to 'active' if not already
            if (consultation?.status === 'pending') {
                await supabase.from('consultations').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', consultationId)
            }

        } catch (err: any) {
            console.error('Error starting call:', err)
            // Cleanup if partial failure
            if (clientRef.current) {
                clientRef.current.leave().catch(() => { })
                clientRef.current = null
            }
            if (err.message.includes('Agora credentials')) {
                toast.error('Sistema de vídeo não configurado.')
            } else {
                toast.error('Erro ao conectar: ' + err.message)
            }
        }
    }

    const leaveCall = async () => {
        if (timerRef.current) clearInterval(timerRef.current)

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
        if (!consultationId) return

        try {
            // Calculate final credits
            const { error } = await supabase.rpc('finalize_video_consultation', {
                p_consultation_id: consultationId,
                p_duration_seconds: duration,
                p_end_reason: 'oracle_ended'
            })

            if (error) throw error

            // Re-fetch to get final total_credits from DB
            const { data: updatedCons } = await supabase
                .from('consultations')
                .select('total_credits')
                .eq('id', consultationId)
                .single()

            setSummaryData({
                duration: duration,
                credits: updatedCons?.total_credits || Math.floor((duration / 60) * (profile?.credits_per_minute || 0))
            })

            await leaveCall()
            setShowSummary(true)
            toast.success('Consulta finalizada!')
        } catch (err: any) {
            toast.error('Erro ao finalizar: ' + err.message)
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
        <div className="fixed inset-0 bg-black overflow-hidden z-[50]">

            {/* Summary Modal w/ High Z-Index */}
            {showSummary && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <GlassCard className="max-w-md w-full p-8 text-center space-y-6 border-neon-purple/20 animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-neon-purple/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <VideoIcon size={40} className="text-neon-purple" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Consulta Finalizada</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Duração</p>
                                <p className="text-xl font-bold text-white">
                                    {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                                </p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Ganhos (Est.)</p>
                                {/* We can estimate based on duration * rate if exact total isn't available yet */}
                                <p className="text-xl font-bold text-neon-gold">
                                    {summaryData?.credits || 0} CR
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
            <div className="absolute inset-0 z-0 bg-zinc-900 flex items-center justify-center">
                {remoteUsers.length > 0 ? (
                    <div className="w-full h-full">
                        <RemotePlayer user={remoteUsers[0]} />
                    </div>
                ) : (
                    <div className="text-center p-8 opacity-50">
                        <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-4 border-4 border-white/10">
                            <img src={consultation?.client?.avatar_url} className="w-full h-full object-cover" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{consultation?.client?.full_name}</h2>
                        <p className="text-white/60 animate-pulse">Aguardando conexão do cliente...</p>
                        {!joined && (
                            <div className="mt-8">
                                <NeonButton variant="cyan" onClick={startCall} size="lg">
                                    <VideoIcon className="mr-2" />
                                    Iniciar Atendimento
                                </NeonButton>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Local Video (Floating PiP) */}
            {joined && (
                <div
                    className="absolute bottom-32 right-4 w-32 h-48 md:w-48 md:h-64 bg-black rounded-xl border-2 border-white/20 shadow-2xl overflow-hidden z-20 group transition-all hover:scale-105"
                >
                    <div ref={localPlayerRef} className="w-full h-full bg-slate-800" />

                    {/* Switch Camera Button (Mobile/Tablet) */}
                    {cameras.length > 1 && (
                        <button
                            onClick={switchCamera}
                            title="Trocar Câmera"
                            className="absolute top-2 right-2 p-3 bg-black/60 rounded-full text-neon-cyan hover:bg-neon-cyan hover:text-black border border-neon-cyan/30 backdrop-blur-md transition-all z-30"
                        >
                            <RefreshCcw size={20} />
                        </button>
                    )}
                </div>
            )}

            {/* Top Bar - Info */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pb-12">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${joined && remoteUsers.length > 0 ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                    <div>
                        <p className="text-white font-bold text-sm shadow-black drop-shadow-md">
                            {joined && remoteUsers.length > 0 ? 'Online' : 'Conectando...'}
                        </p>
                        <p className="text-white/60 text-xs">
                            {queueCount} na fila
                        </p>
                    </div>
                </div>

                <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <span className="font-mono text-neon-cyan text-lg font-bold">
                        {Math.floor(duration / 60).toString().padStart(2, '0')}:{(duration % 60).toString().padStart(2, '0')}
                    </span>
                </div>
            </div>


            {/* Bottom Controls */}
            {joined && (
                <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center items-center gap-6">
                    <button
                        onClick={toggleAudio}
                        className={`p-4 rounded-full transition-all shadow-xl backdrop-blur-md ${audioEnabled ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20' : 'bg-red-500 text-white border border-red-400'}`}
                    >
                        {audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                    </button>

                    <button
                        onClick={endCall}
                        className="p-4 rounded-full bg-red-600 text-white shadow-xl shadow-red-900/50 hover:bg-red-700 hover:scale-105 transition-all border border-red-400"
                    >
                        <PhoneOff size={32} />
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`p-4 rounded-full transition-all shadow-xl backdrop-blur-md ${videoEnabled ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20' : 'bg-red-500 text-white border border-red-400'}`}
                    >
                        {videoEnabled ? <VideoIcon size={24} /> : <VideoOff size={24} />}
                    </button>
                </div>
            )}
        </div>
    )
}

