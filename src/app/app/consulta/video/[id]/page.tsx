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
    MessageSquare
} from 'lucide-react'
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
    const [currentCost, setCurrentCost] = useState(0)
    const billingInterval = useRef<NodeJS.Timeout | null>(null)
    const clientRef = useRef<IAgoraRTCClient | null>(null)

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

            // 2. Join Channel
            await clientRef.current.join(appId, id as string, token, profile!.id)

            // 3. Create and Publish Tracks
            const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
            const videoTrack = await AgoraRTC.createCameraVideoTrack()

            setLocalAudioTrack(audioTrack)
            setLocalVideoTrack(videoTrack)

            await clientRef.current.publish([audioTrack, videoTrack])

            setJoined(true)
            videoTrack.play('local-player')

            // 4. Start Billing for Clients
            if (profile?.role === 'client') {
                // Cobrar taxa inicial se houver
                if (oracle?.initial_fee_credits > 0) {
                    await processInitialFee()
                }
                startBilling()
            }
        } catch (err) {
            console.error('Error starting call:', err)
            toast.error('Erro ao conectar vídeo.')
        }
    }

    const startBilling = () => {
        billingInterval.current = setInterval(async () => {
            setDuration(prev => prev + 1)

            // Cobrança a cada minuto (60 segundos)
            if ((duration + 1) % 60 === 0) {
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
        router.push(`/app/consulta/resposta/${id}`)
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
            <div className="flex-1 relative container mx-auto px-4 flex items-center justify-center py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full h-full max-h-[70vh]">
                    {/* Remote Player */}
                    <div className="relative bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl overflow-hidden group">
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
                    </div>

                    {/* Local Player */}
                    <div className="relative bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl group">
                        <div id="local-player" className="w-full h-full bg-slate-900">
                            {!joined && (
                                <div className="absolute inset-0 flex items-center justify-center bg-deep-space/80 z-10">
                                    <div className="text-center space-y-6">
                                        <p className="text-white font-bold">Inicie sua conexão</p>
                                        <NeonButton variant="purple" onClick={startCall}>
                                            Conectar Câmera e Áudio
                                        </NeonButton>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-black/40 px-3 py-1 rounded-lg backdrop-blur-md">
                            <User size={14} className="text-neon-cyan" />
                            <span className="text-xs text-white">Você (Local)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white/5 border-t border-white/10 py-8 backdrop-blur-xl">
                <div className="container mx-auto flex items-center justify-center space-x-6">
                    <button
                        onClick={toggleAudio}
                        className={`p-4 rounded-full transition-all ${audioEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white'}`}
                    >
                        {audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                    </button>

                    <button
                        onClick={endCall}
                        className="p-6 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all transform hover:scale-110 shadow-2xl"
                    >
                        <PhoneOff size={32} />
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`p-4 rounded-full transition-all ${videoEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500 text-white'}`}
                    >
                        {videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                    </button>
                </div>
            </div>
        </div>
    )
}

function RemotePlayer({ user }: { user: any }) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (user.videoTrack && containerRef.current) {
            user.videoTrack.play(containerRef.current)
        }
    }, [user.videoTrack])

    return <div ref={containerRef} className="w-full h-full" />
}

function User(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}
