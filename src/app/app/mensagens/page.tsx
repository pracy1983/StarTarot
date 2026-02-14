'use client'

import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Inbox, MessageSquare, Clock, Search } from 'lucide-react'
import { motion } from 'framer-motion'

export default function MensagensPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Suas <span className="neon-text-purple">Mensagens</span></h1>
                <p className="text-slate-400">Acompanhe suas conversas e orientações dos oráculos.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lista de Conversas */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar conversas..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-neon-purple/50"
                        />
                    </div>

                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <button key={i} className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-neon-purple/30 transition-all flex items-center space-x-4 text-left group">
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-neon-purple font-bold">
                                    O
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-white truncate group-hover:text-neon-purple transition-colors">Oráculo {i}</h3>
                                    <p className="text-xs text-slate-500 truncate">Clique para ver a última mensagem...</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-slate-600 font-bold">12:30</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Área da Mensagem (Esboço) */}
                <div className="lg:col-span-2">
                    <GlassCard hover={false} className="h-[600px] flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-6 rounded-full bg-white/5 text-slate-700">
                            <MessageSquare size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-white">Selecione uma conversa</h3>
                        <p className="text-slate-500 max-w-xs">Escolha um oráculo ao lado para retomar suas consultas ou ver mensagens importantes.</p>
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
