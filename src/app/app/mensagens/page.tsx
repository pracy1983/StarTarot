'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { Inbox, Mail, MailOpen, ExternalLink, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { motion } from 'framer-motion'

export default function InboxPage() {
    const { profile } = useAuthStore()
    const router = useRouter()
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (profile?.id) {
            fetchMessages()
        }
    }, [profile?.id])

    const fetchMessages = async () => {
        try {
            const { data } = await supabase
                .from('inbox_messages')
                .select('*')
                .eq('recipient_id', profile!.id)
                .order('created_at', { ascending: false })

            setMessages(data || [])
        } catch (err) {
            console.error('Error fetching inbox:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleMessageClick = async (message: any) => {
        // Marcar como lida
        if (!message.is_read) {
            await supabase
                .from('inbox_messages')
                .update({ is_read: true })
                .eq('id', message.id)

            setMessages(prev => prev.map(m => m.id === message.id ? { ...m, is_read: true } : m))
        }

        // Redirecionar se for notificação de consulta
        if (message.metadata?.type === 'consultation_answered' && message.metadata?.consultation_id) {
            router.push(`/app/consulta/resposta/${message.metadata.consultation_id}`)
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
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold font-raleway flex items-center">
                        <Inbox size={24} className="mr-3 text-neon-purple" />
                        Caixa de <span className="neon-text-purple ml-2">Entrada</span>
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        {messages.filter(m => !m.is_read).length} mensagem(ns) não lida(s)
                    </p>
                </div>
            </div>

            {messages.length === 0 ? (
                <GlassCard className="border-white/5 text-center py-12" hover={false}>
                    <Inbox size={48} className="mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400">Nenhuma mensagem ainda.</p>
                </GlassCard>
            ) : (
                <div className="space-y-3">
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            <GlassCard
                                className={`border-white/5 cursor-pointer transition-all ${!msg.is_read ? 'bg-neon-purple/5 border-neon-purple/20' : ''
                                    }`}
                                onClick={() => handleMessageClick(msg)}
                            >
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                        {msg.is_read ? (
                                            <MailOpen size={24} className="text-slate-500" />
                                        ) : (
                                            <Mail size={24} className="text-neon-purple" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className={`font-bold ${msg.is_read ? 'text-slate-300' : 'text-white'}`}>
                                                {msg.title}
                                            </h3>
                                            <span className="text-xs text-slate-500">
                                                {new Date(msg.created_at).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        <p className={`text-sm ${msg.is_read ? 'text-slate-500' : 'text-slate-300'} line-clamp-2`}>
                                            {msg.content}
                                        </p>
                                        {msg.metadata?.type === 'consultation_answered' && (
                                            <div className="flex items-center mt-3 text-xs text-neon-cyan font-medium">
                                                <ExternalLink size={14} className="mr-1" />
                                                Clique para ver as respostas
                                            </div>
                                        )}
                                    </div>
                                    {!msg.is_read && (
                                        <div className="flex-shrink-0">
                                            <div className="w-2 h-2 rounded-full bg-neon-purple shadow-[0_0_10px_rgba(168,85,247,0.6)]" />
                                        </div>
                                    )}
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    )
}
