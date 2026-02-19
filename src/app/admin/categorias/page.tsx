'use client'

import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Plus, X, Tag, Trash2, ArrowRight, BookOpen, Layers } from 'lucide-react'
import { GlowInput } from '@/components/ui/GlowInput'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Tab = 'categories' | 'specialties'

export default function AdminCategoriesPage() {
    const [activeTab, setActiveTab] = useState<Tab>('categories')
    const [items, setItems] = useState<any[]>([])
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [newItemName, setNewItemName] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [activeTab])

    const fetchData = async () => {
        setLoading(true)
        const table = activeTab === 'categories' ? 'oracle_categories' : 'oracle_specialties'
        const customCol = activeTab === 'categories' ? 'custom_category' : 'custom_topic'

        try {
            // 1. Fetch Official Items
            const { data: sData, error: sError } = await supabase
                .from(table)
                .select('*')
                .order('name')

            if (sError) throw sError
            setItems(sData || [])

            // 2. Fetch Suggestions from profiles
            const profileCol = activeTab === 'categories' ? 'categories' : 'topics'
            const { data: pData, error: pError } = await supabase
                .from('profiles')
                .select(`${customCol}, ${profileCol}`)

            if (pError) throw pError

            // Count occurrences
            const counts: Record<string, number> = {}
            const officialNames = new Set(sData?.map(s => s.name.toLowerCase()))

            pData?.forEach((p: any) => {
                // Check custom text field
                const customVal = p[customCol]
                if (customVal) {
                    const name = customVal.trim()
                    if (!officialNames.has(name.toLowerCase())) {
                        counts[name] = (counts[name] || 0) + 1
                    }
                }

                // Check array fields for items not in official list
                const arrayVals = p[profileCol] as string[] | null
                if (arrayVals && Array.isArray(arrayVals)) {
                    arrayVals.forEach(val => {
                        if (val && !officialNames.has(val.toLowerCase())) {
                            counts[val] = (counts[val] || 0) + 1
                        }
                    })
                }
            })

            // Transform to array
            const filteredSuggs = Object.entries(counts).map(([name, count]) => ({ name, count }))
            setSuggestions(filteredSuggs.sort((a, b) => b.count - a.count))

        } catch (err: any) {
            console.error('Error fetching data:', err)
            toast.error('Erro ao carregar dados.')
        } finally {
            setLoading(false)
        }
    }

    const handleAddItem = async (name: string) => {
        if (!name.trim()) return
        const table = activeTab === 'categories' ? 'oracle_categories' : 'oracle_specialties'
        const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')

        try {
            const { error } = await supabase
                .from(table)
                .insert({
                    name: name.trim(),
                    slug: slug.trim(),
                    active: true
                })

            if (error) throw error

            toast.success(`${activeTab === 'categories' ? 'Categoria' : 'Especialidade'} "${name}" adicionada!`)
            setNewItemName('')
            fetchData()
        } catch (err: any) {
            toast.error('Erro ao adicionar: ' + err.message)
        }
    }

    const handleDeleteItem = async (id: string, name: string) => {
        const typeLabel = activeTab === 'categories' ? 'categoria' : 'especialidade'
        if (!confirm(`Tem certeza que deseja remover a ${typeLabel} "${name}"?`)) return

        const table = activeTab === 'categories' ? 'oracle_categories' : 'oracle_specialties'

        try {
            const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError

            toast.success(`${activeTab === 'categories' ? 'Categoria' : 'Especialidade'} "${name}" removida.`)
            fetchData()
        } catch (err: any) {
            console.error(err)
            toast.error('Erro ao remover: ' + err.message)
        }
    }

    const handleIgnoreSuggestion = (name: string) => {
        setSuggestions(prev => prev.filter(s => s.name !== name))
        toast.success(`Sugestão "${name}" ignorada.`)
    }

    return (
        <div className="max-w-5xl mx-auto p-8 space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Gerenciar <span className="neon-text-purple">Conteúdo</span></h1>
                    <p className="text-slate-400">Configure as ferramentas e temas disponíveis para os oraculistas.</p>
                </div>

                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-all text-xs font-bold uppercase tracking-widest ${activeTab === 'categories' ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'text-slate-500 hover:text-white'}`}
                    >
                        <Layers size={14} />
                        <span>Categorias (Ferramentas)</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('specialties')}
                        className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-all text-xs font-bold uppercase tracking-widest ${activeTab === 'specialties' ? 'bg-neon-cyan text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-slate-500 hover:text-white'}`}
                    >
                        <BookOpen size={14} />
                        <span>Especialidades (Assuntos)</span>
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Official List */}
                    <div className="space-y-6">
                        <GlassCard className="border-white/5 space-y-6" hover={false} glowColor={activeTab === 'categories' ? 'purple' : 'cyan'}>
                            <div className="flex items-center space-x-3 text-white mb-2">
                                <Tag size={20} className={activeTab === 'categories' ? 'text-neon-purple' : 'text-neon-cyan'} />
                                <h3 className="font-bold uppercase tracking-wider text-sm">Oficiais</h3>
                            </div>

                            <div className="flex gap-2">
                                <GlowInput
                                    placeholder={`Nova ${activeTab === 'categories' ? 'ferramenta' : 'especialidade'}...`}
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    onKeyDown={(e: React.KeyboardEvent) => {
                                        if (e.key === 'Enter') {
                                            handleAddItem(newItemName)
                                        }
                                    }}
                                    className="flex-1"
                                />
                                <NeonButton variant={activeTab === 'categories' ? 'purple' : 'cyan'} onClick={() => handleAddItem(newItemName)}>
                                    <Plus size={18} />
                                </NeonButton>
                            </div>

                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {items.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
                                        <span className="text-white font-medium">{item.name}</span>
                                        {item.name !== 'Outros' && (
                                            <button
                                                onClick={() => handleDeleteItem(item.id, item.name)}
                                                className="text-slate-500 hover:text-red-500 transition-colors"
                                                title="Remover"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {items.length === 0 && (
                                    <p className="text-center py-10 text-slate-500 italic">Nenhum item cadastrado.</p>
                                )}
                            </div>
                        </GlassCard>
                    </div>

                    {/* Suggestions */}
                    <div className="space-y-6">
                        <GlassCard className="border-white/5 space-y-6" hover={false} glowColor="gold">
                            <div className="flex items-center space-x-3 text-neon-gold mb-2">
                                <ArrowRight size={20} />
                                <h3 className="font-bold text-white uppercase tracking-wider text-sm">Sugestões dos Oraculistas</h3>
                            </div>

                            {suggestions.length === 0 ? (
                                <div className="text-center py-20 text-slate-500">
                                    <p>Nenhuma sugestão pendente para este tipo.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {suggestions.map((sugg, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-neon-gold/5 rounded-xl border border-neon-gold/10">
                                            <div>
                                                <p className="text-white font-bold">{sugg.name}</p>
                                                <p className="text-xs text-neon-gold">{sugg.count} oraculista(s) usando</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleAddItem(sugg.name)}
                                                    className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                                                    title="Oficializar"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleIgnoreSuggestion(sugg.name)}
                                                    className="p-2 bg-white/5 text-slate-500 rounded-lg hover:text-red-500 hover:bg-white/10 transition-colors"
                                                    title="Ignorar"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </GlassCard>
                    </div>
                </div>
            )}
        </div>
    )
}

