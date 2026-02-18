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
import { supabase } from '@/lib/supabase'
import { IncomingCallModal } from '@/components/oracle/IncomingCallModal'
import { ProfileMenu } from '@/components/ui/ProfileMenu'
import { useRealtimeCalls } from '@/hooks/useRealtimeCalls'
import { useHeartbeat } from '@/hooks/useHeartbeat'
import toast, { Toaster } from 'react-hot-toast'
import { AuthModal } from '@/components/auth/AuthModal'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { profile, logout } = useAuthStore()
    const router = useRouter()
    const pathname = usePathname()
    const [walletBalance, setWalletBalance] = useState<number>(0)
    const [unreadCount, setUnreadCount] = useState(0)

    // Heartbeat for Oracles
    useHeartbeat()

    // Realtime Calls Hook (Global)
    const { isOnline, incomingCall, isAccepting, acceptCall, rejectCall, toggleOnline } = useRealtimeCalls()

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
        if (profile?.credits !== undefined) {
            setWalletBalance(profile.credits)
        }
    }, [profile?.credits])

    useEffect(() => {
        if (profile?.id) {
            // Initial fetch
            const fetchBalance = async () => {
                const { data } = await supabase
                    .from('wallets')
                    .select('balance')
                    .eq('user_id', profile.id)
                    .single()
                setWalletBalance(data?.balance ?? 0)
            }
            fetchBalance()

            // Realtime subscription
            const channel = supabase
                .channel('wallet_balance')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'wallets',
                        filter: `user_id=eq.${profile.id}`
                    },
                    (payload) => {
                        if (payload.new) {
                            const newBalance = (payload.new as any).balance
                            setWalletBalance(newBalance)
                            // Also update store to keep in sync
                            useAuthStore.getState().setProfile({
                                ...profile,
                                credits: newBalance
                            })
                        }
                    }
                )
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
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

    // Auto-offline on Window Close
    useEffect(() => {
        if (!profile?.id || profile.role !== 'oracle') return

        const handleUnload = () => {
            // Using Blob with sendBeacon for maximum reliability in application/json
            const blob = new Blob([JSON.stringify({ userId: profile.id })], { type: 'application/json' })
            navigator.sendBeacon('/api/oracle/offline', blob)
        }

        window.addEventListener('beforeunload', handleUnload)
        return () => window.removeEventListener('beforeunload', handleUnload)
    }, [profile?.id, profile?.role])

    return (
        <div className={`flex min-h-screen bg-deep-space relative flex-col overflow-x-hidden ${isAdminView ? 'theme-owner' : isOracleView ? 'theme-oracle' : 'theme-client'}`}>
            <div className={`stars-overlay ${isOracleView ? 'opacity-30' : 'opacity-20'}`} />

            {/* Top Header */}
            <header className="h-20 border-b border-white/5 px-4 md:px-8 flex items-center justify-between glass sticky top-0 z-40">
                <div className="flex items-center space-x-3 cursor-pointer shrink-0" onClick={() => handleSafeNavigation(isOracleView ? '/app/dashboard' : '/app')}>
                    <div className="w-10 h-10 relative">
                        <div className={`absolute inset-0 bg-${themeColor} blur-lg opacity-40 animate-pulse`} />
                        <img src="/logo.png" alt="Star Tarot" className="relative z-10 w-full" />
                    </div>
                    <span className="text-xl md:text-2xl font-bold tracking-tighter text-white hidden sm:block">
                        Star <span className={isAdminView ? 'neon-text-gold' : isOracleView ? 'neon-text-purple' : 'neon-text-cyan'}>Tarot</span>
                    </span>
                </div>

                <div className="flex-1 max-w-md mx-4 md:mx-8 hidden lg:flex items-center">
                    <h2 className="text-lg font-bold text-white flex items-center truncate">
                        <Sparkles className={`mr-3 shrink-0 ${isOracleView ? 'text-neon-purple' : 'text-neon-cyan'}`} size={18} />
                        Olá, <span className={`${isOracleView ? 'neon-text-purple' : 'neon-text-cyan'} ml-2`}>
                            {(isOracleView ? profile?.name_fantasy : profile?.full_name?.split(' ')[0]) || 'Viajante'}
                        </span>!
                    </h2>
                </div>

                <div className="flex items-center space-x-3 md:space-x-4">
                    {/* Wallet/Credits Display */}
                    <motion.div
                        key={walletBalance}
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.3 }}
                        onClick={() => handleSafeNavigation(isOracleView ? '/app/dashboard/ganhos' : '/app/carteira')}
                        className="flex items-center px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all shrink-0"
                    >
                        <div className="flex flex-col items-end leading-none">
                            <span className="text-[11px] md:text-xs font-bold text-neon-gold flex items-center">
                                <Sparkles size={10} className="mr-1" />
                                {walletBalance} <span className="ml-1 opacity-70 font-medium">cr</span>
                            </span>
                        </div>
                    </motion.div>

                    {/* Consolidated Profile Menu */}
                    <ProfileMenu
                        isOnline={isOnline}
                        toggleOnline={toggleOnline}
                    />
                </div>
            </header>

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
                <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto overflow-x-hidden">
                    {children}
                </main>
            </div>

            <IncomingCallModal
                call={incomingCall}
                isAccepting={isAccepting}
                onAccept={handleAcceptCall}
                onReject={rejectCall}
            />
            <AuthModal />
            <Toaster
                position="top-right"
                toastOptions={{
                    // No mobile, move para baixo pra não cobrir o saldo
                    className: 'md:!mt-0 !mt-20',
                    style: {
                        background: '#0a0a1a',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)',
                    },
                }}
            />
        </div >
    )
}
