'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Sparkles, MessageSquare, Video, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
    }
}

export const OracleCard = ({ oracle }: OracleCardProps) => {
    const router = useRouter()

    const handleStartConsultation = (e: React.MouseEvent) => {
        e.stopPropagation()
        router.push(`/app/consulta/${oracle.id}`)
    }

    const handleViewProfile = () => {
        router.push(`/app/oraculo/${oracle.id}`)
    }

    return (
        <GlassCard
            className="relative flex flex-col h-full border-white/5 group hover:border-white/20 transition-all duration-500 cursor-pointer"
            glowColor={oracle.is_online ? 'purple' : 'none'}
            onClick={handleViewProfile}
        >
            {/* Online Badge */}
            <div className={`absolute top-4 right-4 flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest z-10 ${oracle.is_online
                ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                : 'bg-slate-800 text-slate-500 border border-white/5'
                }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${oracle.is_online ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
                <span>{oracle.is_online ? 'Disponível' : 'Ausente'}</span>
            </div>

            <div className="flex flex-col items-center text-center space-y-4 pt-4">
                {/* Avatar */}
                <div className="relative">
                    <div className={`absolute inset-0 rounded-full blur-xl opacity-20 transition-all duration-500 group-hover:scale-110 ${oracle.is_online ? 'bg-neon-purple' : 'bg-slate-500'}`} />
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
                    <p className="text-neon-cyan text-xs font-medium uppercase tracking-widest mt-1">
                        {oracle.specialty}
                    </p>
                </div>

                {/* Info Tags - sem rating fictício */}
                <div className="flex items-center space-x-3">
                    <div className="flex items-center text-slate-400 text-[10px] font-bold">
                        <Clock size={12} className="mr-1" />
                        {oracle.is_ai || oracle.oracle_type === 'ai'
                            ? `${oracle.price_per_message || 10} cr/mens.`
                            : `${oracle.credits_per_minute} cr/min`}
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

                <p className="text-slate-400 text-sm line-clamp-2 min-h-[40px]">
                    {oracle.bio}
                </p>

                {/* Feature Icons */}
                <div className="flex items-center justify-center space-x-4 py-2 text-slate-500">
                    <div className="flex flex-col items-center space-y-1">
                        <MessageSquare size={16} className={`${oracle.is_online ? 'text-neon-purple/60' : ''}`} />
                        <span className="text-[8px] uppercase font-bold">Texto</span>
                    </div>
                    {oracle.oracle_type === 'human' && (
                        <div className="flex flex-col items-center space-y-1">
                            <Video size={16} className={`${oracle.is_online ? 'text-neon-cyan/60' : ''}`} />
                            <span className="text-[8px] uppercase font-bold">Vídeo</span>
                        </div>
                    )}
                </div>

                <NeonButton
                    variant={oracle.is_online ? 'purple' : 'gold'}
                    fullWidth
                    size="md"
                    className="mt-4"
                    onClick={handleStartConsultation}
                >
                    {oracle.is_online ? 'Iniciar Consulta' : 'Deixar Mensagem'}
                </NeonButton>
            </div>
        </GlassCard>
    )
}
