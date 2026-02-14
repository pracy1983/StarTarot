'use client'

import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { BarChart3, TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, DollarSign } from 'lucide-react'

export default function AdminFinanceiroPage() {
    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Fluxo <span className="neon-text-gold">Financeiro</span></h1>
                <p className="text-slate-400">Controle de ganhos, comissões de oraculistas e recargas de clientes.</p>
            </div>

            {/* Resumo Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard glowColor="gold" className="border-white/5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-xl bg-neon-gold/10 text-neon-gold border border-neon-gold/20">
                            <DollarSign size={20} />
                        </div>
                        <span className="flex items-center text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            +24% <ArrowUpRight size={12} className="ml-1" />
                        </span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Receita Mensal</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">R$ 15.420,00</h3>
                </GlassCard>

                <GlassCard glowColor="purple" className="border-white/5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-xl bg-neon-purple/10 text-neon-purple border border-neon-purple/20">
                            <Wallet size={20} />
                        </div>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Créditos em Circulação</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">45.200 <span className="text-sm font-normal text-slate-500">CR</span></h3>
                </GlassCard>

                <GlassCard glowColor="cyan" className="border-white/5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-xl bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Custo Operacional IA</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">R$ 120,45</h3>
                </GlassCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Tabela de Transações Recentes */}
                <div className="xl:col-span-2">
                    <GlassCard className="border-white/5 p-4" hover={false}>
                        <h3 className="text-white font-bold mb-6 flex items-center">
                            <BarChart3 size={18} className="mr-2 text-neon-gold" /> Vendas de Créditos Recentes
                        </h3>
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 transition-all hover:border-white/10">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center font-bold">
                                            $
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Recarga #992{i}</p>
                                            <p className="text-xs text-slate-500">Cliente {i} • Pix • 10:45</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white">R$ 50,00</p>
                                        <p className="text-[10px] text-green-400 uppercase font-bold">Confirmado</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>

                {/* Resumo de Pagamento a Oraculistas */}
                <div className="xl:col-span-1">
                    <GlassCard className="border-white/5 p-4" hover={true}>
                        <h3 className="text-white font-bold mb-6">Split de Oraculistas</h3>
                        <div className="space-y-6">
                            {[
                                { name: 'Mestre Arcanus', amount: 'R$ 0,00', note: 'Margem 100% IA' },
                                { name: 'Sacerdotisa Lunar', amount: 'R$ 640,00', note: 'Ag. Pagamento' },
                                { name: 'Dr. Cosmos', amount: 'R$ 1.250,50', note: 'Ag. Pagamento' },
                            ].map((o, idx) => (
                                <div key={idx} className="flex flex-col space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300">{o.name}</span>
                                        <span className="text-sm font-bold text-white">{o.amount}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{o.note}</span>
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                                        <div className={`h-full bg-neon-purple`} style={{ width: idx === 0 ? '0%' : idx === 1 ? '40%' : '75%' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
