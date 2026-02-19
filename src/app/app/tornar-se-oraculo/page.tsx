'use client'

import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Sparkles, Send, User, Book, MessageSquare, Info, Star, Layers, BookOpen, Camera, Scissors, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { GlowInput } from '@/components/ui/GlowInput'
import { motion, AnimatePresence } from 'framer-motion'
import Cropper from 'react-easy-crop'

export default function OracleSignupPage() {
    const { profile, setProfile } = useAuthStore()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [categoriesList, setCategoriesList] = useState<any[]>([])
    const [topicsList, setTopicsList] = useState<any[]>([])

    // Avatar Crop States
    const [imageSource, setImageSource] = useState<string | null>(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
    const [showCropModal, setShowCropModal] = useState(false)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

    const [formData, setFormData] = useState({
        full_name: profile?.full_name || '',
        name_fantasy: profile?.name_fantasy || '',
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
                supabase.from('oracle_categories').select('*').eq('active', true).order('name'),
                supabase.from('oracle_specialties').select('*').eq('active', true).order('name')
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
                p_name_fantasy: formData.name_fantasy,
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
        setUploadingPhoto(true)
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
            toast.success('Foto profissional atualizada!')
        } catch (error: any) {
            console.error('Error uploading avatar:', error)
            toast.error('Erro no upload: ' + error.message)
        } finally {
            setUploadingPhoto(false)
            setShowCropModal(false)
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
                        {/* Seção 0: Foto Profissional */}
                        <div className="flex flex-col items-center space-y-4 pb-4 border-b border-white/5">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-neon-purple to-neon-gold p-1 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                                    <div className="w-full h-full rounded-full bg-deep-space overflow-hidden flex items-center justify-center relative">
                                        <img
                                            src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${formData.full_name || profile?.full_name}&size=128&background=0a0a1a&color=a855f7`}
                                            alt="Avatar"
                                            className={`w-full h-full object-cover transition-opacity ${uploadingPhoto ? 'opacity-50' : 'group-hover:opacity-75'}`}
                                        />
                                        {uploadingPhoto && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Loader2 size={32} className="text-white animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <label
                                    htmlFor="oracle-avatar-upload"
                                    className="absolute bottom-0 right-0 p-3 bg-neon-purple text-white rounded-full shadow-xl hover:scale-110 transition-transform cursor-pointer border-2 border-deep-space"
                                >
                                    <Camera size={18} />
                                    <input
                                        id="oracle-avatar-upload"
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
                            <div className="text-center">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Sua Foto Profissional *</h3>
                                <p className="text-[10px] text-slate-500 mt-1">Essa foto será exibida no marketplace após aprovação.</p>
                            </div>
                        </div>

                        {/* Seção 1: Identificação */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 flex items-center">
                                    <User size={16} className="mr-2 text-neon-purple" />
                                    Nome Real (Interno) *
                                </label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full bg-deep-space border border-white/10 rounded-xl p-4 text-white focus:border-neon-purple/50 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="Seu nome completo para o Templo"
                                    required
                                />
                                <p className="text-[10px] text-slate-500">Apenas para uso interno e pagamentos.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 flex items-center">
                                    <Sparkles size={16} className="mr-2 text-neon-gold" />
                                    Nome de Exibição (Público) *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name_fantasy}
                                    onChange={e => setFormData({ ...formData, name_fantasy: e.target.value })}
                                    className="w-full bg-deep-space border border-white/10 rounded-xl p-4 text-white focus:border-neon-gold/50 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="Ex: Oraculista Luna"
                                    required
                                />
                                <p className="text-[10px] text-slate-500">Como você será visto no site.</p>
                            </div>

                            <div className="space-y-2 md:col-span-2">
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
                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-purple"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowCropModal(false)}
                                        className="flex-1 py-3 px-6 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <NeonButton
                                        loading={uploadingPhoto}
                                        onClick={async () => {
                                            if (croppedAreaPixels && imageSource) {
                                                const blob = await getCroppedImg(imageSource, croppedAreaPixels)
                                                if (blob) handleUploadAvatar(blob)
                                            }
                                        }}
                                        className="flex-1"
                                    >
                                        Salvar Foto
                                    </NeonButton>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
