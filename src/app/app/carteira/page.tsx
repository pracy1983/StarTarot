'use client'

import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Wallet, Sparkles, CreditCard, CheckCircle2, QrCode, Copy, Clock, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

export default function WalletPage() {
    const { profile } = useAuthStore()
    const [balance, setBalance] = useState<number | null>(null)
    const [packages, setPackages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPackage, setSelectedPackage] = useState<any>(null)
    const [step, setStep] = useState<'selection' | 'checkout' | 'pix'>('selection')
    const [cpf, setCpf] = useState('')
    const [pixData, setPixData] = useState<any>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    useEffect(() => {
        if (profile?.id) {
            fetchWalletData()
        }
    }, [profile?.id])

    const fetchWalletData = async () => {
        try {
            // 1. Saldo
            const { data: wallet } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', profile!.id)
                .single()
            setBalance(wallet?.balance || 0)

            // 2. Pacotes
            const { data: pkgs } = await supabase
                .from('credit_packages')
                .select('*')
                .eq('is_active', true)
                .order('price_brl', { ascending: true })
            setPackages(pkgs || [])
        } catch (err) {
            console.error('Error fetching wallet:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleStartPurchase = (pkg: any) => {
        setSelectedPackage(pkg)
        setStep('checkout')
    }

    const handleCreatePayment = async () => {
        if (!cpf || cpf.length < 11) {
            toast.error('Informe um CPF válido')
            return
        }

        setIsProcessing(true)
        try {
            const res = await fetch('/api/payments/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    packageId: selectedPackage.id,
                    cpfCnpj: cpf.replace(/\D/g, '')
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setPixData(data)
            setStep('pix')
            toast.success('PIX gerado com sucesso!')
        } catch (err: any) {
            toast.error(err.message || 'Erro ao processar pagamento')
        } finally {
            setIsProcessing(false)
        }
    }

    const copyPix = () => {
        if (pixData?.payload) {
            navigator.clipboard.writeText(pixData.payload)
            toast.success('Código PIX copiado!')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">Minha <span className="neon-text-purple">Carteira</span></h1>
                    <p className="text-slate-400">Adquira Lumina Coins para suas consultas místicas.</p>
                </div>

                <GlassCard className="border-neon-purple/20 bg-neon-purple/5 px-8 py-4" hover={false}>
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-neon-purple/20 flex items-center justify-center text-neon-purple">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Saldo Atual</p>
                            <p className="text-2xl font-black text-white">{balance} <span className="text-sm text-neon-purple font-normal">Coins</span></p>
                        </div>
                    </div>
                </GlassCard>
            </header>

            <AnimatePresence mode='wait'>
                {step === 'selection' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                        {packages.map((pkg) => (
                            <GlassCard
                                key={pkg.id}
                                className="relative flex flex-col items-center p-8 border-white/5 group hover:border-neon-purple/50 transition-all cursor-pointer"
                                onClick={() => handleStartPurchase(pkg)}
                            >
                                {pkg.tag_label && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neon-purple text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg shadow-neon-purple/30 z-10">
                                        {pkg.tag_label}
                                    </div>
                                )}

                                <div className="mb-6 p-4 rounded-2xl bg-white/5 group-hover:bg-neon-purple/10 transition-colors">
                                    <Sparkles size={32} className="text-neon-gold group-hover:scale-110 transition-transform" />
                                </div>

                                <h3 className="text-white font-bold mb-1">{pkg.name}</h3>
                                <div className="text-3xl font-black text-white mb-2">
                                    {pkg.coins_amount + (pkg.bonus_amount || 0)}
                                    <span className="text-xs text-slate-500 ml-1 font-normal uppercase">Coins</span>
                                </div>

                                {pkg.bonus_amount > 0 && (
                                    <div className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full mb-6">
                                        +{pkg.bonus_amount} BÔNUS GRÁTIS!
                                    </div>
                                )}

                                <div className="mt-auto w-full pt-6 border-t border-white/5">
                                    <p className="text-center text-slate-500 text-sm mb-4">Por apenas <span className="text-white font-bold">R$ {pkg.price_brl.toFixed(2)}</span></p>
                                    <NeonButton variant="purple" fullWidth>Selecionar</NeonButton>
                                </div>
                            </GlassCard>
                        ))}
                    </motion.div>
                )}

                {step === 'checkout' && selectedPackage && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-xl mx-auto"
                    >
                        <GlassCard className="p-8 border-white/5">
                            <button onClick={() => setStep('selection')} className="text-slate-500 hover:text-white mb-6 text-sm flex items-center">
                                ← Voltar para pacotes
                            </button>
                            <h2 className="text-xl font-bold text-white mb-6">Finalizar Recarga</h2>

                            <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/10">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-400">Pacote Escolhido:</span>
                                    <span className="text-white font-bold">{selectedPackage.name}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-400">Total em Moedas:</span>
                                    <span className="text-neon-purple font-black">{selectedPackage.coins_amount + selectedPackage.bonus_amount} Coins</span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                    <span className="text-slate-400 font-bold">Valor a Pagar:</span>
                                    <span className="text-2xl font-black text-white">R$ {selectedPackage.price_brl.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-400 ml-1 mb-2 block">Seu CPF (necessário para o PIX)</label>
                                    <input
                                        type="text"
                                        placeholder="000.000.000-00"
                                        value={cpf}
                                        onChange={(e) => setCpf(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-neon-purple/50"
                                    />
                                </div>
                                <NeonButton
                                    variant="purple"
                                    fullWidth
                                    size="lg"
                                    onClick={handleCreatePayment}
                                    loading={isProcessing}
                                >
                                    Gerar Pagamento PIX
                                </NeonButton>
                                <p className="text-[10px] text-center text-slate-600">
                                    Ao clicar em pagar, você será direcionado para o pagamento seguro via PIX.
                                </p>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {step === 'pix' && pixData && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-xl mx-auto text-center"
                    >
                        <GlassCard className="p-8 border-white/5">
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 mb-6">
                                    <QrCode size={32} />
                                </div>
                                <h2 className="text-2xl font-black text-white mb-2">Pagamento Gerado!</h2>
                                <p className="text-slate-400 text-sm mb-8">Escaneie o QR Code ou copie o código abaixo para pagar.</p>

                                <div className="p-4 bg-white rounded-2xl mb-8">
                                    <img src={`data:image/png;base64,${pixData.encodedImage}`} alt="QR Code PIX" className="w-64 h-64" />
                                </div>

                                <div className="w-full space-y-4">
                                    <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between border border-white/10">
                                        <p className="text-xs text-slate-400 font-mono truncate mr-4">{pixData.payload}</p>
                                        <button
                                            onClick={copyPix}
                                            className="p-2 bg-neon-purple/20 text-neon-purple rounded-lg hover:bg-neon-purple/30 transition-colors"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-center text-xs text-slate-500 font-medium">
                                        <Clock size={14} className="mr-2" />
                                        Expira em 24 horas
                                    </div>
                                    <NeonButton variant="purple" fullWidth onClick={() => setStep('selection')}>
                                        Já paguei, voltar
                                    </NeonButton>
                                    <p className="text-[10px] text-slate-600 italic">
                                        O saldo será creditado automaticamente após a confirmação bancária.
                                    </p>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Historico Simples Mockado (Temporário) */}
            <GlassCard className="border-white/5" hover={false}>
                <h3 className="text-lg font-bold text-white mb-6">Histórico Recente</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                <CheckCircle2 size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Recarga Inicial</p>
                                <p className="text-xs text-slate-500">Saldo inicial do sistema</p>
                            </div>
                        </div>
                        <span className="text-green-500 font-bold">+0 Coins</span>
                    </div>
                </div>
            </GlassCard>
        </div>
    )
}
