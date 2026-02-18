'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Sun, Moon, Sparkles, ChevronDown, Check, Filter } from 'lucide-react'

interface OracleFiltersProps {
    filter: string
    setFilter: (val: string) => void
    searchTerm: string
    setSearchTerm: (val: string) => void
    specialtyFilter: string
    setSpecialtyFilter: (val: string) => void
    specialties: string[]
    // Optional filters for Dashboard
    filterVideo?: boolean
    setFilterVideo?: (val: boolean) => void
    filterMessage?: boolean
    setFilterMessage?: (val: boolean) => void
}

export const OracleFilters = ({
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    specialtyFilter,
    setSpecialtyFilter,
    specialties,
    filterVideo,
    setFilterVideo,
    filterMessage,
    setFilterMessage
}: OracleFiltersProps) => {
    const [isSpecialtyOpen, setIsSpecialtyOpen] = useState(false)

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                    <Sun className="mr-3 text-neon-gold" /> Oraculistas Online
                </h2>

                {/* Status & Search */}
                <div className="flex flex-col md:flex-row items-center gap-4">
                    {/* Status Tabs */}
                    <div className="flex items-center space-x-1 md:space-x-2 bg-white/5 p-1 rounded-full border border-white/5 w-fit overflow-x-auto no-scrollbar max-w-full">
                        {[
                            { id: 'all', label: 'Todos', icon: <Sun className="w-3 h-3 md:w-4 md:h-4" /> },
                            { id: 'online', label: 'Online', icon: <Moon className="w-3 h-3 md:w-4 md:h-4" /> },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setFilter(item.id)}
                                className={`flex items-center space-x-1.5 md:space-x-2 px-3 md:px-4 py-1.5 rounded-full transition-all whitespace-nowrap text-[12px] md:text-sm font-medium ${filter === item.id
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
                    <div className="relative w-full md:w-64 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-neon-cyan transition-colors w-4 h-4 md:w-[16px] md:h-[18px]" />
                        <input
                            type="text"
                            placeholder="Buscar oráculo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-[12px] md:text-sm text-white focus:border-neon-cyan/50 outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center relative z-20">
                {/* Specialty Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsSpecialtyOpen(!isSpecialtyOpen)}
                        className="w-full md:w-auto min-w-[240px] flex items-center justify-between px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:border-neon-purple/50 transition-all text-white group"
                    >
                        <div className="flex items-center space-x-3">
                            <Sparkles size={18} className="text-neon-purple" />
                            <span className="font-medium text-sm">
                                {specialtyFilter === 'all' ? 'Todas Especialidades' :
                                    specialtyFilter === 'OUTROS' ? 'Outros' :
                                        specialtyFilter}
                            </span>
                        </div>
                        <ChevronDown size={18} className={`text-slate-400 transition-transform ${isSpecialtyOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isSpecialtyOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute top-full mt-2 w-full md:w-[300px] max-h-[400px] overflow-y-auto custom-scrollbar bg-[#0f0f2d]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl z-50 p-2"
                            >
                                <button
                                    onClick={() => { setSpecialtyFilter('all'); setIsSpecialtyOpen(false) }}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all ${specialtyFilter === 'all' ? 'bg-neon-purple/20 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <span className="text-sm font-medium">Todas Especialidades</span>
                                    {specialtyFilter === 'all' && <Check size={14} className="text-neon-purple" />}
                                </button>

                                <div className="h-px bg-white/5 my-2 mx-2" />

                                {specialties.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => { setSpecialtyFilter(s); setIsSpecialtyOpen(false) }}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all ${specialtyFilter === s ? 'bg-neon-purple/20 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <span className="text-sm font-medium">{s}</span>
                                        {specialtyFilter === s && <Check size={14} className="text-neon-purple" />}
                                    </button>
                                ))}

                                <div className="h-px bg-white/5 my-2 mx-2" />

                                <button
                                    onClick={() => { setSpecialtyFilter('OUTROS'); setIsSpecialtyOpen(false) }}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all ${specialtyFilter === 'OUTROS' ? 'bg-neon-purple/20 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <span className="text-sm font-medium">Outros</span>
                                    {specialtyFilter === 'OUTROS' && <Check size={14} className="text-neon-purple" />}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Optional Service Filters (Video/Message) */}
                {(setFilterVideo && setFilterMessage) && (
                    <div className="flex items-center gap-4 border-l border-white/10 pl-4 ml-2">
                        <label className="flex items-center space-x-2 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${filterVideo ? 'bg-neon-cyan border-neon-cyan text-deep-space' : 'border-white/20 group-hover:border-white/40'}`}>
                                {filterVideo && <Sparkles size={12} />}
                                <input type="checkbox" checked={filterVideo} onChange={e => setFilterVideo(e.target.checked)} className="hidden" />
                            </div>
                            <span className={`text-sm ${filterVideo ? 'text-white font-bold' : 'text-slate-400'}`}>Vídeo</span>
                        </label>

                        <label className="flex items-center space-x-2 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${filterMessage ? 'bg-neon-purple border-neon-purple text-white' : 'border-white/20 group-hover:border-white/40'}`}>
                                {filterMessage && <Sparkles size={12} />}
                                <input type="checkbox" checked={filterMessage} onChange={e => setFilterMessage(e.target.checked)} className="hidden" />
                            </div>
                            <span className={`text-sm ${filterMessage ? 'text-white font-bold' : 'text-slate-400'}`}>Mensagem</span>
                        </label>
                    </div>
                )}
            </div>
        </div>
    )
}
