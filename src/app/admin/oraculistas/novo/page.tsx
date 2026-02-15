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

import { ImageCropperModal } from '@/components/ui/ImageCropperModal'
import { useRouter } from 'next/navigation' // Assuming useRouter is needed for router.push

export default function NewOraclePage() {
    const router = useRouter() // Initialize useRouter
    const [isAI, setIsAI] = useState(false)
    const [loading, setLoading] = useState(false)
    const [cropModal, setCropModal] = useState<{ open: boolean, image: string }>({ open: false, image: '' })
    const [formData, setFormData] = useState({
        email: '',
        fullName: '',
        specialty: 'Tarot',
        bio: '',
        systemPrompt: '',
        personality: '', // Sobre a personalidade/estilo do oráculo
        creditsPerMinute: 5,
        pricePerMessage: 10, // Valor para IA
        avatarUrl: '' // URL da foto
    })

    const [schedule, setSchedule] = useState<Record<number, { start: string, end: string, active: boolean }[]>>({
        0: [{ start: '00:00', end: '23:59', active: true }], // Domingo
        1: [{ start: '00:00', end: '23:59', active: true }],
        2: [{ start: '00:00', end: '23:59', active: true }],
        3: [{ start: '00:00', end: '23:59', active: true }],
        4: [{ start: '00:00', end: '23:59', active: true }],
        5: [{ start: '00:00', end: '23:59', active: true }],
        6: [{ start: '00:00', end: '23:59', active: true }], // Sábado
    })

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = () => {
                setCropModal({ open: true, image: reader.result as string })
            }
            reader.readAsDataURL(file)
        }
    }

    const handleCropComplete = async (blob: Blob) => {
        setCropModal({ open: false, image: '' })
        setLoading(true)
        try {
            const fileName = `avatar-${Date.now()}.jpg`
            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, blob, { contentType: 'image/jpeg' })

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            setFormData(prev => ({ ...prev, avatarUrl: publicUrl }))
            toast.success('Foto carregada com sucesso!')
        } catch (err: any) {
            console.error('Erro no upload:', err)
            toast.error('Erro ao subir foto. Verifique se o bucket "avatars" existe e é público.')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (!isAI) {
                // Fluxo Humano
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
                    personality: formData.personality,
                    credits_per_minute: 0,
                    price_per_message: formData.pricePerMessage,
                    avatar_url: formData.avatarUrl,
                    is_online: true
                }).select().single()

                if (error) throw error

                // Salvar Schedule
                if (data) {
                    const scheduleEntries = Object.entries(schedule).flatMap(([day, slots]) =>
                        slots.filter(s => s.active).map(s => ({
                            oracle_id: data.id,
                            day_of_week: parseInt(day),
                            start_time: s.start.includes(':') ? (s.start.split(':').length === 2 ? `${s.start}:00` : s.start) : '00:00:00',
                            end_time: s.end.includes(':') ? (s.end.split(':').length === 2 ? `${s.end}:00` : s.end) : '23:59:00'
                        }))
                    )

                    if (scheduleEntries.length > 0) {
                        const { error: schedError } = await supabase.from('schedules').insert(scheduleEntries)
                        if (schedError) console.error('Erro ao salvar horários:', schedError)
                    }
                }

                toast.success('Oraculista Digital (IA) ativado com sucesso!')
                router.push('/admin/oraculistas')
            }
        } catch (err: any) {
            console.error('Erro no cadastro:', err)
            toast.error(err.message || 'Erro ao cadastrar. Verifique os campos do banco.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <AnimatePresence>
                {cropModal.open && (
                    <ImageCropperModal
                        image={cropModal.image}
                        onCropComplete={handleCropComplete}
                        onClose={() => setCropModal({ open: false, image: '' })}
                    />
                )}
            </AnimatePresence>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                    <Sparkles className="mr-3 text-neon-gold" />
                    Manifestar Novo Oraculista
                </h1>
                <p className="text-slate-400">Expanda o conhecimento do Templo com novos guias espirituais.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 pb-20">
                {/* Switch Humano / IA */}
                <GlassCard className="border-white/5" hover={false}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Natureza do Oraculista</h3>
                            <p className="text-sm text-slate-500">Defina se o guia será uma pessoa real ou uma inteligência artificial.</p>
                        </div>
                        <div className="flex bg-deep-space p-1 rounded-xl border border-white/10 w-full md:w-auto">
                            <button
                                type="button"
                                onClick={() => setIsAI(false)}
                                className={`flex-1 md:flex-none flex items-center justify-center px-6 py-2.5 rounded-lg transition-all ${!isAI ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <User size={18} className="mr-2" /> Humano
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAI(true)}
                                className={`flex-1 md:flex-none flex items-center justify-center px-6 py-2.5 rounded-lg transition-all ${isAI ? 'bg-neon-cyan text-white shadow-lg shadow-neon-cyan/20' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Brain size={18} className="mr-2" /> IA Digital
                            </button>
                        </div>
                    </div>
                </GlassCard>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Coluna Lateral: Identidade e Preço */}
                    <div className="lg:col-span-1 space-y-6">
                        <GlassCard hover={false} className="h-full">
                            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center">
                                <ShieldCheck size={16} className="mr-2 text-neon-purple" /> Identidade
                            </h3>

                            <div className="space-y-6">
                                {/* Preview Avatar com Botão de Upload */}
                                <div className="space-y-4">
                                    <div className="relative group mx-auto w-40 h-40">
                                        <div className="w-full h-full rounded-full bg-deep-space border-2 border-white/10 overflow-hidden relative">
                                            {formData.avatarUrl ? (
                                                <img src={formData.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                                                    <ImageIcon size={40} />
                                                    <span className="text-[10px] mt-2 font-bold uppercase tracking-tighter">Sem Foto</span>
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-all border-2 border-neon-purple border-dashed">
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                                            <div className="text-center">
                                                <ImageIcon size={24} className="mx-auto text-white" />
                                                <span className="text-[9px] text-white font-bold uppercase mt-1 block">Trocar Foto</span>
                                            </div>
                                        </label>
                                    </div>
                                    <p className="text-[10px] text-center text-slate-500 uppercase font-bold tracking-widest">Clique para subir e ajustar a imagem</p>
                                </div>

                                <GlowInput
                                    label="Nome do Oraculista"
                                    placeholder="Ex: Mestre Arcanus"
                                    value={formData.fullName}
                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                    required
                                />

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

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-400 ml-1">Especialidade Principal</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-neon-purple/50 transition-all font-medium"
                                        value={['Tarot', 'Astrologia', 'Búzios', 'Runas', 'Numerologia'].includes(formData.specialty) ? formData.specialty : (formData.specialty === '' ? 'Outros' : 'Outros')}
                                        onChange={e => {
                                            if (e.target.value === 'Outros') {
                                                setFormData({ ...formData, specialty: '' })
                                            } else {
                                                setFormData({ ...formData, specialty: e.target.value })
                                            }
                                        }}
                                    >
                                        <option value="Tarot" className="bg-deep-space">Tarot</option>
                                        <option value="Astrologia" className="bg-deep-space">Astrologia</option>
                                        <option value="Búzios" className="bg-deep-space">Búzios</option>
                                        <option value="Runas" className="bg-deep-space">Runas</option>
                                        <option value="Numerologia" className="bg-deep-space">Numerologia</option>
                                        <option value="Outros" className="bg-deep-space">Outros (Personalizado)</option>
                                    </select>
                                </div>

                                {/* Campo para especialidade personalizada */}
                                {(!['Tarot', 'Astrologia', 'Búzios', 'Runas', 'Numerologia'].includes(formData.specialty) || formData.specialty === '') && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="space-y-1.5"
                                    >
                                        <GlowInput
                                            label="Qual Especialidade?"
                                            placeholder="Ex: Baralho Cigano, Reiki..."
                                            value={formData.specialty}
                                            onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                            required
                                        />
                                    </motion.div>
                                )}

                                {isAI ? (
                                    <GlowInput
                                        label="Créditos por Pergunta"
                                        type="number"
                                        min="1"
                                        value={formData.pricePerMessage}
                                        onChange={e => setFormData({ ...formData, pricePerMessage: parseInt(e.target.value) })}
                                        icon={<Sparkles size={16} className="text-neon-gold" />}
                                    />
                                ) : (
                                    <GlowInput
                                        label="Créditos por Minuto"
                                        type="number"
                                        min="1"
                                        value={formData.creditsPerMinute}
                                        onChange={e => setFormData({ ...formData, creditsPerMinute: parseInt(e.target.value) })}
                                        icon={<Clock size={16} className="text-neon-purple" />}
                                    />
                                )}
                            </div>
                        </GlassCard>
                    </div>

                    {/* Coluna Principal: Personalidade e Horários */}
                    <div className="lg:col-span-2 space-y-6">
                        <GlassCard hover={false} className={isAI ? 'border-neon-cyan/20' : 'border-neon-purple/20'}>
                            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center">
                                {isAI ? <Brain size={16} className="mr-2 text-neon-cyan" /> : <User size={16} className="mr-2 text-neon-purple" />}
                                {isAI ? 'Configuração do Oráculo Digital' : 'Perfil do Guia Spirit'}
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-400 ml-1 flex items-center">
                                        Biografia Curta (Marketplace)
                                    </label>
                                    <textarea
                                        placeholder="Uma frase marcante que descreve o oráculo..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-neon-purple/50 transition-all h-20 resize-none text-sm"
                                        value={formData.bio}
                                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    />
                                </div>

                                {isAI && (
                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-400 ml-1 flex items-center">
                                                <Brain size={14} className="mr-2 text-neon-cyan" /> AI System Prompt (Instruções Base)
                                            </label>
                                            <textarea
                                                placeholder="Defina as regras técnicas, como ele deve interpretar as cartas e os limites da IA..."
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-neon-cyan/50 transition-all h-32 resize-none text-sm"
                                                value={formData.systemPrompt}
                                                onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-400 ml-1 flex items-center">
                                                <Sparkles size={14} className="mr-2 text-neon-gold" /> Personalidade e Estilo (Obrigatório para Prompt)
                                            </label>
                                            <textarea
                                                placeholder="Fale sobre a história do oráculo, o tom de voz, se ele é acolhedor ou direto, etc. Isso moldará a resposta da IA."
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-neon-gold/50 transition-all h-32 resize-none text-sm"
                                                value={formData.personality}
                                                onChange={e => setFormData({ ...formData, personality: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </GlassCard>

                        <GlassCard hover={false}>
                            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center">
                                <Clock size={16} className="mr-2 text-slate-400" /> Grade de Horários Ativos
                            </h3>
                            <div className="mb-6 flex items-start text-slate-500 text-xs bg-white/5 p-3 rounded-lg border border-white/5">
                                <Clock size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                                <span>A IA ou o Humano só aparecerão como <b>Online</b> no Templo durante estes horários. Para IA sugerimos 24/7 (00:00 às 23:59 todos os dias).</span>
                            </div>
                            <ScheduleGrid schedule={schedule} onChange={setSchedule} />
                        </GlassCard>

                        <div className="flex justify-end pt-4">
                            <NeonButton
                                variant={isAI ? 'cyan' : 'purple'}
                                size="lg"
                                loading={loading}
                                className="w-full md:w-auto min-w-[250px]"
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
