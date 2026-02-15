'use client'

import React, { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'

interface NeonButtonProps extends HTMLMotionProps<'button'> {
    children: ReactNode
    variant?: 'purple' | 'cyan' | 'gold' | 'green' | 'red' | 'white'
    size?: 'sm' | 'md' | 'lg'
    fullWidth?: boolean
    loading?: boolean
    className?: string
}

export const NeonButton = ({
    children,
    variant = 'purple',
    size = 'md',
    fullWidth = false,
    loading = false,
    className = '',
    ...props
}: NeonButtonProps) => {
    const variants = {
        purple: 'bg-neon-purple/10 border-neon-purple text-neon-purple hover:bg-neon-purple hover:text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]',
        cyan: 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-white shadow-[0_0_15px_rgba(34,211,238,0.3)]',
        gold: 'bg-neon-gold/10 border-neon-gold text-neon-gold hover:bg-neon-gold hover:text-white shadow-[0_0_15px_rgba(251,191,36,0.3)]',
        green: 'bg-green-500/10 border-green-500 text-green-400 hover:bg-green-500 hover:text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]',
        red: 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500 hover:text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]',
        white: 'bg-white/10 border-white text-white hover:bg-white hover:text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]'
    }

    const sizes = {
        sm: 'px-4 py-1.5 text-sm',
        md: 'px-6 py-2.5 text-base',
        lg: 'px-8 py-3.5 text-lg font-bold'
    }

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
        relative overflow-hidden border rounded-lg transition-all duration-300 font-medium
        flex items-center justify-center
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${loading ? 'opacity-70 cursor-not-allowed' : ''}
        ${className}
      `}
            disabled={loading}
            {...props}
        >
            {loading ? (
                <div className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processando...
                </div>
            ) : children}
        </motion.button>
    )
}
