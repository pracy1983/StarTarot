'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
    Home,
    Wallet,
    History,
    Inbox,
    User,
    LogOut,
    Sparkles,
    Search
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { motion } from 'framer-motion'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { profile, logout } = useAuthStore()
    const router = useRouter()
    const pathname = usePathname()

    const handleLogout = async () => {
        await logout()
        router.push('/')
    }

    const navItems = [
        { label: 'Templo', icon: <Home size={22} />, href: '/app' },
        { label: 'Carteira', icon: <Wallet size={22} />, href: '/app/carteira' },
        { label: 'Mensagens', icon: <Inbox size={22} />, href: '/app/mensagens' },
        { label: 'Histórico', icon: <History size={22} />, href: '/app/historico' },
        { label: 'Meu Perfil', icon: <User size={22} />, href: '/app/perfil' },
    ]

    return (
        <div className="flex min-h-screen bg-deep-space relative flex-col">
            <div className="stars-overlay opacity-20" />

            {/* Top Banner / Search */}
            <header className="h-20 border-b border-white/5 px-4 md:px-8 flex items-center justify-between glass sticky top-0 z-40">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/app')}>
                    <div className="w-10 h-10 relative">
                        <div className="absolute inset-0 bg-neon-purple blur-lg opacity-40 animate-pulse" />
                        <img src="/logo.png" alt="Star Tarot" className="relative z-10 w-full" />
                    </div>
                    <span className="text-2xl font-bold tracking-tighter text-white hidden sm:block">
                        Star <span className="neon-text-purple">Tarot</span>
                    </span>
                </div>

                <div className="flex-1 max-w-md mx-8 hidden md:block">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-neon-purple transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por oraculista ou oráculo..."
                            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-4 text-sm text-white focus:border-neon-purple/50 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4">
                    {/* Botão Admin (Apenas para Owner) */}
                    {profile?.role === 'owner' && (
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple hover:text-white transition-all group flex items-center space-x-2"
                            title="Painel Administrativo"
                        >
                            <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                            <span className="text-xs font-bold hidden lg:block uppercase tracking-wider">Gestão</span>
                        </button>
                    )}

                    <div className="hidden sm:flex flex-col items-end px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-none mb-1">Saldo</span>
                        <span className="text-neon-gold font-bold flex items-center leading-none">
                            <Sparkles size={12} className="mr-1" />
                            {profile?.credits || 0} <span className="text-[10px] ml-1 opacity-70 italic font-medium">CR</span>
                        </span>
                    </div>

                    <button
                        onClick={() => router.push('/app/perfil')}
                        className="w-10 h-10 rounded-full bg-gradient-to-tr from-neon-purple to-neon-cyan p-0.5 hover:scale-105 transition-transform"
                    >
                        <div className="w-full h-full rounded-full bg-deep-space flex items-center justify-center overflow-hidden">
                            <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&background=0a0a1a&color=a855f7`} alt="Profile" />
                        </div>
                    </button>
                </div>
            </header>

            <div className="flex flex-1 relative">
                {/* Desktop Sidebar */}
                <aside className="w-20 lg:w-64 border-r border-white/5 glass flex flex-col sticky top-20 h-[calc(100vh-80px)] hidden md:flex">
                    <nav className="flex-1 py-8 px-4 space-y-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <button
                                    key={item.label}
                                    onClick={() => router.push(item.href)}
                                    className={`w-full flex items-center space-x-4 px-4 py-3 rounded-2xl transition-all group ${isActive
                                        ? 'bg-neon-purple/20 text-white shadow-[0_0_20px_rgba(168,85,247,0.15)] border border-neon-purple/30'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <span className={`${isActive ? 'text-neon-purple' : 'group-hover:text-neon-purple'} transition-colors`}>
                                        {item.icon}
                                    </span>
                                    <span className={`text-sm font-medium hidden lg:block`}>{item.label}</span>
                                    {isActive && <motion.div layoutId="nav-glow" className="absolute right-0 w-1 h-8 bg-neon-purple rounded-l-full" />}
                                </button>
                            )
                        })}
                    </nav>

                    <div className="p-4 border-t border-white/5">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-4 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-400/5 transition-all group"
                        >
                            <LogOut size={22} className="group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium hidden lg:block">Sair</span>
                        </button>
                    </div>
                </aside>

                {/* Mobile Bottom Nav */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass border-t border-white/10 z-50 flex items-center justify-around px-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <button
                                key={item.label}
                                onClick={() => router.push(item.href)}
                                className={`flex flex-col items-center justify-center space-y-1 ${isActive ? 'text-neon-purple' : 'text-slate-500'}`}
                            >
                                {item.icon}
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </button>
                        )
                    })}
                </nav>

                {/* Main Content */}
                <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
