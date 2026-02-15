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
        discount_percent: 10,
        max_uses: 100,
        expires_at: ''
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
            if (!newCoupon.code || newCoupon.discount_percent <= 0) {
                toast.error('Preencha os campos obrigatórios')
                return
            }

            const { error } = await supabase
                .from('coupons')
                .insert({
                    code: newCoupon.code.toUpperCase(),
                    discount_percent: newCoupon.discount_percent,
                    max_uses: newCoupon.max_uses || null,
                    expires_at: newCoupon.expires_at || null,
                    owner_id: profile?.id
                })

            if (error) throw error

            toast.success('Cupom criado com sucesso!')
            setNewCoupon({ code: '', discount_percent: 10, max_uses: 100, expires_at: '' })
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
        <div className="p-8 space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                        <Ticket className="mr-3 text-neon-gold" /> Gestão de <span className="neon-text-gold ml-2">Cupons</span>
                    </h1>
                    <p className="text-slate-400">Crie e gerencie códigos de desconto para o sistema.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Form */}
                <GlassCard className="border-white/5 h-fit">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                        <Plus size={18} className="mr-2 text-neon-green" /> Novo Cupom
                    </h3>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <GlowInput
                            label="Código (Ex: BEMVINDO10)"
                            value={newCoupon.code}
                            onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                            placeholder="CÓDIGO"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400 ml-1">Desconto (%)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={newCoupon.discount_percent}
                                    onChange={e => setNewCoupon({ ...newCoupon, discount_percent: parseInt(e.target.value) })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-neon-gold/50"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400 ml-1">Máx. Usos</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={newCoupon.max_uses}
                                    onChange={e => setNewCoupon({ ...newCoupon, max_uses: parseInt(e.target.value) })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-neon-gold/50"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-400 ml-1">Validade (Opcional)</label>
                            <input
                                type="date"
                                value={newCoupon.expires_at}
                                onChange={e => setNewCoupon({ ...newCoupon, expires_at: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-neon-gold/50"
                            />
                        </div>

                        <NeonButton type="submit" variant="gold" fullWidth loading={creating}>
                            Criar Cupom
                        </NeonButton>
                    </form>
                </GlassCard>

                {/* List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cupom..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-neon-gold/50"
                        />
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <p className="text-slate-500 text-center py-10">Carregando...</p>
                        ) : filteredCoupons.length === 0 ? (
                            <p className="text-slate-500 text-center py-10">Nenhum cupom encontrado.</p>
                        ) : (
                            filteredCoupons.map(coupon => (
                                <GlassCard key={coupon.id} className="border-white/5 flex items-center justify-between p-4" hover={false}>
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 rounded-xl bg-neon-gold/10 flex items-center justify-center text-neon-gold">
                                            <Ticket size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-white tracking-wider">{coupon.code}</h4>
                                            <div className="flex items-center space-x-3 text-xs text-slate-400">
                                                <span className="text-neon-green font-bold">{coupon.discount_percent}% OFF</span>
                                                <span>•</span>
                                                <span>{coupon.used_count} / {coupon.max_uses || '∞'} usos</span>
                                                {coupon.profiles && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-slate-500">Por: {coupon.profiles.full_name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="text-right text-xs text-slate-500 hidden sm:block">
                                            <p>{coupon.expires_at ? `Expira em ${format(new Date(coupon.expires_at), 'dd/MM/yyyy')}` : 'Sem validade'}</p>
                                            <p className={coupon.active ? 'text-green-500' : 'text-red-500'}>
                                                {coupon.active ? 'Ativo' : 'Inativo'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(coupon.id)}
                                            className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </GlassCard>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
