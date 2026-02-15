import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Users, Clock, AlertCircle } from 'lucide-react'

interface ClientQueueModalProps {
    isOpen: boolean
    oracleName: string
    queuePosition: number
    onConfirm: () => void
    onCancel: () => void
}

export function ClientQueueModal({ isOpen, oracleName, queuePosition, onConfirm, onCancel }: ClientQueueModalProps) {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
                <GlassCard className="max-w-md w-full border-neon-gold/30 shadow-2xl p-8 text-center">
                    <div className="w-16 h-16 mx-auto bg-neon-gold/10 rounded-full flex items-center justify-center mb-6 text-neon-gold border border-neon-gold/30">
                        <Users size={32} />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{oracleName} está em atendimento</h3>
                    <p className="text-slate-400 text-sm mb-6">
                        No momento este oraculista está finalizando uma consulta. Deseja entrar na fila de espera?
                    </p>

                    <div className="bg-white/5 rounded-xl p-4 mb-8 flex items-center justify-center gap-6 border border-white/5">
                        <div className="text-center">
                            <span className="block text-xs uppercase text-slate-500 font-bold">Sua Posição</span>
                            <span className="text-2xl font-black text-white">{queuePosition}º</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="text-center">
                            <span className="block text-xs uppercase text-slate-500 font-bold">Tempo Estimado</span>
                            <span className="text-lg font-bold text-neon-gold flex items-center justify-center">
                                <Clock size={14} className="mr-1" />
                                ~{(queuePosition * 15)} min
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <NeonButton variant="gold" fullWidth onClick={onConfirm}>
                            Entrar na Fila
                        </NeonButton>
                        <button
                            onClick={onCancel}
                            className="text-sm text-slate-500 hover:text-white transition-colors py-2"
                        >
                            Cancelar e tentar depois
                        </button>
                    </div>
                </GlassCard>
            </motion.div>
        </AnimatePresence>
    )
}
