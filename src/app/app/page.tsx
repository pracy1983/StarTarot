'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { OracleCard } from '@/components/client/OracleCard'
import { OracleFilters } from '@/components/client/OracleFilters'
import { supabase } from '@/lib/supabase'
import { Sparkles, Search, Star, Clock } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

import { useAuthStore } from '@/stores/authStore'
import { getOracleStatus } from '@/lib/status'

export default function MarketplacePage() {
    const { profile } = useAuthStore()
    const searchParams = useSearchParams()
    const [oracles, setOracles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
    const [filterVideo, setFilterVideo] = useState(false)
    const [filterMessage, setFilterMessage] = useState(false)
    const [favorites, setFavorites] = useState<string[]>([])
    const [visibleCount, setVisibleCount] = useState(12)

    const [categories, setCategories] = useState<string[]>([]) // Added categories state
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
        const [specsRes, catsRes] = await Promise.all([
            supabase.from('oracle_specialties').select('name').eq('active', true).order('name', { ascending: true }),
            supabase.from('oracle_categories').select('name').eq('active', true).order('name', { ascending: true })
        ])

        if (specsRes.data) {
            setSpecialties(specsRes.data.map(s => s.name))
        }
        if (catsRes.data) {
            setCategories(catsRes.data.map(c => c.name))
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
        // Se estiver com query param explícito de visão, não redireciona
        if (searchParams.get('view') === 'client') return

        // Verifica se o usuário tem preferência salva
        const lastView = localStorage.getItem('last_view_preference')

        // Se a última visão foi 'client', não redirecionamos para o dashboard
        if (lastView === 'client') return

        if (profile?.role === 'oracle' && (profile?.application_status === 'approved' || profile?.application_status === 'rejected')) {
            const hasRedirected = sessionStorage.getItem('oracle_redirected')
            if (!hasRedirected) {
                sessionStorage.setItem('oracle_redirected', 'true')
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
            // 4. Lógica de Ordenação: Favoritos > Online (Randômico) > Offline
            const favoritesList = oraclesWithSchedules.filter(o => favorites.includes(o.id))
            const remaining = oraclesWithSchedules.filter(o => !favorites.includes(o.id))

            const onlineList = remaining.filter(o => {
                const { status } = getOracleStatus(
                    o.is_online,
                    o.schedules || [],
                    o.last_heartbeat_at,
                    o.is_ai || o.oracle_type === 'ai'
                )
                return status === 'online'
            }).sort(() => Math.random() - 0.5)

            const offlineList = remaining.filter(o => {
                const { status } = getOracleStatus(
                    o.is_online,
                    o.schedules || [],
                    o.last_heartbeat_at,
                    o.is_ai || o.oracle_type === 'ai'
                )
                return status === 'offline'
            })

            const sortedOracles = [...favoritesList, ...onlineList, ...offlineList]
            setOracles(sortedOracles)
        } catch (err) {
            console.error('Erro ao buscar oraculistas:', err)
        } finally {
            setLoading(false)
        }
    }

    // Paginação Lite (Load More)
    const availableOracles = oracles.filter(o => {
        if (!o.suspended_until) return true
        return new Date(o.suspended_until) < new Date()
    })

    const filteredOracles = availableOracles.filter(o => {
        const matchesSearch = o.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (o.name_fantasy && o.name_fantasy.toLowerCase().includes(searchTerm.toLowerCase())) ||
            o.specialty.toLowerCase().includes(searchTerm.toLowerCase())

        let matchesStatus = true
        if (filter === 'online') {
            const { status } = getOracleStatus(
                o.is_online,
                o.schedules || [],
                o.last_heartbeat_at,
                o.is_ai || o.oracle_type === 'ai'
            )
            matchesStatus = status === 'online'
        }

        // Categories Filter
        let matchesCategory = true
        if (selectedCategories.length > 0) {
            matchesCategory = selectedCategories.some(c => o.categories?.includes(c))
        }

        // Specialty Filter
        let matchesSpecialty = true
        if (selectedSpecialties.length > 0) {
            matchesSpecialty = selectedSpecialties.some(s => o.specialty?.toLowerCase() === s.toLowerCase() || o.specialties?.includes(s))
        }

        // Capabilities Filter
        let matchesCapabilities = true
        if (filterVideo || filterMessage) {
            matchesCapabilities = false
            if (filterVideo && o.allows_video) matchesCapabilities = true
            if (filterMessage && o.allows_text) matchesCapabilities = true
        }

        return matchesSearch && matchesStatus && matchesCategory && matchesSpecialty && matchesCapabilities
    })

    const paginatedOracles = filteredOracles.slice(0, visibleCount)
    const hasMore = filteredOracles.length > visibleCount

    return (
        <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
            {/* Hero / Intro */}
            <section className="relative py-2 md:py-6 px-4 md:px-6 rounded-2xl md:rounded-3xl overflow-hidden glass border-white/5">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-neon-purple/10 blur-[100px] z-0" />
                <div className="absolute bottom-0 left-0 w-1/3 h-full bg-neon-cyan/10 blur-[100px] z-0" />

                <div className="relative z-10 max-w-2xl text-center md:text-left mx-auto md:mx-0">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-center md:justify-start space-x-2 text-neon-gold mb-2"
                    >
                        <Sparkles size={14} />
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] md:tracking-[0.3em]">O Templo dos Arcanos</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-lg md:text-3xl font-bold font-raleway text-white mb-1 md:mb-3 leading-tight"
                    >
                        A resposta que você busca está <span className="neon-text-purple">escrita nas estrelas.</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-400 text-[11px] md:text-sm leading-relaxed mb-2 md:mb-4"
                    >
                        Conecte-se com os melhores oraculistas em consultas em tempo real ou mensagens.
                    </motion.p>
                </div>
            </section>

            {/* How it Works Section - Visible only for new/unauthenticated users */}
            {!profile && (
                <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6"
                >
                    <div className="glass-card p-4 md:p-6 border-white/5 relative overflow-hidden group hover:border-neon-purple/30 transition-all duration-500">
                        <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-neon-purple/5 blur-3xl group-hover:bg-neon-purple/20 transition-all" />
                        <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl bg-neon-purple/10 flex items-center justify-center text-neon-purple mb-2 md:mb-4 group-hover:scale-110 transition-transform">
                            <Search className="w-4 h-4 md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-sm md:text-lg font-bold text-white mb-1 md:mb-2">1. Escolha seu Guia</h3>
                        <p className="text-[10px] md:text-sm text-slate-400 leading-relaxed hidden sm:block">
                            Navegue pelos perfis e encontre o oraculista que mais ressoa com sua energia. Filtre por especialidade, preço ou modalidade.
                        </p>
                    </div>

                    <div className="glass-card p-4 md:p-6 border-white/5 relative overflow-hidden group hover:border-neon-cyan/30 transition-all duration-500">
                        <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-neon-cyan/5 blur-3xl group-hover:bg-neon-cyan/20 transition-all" />
                        <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl bg-neon-cyan/10 flex items-center justify-center text-neon-cyan mb-2 md:mb-4 group-hover:scale-110 transition-transform">
                            <Star className="w-4 h-4 md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-sm md:text-lg font-bold text-white mb-1 md:mb-2">2. Defina o Formato</h3>
                        <p className="text-[10px] md:text-sm text-slate-400 leading-relaxed hidden sm:block">
                            Prefere o olho no olho? Escolha <b>Vídeo</b>. Quer algo mais discreto ou detalhado? Envie uma <b>Mensagem</b> direta ao guia.
                        </p>
                    </div>

                    <div className="glass-card p-4 md:p-6 border-white/5 relative overflow-hidden group hover:border-neon-gold/30 transition-all duration-500">
                        <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-neon-gold/5 blur-3xl group-hover:bg-neon-gold/20 transition-all" />
                        <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl bg-neon-gold/10 flex items-center justify-center text-neon-gold mb-2 md:mb-4 group-hover:scale-110 transition-transform">
                            <Clock className="w-4 h-4 md:w-6 md:h-6" />
                        </div>
                        <h3 className="text-sm md:text-lg font-bold text-white mb-1 md:mb-2">3. Resposta Garantida</h3>
                        <p className="text-[10px] md:text-sm text-slate-400 leading-relaxed hidden sm:block">
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
                    selectedCategories={selectedCategories}
                    setSelectedCategories={setSelectedCategories}
                    selectedSpecialties={selectedSpecialties}
                    setSelectedSpecialties={setSelectedSpecialties}
                    categories={categories}
                    specialties={specialties}
                    filterVideo={filterVideo}
                    setFilterVideo={setFilterVideo}
                    filterMessage={filterMessage}
                    setFilterMessage={setFilterMessage}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3 lg:gap-4 pb-6">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="glass-card h-64 animate-pulse bg-white/5 border-white/5" />
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

            {/* Load More Controls */}
            {!loading && hasMore && (
                <div className="flex justify-center items-center pt-8 pb-20">
                    <button
                        onClick={() => setVisibleCount(v => v + 12)}
                        className="group relative flex items-center space-x-3 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold hover:bg-white/10 hover:border-neon-purple/50 transition-all shadow-xl overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/0 via-neon-purple/10 to-neon-purple/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <Sparkles size={20} className="text-neon-purple" />
                        <span>Carregar mais Oraculistas</span>
                    </button>
                </div>
            )}
        </div>
    )
}
