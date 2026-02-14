'use client'

import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Settings, Brain, Shield, Database, Sparkles, MessageSquare } from 'lucide-react'
import { GlowInput } from '@/components/ui/GlowInput'
import { NeonButton } from '@/components/ui/NeonButton'

export default function AdminConfigPage() {
    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Configurações do <span className="neon-text-purple">Portal</span></h1>
                <p className="text-slate-400">Gerencie APIs, valores de créditos e parâmetros globais do Star Tarot.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Configurações de API */}
                <GlassCard className="border-white/5 space-y-6" hover={false}>
                    <div className="flex items-center space-x-3 text-neon-cyan mb-2">
                        <Brain size={20} />
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
                            <option value="deepseek-chat">DeepSeek Chat (Reasoning)</option>
                            <option value="deepseek-coder">DeepSeek Coder</option>
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
                        <GlowInput
                            label="Valor 1 Crédito (R$)"
                            defaultValue="1.00"
                            type="number"
                        />
                        <GlowInput
                            label="Comissão Guias (%)"
                            defaultValue="70"
                            type="number"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center space-x-3">
                            <MessageSquare size={18} className="text-neon-cyan" />
                            <span className="text-sm">Abater créditos por minuto</span>
                        </div>
                        <input type="checkbox" defaultChecked className="w-5 h-5 accent-neon-purple" />
                    </div>

                    <NeonButton variant="gold" size="sm">Atualizar Regras</NeonButton>
                </GlassCard>

                {/* Visual / SEO */}
                <GlassCard className="border-white/5 md:col-span-2 space-y-6" hover={false}>
                    <div className="flex items-center space-x-3 text-neon-purple mb-2">
                        <Sparkles size={20} />
                        <h3 className="font-bold text-white uppercase tracking-wider text-sm">Personalização Visual</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GlowInput label="Nome da Plataforma" defaultValue="Star Tarot" />
                        <GlowInput label="Slogan Principal" defaultValue="O universo tem algo a lhe dizer." />
                        <GlowInput label="URL da Logo" defaultValue="/logo.png" />
                    </div>
                </GlassCard>
            </div>
        </div>
    )
}
