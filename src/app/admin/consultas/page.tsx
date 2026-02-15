'use client'

import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Search, Filter, Download, Eye, Sparkles, Calendar, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminConsultationsPage() {
    const [consultations, setConsultations] = useState<any[]>([])
    const [oracles, setOracles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Filtros
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedOracle, setSelectedOracle] = useState('')
    const [selectedType, setSelectedType] = useState('') // 'ai' ou 'human'
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
            const { data: consultationsData } = await supabase
                .from('consultations')
                .select(`
                    *,
                    client:profiles!consultations_client_id_fkey(id, full_name, email),
                    oracle:profiles!consultations_oracle_id_fkey(id, full_name, is_ai, oracle_type)
                `)
                .order('created_at', { ascending: false })

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

    const handleDeleteConsultation = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta consulta permanentemente? Esta ação não pode ser desfeita.')) return

        try {
            const { error } = await supabase
                .from('consultations')
                .delete()
                .eq('id', id)

            if (error) throw error

            setConsultations(prev => prev.filter(c => c.id !== id))
            toast.success('Consulta excluída com sucesso!')
        } catch (err) {
            console.error('Error deleting consultation:', err)
            toast.error('Erro ao excluir consulta')
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

            // Atualizar o modal se ele ainda estiver aberto para a mesma consulta
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
            ['Cliente', 'Email', 'Oraculista', 'Tipo', 'Perguntas', 'Créditos', 'Status', 'Data'].join(','),
            ...filteredConsultations.map(c => [
                c.client.full_name,
                c.client.email,
                c.oracle.full_name,
                c.oracle.is_ai || c.oracle.oracle_type === 'ai' ? 'IA' : 'Humano',
                c.total_questions,
                c.total_credits,
                c.status === 'answered' ? 'Respondida' : c.status === 'processing' ? 'Processando' : 'Pendente',
                new Date(c.created_at).toLocaleDateString('pt-BR')
            ].join(','))
        ].join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `consultas_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        toast.success('CSV exportado com sucesso!')
    }

    const filteredConsultations = consultations.filter(c => {
        if (searchTerm && !(
            c.client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.client.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )) return false

        if (selectedOracle && c.oracle_id !== selectedOracle) return false
        if (selectedType === 'ai' && !(c.oracle.is_ai || c.oracle.oracle_type === 'ai')) return false
        if (selectedType === 'human' && (c.oracle.is_ai || c.oracle.oracle_type === 'ai')) return false
        if (minCredits && c.total_credits < parseInt(minCredits)) return false
        if (maxCredits && c.total_credits > parseInt(maxCredits)) return false
        if (startDate && new Date(c.created_at) < new Date(startDate)) return false
        if (endDate && new Date(c.created_at) > new Date(endDate)) return false

        return true
    })

    return (
        <div className="p-8 space-y-8">
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
                        <option value="">Todos os tipos</option>
                        <option value="ai">IA</option>
                        <option value="human">Humano</option>
                    </select>

                    <div className="flex space-x-2">
                        <input
                            type="number"
                            placeholder="Min CR"
                            value={minCredits}
                            onChange={(e) => setMinCredits(e.target.value)}
                            className="w-1/2 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:border-neon-purple/50 outline-none"
                        />
                        <input
                            type="number"
                            placeholder="Max CR"
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
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                                    <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Perguntas</th>
                                    <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Créditos</th>
                                    <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredConsultations.map(c => (
                                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-white">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-bold">{c.client.full_name}</p>
                                                <p className="text-xs text-slate-500">{c.client.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">{c.oracle.full_name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${c.oracle.is_ai || c.oracle.oracle_type === 'ai'
                                                ? 'bg-neon-purple/10 text-neon-purple'
                                                : 'bg-neon-cyan/10 text-neon-cyan'
                                                }`}>
                                                {c.oracle.is_ai || c.oracle.oracle_type === 'ai' ? 'IA' : 'Humano'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm">{c.total_questions}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-bold text-neon-gold flex items-center justify-center">
                                                <Sparkles size={14} className="mr-1" />
                                                {c.total_credits}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${c.status === 'answered' ? 'bg-green-500/10 text-green-400' :
                                                c.status === 'processing' ? 'bg-yellow-500/10 text-yellow-400' :
                                                    'bg-slate-500/10 text-slate-400'
                                                }`}>
                                                {c.status === 'answered' ? '✓ Respondida' : c.status === 'processing' ? '⏳ Processando' : '⏸ Pendente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm text-slate-400">
                                            {new Date(c.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleViewDetails(c)}
                                                className="p-2 text-neon-cyan hover:bg-neon-cyan/10 rounded-lg transition-colors"
                                                title="Ver detalhes"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteConsultation(c.id)}
                                                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-1"
                                                title="Excluir permanentemente"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
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
                            {(selectedConsultation.oracle?.is_ai || selectedConsultation.oracle?.oracle_type === 'ai' || selectedConsultation.oracle?.role === 'ai') && (
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
                            {modalQuestions.map((q, idx) => (
                                <div key={q.id} className="border-b border-white/5 pb-6 last:border-0">
                                    <p className="text-sm font-bold text-neon-purple mb-2">Pergunta {idx + 1}:</p>
                                    <p className="text-white mb-4">{q.question_text}</p>
                                    <p className="text-sm font-bold text-neon-gold mb-2">Resposta:</p>
                                    <p className="text-slate-300 whitespace-pre-wrap">{q.answer_text || 'Sem resposta ainda'}</p>
                                </div>
                            ))}
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
