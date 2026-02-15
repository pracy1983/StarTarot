import React from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Sparkles, MessageSquare, Video, Clock, Calendar } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { getOracleStatus } from '@/lib/status'

interface OracleCardProps {
    oracle: {
        id: string
        full_name: string
        specialty: string
        bio: string
        avatar_url: string | null
        is_online: boolean
        credits_per_minute: number
        price_per_message?: number
        is_ai?: boolean
        oracle_type: 'human' | 'ai'
        schedules?: any[]
    }
}

export const OracleCard = ({ oracle }: OracleCardProps) => {
    const router = useRouter()
    const pathname = usePathname()
    const { isAuthenticated } = useAuthStore()

    const { status, label } = getOracleStatus(oracle.is_online, oracle.schedules || [])

    const handleStartConsultation = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!isAuthenticated) {
            toast.error('Faça login para iniciar uma consulta')
            // Se estiver na landing, abrimos o modal via algum estado global ou simplesmente avisamos
            // Como não temos estado global de modal fácil, vamos redirecionar pro topo or trigger local
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        router.push(`/app/consulta/${oracle.id}`)
    }

    const handleViewProfile = () => {
        if (!isAuthenticated && pathname === '/') {
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        router.push(`/app/oraculo/${oracle.id}`)
    }

    const getStatusColor = () => {
        if (status === 'online') return 'bg-green-500 text-green-400'
        if (status === 'horario') return 'bg-neon-gold text-neon-gold'
        return 'bg-slate-800 text-slate-500'
    }

    return (
        <GlassCard
            className="relative flex flex-col h-full border-white/5 group hover:border-white/20 transition-all duration-500 cursor-pointer"
            glowColor={status === 'online' ? 'purple' : (status === 'horario' ? 'gold' : 'none')}
            onClick={handleViewProfile}
        >
            {/* Status Badge */}
            <div className={`absolute top-4 right-4 flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest z-10 border shadow-lg ${status === 'online' ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/10' :
                    status === 'horario' ? 'bg-neon-gold/10 text-neon-gold border-neon-gold/20 shadow-neon-gold/10' :
                        'bg-slate-800/50 text-slate-500 border-white/5'
                }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-green-400 animate-pulse' :
                        status === 'horario' ? 'bg-neon-gold' : 'bg-slate-600'
                    }`} />
                <span>{label}</span>
            </div>

            <div className="flex flex-col items-center text-center space-y-4 pt-4">
                {/* Avatar */}
                <div className="relative">
                    <div className={`absolute inset-0 rounded-full blur-xl opacity-20 transition-all duration-500 group-hover:scale-110 ${status === 'online' ? 'bg-neon-purple' : status === 'horario' ? 'bg-neon-gold' : 'bg-slate-500'
                        }`} />
                    <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-white/10 to-white/5 relative z-10">
                        <img
                            src={oracle.avatar_url || `https://ui-avatars.com/api/?name=${oracle.full_name}&background=12122a&color=a855f7`}
                            alt={oracle.full_name}
                            className="w-full h-full rounded-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all"
                        />
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-neon-purple transition-colors duration-300">
                        {oracle.full_name}
                    </h3>
                    <p className="text-neon-cyan text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                        {oracle.specialty}
                    </p>
                </div>

                {/* Info Tags */}
                <div className="flex items-center space-x-3">
                    <div className="flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <Clock size={12} className="mr-1 text-neon-purple/50" />
                        {oracle.is_ai || oracle.oracle_type === 'ai'
                            ? `${oracle.price_per_message || 10} CR`
                            : `${oracle.credits_per_minute} CR/MIN`}
                    </div>
                    {oracle.is_ai && (
                        <>
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <div className="flex items-center text-neon-cyan text-[10px] font-bold">
                                <Sparkles size={12} className="mr-1" /> IA
                            </div>
                        </>
                    )}
                </div>

                <p className="text-slate-400 text-sm line-clamp-2 min-h-[40px] px-2 leading-relaxed">
                    {oracle.bio}
                </p>

                {/* Feature Icons */}
                <div className="flex items-center justify-center space-x-6 py-2 text-slate-500 border-t border-white/5 w-full">
                    <div className="flex flex-col items-center space-y-1">
                        <MessageSquare size={16} className={status === 'online' ? 'text-neon-purple/60' : ''} />
                        <span className="text-[8px] uppercase font-black tracking-tighter">Chat</span>
                    </div>
                    {oracle.oracle_type === 'human' && (
                        <div className="flex flex-col items-center space-y-1">
                            <Video size={16} className={status === 'online' ? 'text-neon-cyan/60' : ''} />
                            <span className="text-[8px] uppercase font-black tracking-tighter">Vídeo</span>
                        </div>
                    )}
                </div>

                <NeonButton
                    variant={status === 'online' ? 'purple' : 'gold'}
                    fullWidth
                    size="md"
                    className="mt-2"
                    onClick={handleStartConsultation}
                >
                    {status === 'online' ? 'Iniciar Consulta' : (status === 'horario' ? 'Entrar na Fila' : 'Deixar Mensagem')}
                </NeonButton>
            </div>
        </GlassCard>
    )
}
import toast from 'react-hot-toast'
