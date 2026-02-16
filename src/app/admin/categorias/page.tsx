'use client'

import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Plus, X, Tag, Trash2, ArrowRight } from 'lucide-react'
import { GlowInput } from '@/components/ui/GlowInput'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminCategoriesPage() {
    const [specialties, setSpecialties] = useState<any[]>([])
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [newCategory, setNewCategory] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Official Specialties
            const { data: sData, error: sError } = await supabase
                .from('specialties')
                .select('*')
                .order('name')

            if (sError) throw sError
            setSpecialties(sData || [])

            // 2. Fetch Suggestions (Custom specialties from 'Outros')
            const { data: pData, error: pError } = await supabase
                .from('profiles')
                .select('custom_specialty')
                .eq('specialty', 'Outros')
                .not('custom_specialty', 'is', null)

            if (pError) throw pError

            // Count occurrences
            const counts: Record<string, number> = {}
            pData?.forEach((p: any) => {
                if (p.custom_specialty) {
                    const name = p.custom_specialty.trim()
                    counts[name] = (counts[name] || 0) + 1
                }
            })

            // Transform to array
            const suggs = Object.entries(counts).map(([name, count]) => ({ name, count }))
            // Filter out those that are already official (case insensitive check)
            const officialNames = new Set(sData?.map(s => s.name.toLowerCase()))
            const filteredSuggs = suggs.filter(s => !officialNames.has(s.name.toLowerCase()))

            setSuggestions(filteredSuggs.sort((a, b) => b.count - a.count))

        } catch (err: any) {
            console.error('Error fetching data:', err)
            toast.error('Erro ao carregar dados.')
        } finally {
            setLoading(false)
        }
    }

    const handleAddCategory = async (name: string, fromSuggestion = false) => {
        if (!name.trim()) return

        try {
            const { error } = await supabase
                .from('specialties')
                .insert({ name: name.trim() })

            if (error) throw error

            toast.success(`Categoria "${name}" adicionada!`)
            setNewCategory('')
            fetchData() // Refresh list and suggestions
        } catch (err: any) {
            toast.error('Erro ao adicionar: ' + err.message)
        }
    }

    const handleDeleteCategory = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja remover "${name}"? Oraculistas com esta categoria serão movidos para "Outros".`)) return

        try {
            // 1. Move oracles to 'Outros' + custom_specialty
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    specialty: 'Outros',
                    custom_specialty: name
                })
                .eq('specialty', name)

            if (updateError) throw updateError

            // 2. Delete from specialties
            const { error: deleteError } = await supabase
                .from('specialties')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError

            toast.success(`Categoria "${name}" removida e oraculistas atualizados.`)
            fetchData()
        } catch (err: any) {
            console.error(err)
            toast.error('Erro ao remover: ' + err.message)
        }
    }

    const handleIgnoreSuggestion = (name: string) => {
        // Here we could persist ignore list, but for now just filter out from view locally or we could clear custom_specialty?
        // User request says "Botão X para remover/ignorar".
        // Let's just remove from the list locally for this session or implemented via a "ignored_suggestions" table if complex.
        // For simplicity: We will just filter it out from state.
        setSuggestions(prev => prev.filter(s => s.name !== name))
        toast.success(`Sugestão "${name}" ignorada.`)
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="max-w-5xl mx-auto p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Gerenciar <span className="neon-text-purple">Categorias</span></h1>
                <p className="text-slate-400">Adicione novas expecialidades ou oficialize sugestões dos oraculistas.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Official List */}
                <div className="space-y-6">
                    <GlassCard className="border-white/5 space-y-6" hover={false}>
                        <div className="flex items-center space-x-3 text-neon-cyan mb-2">
                            <Tag size={20} />
                            <h3 className="font-bold text-white uppercase tracking-wider text-sm">Categorias Oficiais</h3>
                        </div>

                        <div className="flex gap-2">
                            <GlowInput
                                placeholder="Nova Categoria..."
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value)}
                            />
                            <NeonButton variant="cyan" onClick={() => handleAddCategory(newCategory)}>
                                <Plus size={18} />
                            </NeonButton>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {specialties.map(spec => (
                                <div key={spec.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
                                    <span className="text-white font-medium">{spec.name}</span>
                                    {spec.name !== 'Outros' && (
                                        <button
                                            onClick={() => handleDeleteCategory(spec.id, spec.name)}
                                            className="text-slate-500 hover:text-red-500 transition-colors"
                                            title="Remover e mover oraculistas para Outros"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>

                {/* Suggestions */}
                <div className="space-y-6">
                    <GlassCard className="border-white/5 space-y-6" hover={false}>
                        <div className="flex items-center space-x-3 text-neon-gold mb-2">
                            <ArrowRight size={20} />
                            <h3 className="font-bold text-white uppercase tracking-wider text-sm">Sugestões ("Outros")</h3>
                        </div>

                        {suggestions.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                <p>Nenhuma sugestão pendente.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {suggestions.map((sugg, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-neon-gold/5 rounded-xl border border-neon-gold/10">
                                        <div>
                                            <p className="text-white font-bold">{sugg.name}</p>
                                            <p className="text-xs text-neon-gold">{sugg.count} oraculistas usando</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleAddCategory(sugg.name, true)}
                                                className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                                                title="Adicionar como oficial"
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
        </div>
    )
}
