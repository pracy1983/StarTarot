import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { PhoneIncoming, Video, X, Clock, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { IncomingCall } from '@/hooks/useRealtimeCalls'

interface IncomingCallModalProps {
    call: IncomingCall | null
    isAccepting?: boolean
    onAccept: () => void
    onReject: () => void
}

export function IncomingCallModal({ call, isAccepting = false, onAccept, onReject }: IncomingCallModalProps) {
    const [timeLeft, setTimeLeft] = useState(20)
    const [isAcceptingLocal, setIsAcceptingLocal] = useState(false)
    const [hardwareError, setHardwareError] = useState<string | null>(null)
    const [isCheckingHardware, setIsCheckingHardware] = useState(false)

    useEffect(() => {
        if (call && !isAccepting && !isAcceptingLocal && !hardwareError) {
            setTimeLeft(20)
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer)
                        if (!isAccepting && !isAcceptingLocal) {
                            onReject() // Auto-reject on timeout
                        }
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [call, isAccepting, isAcceptingLocal, hardwareError])

    const checkHardware = async (): Promise<boolean> => {
        setIsCheckingHardware(true)
        setHardwareError(null)
        
        try {
            // Tenta acessar câmera e microfone simultaneamente
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            })
            
            // Fecha o stream imediatamente após o teste bem sucedido
            stream.getTracks().forEach(track => track.stop())
            setIsCheckingHardware(false)
            return true
        } catch (error: any) {
            console.error('Erro de hardware detectado:', error)
            
            let message = "Câmera ou Microfone não detectados."
            if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                message = "Câmera/Microfone já estão sendo usados por outro app."
            } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                message = "Permissão de acesso à câmera/microfone negada."
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                message = "Câmera ou Microfone não encontrados neste dispositivo."
            }
            
            setHardwareError(message)
            setIsCheckingHardware(false)
            return false
        }
    }

    const handleAcceptClick = async () => {
        const hasHardware = await checkHardware()
        if (hasHardware) {
            setIsAcceptingLocal(true)
            onAccept()
        }
    }

    if (!call) return null

    const showProcessing = isAccepting || isAcceptingLocal || isCheckingHardware

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.9 }}
                className="fixed top-24 right-4 z-50 md:right-8 w-full max-w-sm"
            >
                <GlassCard className={`border-2 transition-colors duration-300 ${hardwareError ? 'border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)]' : 'border-neon-cyan/50 shadow-[0_0_50px_rgba(34,211,238,0.2)]'} p-0 overflow-hidden`}>
                    <div className={`bg-gradient-to-r ${hardwareError ? 'from-red-500/20' : 'from-neon-cyan/20'} to-transparent p-4 flex items-center justify-between border-b border-white/5`}>
                        <div className="flex items-center space-x-2 text-white font-bold">
                            {hardwareError ? (
                                <AlertTriangle className="text-red-500" size={20} />
                            ) : (
                                <PhoneIncoming className="text-neon-cyan animate-pulse" size={20} />
                            )}
                            <span>{hardwareError ? 'Erro de Hardware' : 'Chamada de Vídeo'}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-red-400 font-mono bg-red-500/10 px-2 py-1 rounded">
                            <Clock size={12} />
                            <span>00:{timeLeft.toString().padStart(2, '0')}</span>
                        </div>
                    </div>

                    <div className="p-6 text-center space-y-4">
                        {!showProcessing && !hardwareError && (
                            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center border-2 border-neon-cyan/50 p-1 bg-deep-space relative">
                                <div className="w-full h-full rounded-full overflow-hidden bg-white/5 flex items-center justify-center">
                                    {call.client_avatar ? (
                                        <img src={call.client_avatar} alt={call.client_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-neon-cyan/10 flex items-center justify-center">
                                            <Video size={36} className="text-neon-cyan" />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-neon-cyan p-1.5 rounded-full shadow-lg shadow-neon-cyan/50">
                                    <Video size={12} className="text-black" />
                                </div>
                            </div>
                        )}

                        {showProcessing && (
                            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center border-2 border-neon-purple/50 p-1 bg-deep-space relative">
                                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                                    <Loader2 size={36} className="text-neon-purple animate-spin" />
                                </div>
                            </div>
                        )}

                        {hardwareError && (
                            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center border-2 border-red-500/50 p-1 bg-deep-space relative">
                                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-red-500/10">
                                    <AlertTriangle size={36} className="text-red-500" />
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-xl font-bold text-white">
                                {hardwareError ? 'Verifique seu Equipamento' : call.client_name}
                            </h3>
                            {isCheckingHardware ? (
                                <p className="text-sm text-neon-cyan font-bold animate-pulse">
                                    Verificando câmera e microfone...
                                </p>
                            ) : isAcceptingLocal || isAccepting ? (
                                <p className="text-sm text-neon-purple font-bold animate-pulse">
                                    Conectando...
                                </p>
                            ) : hardwareError ? (
                                <p className="text-sm text-red-400 font-medium px-4">
                                    {hardwareError}
                                </p>
                            ) : (
                                <p className="text-sm text-slate-400">quer iniciar uma consulta</p>
                            )}
                        </div>

                        {call.topic && !showProcessing && !hardwareError && (
                            <div className="bg-white/5 rounded-lg p-2 text-xs text-slate-300 italic">
                                "{call.topic}"
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <NeonButton 
                                variant="red" 
                                size="sm" 
                                onClick={onReject} 
                                disabled={showProcessing && !hardwareError}
                            >
                                {hardwareError ? 'Ignorar' : 'Recusar'}
                            </NeonButton>

                            {hardwareError ? (
                                <NeonButton
                                    variant="purple"
                                    size="sm"
                                    onClick={handleAcceptClick}
                                    className="shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                                >
                                    <RefreshCw className="mr-2" size={16} />
                                    Tentar Novamente
                                </NeonButton>
                            ) : (
                                <NeonButton
                                    variant="green"
                                    size="sm"
                                    onClick={handleAcceptClick}
                                    loading={showProcessing}
                                    disabled={showProcessing}
                                >
                                    Aceitar Agora
                                </NeonButton>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1 bg-white/10 w-full mb-0">
                        <motion.div
                            className={`h-full ${hardwareError ? 'bg-red-500' : 'bg-neon-cyan'}`}
                            initial={{ width: '100%' }}
                            animate={{ width: (showProcessing || hardwareError) ? '100%' : '0%' }}
                            transition={{ duration: (showProcessing || hardwareError) ? 0 : 20, ease: 'linear' }}
                        />
                    </div>
                </GlassCard>
            </motion.div>
        </AnimatePresence>
    )
}
