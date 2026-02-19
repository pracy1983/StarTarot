'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { OracleCard } from '@/components/client/OracleCard'
import { OracleFilters } from '@/components/client/OracleFilters'
import { supabase } from '@/lib/supabase'
import { Sparkles, Search, Star, Clock } from 'lucide-react'
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

    const [specialties, setSpecialties] = useState<string[]>([])

    useEffect(() => {
        fetchOracles()
        fetchFavorites()
        fetchSpecialties()
        // Load persistency
        const v = localStorage.getItem('pref_filter_video') === 'true'
        const m = localStorage.getItem('pref_filter_message') === 'true'
        if (v) setFilterVideo(true)
        if (m) setFilterMessage(true)
    }, [profile?.id])

    const fetchSpecialties = async () => {
        const { data } = await supabase
            .from('specialties')
            .select('name')
            .eq('active', true)
            .order('name', { ascending: true })
        if (data) {
            setSpecialties(data.map(s => s.name))
        }
    }

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

        if (profile?.role === 'oracle' && (profile?.application_status === 'approved' || profile?.application_status === 'rejected')) {
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
                const now = new Date()
                const currentDay = now.getDay()
                const currentTime = now.getHours() * 60 + now.getMinutes()
                const todaySchedules = (o.schedules || []).filter((s: any) => s.day_of_week === currentDay && s.is_active)

                const isInSchedule = todaySchedules.some((s: any) => {
                    const [startH, startM] = s.start_time.split(':').map(Number)
                    const [endH, endM] = s.end_time.split(':').map(Number)
                    return currentTime >= (startH * 60 + startM) && currentTime <= (endH * 60 + endM)
                })

                if (o.is_ai || o.oracle_type === 'ai') {
                    return isInSchedule
                }

                if (!o.is_online || !o.last_heartbeat_at) return false
                const lastPulse = new Date(o.last_heartbeat_at).getTime()
                return (now.getTime() - lastPulse) < 120000 // 2 minutes
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
            if (o.is_ai || o.oracle_type === 'ai') {
                matchesStatus = !!o.is_online
            } else {
                const lastPulse = o.last_heartbeat_at ? new Date(o.last_heartbeat_at).getTime() : 0
                const now = new Date().getTime()
                const isPulseActive = (now - lastPulse) < 120000
                matchesStatus = !!o.is_online && isPulseActive
            }
        }

        // Specialty Filter
        let matchesSpecialty = true
        if (specialtyFilter !== 'all') {
            if (specialtyFilter === 'OUTROS') {
                matchesSpecialty = !specialties.some(s => s.toLowerCase() === o.specialty?.toLowerCase())
            } else {
                matchesSpecialty = o.specialty?.toLowerCase() === specialtyFilter.toLowerCase()
            }
        }

        // Capabilities Filter
        let matchesCapabilities = true
        if (filterVideo || filterMessage) {
            matchesCapabilities = false
            if (filterVideo && o.allows_video) matchesCapabilities = true
            if (filterMessage && o.allows_text) matchesCapabilities = true
        }

        return matchesSearch && matchesStatus && matchesSpecialty && matchesCapabilities
    })

    // Paginação
    const totalPages = Math.ceil(filteredOracles.length / oraclesPerPage)
    const paginatedOracles = filteredOracles.slice((page - 1) * oraclesPerPage, page * oraclesPerPage)

    return (
        <div className="space-y-6 md:space-y-10 max-w-full overflow-x-hidden">
            {/* Hero / Intro */}
            <section className="relative py-6 md:py-10 px-4 md:px-8 rounded-2xl md:rounded-3xl overflow-hidden glass border-white/5">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-neon-purple/10 blur-[100px] z-0" />
                <div className="absolute bottom-0 left-0 w-1/3 h-full bg-neon-cyan/10 blur-[100px] z-0" />

                <div className="relative z-10 max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center space-x-2 text-neon-gold mb-3"
                    >
                        <Sparkles size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em]">O Templo dos Arcanos</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-2xl md:text-4xl font-bold font-raleway text-white mb-3 md:mb-4 leading-tight"
                    >
                        A resposta que você busca está <span className="neon-text-purple">escrita nas estrelas.</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-400 text-xs md:text-base leading-relaxed mb-4 md:mb-6"
                    >
                        Escolha seu guia, concentre sua energia e inicie sua jornada de autoconhecimento agora mesmo.
                    </motion.p>
                </div>
            </section>

            {/* How it Works Section - Visible only for new/unauthenticated users */}
            {!profile && (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    <div className="glass-card p-6 border-white/5 relative overflow-hidden group hover:border-neon-purple/30 transition-all duration-500">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-neon-purple/5 blur-3xl group-hover:bg-neon-purple/20 transition-all" />
                        <div className="w-12 h-12 rounded-2xl bg-neon-purple/10 flex items-center justify-center text-neon-purple mb-4 group-hover:scale-110 transition-transform">
                            <Search size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">1. Escolha seu Guia</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Navegue pelos perfis e encontre o oraculista que mais ressoa com sua energia. Filtre por especialidade, preço ou modalidade.
                        </p>
                    </div>

                    <div className="glass-card p-6 border-white/5 relative overflow-hidden group hover:border-neon-cyan/30 transition-all duration-500">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-neon-cyan/5 blur-3xl group-hover:bg-neon-cyan/20 transition-all" />
                        <div className="w-12 h-12 rounded-2xl bg-neon-cyan/10 flex items-center justify-center text-neon-cyan mb-4 group-hover:scale-110 transition-transform">
                            <Star size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">2. Defina o Formato</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Prefere o olho no olho? Escolha <b>Vídeo</b>. Quer algo mais discreto ou detalhado? Envie uma <b>Mensagem</b> direta ao guia.
                        </p>
                    </div>

                    <div className="glass-card p-6 border-white/5 relative overflow-hidden group hover:border-neon-gold/30 transition-all duration-500">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-neon-gold/5 blur-3xl group-hover:bg-neon-gold/20 transition-all" />
                        <div className="w-12 h-12 rounded-2xl bg-neon-gold/10 flex items-center justify-center text-neon-gold mb-4 group-hover:scale-110 transition-transform">
                            <Clock size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">3. Resposta Garantida</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Se o guia estiver offline, deixe sua pergunta! Você só é cobrado quando receber a resposta. Simples, justo e transparente.
                        </p>
                    </div>
                </motion.section>
            )}

            {!profile && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-center pb-4"
                >
                    <button
                        onClick={() => useAuthStore.getState().setShowAuthModal(true)}
                        className="text-xs md:text-sm text-slate-500 hover:text-neon-purple transition-colors flex items-center gap-2 group"
                    >
                        Dúvidas sobre como funciona? <span className="text-neon-purple font-bold underline underline-offset-4 group-hover:no-underline">Comece criando sua conta grátis</span> e ganhe bônus de boas-vindas!
                    </button>
                </motion.div>
            )}

            {/* Advanced Filters & Search */}
            {/* Marketplace Filter */}
            <section className="space-y-8">
                <OracleFilters
                    filter={filter}
                    setFilter={setFilter}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    specialtyFilter={specialtyFilter}
                    setSpecialtyFilter={setSpecialtyFilter}
                    specialties={specialties}
                    filterVideo={filterVideo}
                    setFilterVideo={setFilterVideo}
                    filterMessage={filterMessage}
                    setFilterMessage={setFilterMessage}
                />

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
            </section>

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
