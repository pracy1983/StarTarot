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
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'oracle')
                .order('is_online', { ascending: false })

            if (error) throw error
            setOracles(data || [])
        } catch (err) {
            console.error('Erro ao buscar oraculistas:', err)
        } finally {
            setLoading(false)
        }
    }

    const filteredOracles = oracles.filter(o => {
        const matchesSearch = o.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.specialty.toLowerCase().includes(searchTerm.toLowerCase())

        if (filter === 'all') return matchesSearch
        if (filter === 'online') return matchesSearch && o.is_online
        if (filter === 'tarot') return matchesSearch && o.specialty === 'Tarot'
        if (filter === 'ia') return matchesSearch && o.is_ai // Apenas para debug ou se você decidir mostrar
        return matchesSearch
    })

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
                            onClick={() => setFilter(item.id)}
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
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-12 pr-4 text-sm text-white focus:border-neon-cyan/50 outline-none transition-all"
                    />
                </div>
            </section>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="glass-card h-80 animate-pulse bg-white/5 border-white/5" />
                    ))
                ) : filteredOracles.length > 0 ? (
                    <AnimatePresence>
                        {filteredOracles.map((oracle, idx) => (
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
        </div>
    )
}
