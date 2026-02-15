'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Modal } from '@/components/ui/Modal'
import { GlowInput } from '@/components/ui/GlowInput'
import {
    CreditCard,
    Sparkles,
    ArrowUpRight,
    History,
    Zap,
    ShoppingBag,
    QrCode,
    MapPin,
    FileText,
    Globe
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function WalletPage() {
    const { profile, setProfile } = useAuthStore()
    const [loading, setLoading] = useState(false)
    const [balance, setBalance] = useState(0)
    const [transactions, setTransactions] = useState<any[]>([])
    const [loadingData, setLoadingData] = useState(true)

    // Billing Modal State
    const [isBillingModalOpen, setIsBillingModalOpen] = useState(false)
    const [isInternational, setIsInternational] = useState(false)
    const [billingLoading, setBillingLoading] = useState(false)
    const [pendingPackage, setPendingPackage] = useState<any>(null)

    const [billingData, setBillingData] = useState({
        cpf: '',
        zip_code: '',
        address: '',
        address_number: '',
        address_complement: '',
        neighborhood: '',
        city: '',
        state: '',
        country: 'Brasil'
    })

    useEffect(() => {
        if (profile?.id) {
            fetchWalletData()
            // Init billing data if exists
            setBillingData({
                cpf: profile.cpf || '',
                zip_code: profile.zip_code || '',
                address: profile.address || '',
                address_number: profile.address_number || '',
                address_complement: profile.address_complement || '',
                neighborhood: profile.neighborhood || '',
                city: profile.city || '',
                state: profile.state || '',
                country: profile.country || 'Brasil'
            })
            if (profile.country && profile.country !== 'Brasil') {
                setIsInternational(true)
            }
        }
    }, [profile?.id])

    const fetchWalletData = async () => {
        try {
            const { data: walletData } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', profile!.id)
                .single()

            setBalance(walletData?.balance ?? 0)

            const { data: txData } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', profile!.id)
                .order('created_at', { ascending: false })
                .limit(10)

            setTransactions(txData || [])
        } catch (err) {
            console.error('Wallet data error:', err)
        } finally {
            setLoadingData(false)
        }
    }

    const packages = [
        { id: 1, credits: 20, price: 'R$ 29,90', bonus: 0, popular: false },
        { id: 2, credits: 50, price: 'R$ 59,90', bonus: 5, popular: true },
        { id: 3, credits: 100, price: 'R$ 99,90', bonus: 15, popular: false },
        { id: 4, credits: 250, price: 'R$ 199,90', bonus: 50, popular: false },
    ]

    // --- Billing Logic ---

    const formatCPF = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1')
    }

    const formatCEP = (value: string) => {
        return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9)
    }

    const handleCepBlur = async () => {
        if (isInternational) return
        const cep = billingData.zip_code.replace(/\D/g, '')
        if (cep.length === 8) {
            try {
                setBillingLoading(true)
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
                const data = await res.json()
                if (!data.erro) {
                    setBillingData(prev => ({
                        ...prev,
                        address: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf
                    }))
                }
            } catch (error) {
                console.error('Erro ao buscar CEP', error)
            } finally {
                setBillingLoading(false)
            }
        }
    }

    const validateBilling = () => {
        if (!isInternational) {
            if (billingData.cpf.length < 14) return false // CPF incompleto
            if (!billingData.zip_code || !billingData.address || !billingData.address_number || !billingData.city || !billingData.state) return false
        } else {
            if (!billingData.address || !billingData.city || !billingData.country) return false
        }
        return true
    }

    const saveBilling = async () => {
        if (!validateBilling()) {
            toast.error('Preencha todos os campos obrigatórios.')
            return
        }
        setBillingLoading(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update(billingData)
                .eq('id', profile!.id)

            if (error) throw error

            setProfile({ ...profile!, ...billingData })
            setIsBillingModalOpen(false)
            toast.success('Dados de faturamento salvos!')

            if (pendingPackage) {
                proceedToRecharge(pendingPackage)
            }
        } catch (err: any) {
            toast.error('Erro ao salvar dados: ' + err.message)
        } finally {
            setBillingLoading(false)
        }
    }

    const handleRechargeClick = (pkg: any) => {
        // Verifica se tem dados de faturamento (CPF e Endereço)
        const hasBilling = profile?.cpf && profile?.address && profile?.address_number

        if (!hasBilling) {
            setPendingPackage(pkg)
            setIsBillingModalOpen(true)
        } else {
            proceedToRecharge(pkg)
        }
    }

    const proceedToRecharge = async (pkg: any) => {
        setLoading(true)
        // Simulação de criação de PIX
        setTimeout(() => {
            toast.success(`Gerando PIX de teste para ${pkg.price}...`)
            setLoading(false)
            setPendingPackage(null)
        }, 1500)
    }

    const formatTxType = (type: string) => {
        switch (type) {
            case 'credit_purchase': return 'Recarga'
            case 'consultation_charge': return 'Consulta'
            case 'owner_grant': return 'Créditos do Admin'
            case 'refund': return 'Reembolso'
            default: return type
        }
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
                                {loadingData ? '...' : balance}
                                <span className="text-lg text-neon-gold ml-2 mb-2">CR</span>
                            </h2>
                        </div>
                    </GlassCard>
                </div>

                {/* Histórico Real */}
                <div className="lg:col-span-2">
                    <GlassCard hover={false} className="h-full border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold flex items-center">
                                <History size={18} className="mr-2 text-neon-cyan" /> Movimentações Recentes
                            </h3>
                        </div>

                        <div className="space-y-4">
                            {loadingData ? (
                                <p className="text-center text-xs text-slate-500 py-8">Carregando...</p>
                            ) : transactions.length === 0 ? (
                                <p className="text-center text-xs text-slate-500 py-8">Nenhuma transação encontrada.</p>
                            ) : (
                                transactions.map((tx) => {
                                    const isCredit = tx.type === 'credit_purchase' || tx.type === 'owner_grant' || tx.type === 'refund' || tx.type === 'earnings'
                                    return (
                                        <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                            <div className="flex items-center space-x-4">
                                                <div className={`p-2 rounded-lg ${isCredit ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {isCredit ? <ArrowUpRight size={18} /> : <Zap size={18} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{formatTxType(tx.type)}</p>
                                                    <p className="text-[10px] text-slate-500">
                                                        {new Date(tx.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`text-sm font-bold ${isCredit ? 'text-neon-cyan' : 'text-slate-400'}`}>
                                                {isCredit ? '+' : '-'}{tx.amount} CR
                                            </span>
                                        </div>
                                    )
                                })
                            )}
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
                                        variant="purple"
                                        fullWidth
                                        size="md"
                                        onClick={() => handleRechargeClick(pkg)}
                                        loading={loading}
                                    >
                                        Recarregar {pkg.credits} CR
                                    </NeonButton>
                                    <p className="text-[10px] text-slate-500 mt-4 flex items-center justify-center">
                                        <QrCode size={12} className="mr-1" /> Ativação Imediata via PIX
                                    </p>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Modal de Faturamento */}
            <Modal
                isOpen={isBillingModalOpen}
                onClose={() => setIsBillingModalOpen(false)}
                title="Complete seu Cadastro"
                className="max-w-xl"
            >
                <div className="space-y-6">
                    <p className="text-sm text-slate-400">
                        Para emitir sua nota fiscal e validar sua compra, precisamos de alguns dados.
                    </p>

                    <div className="flex items-center space-x-2 text-sm text-slate-300 bg-white/5 p-3 rounded-lg cursor-pointer max-w-max" onClick={() => setIsInternational(!isInternational)}>
                        <Globe size={16} className={isInternational ? 'text-neon-cyan' : 'text-slate-500'} />
                        <span className={isInternational ? 'text-neon-cyan font-bold' : ''}>Moro fora do Brasil</span>
                    </div>

                    {!isInternational && (
                        <GlowInput
                            label="CPF"
                            icon={<FileText size={18} />}
                            placeholder="000.000.000-00"
                            value={billingData.cpf}
                            onChange={(e) => setBillingData({ ...billingData, cpf: formatCPF(e.target.value) })}
                        />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <GlowInput
                            label="CEP / Código Postal"
                            icon={<MapPin size={18} />}
                            placeholder="00000-000"
                            value={billingData.zip_code}
                            onChange={(e) => setBillingData({ ...billingData, zip_code: isInternational ? e.target.value : formatCEP(e.target.value) })}
                            onBlur={handleCepBlur}
                        />
                        <GlowInput
                            label={isInternational ? "País" : "Estado"}
                            value={isInternational ? billingData.country : billingData.state}
                            onChange={(e) => setBillingData({ ...billingData, [isInternational ? 'country' : 'state']: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <GlowInput
                                label="Endereço"
                                value={billingData.address}
                                onChange={(e) => setBillingData({ ...billingData, address: e.target.value })}
                            />
                        </div>
                        <GlowInput
                            label="Número"
                            value={billingData.address_number}
                            onChange={(e) => setBillingData({ ...billingData, address_number: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <GlowInput
                            label="Complemento"
                            value={billingData.address_complement}
                            onChange={(e) => setBillingData({ ...billingData, address_complement: e.target.value })}
                        />
                        <GlowInput
                            label="Bairro"
                            value={billingData.neighborhood}
                            onChange={(e) => setBillingData({ ...billingData, neighborhood: e.target.value })}
                        />
                    </div>

                    {!isInternational && (
                        <GlowInput
                            label="Cidade"
                            value={billingData.city}
                            onChange={(e) => setBillingData({ ...billingData, city: e.target.value })}
                        />
                    )}

                    <div className="pt-4">
                        <NeonButton
                            variant="purple"
                            fullWidth
                            size="lg"
                            onClick={saveBilling}
                            loading={billingLoading}
                        >
                            Salvar e Continuar
                        </NeonButton>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
