'use client'

import React, { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowInput } from '@/components/ui/GlowInput'
import { NeonButton } from '@/components/ui/NeonButton'
import { User, Mail, Camera, Wallet, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function PerfilPage() {
    const { profile, setProfile } = useAuthStore()
    const [phone, setPhone] = useState(profile?.phone || '')
    const [saving, setSaving] = useState(false)

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ phone })
                .eq('id', profile!.id)

            if (error) throw error

            setProfile({ ...profile!, phone })
            toast.success('Perfil atualizado com sucesso!')
        } catch (err: any) {
            console.error('Error updating profile:', err)
            toast.error('Erro ao salvar: ' + err.message)
        } finally {
            setSaving(false)
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
                        <div className="relative inline-block group cursor-pointer">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-neon-purple to-neon-cyan p-1">
                                <div className="w-full h-full rounded-full bg-deep-space overflow-hidden flex items-center justify-center">
                                    <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&size=128&background=0a0a1a&color=a855f7`} alt="Avatar" />
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Camera className="text-white" size={24} />
                            </div>
                        </div>
                        <h2 className="mt-4 text-xl font-bold text-white">{profile?.full_name}</h2>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">{profile?.role}</p>
                    </GlassCard>

                    <GlassCard glowColor="gold" className="border-white/5">
                        <div className="flex items-center space-x-3 text-neon-gold mb-3">
                            <Wallet size={18} />
                            <span className="text-sm font-bold uppercase tracking-wider">Sua Carteira</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white">{profile?.credits || 0} <span className="text-sm font-normal text-slate-500 italic">CR</span></h3>
                        <p className="text-xs text-slate-500 mt-2">Créditos ativos para consultas.</p>
                        <NeonButton variant="gold" fullWidth size="sm" className="mt-4">Recarregar agora</NeonButton>
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
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="(11) 98765-4321"
                            />

                            <div className="pt-4 border-t border-white/5">
                                <NeonButton loading={saving} type="submit">Salvar Alterações</NeonButton>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
