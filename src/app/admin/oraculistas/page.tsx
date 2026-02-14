'use client'

import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Users, Plus, Search, Edit2, Trash2, Brain } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AdminOraculistasPage() {
    const router = useRouter()

    const oraculistas = [
        { id: 1, name: 'Mestre Arcanus', type: 'IA', specialty: 'Tarot', sessions: 156, status: 'Online' },
        { id: 2, name: 'Sacerdotisa Lunar', type: 'IA', specialty: 'Astrologia', sessions: 89, status: 'Offline' },
        { id: 3, name: 'Dr. Cosmos', type: 'Humano', specialty: 'Búzios', sessions: 230, status: 'Online' },
    ]

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Gestão de <span className="neon-text-purple">Oraculistas</span></h1>
                    <p className="text-slate-400">Adicione, edite ou gerencie os guias do seu marketplace.</p>
                </div>
                <button
                    onClick={() => router.push('/admin/oraculistas/novo')}
                    className="flex items-center px-6 py-2.5 bg-neon-purple rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] text-white font-bold hover:scale-105 transition-all"
                >
                    <Plus size={20} className="mr-2" /> Novo Oraculista
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-neon-purple transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou especialidade..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm text-white focus:border-neon-purple/50 outline-none transition-all"
                    />
                </div>
            </div>

            <GlassCard className="border-white/5 p-0 overflow-hidden" hover={false}>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Oraculista</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Especialidade</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Sessões</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {oraculistas.map((o) => (
                            <tr key={o.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-neon-purple text-xs">
                                            {o.name[0]}
                                        </div>
                                        <span className="text-sm font-medium text-white">{o.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${o.type === 'IA' ? 'bg-neon-cyan/10 text-neon-cyan' : 'bg-neon-purple/10 text-neon-purple'}`}>
                                        {o.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-400">{o.specialty}</td>
                                <td className="px-6 py-4 text-sm text-white text-center font-bold">{o.sessions}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${o.status === 'Online' ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
                                        <span className={`text-xs ${o.status === 'Online' ? 'text-green-500' : 'text-slate-500'}`}>{o.status}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button className="p-2 text-slate-400 hover:text-neon-cyan transition-colors rounded-lg hover:bg-white/5">
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </GlassCard>
        </div>
    )
}
