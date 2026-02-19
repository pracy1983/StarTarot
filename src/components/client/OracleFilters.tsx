'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Sun, Moon, Sparkles, ChevronDown, Check, Filter, Video, MessageSquare } from 'lucide-react'

interface OracleFiltersProps {
    filter: string
    setFilter: (val: string) => void
    searchTerm: string
    setSearchTerm: (val: string) => void
    selectedCategories: string[]
    setSelectedCategories: (val: string[]) => void
    selectedSpecialties: string[]
    setSelectedSpecialties: (val: string[]) => void
    categories: string[]
    specialties: string[]
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
    selectedCategories,
    setSelectedCategories,
    selectedSpecialties,
    setSelectedSpecialties,
    categories,
    specialties,
    filterVideo,
    setFilterVideo,
    filterMessage,
    setFilterMessage
}: OracleFiltersProps) => {
    const [isCategoryOpen, setIsCategoryOpen] = useState(false)
    const [isSpecialtyOpen, setIsSpecialtyOpen] = useState(false)

    const categoryRef = useRef<HTMLDivElement>(null)
    const specialtyRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setIsCategoryOpen(false)
            }
            if (specialtyRef.current && !specialtyRef.current.contains(event.target as Node)) {
                setIsSpecialtyOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleSelection = (list: string[], setList: (v: string[]) => void, item: string) => {
        if (item === 'all') {
            setList([])
            return
        }
        if (list.includes(item)) {
            setList(list.filter(i => i !== item))
        } else {
            setList([...list, item])
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Search Bar */}
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-neon-cyan transition-colors w-4 h-4 md:w-[16px] md:h-[18px]" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou especialidade..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-[12px] md:text-sm text-white focus:border-neon-cyan/50 outline-none transition-all shadow-inner"
                    />
                </div>

                {/* Status Tabs */}
                <div className="flex items-center space-x-1 md:space-x-2 bg-white/5 p-1 rounded-full border border-white/5 w-fit">
                    {[
                        { id: 'all', label: 'Todos', icon: <Sun className="w-3 h-3 md:w-4 md:h-4" /> },
                        { id: 'online', label: 'Online Agora', icon: <Moon className="w-3 h-3 md:w-4 md:h-4" /> },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setFilter(item.id)}
                            className={`flex items-center space-x-1.5 md:space-x-2 px-4 md:px-6 py-2 rounded-full transition-all whitespace-nowrap text-[12px] md:text-sm font-bold ${filter === item.id
                                ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-20">
                {/* Categories Dropdown */}
                <div className="relative" ref={categoryRef}>
                    <button
                        onClick={() => { setIsCategoryOpen(!isCategoryOpen); setIsSpecialtyOpen(false) }}
                        className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-white/5 border transition-all text-white group ${isCategoryOpen || selectedCategories.length > 0 ? 'border-neon-purple/50 bg-neon-purple/5' : 'border-white/10 hover:border-neon-purple/30'}`}
                    >
                        <div className="flex items-center space-x-3">
                            <Filter size={16} className={selectedCategories.length > 0 ? 'text-neon-purple' : 'text-slate-500'} />
                            <div className="text-left">
                                <p className="text-[10px] uppercase font-bold text-slate-500 leading-none mb-1">Oráculos & Ferramentas</p>
                                <p className="text-xs font-bold truncate max-w-[150px]">
                                    {selectedCategories.length === 0 ? 'Todos os Oráculos' :
                                        selectedCategories.length === 1 ? selectedCategories[0] :
                                            `${selectedCategories.length} selecionados`}
                                </p>
                            </div>
                        </div>
                        <ChevronDown size={16} className={`text-slate-500 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isCategoryOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 right-0 mt-3 max-h-[350px] overflow-y-auto bg-[#1a1a2e] border border-neon-purple/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 p-2 backdrop-blur-xl"
                            >
                                <button
                                    onClick={() => toggleSelection(selectedCategories, setSelectedCategories, 'all')}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-all ${selectedCategories.length === 0 ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                >
                                    <span className="text-xs font-bold uppercase">Limpar Filtros</span>
                                    {selectedCategories.length === 0 && <Check size={14} className="text-neon-purple" />}
                                </button>
                                <div className="h-px bg-white/5 my-2 mx-2" />
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => toggleSelection(selectedCategories, setSelectedCategories, cat)}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-all mb-1 ${selectedCategories.includes(cat) ? 'bg-neon-purple/20 text-white border border-neon-purple/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <span className="text-sm">{cat}</span>
                                        {selectedCategories.includes(cat) && <Check size={14} className="text-neon-purple" />}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Specialties Dropdown */}
                <div className="relative" ref={specialtyRef}>
                    <button
                        onClick={() => { setIsSpecialtyOpen(!isSpecialtyOpen); setIsCategoryOpen(false) }}
                        className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-white/5 border transition-all text-white group ${isSpecialtyOpen || selectedSpecialties.length > 0 ? 'border-neon-cyan/50 bg-neon-cyan/5' : 'border-white/10 hover:border-neon-cyan/30'}`}
                    >
                        <div className="flex items-center space-x-3">
                            <Sparkles size={16} className={selectedSpecialties.length > 0 ? 'text-neon-cyan' : 'text-slate-500'} />
                            <div className="text-left">
                                <p className="text-[10px] uppercase font-bold text-slate-500 leading-none mb-1">Especialidades & Temas</p>
                                <p className="text-xs font-bold truncate max-w-[150px]">
                                    {selectedSpecialties.length === 0 ? 'Todas Especialidades' :
                                        selectedSpecialties.length === 1 ? selectedSpecialties[0] :
                                            `${selectedSpecialties.length} selecionadas`}
                                </p>
                            </div>
                        </div>
                        <ChevronDown size={16} className={`text-slate-500 transition-transform ${isSpecialtyOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isSpecialtyOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 right-0 mt-3 max-h-[350px] overflow-y-auto bg-[#1a1a2e] border border-neon-cyan/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 p-2 backdrop-blur-xl"
                            >
                                <button
                                    onClick={() => toggleSelection(selectedSpecialties, setSelectedSpecialties, 'all')}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-all ${selectedSpecialties.length === 0 ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                >
                                    <span className="text-xs font-bold uppercase">Limpar Filtros</span>
                                    {selectedSpecialties.length === 0 && <Check size={14} className="text-neon-cyan" />}
                                </button>
                                <div className="h-px bg-white/5 my-2 mx-2" />
                                {specialties.map(spec => (
                                    <button
                                        key={spec}
                                        onClick={() => toggleSelection(selectedSpecialties, setSelectedSpecialties, spec)}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-all mb-1 ${selectedSpecialties.includes(spec) ? 'bg-neon-cyan/20 text-white border border-neon-cyan/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <span className="text-sm">{spec}</span>
                                        {selectedSpecialties.includes(spec) && <Check size={14} className="text-neon-cyan" />}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Service Icons (Video/Message) */}
                <div className="flex items-center gap-4 bg-white/5 px-6 py-3.5 rounded-2xl border border-white/10">
                    <label className="flex items-center space-x-2 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${filterVideo ? 'bg-neon-cyan border-neon-cyan text-deep-space shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'border-white/20 group-hover:border-white/40'}`}>
                            {filterVideo && <Check size={12} strokeWidth={4} />}
                            <input type="checkbox" checked={filterVideo} onChange={e => setFilterVideo?.(e.target.checked)} className="hidden" />
                        </div>
                        <Video size={16} className={filterVideo ? 'text-white' : 'text-slate-500'} />
                        <span className={`text-xs font-bold ${filterVideo ? 'text-white' : 'text-slate-500'}`}>Vídeo</span>
                    </label>

                    <div className="w-px h-6 bg-white/10" />

                    <label className="flex items-center space-x-2 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${filterMessage ? 'bg-neon-purple border-neon-purple text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'border-white/20 group-hover:border-white/40'}`}>
                            {filterMessage && <Check size={12} strokeWidth={4} />}
                            <input type="checkbox" checked={filterMessage} onChange={e => setFilterMessage?.(e.target.checked)} className="hidden" />
                        </div>
                        <MessageSquare size={16} className={filterMessage ? 'text-white' : 'text-slate-500'} />
                        <span className={`text-xs font-bold ${filterMessage ? 'text-white' : 'text-slate-500'}`}>Mensagem</span>
                    </label>
                </div>
            </div>
        </div>
    )
}
