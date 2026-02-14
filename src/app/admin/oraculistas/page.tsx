'use client'

import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Users, Plus, Search, Edit2, Trash2, Brain, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminOraculistasPage() {
    const router = useRouter()
    const [oraculistas, setOraculistas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchOracles()
    }, [])

    const fetchOracles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'oracle')
                .order('full_name', { ascending: true })

            if (error) throw error
            setOraculistas(data || [])
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

    const filteredOracles = oraculistas.filter(o =>
        o.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
    )

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
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredOracles.map((o) => (
                                <tr key={o.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-deep-space">
                                                {o.avatar_url ? (
                                                    <img src={o.avatar_url} className="w-full h-full object-cover" alt={o.full_name} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-neon-purple font-bold">
                                                        {o.full_name?.[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-sm font-medium text-white">{o.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${o.is_ai ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'}`}>
                                            {o.is_ai ? 'IA' : 'Humano'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">{o.specialty}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${o.is_online ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
                                            <span className={`text-xs ${o.is_online ? 'text-green-500' : 'text-slate-500'}`}>
                                                {o.is_online ? 'Online' : 'Offline'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => router.push(`/admin/oraculistas/editar/${o.id}`)}
                                                className="p-2 text-slate-400 hover:text-neon-cyan transition-colors rounded-lg hover:bg-white/5"
                                                title="Editar oraculista"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(o.id, o.full_name)}
                                                className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </GlassCard>
        </div>
    )
}
