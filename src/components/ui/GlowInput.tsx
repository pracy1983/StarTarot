'use client'

import { InputHTMLAttributes, ReactNode } from 'react'

interface GlowInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    icon?: ReactNode
    className?: string
}

export const GlowInput = ({
    label,
    error,
    icon,
    className = '',
    ...props
}: GlowInputProps) => {
    return (
        <div className="w-full space-y-1.5">
            {label && (
                <label className="text-sm font-medium text-slate-400 ml-1">
                    {label}
                </label>
            )}
            <div className="relative group">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-neon-purple transition-colors">
                        {icon}
                    </div>
                )}
                <input
                    className={`
            w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 
            ${icon ? 'pl-11' : ''}
            text-white placeholder:text-slate-600 outline-none
            focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/20
            transition-all duration-300
            ${error ? 'border-red-500 bg-red-500/5 focus:border-red-500' : ''}
            ${className}
          `}
                    {...props}
                />
                <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 shadow-[0_0_15px_rgba(168,85,247,0.1)] pointer-events-none transition-opacity duration-300" />
            </div>
            {error && (
                <p className="text-xs text-red-400 ml-1">{error}</p>
            )}
        </div>
    )
}
