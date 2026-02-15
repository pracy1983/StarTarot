'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { Inbox, Mail, MailOpen, ExternalLink, Sparkles, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function InboxPage() {
    const { profile } = useAuthStore()
    const router = useRouter()
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (profile?.id) {
            fetchMessages()

            // Inscrever para atualizações em tempo real
            const channel = supabase
                .channel('inbox_updates')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'inbox_messages',
                        filter: `recipient_id=eq.${profile.id}`
                    },
                    () => {
                        fetchMessages()
                    }
                )
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }
    }, [profile?.id])

    const fetchMessages = async () => {
        if (!profile?.id) return

        try {
            // 1. Buscar notificações da inbox
            const { data: inboxData, error: iError } = await supabase
                .from('inbox_messages')
                .select('*')
                .eq('recipient_id', profile.id)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })

            if (iError) console.error('Error fetching inbox:', iError)

            // 2. Buscar consultas (não ocultas da inbox)
            const { data: consultationsData, error: cError } = await supabase
                .from('consultations')
                .select('*, oracle:profiles!oracle_id(full_name)')
                .eq('client_id', profile.id)
                .eq('hidden_inbox', false)
                .order('created_at', { ascending: false })

            if (cError) console.error('Error fetching consultations:', cError)

            // 3. Mesclar dados e evitar duplicidade
            const inboxIds = new Set(inboxData?.map(m => m.metadata?.consultation_id).filter(Boolean))

            const processedConsultations = (consultationsData || [])
                .filter(c => !inboxIds.has(c.id) && c.status === 'answered')
                .map(c => ({
                    id: `cons-${c.id}`,
                    title: `✨ Resposta de ${c.oracle?.full_name || 'Oraculista'}`,
                    content: `Sua consulta foi respondida. Clique para ver.`,
                    created_at: c.answered_at || c.created_at,
                    is_read: false,
                    metadata: { type: 'consultation_answered', consultation_id: c.id }
                }))

            const pendingConsultations = (consultationsData || [])
                .filter(c => c.status !== 'answered')
                .map(c => ({
                    id: `pend-${c.id}`,
                    title: `🔮 Consulta em processamento...`,
                    content: `Sua consulta com ${c.oracle?.full_name || 'Oraculista'} está sendo preparada.`,
                    created_at: c.created_at,
                    is_read: true,
                    metadata: { type: 'consultation_pending', consultation_id: c.id }
                }))

            const allMessages = [
                ...(inboxData || []),
                ...processedConsultations,
                ...pendingConsultations
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

            setMessages(allMessages)
        } catch (err) {
            console.error('Error fetching inbox:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleMessageClick = async (message: any) => {
        // Redirecionar se for consulta respondida
        if ((message.metadata?.type === 'consultation_answered' || message.metadata?.type === 'consultation_pending') && message.metadata?.consultation_id) {
            // Se for uma mensagem real da inbox, marcar como lida
            if (typeof message.id === 'number' || (typeof message.id === 'string' && !message.id.startsWith('cons-') && !message.id.startsWith('pend-'))) {
                if (!message.is_read) {
                    await supabase
                        .from('inbox_messages')
                        .update({ is_read: true })
                        .eq('id', message.id)

                    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, is_read: true } : m))
                }
            }
            if (message.metadata?.type === 'consultation_answered') {
                router.push(`/app/consulta/resposta/${message.metadata.consultation_id}`)
            }
        }
    }

    const handleDelete = async (e: React.MouseEvent, message: any) => {
        e.stopPropagation()

        const isVirtual = typeof message.id === 'string' && (message.id.startsWith('cons-') || message.id.startsWith('pend-'))
        const consultationId = message.metadata?.consultation_id

        try {
            if (isVirtual && consultationId) {
                // Para mensagens virtuais (consultas), marcamos como hidden_inbox
                const { error } = await supabase
                    .from('consultations')
                    .update({ hidden_inbox: true })
                    .eq('id', consultationId)
                if (error) throw error
            } else {
                // Para mensagens reais da inbox table
                await supabase.from('inbox_messages').update({ is_deleted: true }).eq('id', message.id)
            }

            setMessages(prev => prev.filter(m => m.id !== message.id))
            toast.success('Mensagem removida')
        } catch (err) {
            console.error('Error deleting message:', err)
            toast.error('Erro ao deletar')
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
                    <AnimatePresence mode="popLayout">
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <GlassCard
                                    className={`border-white/5 cursor-pointer group transition-all ${!msg.is_read ? 'bg-neon-purple/5 border-neon-purple/20' : ''
                                        }`}
                                    onClick={() => handleMessageClick(msg)}
                                >
                                    <div className="relative">
                                        <button
                                            onClick={(e) => handleDelete(e, msg)}
                                            className="absolute -top-2 -right-2 p-2 rounded-full bg-deep-space border border-white/5 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            title="Remover"
                                        >
                                            <Trash2 size={16} />
                                        </button>

                                        <div className="flex items-start space-x-4">
                                            <div className="flex-shrink-0">
                                                {msg.metadata?.type === 'consultation_pending' ? (
                                                    <Sparkles size={24} className="text-neon-cyan animate-pulse" />
                                                ) : msg.is_read ? (
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
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}
