'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { GlowInput } from '@/components/ui/GlowInput'
import { ScheduleGrid } from '@/components/ui/ScheduleGrid'
import { User, Mail, Sparkles, Brain, Clock, ShieldCheck, Image as ImageIcon, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ImageCropperModal } from '@/components/ui/ImageCropperModal'
import { useRouter, useParams, useSearchParams } from 'next/navigation'

export default function EditOraclePage() {
    const router = useRouter()
    const params = useParams()
    const oracleId = params.id as string
    const searchParams = useSearchParams()
    const backTab = searchParams.get('tab') || 'human'

    const [isAI, setIsAI] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [specialties, setSpecialties] = useState<any[]>([])
    const [isAddingCategory, setIsAddingCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [cropModal, setCropModal] = useState<{ open: boolean, image: string }>({ open: false, image: '' })
    const [formData, setFormData] = useState({
        email: '',
        fullName: '',
        specialty: 'Tarot',
        bio: '',
        systemPrompt: '',
        personality: '',
        creditsPerMinute: 5,
        pricePerMessage: 10,
        avatarUrl: '',
        isOnline: true
    })

    const [schedule, setSchedule] = useState<Record<number, { start: string, end: string, active: boolean }[]>>({
        0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    })

    useEffect(() => {
        if (oracleId) {
            loadOracle()
            fetchSpecialties()
        }
    }, [oracleId])

    const fetchSpecialties = async () => {
        const { data } = await supabase
            .from('specialties')
            .select('*')
            .eq('active', true)
            .order('name', { ascending: true })
        if (data) setSpecialties(data)
    }

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return
        setSaving(true)
        try {
            const slug = newCategoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
            const { data, error } = await supabase.from('specialties').insert({
                name: newCategoryName,
                slug
            }).select().single()

            if (error) throw error
            setSpecialties(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
            setFormData(prev => ({ ...prev, specialty: data.name }))
            setNewCategoryName('')
            setIsAddingCategory(false)
            toast.success('Categoria adicionada!')
        } catch (err: any) {
            toast.error('Erro ao adicionar categoria: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const loadOracle = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', oracleId)
                .single()

            if (error) throw error
            if (data) {
                setIsAI(data.is_ai || false)
                setFormData({
                    email: data.email || '',
                    fullName: data.full_name || '',
                    specialty: data.specialty || 'Tarot',
                    bio: data.bio || '',
                    systemPrompt: data.system_prompt || '',
                    personality: data.personality || '',
                    creditsPerMinute: data.credits_per_minute || 5,
                    pricePerMessage: data.price_per_message || 10,
                    avatarUrl: data.avatar_url || '',
                    isOnline: data.is_online ?? true
                })

                // Load Schedule
                const { data: schedData } = await supabase
                    .from('schedules')
                    .select('*')
                    .eq('oracle_id', oracleId)

                if (schedData) {
                    const newSched: Record<number, any> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
                    schedData.forEach(s => {
                        newSched[s.day_of_week].push({
                            start: s.start_time.substring(0, 5),
                            end: s.end_time.substring(0, 5),
                            active: true
                        })
                    })
                    // Ensure days without data have at least one inactive slot or stay empty
                    setSchedule(newSched)
                }
            }
        } catch (err: any) {
            console.error('Erro ao carregar oraculista:', err)
            toast.error('Erro ao carregar dados do oraculista')
        } finally {
            setLoading(false)
        }
    }

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
        setSaving(true)
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
            toast.error('Erro ao subir foto.')
        } finally {
            setSaving(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.fullName,
                    specialty: formData.specialty,
                    bio: formData.bio,
                    system_prompt: formData.systemPrompt,
                    personality: formData.personality,
                    credits_per_minute: isAI ? 0 : formData.creditsPerMinute,
                    price_per_message: formData.pricePerMessage,
                    avatar_url: formData.avatarUrl,
                    is_online: formData.isOnline
                })
                .eq('id', oracleId)

            if (error) throw error

            // Update Schedule
            // 1. Delete old
            await supabase.from('schedules').delete().eq('oracle_id', oracleId)

            // 2. Insert new
            const scheduleEntries = Object.entries(schedule).flatMap(([day, slots]) =>
                slots.filter(s => s.active).map(s => ({
                    oracle_id: oracleId,
                    day_of_week: parseInt(day),
                    start_time: s.start.includes(':') ? (s.start.length === 5 ? `${s.start}:00` : s.start) : '00:00:00',
                    end_time: s.end.includes(':') ? (s.end.length === 5 ? `${s.end}:00` : s.end) : '23:59:00'
                }))
            )

            if (scheduleEntries.length > 0) {
                const { error: schedError } = await supabase.from('schedules').insert(scheduleEntries)
                if (schedError) throw schedError
            }

            toast.success('Oraculista atualizado com sucesso!')
            router.push(`/admin/oraculistas?tab=${backTab}`)
        } catch (err: any) {
            console.error('Erro ao atualizar:', err)
            toast.error(err.message || 'Erro ao salvar alterações.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="p-6 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Carregando Oraculista...</p>
            </div>
        )
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
                <button
                    onClick={() => router.push(`/admin/oraculistas?tab=${backTab}`)}
                    className="flex items-center text-slate-400 hover:text-white transition-colors mb-4 text-sm"
                >
                    <ArrowLeft size={16} className="mr-2" /> Voltar à lista
                </button>
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                    <Sparkles className="mr-3 text-neon-gold" />
                    Editar Oraculista
                </h1>
                <p className="text-slate-400">Ajuste os dados e configurações do guia espiritual.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 pb-20">
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
                                    <p className="text-[10px] text-center text-slate-500 uppercase font-bold tracking-widest">Clique para trocar a imagem</p>
                                </div>

                                <GlowInput
                                    label="Nome do Oraculista"
                                    placeholder="Ex: Mestre Arcanus"
                                    value={formData.fullName}
                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                    required
                                />

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-sm font-medium text-slate-400 ml-1">Especialidade Principal</label>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingCategory(true)}
                                            className="text-[10px] text-neon-gold hover:text-white font-bold uppercase transition-colors"
                                        >
                                            + Nova Categoria
                                        </button>
                                    </div>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-neon-purple/50 transition-all font-medium"
                                        value={formData.specialty}
                                        onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                    >
                                        <option value="" className="bg-deep-space text-slate-500">Selecione uma categoria...</option>
                                        {specialties.map(s => (
                                            <option key={s.id} value={s.name} className="bg-deep-space">{s.name}</option>
                                        ))}
                                        <option value="Outros" className="bg-deep-space">Outros (Personalizado)</option>
                                    </select>
                                </div>

                                {/* Modal de Nova Categoria */}
                                <AnimatePresence>
                                    {isAddingCategory && (
                                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className="w-full max-w-sm"
                                            >
                                                <GlassCard className="border-neon-gold/30" hover={false}>
                                                    <div className="space-y-4">
                                                        <h3 className="text-lg font-bold text-white flex items-center">
                                                            <Sparkles size={18} className="mr-2 text-neon-gold" />
                                                            Nova Categoria
                                                        </h3>
                                                        <GlowInput
                                                            label="Nome da Categoria"
                                                            placeholder="Ex: Baralho Cigano"
                                                            value={newCategoryName}
                                                            onChange={e => setNewCategoryName(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <div className="flex gap-3">
                                                            <NeonButton
                                                                variant="purple"
                                                                fullWidth
                                                                onClick={() => setIsAddingCategory(false)}
                                                                type="button"
                                                            >
                                                                Cancelar
                                                            </NeonButton>
                                                            <NeonButton
                                                                variant="gold"
                                                                fullWidth
                                                                onClick={handleAddCategory}
                                                                loading={saving}
                                                                type="button"
                                                            >
                                                                Adicionar
                                                            </NeonButton>
                                                        </div>
                                                    </div>
                                                </GlassCard>
                                            </motion.div>
                                        </div>
                                    )}
                                </AnimatePresence>

                                {/* Campo para especialidade personalizada */}
                                {formData.specialty === 'Outros' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="space-y-1.5"
                                    >
                                        <GlowInput
                                            label="Qual Especialidade?"
                                            placeholder="Ex: Baralho Cigano, Reiki..."
                                            value={formData.specialty === 'Outros' ? '' : formData.specialty}
                                            onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                            required
                                        />
                                    </motion.div>
                                )}

                                {isAI ? (
                                    <GlowInput
                                        label="Créditos por Mensagem"
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

                                {/* Toggle Online */}
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                    <span className="text-sm text-slate-400 font-medium">Status Online</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isOnline: !formData.isOnline })}
                                        className={`w-12 h-6 rounded-full relative transition-all ${formData.isOnline ? 'bg-green-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${formData.isOnline ? 'right-0.5' : 'left-0.5'}`} />
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Coluna Principal: Personalidade */}
                    <div className="lg:col-span-2 space-y-6">
                        <GlassCard hover={false} className={isAI ? 'border-neon-cyan/20' : 'border-neon-purple/20'}>
                            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center">
                                {isAI ? <Brain size={16} className="mr-2 text-neon-cyan" /> : <User size={16} className="mr-2 text-neon-purple" />}
                                {isAI ? 'Configuração do Oráculo Digital' : 'Perfil do Guia Espiritual'}
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
                                                <Sparkles size={14} className="mr-2 text-neon-gold" /> Personalidade e Estilo
                                            </label>
                                            <textarea
                                                placeholder="Fale sobre a história do oráculo, o tom de voz, se ele é acolhedor ou direto, etc."
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
                                <span>A disponibilidade automática do oráculo no marketplace será baseada nestes horários.</span>
                            </div>
                            <ScheduleGrid schedule={schedule} onChange={setSchedule} />
                        </GlassCard>

                        <div className="flex justify-end pt-4 gap-4">
                            <button
                                type="button"
                                onClick={() => router.push(`/admin/oraculistas?tab=${backTab}`)}
                                className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all font-bold"
                            >
                                Cancelar
                            </button>
                            <NeonButton
                                variant={isAI ? 'cyan' : 'purple'}
                                size="lg"
                                loading={saving}
                                className="min-w-[200px]"
                            >
                                Salvar Alterações
                            </NeonButton>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
