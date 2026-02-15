'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Video, Power, Loader2, PhoneIncoming, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

import { useSearchParams } from 'next/navigation'
import { Mic, MicOff, VideoOff, PhoneOff, MessageSquare } from 'lucide-react'

export default function ServiceRoomPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const consultationId = searchParams.get('consultationId')

    const [consultation, setConsultation] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [queueCount, setQueueCount] = useState(0)
    const [nextClientName, setNextClientName] = useState<string | null>(null)
    const { profile } = useAuthStore()

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

        return () => {
            supabase.removeChannel(channel)
        }
    }, [consultationId])

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
    }

    const endCall = async () => {
        if (!consultationId) return

        try {
            await supabase
                .from('consultations')
                .update({ status: 'completed', ended_at: new Date().toISOString() })
                .eq('id', consultationId)

            toast.success('Consulta finalizada!')
            router.push('/app/dashboard')
        } catch (err) {
            toast.error('Erro ao finalizar')
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <Loader2 className="animate-spin text-neon-cyan" size={40} />
        </div>
    )

    return (
        <div className="min-h-[80vh] flex flex-col p-4 gap-4">
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
                                {queueCount} na fila {nextClientName && `(Próx: ${nextClientName})`}
                            </span>
                        </div>
                    )}
                    <div className="bg-white/5 px-3 py-1 rounded text-xs font-mono text-neon-cyan">
                        00:00:00
                    </div>
                </div>
            </div>

            {/* Video Area (Mock) */}
            <div className="flex-1 bg-black/40 rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center group">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-32 h-32 rounded-full bg-slate-800 mx-auto mb-4 border-4 border-neon-cyan/30 overflow-hidden">
                            <img src={consultation?.users?.avatar_url || ''} className="w-full h-full object-cover" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">{consultation?.users?.full_name}</h2>
                        <p className="text-neon-cyan animate-pulse mt-2">Vídeo Conectado...</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                        <Mic size={20} />
                    </button>
                    <button className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                        <Video size={20} />
                    </button>
                    <button
                        onClick={endCall}
                        className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors px-6 font-bold flex items-center"
                    >
                        <PhoneOff size={20} className="mr-2" />
                        Encerrar
                    </button>
                    <button className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                        <MessageSquare size={20} />
                    </button>
                </div>
            </div>
        </div>
    )
}
