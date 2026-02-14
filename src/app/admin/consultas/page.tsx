'use client'

import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { MessageSquare, Clock, CreditCard, ExternalLink, Calendar } from 'lucide-react'

export default function AdminConsultasPage() {
    const consultas = [
        { id: '1024', client: 'Ana Maria', oracle: 'Mestre Arcanus', duration: '12:05', credits: 60, status: 'Em andamento', date: 'Hoje' },
        { id: '1023', client: 'Carlos Silva', oracle: 'Sacerdotisa Lunar', duration: '20:00', credits: 100, status: 'Finalizada', date: 'Hoje' },
        { id: '1022', client: 'Juliana P.', oracle: 'Dr. Cosmos', duration: '05:30', credits: 25, status: 'Cancelada', date: 'Ontem' },
    ]

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Monitor de <span className="neon-text-cyan">Consultas</span></h1>
                <p className="text-slate-400">Acompanhe todos os atendimentos e interações do marketplace.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {consultas.map((c) => (
                    <GlassCard key={c.id} className="border-white/5" hover={true}>
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                            <div className="flex items-center space-x-6 w-full lg:w-auto">
                                <div className={`p-4 rounded-2xl ${c.status === 'Em andamento' ? 'bg-neon-cyan/10 text-neon-cyan animate-pulse' : 'bg-white/5 text-slate-500'}`}>
                                    <MessageSquare size={24} />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">ID #{c.id}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${c.status === 'Em andamento' ? 'bg-green-500/10 text-green-500' :
                                                c.status === 'Finalizada' ? 'bg-neon-purple/10 text-neon-purple' : 'bg-red-500/10 text-red-500'
                                            }`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <h3 className="text-white font-bold">{c.client} <span className="text-slate-500 font-normal mx-2">com</span> {c.oracle}</h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-10 flex-1 px-8 border-x border-white/5 mx-4 hidden xl:grid">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Duração</p>
                                    <p className="text-sm font-medium text-white flex items-center">
                                        <Clock size={14} className="mr-2 text-neon-cyan" /> {c.duration}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Créditos</p>
                                    <p className="text-sm font-bold text-neon-gold flex items-center">
                                        <CreditCard size={14} className="mr-2" /> {c.credits} CR
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Data</p>
                                    <p className="text-sm font-medium text-slate-300 flex items-center">
                                        <Calendar size={14} className="mr-2" /> {c.date}
                                    </p>
                                </div>
                            </div>

                            <button className="flex items-center space-x-2 px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all w-full lg:w-auto justify-center">
                                <ExternalLink size={14} />
                                <span>Auditoria</span>
                            </button>
                        </div>
                    </GlassCard>
                ))}
            </div>
        </div>
    )
}
