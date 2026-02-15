'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Video, Power, Loader2, PhoneIncoming, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ServiceRoomPage() {
    const router = useRouter()
    const { profile, setProfile } = useAuthStore()
    const [isOnline, setIsOnline] = useState(false)
    const [incomingCall, setIncomingCall] = useState<any>(null)

    useEffect(() => {
        if (profile?.id) {
            goOnline()
        }
        return () => {
            if (profile?.id) goOffline()
        }
    }, [profile?.id])

    const goOnline = async () => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_online: true })
                .eq('id', profile!.id)

            if (error) throw error

            setIsOnline(true)
            setProfile({ ...profile!, is_online: true })
            toast.success('Você está ONLINE para vídeo!')
        } catch (err) {
            console.error('Erro ao ficar online:', err)
            toast.error('Erro ao conectar na sala.')
        }
    }

    const goOffline = async () => {
        try {
            await supabase
                .from('profiles')
                .update({ is_online: false })
                .eq('id', profile!.id)

            setIsOnline(false)
            if (profile) setProfile({ ...profile, is_online: false })
        } catch (err) {
            console.error('Erro ao ficar offline:', err)
        }
    }

    const handleExit = async () => {
        await goOffline()
        router.push('/app/dashboard')
    }

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            <GlassCard className="max-w-2xl w-full border-neon-cyan/30 shadow-[0_0_50px_rgba(34,211,238,0.15)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent animate-pulse" />

                <div className="flex flex-col items-center text-center space-y-8 py-10">

                    {/* Status Indicator */}
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/50 shadow-[0_0_30px_rgba(34,211,238,0.3)] animate-pulse">
                            <Video size={40} className="text-neon-cyan" />
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                            Online
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-white">Sala de Atendimento</h1>
                        <p className="text-slate-400">
                            Você está visível para clientes. Aguarde o chamado.
                        </p>
                    </div>

                    {/* Waiting Animation */}
                    <div className="flex items-center space-x-2 text-neon-cyan/70 text-sm font-medium">
                        <Loader2 size={16} className="animate-spin" />
                        <span>Aguardando chamadas...</span>
                    </div>

                    {/* Incoming Call Placeholder (Hidden usually) */}
                    {incomingCall && (
                        <div className="w-full bg-black/40 border border-green-500/50 rounded-xl p-6 animate-bounce">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="p-3 bg-green-500/20 rounded-full text-green-400">
                                            <PhoneIncoming size={24} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-white font-bold">Chamada de {incomingCall.client_name}</h3>
                                            <p className="text-sm text-green-400">Recebendo chamada de vídeo...</p>
                                        </div>
                                    </div>
                                    <div className="flex space-x-3">
                                        <NeonButton variant="green" size="sm">Aceitar</NeonButton>
                                        <NeonButton variant="red" size="sm" onClick={() => setIncomingCall(null)}>Recusar</NeonButton>
                                    </div>
                                </div>
                                {incomingCall.is_using_bonus && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-3 text-left">
                                        <div className="p-1 bg-yellow-500/20 rounded text-yellow-500 mt-0.5">
                                            <AlertTriangle size={14} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-yellow-200">Atenção: Cliente utilizando Bônus</p>
                                            <p className="text-xs text-yellow-500/80">Esta chamada está sendo paga com créditos promocionais/gratuitos verifique as regras da plataforma.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="pt-8 w-full max-w-xs">
                        <NeonButton
                            variant="white"
                            fullWidth
                            onClick={handleExit}
                            className="text-red-400 hover:text-red-300 border-red-500/20 hover:bg-red-500/10"
                        >
                            <Power size={18} className="mr-2" />
                            Sair e Ficar Offline
                        </NeonButton>
                    </div>

                    <p className="text-xs text-slate-600 mt-4">
                        Não feche esta janela para permanecer online.
                    </p>
                </div>
            </GlassCard>
        </div>
    )
}
