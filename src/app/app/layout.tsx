'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
    Home,
    Wallet,
    History,
    Inbox,
    User,
    LogOut,
    Sparkles,
    Search,
    LayoutDashboard,
    Radio,
    Ticket,
    Tag
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { motion } from 'framer-motion'
import { RoleSwitcher } from '@/components/ui/RoleSwitcher'
import { supabase } from '@/lib/supabase'
import { IncomingCallModal } from '@/components/oracle/IncomingCallModal'
import { OracleStatusToggle } from '@/components/oracle/OracleStatusToggle'
import { useRealtimeCalls } from '@/hooks/useRealtimeCalls'
import toast from 'react-hot-toast'
import { AuthModal } from '@/components/auth/AuthModal'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { profile, logout } = useAuthStore()
    const router = useRouter()
    const pathname = usePathname()
    const [walletBalance, setWalletBalance] = useState<number>(0)
    const [unreadCount, setUnreadCount] = useState(0)

    // Realtime Calls Hook (Global)
    const { isOnline, incomingCall, acceptCall, rejectCall, toggleOnline } = useRealtimeCalls()

    // Handle Accept Call
    const handleAcceptCall = async () => {
        const consultationId = await acceptCall()
        if (consultationId) {
            router.push(`/app/dashboard/sala?consultationId=${consultationId}`)
        }
    }

    const handleSafeNavigation = (path: string) => {
        if (pathname.includes('/sala') || pathname.includes('/video')) {
            if (window.confirm('Você está em uma chamada de vídeo. Tem certeza que deseja sair? A chamada será encerrada.')) {
                router.push(path)
            }
        } else {
            router.push(path)
        }
    }

    useEffect(() => {
        if (!profile?.id) return

        // Fetch initial unread count
        const fetchUnread = async () => {
            const { count } = await supabase
                .from('inbox_messages')
                .select('*', { count: 'exact', head: true })
                .eq('recipient_id', profile.id)
                .eq('is_read', false)
            setUnreadCount(count || 0)
        }

        fetchUnread()

        // Subscribe to changes
        const channel = supabase
            .channel('layout_inbox_count')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'inbox_messages',
                    filter: `recipient_id=eq.${profile.id}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newMsg = payload.new
                        toast((t) => (
                            <div
                                className="flex items-start space-x-3 cursor-pointer"
                                onClick={() => {
                                    handleSafeNavigation('/app/mensagens')
                                    toast.dismiss(t.id)
                                }}
                            >
                                <div className="text-neon-purple mt-1"><Inbox size={18} /></div>
                                <div>
                                    <p className="font-bold text-sm text-white">{newMsg.title}</p>
                                    <p className="text-xs text-slate-300 line-clamp-1">{newMsg.content}</p>
                                </div>
                            </div>
                        ), { duration: 5000, style: { background: '#1e1b4b', border: '1px solid rgba(168,85,247,0.3)', color: '#fff' } })
                    }
                    fetchUnread()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [profile?.id, pathname]) // Re-run on pathname change to update badge if needed

    useEffect(() => {
        if (profile?.id) {
            supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', profile.id)
                .single()
                .then(({ data }) => {
                    setWalletBalance(data?.balance ?? 0)
                })
        }
    }, [profile?.id])

    const handleLogout = async () => {
        await logout()
        router.push('/')
    }

    const searchParams = useSearchParams()
    const view = searchParams.get('view')

    const isOracleView = pathname.startsWith('/app/dashboard') ||
        pathname.startsWith('/app/tornar-se-oraculo') ||
        (pathname === '/app/mensagens' && view === 'oracle')

    const isAdminView = pathname.startsWith('/admin')

    const themeColor = isAdminView ? 'neon-gold' : isOracleView ? 'neon-purple' : 'neon-cyan'
    const themeGlow = isAdminView ? 'rgba(234,179,8,0.15)' : isOracleView ? 'rgba(168,85,247,0.15)' : 'rgba(34,211,238,0.15)'

    const clientNav = [
        { label: 'Templo', icon: <Home size={22} />, href: '/app' },
        { label: 'Carteira', icon: <Wallet size={22} />, href: '/app/carteira' },
        { label: 'Mensagens', icon: <Inbox size={22} />, href: '/app/mensagens' },
        { label: 'Histórico', icon: <History size={22} />, href: '/app/historico' },
        { label: 'Meu Perfil', icon: <User size={22} />, href: '/app/perfil' },
    ]

    const oracleNav = [
        { label: 'Dashboard', icon: <LayoutDashboard size={22} />, href: '/app/dashboard' },
        { label: 'Sala', icon: <Radio size={22} />, href: '/app/dashboard/sala' },
        { label: 'Ganhos', icon: <Wallet size={22} />, href: '/app/dashboard/ganhos' },
        { label: 'Mensagens', icon: <Inbox size={22} />, href: '/app/mensagens?view=oracle' },
        { label: 'Meu perfil de oraculista', icon: <User size={22} />, href: '/app/dashboard/perfil' },
    ]

    const adminNav = [
        { label: 'Admin', icon: <LayoutDashboard size={22} />, href: '/admin' },
        { label: 'Categorias', icon: <Tag size={22} />, href: '/admin/categorias' },
        { label: 'Usuários', icon: <User size={22} />, href: '/admin/usuarios' },
        { label: 'Financeiro', icon: <Wallet size={22} />, href: '/admin/financeiro' },
        { label: 'Config', icon: <Home size={22} />, href: '/admin/config' },
        { label: 'Sair Admin', icon: <LogOut size={22} />, href: '/app' },
    ]

    const navItems = isAdminView ? adminNav : isOracleView ? oracleNav : clientNav

    return (
        <div className={`flex min-h-screen bg-deep-space relative flex-col ${isAdminView ? 'theme-owner' : isOracleView ? 'theme-oracle' : 'theme-client'}`}>
            <div className={`stars-overlay ${isOracleView ? 'opacity-30' : 'opacity-20'}`} />

            {/* Top Banner / Search */}
            <header className="h-20 border-b border-white/5 px-4 md:px-8 flex items-center justify-between glass sticky top-0 z-40">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleSafeNavigation(isOracleView ? '/app/dashboard' : '/app')}>
                    <div className="w-10 h-10 relative">
                        <div className={`absolute inset-0 bg-${themeColor} blur-lg opacity-40 animate-pulse`} />
                        <img src="/logo.png" alt="Star Tarot" className="relative z-10 w-full" />
                    </div>
                    <span className="text-2xl font-bold tracking-tighter text-white hidden sm:block">
                        Star <span className={isAdminView ? 'neon-text-gold' : isOracleView ? 'neon-text-purple' : 'neon-text-cyan'}>Tarot</span>
                    </span>
                </div>

                <div className="flex-1 max-w-md mx-8 hidden md:block">
                    <div className="relative group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-${themeColor} transition-colors`} size={18} />
                        <input
                            type="text"
                            placeholder={isOracleView ? "Ver atendimentos ou ganhos..." : "Buscar por oraculista ou oráculo..."}
                            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-4 text-sm text-white focus:border-neon-purple/50 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4">
                    {/* Dropdown de Visões (Apenas para Oráculo Aprovado ou Owner) */}
                    {(profile?.role === 'owner' || (profile?.role === 'oracle' && profile?.application_status === 'approved')) && <RoleSwitcher />}

                    {/* Global Oracle Status Toggle */}
                    {((profile?.role === 'oracle' && profile?.application_status === 'approved') || (profile?.role === 'owner' && isOracleView)) && (
                        <div className="flex items-center">
                            <OracleStatusToggle
                                isOnline={isOnline}
                                onToggle={toggleOnline}
                                applicationStatus={profile?.application_status}
                            />
                        </div>
                    )}

                    <div className="hidden sm:flex flex-col items-end px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-none mb-1">
                            {isOracleView ? 'Ganhos' : 'Saldo'}
                        </span>
                        <span className="text-neon-gold font-bold flex items-center leading-none">
                            <Sparkles size={12} className="mr-1" />
                            {walletBalance} <span className="text-[10px] ml-1 opacity-70 italic font-medium">Créditos</span>
                        </span>
                    </div>

                    <button
                        onClick={() => handleSafeNavigation(isOracleView ? '/app/dashboard/perfil' : '/app/perfil')}
                        className="w-10 h-10 rounded-full bg-gradient-to-tr from-neon-purple to-neon-cyan p-0.5 hover:scale-105 transition-transform"
                    >
                        <div className="w-full h-full rounded-full bg-deep-space flex items-center justify-center overflow-hidden">
                            <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&background=0a0a1a&color=a855f7`} alt="Profile" />
                        </div>
                    </button>
                </div>
            </header>
            {/* Welcome Banner */}
            <div className={`px-4 md:px-8 pt-6 pb-2`}>
                <div className={`relative overflow-hidden rounded-2xl p-6 border border-white/10 bg-gradient-to-r ${isOracleView ? 'from-neon-purple/20' : 'from-neon-cyan/20'} to-transparent backdrop-blur-md`}>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-white flex items-center">
                                <Sparkles className={`mr-3 ${isOracleView ? 'text-neon-purple' : 'text-neon-cyan'}`} size={24} />
                                Bem-vinde, <span className={`${isOracleView ? 'neon-text-purple' : 'neon-text-cyan'} ml-2`}>
                                    {(isOracleView ? profile?.name_fantasy : null) || profile?.full_name?.split(' ')[0] || 'Viajante'}
                                </span>!
                            </h2>
                            <p className="text-sm text-slate-400 mt-1 font-medium">
                                {isOracleView ? 'Seu santuário de luz está pronto para guiar almas.' : 'O cosmos preparou revelações especiais para você hoje.'}
                            </p>
                        </div>
                    </div>
                    {/* Abstract background element */}
                    <div className={`absolute top-0 right-0 w-64 h-full bg-gradient-to-l ${isOracleView ? 'from-neon-purple/10' : 'from-neon-cyan/10'} to-transparent`} />
                </div>
            </div>

            <div className="flex flex-1 relative">
                {/* Desktop Sidebar */}
                <aside className="w-20 lg:w-64 border-r border-white/5 glass flex flex-col sticky top-20 h-[calc(100vh-80px)] hidden md:flex">
                    <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <button
                                    key={item.label}
                                    onClick={() => handleSafeNavigation(item.href)}
                                    className={`w-full flex items-center space-x-4 px-4 py-3 rounded-2xl transition-all group relative ${isActive
                                        ? isAdminView ? 'bg-neon-gold/20 text-white shadow-[0_0_20px_rgba(234,179,8,0.15)] border border-neon-gold/30'
                                            : isOracleView ? 'bg-neon-purple/20 text-white shadow-[0_0_20px_rgba(168,85,247,0.15)] border border-neon-purple/30'
                                                : 'bg-neon-cyan/20 text-white shadow-[0_0_20px_rgba(34,211,238,0.15)] border border-neon-cyan/30'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <span className={`${isActive
                                        ? isAdminView ? 'text-neon-gold' : isOracleView ? 'text-neon-purple' : 'text-neon-cyan'
                                        : isAdminView ? 'group-hover:text-neon-gold' : isOracleView ? 'group-hover:text-neon-purple' : 'group-hover:text-neon-cyan'
                                        } transition-colors`}>
                                        {item.icon}
                                    </span>
                                    <span className={`text-sm font-medium hidden lg:block text-left`}>{item.label}</span>
                                    {isActive && <motion.div layoutId="nav-glow" className={`absolute right-0 w-1 h-8 ${isAdminView ? 'bg-neon-gold' : isOracleView ? 'bg-neon-purple' : 'bg-neon-cyan'} rounded-l-full`} />}
                                    {item.label === 'Mensagens' && unreadCount > 0 && (
                                        <div className="absolute right-4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                                            {unreadCount}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </nav>

                    {/* Become Oracle Button (Discrete) */}
                    {profile?.role === 'client' && !isOracleView && (
                        <div className="px-4 mb-2">
                            <button
                                onClick={() => router.push('/app/tornar-se-oraculo')}
                                className="w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-slate-500 hover:text-neon-cyan hover:bg-white/5 transition-all group border border-dashed border-white/5 hover:border-neon-cyan/30"
                            >
                                <Sparkles size={16} className="group-hover:text-neon-gold transition-colors" />
                                <span className="text-[11px] font-bold uppercase tracking-wider hidden lg:block">Seja nosso oraculista</span>
                            </button>
                        </div>
                    )}


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
                                onClick={() => handleSafeNavigation(item.href)}
                                className={`flex flex-col items-center justify-center space-y-1 ${isActive
                                    ? isAdminView ? 'text-neon-gold' : isOracleView ? 'text-neon-purple' : 'text-neon-cyan'
                                    : 'text-slate-500'}`}
                            >
                                {item.icon}
                                <span className="text-[10px] font-medium">{item.label}</span>
                                {item.label === 'Mensagens' && unreadCount > 0 && (
                                    <div className="absolute top-1 right-1/4 bg-red-500 text-white text-[8px] font-bold px-1 rounded-full">
                                        {unreadCount}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </nav>

                {/* Main Content */}
                <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
                    {children}
                </main>
            </div>

            <IncomingCallModal
                call={incomingCall}
                onAccept={handleAcceptCall}
                onReject={rejectCall}
            />
            <AuthModal />
        </div>
    )
}
