'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { GlowInput } from '@/components/ui/GlowInput'
import { ThinkingAnimation } from '@/components/chat/ThinkingAnimation'
import {
    Send,
    ArrowLeft,
    Sparkles,
    Clock,
    AlertCircle,
    ShieldCheck,
    MoreVertical
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function ChatRoomPage() {
    const { id: oracleId } = useParams()
    const { profile } = useAuthStore()
    const router = useRouter()

    const [oracle, setOracle] = useState<any>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [isThinking, setIsThinking] = useState(false)
    const [loading, setLoading] = useState(true)
    const [chatId, setChatId] = useState<string | null>(null)
    const [timeLeft, setTimeLeft] = useState(0) // Em segundos por crédito

    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (oracleId) {
            fetchOracleAndChat()
        }
    }, [oracleId])

    useEffect(() => {
        if (chatId) {
            const subscription = supabase
                .channel(`chat:${chatId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `chat_id=eq.${chatId}`
                }, (payload) => {
                    setMessages(prev => [...prev, payload.new])
                    if (payload.new.sender_id !== profile?.id) {
                        setIsThinking(false)
                    }
                })
                .subscribe()

            return () => {
                subscription.unsubscribe()
            }
        }
    }, [chatId, profile?.id])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isThinking])

    const fetchOracleAndChat = async () => {
        try {
            // 1. Buscar detalhes do Oraculista
            const { data: oracleData, error: oracleError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', oracleId)
                .single()

            if (oracleError) throw oracleError
            setOracle(oracleData)

            // 2. Criar ou buscar Sessão de Chat (Lógica simplificada: uma sessão por vez)
            const { data: chatData, error: chatError } = await supabase
                .from('chats')
                .insert({
                    client_id: profile?.id,
                    oracle_id: oracleId,
                    status: 'active'
                })
                .select()
                .single()

            if (chatError) throw chatError
            setChatId(chatData.id)

            // 3. Buscar histórico (se houver)
            const { data: msgData } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', chatData.id)
                .order('created_at', { ascending: true })

            setMessages(msgData || [])
        } catch (err: any) {
            toast.error('Erro ao iniciar portal: ' + err.message)
            router.push('/app')
        } finally {
            setLoading(false)
        }
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || !chatId || !profile) return

        const content = newMessage
        setNewMessage('')

        try {
            const { error } = await supabase.from('messages').insert({
                chat_id: chatId,
                sender_id: profile.id,
                content: content
            })

            if (error) throw error

            if (oracle?.is_ai) {
                setIsThinking(true)
                // Aqui chamaremos a Edge Function ou API Route que processa a IA
                await processAIResponse(chatId, content)
            }
        } catch (err: any) {
            toast.error('Falha na conexão mística: ' + err.message)
        }
    }

    const processAIResponse = async (chatId: string, userMessage: string) => {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId,
                    message: userMessage,
                    oracleId
                })
            })

            if (!response.ok) throw new Error('O oráculo está em silêncio agora.')
        } catch (err: any) {
            setIsThinking(false)
            toast.error(err.message)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-deep-space flex flex-col items-center justify-center p-8">
                <div className="w-16 h-16 border-4 border-neon-purple border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(168,85,247,0.4)]" />
                <p className="mt-6 text-neon-purple font-bold tracking-widest animate-pulse">ABRINDO PORTAL...</p>
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col max-w-5xl mx-auto relative">
            {/* Header do Oráculo */}
            <GlassCard className="mb-4 flex items-center justify-between p-4 py-3 border-white/5" hover={false}>
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.push('/app')} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full border border-neon-purple/30 p-0.5">
                            <img
                                src={oracle?.avatar_url || `https://ui-avatars.com/api/?name=${oracle?.full_name}&background=0a0a1a&color=a855f7`}
                                className="w-full h-full rounded-full object-cover"
                                alt={oracle?.full_name}
                            />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-deep-space" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">{oracle?.full_name}</h3>
                        <p className="text-[10px] text-neon-cyan font-bold uppercase tracking-wider">{oracle?.specialty}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-6">
                    <div className="hidden md:flex flex-col items-end">
                        <div className="flex items-center text-neon-gold text-xs font-bold">
                            <Clock size={14} className="mr-1.5" /> 12:45 restantes
                        </div>
                        <div className="w-24 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                            <motion.div
                                animate={{ width: ['100%', '0%'] }}
                                transition={{ duration: 60 * 12, ease: "linear" }}
                                className="h-full bg-neon-gold shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                            />
                        </div>
                    </div>
                    <button className="p-2 text-slate-500 hover:text-white transition-colors">
                        <MoreVertical size={20} />
                    </button>
                </div>
            </GlassCard>

            {/* Área de Mensagens */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-6 px-4 py-6 hide-scrollbar glass rounded-2xl border border-white/5 mb-4"
            >
                {/* Aviso de Segurança */}
                <div className="flex justify-center">
                    <div className="bg-neon-purple/5 border border-neon-purple/20 rounded-lg px-4 py-2 flex items-center text-[10px] text-neon-purple/70 uppercase font-bold tracking-widest">
                        <ShieldCheck size={14} className="mr-2" />
                        Conexão Protegida por Criptografia Estelar
                    </div>
                </div>

                {messages.map((msg, idx) => {
                    const isMe = msg.sender_id === profile?.id
                    return (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl p-4 ${isMe
                                    ? 'bg-neon-purple text-white shadow-[0_10px_20px_rgba(168,85,247,0.2)]'
                                    : 'bg-white/5 border border-white/10 text-slate-200'
                                }`}>
                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                <p className={`text-[9px] mt-2 opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </motion.div>
                    )
                })}

                {isThinking && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                    >
                        <ThinkingAnimation />
                    </motion.div>
                )}
            </div>

            {/* Input de Mensagem */}
            <form onSubmit={handleSendMessage} className="relative group">
                <input
                    placeholder="Sussurre sua pergunta para o universo..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isThinking}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-6 pr-20 text-white outline-none focus:border-neon-purple/50 group-hover:border-white/20 transition-all shadow-2xl"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || isThinking}
                        className="p-3 bg-neon-purple text-white rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </form>

            {/* Rodapé Informativo */}
            <div className="flex justify-center mt-3 text-[10px] text-slate-600 space-x-4">
                <span className="flex items-center"><Sparkles size={10} className="mr-1" /> Consulta Assistida por IA DeepSeek</span>
                <span className="flex items-center"><AlertCircle size={10} className="mr-1" /> O tempo consome créditos em tempo real</span>
            </div>
        </div>
    )
}
