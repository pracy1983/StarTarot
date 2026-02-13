'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface GlassCardProps {
    children: ReactNode
    className?: string
    glowColor?: 'purple' | 'cyan' | 'gold' | 'none'
    hover?: boolean
}

export const GlassCard = ({
    children,
    className = '',
    glowColor = 'none',
    hover = true
}: GlassCardProps) => {
    const glowStyles = {
        purple: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] border-neon-purple/20',
        cyan: 'hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] border-neon-cyan/20',
        gold: 'hover:shadow-[0_0_30px_rgba(251,191,36,0.2)] border-neon-gold/20',
        none: 'hover:border-white/20'
    }

    return (
        <motion.div
            whileHover={hover ? { y: -5 } : {}}
            className={`glass rounded-2xl p-6 transition-all duration-300 ${glowStyles[glowColor]} ${className}`}
        >
            {children}
        </motion.div>
    )
}
