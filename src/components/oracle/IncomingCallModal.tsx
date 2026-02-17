import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { PhoneIncoming, Video, X, Clock } from 'lucide-react'
import { IncomingCall } from '@/hooks/useRealtimeCalls'

interface IncomingCallModalProps {
    call: IncomingCall | null
    onAccept: () => void
    onReject: () => void
}

export function IncomingCallModal({ call, onAccept, onReject }: IncomingCallModalProps) {
    const [timeLeft, setTimeLeft] = useState(20)

    useEffect(() => {
        if (call) {
            setTimeLeft(20)
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer)
                        onReject() // Auto-reject on timeout
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [call])

    if (!call) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.9 }}
                className="fixed top-24 right-4 z-50 md:right-8 w-full max-w-sm"
            >
                <GlassCard className="border-neon-cyan/50 shadow-[0_0_50px_rgba(34,211,238,0.2)] p-0 overflow-hidden">
                    <div className="bg-gradient-to-r from-neon-cyan/20 to-transparent p-4 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center space-x-2 text-white font-bold animate-pulse">
                            <PhoneIncoming className="text-neon-cyan" size={20} />
                            <span>Chamada de Vídeo</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-red-400 font-mono bg-red-500/10 px-2 py-1 rounded">
                            <Clock size={12} />
                            <span>00:{timeLeft.toString().padStart(2, '0')}</span>
                        </div>
                    </div>

                    <div className="p-6 text-center space-y-4">
                        <div className="w-16 h-16 mx-auto bg-neon-cyan/10 rounded-full flex items-center justify-center border border-neon-cyan/30">
                            <Video size={32} className="text-neon-cyan" />
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-white">{call.client_name}</h3>
                            <p className="text-sm text-slate-400">quer iniciar uma consulta</p>
                        </div>


                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <NeonButton variant="red" size="sm" onClick={onReject}>
                                Recusar
                            </NeonButton>
                            <NeonButton variant="green" size="sm" onClick={onAccept}>
                                Aceitar Agora
                            </NeonButton>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1 bg-white/10 w-full mb-0">
                        <motion.div
                            className="h-full bg-neon-cyan"
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: 20, ease: 'linear' }}
                        />
                    </div>
                </GlassCard>
            </motion.div>
        </AnimatePresence>
    )
}
