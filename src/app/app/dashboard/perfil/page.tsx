'use client'

import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowInput } from '@/components/ui/GlowInput'
import { NeonButton } from '@/components/ui/NeonButton'
import { User, Mail, Camera, Phone, Book, Star, MessageSquare, Briefcase, ToggleLeft, ToggleRight, Calendar, Clock, CreditCard, X, Scissors, Sparkles, Plus, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import Cropper from 'react-easy-crop'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

export default function OracleProfilePage() {
    const { profile, setProfile, logout } = useAuthStore()
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [deleteStep, setDeleteStep] = useState<'options' | 'confirm_oracle' | 'confirm_account'>('options')

    // Avatar Crop States
    const [imageSource, setImageSource] = useState<string | null>(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
    const [showCropModal, setShowCropModal] = useState(false)
    const [specialtiesList, setSpecialtiesList] = useState<any[]>([])

    // ... (rest of states) ... 
    const [newCategoryName, setNewCategoryName] = useState('')

    const [formData, setFormData] = useState({
        full_name: '',
        name_fantasy: '',
        phone: '',
        bio: '',
        specialty: '',
        custom_specialty: '',
        personality: '',
        price_brl_per_minute: 5.00,
        initial_fee_brl: 0.00,
        price_per_message: 10,
        requires_birthdate: false,
        requires_birthtime: false,
        whatsapp_notification_enabled: false
    })

    const [priceInputs, setPriceInputs] = useState({
        price_brl_per_minute: '5.00',
        initial_fee_brl: '0.00'
    })

    useEffect(() => {
        fetchSpecialties()
    }, [])

    const fetchSpecialties = async () => {
        const { data } = await supabase
            .from('specialties')
            .select('*')
            .eq('active', true)
            .order('name', { ascending: true })
        if (data) setSpecialtiesList(data)
    }

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                name_fantasy: profile.name_fantasy || '',
                phone: profile.phone || '',
                bio: profile.bio || '',
                specialty: profile.specialty || '',
                custom_specialty: '',
                personality: profile.personality || '',
                price_brl_per_minute: profile.price_brl_per_minute || 5.00,
                initial_fee_brl: profile.initial_fee_brl || 0.00,
                price_per_message: profile.price_per_message || 10,
                requires_birthdate: profile.requires_birthdate || false,
                requires_birthtime: profile.requires_birthtime || false,
                whatsapp_notification_enabled: profile.whatsapp_notification_enabled || false
            })
            setPriceInputs({
                price_brl_per_minute: (profile.price_brl_per_minute || 5.00).toString(),
                initial_fee_brl: (profile.initial_fee_brl || 0.00).toString()
            })
        }
    }, [profile])


    const handlePriceChange = (field: 'price_brl_per_minute' | 'initial_fee_brl', value: string) => {
        setPriceInputs(prev => ({ ...prev, [field]: value }))
        const val = parseFloat(value.replace(',', '.')) || 0
        setFormData(prev => ({ ...prev, [field]: val }))
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            // Conversão de R$ para Créditos
            const credits_per_minute = Math.round(formData.price_brl_per_minute * 10)
            const initial_fee_credits = Math.round(formData.initial_fee_brl * 10)

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    name_fantasy: formData.name_fantasy,
                    phone: formData.phone,
                    bio: formData.bio,
                    specialty: formData.specialty === 'Outros' ? formData.custom_specialty : formData.specialty,
                    personality: formData.personality,
                    price_brl_per_minute: formData.price_brl_per_minute,
                    initial_fee_brl: formData.initial_fee_brl,
                    credits_per_minute,
                    initial_fee_credits,
                    price_per_message: formData.price_per_message,
                    requires_birthdate: formData.requires_birthdate,
                    requires_birthtime: formData.requires_birthtime,
                    whatsapp_notification_enabled: formData.whatsapp_notification_enabled
                })
                .eq('id', profile!.id)

            if (error) throw error

            setProfile({
                ...profile!,
                ...formData,
                credits_per_minute,
                initial_fee_credits
            })
            toast.success('Perfil de oraculista atualizado!')
        } catch (err: any) {
            console.error('Error updating profile:', err)
            toast.error('Erro ao salvar: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image()
            image.addEventListener('load', () => resolve(image))
            image.addEventListener('error', (error) => reject(error))
            image.setAttribute('crossOrigin', 'anonymous')
            image.src = url
        })

    const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob | null> => {
        const image = await createImage(imageSrc)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) return null

        canvas.width = pixelCrop.width
        canvas.height = pixelCrop.height

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        )

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob)
            }, 'image/jpeg')
        })
    }

    const handleUploadAvatar = async (fileBlob: Blob) => {
        setSaving(true)
        try {
            const fileName = `${profile?.id}-${Math.random()}.jpg`
            const filePath = `avatars/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, fileBlob)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', profile!.id)

            if (updateError) throw updateError

            setProfile({ ...profile!, avatar_url: publicUrl })
            toast.success('Foto atualizada!')
        } catch (error: any) {
            console.error('Error uploading avatar:', error)
            toast.error('Erro no upload: ' + error.message)
        } finally {
            setSaving(false)
            setShowCropModal(false)
        }
    }

    const toggle = (field: 'requires_birthdate' | 'requires_birthtime') => {
        setFormData(prev => ({ ...prev, [field]: !prev[field] }))
    }

    const handleDeleteAccount = async () => {
        setDeleteLoading(true)
        try {
            const { error } = await supabase.rpc('delete_own_account')
            if (error) throw error

            await logout()
            toast.success('Conta deletada com sucesso.')
            router.push('/')
        } catch (err: any) {
            toast.error('Erro ao deletar conta: ' + err.message)
        } finally {
            setDeleteLoading(false)
        }
    }

    const handleRevertToClient = async () => {
        setDeleteLoading(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    role: 'client',
                    application_status: null,
                    is_oracle: false
                })
                .eq('id', profile!.id)

            if (error) throw error

            setProfile({ ...profile!, role: 'client', application_status: 'rejected', is_oracle: false })
            toast.success('Você agora é apenas Cliente.')
            router.push('/app')
        } catch (err: any) {
            toast.error('Erro ao reverter perfil: ' + err.message)
        } finally {
            setDeleteLoading(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
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
                {/* Avatar & Financials */}
                <div className="space-y-6">
                    <GlassCard className="text-center p-8 border-white/5">
                        <div className="relative inline-block mb-4">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-neon-purple to-neon-gold p-1">
                                <div className="w-full h-full rounded-full bg-deep-space overflow-hidden relative group">
                                    <img
                                        src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&size=128&background=0a0a1a&color=a855f7`}
                                        alt="Avatar"
                                        className="w-full h-full object-cover transition-opacity group-hover:opacity-75"
                                    />
                                    {saving && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                            <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-neon-purple text-white rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer">
                                <Camera size={16} />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        if (file.size > 5 * 1024 * 1024) {
                                            toast.error('Imagem muito grande (máx 5MB)')
                                            return
                                        }
                                        const reader = new FileReader()
                                        reader.addEventListener('load', () => {
                                            setImageSource(reader.result?.toString() || null)
                                            setShowCropModal(true)
                                        })
                                        reader.readAsDataURL(file)
                                    }}
                                />
                            </label>
                        </div>
                        <h2 className="text-xl font-bold text-white">{profile?.full_name}</h2>
                        <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-neon-gold uppercase tracking-wider">
                            <Star size={10} className="mr-1 fill-neon-gold" /> Oraculista
                        </div>
                    </GlassCard>

                    {/* Preço e Conversão */}
                    <GlassCard className="border-white/5" glowColor="gold">
                        <div className="flex items-center space-x-2 text-neon-gold mb-4">
                            <CreditCard size={18} />
                            <h3 className="text-sm font-bold uppercase tracking-wider">Sua Tarifa</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500 ml-1 italic">
                                    Quanto você deseja ganhar por minuto?
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                                    <input
                                        type="text"
                                        value={priceInputs.price_brl_per_minute}
                                        onChange={(e) => handlePriceChange('price_brl_per_minute', e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white font-bold outline-none focus:border-neon-gold/50"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-neon-gold/5 rounded-xl border border-neon-gold/20">
                                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Custo para o Usuário Final</p>
                                <div className="flex items-end space-x-2">
                                    <p className="text-2xl font-black text-white">
                                        {Math.round(formData.price_brl_per_minute * 10)}
                                    </p>
                                    <p className="text-xs text-neon-gold font-bold pb-1 uppercase">Créditos / minuto</p>
                                </div>
                                <p className="text-[9px] text-slate-600 mt-2">
                                    * O sistema converte automaticamente R$ 1,00 para 10 Créditos.
                                </p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="border-white/5" glowColor="gold">
                        <div className="flex items-center space-x-2 text-neon-gold mb-4">
                            <Star size={18} className="fill-neon-gold/20" />
                            <h3 className="text-sm font-bold uppercase tracking-wider">Taxa de Abertura</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400 ml-1 italic">
                                    Quanto custa para abrir a mensagem com você?
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                                    <input
                                        type="text"
                                        value={priceInputs.initial_fee_brl}
                                        onChange={(e) => handlePriceChange('initial_fee_brl', e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white font-bold outline-none focus:border-neon-gold/50"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-neon-gold/5 rounded-xl border border-neon-gold/20">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-end space-x-2">
                                        <p className="text-2xl font-black text-white">
                                            {Math.round(formData.initial_fee_brl * 10)}
                                        </p>
                                        <p className="text-xs text-neon-gold font-bold pb-1 uppercase">Créditos fixos</p>
                                    </div>
                                    {formData.initial_fee_brl === 0 && (
                                        <div className="px-2 py-1 bg-neon-gold text-deep-space text-[10px] font-black rounded animate-pulse">
                                            DESTAQUE ZERO TARIFA
                                        </div>
                                    )}
                                </div>
                                <p className="text-[9px] text-slate-400 mt-2 italic">
                                    * Tarifa inicial cobre o primeiro minuto. Cobrança por minuto começa no 61º segundo.
                                </p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="border-white/5" glowColor="purple">
                        <div className="flex items-center space-x-2 text-neon-purple mb-4">
                            <MessageSquare size={18} />
                            <h3 className="text-sm font-bold uppercase tracking-wider">Preço por Mensagem</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400 ml-1 italic">
                                    Quantos Créditos por Mensagem?
                                </label>
                                <div className="relative">
                                    <MessageSquare size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="number"
                                        value={formData.price_per_message}
                                        onChange={(e) => setFormData(prev => ({ ...prev, price_per_message: parseInt(e.target.value) || 0 }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white font-bold outline-none focus:border-neon-purple/50"
                                    />
                                </div>
                            </div>
                            <p className="text-[9px] text-slate-400 italic">
                                * Este valor é em Créditos diretamente.
                            </p>
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
                                    label="Nome Completo (Interno)"
                                    icon={<User size={18} />}
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                />
                                <GlowInput
                                    label="Nome Fantasia (Público)"
                                    icon={<Sparkles size={18} />}
                                    placeholder="Como os clientes verão você"
                                    value={formData.name_fantasy}
                                    onChange={e => setFormData({ ...formData, name_fantasy: e.target.value })}
                                />

                                <div className="md:col-span-2 space-y-3">
                                    <label className="text-sm font-bold text-slate-300 flex items-center">
                                        <Star size={16} className="mr-2 text-neon-gold" />
                                        Especialidade Principal
                                    </label>
                                    <div className="relative group">
                                        <select
                                            value={formData.specialty}
                                            onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                            className="w-full appearance-none bg-deep-space border border-white/10 rounded-xl p-4 text-white focus:border-neon-purple/50 outline-none transition-all cursor-pointer hover:bg-white/5 shadow-lg"
                                        >
                                            <option value="" className="text-slate-500">Selecione sua especialidade...</option>
                                            {specialtiesList.map(s => (
                                                <option key={s.id} value={s.name} className="bg-deep-space text-white py-2">
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-neon-gold transition-colors">
                                            <MessageSquare size={18} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 px-1">
                                        * Apenas categorias oficiais do sistema. Para sugerir novas, contate a administração.
                                    </p>
                                </div>
                            </div>

                            <GlowInput
                                label="WhatsApp de Contato"
                                icon={<Phone size={18} />}
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="(00) 00000-0000"
                            />

                            <div
                                onClick={() => setFormData(prev => ({ ...prev, whatsapp_notification_enabled: !prev.whatsapp_notification_enabled }))}
                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${formData.whatsapp_notification_enabled ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg ${formData.whatsapp_notification_enabled ? 'text-green-400 bg-green-500/20' : 'text-slate-500 bg-white/5'}`}>
                                        <MessageSquare size={18} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${formData.whatsapp_notification_enabled ? 'text-white' : 'text-slate-400'}`}>Notificações do Sistema</p>
                                        <p className="text-[10px] text-slate-500">Receba aviso imediato no WhatsApp: "Alguém quer fazer uma consulta"</p>
                                    </div>
                                </div>
                                {formData.whatsapp_notification_enabled ? <ToggleRight className="text-green-400" size={24} /> : <ToggleLeft className="text-slate-600" size={24} />}
                            </div>

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
            {/* Avatar Crop Modal */}
            <AnimatePresence>
                {showCropModal && imageSource && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-deep-space border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <Scissors size={20} className="mr-3 text-neon-purple" />
                                    Ajustar Foto de Perfil
                                </h3>
                                <button onClick={() => setShowCropModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="relative h-[400px] w-full bg-black/40">
                                <Cropper
                                    image={imageSource}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                                        <span>Zoom</span>
                                        <span>{Math.round(zoom * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        value={zoom}
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-purple"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <NeonButton
                                        variant="white"
                                        fullWidth
                                        onClick={() => setShowCropModal(false)}
                                    >
                                        Cancelar
                                    </NeonButton>
                                    <NeonButton
                                        variant="purple"
                                        fullWidth
                                        loading={saving}
                                        onClick={async () => {
                                            if (!imageSource || !croppedAreaPixels) return
                                            const croppedImage = await getCroppedImg(imageSource, croppedAreaPixels)
                                            if (croppedImage) {
                                                await handleUploadAvatar(croppedImage)
                                            }
                                        }}
                                    >
                                        Salvar Recorte
                                    </NeonButton>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Danger Zone - Compact & High Contrast */}
            <div className="pt-10 border-t border-white/5">
                <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-4 flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            Zona de Perigo
                        </h3>
                        <p className="text-xs text-red-300 mt-1 opacity-80">
                            Ações irreversíveis para sua conta e dados.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setDeleteStep('options')
                            setShowDeleteModal(true)
                        }}
                        className="text-xs font-bold text-red-500 border border-red-500/30 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors uppercase tracking-wider"
                    >
                        Gerenciar Exclusão
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-deep-space border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6">
                                {/* Create a header with a close button */}
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <AlertTriangle className="text-red-500" size={24} />
                                        Excluir Dados
                                    </h2>
                                    <button onClick={() => setShowDeleteModal(false)} className="text-slate-500 hover:text-white">
                                        <X size={20} />
                                    </button>
                                </div>

                                {deleteStep === 'options' && (
                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-300">
                                            O que você deseja fazer? Selecione uma opção abaixo:
                                        </p>

                                        <button
                                            onClick={() => setDeleteStep('confirm_oracle')}
                                            className="w-full text-left p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-neon-purple/50 transition-all group"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-white group-hover:text-neon-purple">Deixar de ser Oraculista</span>
                                                <Sparkles size={16} className="text-slate-500 group-hover:text-neon-purple" />
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                Remove seu perfil profissional, avaliações e histórico de vendas. Você continua com acesso ao app como cliente.
                                            </p>
                                        </button>

                                        <button
                                            onClick={() => setDeleteStep('confirm_account')}
                                            className="w-full text-left p-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/50 transition-all group"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-red-400 group-hover:text-red-300">Excluir Conta Completamente</span>
                                                <User size={16} className="text-red-900 group-hover:text-red-500" />
                                            </div>
                                            <p className="text-xs text-red-300/70">
                                                Apaga TUDO: dados de cliente, oraculista, créditos e histórico. Irreversível.
                                            </p>
                                        </button>
                                    </div>
                                )}

                                {deleteStep === 'confirm_oracle' && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-neon-purple/10 border border-neon-purple/30 rounded-xl text-sm text-slate-200">
                                            <p className="font-bold text-neon-purple mb-2">Atenção!</p>
                                            Ao voltar a ser apenas cliente, você perderá sua fila de espera, avaliações e não poderá mais atender. Seus créditos de cliente e histórico de compras serão mantidos.
                                        </div>
                                        <div className="pt-4 flex flex-col gap-3">
                                            <button
                                                onClick={handleRevertToClient}
                                                disabled={deleteLoading}
                                                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                {deleteLoading ? <Loader2 className="animate-spin" /> : 'Confirmar: Quero ser apenas Cliente'}
                                            </button>
                                            <button onClick={() => setDeleteStep('options')} className="text-xs text-slate-500 hover:text-white py-2">Voltar</button>
                                        </div>
                                    </div>
                                )}

                                {deleteStep === 'confirm_account' && (
                                    <div className="space-y-4 text-center">
                                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                                            <h3 className="text-red-500 font-bold text-lg mb-2">PERDA TOTAL DE DADOS</h3>
                                            <p className="text-sm text-red-200 mb-4">
                                                Ao excluir sua conta, <span className="font-bold underline">seus Créditos NÃO SERÃO REEMBOLSADOS</span>. Você perderá acesso a tudo permanentemente.
                                            </p>
                                            <div className="text-left bg-black/40 p-3 rounded border border-red-900/50 text-xs text-red-300 font-mono">
                                                Esta ação não pode ser desfeita.
                                            </div>
                                        </div>

                                        <div className="pt-4 flex flex-col gap-3">
                                            <button
                                                onClick={handleDeleteAccount}
                                                disabled={deleteLoading}
                                                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-900/50 transition-all flex items-center justify-center gap-2"
                                            >
                                                {deleteLoading ? <Loader2 className="animate-spin" /> : 'Estou ciente. EXCLUIR TUDO.'}
                                            </button>
                                            <button onClick={() => setDeleteStep('options')} className="text-xs text-slate-500 hover:text-white py-2">Cancelar e Voltar</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    )
}
