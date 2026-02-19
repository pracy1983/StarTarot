'use client'

import React, { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowInput } from '@/components/ui/GlowInput'
import { NeonButton } from '@/components/ui/NeonButton'
import { User, Mail, Camera, Wallet, Phone, Calendar, Clock, MapPin, FileText, AlertTriangle, X, Scissors, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Cropper from 'react-easy-crop'

export default function PerfilPage() {
    const { profile, setProfile, logout } = useAuthStore()
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [formData, setFormData] = useState({
        phone: profile?.phone || '',
        birth_date: profile?.birth_date || '',
        birth_time: profile?.birth_time || '',
        birth_place: profile?.birth_place || '',
        cpf: profile?.cpf || '',
        zip_code: profile?.zip_code || '',
        address: profile?.address || '',
        address_number: profile?.address_number || '',
        address_complement: profile?.address_complement || '',
        neighborhood: profile?.neighborhood || '',
        city: profile?.city || '',
        state: profile?.state || ''
    })

    // Avatar Crop States
    const [imageSource, setImageSource] = useState<string | null>(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
    const [showCropModal, setShowCropModal] = useState(false)

    const handleCepLookup = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, '')
        if (cleanCep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
                const data = await res.json()
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        zip_code: cep,
                        address: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf
                    }))
                }
            } catch (err) {
                console.error('Error lookup CEP:', err)
            }
        }
    }

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
            toast.success('Perfil atualizado com sucesso!')
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

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Meu <span className="neon-text-purple">Perfil</span></h1>
                <p className="text-slate-400">Gerencie sua identidade estelar e preferências.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Avatar Sidebar */}
                <div className="space-y-6">
                    <GlassCard className="text-center p-8 border-white/5">
                        <div className="relative inline-block group">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-neon-purple to-neon-cyan p-1">
                                <div className="w-full h-full rounded-full bg-deep-space overflow-hidden flex items-center justify-center relative">
                                    <img
                                        src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&size=128&background=0a0a1a&color=a855f7`}
                                        alt="Avatar"
                                        className={`w-full h-full object-cover transition-opacity ${saving ? 'opacity-50' : 'group-hover:opacity-75'}`}
                                    />
                                    {saving && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Loader2 size={24} className="text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <label
                                htmlFor="client-avatar-upload"
                                className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                            >
                                <Camera className="text-white" size={24} />
                                <input
                                    id="client-avatar-upload"
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
                        <h2 className="mt-4 text-xl font-bold text-white">{profile?.full_name}</h2>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">{profile?.role}</p>
                    </GlassCard>

                    <GlassCard glowColor="gold" className="border-white/5">
                        <div className="flex items-center space-x-3 text-neon-gold mb-3">
                            <Wallet size={18} />
                            <span className="text-sm font-bold uppercase tracking-wider">Sua Carteira</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white">{profile?.credits || 0} <span className="text-sm font-normal text-slate-500 italic">Créditos</span></h3>
                        <p className="text-xs text-slate-500 mt-2">Créditos ativos para consultas.</p>
                        <NeonButton variant="gold" fullWidth size="sm" className="mt-4" onClick={() => router.push('/app/carteira')}>Recarregar agora</NeonButton>
                    </GlassCard>
                </div>

                {/* Form Content */}
                <div className="md:col-span-2 space-y-6">
                    <GlassCard hover={false} className="border-white/5">
                        <form onSubmit={handleSave} className="space-y-6">
                            <GlowInput
                                label="Nome Completo"
                                icon={<User size={18} />}
                                defaultValue={profile?.full_name || ''}
                                readOnly
                            />
                            <GlowInput
                                label="E-mail de Acesso"
                                icon={<Mail size={18} />}
                                defaultValue={profile?.email || ''}
                                readOnly
                            />
                            <GlowInput
                                label="WhatsApp (para notificações)"
                                icon={<Phone size={18} />}
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="(11) 98765-4321"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
                                <GlowInput
                                    label="Data de Nascimento"
                                    type="date"
                                    icon={<Calendar size={18} />}
                                    value={formData.birth_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                                />
                                <GlowInput
                                    label="Hora"
                                    type="time"
                                    icon={<Clock size={18} />}
                                    value={formData.birth_time}
                                    onChange={(e) => setFormData(prev => ({ ...prev, birth_time: e.target.value }))}
                                />
                                <GlowInput
                                    label="Local de Nascimento"
                                    placeholder="Cidade, Estado"
                                    icon={<MapPin size={18} />}
                                    value={formData.birth_place}
                                    onChange={(e) => setFormData(prev => ({ ...prev, birth_place: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-6 pt-4 border-t border-white/5">
                                <h3 className="text-sm font-bold text-neon-gold flex items-center">
                                    <FileText size={16} className="mr-2" />
                                    DADOS DE FATURAMENTO
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <GlowInput
                                        label="CPF"
                                        placeholder="000.000.000-00"
                                        value={formData.cpf}
                                        onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                                    />
                                    <GlowInput
                                        label="CEP"
                                        placeholder="00000-000"
                                        value={formData.zip_code}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            setFormData(prev => ({ ...prev, zip_code: val }))
                                            if (val.length === 8 || val.length === 9) handleCepLookup(val)
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2">
                                        <GlowInput
                                            label="Endereço"
                                            value={formData.address}
                                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                        />
                                    </div>
                                    <GlowInput
                                        label="Número"
                                        value={formData.address_number}
                                        onChange={(e) => setFormData(prev => ({ ...prev, address_number: e.target.value }))}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <GlowInput
                                        label="Bairro"
                                        value={formData.neighborhood}
                                        onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                                    />
                                    <GlowInput
                                        label="Complemento"
                                        value={formData.address_complement}
                                        onChange={(e) => setFormData(prev => ({ ...prev, address_complement: e.target.value }))}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <GlowInput
                                        label="Cidade"
                                        value={formData.city}
                                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                    />
                                    <GlowInput
                                        label="Estado (UF)"
                                        value={formData.state}
                                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <NeonButton loading={saving} type="submit">Salvar Alterações</NeonButton>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            </div>

            <div className="pt-10 border-t border-white/5">
                <GlassCard className="border-red-500/20 bg-red-500/5 p-6 flex flex-col md:flex-row items-center justify-between gap-6" hover={false}>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">Zona de Perigo</h3>
                        <p className="text-sm text-slate-400">Ao deletar sua conta, todos os seus dados e créditos serão removidos permanentemente.</p>
                    </div>
                    <NeonButton variant="purple" className="bg-red-500 hover:bg-red-600 border-red-500" onClick={() => setShowDeleteModal(true)}>
                        Deletar Minha Conta
                    </NeonButton>
                </GlassCard>
            </div>

            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-md"
                        >
                            <GlassCard className="border-red-500/50 p-8" hover={false} glowColor="none">
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <AlertTriangle size={32} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">Tem certeza absoluta?</h2>
                                    <p className="text-slate-400 leading-relaxed">
                                        Esta ação é irreversível. <span className="text-white font-bold">Ao deletar a conta seus créditos não serão devolvidos, tem certeza?</span> Todos os seus dados e histórico serão apagados permanentemente.
                                    </p>

                                    <div className="flex flex-col gap-3 pt-6">
                                        <NeonButton
                                            variant="purple"
                                            fullWidth
                                            loading={deleteLoading}
                                            onClick={handleDeleteAccount}
                                            className="bg-red-500 hover:bg-red-600 border-red-500"
                                        >
                                            Sim, Deletar Permanentemente
                                        </NeonButton>
                                        <button
                                            onClick={() => setShowDeleteModal(false)}
                                            className="text-sm text-slate-500 hover:text-white transition-colors py-2"
                                        >
                                            Cancelar e Voltar
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
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
                                        loading={saving}
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
