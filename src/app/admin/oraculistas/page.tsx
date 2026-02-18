'use client'

import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Users, Plus, Search, Edit2, Trash2, Brain, User, Check, X, Star, Eye, Ban } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { getOracleStatus } from '@/lib/status'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'

const StatusBadge = ({ status }: { status?: string }) => {
    switch (status) {
        case 'approved':
            return <span className="text-[10px] bg-green-500/20 text-green-500 border border-green-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Aprovado</span>
        case 'pending':
            return <span className="text-[10px] bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">Pendente</span>
        case 'waitlist':
            return <span className="text-[10px] bg-orange-500/20 text-orange-500 border border-orange-500/30 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">Waitlist</span>
        case 'rejected':
            return <span className="text-[10px] bg-red-500/20 text-red-500 border border-red-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Rejeitado</span>
        default:
            return <span className="text-[10px] bg-slate-500/20 text-slate-500 border border-slate-500/30 px-2 py-0.5 rounded-full font-bold uppercase">N/A</span>
    }
}

export default function AdminOraculistasPage() {
    const router = useRouter()
    const [oraculistas, setOraculistas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isAddingCategory, setIsAddingCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [loadingCategory, setLoadingCategory] = useState(false)
    const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('pending')
    const [rejectionModal, setRejectionModal] = useState<{ open: boolean, id: string | null, name: string }>({ open: false, id: null, name: '' })
    const [rejectionMessage, setRejectionMessage] = useState('')
    const [isProcessingStatus, setIsProcessingStatus] = useState(false)

    useEffect(() => {
        fetchOracles()
    }, [])

    const fetchOracles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .or('role.in.(oracle,owner),application_status.in.(pending,waitlist,approved,rejected)')
                .order('full_name', { ascending: true })

            if (error) throw error

            // Fetch unread gifts count for each oracle
            const { data: giftCounts, error: gError } = await supabase
                .from('gifts')
                .select('receiver_id, name, credits, profiles!sender_id(full_name)')
                .eq('is_seen_by_admin', false)

            const oracleWithGifts = data.map(o => {
                const unreadGifts = giftCounts?.filter(g => g.receiver_id === o.id) || []
                return {
                    ...o,
                    unread_gifts: unreadGifts
                }
            })

            setOraculistas(oracleWithGifts || [])
        } catch (err: any) {
            console.error('Erro ao buscar oraculistas:', err)
            toast.error('Erro ao carregar lista de guias')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Deseja realmente remover a manifestação de ${name}?`)) return

        // Optimistic: remove da lista imediatamente
        setOraculistas(prev => prev.filter(o => o.id !== id))

        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id)

            if (error) {
                // Se falhou, restaura a lista
                fetchOracles()
                throw error
            }
            toast.success(`${name} removido com sucesso`)
        } catch (err: any) {
            toast.error('Erro ao excluir: ' + err.message)
        }
    }

    const handleStatusChange = async (id: string, newStatus: string, message?: string) => {
        setIsProcessingStatus(true)
        try {
            const updates: any = { application_status: newStatus }
            if (newStatus === 'rejected') {
                // Determine current profile state to save as snapshot
                const currentProfile = oraculistas.find(o => o.id === id)
                if (currentProfile) {
                    const { error: snapError } = await supabase.from('profile_snapshots').insert({
                        user_id: id,
                        data: currentProfile,
                        reason: message,
                        admin_id: (await supabase.auth.getUser()).data.user?.id
                    })
                    if (snapError) console.error('Error creating snapshot:', snapError)
                }

                updates.rejection_reason = message
            } else if (newStatus === 'approved') {
                updates.role = 'oracle'
                // Clear rejection reason if approved
                updates.rejection_reason = null
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', id)

            if (error) throw error

            // If rejected, send a system message
            if (newStatus === 'rejected' && message) {
                await supabase.from('notifications').insert({
                    user_id: id,
                    title: 'Atenção: Ação Necessária no Seu Perfil',
                    content: message,
                    type: 'system',
                    role: 'oracle'
                })
            }

            setOraculistas(prev => prev.map(o =>
                o.id === id ? { ...o, ...updates } : o
            ))

            toast.success(`Status atualizado para: ${newStatus === 'approved' ? 'Aprovado' : 'Rejeitado/Pausado'}`)
            setRejectionModal({ open: false, id: null, name: '' })
            setRejectionMessage('')
        } catch (err: any) {
            console.error('Erro ao atualizar status:', err)
            toast.error('Erro ao atualizar status')
        } finally {
            setIsProcessingStatus(false)
        }
    }

    const [comparisonModal, setComparisonModal] = useState<{ open: boolean, current: any, snapshot: any }>({ open: false, current: null, snapshot: null })
    const [loadingSnapshot, setLoadingSnapshot] = useState(false)

    const handleViewChanges = async (oracleId: string) => {
        setLoadingSnapshot(true)
        try {
            // Get latest snapshot
            const { data, error } = await supabase
                .from('profile_snapshots')
                .select('*')
                .eq('user_id', oracleId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (error) throw error

            const current = oraculistas.find(o => o.id === oracleId)
            setComparisonModal({
                open: true,
                current,
                snapshot: data.data // The JSON data stored
            })
        } catch (err) {
            console.error('Error fetching snapshot:', err)
            toast.error('Não foi possível carregar o histórico de alterações.')
        } finally {
            setLoadingSnapshot(false)
        }
    }

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return
        setLoadingCategory(true)
        try {
            const slug = newCategoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
            const { error } = await supabase.from('specialties').insert({
                name: newCategoryName,
                slug,
                active: true
            })

            if (error) throw error
            toast.success('Categoria adicionada com sucesso!')
            setNewCategoryName('')
            setIsAddingCategory(false)
        } catch (err: any) {
            toast.error('Erro ao adicionar categoria: ' + err.message)
        } finally {
            setLoadingCategory(false)
        }
    }

    const filteredOracles = oraculistas.filter(o => {
        const matchesSearch = o.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.specialty?.toLowerCase().includes(searchTerm.toLowerCase())

        if (activeTab === 'pending') {
            return matchesSearch && (o.application_status === 'pending' || o.application_status === 'waitlist' || o.application_status === 'rejected')
        }
        return matchesSearch && (o.application_status === 'approved' || !o.application_status || o.application_status === 'none')
    })

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Gestão de <span className="neon-text-purple">Oraculistas</span></h1>
                    <p className="text-slate-400">Adicione, edite ou gerencie os guias do seu marketplace.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsAddingCategory(true)}
                        className="flex items-center px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-white/10 transition-all"
                    >
                        <Plus size={20} className="mr-2 text-neon-gold" /> Nova Categoria
                    </button>
                    <button
                        onClick={() => router.push('/admin/oraculistas/novo')}
                        className="flex items-center px-6 py-2.5 bg-neon-purple rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] text-white font-bold hover:scale-105 transition-all"
                    >
                        <Plus size={20} className="mr-2" /> Novo Oraculista
                    </button>
                </div>
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
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-400 ml-1">Nome da Categoria</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Baralho Cigano"
                                            value={newCategoryName}
                                            onChange={e => setNewCategoryName(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white outline-none focus:border-neon-gold/50 transition-all"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setIsAddingCategory(false)}
                                            className="flex-1 px-4 py-2 border border-white/10 rounded-xl text-slate-400 font-bold hover:bg-white/5 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleAddCategory}
                                            disabled={loadingCategory || !newCategoryName.trim()}
                                            className="flex-1 px-4 py-2 bg-neon-gold text-deep-space rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50"
                                        >
                                            {loadingCategory ? '...' : 'Adicionar'}
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Comparison Modal */}
            <AnimatePresence>
                {comparisonModal.open && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-[#0f172a] rounded-2xl border border-white/10"
                        >
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="text-xl font-bold text-white">Comparação de Alterações</h3>
                                <button
                                    onClick={() => setComparisonModal({ open: false, current: null, snapshot: null })}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-8">
                                {/* Previous State */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-red-400 uppercase tracking-wider text-xs border-b border-red-500/20 pb-2">Antes (Pausado)</h4>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Nome</label>
                                            <p className="text-slate-300">{comparisonModal.snapshot?.full_name}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Bio</label>
                                            <p className="text-slate-300 text-sm whitespace-pre-wrap">{comparisonModal.snapshot?.bio}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Especialidade</label>
                                            <p className="text-slate-300">{comparisonModal.snapshot?.specialty}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Preço / Min</label>
                                            <p className="text-slate-300">{comparisonModal.snapshot?.credits_per_minute}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Current State */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-green-400 uppercase tracking-wider text-xs border-b border-green-500/20 pb-2">Agora (Atual)</h4>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Nome</label>
                                            <p className={`text-white ${comparisonModal.current?.full_name !== comparisonModal.snapshot?.full_name ? 'text-green-400 font-bold' : ''}`}>
                                                {comparisonModal.current?.full_name}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Bio</label>
                                            <p className={`text-slate-300 text-sm whitespace-pre-wrap ${comparisonModal.current?.bio !== comparisonModal.snapshot?.bio ? 'text-green-300 bg-green-500/10 p-2 rounded' : ''}`}>
                                                {comparisonModal.current?.bio}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Especialidade</label>
                                            <p className={`text-slate-300 ${comparisonModal.current?.specialty !== comparisonModal.snapshot?.specialty ? 'text-green-400 font-bold' : ''}`}>
                                                {comparisonModal.current?.specialty}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase">Preço / Min</label>
                                            <p className={`text-slate-300 ${comparisonModal.current?.credits_per_minute !== comparisonModal.snapshot?.credits_per_minute ? 'text-green-400 font-bold' : ''}`}>
                                                {comparisonModal.current?.credits_per_minute}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
                                <button
                                    onClick={() => setComparisonModal({ open: false, current: null, snapshot: null })}
                                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                                >
                                    Fechar Comparação
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mr-4">
                    <button
                        onClick={() => setActiveTab('approved')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'approved' ? 'bg-neon-purple text-white' : 'text-slate-500 hover:text-white'}`}
                    >
                        Ativos/Aprovados
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all relative ${activeTab === 'pending' ? 'bg-neon-gold text-deep-space' : 'text-slate-500 hover:text-white'}`}
                    >
                        Pendentes/Ajustes
                        {oraculistas.filter(o => o.application_status === 'pending' || o.application_status === 'waitlist' || o.application_status === 'rejected').length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full animate-pulse">
                                {oraculistas.filter(o => o.application_status === 'pending' || o.application_status === 'waitlist' || o.application_status === 'rejected').length}
                            </span>
                        )}
                    </button>
                </div>
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-neon-purple transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou especialidade..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm text-white focus:border-neon-purple/50 outline-none transition-all"
                    />
                </div>
            </div>

            <GlassCard className="border-white/5 p-0 overflow-hidden" hover={false}>
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center space-y-4">
                        <div className="w-10 h-10 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-500 animate-pulse uppercase tracking-widest text-xs font-bold">Conectando ao Templo...</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Oraculista</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Especialidade</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status App</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status Online</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredOracles.map((o) => (
                                <tr key={o.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-deep-space">
                                                {o.avatar_url ? (
                                                    <img src={o.avatar_url} className="w-full h-full object-cover" alt={o.full_name} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-neon-purple font-bold">
                                                        {o.full_name?.[0]}
                                                    </div>
                                                )}
                                            </div>
                                            {o.unread_gifts?.length > 0 && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute -top-1 -right-1 bg-neon-gold text-deep-space rounded-full p-1 shadow-[0_0_10px_rgba(251,191,36,0.5)] z-10"
                                                    title={`Recebeu ${o.unread_gifts.length} presente(s): ${o.unread_gifts.map((g: any) => `${g.name} (${g.profiles?.full_name})`).join(', ')}`}
                                                >
                                                    <Star size={10} fill="currentColor" />
                                                </motion.div>
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-white">{o.full_name}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${o.is_ai ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'}`}>
                                            {o.is_ai ? 'IA' : 'Humano'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">{o.specialty}</td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={o.application_status} />
                                        {/* Show reason tooltip if rejected/pending with reason */}
                                        {(o.application_status === 'rejected' || (o.application_status === 'pending' && o.rejection_reason)) && (
                                            <div className="text-[10px] text-slate-500 mt-1 max-w-[150px] truncate" title={o.rejection_reason}>
                                                {o.rejection_reason}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {(() => {
                                            const { status } = getOracleStatus(o.is_online, o.schedules || [], o.last_heartbeat_at, o.is_ai || o.oracle_type === 'ai')
                                            const isOnline = status === 'online'
                                            const isVideoAvailable = !o.is_ai && o.allows_video
                                            const isMessageAvailable = o.allows_text

                                            return (
                                                <div className="flex flex-col space-y-1.5">
                                                    <div className="flex items-center space-x-1.5">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline && isVideoAvailable ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
                                                        <span className={`text-[10px] font-medium ${isOnline && isVideoAvailable ? 'text-green-500' : 'text-slate-500'}`}>
                                                            Vídeo: {isOnline && isVideoAvailable ? 'Disponível' : (isVideoAvailable ? 'Offline' : 'N/A')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-1.5">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline && isMessageAvailable ? 'bg-neon-purple animate-pulse' : 'bg-slate-600'}`} />
                                                        <span className={`text-[10px] font-medium ${isOnline && isMessageAvailable ? 'text-neon-purple' : 'text-slate-500'}`}>
                                                            Chat: {isOnline && isMessageAvailable ? 'Disponível' : (isMessageAvailable ? 'Offline' : 'N/A')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Common Action: View Profile */}
                                            <Link
                                                href={`/app/oraculo/${o.id}`}
                                                target="_blank"
                                                className="flex items-center space-x-1 px-2 py-1.5 text-neon-cyan hover:bg-neon-cyan/10 rounded-lg transition-all border border-transparent hover:border-neon-cyan/30"
                                                title="Visualizar Perfil Público"
                                            >
                                                <Eye size={14} />
                                                <span className="text-[10px] font-bold uppercase">Ver</span>
                                            </Link>

                                            {/* Tab Specific Actions */}
                                            {activeTab === 'pending' ? (
                                                <>
                                                    {/* Show "Ver Alterações" if the user has been rejected before (has notification/snapshot history) */}
                                                    {o.rejection_reason && (
                                                        <button
                                                            onClick={() => handleViewChanges(o.id)}
                                                            className="flex items-center space-x-1 px-2 py-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all border border-transparent hover:border-blue-400/30"
                                                            title="Ver Alterações Recentes"
                                                        >
                                                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
                                                            <span className="text-[10px] font-bold uppercase">Changes</span>
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleStatusChange(o.id, 'approved')}
                                                        className="flex items-center space-x-1 px-2 py-1.5 text-green-400 hover:bg-green-400/10 rounded-lg transition-all border border-transparent hover:border-green-400/30"
                                                        title="Aprovar Cadastro"
                                                    >
                                                        <Check size={14} />
                                                        <span className="text-[10px] font-bold uppercase">Aprovar</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setRejectionModal({ open: true, id: o.id, name: o.full_name })}
                                                        className="flex items-center space-x-1 px-2 py-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-all border border-transparent hover:border-red-400/30"
                                                        title="Rejeitar Solicitação"
                                                    >
                                                        <X size={14} />
                                                        <span className="text-[10px] font-bold uppercase">Rejeitar</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <Link
                                                        href={`/admin/oraculistas/editar/${o.id}`}
                                                        className="flex items-center space-x-1 px-2 py-1.5 text-slate-300 hover:bg-white/10 rounded-lg transition-all border border-transparent hover:border-white/20"
                                                        title="Editar dados e prompts"
                                                    >
                                                        <Edit2 size={14} />
                                                        <span className="text-[10px] font-bold uppercase">Editar</span>
                                                    </Link>

                                                    <button
                                                        onClick={() => setRejectionModal({ open: true, id: o.id, name: o.full_name })}
                                                        className="flex items-center space-x-1 px-2 py-1.5 text-orange-400 hover:bg-orange-400/10 rounded-lg transition-all border border-transparent hover:border-orange-400/30"
                                                        title="Pausar e Solicitar Correções"
                                                    >
                                                        <Ban size={14} />
                                                        <span className="text-[10px] font-bold uppercase">Pausar</span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleDelete(o.id, o.full_name)}
                                                        className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                        title="Remover permanentemente"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </GlassCard>

            {/* Rejection Modal */}
            <AnimatePresence>
                {rejectionModal.open && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-md"
                        >
                            <GlassCard className="border-red-500/30" hover={false}>
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white">Pausar / Solicitar Ajustes</h3>
                                    <p className="text-sm text-slate-400">Informe ao oraculista <span className="text-white font-bold">{rejectionModal.name}</span> o motivo da pausa/rejeição. Ele deverá corrigir os pontos citados e reenviar a candidatura.</p>

                                    <textarea
                                        value={rejectionMessage}
                                        onChange={(e) => setRejectionMessage(e.target.value)}
                                        placeholder="Ex: Sua foto de perfil não está clara. Por favor, atualize."
                                        className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-slate-600 focus:border-red-500/50 outline-none transition-all resize-none text-sm"
                                    />

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => setRejectionModal({ open: false, id: null, name: '' })}
                                            className="flex-1 px-4 py-2 border border-white/10 rounded-xl text-slate-400 font-bold hover:bg-white/5 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(rejectionModal.id!, 'rejected', rejectionMessage)}
                                            disabled={isProcessingStatus || !rejectionMessage.trim()}
                                            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all disabled:opacity-50"
                                        >
                                            {isProcessingStatus ? 'Processando...' : 'Confirmar Pausa'}
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
