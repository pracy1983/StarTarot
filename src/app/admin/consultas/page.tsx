'use client'

import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Search, Filter, Download, Eye, Sparkles, Calendar, Trash2, Video, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminConsultationsPage() {
    const [consultations, setConsultations] = useState<any[]>([])
    const [oracles, setOracles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Filtros
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedOracle, setSelectedOracle] = useState('')
    const [selectedType, setSelectedType] = useState('') // 'video' ou 'message'
    const [statusFilter, setStatusFilter] = useState('')
    const [minCredits, setMinCredits] = useState('')
    const [maxCredits, setMaxCredits] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    // Modal
    const [selectedConsultation, setSelectedConsultation] = useState<any>(null)
    const [modalQuestions, setModalQuestions] = useState<any[]>([])
    const [isRegenerating, setIsRegenerating] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            // Buscar consultas com dados do cliente e oracle
            const { data: consultationsData, error } = await supabase
                .from('consultations')
                .select(`
                    *,
                    client:profiles!consultations_client_id_fkey(id, full_name, email),
                    oracle:profiles!consultations_oracle_id_fkey(id, full_name, is_ai, oracle_type)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error

            setConsultations(consultationsData || [])

            // Buscar oracles para dropdown
            const { data: oraclesData } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('role', 'oracle')
                .order('full_name')

            setOracles(oraclesData || [])
        } catch (err) {
            console.error('Error fetching consultations:', err)
            toast.error('Erro ao carregar consultas')
        } finally {
            setLoading(false)
        }
    }

    const handleViewDetails = async (consultation: any) => {
        const { data: questions } = await supabase
            .from('consultation_questions')
            .select('*')
            .eq('consultation_id', consultation.id)
            .order('question_order', { ascending: true })

        setModalQuestions(questions || [])
        setSelectedConsultation(consultation)
    }

    const handleDeleteConsultation = async (consultation: any) => {
        const confirmMessage = consultation.total_credits > 0
            ? `ATENÇÃO: Esta consulta custou ${consultation.total_credits} créditos.\nAo excluir, o valor será ESTORNADO para o cliente.\n\nDeseja continuar?`
            : 'Tem certeza que deseja excluir esta consulta permanentemente?';

        if (!confirm(confirmMessage)) return

        try {
            // 1. Reembolsar se necessário
            if (consultation.total_credits > 0 && consultation.client?.id) {
                // Buscar créditos atuais
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('credits')
                    .eq('id', consultation.client.id)
                    .single()

                if (profile) {
                    // Update credits
                    await supabase
                        .from('profiles')
                        .update({ credits: (profile.credits || 0) + consultation.total_credits })
                        .eq('id', consultation.client.id)

                    // Register transaction
                    await supabase
                        .from('credit_transactions')
                        .insert({
                            user_id: consultation.client.id,
                            amount: consultation.total_credits,
                            type: 'refund',
                            description: `Reembolso: Consulta #${consultation.id.slice(0, 8)} excluída pelo suporte`
                        })
                }
            }

            // 2. Excluir consulta
            const { error } = await supabase
                .from('consultations')
                .delete()
                .eq('id', consultation.id)

            if (error) throw error

            setConsultations(prev => prev.filter(c => c.id !== consultation.id))
            toast.success('Consulta excluída e créditos reembolsados (se aplicável).')
        } catch (err: any) {
            console.error('Error deleting consultation:', err)
            toast.error('Erro ao excluir: ' + err.message)
        }
    }

    const handleRegenerate = async (consultationId: string) => {
        if (!confirm('Deseja regenerar as respostas desta consulta usando a IA?')) return

        setIsRegenerating(true)
        try {
            const res = await fetch('/api/consultations/regenerate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consultationId })
            })

            if (!res.ok) throw new Error('Erro ao regenerar')

            toast.success('Respostas regeneradas com sucesso!')

            const { data: questions } = await supabase
                .from('consultation_questions')
                .select('*')
                .eq('consultation_id', consultationId)
                .order('question_order', { ascending: true })

            setModalQuestions(questions || [])

        } catch (err: any) {
            toast.error('Erro ao regenerar: ' + err.message)
        } finally {
            setIsRegenerating(false)
        }
    }

    const handleExportCSV = () => {
        const csv = [
            ['Cliente', 'Email', 'Oraculista', 'Canal', 'Tipo', 'Detalhes', 'Créditos', 'Status', 'Data'].join(','),
            ...filteredConsultations.map(c => {
                const status = getStatusInfo(c).label
                const type = c.type === 'video' ? 'Vídeo' : 'Mensagem'
                const details = c.type === 'video' ? formatDuration(c.duration_seconds) : `${c.total_questions} msgs`
                return [
                    c.client?.full_name || 'N/A',
                    c.client?.email || 'N/A',
                    c.oracle?.full_name || 'N/A',
                    type,
                    c.oracle?.is_ai ? 'IA' : 'Humano',
                    details,
                    c.total_credits,
                    status,
                    new Date(c.created_at).toLocaleDateString('pt-BR')
                ].join(',')
            })
        ].join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `consultas_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        toast.success('CSV exportado com sucesso!')
    }

    const getStatusInfo = (c: any) => {
        if (c.status === 'cancelled') return { label: 'Cancelada', color: 'bg-red-500/10 text-red-400', border: 'border-red-500/20' }
        if (c.status === 'active') return { label: 'Em Andamento', color: 'bg-green-500/10 text-green-400 animate-pulse', border: 'border-green-500/20' }

        if (c.status === 'completed' || c.status === 'ended' || c.status === 'finished') {
            if (c.type === 'video') {
                if (!c.duration_seconds || c.duration_seconds < 10) { // Assume < 10s is failed/dropped
                    return { label: 'Falhou (Conexão)', color: 'bg-red-500/10 text-red-400', border: 'border-red-500/20' }
                }
                return { label: 'Concluída', color: 'bg-green-500/10 text-green-400', border: 'border-green-500/20' }
            }
            return { label: 'Concluída', color: 'bg-green-500/10 text-green-400', border: 'border-green-500/20' }
        }

        // Default to pending
        if (c.status === 'pending') {
            // Check age. If older than 24h still pending, maybe failed?
            const hours = (new Date().getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60)
            if (hours > 24) return { label: 'Expirada/Abandonada', color: 'bg-red-900/10 text-red-500', border: 'border-red-900/20' }
            return { label: 'Pendente', color: 'bg-slate-500/10 text-slate-400', border: 'border-slate-500/20' }
        }

        return { label: c.status, color: 'bg-slate-500/10 text-slate-400', border: 'border-slate-500/20' }
    }

    const formatDuration = (seconds: number) => {
        if (!seconds) return '00:00'
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    const filteredConsultations = consultations.filter(c => {
        if (searchTerm && !(
            c.client?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.client?.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )) return false

        if (selectedOracle && c.oracle_id !== selectedOracle) return false

        if (selectedType) {
            if (selectedType === 'video' && c.type !== 'video') return false
            if (selectedType === 'message' && c.type !== 'message') return false
        }

        if (statusFilter) {
            const info = getStatusInfo(c)
            if (!info.label.toLowerCase().includes(statusFilter.toLowerCase())) return false
        }

        if (minCredits && c.total_credits < parseInt(minCredits)) return false
        if (maxCredits && c.total_credits > parseInt(maxCredits)) return false
        if (startDate && new Date(c.created_at) < new Date(startDate)) return false
        if (endDate && new Date(c.created_at) > new Date(endDate)) return false

        return true
    })

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-raleway flex items-center text-white">
                        <Sparkles size={24} className="mr-3 text-neon-purple" />
                        Histórico de <span className="neon-text-purple ml-2">Consultas</span>
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        {filteredConsultations.length} consulta(s) encontrada(s)
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/5 text-white rounded-xl text-sm font-bold hover:bg-white/10 transition-colors"
                >
                    <Filter size={18} />
                    <span>Atualizar</span>
                </button>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-xl text-sm font-bold hover:bg-green-500/20 transition-colors"
                >
                    <Download size={18} />
                    <span>Exportar CSV</span>
                </button>
            </div>

            {/* Filtros */}
            <GlassCard className="border-white/5" hover={false}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-3 text-sm text-white focus:border-neon-purple/50 outline-none"
                        />
                    </div>

                    <select
                        value={selectedOracle}
                        onChange={(e) => setSelectedOracle(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:border-neon-purple/50 outline-none"
                    >
                        <option value="">Todos os oraculistas</option>
                        {oracles.map(o => (
                            <option key={o.id} value={o.id}>{o.full_name}</option>
                        ))}
                    </select>

                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:border-neon-purple/50 outline-none"
                    >
                        <option value="">Todos os canais</option>
                        <option value="video">Vídeo</option>
                        <option value="message">Mensagem</option>
                    </select>

                    <div className="flex space-x-2">
                        <input
                            type="number"
                            placeholder="Min Créditos"
                            value={minCredits}
                            onChange={(e) => setMinCredits(e.target.value)}
                            className="w-1/2 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:border-neon-purple/50 outline-none"
                        />
                        <input
                            type="number"
                            placeholder="Max Créditos"
                            value={maxCredits}
                            onChange={(e) => setMaxCredits(e.target.value)}
                            className="w-1/2 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:border-neon-purple/50 outline-none"
                        />
                    </div>

                    <div className="flex space-x-2 md:col-span-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-1/2 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:border-neon-purple/50 outline-none"
                        />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-1/2 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:border-neon-purple/50 outline-none"
                        />
                    </div>
                </div>
            </GlassCard>

            {/* Tabela */}
            <GlassCard hover={false} className="border-white/5 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Oraculista</th>
                                    <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Canal</th>
                                    <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Detalhes</th>
                                    <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Créditos</th>
                                    <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredConsultations.map(c => {
                                    const statusInfo = getStatusInfo(c)
                                    return (
                                        <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-white">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm font-bold">{c.client?.full_name || 'Desconhecido'}</p>
                                                    <p className="text-xs text-slate-500">{c.client?.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span>{c.oracle?.full_name || 'Desconhecido'}</span>
                                                    {c.oracle?.is_ai && <span className="text-[10px] bg-neon-purple/20 text-neon-purple px-1 rounded">IA</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center">
                                                    <span className={`text-xs px-2 py-1 rounded border uppercase font-bold tracking-wider flex items-center gap-1 ${c.type === 'video'
                                                        ? 'border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan'
                                                        : 'border-fuchsia-400/30 bg-fuchsia-400/5 text-fuchsia-400'
                                                        }`}>
                                                        {c.type === 'video' ? <Video size={10} /> : <MessageSquare size={10} />}
                                                        {c.type === 'video' ? 'VÍDEO' : 'MENSAGEM'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-mono text-slate-400">
                                                {c.type === 'video' ? formatDuration(c.duration_seconds) : `${c.total_questions} msgs`}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm font-bold text-neon-gold flex items-center justify-center">
                                                    <Sparkles size={14} className="mr-1" />
                                                    {c.total_credits}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${statusInfo.color} ${statusInfo.border}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm text-slate-400">
                                                {new Date(c.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleViewDetails(c)}
                                                        className="p-2 text-neon-cyan hover:bg-neon-cyan/10 rounded-lg transition-colors"
                                                        title="Ver detalhes"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteConsultation(c)}
                                                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Excluir e reembolsar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {filteredConsultations.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-slate-500 text-sm">
                                            Nenhuma consulta encontrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </GlassCard>

            {/* Modal de Detalhes */}
            {selectedConsultation && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedConsultation(null)}>
                    <div className="bg-deep-space border border-white/10 rounded-2xl p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white">Detalhes da Consulta</h3>
                                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-mono">ID: {selectedConsultation.id}</p>
                            </div>
                            {(selectedConsultation.oracle?.is_ai || selectedConsultation.oracle?.oracle_type === 'ai') && (
                                <button
                                    onClick={() => handleRegenerate(selectedConsultation.id)}
                                    disabled={isRegenerating}
                                    className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${isRegenerating
                                        ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                                        : 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30 hover:bg-neon-purple/30'
                                        }`}
                                >
                                    <Sparkles size={14} className={`mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                                    {isRegenerating ? 'REGENERANDO...' : 'REGENERAR RESPOSTAS'}
                                </button>
                            )}
                        </div>
                        <div className="space-y-6">
                            {selectedConsultation.type === 'video' ? (
                                <div className="text-center p-8 bg-white/5 rounded-2xl">
                                    <p className="text-lg font-bold text-white mb-2">Consulta por Vídeo</p>
                                    <p className="text-slate-400 mb-4">Duração: {formatDuration(selectedConsultation.duration_seconds)}</p>
                                    <p className="items-center justify-center flex gap-2 text-neon-gold font-bold">
                                        <Sparkles size={16} /> {selectedConsultation.total_credits} Créditos
                                    </p>

                                    {selectedConsultation.video_end_reason && (
                                        <p className="text-xs text-slate-500 mt-4">Motivo Fim: {selectedConsultation.video_end_reason}</p>
                                    )}
                                </div>
                            ) : (
                                modalQuestions.map((q, idx) => (
                                    <div key={q.id} className="border-b border-white/5 pb-6 last:border-0">
                                        <p className="text-sm font-bold text-neon-purple mb-2">Mensagem {idx + 1}:</p>
                                        <p className="text-white mb-4">{q.question_text}</p>
                                        <p className="text-sm font-bold text-neon-gold mb-2">Resposta:</p>
                                        <p className="text-slate-300 whitespace-pre-wrap">{q.answer_text || 'Sem resposta ainda'}</p>
                                    </div>
                                ))
                            )}
                            {selectedConsultation.type !== 'video' && modalQuestions.length === 0 && (
                                <p className="text-center text-slate-500 py-4">Nenhuma mensagem trocada.</p>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedConsultation(null)}
                            className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
