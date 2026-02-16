
'use client'

import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Wallet, Sparkles, CreditCard, CheckCircle2, QrCode, Copy, Clock, AlertCircle, Ticket, Barcode } from 'lucide-react'
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
    const [couponCode, setCouponCode] = useState('')
    const [billingType, setBillingType] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX')
    const [pixData, setPixData] = useState<any>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [transactions, setTransactions] = useState<any[]>([])

    // Custom Amount State
    const [customAmount, setCustomAmount] = useState('')
    const COIN_PRICE = 0.20 // 5 Coins = 1 BRL (Example, adjust as needed)

    // Billing Info State
    const [billingInfo, setBillingInfo] = useState({
        cpf: '',
        postal_code: '',
        address: '',
        address_number: '',
        city: '',
        state: ''
    })
    const [showBillingModal, setShowBillingModal] = useState(false)

    useEffect(() => {
        if (profile?.id) {
            fetchWalletData()
            fetchTransactions()
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

    const fetchTransactions = async () => {
        const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', profile!.id)
            .order('created_at', { ascending: false })
            .limit(5)
        setTransactions(data || [])
    }

    const handleStartPurchase = (pkg: any) => {
        // Validate Billing Info
        if (!billingInfo.cpf || !billingInfo.address) {
            setSelectedPackage(pkg)
            setShowBillingModal(true)
            return
        }

        setSelectedPackage(pkg)
        setStep('checkout')
    }

    const calculateBestCredits = (amount: number) => {
        if (!amount) return 0

        // Find the best package ratio (credits per BRL)
        // We look for the most expensive package that is still <= amount, 
        // effectively giving the "bulk discount" of that tier.
        // If amount is higher than the biggest package, we use the biggest package's ratio.

        const sortedPackages = [...packages].sort((a, b) => b.price_brl - a.price_brl)
        const bestPackage = sortedPackages.find(p => p.price_brl <= amount) || sortedPackages[sortedPackages.length - 1] // Fallback to smallest if amount is tiny (though we have min check)

        if (!bestPackage) return Math.floor(amount / COIN_PRICE) // Fallback to base price if no packages

        const ratio = (bestPackage.coins_amount + bestPackage.bonus_amount) / bestPackage.price_brl
        return Math.floor(amount * ratio)
    }

    const handleCustomPurchase = () => {
        const amount = parseFloat(customAmount.replace(',', '.'))
        if (!amount || amount < 5) {
            toast.error('Valor mínimo: R$ 5,00')
            return
        }

        const coins = calculateBestCredits(amount)

        const customPkg = {
            id: 'custom',
            name: 'Recarga Personalizada',
            coins_amount: coins,
            bonus_amount: 0,
            price_brl: amount
        }

        handleStartPurchase(customPkg)
    }

    const saveBillingInfo = async () => {
        if (!billingInfo.cpf || !billingInfo.address || !billingInfo.postal_code) {
            toast.error('Preencha os campos obrigatórios')
            return
        }

        setIsProcessing(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    cpf: billingInfo.cpf,
                    postal_code: billingInfo.postal_code,
                    address: billingInfo.address,
                    address_number: billingInfo.address_number,
                    city: billingInfo.city,
                    state: billingInfo.state
                })
                .eq('id', profile!.id)

            if (error) throw error

            toast.success('Dados salvos!')
            setShowBillingModal(false)
            if (selectedPackage) {
                setStep('checkout')
            }
        } catch (err) {
            toast.error('Erro ao salvar dados')
        } finally {
            setIsProcessing(false)
        }
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
                    cpfCnpj: cpf.replace(/\D/g, ''),
                    billingType,
                    couponCode: couponCode || undefined
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            if (billingType === 'PIX') {
                setPixData(data)
                setStep('pix')
                toast.success('PIX gerado com sucesso!')
            } else {
                // Redirecionar para invoice (Boleto ou Cartão)
                if (data.invoiceUrl) {
                    window.location.href = data.invoiceUrl
                } else {
                    toast.success('Pagamento criado. Verifique seu email.')
                    setStep('selection')
                }
            }
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
                    <p className="text-slate-400">Adquira Créditos para suas consultas místicas.</p>
                </div>

                <GlassCard className="border-neon-purple/20 bg-neon-purple/5 px-8 py-4" hover={false}>
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-neon-purple/20 flex items-center justify-center text-neon-purple">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Saldo Atual</p>
                            <p className="text-2xl font-black text-white">{balance} <span className="text-sm text-neon-purple font-normal">Créditos</span></p>
                        </div>
                    </div>
                </GlassCard>
            </header>

            {/* Custom Amount Section */}
            <GlassCard className="border-neon-cyan/20 bg-neon-cyan/5 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">Recarga Personalizada</h2>
                    <p className="text-sm text-slate-400">Escolha o valor exato que deseja recarregar.</p>
                </div>
                <div className="flex items-center gap-4 bg-black/20 p-2 rounded-xl border border-white/5">
                    <span className="text-slate-400 font-bold ml-2">R$</span>
                    <input
                        type="number"
                        value={customAmount}
                        onChange={e => setCustomAmount(e.target.value)}
                        placeholder="0,00"
                        className="bg-transparent border-none outline-none text-white font-black text-xl w-24"
                    />
                    <div className="h-8 w-px bg-white/10" />
                    <div className="text-right pr-2">
                        <span className="block text-xs text-slate-500 font-bold uppercase">Você Recebe</span>
                        <span className="text-neon-cyan font-black">
                            {customAmount ? calculateBestCredits(parseFloat(customAmount.replace(',', '.'))) : 0} Créditos
                        </span>
                    </div>
                    <div className="flex flex-col items-center">
                        <NeonButton variant="cyan" size="sm" onClick={handleCustomPurchase}>
                            Comprar
                        </NeonButton>
                        <p className="text-[10px] text-slate-500 mt-2 italic">* Créditos não são reembolsáveis</p>
                    </div>
                </div>
            </GlassCard>

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
                                <div className="text-3xl font-black text-white mb-2 flex items-baseline justify-center">
                                    {pkg.coins_amount}
                                    {pkg.bonus_amount > 0 && <span className="text-lg text-green-400 ml-1">+{pkg.bonus_amount}</span>}
                                    <span className="text-xs text-slate-500 ml-1 font-normal uppercase">Créditos</span>
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
                                    <div className="text-right">
                                        <span className="text-neon-purple font-black block">{selectedPackage.coins_amount + selectedPackage.bonus_amount} Créditos</span>
                                        {selectedPackage.bonus_amount > 0 && <span className="text-[10px] text-green-400">({selectedPackage.coins_amount} + {selectedPackage.bonus_amount} Bônus)</span>}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-4">
                                    <span className="text-slate-400 font-bold">Valor a Pagar:</span>
                                    <span className="text-2xl font-black text-white">R$ {selectedPackage.price_brl.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Cupom */}
                                <div>
                                    <label className="text-sm font-medium text-slate-400 ml-1 mb-2 flex items-center">
                                        <Ticket size={14} className="mr-2" /> Possui um Cupom?
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Código do Cupom"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-neon-gold/50 placeholder-slate-600"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                                            Será aplicado no checkout
                                        </div>
                                    </div>
                                </div>

                                {/* CPF */}
                                <div>
                                    <label className="text-sm font-medium text-slate-400 ml-1 mb-2 block">Seu CPF (obrigatório)</label>
                                    <input
                                        type="text"
                                        placeholder="000.000.000-00"
                                        value={cpf}
                                        onChange={(e) => setCpf(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-neon-purple/50"
                                    />
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className="text-sm font-medium text-slate-400 ml-1 mb-2 block">Forma de Pagamento</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            onClick={() => setBillingType('PIX')}
                                            className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${billingType === 'PIX' ? 'bg-neon-purple/20 border-neon-purple text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                        >
                                            <QrCode size={20} className="mb-2" />
                                            <span className="text-xs font-bold">PIX</span>
                                        </button>
                                        <button
                                            onClick={() => setBillingType('CREDIT_CARD')}
                                            className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${billingType === 'CREDIT_CARD' ? 'bg-neon-purple/20 border-neon-purple text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                        >
                                            <CreditCard size={20} className="mb-2" />
                                            <span className="text-xs font-bold">Cartão</span>
                                        </button>
                                        <button
                                            onClick={() => setBillingType('BOLETO')}
                                            className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${billingType === 'BOLETO' ? 'bg-neon-purple/20 border-neon-purple text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                        >
                                            <Barcode size={20} className="mb-2" />
                                            <span className="text-xs font-bold">Boleto</span>
                                        </button>
                                    </div>
                                </div>

                                <NeonButton
                                    variant="purple"
                                    fullWidth
                                    size="lg"
                                    onClick={handleCreatePayment}
                                    loading={isProcessing}
                                >
                                    {billingType === 'PIX' ? 'Gerar PIX' : 'Ir para Pagamento'}
                                </NeonButton>
                                <p className="text-[10px] text-center text-slate-600">
                                    Ambiente seguro via Asaas. Seus dados estão protegidos.<br />
                                    <span className="text-red-400 font-bold uppercase mt-1 block">Ao comprar, você declara estar ciente de que os créditos não são reembolsáveis.</span>
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
                {/* Billing Modal */}
                {showBillingModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <GlassCard className="max-w-md w-full p-8 border-neon-purple/50 shadow-2xl">
                            <h2 className="text-xl font-bold text-white mb-4">Complete seu Cadastro</h2>
                            <p className="text-slate-400 text-sm mb-6">Para sua primeira recarga, precisamos de alguns dados para emissão da nota fiscal (obrigatório por lei).</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">CPF</label>
                                    <input
                                        value={billingInfo.cpf}
                                        onChange={e => setBillingInfo({ ...billingInfo, cpf: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-neon-purple"
                                        placeholder="000.000.000-00"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">CEP</label>
                                        <input
                                            value={billingInfo.postal_code}
                                            onChange={e => setBillingInfo({ ...billingInfo, postal_code: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-neon-purple"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cidade/UF</label>
                                        <input
                                            value={billingInfo.city} // Simplificado, idealmente auto-complete pelo CEP
                                            onChange={e => setBillingInfo({ ...billingInfo, city: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-neon-purple"
                                            placeholder="Cidade - UF"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Endereço Completo</label>
                                    <input
                                        value={billingInfo.address}
                                        onChange={e => setBillingInfo({ ...billingInfo, address: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-neon-purple"
                                        placeholder="Rua, Número, Bairro"
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={() => setShowBillingModal(false)}
                                        className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5"
                                    >
                                        Cancelar
                                    </button>
                                    <NeonButton
                                        variant="purple"
                                        fullWidth
                                        onClick={saveBillingInfo}
                                        loading={isProcessing}
                                    >
                                        Salvar e Continuar
                                    </NeonButton>
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
                    {transactions.length > 0 ? transactions.map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {t.amount > 0 ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{t.metadata?.description || 'Transação'}</p>
                                    <p className="text-xs text-slate-500">{new Date(t.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <span className={`font-bold ${t.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {t.amount > 0 ? '+' : ''}{t.amount} Créditos
                            </span>
                        </div>
                    )) : (
                        <p className="text-slate-500 text-sm">Nenhuma transação recente.</p>
                    )}
                </div>
            </GlassCard>
        </div >
    )
}
