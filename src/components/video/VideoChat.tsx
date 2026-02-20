'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
    id: string
    sender_id: string
    text: string
    timestamp: number
}

interface VideoChatProps {
    channelId: string
    userId: string
    userName: string
}

export function VideoChat({ channelId, userId, userName }: VideoChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputText, setInputText] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const channelRef = useRef<any>(null)

    useEffect(() => {
        const channel = supabase.channel(`video_chat_${channelId}`, {
            config: {
                broadcast: { self: true }
            }
        })

        channel
            .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
                setMessages(prev => [...prev, payload])
            })
            .subscribe()

        channelRef.current = channel

        return () => {
            supabase.removeChannel(channel)
        }
    }, [channelId])

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    const sendMessage = () => {
        if (!inputText.trim() || !channelRef.current) return

        const newMessage: Message = {
            id: Math.random().toString(36).substr(2, 9),
            sender_id: userId,
            text: inputText.trim(),
            timestamp: Date.now()
        }

        channelRef.current.send({
            type: 'broadcast',
            event: 'chat_message',
            payload: newMessage
        })

        setInputText('')
    }

    return (
        <div className="absolute right-4 bottom-24 z-[70] flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-slate-900/90 backdrop-blur-xl border border-white/10 w-72 md:w-80 h-96 rounded-2xl shadow-2xl flex flex-col mb-4 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <span className="text-white font-bold text-sm">Chat de Apoio</span>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white text-xs">Fechar</button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                            {messages.length === 0 ? (
                                <p className="text-slate-500 text-xs text-center italic mt-10">
                                    Use o chat se tiver problemas com som ou vídeo.
                                </p>
                            ) : (
                                messages.map(msg => (
                                    <div key={msg.id} className={`flex flex-col ${msg.sender_id === userId ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[80%] p-2.5 rounded-2xl text-sm ${msg.sender_id === userId ? 'bg-neon-purple text-white rounded-tr-none' : 'bg-white/10 text-slate-200 rounded-tl-none'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-white/5 flex gap-2">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Digite algo..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-purple/50"
                            />
                            <button
                                onClick={sendMessage}
                                className="p-2 bg-neon-purple rounded-xl text-white hover:bg-neon-purple/80 transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-2xl transition-all ${isOpen ? 'bg-neon-purple text-white' : 'bg-slate-800 text-white hover:bg-slate-700'} border border-white/10`}
            >
                <div className="relative">
                    <MessageSquare size={24} />
                    {messages.length > 0 && !isOpen && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-800" />
                    )}
                </div>
            </button>
        </div>
    )
}
