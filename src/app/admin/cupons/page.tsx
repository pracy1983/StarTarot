'use client'

import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlowInput } from '@/components/ui/GlowInput'
import { NeonButton } from '@/components/ui/NeonButton'
import { Ticket, Search, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'

export default function AdminCouponsPage() {
    const { profile } = useAuthStore()
    const [coupons, setCoupons] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    const [newCoupon, setNewCoupon] = useState({
        code: '',
        discount_type: 'percent',
        discount_value: 10,
        max_uses: 100,
        expires_at: '',
        target_type: 'package'
    })

    useEffect(() => {
        fetchCoupons()
    }, [])

    const fetchCoupons = async () => {
        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*, profiles!coupons_owner_id_fkey(full_name)')
                .order('created_at', { ascending: false })

            if (error) throw error
            setCoupons(data || [])
        } catch (err: any) {
            console.error('Error fetching coupons:', err)
            toast.error('Erro ao carregar cupons')
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)

        try {
            if (!newCoupon.code || newCoupon.discount_value <= 0) {
                toast.error('Preencha os campos obrigatórios')
                return
            }

            const { error } = await supabase
                .from('coupons')
                .insert({
                    code: newCoupon.code.toUpperCase(),
                    discount_type: newCoupon.discount_type,
                    discount_value: newCoupon.discount_value,
                    target_type: newCoupon.target_type,
                    max_uses: newCoupon.max_uses || null,
                    expires_at: newCoupon.expires_at || null,
                    owner_id: profile?.id
                })

            if (error) throw error

            toast.success('Cupom criado com sucesso!')
            setNewCoupon({
                code: '',
                discount_type: 'percent',
                discount_value: 10,
                max_uses: 100,
                expires_at: '',
                target_type: 'package'
            })
            fetchCoupons()
        } catch (err: any) {
            console.error('Error creating coupon:', err)
            toast.error('Erro ao criar: ' + err.message)
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja excluir este cupom?')) return

        try {
            const { error } = await supabase.from('coupons').delete().eq('id', id)
            if (error) throw error
            setCoupons(prev => prev.filter(c => c.id !== id))
            toast.success('Cupom excluído')
        } catch (err) {
            toast.error('Erro ao excluir cupom')
        }
    }

    const filteredCoupons = coupons.filter(c =>
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-4 md:p-8 space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center">
                        <Ticket className="mr-3 text-neon-purple" />
                        Gestão de Cupons
                    </h1>
                    <p className="text-slate-400">Crie e gerencie cupons promocionais para a plataforma.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Create Section */}
                <div className="xl:col-span-1">
                    <GlassCard className="border-white/5 p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                            <Plus className="mr-2 text-neon-purple" size={20} />
                            Criar Novo Cupom
                        </h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <GlowInput
                                label="Código (Ex: BEMVINDO)"
                                value={newCoupon.code}
                                onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-400">Tipo de Cupom</label>
                                    <select
                                        value={newCoupon.target_type}
                                        onChange={e => setNewCoupon({ ...newCoupon, target_type: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-neon-purple/50"
                                    >
                                        <option value="package" className="bg-deep-space">Pacote de Créditos</option>
                                        <option value="consultation" className="bg-deep-space">Consulta</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-400">Tipo Desconto</label>
                                    <select
                                        value={newCoupon.discount_type}
                                        onChange={e => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-neon-purple/50"
                                    >
                                        <option value="percent" className="bg-deep-space">Porcentagem (%)</option>
                                        <option value="fixed_value" className="bg-deep-space">Valor Fixo</option>
                                    </select>
                                </div>
                            </div>

                            <GlowInput
                                label={newCoupon.discount_type === 'percent' ? "Desconto (%)" : "Valor do Desconto"}
                                type="number"
                                value={newCoupon.discount_value}
                                onChange={e => setNewCoupon({ ...newCoupon, discount_value: parseInt(e.target.value) })}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <GlowInput
                                    label="Máx Usos"
                                    type="number"
                                    value={newCoupon.max_uses}
                                    onChange={e => setNewCoupon({ ...newCoupon, max_uses: parseInt(e.target.value) })}
                                />
                                <GlowInput
                                    label="Validade"
                                    type="date"
                                    value={newCoupon.expires_at}
                                    onChange={e => setNewCoupon({ ...newCoupon, expires_at: e.target.value })}
                                />
                            </div>

                            <NeonButton loading={creating} variant="purple" fullWidth className="mt-4">
                                Gerar Cupom
                            </NeonButton>
                        </form>
                    </GlassCard>
                </div>

                {/* List Section */}
                <div className="xl:col-span-2 space-y-4">
                    <div className="flex bg-white/5 border border-white/10 rounded-2xl p-2">
                        <div className="flex items-center px-4 text-slate-500">
                            <Search size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por código..."
                            className="flex-1 bg-transparent py-3 text-white outline-none placeholder:text-slate-600"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/10">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Código</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Desconto</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Destino</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Criador</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredCoupons.map(coupon => (
                                        <tr key={coupon.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="text-white font-black tracking-widest">{coupon.code}</span>
                                            </td>
                                            <td className="px-6 py-4 text-white">
                                                {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `R$ ${coupon.discount_value}`}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold">
                                                <span className={coupon.target_type === 'package' ? 'text-neon-cyan' : 'text-neon-purple'}>
                                                    {coupon.target_type === 'package' ? 'CRÉDITOS' : 'CONSULTA'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-[10px] text-slate-400">
                                                    <span>{coupon.used_count || 0} / {coupon.max_uses || '∞'} usos</span>
                                                    {coupon.expires_at && (
                                                        <span>Expira: {format(new Date(coupon.expires_at), 'dd/MM/yyyy')}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-400 font-bold">
                                                {coupon.profiles?.full_name || 'SISTEMA'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleDelete(coupon.id)}
                                                    className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {filteredCoupons.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-600">
                                                Nenhum cupom encontrado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
