'use client'

import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowInput } from '@/components/ui/GlowInput'
import { NeonButton } from '@/components/ui/NeonButton'
import { Users, Plus, Search, Edit2, Trash2, Brain, User, Check, X, Star, Eye, Ban, Tag, MessageSquare, History, RefreshCw, Layers, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { getOracleStatus } from '@/lib/status'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'

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
    const searchParams = useSearchParams()
    const initialTab = (searchParams.get('tab') as 'human' | 'ai' | 'pending') || 'human'

    const [oraculistas, setOraculistas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isAddingCategory, setIsAddingCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [loadingCategory, setLoadingCategory] = useState(false)
    const [activeTab, setActiveTab] = useState<'human' | 'ai' | 'pending'>(initialTab)
    const [rejectionModal, setRejectionModal] = useState<{ open: boolean, id: string | null, name: string }>({ open: false, id: null, name: '' })
    const [rejectionMessage, setRejectionMessage] = useState('')
    const [isProcessingStatus, setIsProcessingStatus] = useState(false)
    const [isDeletingPending, setIsDeletingPending] = useState<string | null>(null)

    // Specialties & Categories Management
    const [isManagingSpecialties, setIsManagingSpecialties] = useState(false)
    const [activeManageTab, setActiveManageTab] = useState<'specialties' | 'categories'>('categories')
    const [specialties, setSpecialties] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [editingItem, setEditingItem] = useState<any>(null)
    const [itemName, setItemName] = useState('')
    const [isDeletingItem, setIsDeletingItem] = useState(false)

    // Reviews Management
    const [reviewsModal, setReviewsModal] = useState<{ open: boolean, oracleId: string | null, name: string }>({ open: false, oracleId: null, name: '' })
    const [oracleReviews, setOracleReviews] = useState<any[]>([])
    const [loadingReviews, setLoadingReviews] = useState(false)

    useEffect(() => {
        fetchOracles()
        fetchSpecialties()
    }, [])

    const fetchSpecialties = async () => {
        const [specRes, catRes] = await Promise.all([
            supabase.from('oracle_specialties').select('*').order('name', { ascending: true }),
            supabase.from('oracle_categories').select('*').order('name', { ascending: true })
        ])

        if (specRes.data) setSpecialties(specRes.data)
        if (catRes.data) setCategories(catRes.data)
    }

    // Sync tab with URL
    const handleTabChange = (tab: 'human' | 'ai' | 'pending') => {
        setActiveTab(tab)
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tab)
        router.replace(`/admin/oraculistas?${params.toString()}`, { scroll: false })
    }

    const fetchOracles = async () => {
        try {
            // Updated query to be more strict about roles
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .in('role', ['oracle', 'owner'])
                .order('full_name', { ascending: true })

            if (error) throw error

            const { data: giftCounts, error: gError } = await supabase
                .from('gifts')
                .select('receiver_id, name, credits, profiles!sender_id(full_name)')
                .eq('is_seen_by_admin', false)

            const profilesWithGifts = data.map(o => {
                const unreadGifts = giftCounts?.filter(g => g.receiver_id === o.id) || []
                return {
                    ...o,
                    unread_gifts: unreadGifts
                }
            })

            // Secondary sorting for Pending tab: First-In First-Out (created_at ASC)
            // For other tabs, we can keep the default full_name or name_fantasy sort
            const sorted = profilesWithGifts.sort((a, b) => {
                if (activeTab === 'pending') {
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                }
                const nameA = a.name_fantasy || a.full_name || ''
                const nameB = b.name_fantasy || b.full_name || ''
                return nameA.localeCompare(nameB)
            })

            setOraculistas(sorted)
        } catch (err: any) {
            console.error('Erro ao buscar oraculistas:', err)
            toast.error('Erro ao carregar lista de guias')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Deseja realmente remover a manifestação de ${name}?`)) return

        setOraculistas(prev => prev.filter(o => o.id !== id))

        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id)

            if (error) {
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
            const updates: any = {
                application_status: newStatus,
                has_unseen_changes: false  // Admin reviu → limpa a bolinha
            }
            if (newStatus === 'rejected') {
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
                updates.rejection_reason = null
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', id)

            if (error) throw error

            // Notificação in-app para o oraculista apenas quando for REJEITADO com mensagem
            // (sem push/WA - o oraculista verá no inbox da plataforma)
            if (newStatus === 'rejected' && message) {
                await supabase.from('inbox_messages').insert({
                    recipient_id: id,
                    title: '⚠️ Ação Necessária no Seu Perfil',
                    content: message,
                    metadata: { type: 'profile_review' }
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

    const handleDeletePendingUser = async (id: string, name: string) => {
        if (!confirm(`Deletar PERMANENTEMENTE o cadastro de ${name}? Esta ação remove o usuário do banco de dados e do sistema de autenticação.`)) return

        setIsDeletingPending(id)
        try {
            const res = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: id })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao deletar usuário')

            setOraculistas(prev => prev.filter(o => o.id !== id))
            toast.success(`${name} deletado permanentemente`)
        } catch (err: any) {
            toast.error('Erro ao deletar: ' + err.message)
        } finally {
            setIsDeletingPending(null)
        }
    }

    const [comparisonModal, setComparisonModal] = useState<{ open: boolean, current: any, snapshot: any }>({ open: false, current: null, snapshot: null })
    const [loadingSnapshot, setLoadingSnapshot] = useState(false)

    const handleViewChanges = async (oracleId: string) => {
        setLoadingSnapshot(true)
        try {
            const { data, error } = await supabase
                .from('profile_snapshots')
                .select('*')
                .eq('user_id', oracleId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error) throw error

            if (!data) {
                toast.error('Nenhum histórico de alterações encontrado (registo anterior ao sistema de logs ou sem rejeições prévias).')
                setComparisonModal({ open: false, current: null, snapshot: null })
                return
            }

            const current = oraculistas.find(o => o.id === oracleId)
            setComparisonModal({
                open: true,
                current,
                snapshot: data.data
            })
        } catch (err) {
            console.error('Error fetching snapshot:', err)
            toast.error('Não foi possível carregar o histórico de alterações.')
        } finally {
            setLoadingSnapshot(false)
        }
    }

    const handleSaveItem = async () => {
        if (!itemName.trim()) return
        setLoadingCategory(true)
        const table = activeManageTab === 'categories' ? 'oracle_categories' : 'oracle_specialties'

        try {
            const slug = itemName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')

            if (editingItem) {
                // Update
                const { error } = await supabase
                    .from(table)
                    .update({ name: itemName, slug })
                    .eq('id', editingItem.id)
                if (error) throw error
                toast.success('Item atualizado!')
            } else {
                // Insert
                const { error } = await supabase.from(table).insert({
                    name: itemName,
                    slug,
                    active: true
                })
                if (error) throw error
                toast.success('Item adicionado!')
            }

            setItemName('')
            setEditingItem(null)
            fetchSpecialties()
        } catch (err: any) {
            toast.error('Erro ao salvar: ' + err.message)
        } finally {
            setLoadingCategory(false)
        }
    }

    const handleDeleteItem = async (id: string, name: string) => {
        const label = activeManageTab === 'categories' ? 'categoria' : 'especialidade'
        if (!confirm(`Deseja realmente excluir a ${label} "${name}"?`)) return

        setIsDeletingItem(true)
        const table = activeManageTab === 'categories' ? 'oracle_categories' : 'oracle_specialties'

        try {
            const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError

            toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} excluída com sucesso.`)
            fetchSpecialties()
        } catch (err: any) {
            toast.error('Erro ao excluir: ' + err.message)
        } finally {
            setIsDeletingItem(false)
        }
    }

    const fetchOracleReviews = async (oracleId: string, name: string) => {
        setLoadingReviews(true)
        setReviewsModal({ open: true, oracleId, name })
        try {
            const { data, error } = await supabase
                .from('ratings')
                .select('*, client:client_id(full_name, avatar_url)')
                .eq('oracle_id', oracleId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setOracleReviews(data || [])
        } catch (err) {
            console.error('Error fetching reviews:', err)
            toast.error('Erro ao carregar avaliações')
        } finally {
            setLoadingReviews(false)
        }
    }

    const handleDeleteReview = async (reviewId: string) => {
        if (!confirm('Deseja realmente excluir esta avaliação?')) return
        try {
            const { error } = await supabase
                .from('ratings')
                .delete()
                .eq('id', reviewId)

            if (error) throw error
            setOracleReviews(prev => prev.filter(r => r.id !== reviewId))
            toast.success('Avaliação excluída')
        } catch (err) {
            console.error('Error deleting review:', err)
            toast.error('Erro ao excluir avaliação')
        }
    }

    const filteredOracles = oraculistas.filter(o => {
        const matchesSearch = (o.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.name_fantasy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.specialty?.toLowerCase().includes(searchTerm.toLowerCase()))

        // STRICT APPROVAL: Only 'approved' is considered approved. 
        // No more fallback to null/none.
        const isApproved = o.application_status === 'approved'
        const isAI = o.is_ai || o.oracle_type === 'ai'

        if (activeTab === 'pending') {
            return matchesSearch && (o.application_status === 'pending' || o.application_status === 'waitlist' || o.application_status === 'rejected')
        }

        if (activeTab === 'human') {
            return matchesSearch && isApproved && !isAI
        }

        if (activeTab === 'ai') {
            return matchesSearch && isApproved && isAI
        }

        return false
    })

    const pendingCount = oraculistas.filter(o => o.has_unseen_changes === true).length

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Gestão de <span className="neon-text-purple">Oraculistas</span></h1>
                    <p className="text-slate-400">Adicione, edite ou gerencie os guias do seu marketplace.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsManagingSpecialties(true)}
                        className="flex items-center px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-white/10 transition-all"
                    >
                        <Tag size={20} className="mr-2 text-neon-gold" /> Categorias
                    </button>
                    <button
                        onClick={() => router.push(`/admin/oraculistas/novo?tab=${activeTab}`)}
                        className="flex items-center px-6 py-2.5 bg-neon-purple rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] text-white font-bold hover:scale-105 transition-all"
                    >
                        <Plus size={20} className="mr-2" /> Novo Oraculista
                    </button>
                </div>
            </div>

            {/* Modal de Gestão de Categorias */}
            <AnimatePresence>
                {isManagingSpecialties && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl"
                        >
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <Tag className="mr-3 text-neon-gold" />
                                    Gerenciar Categorias
                                </h3>
                                <button
                                    onClick={() => {
                                        setIsManagingSpecialties(false)
                                        setEditingItem(null)
                                        setItemName('')
                                    }}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            {/* Tabs Inside Modal */}
                            <div className="bg-white/5 p-4 border-b border-white/10 flex justify-center gap-4">
                                <button
                                    onClick={() => { setActiveManageTab('categories'); setEditingItem(null); setItemName('') }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeManageTab === 'categories' ? 'bg-neon-purple text-white' : 'text-slate-500 hover:text-white'}`}
                                >
                                    <Layers size={14} className="inline mr-2" />
                                    Categorias
                                </button>
                                <button
                                    onClick={() => { setActiveManageTab('specialties'); setEditingItem(null); setItemName('') }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeManageTab === 'specialties' ? 'bg-neon-cyan text-deep-space' : 'text-slate-500 hover:text-white'}`}
                                >
                                    <BookOpen size={14} className="inline mr-2" />
                                    Especialidades
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Form Section */}
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                        {editingItem ? `Editar ${activeManageTab === 'categories' ? 'Categoria' : 'Especialidade'}` : `Nova ${activeManageTab === 'categories' ? 'Categoria' : 'Especialidade'}`}
                                    </h4>
                                    <div className="flex gap-3">
                                        <GlowInput
                                            placeholder={`Nome da ${activeManageTab === 'categories' ? 'categoria' : 'especialidade'}...`}
                                            value={itemName}
                                            onChange={e => setItemName(e.target.value)}
                                            onKeyDown={(e: React.KeyboardEvent) => {
                                                if (e.key === 'Enter') {
                                                    handleSaveItem()
                                                }
                                            }}
                                            className="flex-1"
                                        />
                                        <NeonButton variant={activeManageTab === 'categories' ? 'purple' : 'cyan'} onClick={handleSaveItem} disabled={loadingCategory || !itemName.trim()}>
                                            {loadingCategory ? '...' : editingItem ? 'Atualizar' : 'Adicionar'}
                                        </NeonButton>
                                        {editingItem && (
                                            <button
                                                onClick={() => {
                                                    setEditingItem(null)
                                                    setItemName('')
                                                }}
                                                className="px-4 py-2 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 italic">
                                        {activeManageTab === 'categories' ? '* Categorias principais como Saúde, Amor, Prosperidade.' : '* Especialidades e métodos como Tarot, Búzios, Astrologia.'}
                                    </p>
                                </div>

                                {/* List Section */}
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                                        {activeManageTab === 'categories' ? 'Categorias de Atendimento' : 'Métodos / Especialidades'}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {(activeManageTab === 'categories' ? categories : specialties).map(s => (
                                            <div key={s.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-white/20 transition-all">
                                                <span className="text-white font-medium">{s.name}</span>
                                                <div className="flex items-center gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingItem(s)
                                                            setItemName(s.name)
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-neon-cyan hover:bg-neon-cyan/10 rounded-lg transition-all"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteItem(s.id, s.name)}
                                                        disabled={isDeletingItem}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mr-4 shrink-0">
                    <button
                        onClick={() => handleTabChange('human')}
                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${activeTab === 'human' ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        <User size={16} className="mr-2" />
                        Humanos
                    </button>
                    <button
                        onClick={() => handleTabChange('ai')}
                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${activeTab === 'ai' ? 'bg-neon-cyan text-deep-space shadow-lg shadow-neon-cyan/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        <Brain size={16} className="mr-2" />
                        IAs
                    </button>
                    <button
                        onClick={() => handleTabChange('pending')}
                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all relative flex items-center ${activeTab === 'pending' ? 'bg-neon-gold text-deep-space shadow-lg shadow-neon-gold/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        <Sparkles size={16} className="mr-2" />
                        Pendentes
                        {pendingCount > 0 && (
                            <span className="ml-2 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full animate-pulse border-2 border-deep-space">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                </div>
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-neon-purple transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou especialidade..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm text-white focus:border-neon-purple/50 outline-none transition-all shadow-inner"
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
                                        <div className="flex items-center gap-3">
                                            <div className="relative shrink-0">
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
                                                {o.has_unseen_changes && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-deep-space animate-pulse z-10"
                                                        title="Oraculista atualizou o perfil — revisar!"
                                                    />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white flex items-center gap-2">
                                                    {o.name_fantasy || o.full_name}
                                                    {o.has_unseen_changes && (
                                                        <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-bold uppercase">Atualizado</span>
                                                    )}
                                                </span>
                                                {o.name_fantasy && o.name_fantasy !== o.full_name && (
                                                    <span className="text-[10px] text-slate-500 font-medium">{o.full_name}</span>
                                                )}
                                            </div>
                                        </div>
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
                                                className="flex items-center space-x-1 px-2 py-1.5 text-neon-cyan hover:bg-neon-cyan/10 rounded-lg transition-all border border-transparent hover:border-neon-cyan/30"
                                                title="Visualizar Perfil Público"
                                            >
                                                <Eye size={14} />
                                                <span className="text-[10px] font-bold uppercase">Ver</span>
                                            </Link>

                                            <button
                                                onClick={() => fetchOracleReviews(o.id, o.full_name)}
                                                className="flex items-center space-x-1 px-2 py-1.5 text-neon-purple hover:bg-neon-purple/10 rounded-lg transition-all border border-transparent hover:border-neon-purple/30"
                                                title="Gerenciar Avaliações"
                                            >
                                                <MessageSquare size={14} />
                                                <span className="text-[10px] font-bold uppercase">Avaliações</span>
                                            </button>

                                            {/* Tab Specific Actions */}
                                            {activeTab === 'pending' ? (
                                                <>
                                                    {/* Ver Alterações: apenas se já foi rejeitado antes */}
                                                    {o.rejection_reason && (
                                                        <button
                                                            onClick={() => handleViewChanges(o.id)}
                                                            className="flex items-center space-x-1 px-2 py-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all border border-transparent hover:border-blue-400/30"
                                                            title="Ver Alterações Recentes"
                                                        >
                                                            <RefreshCw size={14} className={loadingSnapshot ? 'animate-spin' : ''} />
                                                            <span className="text-[10px] font-bold uppercase">Diffs</span>
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
                                                        className="flex items-center space-x-1 px-2 py-1.5 text-orange-400 hover:bg-orange-400/10 rounded-lg transition-all border border-transparent hover:border-orange-400/30"
                                                        title="Pausar e Solicitar Correções"
                                                    >
                                                        <X size={14} />
                                                        <span className="text-[10px] font-bold uppercase">Pausar</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePendingUser(o.id, o.full_name)}
                                                        disabled={isDeletingPending === o.id}
                                                        className="flex items-center space-x-1 px-2 py-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/30 disabled:opacity-40"
                                                        title="Deletar cadastro permanentemente"
                                                    >
                                                        {isDeletingPending === o.id ? (
                                                            <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Trash2 size={14} />
                                                        )}
                                                        <span className="text-[10px] font-bold uppercase">Deletar</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <Link
                                                        href={`/admin/oraculistas/editar/${o.id}?tab=${activeTab}`}
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

            {/* Comparison Modal */}
            <AnimatePresence>
                {comparisonModal.open && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl"
                        >
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <div className="flex items-center space-x-3">
                                    <h3 className="text-xl font-bold text-white flex items-center">
                                        <History className="mr-3 text-neon-gold" />
                                        Comparação de Alterações
                                    </h3>
                                    <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-slate-400 border border-white/10">
                                        {comparisonModal.current?.full_name}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setComparisonModal({ open: false, current: null, snapshot: null })}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                <div className="grid grid-cols-2 gap-8 sticky top-0 z-10 bg-[#0f172a]/80 backdrop-blur-md pb-4 border-b border-white/5">
                                    <div className="text-center">
                                        <p className="text-[10px] uppercase tracking-widest font-black text-red-400 mb-1">Versão Anterior (Snapshot)</p>
                                        <p className="text-xs text-slate-500">Estado no momento da rejeição</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] uppercase tracking-widest font-black text-green-400 mb-1">Versão Atual</p>
                                        <p className="text-xs text-slate-500">Estado modificado pelo oraculista</p>
                                    </div>
                                </div>

                                {/* Comparison Rows */}
                                <div className="space-y-12 pb-10">
                                    {/* Bio */}
                                    <section className="space-y-4">
                                        <h4 className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Biografia / Descrição</h4>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="p-5 bg-red-400/5 border border-red-500/20 rounded-2xl text-slate-400 text-sm leading-relaxed italic">
                                                {comparisonModal.snapshot?.bio || 'Sem bio anterior'}
                                            </div>
                                            <div className={`p-5 rounded-2xl text-white text-sm leading-relaxed border ${comparisonModal.current?.bio !== comparisonModal.snapshot?.bio ? 'bg-green-400/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                                                {comparisonModal.current?.bio}
                                            </div>
                                        </div>
                                    </section>

                                    {/* Specialty */}
                                    <section className="space-y-4">
                                        <h4 className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Especialidade / Título</h4>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="p-4 bg-red-400/5 border border-red-500/20 rounded-xl text-center font-bold text-slate-400">
                                                {comparisonModal.snapshot?.specialty}
                                            </div>
                                            <div className={`p-4 rounded-xl text-center font-bold border ${comparisonModal.current?.specialty !== comparisonModal.snapshot?.specialty ? 'bg-green-400/10 border-green-500/30 text-white' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                                                {comparisonModal.current?.specialty}
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>

                            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                                <button
                                    onClick={() => setComparisonModal({ open: false, current: null, snapshot: null })}
                                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                                >
                                    Fechar
                                </button>
                                <button
                                    onClick={() => {
                                        handleStatusChange(comparisonModal.current.id, 'approved')
                                        setComparisonModal({ open: false, current: null, snapshot: null })
                                    }}
                                    className="px-6 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 shadow-lg shadow-green-500/20 transition-all"
                                >
                                    Aprovar Agora
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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

            {/* Reviews Management Modal */}
            <AnimatePresence>
                {reviewsModal.open && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl"
                        >
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <Star className="mr-3 text-neon-gold fill-neon-gold" />
                                    Avaliações de {reviewsModal.name}
                                </h3>
                                <button
                                    onClick={() => setReviewsModal({ open: false, oracleId: null, name: '' })}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {loadingReviews ? (
                                    <div className="flex justify-center py-20">
                                        <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : oracleReviews.length === 0 ? (
                                    <div className="text-center py-20 text-slate-500">Nenhuma avaliação encontrada.</div>
                                ) : (
                                    oracleReviews.map(r => (
                                        <div key={r.id} className="p-4 bg-white/5 border border-white/5 rounded-xl flex justify-between items-start group">
                                            <div className="space-y-2">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-deep-space overflow-hidden border border-white/10">
                                                        <img src={r.client?.avatar_url || `https://ui-avatars.com/api/?name=${r.client?.full_name || 'A'}&background=random`} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{r.client?.full_name || 'Anônimo'}</p>
                                                        <div className="flex space-x-1">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} size={10} className={i < r.stars ? "text-neon-gold fill-neon-gold" : "text-slate-700"} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-400 italic">"{r.comment || 'Sem comentário'}"</p>
                                                <p className="text-[10px] text-slate-600">{new Date(r.created_at).toLocaleString('pt-BR')}</p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteReview(r.id)}
                                                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Excluir Avaliação"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
                                <button
                                    onClick={() => setReviewsModal({ open: false, oracleId: null, name: '' })}
                                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                                >
                                    Fechar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
