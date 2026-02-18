'use client'

import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { History, Calendar, Clock, CreditCard, Inbox, Video } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export default function HistoricoPage() {
    const { profile } = useAuthStore()
    const [atendimentos, setAtendimentos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (profile?.id) {
            fetchHistory()
        }
    }, [profile?.id])

    const fetchHistory = async () => {
        try {
            // 1. Fetch consultations
            const { data: consData, error: cError } = await supabase
                .from('consultations')
                .select('*, oracle:profiles!consultations_oracle_id_fkey(full_name, specialty)')
                .eq('client_id', profile!.id)
                .order('created_at', { ascending: false })

            if (cError) throw cError

            // 2. Fetch all gift transactions for this user
            const { data: giftData } = await supabase
                .from('transactions')
                .select('amount, metadata')
                .eq('user_id', profile!.id)
                .eq('type', 'gift_send')

            // 3. Map gifts to consultations
            const consultationsWithGifts = (consData || []).map(c => {
                const consultationGifts = giftData?.filter(g => g.metadata?.consultation_id === c.id) || []
                const totalGifts = consultationGifts.reduce((acc, current) => acc + Math.abs(current.amount), 0)
                return {
                    ...c,
                    total_gifts: totalGifts
                }
            })

            setAtendimentos(consultationsWithGifts)
        } catch (err) {
            console.error('Erro ao buscar histórico:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 animate-pulse font-bold uppercase tracking-widest text-xs">Resgatando Memórias...</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Seu <span className="neon-text-purple">Histórico</span></h1>
                <p className="text-slate-400">Reveja suas jornadas anteriores e o tempo dedicado ao seu crescimento.</p>
            </div>

            {atendimentos.length === 0 ? (
                <GlassCard className="border-white/5 text-center py-20" hover={false}>
                    <Inbox size={48} className="mx-auto text-slate-700 mb-4" />
                    <p className="text-slate-500">Você ainda não realizou nenhuma jornada espiritual.</p>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {atendimentos.map((atendimento) => (
                        <GlassCard key={atendimento.id} className="border-white/5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 rounded-2xl bg-neon-purple/10 text-neon-purple">
                                        {atendimento.type === 'video' ? <Video size={24} /> : <History size={24} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-white">{atendimento.oracle?.full_name}</h3>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-black ${atendimento.type === 'video' ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30' : 'bg-neon-purple/20 text-neon-purple border-neon-purple/30'}`}>
                                                {atendimento.type === 'video' ? 'Vídeo' : 'Mensagem'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">{atendimento.oracle?.specialty}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center md:text-left flex-1">
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Data</p>
                                        <p className="text-sm font-medium text-white flex items-center justify-center md:justify-start text-xs">
                                            <Calendar size={14} className="mr-2 text-slate-400" />
                                            {new Date(atendimento.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Status</p>
                                        <p className={`text-sm font-bold flex items-center justify-center md:justify-start ${atendimento.status === 'answered' || atendimento.status === 'completed' ? 'text-green-400' : 'text-neon-gold animate-pulse'}`}>
                                            <Clock size={14} className="mr-2 opacity-70" />
                                            {atendimento.status === 'answered' || atendimento.status === 'completed' ? 'Concluída' : 'Em processamento'}
                                        </p>
                                    </div>
                                    {atendimento.type === 'video' && (
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Duração</p>
                                            <p className="text-sm font-medium text-white flex items-center justify-center md:justify-start">
                                                <Clock size={14} className="mr-2 text-slate-400" />
                                                {atendimento.duration_seconds ? `${Math.floor(atendimento.duration_seconds / 60)}: ${(atendimento.duration_seconds % 60).toString().padStart(2, '0')}` : '--:--'}
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Investimento</p>
                                        <div className="flex flex-col md:items-start items-center">
                                            <p className="text-sm font-bold text-neon-gold flex items-center justify-center md:justify-start">
                                                <CreditCard size={14} className="mr-2 opacity-70" /> {atendimento.total_credits} créditos
                                            </p>
                                            {atendimento.total_gifts > 0 && (
                                                <p className="text-[10px] text-neon-cyan/80 font-bold uppercase mt-1">
                                                    + {atendimento.total_gifts} em presentes
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => window.location.href = `/app/consulta/resposta/${atendimento.id}`}
                                        className="px-6 py-2 rounded-xl bg-neon-purple/20 border border-neon-purple/30 text-xs font-bold text-neon-purple hover:bg-neon-purple/30 transition-all flex-1 md:flex-none"
                                    >
                                        Mais Informações
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    )
}
