'use client'

import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowInput } from '@/components/ui/GlowInput'
import { NeonButton } from '@/components/ui/NeonButton'
import { 
    Users, Plus, Search, Edit2, Trash2, Brain, User, Check, X, Star, Eye, Ban, 
    Tag, MessageSquare, RefreshCw, Layers, BookOpen, Mail, Phone, Calendar, 
    Clock, MapPin, FileText, Wallet, Sparkles, UserCheck, ShieldCheck 
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { getOracleStatus } from '@/lib/status'
import { motion, AnimatePresence } from 'framer-motion'

// Status Badge Component
const StatusBadge = ({ status }: { status?: string }) => {
    switch (status) {
        case 'approved':
            return <span className="text-[10px] bg-green-500/20 text-green-500 border border-green-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Aprovado</span>
        case 'pending':
            return <span className="text-[10px] bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">Pendente</span>
        case 'waitlist':
            return <span className="text-[10px] bg-orange-500/20 text-orange-500 border border-orange-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Waitlist</span>
        case 'rejected':
            return <span className="text-[10px] bg-red-500/20 text-red-500 border border-red-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Rejeitado</span>
        default:
            return <span className="text-[10px] bg-slate-500/20 text-slate-500 border border-slate-500/30 px-2 py-0.5 rounded-full font-bold uppercase">N/A</span>
    }
}

export default function AdminUsuariosPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    // Main Tabs: oracles | clients
    const [mainTab, setMainTab] = useState<'oracles' | 'clients'>((searchParams.get('type') as any) || 'oracles')
    
    // Sub Tabs for Oracles: human | ai | pending
    const [oracleTab, setOracleTab] = useState<'human' | 'ai' | 'pending'>((searchParams.get('tab') as any) || 'human')
    
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [users, setUsers] = useState<any[]>([])
    const [wallets, setWallets] = useState<any[]>([])
    
    // Detail Modal State
    const [detailUser, setDetailUser] = useState<any>(null)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [mainTab])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch Profiles
            const roleFilter = mainTab === 'oracles' ? ['oracle', 'owner'] : ['client']
            const { data: profilesData, error: pError } = await supabase
                .from('profiles')
                .select('*')
                .in('role', roleFilter)
                .order('created_at', { ascending: false })

            if (pError) throw pError

            // Fetch Wallets
            const { data: walletsData } = await supabase
                .from('wallets')
                .select('*')

            setUsers(profilesData || [])
            setWallets(walletsData || [])
        } catch (err: any) {
            console.error('Error fetching data:', err)
            toast.error('Erro ao carregar dados')
        } finally {
            setLoading(false)
        }
    }

    const getWalletBalance = (userId: string) => {
        return wallets.find(w => w.user_id === userId)?.balance || 0
    }

    const filteredUsers = users.filter(u => {
        const matchesSearch = (
            u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.phone?.includes(searchTerm) ||
            u.name_fantasy?.toLowerCase().includes(searchTerm.toLowerCase())
        )

        if (mainTab === 'clients') return matchesSearch

        // Oracle Specific Filtering
        const isApproved = u.application_status === 'approved'
        const isAI = u.is_ai || u.oracle_type === 'ai'

        if (oracleTab === 'pending') {
            return matchesSearch && (u.application_status === 'pending' || u.application_status === 'waitlist' || u.application_status === 'rejected')
        }
        if (oracleTab === 'human') {
            return matchesSearch && isApproved && !isAI
        }
        if (oracleTab === 'ai') {
            return matchesSearch && isApproved && isAI
        }
        return false
    })

    const handleMainTabChange = (type: 'oracles' | 'clients') => {
        setMainTab(type)
        const params = new URLSearchParams(searchParams.toString())
        params.set('type', type)
        router.replace(`/admin/usuarios?${params.toString()}`, { scroll: false })
    }

    const handleOracleTabChange = (tab: 'human' | 'ai' | 'pending') => {
        setOracleTab(tab)
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tab)
        router.replace(`/admin/usuarios?${params.toString()}`, { scroll: false })
    }

    const handleDeleteUser = async (id: string, name: string) => {
        if (!confirm(`Deletar PERMANENTEMENTE o cadastro de ${name}? Esta ação remove o usuário do banco de dados e do sistema de autenticação.`)) return

        setIsDeleting(id)
        try {
            const res = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: id })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao deletar usuário')

            setUsers(prev => prev.filter(u => u.id !== id))
            toast.success(`${name} deletado permanentemente`)
            if (detailUser?.id === id) setDetailUser(null)
        } catch (err: any) {
            toast.error('Erro ao deletar: ' + err.message)
        } finally {
            setIsDeleting(null)
        }
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Gestão de <span className="neon-text-purple">Usuários</span></h1>
                    <p className="text-slate-400">Hub central para controle de oraculistas e membros do Templo.</p>
                </div>
                
                {/* Main Tabs Selection */}
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                    <button
                        onClick={() => handleMainTabChange('oracles')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${mainTab === 'oracles' ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        <ShieldCheck size={18} />
                        Oraculistas
                    </button>
                    <button
                        onClick={() => handleMainTabChange('clients')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${mainTab === 'clients' ? 'bg-neon-cyan text-deep-space shadow-lg shadow-neon-cyan/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        <UserCheck size={18} />
                        Clientes
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
                {mainTab === 'oracles' && (
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mr-4 shrink-0">
                        <button
                            onClick={() => handleOracleTabChange('human')}
                            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase transition-all ${oracleTab === 'human' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
                        >
                            Humanos
                        </button>
                        <button
                            onClick={() => handleOracleTabChange('ai')}
                            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase transition-all ${oracleTab === 'ai' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
                        >
                            IAs
                        </button>
                        <button
                            onClick={() => handleOracleTabChange('pending')}
                            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase transition-all ${oracleTab === 'pending' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
                        >
                            Pendentes
                        </button>
                    </div>
                )}
                
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-neon-purple transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nome, e-mail, telefone..."
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
                        <p className="text-slate-500 animate-pulse uppercase tracking-widest text-xs font-bold">Invocando Dados...</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Usuário</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Contato</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Saldo</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-deep-space">
                                                <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.full_name}&background=12122a&color=06b6d4`} className="w-full h-full object-cover" alt={u.full_name} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white">{u.name_fantasy || u.full_name}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">{u.id.substring(0, 8)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-slate-400 flex items-center gap-1.5"><Mail size={12} /> {u.email}</span>
                                            <span className="text-xs text-slate-400 flex items-center gap-1.5"><Phone size={12} /> {u.phone || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-neon-gold flex items-center gap-2">
                                            <Wallet size={14} />
                                            {getWalletBalance(u.id)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={u.application_status} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => setDetailUser(u)}
                                                className="p-2 text-slate-400 hover:text-white transition-colors"
                                                title="Ver Detalhes Completos"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            {u.role !== 'owner' && (
                                                <Link 
                                                    href={u.role === 'oracle' ? `/admin/oraculistas/editar/${u.id}` : `/admin/membros`} 
                                                    className="p-2 text-slate-400 hover:text-neon-purple transition-colors"
                                                >
                                                    <Edit2 size={18} />
                                                </Link>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </GlassCard>

            {/* Total Details Modal */}
            <AnimatePresence>
                {detailUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-deep-space rounded-2xl border border-white/10 shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full border border-neon-purple/50 p-1">
                                        <div className="w-full h-full rounded-full bg-deep-space overflow-hidden">
                                            <img src={detailUser.avatar_url || `https://ui-avatars.com/api/?name=${detailUser.full_name}`} alt={detailUser.full_name} className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white leading-tight">{detailUser.full_name}</h3>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{detailUser.role} • {detailUser.email}</p>
                                    </div>
                                </div>
                                <button onClick={() => setDetailUser(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-10">
                                {/* Dashboard Style Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <Wallet size={12} className="text-neon-gold" /> Saldo Atual
                                        </div>
                                        <div className="text-2xl font-bold text-white">{getWalletBalance(detailUser.id)} <span className="text-xs text-slate-500">créditos</span></div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <Star size={12} className="text-neon-purple" /> Status
                                        </div>
                                        <div className="text-lg font-bold text-white"><StatusBadge status={detailUser.application_status} /></div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <Calendar size={12} className="text-neon-cyan" /> Cadastro
                                        </div>
                                        <div className="text-sm font-bold text-white">{new Date(detailUser.created_at).toLocaleDateString('pt-BR')}</div>
                                    </div>
                                </div>

                                {/* Fields Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* Personal Info */}
                                    <div className="space-y-6">
                                        <h4 className="text-xs font-bold text-neon-purple uppercase tracking-[0.2em] flex items-center gap-3">
                                            <User size={16} /> Dados Pessoais
                                        </h4>
                                        <div className="grid gap-4">
                                            <DataField label="CPF" value={detailUser.cpf} icon={<FileText size={14} />} />
                                            <DataField label="Data de Nascimento" value={detailUser.birth_date} icon={<Calendar size={14} />} />
                                            <DataField label="Hora" value={detailUser.birth_time} icon={<Clock size={14} />} />
                                            <DataField label="Local" value={detailUser.birth_place} icon={<MapPin size={14} />} />
                                            <DataField label="WhatsApp" value={detailUser.phone} icon={<Phone size={14} />} />
                                        </div>
                                    </div>

                                    {/* Address Info */}
                                    <div className="space-y-6">
                                        <h4 className="text-xs font-bold text-neon-cyan uppercase tracking-[0.2em] flex items-center gap-3">
                                            <MapPin size={16} /> Endereço e Faturamento
                                        </h4>
                                        <div className="grid gap-4">
                                            <DataField label="CEP" value={detailUser.zip_code} />
                                            <DataField label="Rua / Logradouro" value={detailUser.address} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <DataField label="Número" value={detailUser.address_number} />
                                                <DataField label="Bairro" value={detailUser.neighborhood} />
                                            </div>
                                            <DataField label="Cidade / Estado" value={detailUser.city ? `${detailUser.city} - ${detailUser.state || ''}` : 'N/A'} />
                                            <DataField label="Complemento" value={detailUser.address_complement} />
                                        </div>
                                    </div>

                                    {/* Oracle Specific Details */}
                                    {detailUser.role === 'oracle' && (
                                        <div className="md:col-span-2 space-y-6 border-t border-white/5 pt-10">
                                            <h4 className="text-xs font-bold text-neon-gold uppercase tracking-[0.2em] flex items-center gap-3">
                                                <Brain size={16} /> Dados Profissionais (Oraculista)
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                <div className="space-y-4">
                                                    <DataField label="Nome Fantasia" value={detailUser.name_fantasy} />
                                                    <DataField label="Especialidade" value={detailUser.specialty} />
                                                    <DataField label="Taxa por Minuto" value={`${detailUser.credits_per_minute} créditos`} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 block">Minibiografia / Descrição</label>
                                                    <div className="text-sm text-slate-300 bg-white/5 p-4 rounded-xl border border-white/5 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                                        {detailUser.bio || 'Sem biografia preenchida.'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-between items-center">
                                <button
                                    onClick={() => handleDeleteUser(detailUser.id, detailUser.full_name)}
                                    disabled={isDeleting !== null}
                                    className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-widest px-4 py-2"
                                >
                                    <Trash2 size={16} />
                                    {isDeleting === detailUser.id ? 'Deletando...' : 'Remover Conta Permanentemente'}
                                </button>
                                <div className="flex gap-4">
                                    <NeonButton 
                                        variant="purple" 
                                        size="sm" 
                                        onClick={() => {
                                            const path = detailUser.role === 'oracle' ? `/admin/oraculistas/editar/${detailUser.id}` : `/admin/membros`
                                            router.push(path)
                                        }}
                                    >
                                        Editar Cadastro
                                    </NeonButton>
                                    <button 
                                        onClick={() => setDetailUser(null)}
                                        className="px-6 py-2 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all text-sm"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

function DataField({ label, value, icon }: { label: string, value: string | null, icon?: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                {icon} {label}
            </label>
            <div className={`text-sm py-2.5 px-4 rounded-xl bg-white/5 border border-white/5 text-white ${!value ? 'text-slate-500 italic' : ''}`}>
                {value || 'Não preenchido'}
            </div>
        </div>
    )
}
