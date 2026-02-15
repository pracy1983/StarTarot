'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Crown, User, Sparkles, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const views = [
    { id: 'owner', label: 'Painel Owner', icon: <Crown size={14} />, href: '/admin', color: 'text-neon-gold' },
    { id: 'client', label: 'Visão Cliente', icon: <User size={14} />, href: '/app', color: 'text-neon-cyan' },
    { id: 'oracle', label: 'Visão do Oraculista', icon: <Sparkles size={14} />, href: '/app/dashboard', color: 'text-neon-purple' },
]

export function RoleSwitcher() {
    const { profile } = useAuthStore()
    const [open, setOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const ref = useRef<HTMLDivElement>(null)

    // Filtrar visões baseadas no papel do usuário
    const availableViews = views.filter(v => {
        if (profile?.role === 'owner') return true // Owner vê tudo
        if (v.id === 'client') return true // Todos vêm visão cliente
        if (v.id === 'oracle' && (profile?.role === 'oracle' || profile?.is_oracle)) return true
        return false
    })

    // Detectar visão atual
    const current = pathname.startsWith('/admin') ? 'owner'
        : pathname.startsWith('/app/dashboard') || pathname.startsWith('/app/tornar-se-oraculo') ? 'oracle'
            : 'client'

    const currentView = views.find(v => v.id === current) || views[0]

    // Fechar ao clicar fora
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    if (availableViews.length <= 1) return null

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-sm font-bold"
            >
                <span className={currentView.color}>{currentView.icon}</span>
                <span className="text-white text-xs hidden sm:block">{currentView.label}</span>
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[#12122a] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                    {availableViews.map((v) => (
                        <button
                            key={v.id}
                            onClick={() => {
                                router.push(v.href)
                                setOpen(false)
                            }}
                            className={`w-full flex items-center space-x-3 px-4 py-3 text-sm transition-all ${v.id === current
                                ? 'bg-white/10 text-white font-bold'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className={v.color}>{v.icon}</span>
                            <span>{v.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
