'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { OracleCard } from '@/components/client/OracleCard'
import { supabase } from '@/lib/supabase'
import { Sparkles, Filter, Search, Moon, Sun, Star } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

import { useAuthStore } from '@/stores/authStore'

export default function MarketplacePage() {
    const { profile } = useAuthStore()
    const searchParams = useSearchParams()
    const [oracles, setOracles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [specialtyFilter, setSpecialtyFilter] = useState('all')
    const [filterVideo, setFilterVideo] = useState(false)
    const [filterMessage, setFilterMessage] = useState(false)
    const [favorites, setFavorites] = useState<string[]>([])

    const specialties = ['Tarot', 'Astrologia', 'Búzios', 'Numerologia', 'Reiki', 'Vidência']

    useEffect(() => {
        fetchOracles()
        fetchFavorites()
        // Load persistency
        const v = localStorage.getItem('pref_filter_video') === 'true'
        const m = localStorage.getItem('pref_filter_message') === 'true'
        if (v) setFilterVideo(true)
        if (m) setFilterMessage(true)
    }, [profile?.id])

    const fetchFavorites = async () => {
        if (!profile?.id) return
        const { data } = await supabase
            .from('user_favorites')
            .select('oracle_id')
            .eq('user_id', profile.id)

        if (data) {
            setFavorites(data.map(f => f.oracle_id))
        }
    }

    useEffect(() => {
        localStorage.setItem('pref_filter_video', String(filterVideo))
        localStorage.setItem('pref_filter_message', String(filterMessage))
    }, [filterVideo, filterMessage])

    // AUTO-REDIRECT FOR ORACLES
    useEffect(() => {
        // If explicitly viewing as client, do not redirect
        if (searchParams.get('view') === 'client') return

        if (profile?.role === 'oracle' && profile?.application_status === 'approved') {
            // Check if user explicitly wants to stay (e.g. clicked "View as Client")
            // We can simple check if they are already on the right page? No this is the client page.

            // Simpler: Just redirect if no special query param is present.
            // But how to allow them to view it?

            // The user said: "Se a pessoa for oraculsita E cliente normal, sempre abra o app na tela de oraculista"
            // This means default landing.

            // We can use a session storage flag to avoid looping
            const hasRedirected = sessionStorage.getItem('oracle_redirected')
            if (!hasRedirected) {
                sessionStorage.setItem('oracle_redirected', 'true')
                // Use window.location to ensure full refresh/state clear if needed, or router
                window.location.href = '/app/dashboard'
            }
        }
    }, [profile, searchParams])

    const fetchOracles = async () => {
        try {
            // 1. Busca perfis de oraculistas
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('*, allows_video, allows_text')
                .in('role', ['oracle', 'owner'])
                .eq('application_status', 'approved')
            // Suspensão é tratada no client-side filter por enquanto, ou em view SQL
            // Mas vamos filtrar aqui o básico se possível, mas como é coluna nova pode ser null

            if (pError) throw pError

            // Filter out unavailable oracles (neither video nor text)
            const activeProfiles = profiles.filter(p => p.allows_video || p.allows_text)

            // 2. Busca todos os horários para esses oraculistas
            const { data: schedules } = await supabase
                .from('schedules')
                .select('*')
                .in('oracle_id', activeProfiles.map(p => p.id))

            // 3. Mapeia horários para cada perfil
            const oraclesWithSchedules = activeProfiles.map(p => ({
                ...p,
                schedules: schedules?.filter(s => s.oracle_id === p.id) || []
            }))

            // 4. Lógica de Ordenação: Favoritos > Online (Randômico) > Offline
            const isOnline = (o: any) => {
                if (!o.is_online) return false
                if (!o.last_heartbeat_at) return false
                const lastPulse = new Date(o.last_heartbeat_at).getTime()
                const now = new Date().getTime()
                return (now - lastPulse) < 120000 // 2 minutes
            }

            const favoritesList = oraclesWithSchedules.filter(o => favorites.includes(o.id))
            const remaining = oraclesWithSchedules.filter(o => !favorites.includes(o.id))

            const onlineList = remaining.filter(o => isOnline(o)).sort(() => Math.random() - 0.5)
            const offlineList = remaining.filter(o => !isOnline(o))

            const sortedOracles = [...favoritesList, ...onlineList, ...offlineList]
            setOracles(sortedOracles)
        } catch (err) {
            console.error('Erro ao buscar oraculistas:', err)
        } finally {
            setLoading(false)
        }
    }

    const [page, setPage] = useState(1)
    const oraclesPerPage = 6

    // Filtrar suspensos
    const availableOracles = oracles.filter(o => {
        if (!o.suspended_until) return true
        return new Date(o.suspended_until) < new Date()
    })

    const filteredOracles = availableOracles.filter(o => {
        const matchesSearch = o.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.specialty.toLowerCase().includes(searchTerm.toLowerCase())

        let matchesStatus = true
        if (filter === 'online') {
            const lastPulse = o.last_heartbeat_at ? new Date(o.last_heartbeat_at).getTime() : 0
            const now = new Date().getTime()
            const isPulseActive = (now - lastPulse) < 120000
            matchesStatus = o.is_online && isPulseActive
        }

        // Specialty Filter
        let matchesSpecialty = true
        if (specialtyFilter !== 'all') {
            matchesSpecialty = o.specialty?.toLowerCase() === specialtyFilter.toLowerCase()
        }

        // Capabilities Filter
        let matchesVideo = true
        if (filterVideo) matchesVideo = !!o.allows_video

        let matchesMessage = true
        if (filterMessage) matchesMessage = !!o.allows_text

        return matchesSearch && matchesStatus && matchesSpecialty && matchesVideo && matchesMessage
    })

    // Paginação
    const totalPages = Math.ceil(filteredOracles.length / oraclesPerPage)
    const paginatedOracles = filteredOracles.slice((page - 1) * oraclesPerPage, page * oraclesPerPage)

    return (
        <div className="space-y-6 md:space-y-10 max-w-full overflow-x-hidden">
            {/* Hero / Intro */}
            <section className="relative py-8 md:py-12 px-4 md:px-8 rounded-2xl md:rounded-3xl overflow-hidden glass border-white/5">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-neon-purple/10 blur-[100px] z-0" />
                <div className="absolute bottom-0 left-0 w-1/3 h-full bg-neon-cyan/10 blur-[100px] z-0" />

                <div className="relative z-10 max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center space-x-2 text-neon-gold mb-4"
                    >
                        <Sparkles size={18} />
                        <span className="text-xs font-bold uppercase tracking-[0.3em]">O Templo dos Arcanos</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-5xl font-bold font-raleway text-white mb-4 md:mb-6 leading-tight"
                    >
                        A resposta que você busca está <span className="neon-text-purple">escrita nas estrelas.</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-400 text-sm md:text-lg leading-relaxed mb-4 md:mb-8"
                    >
                        Escolha seu guia, concentre sua energia e inicie sua jornada de autoconhecimento agora mesmo.
                    </motion.p>
                </div>
            </section>

            {/* Advanced Filters & Search */}
            <section className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Status Tabs */}
                    <div className="flex items-center space-x-1 md:space-x-2 bg-white/5 p-1 rounded-full border border-white/5 w-fit overflow-x-auto no-scrollbar max-w-full">
                        {[
                            { id: 'all', label: 'Todos', icon: <Sun className="w-3 h-3 md:w-4 md:h-4" /> },
                            { id: 'online', label: 'Online', icon: <Moon className="w-3 h-3 md:w-4 md:h-4" /> },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => { setFilter(item.id); setPage(1) }}
                                className={`flex items-center space-x-1.5 md:space-x-2 px-3 md:px-4 py-1 md:py-1.5 rounded-full transition-all whitespace-nowrap text-[12px] md:text-sm font-medium ${filter === item.id
                                    ? 'bg-neon-purple text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-72 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-neon-cyan transition-colors w-4 h-4 md:w-[18px] md:h-[18px]" />
                        <input
                            type="text"
                            placeholder="Buscar oráculo..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
                            className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 md:py-2 pl-10 pr-4 text-[12px] md:text-sm text-white focus:border-neon-cyan/50 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Secondary Filters: Specialty & Capabilities */}
                <div className="flex flex-wrap items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">

                    {/* Specialty Select */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={specialtyFilter}
                            onChange={(e) => { setSpecialtyFilter(e.target.value); setPage(1) }}
                            className="bg-deep-space border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-white appearance-none outline-none focus:border-neon-purple/50 cursor-pointer min-w-[160px]"
                        >
                            <option value="all">Todas Especialidades</option>
                            {specialties.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Checkboxes */}
                    <div className="flex items-center gap-4 border-l border-white/10 pl-4 ml-2">
                        <label className="flex items-center space-x-2 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${filterVideo ? 'bg-neon-cyan border-neon-cyan text-deep-space' : 'border-white/20 group-hover:border-white/40'}`}>
                                {filterVideo && <Sparkles size={12} />}
                                <input type="checkbox" checked={filterVideo} onChange={e => setFilterVideo(e.target.checked)} className="hidden" />
                            </div>
                            <span className={`text-sm ${filterVideo ? 'text-white font-bold' : 'text-slate-400'}`}>Atende por Vídeo</span>
                        </label>

                        <label className="flex items-center space-x-2 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${filterMessage ? 'bg-neon-purple border-neon-purple text-white' : 'border-white/20 group-hover:border-white/40'}`}>
                                {filterMessage && <Sparkles size={12} />}
                                <input type="checkbox" checked={filterMessage} onChange={e => setFilterMessage(e.target.checked)} className="hidden" />
                            </div>
                            <span className={`text-sm ${filterMessage ? 'text-white font-bold' : 'text-slate-400'}`}>Atende por Mensagem</span>
                        </label>
                    </div>
                </div>
            </section>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6 pb-10">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="glass-card h-80 animate-pulse bg-white/5 border-white/5" />
                    ))
                ) : paginatedOracles.length > 0 ? (
                    <AnimatePresence mode='wait'>
                        {paginatedOracles.map((oracle, idx) => (
                            <motion.div
                                key={oracle.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3, delay: idx * 0.05 }}
                            >
                                <OracleCard oracle={oracle} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                ) : (
                    <div className="col-span-full py-20 text-center">
                        <div className="inline-flex p-6 rounded-full bg-white/5 text-slate-600 mb-6">
                            <Search size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Nenhum oráculo encontrado</h3>
                        <p className="text-slate-500">Tente ajustar seus filtros para encontrar outros guias.</p>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div className="flex justify-center items-center space-x-4 pb-20">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className={`px-4 py-2 rounded-xl border border-white/10 text-sm font-bold transition-all ${page === 1 ? 'opacity-50 cursor-not-allowed text-slate-500' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                    >
                        Anterior
                    </button>
                    <span className="text-slate-400 text-sm font-mono">
                        Página {page} de {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className={`px-4 py-2 rounded-xl border border-white/10 text-sm font-bold transition-all ${page === totalPages ? 'opacity-50 cursor-not-allowed text-slate-500' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                    >
                        Próxima
                    </button>
                </div>
            )}
        </div>
    )
}
