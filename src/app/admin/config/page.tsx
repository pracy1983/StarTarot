'use client'

import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Settings, Brain, Shield, Database, Sparkles, MessageSquare, Save } from 'lucide-react'
import { GlowInput } from '@/components/ui/GlowInput'
import { NeonButton } from '@/components/ui/NeonButton'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminConfigPage() {
    const [masterPrompt, setMasterPrompt] = useState('')
    const [commission, setCommission] = useState('70')
    const [creditPrice, setCreditPrice] = useState('0.10')
    const [signupBonus, setSignupBonus] = useState('50')
    const [updatingRules, setUpdatingRules] = useState(false)
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const init = async () => {
            setLoading(true)
            await Promise.all([fetchSettings(), fetchBusinessRules()])
            setLoading(false)
        }
        init()
    }, [])

    const fetchSettings = async () => {
        try {
            const { data } = await supabase
                .from('global_settings')
                .select('value')
                .eq('key', 'master_ai_prompt')
                .maybeSingle()

            if (data) setMasterPrompt(data.value)
        } catch (err) {
            console.error('Error fetching settings:', err)
        }
    }

    const fetchBusinessRules = async () => {
        try {
            const { data: comm } = await supabase.from('global_settings').select('value').eq('key', 'oracle_commission_pc').maybeSingle()
            const { data: price } = await supabase.from('global_settings').select('value').eq('key', 'credit_price_brl').maybeSingle()
            const { data: bonus } = await supabase.from('global_settings').select('value').eq('key', 'signup_bonus_credits').maybeSingle()

            if (comm) setCommission(comm.value)
            if (price) setCreditPrice(price.value)
            if (bonus) setSignupBonus(bonus.value)
        } catch (err) {
            console.error('Error fetching business rules:', err)
        }
    }

    const handleUpdateRules = async () => {
        setUpdatingRules(true)
        try {
            await supabase.from('global_settings').upsert([
                { key: 'oracle_commission_pc', value: commission },
                { key: 'credit_price_brl', value: creditPrice },
                { key: 'signup_bonus_credits', value: signupBonus }
            ])
            toast.success('Regras de negócio atualizadas!')
        } catch (err: any) {
            toast.error('Erro ao salvar regras: ' + err.message)
        } finally {
            setUpdatingRules(false)
        }
    }

    const handleSavePrompt = async () => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('global_settings')
                .upsert({
                    key: 'master_ai_prompt',
                    value: masterPrompt,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error
            toast.success('Prompt Mestre atualizado com sucesso!')
        } catch (err: any) {
            toast.error('Erro ao salvar: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="p-8 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Configurações do <span className="neon-text-purple">Portal</span></h1>
                <p className="text-slate-400">Gerencie APIs, valores de créditos e parâmetros globais do Star Tarot.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Prompt Master IA */}
                <GlassCard className="border-white/5 md:col-span-2 space-y-6" hover={false}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 text-neon-purple">
                            <Brain size={20} />
                            <h3 className="font-bold text-white uppercase tracking-wider text-sm">Prompt Master das IAs</h3>
                        </div>
                        <NeonButton
                            variant="purple"
                            size="sm"
                            onClick={handleSavePrompt}
                            loading={saving}
                        >
                            <Save size={16} className="mr-2" /> Salvar Prompt
                        </NeonButton>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs text-slate-400 italic">
                            * Este prompt será enviado como prefixo em todas as consultas feitas por Oraculistas de IA.
                            Use para definir regras globais de comportamento, tom de voz e restrições.
                        </p>
                        <textarea
                            value={masterPrompt}
                            onChange={(e) => setMasterPrompt(e.target.value)}
                            className="w-full h-64 bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-slate-300 focus:border-neon-purple/50 outline-none transition-all font-mono leading-relaxed"
                            placeholder="Ex: Você é um oráculo divinatório de alta precisão..."
                        />
                    </div>
                </GlassCard>

                {/* Configurações de API */}
                <GlassCard className="border-white/5 space-y-6" hover={false}>
                    <div className="flex items-center space-x-3 text-neon-cyan mb-2">
                        <Database size={20} />
                        <h3 className="font-bold text-white uppercase tracking-wider text-sm">Integrações de IA</h3>
                    </div>

                    <GlowInput
                        label="DeepSeek API Key"
                        placeholder="sk-..."
                        type="password"
                        icon={<Database size={18} />}
                    />

                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modelo Global IA</p>
                        <select className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:border-neon-purple/50 outline-none transition-all">
                            <option value="deepseek-chat" className="bg-deep-space">DeepSeek Chat (Reasoning)</option>
                            <option value="deepseek-coder" className="bg-deep-space">DeepSeek Coder</option>
                        </select>
                    </div>

                    <NeonButton size="sm">Salvar Chaves</NeonButton>
                </GlassCard>

                {/* Parâmetros de negócio */}
                <GlassCard className="border-white/5 space-y-6" hover={false}>
                    <div className="flex items-center space-x-3 text-neon-gold mb-2">
                        <Shield size={20} />
                        <h3 className="font-bold text-white uppercase tracking-wider text-sm">Regras de Negócio</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Valor 1 Crédito (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={creditPrice}
                                onChange={e => setCreditPrice(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:border-neon-purple/50 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Comissão Oráculo (%)</label>
                            <input
                                type="number"
                                value={commission}
                                onChange={e => setCommission(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:border-neon-purple/50 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Bônus Boas-vindas (Créditos)</label>
                            <input
                                type="number"
                                value={signupBonus}
                                onChange={e => setSignupBonus(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:border-neon-purple/50 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center space-x-3">
                            <MessageSquare size={18} className="text-neon-cyan" />
                            <span className="text-sm">Abater créditos por minuto</span>
                        </div>
                        <input type="checkbox" defaultChecked className="w-5 h-5 accent-neon-purple" />
                    </div>

                    <NeonButton
                        variant="gold"
                        size="sm"
                        onClick={handleUpdateRules}
                        loading={updatingRules}
                    >
                        Atualizar Regras
                    </NeonButton>
                </GlassCard>
            </div>
        </div>
    )
}

