'use client'

import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { GlowInput } from '@/components/ui/GlowInput'
import { Ticket, Percent, Users, Calendar, Trash2, Plus, Info, RefreshCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function OracleCouponsPage() {
    const { profile } = useAuthStore()
    const [coupons, setCoupons] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        discount_percent: 10,
        max_uses: 50,
        expires_at: ''
    })

    useEffect(() => {
        if (profile) fetchCoupons()
    }, [profile])

    const fetchCoupons = async () => {
        setLoading(true)
        try {
            if (!profile?.id) return

            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('owner_id', profile.id) // Only my coupons
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
                toast.error('Preencha o código e desconto')
                return
            }

            if (newCoupon.discount_percent > 30) {
                toast.error('Oraculistas podem dar no máximo 30% de desconto.')
                return
            }

            const { error } = await supabase
                .from('coupons')
                .insert({
                    code: newCoupon.code.toUpperCase(),
                    discount_percent: newCoupon.discount_percent,
                    max_uses: newCoupon.max_uses || null,
                    expires_at: newCoupon.expires_at || null,
                    owner_id: profile!.id
                })

            if (error) throw error

            toast.success('Cupom criado com sucesso!')
            setNewCoupon({ code: '', discount_percent: 10, max_uses: 50, expires_at: '' })
            fetchCoupons()
        } catch (err: any) {
            console.error('Error creating coupon:', err)
            // Handle unique constraint
            if (err.message.includes('unique constraint')) {
                toast.error('Este código já existe. Tente outro.')
            } else {
                toast.error('Erro ao criar cupom: ' + err.message)
            }
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja apagar este cupom? Clientes não poderão mais usá-lo.')) return

        try {
            const { error } = await supabase
                .from('coupons')
                .delete()
                .eq('id', id)
                .eq('owner_id', profile!.id) // Security check

            if (error) throw error
            toast.success('Cupom removido')
            setCoupons(prev => prev.filter(c => c.id !== id))
        } catch (err: any) {
            toast.error('Erro ao apagar: ' + err.message)
        }
    }

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let result = (profile?.full_name?.substring(0, 3).toUpperCase() || 'ORA')
        for (let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setNewCoupon(prev => ({ ...prev, code: result }))
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Meus <span className="neon-text-purple">Cupons</span></h1>
                    <p className="text-slate-400">Crie códigos promocionais para atrair novos clientes.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Form */}
                <div className="lg:col-span-1">
                    <GlassCard className="border-neon-purple/30 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-purple to-neon-cyan" />
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                            <Plus size={20} className="mr-2 text-neon-purple" /> Novo Cupom
                        </h2>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-400 ml-1 mb-1 block">Código Promocional</label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <GlowInput
                                            value={newCoupon.code}
                                            onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                                            placeholder="EX: PROMO10"
                                            icon={<Ticket size={16} />}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={generateRandomCode}
                                        className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-neon-cyan transition-colors"
                                        title="Gerar Aleatório"
                                    >
                                        <RefreshCcw size={20} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-400 ml-1 mb-1 block">Desconto (%)</label>
                                <GlowInput
                                    type="number"
                                    value={newCoupon.discount_percent}
                                    onChange={e => setNewCoupon({ ...newCoupon, discount_percent: parseInt(e.target.value) })}
                                    min={1}
                                    max={30}
                                    icon={<Percent size={16} />}
                                />
                                <p className="text-[10px] text-slate-500 mt-1 ml-1">Máximo permitido para Oraculistas: 30%</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-400 ml-1 mb-1 block">Limite de Usos</label>
                                <GlowInput
                                    type="number"
                                    value={newCoupon.max_uses}
                                    onChange={e => setNewCoupon({ ...newCoupon, max_uses: parseInt(e.target.value) })}
                                    min={1}
                                    icon={<Users size={16} />}
                                    placeholder="Ex: 50"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-400 ml-1 mb-1 block">Validade (Opcional)</label>
                                <GlowInput
                                    type="date"
                                    value={newCoupon.expires_at}
                                    onChange={e => setNewCoupon({ ...newCoupon, expires_at: e.target.value })}
                                    icon={<Calendar size={16} />}
                                />
                            </div>

                            <div className="pt-4">
                                <NeonButton
                                    variant="purple"
                                    fullWidth
                                    loading={creating}
                                    type="submit"
                                >
                                    Criar Cupom
                                </NeonButton>
                            </div>

                            <div className="bg-neon-purple/5 border border-neon-purple/10 rounded-xl p-3 text-xs text-slate-400 flex gap-2">
                                <Info size={16} className="text-neon-purple shrink-0 mt-0.5" />
                                <p>O desconto incide sobre a compra de créditos na plataforma. O valor recebido por minuto de consulta permanece inalterado para você.</p>
                            </div>
                        </form>
                    </GlassCard>
                </div>

                {/* List */}
                <div className="lg:col-span-2">
                    <GlassCard className="h-full border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Seus Cupons Ativos</h2>
                            <div className="bg-white/5 px-3 py-1 rounded-full text-xs text-slate-400 border border-white/10">
                                Total: {coupons.length}
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center p-12">
                                <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : coupons.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Ticket size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Você ainda não criou nenhum cupom.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {coupons.map(coupon => (
                                    <div key={coupon.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-neon-purple/30 transition-colors group">
                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                            <div className="w-12 h-12 rounded-full bg-neon-purple/10 text-neon-purple flex items-center justify-center font-bold text-lg border border-neon-purple/20">
                                                {coupon.discount_percent}%
                                            </div>
                                            <div className="text-left">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-black text-lg tracking-wider">{coupon.code}</span>
                                                    {!coupon.active && <span className="bg-red-500/20 text-red-500 text-[10px] px-2 py-0.5 rounded uppercase font-bold">Inativo</span>}
                                                </div>
                                                <div className="flex items-center text-xs text-slate-400 gap-3 mt-1">
                                                    <span className="flex items-center"><Users size={12} className="mr-1" /> {coupon.used_count} / {coupon.max_uses || '∞'} usos</span>
                                                    {coupon.expires_at && (
                                                        <span className="flex items-center"><Calendar size={12} className="mr-1" /> Expira em: {format(new Date(coupon.expires_at), 'dd/MM/yyyy')}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(coupon.code)
                                                    toast.success('Código copiado!')
                                                }}
                                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                title="Copiar Código"
                                            >
                                                <Ticket size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(coupon.id)}
                                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Excluir Cupom"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
