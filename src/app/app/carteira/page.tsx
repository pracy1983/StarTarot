'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import {
    CreditCard,
    Sparkles,
    ArrowUpRight,
    History,
    Zap,
    ShoppingBag,
    Qrcode
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function WalletPage() {
    const { profile } = useAuthStore()
    const [loading, setLoading] = useState(false)

    const packages = [
        { id: 1, credits: 20, price: 'R$ 29,90', bonus: 0, popular: false },
        { id: 2, credits: 50, price: 'R$ 59,90', bonus: 5, popular: true },
        { id: 3, credits: 100, price: 'R$ 99,90', bonus: 15, popular: false },
        { id: 4, credits: 250, price: 'R$ 199,90', bonus: 50, popular: false },
    ]

    const handleRecharge = async (pkg: any) => {
        setLoading(true)
        // Simulação da integração Asaas Sandbox
        setTimeout(() => {
            toast.success('Gerando PIX de teste (Asaas Sandbox)...')
            setLoading(false)
        }, 1500)
    }

    return (
        <div className="max-w-5xl mx-auto space-y-10">
            <header>
                <h1 className="text-3xl font-bold text-white mb-2">Sua Carteira Mística</h1>
                <p className="text-slate-400">Gerencie seus créditos para consultas profundas.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Saldo Atual */}
                <div className="lg:col-span-1">
                    <GlassCard glowColor="gold" className="h-full bg-gradient-to-br from-neon-gold/5 to-transparent">
                        <div className="flex flex-col items-center text-center py-6">
                            <div className="p-4 rounded-full bg-neon-gold/10 text-neon-gold mb-6 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
                                <Sparkles size={40} />
                            </div>
                            <p className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-2">Saldo Disponível</p>
                            <h2 className="text-5xl font-black text-white flex items-end">
                                {profile?.credits || 0}
                                <span className="text-lg text-neon-gold ml-2 mb-2">CR</span>
                            </h2>
                            <div className="mt-8 p-3 rounded-xl bg-white/5 border border-white/5 w-full">
                                <p className="text-[10px] text-slate-500 italic">
                                    "Sua energia está fluindo perfeitamente."
                                </p>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Histórico Simulado */}
                <div className="lg:col-span-2">
                    <GlassCard hover={false} className="h-full border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold flex items-center">
                                <History size={18} className="mr-2 text-neon-cyan" /> Movimentações Recentes
                            </h3>
                        </div>

                        <div className="space-y-4">
                            {[
                                { type: 'charge', desc: 'Consulta com Sacerdotisa Lunar', value: '-15 CR', date: 'Hoje, 14:20' },
                                { type: 'recharge', desc: 'Recarga Vital (Pacote Estrela)', value: '+50 CR', date: 'Ontem, 19:45' },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex items-center space-x-4">
                                        <div className={`p-2 rounded-lg ${item.type === 'recharge' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {item.type === 'recharge' ? <ArrowUpRight size={18} /> : <Zap size={18} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{item.desc}</p>
                                            <p className="text-[10px] text-slate-500">{item.date}</p>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-bold ${item.type === 'recharge' ? 'text-neon-cyan' : 'text-slate-400'}`}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                            <p className="text-center text-xs text-slate-600 pt-4">Nenhuma outra transação encontrada.</p>
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* Pacotes de Recarga */}
            <section className="space-y-6">
                <h3 className="text-xl font-bold flex items-center text-white">
                    <ShoppingBag size={20} className="mr-3 text-neon-purple" /> Amplie sua Energia
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {packages.map((pkg) => (
                        <motion.div key={pkg.id} whileHover={{ y: -5 }}>
                            <GlassCard
                                className={`flex flex-col h-full border-white/5 text-center relative ${pkg.popular ? 'border-neon-purple/40 bg-neon-purple/5' : ''}`}
                                glowColor={pkg.popular ? 'purple' : 'none'}
                            >
                                {pkg.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neon-purple text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg">
                                        Mais Escolhido
                                    </div>
                                )}

                                <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Créditos de Luz</h4>
                                <div className="flex items-center justify-center space-x-1 mb-2">
                                    <span className="text-4xl font-black text-white">{pkg.credits}</span>
                                    <span className="text-neon-purple font-bold">CR</span>
                                </div>

                                {pkg.bonus > 0 && (
                                    <p className="text-xs text-neon-cyan font-bold mb-6 flex items-center justify-center">
                                        <Zap size={12} className="mr-1" /> Bonus +{pkg.bonus} CR
                                    </p>
                                )}

                                <div className="mt-auto pt-6">
                                    <div className="text-2xl font-bold text-white mb-6 leading-none">
                                        {pkg.price}
                                    </div>
                                    <NeonButton
                                        variant={pkg.popular ? 'purple' : 'purple'}
                                        fullWidth
                                        size="md"
                                        onClick={() => handleRecharge(pkg)}
                                        loading={loading}
                                    >
                                        Recarregar {pkg.credits} CR
                                    </NeonButton>
                                    <p className="text-[10px] text-slate-500 mt-4 flex items-center justify-center">
                                        <Qrcode size={12} className="mr-1" /> Ativação Imediata via PIX
                                    </p>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    )
}
