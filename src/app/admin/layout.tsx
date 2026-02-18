'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Users,
    Settings,
    BarChart3,
    MessageSquare,
    LogOut,
    Sparkles,
    LayoutDashboard,
    Wallet,
    Ticket,
    Menu,
    X
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'
import { ProfileMenu } from '@/components/ui/ProfileMenu'
import { supabase } from '@/lib/supabase'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { profile, logout } = useAuthStore()
    const router = useRouter()
    const [ownerBalance, setOwnerBalance] = useState<number | null>(null)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [pendingOracles, setPendingOracles] = useState(0)

    useEffect(() => {
        if (profile?.id) {
            // Fetch Balance
            supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', profile.id)
                .single()
                .then(({ data }) => {
                    setOwnerBalance(data?.balance ?? 0)
                })

            // Fetch Pending Oracles
            const fetchPending = async () => {
                const { count } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .in('application_status', ['pending', 'waitlist'])

                setPendingOracles(count || 0)
            }
            fetchPending()

            // Realtime updates for pending count
            const channel = supabase
                .channel('admin_pending_count')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'profiles' },
                    () => fetchPending()
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

    const navItems = [
        { label: 'Visão Geral', icon: <LayoutDashboard size={20} />, href: '/admin' },
        { label: 'Oraculistas', icon: <Users size={20} />, href: '/admin/oraculistas', badge: pendingOracles },
        { label: 'Membros', icon: <Users size={20} />, href: '/admin/membros' },
        { label: 'Créditos', icon: <Wallet size={20} />, href: '/admin/creditos' },
        { label: 'Consultas', icon: <MessageSquare size={20} />, href: '/admin/consultas' },
        { label: 'Cupons', icon: <Ticket size={20} />, href: '/admin/cupons' },
        { label: 'Finanças', icon: <BarChart3 size={20} />, href: '/admin/financeiro' },
        { label: 'Configurações', icon: <Settings size={20} />, href: '/admin/config' },
    ]

    return (
        <div className="flex min-h-screen bg-deep-space relative">
            <div className="stars-overlay opacity-10" />

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 glass border-r border-white/5 flex flex-col transition-transform duration-300 md:translate-x-0 md:static md:flex
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-8 relative">
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="absolute top-4 right-4 md:hidden text-slate-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>

                    <div className="flex items-center space-x-3 mb-10 cursor-pointer" onClick={() => router.push('/admin')}>
                        <div className="w-8 h-8 relative">
                            <div className="absolute inset-0 bg-neon-gold blur-md opacity-30 shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-pulse" />
                            <img src="/logo.png" alt="Star Tarot" className="relative z-10 w-full" />
                        </div>
                        <span className="text-xl font-bold tracking-tighter text-white">Owner <span className="text-neon-gold">Star</span></span>
                    </div>

                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => {
                                    router.push(item.href)
                                    setIsMobileMenuOpen(false)
                                }}
                                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
                            >
                                <span className="group-hover:text-neon-gold transition-colors">{item.icon}</span>
                                <span className="text-sm font-medium">{item.label}</span>
                                {(item as any).badge > 0 && (
                                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                        {(item as any).badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-8 border-t border-white/5">
                    <div className="flex items-center space-x-3 mb-6 p-2 rounded-xl bg-white/5 border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-neon-gold to-neon-purple p-0.5 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                            <div className="w-full h-full rounded-full bg-deep-space flex items-center justify-center overflow-hidden">
                                <img src={profile?.avatar_url || 'https://ui-avatars.com/api/?name=Owner&background=0a0a1a&color=fbbf24'} alt="Admin" />
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
            <main className="flex-1 overflow-y-auto relative z-10 w-full">
                {/* Header Superior */}
                <header className="h-16 border-b border-white/5 px-4 md:px-8 flex items-center justify-between glass sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden text-slate-400 hover:text-white"
                        >
                            <Menu size={24} />
                        </button>

                        <div className="flex items-center text-slate-400 text-xs hidden md:flex">
                            <Sparkles size={14} className="mr-2 text-neon-gold" />
                            Conexão Estelar Estabelecida
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center text-sm font-bold text-neon-gold hidden md:flex mr-2">
                            <Sparkles size={16} className="mr-2" />
                            {ownerBalance !== null ? `${ownerBalance} cr` : '...'}
                        </div>
                        <div className="h-4 w-px bg-white/10 hidden md:block" />
                        <ProfileMenu isOnline={false} toggleOnline={() => { }} />
                    </div>
                </header>

                <div className="relative">
                    {children}
                </div>
            </main>
        </div>
    )
}
