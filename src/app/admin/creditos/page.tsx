'use client'

import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import {
    Wallet,
    Search,
    Plus,
    Sparkles,
    User
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function AdminCreditsPage() {
    const { profile } = useAuthStore()
    const [users, setUsers] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const [addingCredits, setAddingCredits] = useState<string | null>(null)
    const [creditAmount, setCreditAmount] = useState(50)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, email, role, avatar_url')
                .order('full_name')

            if (data) {
                // Para cada user, buscar saldo da wallet
                const usersWithBalance = await Promise.all(
                    data.map(async (u) => {
                        const { data: wallet } = await supabase
                            .from('wallets')
                            .select('balance')
                            .eq('user_id', u.id)
                            .single()
                        return { ...u, balance: wallet?.balance ?? 0 }
                    })
                )
                setUsers(usersWithBalance)
            }
        } catch (err) {
            console.error('Error fetching users:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleAddCredits = async (userId: string, userName: string) => {
        if (creditAmount <= 0) {
            toast.error('Informe um valor maior que 0')
            return
        }

        try {
            // 1. Buscar wallet atual
            const { data: wallet } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', userId)
                .single()

            if (!wallet) {
                // Criar wallet
                const { error: insertErr } = await supabase
                    .from('wallets')
                    .insert({ user_id: userId, balance: creditAmount })

                if (insertErr) throw insertErr
            } else {
                // Atualizar saldo
                const { error: updateErr } = await supabase
                    .from('wallets')
                    .update({ balance: wallet.balance + creditAmount, updated_at: new Date().toISOString() })
                    .eq('user_id', userId)

                if (updateErr) throw updateErr
            }

            // 2. Registrar transação
            await supabase.from('transactions').insert({
                user_id: userId,
                type: 'owner_grant',
                amount: creditAmount,
                status: 'confirmed',
                metadata: { granted_by: profile?.id, reason: 'Manual credit grant' }
            })

            toast.success(`+${creditAmount} CR adicionados para ${userName}!`)
            setAddingCredits(null)
            setCreditAmount(50)
            fetchUsers() // Refresh
        } catch (err: any) {
            toast.error('Erro: ' + err.message)
        }
    }

    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-raleway flex items-center">
                        <Wallet size={24} className="mr-3 text-neon-gold" />
                        Gerenciar <span className="neon-text-purple ml-2">Créditos</span>
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Adicione créditos manualmente para qualquer usuário.</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:border-neon-purple/50 outline-none transition-all"
                />
            </div>

            {/* Users Table */}
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
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuário</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo</th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden">
                                                    <img
                                                        src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.full_name}&background=12122a&color=a855f7`}
                                                        alt={u.full_name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{u.full_name || 'Sem nome'}</p>
                                                    <p className="text-[10px] text-slate-500">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${u.role === 'owner' ? 'bg-neon-gold/10 text-neon-gold'
                                                    : u.role === 'oracle' ? 'bg-neon-purple/10 text-neon-purple'
                                                        : 'bg-neon-cyan/10 text-neon-cyan'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-neon-gold flex items-center">
                                                <Sparkles size={14} className="mr-1" />
                                                {u.balance} CR
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {addingCredits === u.id ? (
                                                <div className="flex items-center justify-end space-x-2">
                                                    <input
                                                        type="number"
                                                        value={creditAmount}
                                                        onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                                                        className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white text-center outline-none focus:border-neon-purple/50"
                                                        min="1"
                                                    />
                                                    <button
                                                        onClick={() => handleAddCredits(u.id, u.full_name)}
                                                        className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/30 transition-colors"
                                                    >
                                                        Confirmar
                                                    </button>
                                                    <button
                                                        onClick={() => setAddingCredits(null)}
                                                        className="px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setAddingCredits(u.id)}
                                                    className="flex items-center space-x-1 px-3 py-1.5 bg-neon-purple/10 text-neon-purple rounded-lg text-xs font-bold hover:bg-neon-purple/20 transition-colors ml-auto"
                                                >
                                                    <Plus size={14} />
                                                    <span>Adicionar CR</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-slate-500 text-sm">
                                            Nenhum usuário encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </GlassCard>
        </div>
    )
}
