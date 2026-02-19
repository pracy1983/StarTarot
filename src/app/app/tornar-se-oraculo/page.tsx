'use client'

import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Sparkles, Send, User, Book, MessageSquare, Info, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function OracleSignupPage() {
    const { profile, setProfile } = useAuthStore()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        full_name: profile?.full_name || '',
        specialty: '',
        custom_specialty: '',
        bio: '',
        personality: '',
        phone: profile?.phone || ''
    })
    const [specialties, setSpecialties] = useState<string[]>([])

    useEffect(() => {
        const fetchSpecialties = async () => {
            const { data } = await supabase.from('specialties').select('name').order('name')
            if (data) {
                setSpecialties(data.map(s => s.name))
            }
        }
        fetchSpecialties()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.specialty || !formData.bio) {
            toast.error('Por favor, preencha os campos obrigatórios.')
            return
        }

        setLoading(true)
        try {
            const { data, error } = await supabase.rpc('update_oracle_application', {
                p_full_name: formData.full_name,
                p_specialty: formData.specialty,
                p_bio: formData.bio,
                p_personality: formData.personality,
                p_phone: formData.phone,
                p_custom_specialty: formData.specialty === 'Outros' ? formData.custom_specialty : null
            })

            if (error) throw error

            setProfile({
                ...profile!,
                ...formData,
                application_status: 'pending',
                role: 'oracle'
            })

            toast.success('Candidatura enviada com sucesso! Aguarde nossa análise.')
            router.push('/app/perfil')
        } catch (err) {
            console.error('Error applying:', err)
            toast.error('Erro ao enviar candidatura.')
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
        <div className="max-w-3xl mx-auto space-y-10">
            <header className="text-center space-y-4">
                <div className="inline-flex items-center space-x-2 text-neon-gold mb-2">
                    <Sparkles size={20} />
                    <span className="text-xs font-bold uppercase tracking-[0.3em]">Junte-se ao Templo</span>
                </div>
                <h1 className="text-4xl font-bold text-white">Torne-se um <span className="neon-text-purple">Oraculista</span></h1>
                <p className="text-slate-400">Compartilhe sua sabedoria e ajude milhares de pessoas em sua jornada espiritual.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                <GlassCard className="border-white/5 p-8" hover={false}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Nome Completo */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-300 flex items-center">
                                <User size={16} className="mr-2 text-neon-purple" />
                                Nome de Exibição *
                            </label>
                            <input
                                type="text"
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full bg-deep-space border border-white/10 rounded-xl p-3 text-white focus:border-neon-purple/50 outline-none transition-all"
                                placeholder="Como os clientes te verão"
                                required
                            />
                        </div>

                        {/* Especialidade */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-300 flex items-center">
                                <Star size={16} className="mr-2 text-neon-cyan" />
                                Especialidade Principal *
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.specialty}
                                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                    className="w-full appearance-none bg-deep-space border border-white/10 rounded-xl p-4 text-white focus:border-neon-cyan/50 outline-none transition-all cursor-pointer hover:bg-white/5"
                                    required
                                >
                                    <option value="" className="bg-deep-space text-slate-500">Selecione sua especialidade...</option>
                                    {specialties.map(s => <option key={s} value={s} className="bg-deep-space py-2">{s}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <MessageSquare size={16} className="text-slate-500" />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 px-1">
                                Escolha a especialidade que melhor define seu atendimento principal. Você poderá mencionar outras habilidades na sua bio.
                            </p>
                        </div>

                        {/* Telefone */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-300">Telefone / WhatsApp *</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full bg-deep-space border border-white/10 rounded-xl p-3 text-white focus:border-white/20 outline-none transition-all"
                                placeholder="(00) 00000-0000"
                                required
                            />
                        </div>
                    </div>

                    {/* Bio / Experiência */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-300 flex items-center">
                                <Book size={16} className="mr-2 text-neon-purple" />
                                Bio & Experiência *
                            </label>
                            <textarea
                                value={formData.bio}
                                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                className="w-full bg-deep-space border border-white/10 rounded-xl p-4 text-white placeholder-slate-600 focus:border-neon-purple/50 outline-none transition-all min-h-[120px]"
                                placeholder="Conte sobre sua trajetória, baralhos que utiliza e como é sua abordagem espiritual..."
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
                                className="w-full bg-deep-space border border-white/10 rounded-xl p-4 text-white placeholder-slate-600 focus:border-neon-cyan/50 outline-none transition-all min-h-[80px]"
                                placeholder="Ex: Acolhedor e direto, Místico e reflexivo, etc."
                            />
                        </div>
                    </div>

                    <div className="mt-8 p-4 bg-neon-purple/5 border border-neon-purple/20 rounded-xl flex items-start space-x-3">
                        <Info className="text-neon-purple flex-shrink-0" size={18} />
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Ao clicar em enviar, você concorda que seus dados serão revisados pela administração do Templo.
                            Caso aprovado, você poderá definir seus horários e tarifas no painel de controle.
                        </p>
                    </div>

                    <NeonButton
                        variant="purple"
                        fullWidth
                        className="mt-8"
                        loading={loading}
                        type="submit"
                    >
                        <Send size={18} className="mr-2" />
                        Enviar Candidatura
                    </NeonButton>
                </GlassCard>
            </form>
        </div>
    )
}

function Clock(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}
