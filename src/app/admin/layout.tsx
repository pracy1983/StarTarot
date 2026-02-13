'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
    Users,
    Settings,
    BarChart3,
    MessageSquare,
    LogOut,
    Moon,
    Sparkles,
    LayoutDashboard
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { profile, logout } = useAuthStore()
    const router = useRouter()

    const handleLogout = async () => {
        await logout()
        router.push('/')
    }

    const navItems = [
        { label: 'Visão Geral', icon: <LayoutDashboard size={20} />, href: '/admin' },
        { label: 'Oraculistas', icon: <Users size={20} />, href: '/admin/oraculistas' },
        { label: 'Consultas', icon: <MessageSquare size={20} />, href: '/admin/consultas' },
        { label: 'Finanças', icon: <BarChart3 size={20} />, href: '/admin/financeiro' },
        { label: 'Configurações', icon: <Settings size={20} />, href: '/admin/config' },
    ]

    return (
        <div className="flex min-h-screen bg-deep-space relative">
            <div className="stars-overlay opacity-10" />

            {/* Sidebar Glassmorphism */}
            <aside className="w-64 glass border-r border-white/5 flex flex-col z-20">
                <div className="p-8">
                    <div className="flex items-center space-x-3 mb-10">
                        <div className="w-8 h-8 relative">
                            <div className="absolute inset-0 bg-neon-purple blur-md opacity-30" />
                            <img src="/logo.png" alt="Star Tarot" className="relative z-10 w-full" />
                        </div>
                        <span className="text-xl font-bold tracking-tighter text-white">Owner <span className="text-neon-purple">Star</span></span>
                    </div>

                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => router.push(item.href)}
                                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
                            >
                                <span className="group-hover:text-neon-purple transition-colors">{item.icon}</span>
                                <span className="text-sm font-medium">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-8 border-t border-white/5">
                    <div className="flex items-center space-x-3 mb-6 p-2 rounded-xl bg-white/5">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-neon-purple to-neon-cyan p-0.5">
                            <div className="w-full h-full rounded-full bg-deep-space flex items-center justify-center overflow-hidden">
                                <img src={profile?.avatar_url || 'https://ui-avatars.com/api/?name=Owner'} alt="Admin" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{profile?.full_name || 'Admin Star'}</p>
                            <p className="text-[10px] text-slate-500 truncate">Owner Access</p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/5 transition-all"
                    >
                        <LogOut size={18} />
                        <span className="text-sm font-medium">Encerrar Sessão</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative z-10">
                {/* Header Superior */}
                <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between glass sticky top-0 z-30">
                    <div className="flex items-center text-slate-400 text-xs">
                        <Sparkles size={14} className="mr-2 text-neon-gold" />
                        Conexão Estelar Estabelecida • Gateway: Supabase Realtime
                    </div>
                    <div className="flex items-center space-x-4">
                        <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
                            <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-neon-purple rounded-full" />
                            <MessageSquare size={20} />
                        </button>
                        <div className="h-4 w-px bg-white/10 mx-2" />
                        <div className="flex items-center text-sm font-bold text-neon-gold">
                            <Sparkles size={16} className="mr-2" />
                            1.250 Credits Total
                        </div>
                    </div>
                </header>

                <div className="relative">
                    {children}
                </div>
            </main>
        </div>
    )
}
