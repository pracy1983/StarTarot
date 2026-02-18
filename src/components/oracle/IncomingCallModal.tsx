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
    const [isCheckingHardware, setIsCheckingHardware] = useState(false)
    const [hardwareError, setHardwareError] = useState<string | null>(null)

    useEffect(() => {
        if (call) {
            setTimeLeft(20)
            setHardwareError(null)
            setIsCheckingHardware(false)
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer)
                        if (!isCheckingHardware && !isAccepting) {
                            onReject() // Auto-reject on timeout
                        }
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [call])

    const handleAcceptClick = async () => {
        setIsCheckingHardware(true)
        setHardwareError(null)

        try {
            // Import Agora dynamicly to ensure it only runs on client
            const AgoraRTC = (await import('agora-rtc-sdk-ng')).default

            // Check for camera/mic availability
            // We create tracks and then immediately close them
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack().catch(err => {
                console.error('Audio track failed', err)
                throw err
            })

            const videoTrack = await AgoraRTC.createCameraVideoTrack().catch(err => {
                console.error('Video track failed', err)
                // If video fails but audio works, we should still stop audio
                audioTrack.stop()
                audioTrack.close()
                throw err
            })

            // Success: Clean up tracks before moving to sala
            audioTrack.stop()
            audioTrack.close()
            videoTrack.stop()
            videoTrack.close()

            // Proceed with original accept logic
            onAccept()
        } catch (err: any) {
            console.error('Hardware check failed during accept:', err)
            let msg = 'Erro ao acessar câmera ou microfone.'

            if (err.name === 'NotReadableError' || err.message?.includes('NotReadableError')) {
                msg = 'Sua câmera já está sendo usada por outro aplicativo. Feche-o e tente novamente.'
            } else if (err.name === 'NotAllowedError') {
                msg = 'Permissão negada. Por favor, libere a câmera e microfone no seu navegador.'
            } else if (err.name === 'NotFoundError') {
                msg = 'Câmera ou microfone não encontrados. Verifique a conexão do hardware.'
            }

            setHardwareError(msg)
        } finally {
            setIsCheckingHardware(false)
        }
    }

    if (!call) return null

    const showProcessing = isCheckingHardware || isAccepting

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.9 }}
                className="fixed top-24 right-4 z-50 md:right-8 w-full max-w-sm"
            >
                <GlassCard className={`border-neon-cyan/50 shadow-[0_0_50px_rgba(34,211,238,0.2)] p-0 overflow-hidden ${hardwareError ? 'border-red-500/50' : ''}`}>
                    <div className={`bg-gradient-to-r ${hardwareError ? 'from-red-500/20' : 'from-neon-cyan/20'} to-transparent p-4 flex items-center justify-between border-b border-white/5`}>
                        <div className="flex items-center space-x-2 text-white font-bold">
                            {hardwareError ? (
                                <AlertTriangle className="text-red-500" size={20} />
                            ) : (
                                <PhoneIncoming className="text-neon-cyan animate-pulse" size={20} />
                            )}
                            <span>{hardwareError ? 'Erro de Conexão' : 'Chamada de Vídeo'}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-red-400 font-mono bg-red-500/10 px-2 py-1 rounded">
                            <Clock size={12} />
                            <span>00:{timeLeft.toString().padStart(2, '0')}</span>
                        </div>
                    </div>

                    <div className="p-6 text-center space-y-4">
                        {!showProcessing && !hardwareError && (
                            <div className="w-16 h-16 mx-auto bg-neon-cyan/10 rounded-full flex items-center justify-center border border-neon-cyan/30">
                                <Video size={32} className="text-neon-cyan" />
                            </div>
                        )}

                        {showProcessing && (
                            <div className="w-16 h-16 mx-auto bg-neon-purple/10 rounded-full flex items-center justify-center border border-neon-purple/30">
                                <Loader2 size={32} className="text-neon-purple animate-spin" />
                            </div>
                        )}

                        {hardwareError && (
                            <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
                                <AlertTriangle size={32} className="text-red-500" />
                            </div>
                        )}

                        <div>
                            <h3 className="text-xl font-bold text-white">{call.client_name}</h3>
                            {showProcessing ? (
                                <p className="text-sm text-neon-purple font-bold animate-pulse">
                                    {isCheckingHardware ? 'Verificando hardware...' : 'Finalizando aceite...'}
                                </p>
                            ) : hardwareError ? (
                                <p className="text-xs text-red-400 font-medium px-2 py-1 bg-red-500/5 rounded-lg border border-red-500/20">
                                    {hardwareError}
                                </p>
                            ) : (
                                <p className="text-sm text-slate-400">quer iniciar uma consulta</p>
                            )}
                        </div>

                        {call.topic && !hardwareError && !showProcessing && (
                            <div className="bg-white/5 rounded-lg p-2 text-xs text-slate-300 italic">
                                "{call.topic}"
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <NeonButton variant="red" size="sm" onClick={onReject} disabled={showProcessing}>
                                Recusar
                            </NeonButton>

                            {hardwareError ? (
                                <NeonButton variant="purple" size="sm" onClick={handleAcceptClick}>
                                    <RefreshCw size={14} className="mr-2" />
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
                            animate={{ width: showProcessing ? '100%' : '0%' }}
                            transition={{ duration: showProcessing ? 0 : 20, ease: 'linear' }}
                        />
                    </div>
                </GlassCard>
            </motion.div>
        </AnimatePresence>
    )
}
