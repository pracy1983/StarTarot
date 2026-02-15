'use client'

import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowInput } from '@/components/ui/GlowInput'
import { NeonButton } from '@/components/ui/NeonButton'
import { User, Mail, Camera, Phone, Book, Star, MessageSquare, Briefcase, ToggleLeft, ToggleRight, Calendar, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function OracleProfilePage() {
    const { profile, setProfile } = useAuthStore()
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        bio: '',
        specialty: '',
        personality: '',
        requires_birthdate: false,
        requires_birthtime: false
    })

    const specialties = [
        'Tarot', 'Astrologia', 'Cartomancia', 'Numerologia',
        'Runas', 'Clarividência', 'Búzios', 'Outro'
    ]

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                phone: profile.phone || '',
                bio: profile.bio || '',
                specialty: profile.specialty || '',
                personality: profile.personality || '',
                requires_birthdate: profile.requires_birthdate || false,
                requires_birthtime: profile.requires_birthtime || false
            })
        }
    }, [profile])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const { error } = await supabase
                .from('profiles')
                .update(formData)
                .eq('id', profile!.id)

            if (error) throw error

            setProfile({ ...profile!, ...formData })
            toast.success('Perfil de oraculista atualizado!')
        } catch (err: any) {
            console.error('Error updating profile:', err)
            toast.error('Erro ao salvar: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const toggle = (field: 'requires_birthdate' | 'requires_birthtime') => {
        setFormData(prev => ({ ...prev, [field]: !prev[field] }))
    }

    return (
        <div className="max-w-5xl mx-auto space-y-10">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Editor de <span className="neon-text-purple">Perfil Profissional</span></h1>
                    <p className="text-slate-400">Personalize como você aparece no marketplace e defina requisitos para consultas.</p>
                </div>
                <NeonButton variant="purple" size="sm" onClick={() => router.push('/app/dashboard')}>
                    Voltar ao Dashboard
                </NeonButton>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Avatar & Requirements */}
                <div className="space-y-6">
                    <GlassCard className="text-center p-8 border-white/5">
                        <div className="relative inline-block mb-4">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-neon-purple to-neon-gold p-1">
                                <div className="w-full h-full rounded-full bg-deep-space overflow-hidden">
                                    <img
                                        src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&size=128&background=0a0a1a&color=a855f7`}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                            <button className="absolute bottom-0 right-0 p-2 bg-neon-purple text-white rounded-full shadow-lg hover:scale-110 transition-transform">
                                <Camera size={16} />
                            </button>
                        </div>
                        <h2 className="text-xl font-bold text-white">{profile?.full_name}</h2>
                        <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-neon-gold uppercase tracking-wider">
                            <Star size={10} className="mr-1 fill-neon-gold" /> Oraculista
                        </div>
                    </GlassCard>

                    <GlassCard className="border-white/5" glowColor="cyan">
                        <div className="flex items-center space-x-2 text-neon-cyan mb-4">
                            <Briefcase size={18} />
                            <h3 className="text-sm font-bold uppercase tracking-wider">Requisitos da Consulta</h3>
                        </div>
                        <p className="text-xs text-slate-500 mb-6">
                            Defina quais informações seus clientes devem fornecer obrigatoriamente antes de iniciar um atendimento.
                        </p>

                        <div className="space-y-4">
                            <div
                                onClick={() => toggle('requires_birthdate')}
                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${formData.requires_birthdate ? 'bg-neon-purple/20 border-neon-purple/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg ${formData.requires_birthdate ? 'text-neon-purple bg-neon-purple/20' : 'text-slate-500 bg-white/5'}`}>
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${formData.requires_birthdate ? 'text-white' : 'text-slate-400'}`}>Data de Nascimento</p>
                                        <p className="text-[10px] text-slate-500">Obrigatório para Mapa Astral</p>
                                    </div>
                                </div>
                                {formData.requires_birthdate ? <ToggleRight className="text-neon-purple" size={24} /> : <ToggleLeft className="text-slate-600" size={24} />}
                            </div>

                            <div
                                onClick={() => toggle('requires_birthtime')}
                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${formData.requires_birthtime ? 'bg-neon-cyan/20 border-neon-cyan/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg ${formData.requires_birthtime ? 'text-neon-cyan bg-neon-cyan/20' : 'text-slate-500 bg-white/5'}`}>
                                        <Clock size={18} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${formData.requires_birthtime ? 'text-white' : 'text-slate-400'}`}>Hora de Nascimento</p>
                                        <p className="text-[10px] text-slate-500">Para cálculos precisos</p>
                                    </div>
                                </div>
                                {formData.requires_birthtime ? <ToggleRight className="text-neon-cyan" size={24} /> : <ToggleLeft className="text-slate-600" size={24} />}
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Main Form */}
                <div className="lg:col-span-2">
                    <GlassCard className="border-white/5 h-full">
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <GlowInput
                                    label="Nome de Exibição"
                                    icon={<User size={18} />}
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                />
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-400 ml-1">Especialidade Principal</label>
                                    <div className="relative">
                                        <select
                                            value={formData.specialty}
                                            onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-white outline-none focus:border-neon-purple/50 appearance-none"
                                        >
                                            <option value="">Selecione...</option>
                                            {specialties.map(s => <option key={s} value={s} className="bg-deep-space">{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <GlowInput
                                label="WhatsApp de Contato"
                                icon={<Phone size={18} />}
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="(00) 00000-0000"
                            />

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-400 ml-1 flex items-center">
                                    <Book size={14} className="mr-2" />
                                    Bio & Experiência
                                </label>
                                <textarea
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-slate-600 focus:border-neon-purple/50 outline-none transition-all min-h-[150px]"
                                    placeholder="Conte sua história e metodologia..."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-400 ml-1 flex items-center">
                                    <MessageSquare size={14} className="mr-2" />
                                    Personalidade do Atendimento
                                </label>
                                <textarea
                                    value={formData.personality}
                                    onChange={e => setFormData({ ...formData, personality: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-slate-600 focus:border-neon-purple/50 outline-none transition-all min-h-[80px]"
                                    placeholder="Ex: Direto, Acolhedor, Místico..."
                                />
                            </div>

                            <div className="pt-6 border-t border-white/5 flex justify-end">
                                <NeonButton loading={saving} type="submit" variant="purple" size="lg">
                                    Salvar Alterações
                                </NeonButton>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
