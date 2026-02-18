'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { Inbox, Mail, MailOpen, ExternalLink, Sparkles, Trash2, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function InboxPage() {
    const { profile } = useAuthStore()
    const router = useRouter()
    const searchParams = useSearchParams()
    const view = searchParams.get('view')
    const isOracleView = view === 'oracle'

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
    }, [profile?.id, isOracleView])

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

            let query = supabase.from('consultations')
                .select('*, oracle:profiles!oracle_id(full_name, avatar_url), client:profiles!client_id(full_name, avatar_url)')
                .eq('hidden_inbox', false)

            if (isOracleView) {
                query = query.eq('oracle_id', profile.id)
            } else {
                query = query.eq('client_id', profile.id)
            }

            const { data: consultationsData, error: cError } = await query.order('created_at', { ascending: false })

            if (cError) console.error('Error fetching consultations:', cError)

            // 3. Mesclar dados e evitar duplicidade
            const inboxIds = new Set(inboxData?.map(m => m.metadata?.consultation_id).filter(Boolean))

            const processedConsultations = (consultationsData || [])
                .filter(c => !inboxIds.has(c.id) && c.status === 'answered')
                .map(c => ({
                    id: `cons-${c.id}`,
                    title: isOracleView
                        ? `✅ Você respondeu a ${c.client?.full_name || 'um cliente'}`
                        : `✨ Resposta de ${c.oracle?.full_name || 'Oraculista'}`,
                    content: isOracleView
                        ? `Atendimento concluído. Clique para revisar.`
                        : `Sua consulta foi respondida. Clique para ver.`,
                    created_at: c.answered_at || c.created_at,
                    is_read: true, // Virtual consultations are duplicates of inbox messages usually, or already 'seen' status update.
                    metadata: { type: 'consultation_answered', consultation_id: c.id }
                }))

            const pendingConsultations = (consultationsData || [])
                .filter(c => c.status !== 'answered')
                //.filter(c => c.status !== 'canceled' && c.status !== 'rejected') // Allow canceled/rejected to show up for specific logic
                .filter(c => c.type !== 'video') // EXCLUDE VIDEO FROM INBOX
                .map(c => {
                    const isCanceled = c.status === 'canceled' || c.status === 'rejected'

                    if (isCanceled && isOracleView) {
                        return {
                            id: `lost-${c.id}`,
                            title: `🔴 Mensagem Perdida`,
                            content: `Tempo esgotado ou cancelado pelo cliente.`,
                            created_at: c.ended_at || c.created_at,
                            is_read: true,
                            metadata: {
                                type: 'consultation_lost',
                                target_user: c.client, // Oracle view, target is client
                                consultation_id: c.id,
                                is_lost: true
                            }
                        }
                    }

                    if (isCanceled && !isOracleView) {
                        return {
                            id: `canc-${c.id}`,
                            title: `🚫 Consulta Cancelada`,
                            content: `Toque para ver detalhes e reenviar.`,
                            created_at: c.ended_at || c.created_at,
                            is_read: true,
                            metadata: {
                                type: 'consultation_canceled',
                                target_user: c.oracle, // Client view, target is oracle
                                consultation_id: c.id
                            }
                        }
                    }

                    return {
                        id: `pend-${c.id}`,
                        title: isOracleView
                            ? `🔮 Nova consulta pendente!`
                            : `🔮 Consulta em processamento...`,
                        content: isOracleView
                            ? `${c.client?.full_name || 'Um cliente'} enviou uma mensagem. Responda agora!`
                            : `Aguardando resposta de ${c.oracle?.full_name || 'Oraculista'}.`,
                        created_at: c.created_at,
                        is_read: isOracleView ? false : true,
                        metadata: {
                            type: 'consultation_pending',
                            consultation_id: c.id,
                            target_user: isOracleView ? c.client : c.oracle // Oracle view, target is client; Client view, target is oracle
                        }
                    }
                })

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
        // Bloquear clique em mensagem perdida (Oráculo)
        if (message.metadata?.is_lost) {
            toast('Mensagem perdida. Não é possível responder.', { icon: '🚫' })
            return
        }

        // Redirecionar se for consulta respondida, pendente ou cancelada (Cliente)
        if ((message.metadata?.type === 'consultation_answered' || message.metadata?.type === 'consultation_pending' || message.metadata?.type === 'consultation_canceled') && message.metadata?.consultation_id) {
            // Se for uma mensagem real da inbox, marcar como lida
            if (typeof message.id === 'number' || (typeof message.id === 'string' && !message.id.startsWith('cons-') && !message.id.startsWith('pend-') && !message.id.startsWith('canc-') && !message.id.startsWith('lost-'))) {
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
            } else if (message.metadata?.type === 'consultation_canceled') {
                router.push(`/app/consulta/resposta/${message.metadata.consultation_id}`) // Re-use response page to show cancellation details
            } else if (message.metadata?.type === 'consultation_pending') {
                if (isOracleView) {
                    router.push(`/app/dashboard/consulta/${message.metadata.consultation_id}`)
                } else {
                    router.push(`/app/consulta/resposta/${message.metadata.consultation_id}`) // Pending view for client
                }
            }
        }
    }

    const handleDelete = async (e: React.MouseEvent, message: any) => {
        e.stopPropagation()

        const isVirtual = typeof message.id === 'string' && (message.id.startsWith('cons-') || message.id.startsWith('pend-') || message.id.startsWith('canc-') || message.id.startsWith('lost-'))
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
                <div className="flex items-center space-x-3">
                    <h2 className="text-2xl font-bold font-raleway flex items-center">
                        <Inbox size={24} className="mr-3 text-neon-purple" />
                        Caixa de <span className="neon-text-purple ml-2">Entrada</span>
                    </h2>
                    {messages.filter(m => !m.is_read).length > 0 && (
                        <div className="bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-bounce">
                            {messages.filter(m => !m.is_read).length}
                        </div>
                    )}
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
                                    className={`border-white/5 cursor-pointer group transition-all relative overflow-hidden ${!msg.is_read
                                        ? 'bg-neon-purple/5 border-neon-purple/20' // Subtle purple for unread
                                        : 'hover:bg-white/5'
                                        }`}
                                    onClick={() => handleMessageClick(msg)}
                                >
                                    {/* Unread Indicator Glow */}
                                    {!msg.is_read && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-neon-purple shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                                    )}

                                    <div className="relative pl-3">
                                        <button
                                            onClick={(e) => handleDelete(e, msg)}
                                            className="absolute -top-2 -right-2 p-2 rounded-full bg-deep-space border border-white/5 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            title="Remover"
                                        >
                                            <Trash2 size={16} />
                                        </button>

                                        <div className="flex items-start space-x-4">
                                            {/* Avatar Section */}
                                            <div className="flex-shrink-0">
                                                {msg.metadata?.type === 'consultation_pending' ? (
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-full border border-neon-purple/30 p-0.5">
                                                            <img
                                                                src={msg.metadata.target_user?.avatar_url || `https://ui-avatars.com/api/?name=${msg.metadata.target_user?.full_name || 'U'}&background=0a0a1a&color=a855f7`}
                                                                alt="User"
                                                                className="w-full h-full rounded-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="absolute -bottom-1 -right-1 bg-deep-space rounded-full p-1 border border-white/10">
                                                            <Sparkles size={12} className="text-neon-cyan animate-pulse" />
                                                        </div>
                                                    </div>
                                                ) : msg.is_read ? (
                                                    <Mail size={24} className="text-slate-500 mt-2" />
                                                ) : (
                                                    <Mail size={24} className="text-red-400 mt-2 animate-bounce" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0 pt-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h3 className={`font-bold text-base ${!msg.is_read ? 'text-white' : 'text-slate-300'}`}>
                                                        {msg.title}
                                                    </h3>
                                                    <span className={`text-xs ${!msg.is_read ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                                                        {new Date(msg.created_at).toLocaleDateString('pt-BR', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>

                                                {/* Content */}
                                                <p className={`text-sm ${!msg.is_read ? 'text-slate-200' : 'text-slate-400'} line-clamp-2`}>
                                                    {msg.content}
                                                </p>

                                                {/* Extra Actions / Info */}
                                                {msg.metadata?.type === 'consultation_pending' && !isOracleView && (
                                                    <div className="flex items-center mt-3 gap-3">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                router.push(`/app/consulta/${msg.metadata.target_user?.username || msg.metadata.target_user?.id}`) // Fallback if username missing
                                                            }}
                                                            className="text-xs flex items-center text-neon-purple hover:text-white transition-colors bg-neon-purple/10 px-3 py-1.5 rounded-lg border border-neon-purple/20 hover:bg-neon-purple/20"
                                                        >
                                                            <User size={12} className="mr-1.5" />
                                                            Ver Perfil
                                                        </button>
                                                        {msg.metadata.target_user?.full_name && (
                                                            <span className="text-xs text-slate-500">
                                                                {isOracleView ? 'Cliente:' : 'Oraculista:'} <strong className="text-slate-300">{msg.metadata.target_user.full_name}</strong>
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {msg.metadata?.type === 'consultation_answered' && (
                                                    <div className="flex items-center mt-3 text-xs text-neon-cyan font-medium bg-neon-cyan/5 w-fit px-3 py-1.5 rounded-lg border border-neon-cyan/10">
                                                        <ExternalLink size={14} className="mr-1.5" />
                                                        Clique para ver as respostas
                                                    </div>
                                                )}
                                            </div>
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
