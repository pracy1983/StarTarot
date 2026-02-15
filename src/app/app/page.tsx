'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { OracleCard } from '@/components/client/OracleCard'
import { supabase } from '@/lib/supabase'
import { Sparkles, Filter, Search, Moon, Sun, Star } from 'lucide-react'

export default function MarketplacePage() {
    const [oracles, setOracles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchOracles()
    }, [])

    const fetchOracles = async () => {
        try {
            // 1. Busca perfis de oraculistas
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('*')
                .in('role', ['oracle', 'owner'])
                .eq('application_status', 'approved')
                .eq('application_status', 'approved')
            // Suspensão é tratada no client-side filter por enquanto, ou em view SQL
            // Mas vamos filtrar aqui o básico se possível, mas como é coluna nova pode ser null

            if (pError) throw pError

            // 2. Busca todos os horários para esses oraculistas
            const { data: schedules } = await supabase
                .from('schedules')
                .select('*')
                .in('oracle_id', profiles.map(p => p.id))

            // 3. Mapeia horários para cada perfil
            const oraclesWithSchedules = profiles.map(p => ({
                ...p,
                schedules: schedules?.filter(s => s.oracle_id === p.id) || []
            }))

            // 4. Lógica de Ordenação e Randomização
            const zeroFee = oraclesWithSchedules.filter(o => o.initial_fee_credits === 0)
            const others = oraclesWithSchedules.filter(o => o.initial_fee_credits !== 0)

            const shuffle = (array: any[]) => array.sort(() => Math.random() - 0.5)

            // Embaralha dentro dos grupos
            const sortedOracles = [
                ...shuffle(zeroFee),
                ...shuffle(others)
            ]

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

        if (filter === 'all') return matchesSearch
        if (filter === 'online') return matchesSearch && o.is_online
        if (filter === 'tarot') return matchesSearch && o.specialty === 'Tarot'
        if (filter === 'ia') return matchesSearch && o.is_ai // Apenas para debug ou se você decidir mostrar
        return matchesSearch
    })

    // Paginação
    const totalPages = Math.ceil(filteredOracles.length / oraclesPerPage)
    const paginatedOracles = filteredOracles.slice((page - 1) * oraclesPerPage, page * oraclesPerPage)

    return (
        <div className="space-y-10">
            {/* Hero / Intro */}
            <section className="relative py-12 px-8 rounded-3xl overflow-hidden glass border-white/5">
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
                        className="text-4xl md:text-5xl font-bold font-raleway text-white mb-6 leading-tight"
                    >
                        A resposta que você busca está <span className="neon-text-purple">escrita nas estrelas.</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-400 text-lg leading-relaxed mb-8"
                    >
                        Escolha seu guia, concentre sua energia e inicie sua jornada de autoconhecimento agora mesmo.
                    </motion.p>
                </div>
            </section>

            {/* Filters & Search */}
            <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                    {[
                        { id: 'all', label: 'Todos', icon: <Sun size={14} /> },
                        { id: 'online', label: 'Online Agora', icon: <Moon size={14} /> },
                        { id: 'tarot', label: 'Tarot', icon: <Star size={14} /> },
                        { id: 'astrologia', label: 'Astrologia', icon: <Sparkles size={14} /> },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => { setFilter(item.id); setPage(1) }}
                            className={`flex items-center space-x-2 px-5 py-2 rounded-full border transition-all whitespace-nowrap ${filter === item.id
                                ? 'bg-neon-purple text-white border-neon-purple shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                                }`}
                        >
                            {item.icon}
                            <span className="text-sm font-bold">{item.label}</span>
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-neon-cyan transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Filtrar guias..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-12 pr-4 text-sm text-white focus:border-neon-cyan/50 outline-none transition-all"
                    />
                </div>
            </section>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8 pb-10">
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
