'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
    User,
    Settings,
    LogOut,
    Sparkles,
    Crown,
    ChevronDown,
    Power,
    Wallet,
    LayoutDashboard,
    Radio
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { motion, AnimatePresence } from 'framer-motion'

interface ProfileMenuProps {
    isOnline: boolean
    toggleOnline: () => void
}

export function ProfileMenu({ isOnline, toggleOnline }: ProfileMenuProps) {
    const { profile, logout } = useAuthStore()
    const [open, setOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const menuRef = useRef<HTMLDivElement>(null)

    const isAdminView = pathname.startsWith('/admin')
    const isOracleView = pathname.startsWith('/app/dashboard') ||
        pathname.startsWith('/app/tornar-se-oraculo')

    const currentRole = isAdminView ? 'owner' : isOracleView ? 'oracle' : 'client'

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleLogout = async () => {
        await logout()
        router.push('/')
    }

    const navTo = (path: string) => {
        router.push(path)
        setOpen(false)
    }

    const availableViews = [
        { id: 'client', label: 'Visão Cliente', icon: <User size={16} />, href: '/app', color: 'text-neon-cyan' },
        { id: 'oracle', label: 'Visão Oraculista', icon: <Sparkles size={16} />, href: '/app/dashboard', color: 'text-neon-purple', requiredRole: 'oracle', approved: true },
        { id: 'owner', label: 'Painel Admin', icon: <Crown size={16} />, href: '/admin', color: 'text-neon-gold', requiredRole: 'owner' },
    ].filter(v => {
        if (!v.requiredRole) return true
        if (profile?.role === 'owner') return true
        if (v.requiredRole === 'oracle' && profile?.role === 'oracle' && profile?.application_status === 'approved') return true
        return false
    })

    return (
        <div ref={menuRef} className="relative">
            {/* Profile Trigger */}
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center space-x-2 p-1 pr-3 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
            >
                <div className="relative">
                    <div className={`w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr ${isOracleView ? 'from-neon-purple to-neon-cyan' : 'from-neon-gold to-neon-purple'}`}>
                        <div className="w-full h-full rounded-full bg-deep-space flex items-center justify-center overflow-hidden">
                            <img
                                src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&background=0a0a1a&color=a855f7`}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                    {/* Online Dot */}
                    {profile?.role === 'oracle' && (
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-deep-space ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`} />
                    )}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-none text-left">
                    <span className="text-xs font-bold text-white truncate max-w-[80px]">
                        {(isOracleView ? profile?.name_fantasy : profile?.full_name?.split(' ')[0]) || 'Viajante'}
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">
                        {currentRole === 'owner' ? 'Admin' : currentRole === 'oracle' ? 'Oráculo' : 'Explorador'}
                    </span>
                </div>
                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-3 w-64 bg-[#0a0a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] backdrop-blur-xl"
                    >
                        {/* Status Section (Oracles only) */}
                        {((profile?.role === 'oracle' && profile?.application_status === 'approved') || profile?.role === 'owner') && (
                            <div className="p-4 border-b border-white/10 bg-white/5">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Disponibilidade</p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                                        <span className={`text-sm font-bold ${isOnline ? 'text-green-400' : 'text-slate-400'}`}>
                                            {isOnline ? 'Online para Atender' : 'Indisponível'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            toggleOnline()
                                        }}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${isOnline ? 'bg-green-500/20 border border-green-500/50' : 'bg-slate-800 border border-white/10'}`}
                                    >
                                        <motion.div
                                            animate={{ x: isOnline ? 22 : 2 }}
                                            className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-slate-400'}`}
                                        />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Views Section */}
                        <div className="p-2 border-b border-white/10">
                            <p className="px-2 pt-2 pb-1 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Alternar Visão</p>
                            {availableViews.map((view) => (
                                <button
                                    key={view.id}
                                    onClick={() => navTo(view.href)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${currentRole === view.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                >
                                    <div className="flex items-center space-x-3 text-sm">
                                        <span className={view.color}>{view.icon}</span>
                                        <span>{view.label}</span>
                                    </div>
                                    {currentRole === view.id && <div className="w-1.5 h-1.5 rounded-full bg-neon-purple" />}
                                </button>
                            ))}
                        </div>

                        {/* Secondary Actions */}
                        <div className="p-2">
                            <button
                                onClick={() => navTo(isOracleView ? '/app/dashboard/perfil' : '/app/perfil')}
                                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-all"
                            >
                                <Settings size={16} />
                                <span>Configurações</span>
                            </button>

                            {isOracleView && (
                                <button
                                    onClick={() => navTo('/app/dashboard/sala')}
                                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-all"
                                >
                                    <Radio size={16} />
                                    <span>Minha Sala</span>
                                </button>
                            )}

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-400/10 transition-all border-t border-white/5 mt-2"
                            >
                                <LogOut size={16} />
                                <span>Sair da Conta</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
