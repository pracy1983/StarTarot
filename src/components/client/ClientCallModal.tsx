import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { PhoneOutgoing, X, Loader2 } from 'lucide-react'

interface ClientCallModalProps {
    isOpen: boolean
    oracleName: string
    avatarUrl: string
    creditsPerMinute: number
    initialFee: number
    onCancel: () => void
}

export function ClientCallModal({ isOpen, oracleName, avatarUrl, creditsPerMinute, initialFee, onCancel }: ClientCallModalProps) {
    const callingRef = React.useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        if (isOpen) {
            if (!callingRef.current) {
                callingRef.current = new Audio('/sounds/calling.mp3')
                callingRef.current.loop = true
            }
            callingRef.current.play().catch(e => console.log('Audio play failed', e))
        } else {
            if (callingRef.current) {
                callingRef.current.pause()
                callingRef.current.currentTime = 0
            }
        }

        return () => {
            if (callingRef.current) {
                callingRef.current.pause()
                callingRef.current.currentTime = 0
            }
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
                <GlassCard className="max-w-sm w-full border-neon-purple/50 shadow-[0_0_50px_rgba(168,85,247,0.2)] p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-purple to-transparent animate-pulse" />

                    <div className="relative mb-6">
                        <div className="w-24 h-24 mx-auto rounded-full p-1 bg-gradient-to-tr from-neon-purple to-neon-cyan animate-spin-slow">
                            <img
                                src={avatarUrl}
                                alt={oracleName}
                                className="w-full h-full rounded-full object-cover border-4 border-black"
                            />
                        </div>
                        <div className="absolute bottom-0 right-1/3 bg-green-500 w-4 h-4 rounded-full border-2 border-black animate-pulse" />
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">Chamando...</h3>
                    <p className="text-slate-400 mb-4 font-medium">Aguarde {oracleName} aceitar a chamada.</p>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3">
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Por Minuto</p>
                            <p className="text-sm font-bold text-neon-gold">{creditsPerMinute} Créditos</p>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3">
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Tarifa Inicial</p>
                            <p className="text-sm font-bold text-white">{initialFee > 0 ? `${initialFee} Créditos` : 'Grátis'}</p>
                        </div>
                    </div>

                    <div className="flex justify-center mb-8">
                        <div className="flex space-x-2">
                            <span className="w-3 h-3 bg-neon-purple rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-3 h-3 bg-neon-purple rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-3 h-3 bg-neon-purple rounded-full animate-bounce"></span>
                        </div>
                    </div>

                    <NeonButton variant="red" fullWidth onClick={onCancel}>
                        <X size={18} className="mr-2" />
                        Cancelar Chamada
                    </NeonButton>
                </GlassCard>
            </motion.div>
        </AnimatePresence>
    )
}
