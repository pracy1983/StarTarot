'use client'

import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Users, Search, Edit2, Trash2, Wallet, Phone, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { GlowInput } from '@/components/ui/GlowInput'
import { NeonButton } from '@/components/ui/NeonButton'
import { motion, AnimatePresence } from 'framer-motion'

export default function AdminMembrosPage() {
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [editingMember, setEditingMember] = useState<any>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchMembers()
    }, [])

    const fetchMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'client')
                .order('created_at', { ascending: false })

            if (error) throw error

            // Buscar saldos das carteiras
            const { data: wallets } = await supabase
                .from('wallets')
                .select('*')

            const membersWithCredits = data?.map(m => ({
                ...m,
                credits: wallets?.find(w => w.user_id === m.id)?.balance || 0
            }))

            setMembers(membersWithCredits || [])
        } catch (err: any) {
            console.error('Erro ao buscar membros:', err)
            toast.error('Erro ao carregar lista de membros')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateMember = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editingMember.full_name,
                    phone: editingMember.phone
                })
                .eq('id', editingMember.id)

            if (error) throw error

            toast.success('Informações atualizadas!')
            setEditingMember(null)
            fetchMembers()
        } catch (err: any) {
            toast.error('Erro ao salvar: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const filteredMembers = members.filter(m =>
        m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone?.includes(searchTerm)
    )

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Gestão de <span className="neon-text-cyan">Membros</span></h1>
                    <p className="text-slate-400">Gerencie os clientes e seus saldos de créditos.</p>
                </div>
            </div>

            <div className="relative group max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-neon-cyan transition-colors" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por nome, email ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm text-white focus:border-neon-cyan/50 outline-none transition-all"
                />
            </div>

            <GlassCard className="border-white/5 p-0 overflow-hidden" hover={false}>
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center space-y-4">
                        <div className="w-10 h-10 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-500 animate-pulse uppercase tracking-widest text-xs font-bold">Resgatando Membros...</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Membro</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Contato</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Saldo</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredMembers.map((m) => (
                                <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-deep-space ring-2 ring-white/5">
                                                <img src={m.avatar_url || `https://ui-avatars.com/api/?name=${m.full_name}&background=12122a&color=06b6d4`} className="w-full h-full object-cover" alt={m.full_name} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{m.full_name}</p>
                                                <p className="text-[10px] text-slate-500 font-mono">{m.id.substring(0, 8)}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center text-xs text-slate-400">
                                                <Mail size={12} className="mr-2 opacity-50" /> {m.email}
                                            </div>
                                            <div className="flex items-center text-xs text-slate-400">
                                                <Phone size={12} className="mr-2 opacity-50" /> {m.phone || 'N/A'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center text-neon-gold font-bold">
                                            <Wallet size={14} className="mr-2" />
                                            {m.credits} Créditos
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setEditingMember(m)}
                                            className="p-2 text-slate-400 hover:text-neon-cyan transition-colors rounded-lg hover:bg-white/5"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </GlassCard>

            {/* Modal de Edição */}
            <AnimatePresence>
                {editingMember && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-md"
                        >
                            <GlassCard glowColor="cyan" className="p-8">
                                <h2 className="text-2xl font-bold text-white mb-6">Editar Membro</h2>
                                <form onSubmit={handleUpdateMember} className="space-y-6">
                                    <GlowInput
                                        label="Nome Completo"
                                        value={editingMember.full_name}
                                        onChange={e => setEditingMember({ ...editingMember, full_name: e.target.value })}
                                        required
                                    />
                                    <GlowInput
                                        label="Telefone WhatsApp"
                                        value={editingMember.phone || ''}
                                        onChange={e => setEditingMember({ ...editingMember, phone: e.target.value })}
                                    />
                                    <div className="pt-4 flex gap-4">
                                        <NeonButton variant="purple" fullWidth type="submit" loading={saving}>
                                            Salvar Alterações
                                        </NeonButton>
                                        <button
                                            type="button"
                                            onClick={() => setEditingMember(null)}
                                            className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-all font-bold"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            </GlassCard>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
