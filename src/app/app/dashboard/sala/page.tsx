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
    Power
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
    const [joined, setJoined] = React.useState(false)
    const [localVideoTrack, setLocalVideoTrack] = React.useState<ICameraVideoTrack | null>(null)
    const [localAudioTrack, setLocalAudioTrack] = React.useState<IMicrophoneAudioTrack | null>(null)
    const [remoteUsers, setRemoteUsers] = React.useState<any[]>([])
    const [videoEnabled, setVideoEnabled] = React.useState(true)
    const [audioEnabled, setAudioEnabled] = React.useState(true)
    const clientRef = React.useRef<IAgoraRTCClient | null>(null)
    const [duration, setDuration] = React.useState(0)
    const timerRef = React.useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (!consultationId) {
            toast.error('Consulta não encontrada')
            router.push('/app/dashboard')
            return
        }
        fetchConsultation()

        // Subscribe to Queue Updates
        const channel = supabase
            .channel('room_queue_count')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'consultations',
                    filter: `oracle_id=eq.${profile?.id}`, // Filter by current oracle
                },
                () => fetchQueueCount()
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
            supabase.removeChannel(channel)
            window.removeEventListener('beforeunload', handleBeforeUnload)
            leaveCall()
        }
    }, [consultationId, joined]) // Added joined to dependency to update listener closure

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
        const { data, error } = await supabase
            .from('consultations')
            .select('*, users:client_id(full_name, avatar_url)')
            .eq('id', consultationId)
            .single()

        if (error) {
            toast.error('Erro ao carregar consulta')
            router.push('/app/dashboard')
            return
        }
        setConsultation(data)
        setLoading(false)
        initAgora()
    }

    const initAgora = async () => {
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
        clientRef.current = client

        client.on('user-published', async (user, mediaType) => {
            await client.subscribe(user, mediaType)
            if (mediaType === 'video') {
                setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user])
            }
            if (mediaType === 'audio') {
                user.audioTrack?.play()
            }
        })

        client.on('user-unpublished', (user) => {
            setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid))
        })
    }

    const startCall = async () => {
        if (!clientRef.current || !consultationId) return

        try {
            const response = await fetch('/api/agora/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelName: consultationId,
                    uid: profile!.id,
                    role: 'publisher'
                })
            })
            const { token, appId } = await response.json()

            await clientRef.current.join(appId, consultationId, token, profile!.id)

            const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
            const videoTrack = await AgoraRTC.createCameraVideoTrack()

            setLocalAudioTrack(audioTrack)
            setLocalVideoTrack(videoTrack)

            await clientRef.current.publish([audioTrack, videoTrack])

            setJoined(true)
            videoTrack.play('local-player')

            // Start Timer
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1)
            }, 1000)

        } catch (err) {
            console.error('Error starting call:', err)
            toast.error('Erro ao conectar vídeo.')
        }
    }

    const leaveCall = async () => {
        if (timerRef.current) clearInterval(timerRef.current)
        localAudioTrack?.stop()
        localAudioTrack?.close()
        localVideoTrack?.stop()
        localVideoTrack?.close()
        if (clientRef.current) {
            await clientRef.current.leave()
        }
        setJoined(false)
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

    const [showSummary, setShowSummary] = useState(false)
    const [summaryData, setSummaryData] = useState<any>(null)

    const endCall = async () => {
        if (!consultationId) return

        try {
            // Calculate final credits based on real duration or just stop
            // In a better system, the server handles recurring billing, 
            // but here the client does it. We finalize duration.
            const { error } = await supabase.rpc('finalize_video_consultation', {
                p_consultation_id: consultationId,
                p_duration_seconds: duration,
                p_end_reason: 'oracle_ended'
            })

            if (error) throw error

            setSummaryData({
                duration: duration,
                credits: consultation.total_credits // Or calculate accumulated credits
            })

            await leaveCall()
            setShowSummary(true)
            toast.success('Consulta finalizada!')
        } catch (err: any) {
            toast.error('Erro ao finalizar: ' + err.message)
        }
    }

    const handleNextPatient = async () => {
        // Find next pending consultation for this oracle
        const { data: next, error } = await supabase
            .from('consultations')
            .select('id, profiles:client_id(full_name)')
            .eq('oracle_id', profile!.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1)
            .single()

        if (next) {
            const nextClient = Array.isArray(next.profiles) ? next.profiles[0] : next.profiles
            if (confirm(`Próximo cliente na fila: ${nextClient?.full_name}. Deseja atender agora?`)) {
                router.push(`/app/dashboard/sala?consultationId=${next.id}`)
                // Full reload or state reset might be needed
                window.location.reload()
            } else {
                router.push('/app/dashboard')
            }
        } else {
            router.push('/app/dashboard')
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <Loader2 className="animate-spin text-neon-cyan" size={40} />
        </div>
    )

    return (
        <div className="min-h-[80vh] flex flex-col p-4 gap-4">
            {/* Summary Modal */}
            {showSummary && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-deep-space/90 backdrop-blur-md">
                    <GlassCard className="max-w-md w-full p-8 text-center space-y-6 border-neon-purple/20">
                        <div className="w-20 h-20 bg-neon-purple/20 rounded-full flex items-center justify-center mx-auto">
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
                                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Ganhos</p>
                                <p className="text-xl font-bold text-neon-gold">{consultation?.total_credits || 0} CR</p>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4">
                            <NeonButton variant="purple" fullWidth onClick={handleNextPatient}>
                                {queueCount > 0 ? 'Atender Próximo da Fila' : 'Voltar ao Painel'}
                            </NeonButton>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-white font-bold">Em Atendimento</span>
                    <span className="text-slate-400 text-sm">| {consultation?.users?.full_name}</span>
                </div>
                <div className="flex items-center gap-4">
                    {queueCount > 0 && (
                        <div className="flex items-center space-x-2 bg-neon-gold/20 px-3 py-1 rounded-full border border-neon-gold/30 animate-pulse">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-gold opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-gold"></span>
                            </span>
                            <span className="text-xs font-bold text-neon-gold text-nowrap">
                                {queueCount} na fila {nextClientName && `(Próx: ${Array.isArray(nextClientName) ? nextClientName[0] : nextClientName})`}
                            </span>
                        </div>
                    )}
                    <div className="bg-white/5 px-3 py-1 rounded text-xs font-mono text-neon-cyan">
                        {Math.floor(duration / 3600).toString().padStart(2, '0')}:
                        {Math.floor((duration % 3600) / 60).toString().padStart(2, '0')}:
                        {(duration % 60).toString().padStart(2, '0')}
                    </div>
                </div>
            </div>

            {/* Video Area */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Video (Remote) */}
                <div className="bg-black/40 rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center group h-full">
                    <div id="remote-player" className="absolute inset-0 flex items-center justify-center">
                        {remoteUsers.length > 0 ? (
                            <RemotePlayer user={remoteUsers[0]} />
                        ) : (
                            <div className="text-center">
                                <div className="w-24 h-24 rounded-full bg-slate-800 mx-auto mb-4 border-2 border-neon-cyan/30 overflow-hidden">
                                    <img src={consultation?.users?.avatar_url || ''} className="w-full h-full object-cover" alt="Client" />
                                </div>
                                <h2 className="text-xl font-bold text-white">{consultation?.users?.full_name}</h2>
                                <p className="text-slate-500 italic mt-2">Aguardando cliente...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Oracle Video (Local) */}
                <div className="bg-black/40 rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center group h-full">
                    <div id="local-player" className="absolute inset-0 flex items-center justify-center">
                        {!joined && (
                            <div className="text-center space-y-4 z-10">
                                <div className="p-4 bg-neon-cyan/10 rounded-full text-neon-cyan inline-block">
                                    <VideoIcon size={32} />
                                </div>
                                <h3 className="text-white font-bold">Sua Câmera</h3>
                                <NeonButton variant="purple" onClick={startCall}>
                                    Conectar Agora
                                </NeonButton>
                            </div>
                        )}
                    </div>
                    <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-black/40 px-3 py-1 rounded-lg backdrop-blur-md">
                        <UserIcon size={14} className="text-neon-cyan" />
                        <span className="text-xs text-white">Sua Visualização</span>
                    </div>
                </div>

                {/* Controls - Floating */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 z-20">
                    <button
                        onClick={toggleAudio}
                        className={`p-3 rounded-full transition-all ${audioEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white'}`}
                    >
                        {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>
                    <button
                        onClick={toggleVideo}
                        className={`p-3 rounded-full transition-all ${videoEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white'}`}
                    >
                        {videoEnabled ? <VideoIcon size={20} /> : <VideoOff size={20} />}
                    </button>
                    <button
                        onClick={endCall}
                        className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all px-6 font-bold flex items-center shadow-lg transform active:scale-95"
                    >
                        <PhoneOff size={20} className="mr-2" />
                        Encerrar
                    </button>
                </div>
            </div>
        </div>
    )
}

