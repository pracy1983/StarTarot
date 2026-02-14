'use client'

import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { History, Calendar, Clock, CreditCard } from 'lucide-react'

export default function HistoricoPage() {
    const atendimentos = [
        { id: 1, oracle: 'Mestre Arcanus', data: '12 Fev 2024', duration: '15 min', cost: 75, type: 'Tarot' },
        { id: 2, oracle: 'Sacerdotisa Lunar', data: '10 Fev 2024', duration: '20 min', cost: 100, type: 'Astrologia' },
    ]

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Seu <span className="neon-text-purple">Histórico</span></h1>
                <p className="text-slate-400">Reveja suas jornadas anteriores e o tempo dedicado ao seu crescimento.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {atendimentos.map((atendimento) => (
                    <GlassCard key={atendimento.id} className="border-white/5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 rounded-2xl bg-neon-purple/10 text-neon-purple">
                                    <History size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{atendimento.oracle}</h3>
                                    <p className="text-xs text-slate-500">{atendimento.type}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-8 text-center md:text-left">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Data</p>
                                    <p className="text-sm font-medium text-white flex items-center justify-center md:justify-start">
                                        <Calendar size={14} className="mr-2 text-slate-400" /> {atendimento.data}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Duração</p>
                                    <p className="text-sm font-medium text-white flex items-center justify-center md:justify-start">
                                        <Clock size={14} className="mr-2 text-slate-400" /> {atendimento.duration}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Custo</p>
                                    <p className="text-sm font-bold text-neon-gold flex items-center justify-center md:justify-start">
                                        <CreditCard size={14} className="mr-2 opacity-70" /> {atendimento.cost} CR
                                    </p>
                                </div>
                            </div>

                            <button className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all">
                                Detalhes
                            </button>
                        </div>
                    </GlassCard>
                ))}
            </div>
        </div>
    )
}
