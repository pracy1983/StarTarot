'use client'

import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Sparkles, Send, User, Book, MessageSquare, Info, Star, Layers, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { GlowInput } from '@/components/ui/GlowInput'

export default function OracleSignupPage() {
    const { profile, setProfile } = useAuthStore()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [categoriesList, setCategoriesList] = useState<any[]>([])
    const [topicsList, setTopicsList] = useState<any[]>([])

    const [formData, setFormData] = useState({
        full_name: profile?.full_name || '',
        categories: [] as string[],
        topics: [] as string[],
        custom_category: '',
        custom_topic: '',
        bio: '',
        personality: '',
        phone: profile?.phone || ''
    })

    useEffect(() => {
        const fetchContent = async () => {
            const [cats, tops] = await Promise.all([
                supabase.from('categories').select('*').eq('active', true).order('name'),
                supabase.from('specialties').select('*').eq('active', true).order('name')
            ])
            if (cats.data) setCategoriesList(cats.data)
            if (tops.data) setTopicsList(tops.data)
        }
        fetchContent()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (formData.categories.length === 0 || formData.topics.length === 0 || !formData.bio) {
            toast.error('Por favor, preencha os campos obrigatórios (mínimo 1 categoria e 1 especialidade).')
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase.rpc('update_oracle_application', {
                p_full_name: formData.full_name,
                p_categories: formData.categories,
                p_topics: formData.topics,
                p_bio: formData.bio,
                p_personality: formData.personality,
                p_phone: formData.phone,
                p_custom_category: formData.categories.includes('Outros') ? formData.custom_category : null,
                p_custom_topic: formData.topics.includes('Outros') ? formData.custom_topic : null
            })

            if (error) throw error

            setProfile({
                ...profile!,
                ...formData,
                application_status: 'pending',
                role: 'oracle'
            })

            toast.success('Candidatura enviada com sucesso! Aguarde nossa análise.')
            router.push('/app/dashboard/perfil')
        } catch (err: any) {
            console.error('Error applying:', err)
            toast.error('Erro ao enviar candidatura: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (profile?.application_status) {
            router.push('/app/dashboard')
        }
    }, [profile, router])

    if (profile?.application_status) {
        return null
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-20">
            <header className="text-center space-y-4">
                <div className="inline-flex items-center space-x-2 text-neon-gold mb-2">
                    <Sparkles size={20} />
                    <span className="text-xs font-bold uppercase tracking-[0.3em]">Junte-se ao Templo</span>
                </div>
                <h1 className="text-4xl font-bold text-white">Torne-se um <span className="neon-text-purple">Oraculista</span></h1>
                <p className="text-slate-400">Compartilhe sua sabedoria e ajude milhares de pessoas em sua jornada espiritual.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                <GlassCard className="border-white/5 p-8 md:p-12" hover={false}>
                    <div className="space-y-10">
                        {/* Seção 1: Identificação */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 flex items-center">
                                    <User size={16} className="mr-2 text-neon-purple" />
                                    Nome de Exibição *
                                </label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full bg-deep-space border border-white/10 rounded-xl p-4 text-white focus:border-neon-purple/50 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="Ex: Oraculista Luna"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 flex items-center">
                                    <Star size={16} className="mr-2 text-neon-gold" />
                                    WhatsApp de Contato *
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full bg-deep-space border border-white/10 rounded-xl p-4 text-white focus:border-neon-gold/50 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="(00) 00000-0000"
                                    required
                                />
                            </div>
                        </div>

                        {/* Seção 2: Categorias (Ferramentas) */}
                        <div className="space-y-6">
                            <header className="flex items-center justify-between">
                                <label className="text-sm font-bold text-white flex items-center uppercase tracking-widest">
                                    <Layers size={18} className="mr-2 text-neon-purple" />
                                    Ferramentas de Trabalho (Máx 3) *
                                </label>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${formData.categories.length === 3 ? 'bg-red-500/10 text-red-400' : 'bg-neon-purple/10 text-neon-purple'}`}>
                                    {formData.categories.length}/3 Selecionadas
                                </span>
                            </header>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {categoriesList.map(item => {
                                    const isSelected = formData.categories.includes(item.name)
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                if (isSelected) {
                                                    setFormData(p => ({ ...p, categories: p.categories.filter(c => c !== item.name) }))
                                                } else if (formData.categories.length < 3) {
                                                    setFormData(p => ({ ...p, categories: [...p.categories, item.name] }))
                                                } else {
                                                    toast.error('Escolha no máximo 3 categorias.')
                                                }
                                            }}
                                            className={`p-4 rounded-xl border text-left transition-all group ${isSelected ? 'bg-neon-purple/20 border-neon-purple/50 text-white shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10 hover:border-white/20'}`}
                                        >
                                            <span className="text-xs font-bold leading-tight">{item.name}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            {formData.categories.includes('Outros') && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <GlowInput
                                        placeholder="Qual ferramenta? (Máx 20 caracteres)"
                                        value={formData.custom_category}
                                        onChange={e => setFormData({ ...formData, custom_category: e.target.value.substring(0, 20) })}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Seção 3: Especialidades (Assuntos) */}
                        <div className="space-y-6">
                            <header className="flex items-center justify-between">
                                <label className="text-sm font-bold text-white flex items-center uppercase tracking-widest">
                                    <BookOpen size={18} className="mr-2 text-neon-cyan" />
                                    Temas de Especialidade (Máx 3) *
                                </label>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${formData.topics.length === 3 ? 'bg-red-500/10 text-red-400' : 'bg-neon-cyan/10 text-neon-cyan'}`}>
                                    {formData.topics.length}/3 Selecionadas
                                </span>
                            </header>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {topicsList.map(item => {
                                    const isSelected = formData.topics.includes(item.name)
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                if (isSelected) {
                                                    setFormData(p => ({ ...p, topics: p.topics.filter(t => t !== item.name) }))
                                                } else if (formData.topics.length < 3) {
                                                    setFormData(p => ({ ...p, topics: [...p.topics, item.name] }))
                                                } else {
                                                    toast.error('Escolha no máximo 3 temas.')
                                                }
                                            }}
                                            className={`p-4 rounded-xl border text-left transition-all group ${isSelected ? 'bg-neon-cyan/20 border-neon-cyan/50 text-white shadow-[0_0_20px_rgba(6,182,212,0.1)]' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10 hover:border-white/20'}`}
                                        >
                                            <span className="text-xs font-bold leading-tight">{item.name}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            {formData.topics.includes('Outros') && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <GlowInput
                                        placeholder="Qual tema? (Máx 20 caracteres)"
                                        value={formData.custom_topic}
                                        onChange={e => setFormData({ ...formData, custom_topic: e.target.value.substring(0, 20) })}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Seção 4: Bio & Personalidade */}
                        <div className="space-y-6 bg-white/5 p-6 rounded-[2rem] border border-white/5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 flex items-center">
                                    <Book size={16} className="mr-2 text-neon-purple" />
                                    Bio & Experiência Profissional *
                                </label>
                                <textarea
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full bg-deep-space border border-white/10 rounded-2xl p-5 text-white placeholder-slate-600 focus:border-neon-purple/50 outline-none transition-all min-h-[150px] text-sm leading-relaxed"
                                    placeholder="Conte-nos sobre sua trajetória espiritual, os oráculos que domina e como é seu atendimento..."
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 flex items-center">
                                    <MessageSquare size={16} className="mr-2 text-neon-cyan" />
                                    Personalidade do Atendimento
                                </label>
                                <textarea
                                    value={formData.personality}
                                    onChange={e => setFormData({ ...formData, personality: e.target.value })}
                                    className="w-full bg-deep-space border border-white/10 rounded-2xl p-5 text-white placeholder-slate-600 focus:border-neon-cyan/50 outline-none transition-all min-h-[100px] text-sm leading-relaxed"
                                    placeholder="Ex: Acolhedora, direta e realista, focada em autoconhecimento..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 p-6 bg-neon-gold/5 border border-neon-gold/20 rounded-2xl flex items-start space-x-4">
                        <Info className="text-neon-gold flex-shrink-0 mt-1" size={20} />
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-white">Próximo Passo: Aprovação</p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Sua candidatura será enviada para nossa curadoria. Caso seu perfil combine com o Templo, ele será aprovado e você receberá total acesso ao painel de controle para configurar sua agenda e tarifário.
                            </p>
                        </div>
                    </div>

                    <NeonButton
                        variant="purple"
                        fullWidth
                        size="lg"
                        className="mt-10 py-6 text-lg font-bold shadow-[0_0_30px_rgba(168,85,247,0.2)]"
                        loading={loading}
                        type="submit"
                    >
                        <Send size={20} className="mr-3" />
                        Finalizar e Enviar Candidatura
                    </NeonButton>
                </GlassCard>
            </form>
        </div>
    )
}
