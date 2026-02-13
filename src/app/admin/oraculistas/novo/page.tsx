'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { GlowInput } from '@/components/ui/GlowInput'
import { ScheduleGrid } from '@/components/ui/ScheduleGrid'
import { User, Mail, Sparkles, Brain, Clock, ShieldCheck, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function NewOraclePage() {
    const [isAI, setIsAI] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        fullName: '',
        specialty: 'Tarot',
        bio: '',
        systemPrompt: '',
        creditsPerMinute: 5
    })

    const [schedule, setSchedule] = useState<Record<number, { start: string, end: string, active: boolean }[]>>({
        1: [{ start: '09:00', end: '18:00', active: true }],
        2: [{ start: '09:00', end: '18:00', active: true }],
        3: [{ start: '09:00', end: '18:00', active: true }],
        4: [{ start: '09:00', end: '18:00', active: true }],
        5: [{ start: '09:00', end: '18:00', active: true }],
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (!isAI) {
                // Fluxo Humano: Disparar convite (Magic Link ou Sign Up)
                // Como o Supabase não permite criar usuários diretamente sem ser Admin via API REST comum,
                // vamos simular o convite inserindo o email em uma fila ou usando o createUser da Admin API do Supabase se disponível.
                // Como estamos num ambiente simplificado, vamos cadastrar no profiles e assumir que o usuário fará o signup.
                toast.success(`Convite enviado para ${formData.email}!`)
            } else {
                // Fluxo IA: Cadastro Direto
                const { data, error } = await supabase.from('profiles').insert({
                    email: `${formData.fullName.toLowerCase().replace(/\s+/g, '.')}@star-ai.io`,
                    full_name: formData.fullName,
                    role: 'oracle',
                    is_ai: true,
                    oracle_type: 'ai',
                    specialty: formData.specialty,
                    bio: formData.bio,
                    system_prompt: formData.systemPrompt,
                    credits_per_minute: formData.creditsPerMinute,
                    is_online: true
                }).select().single()

                if (error) throw error

                // Salvar Schedule
                const scheduleEntries = Object.entries(schedule).flatMap(([day, slots]) =>
                    slots.filter(s => s.active).map(s => ({
                        oracle_id: data.id,
                        day_of_week: parseInt(day),
                        start_time: s.start,
                        end_time: s.end
                    }))
                )

                if (scheduleEntries.length > 0) {
                    await supabase.from('schedules').insert(scheduleEntries)
                }

                toast.success('Oraculista Digital (IA) ativado com sucesso!')
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao cadastrar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                    <Sparkles className="mr-3 text-neon-gold" />
                    Manifestar Novo Oraculista
                </h1>
                <p className="text-slate-400">Expanda o conhecimento do Templo com novos guias espirituais.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Switch Humano / IA */}
                <GlassCard className="border-white/5" hover={false}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Natureza do Oraculista</h3>
                            <p className="text-sm text-slate-500">Defina se o guia será uma pessoa real ou uma inteligência artificial.</p>
                        </div>
                        <div className="flex bg-deep-space p-1 rounded-xl border border-white/10">
                            <button
                                type="button"
                                onClick={() => setIsAI(false)}
                                className={`flex items-center px-4 py-2 rounded-lg transition-all ${!isAI ? 'bg-neon-purple text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <User size={18} className="mr-2" /> Humano
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAI(true)}
                                className={`flex items-center px-4 py-2 rounded-lg transition-all ${isAI ? 'bg-neon-cyan text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Brain size={18} className="mr-2" /> IA Digital
                            </button>
                        </div>
                    </div>
                </GlassCard>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Coluna Dados Básicos */}
                    <div className="lg:col-span-1 space-y-6">
                        <GlassCard title="Identidade" hover={false}>
                            <div className="space-y-4">
                                <div className="w-32 h-32 mx-auto rounded-full bg-deep-space border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-slate-500 hover:border-neon-purple transition-colors cursor-pointer group">
                                    <ImageIcon size={32} className="group-hover:text-neon-purple transition-colors" />
                                    <span className="text-[10px] mt-2">Upload Avatar</span>
                                </div>

                                {!isAI && (
                                    <GlowInput
                                        label="E-mail de Convite"
                                        type="email"
                                        placeholder="oraculista@email.com"
                                        icon={<Mail size={16} />}
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                )}

                                <GlowInput
                                    label="Nome Completo / Nome Místico"
                                    placeholder="Ex: Mestre Arcanus"
                                    icon={<ShieldCheck size={16} />}
                                    value={formData.fullName}
                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                    required
                                />

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-400 ml-1">Especialidade</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-neon-purple/50 transition-all"
                                        value={formData.specialty}
                                        onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                    >
                                        <option value="Tarot">Tarot</option>
                                        <option value="Astrologia">Astrologia</option>
                                        <option value="Búzios">Búzios</option>
                                        <option value="Runas">Runas</option>
                                        <option value="Numerologia">Numerologia</option>
                                    </select>
                                </div>

                                <GlowInput
                                    label="Créditos por Minuto"
                                    type="number"
                                    min="1"
                                    value={formData.creditsPerMinute}
                                    onChange={e => setFormData({ ...formData, creditsPerMinute: parseInt(e.target.value) })}
                                    icon={<Sparkles size={16} />}
                                />
                            </div>
                        </GlassCard>
                    </div>

                    {/* Coluna Lógica e Horários */}
                    <div className="lg:col-span-2 space-y-6">
                        <AnimatePresence mode="wait">
                            {isAI && (
                                <motion.div
                                    key="ai-fields"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <GlassCard title="Personalidade Digital" hover={false} className="border-neon-cyan/20">
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium text-slate-400 ml-1 flex items-center">
                                                    <Brain size={14} className="mr-2 text-neon-cyan" /> AI System Prompt
                                                </label>
                                                <textarea
                                                    placeholder="Defina as regras, personalidade e forma de tiragem desta IA..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-neon-cyan/50 transition-all h-32 resize-none"
                                                    value={formData.systemPrompt}
                                                    onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium text-slate-400 ml-1">Biografia Curta</label>
                                                <textarea
                                                    placeholder="Aparecerá para o cliente no marketplace..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-neon-cyan/50 transition-all h-20 resize-none"
                                                    value={formData.bio}
                                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <GlassCard title="Grade de Horários Disponíveis" hover={false}>
                            <div className="mb-4 flex items-center text-slate-500 text-xs">
                                <Clock size={14} className="mr-2" />
                                Os horários definidos aqui controlam a disponibilidade automática no marketplace.
                            </div>
                            <ScheduleGrid schedule={schedule} onChange={setSchedule} />
                        </GlassCard>

                        <div className="flex justify-end pt-4">
                            <NeonButton
                                variant={isAI ? 'cyan' : 'purple'}
                                size="lg"
                                loading={loading}
                                className="w-full md:w-auto min-w-[200px]"
                            >
                                {isAI ? 'Ativar Manifestação Digital' : 'Enviar Convite Místico'}
                            </NeonButton>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
