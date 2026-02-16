'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { GlowInput } from '@/components/ui/GlowInput'
import {
    ArrowLeft,
    Sparkles,
    MessageSquare,
    User,
    Clock,
    Send,
    AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function OracleAnswerPage() {
    const { id } = useParams()
    const router = useRouter()
    const { profile } = useAuthStore()
    const [consultation, setConsultation] = useState<any>(null)
    const [questions, setQuestions] = useState<any[]>([])
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)

    useEffect(() => {
        if (id) fetchConsultation()
    }, [id])

    const fetchConsultation = async () => {
        try {
            const { data, error } = await supabase
                .from('consultations')
                .select('*, client:profiles!client_id(*)')
                .eq('id', id)
                .single()

            if (error) throw error
            setConsultation(data)

            const { data: qData } = await supabase
                .from('consultation_questions')
                .select('*')
                .eq('consultation_id', id)
                .order('question_order', { ascending: true })

            if (qData) {
                setQuestions(qData)
                const initialAnswers: Record<string, string> = {}
                qData.forEach(q => {
                    initialAnswers[q.id] = q.answer_text || ''
                })
                setAnswers(initialAnswers)
            }
        } catch (err) {
            console.error('Erro ao carregar consulta:', err)
            toast.error('Erro ao carregar consulta')
            router.push('/app/dashboard')
        } finally {
            setLoading(false)
        }
    }

    const handleAnswerChange = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }))
    }

    const handleSubmit = async () => {
        const missingAnswers = questions.some(q => !answers[q.id]?.trim())
        if (missingAnswers) {
            toast.error('Por favor, responda todas as perguntas.')
            return
        }

        setSending(true)
        try {
            // 1. Salvar respostas
            for (const q of questions) {
                const { error: qError } = await supabase
                    .from('consultation_questions')
                    .update({ answer_text: answers[q.id] })
                    .eq('id', q.id)
                if (qError) throw qError
            }

            // 2. Atualizar status da consulta
            const { error: cError } = await supabase
                .from('consultations')
                .update({
                    status: 'answered',
                    answered_at: new Date().toISOString()
                })
                .eq('id', id)
            if (cError) throw cError

            // 3. Confirmar Transaction
            const { error: tError } = await supabase
                .from('transactions')
                .update({ status: 'confirmed' })
                .eq('user_id', profile!.id)
                .eq('type', 'earnings')
                .eq('status', 'pending')
                .filter('metadata->>consultation_id', 'eq', id)

            if (tError) console.error('Erro ao confirmar transação:', tError)

            // 4. Adicionar créditos ao Wallet do Oracle
            const { data: wallet } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', profile!.id)
                .maybeSingle()

            if (wallet) {
                await supabase
                    .from('wallets')
                    .update({
                        balance: (wallet.balance || 0) + consultation.total_credits,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', profile!.id)
            }

            // 5. Notificar Cliente
            await supabase.from('inbox_messages').insert({
                recipient_id: consultation.client_id,
                sender_id: profile!.id,
                title: `✨ ${profile!.name_fantasy || profile!.full_name} respondeu sua consulta!`,
                content: `As respostas para suas perguntas já estão disponíveis. Clique para ver.`,
                metadata: { consultation_id: id, type: 'consultation_answered' }
            })

            toast.success('Consulta respondida com sucesso! Créditos recebidos.')
            router.push('/app/dashboard')
        } catch (err: any) {
            console.error('Erro ao enviar respostas:', err)
            toast.error('Erro ao enviar respostas: ' + err.message)
        } finally {
            setSending(false)
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
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <button
                onClick={() => router.back()}
                className="flex items-center text-slate-400 hover:text-white transition-colors text-sm"
            >
                <ArrowLeft size={18} className="mr-2" /> Voltar
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center">
                        <Sparkles className="mr-3 text-neon-purple" />
                        Responder <span className="neon-text-purple ml-2">Consulta</span>
                    </h1>
                    <p className="text-slate-400 mt-1">Guie {consultation.client?.full_name} com sua sabedoria.</p>
                </div>
                <div className="px-4 py-2 bg-neon-gold/10 border border-neon-gold/30 rounded-xl">
                    <p className="text-[10px] text-neon-gold font-bold uppercase tracking-widest">Ganhos Previstos</p>
                    <p className="text-xl font-bold text-white">{consultation.total_credits} Créditos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lateral: Dados do Cliente */}
                <div className="lg:col-span-1 space-y-6">
                    <GlassCard hover={false} className="border-white/5">
                        <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center">
                            <User size={16} className="mr-2 text-neon-cyan" /> Consulente
                        </h3>
                        <div className="flex items-center space-x-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-neon-purple to-neon-cyan p-0.5">
                                <div className="w-full h-full rounded-full bg-deep-space flex items-center justify-center overflow-hidden">
                                    <img
                                        src={consultation.client?.avatar_url || `https://ui-avatars.com/api/?name=${consultation.client?.full_name}&background=0a0a1a&color=a855f7`}
                                        alt="Client"
                                    />
                                </div>
                            </div>
                            <div>
                                <p className="text-white font-bold">{consultation.client?.full_name}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                                    {consultation.client?.birth_date ? new Date(consultation.client.birth_date).toLocaleDateString('pt-BR') : 'Data não informada'}
                                </p>
                            </div>
                        </div>

                        {consultation.subject_name && (
                            <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Assunto da Consulta</p>
                                <p className="text-sm text-white font-medium">{consultation.subject_name}</p>
                                {consultation.subject_birthdate && (
                                    <p className="text-xs text-slate-400">Nasc: {new Date(consultation.subject_birthdate).toLocaleDateString('pt-BR')}</p>
                                )}
                            </div>
                        )}
                    </GlassCard>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start space-x-3">
                        <AlertCircle className="text-blue-400 flex-shrink-0" size={20} />
                        <p className="text-xs text-blue-200 leading-relaxed">
                            Responda com clareza e empatia. Suas palavras têm o poder de transformar vidas.
                        </p>
                    </div>
                </div>

                {/* Principal: Perguntas e Respostas */}
                <div className="lg:col-span-2 space-y-6">
                    {questions.map((q, idx) => (
                        <GlassCard key={q.id} hover={false} className="border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black text-neon-purple uppercase tracking-[0.2em]">Pergunta {idx + 1}</span>
                                <MessageSquare size={16} className="text-slate-600" />
                            </div>
                            <h4 className="text-lg font-medium text-white mb-6 leading-relaxed">
                                {q.question_text}
                            </h4>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Sua Resposta</label>
                                <textarea
                                    className="w-full bg-deep-space/50 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-neon-purple/50 transition-all h-40 resize-none"
                                    placeholder="Digite sua interpretação aqui..."
                                    value={answers[q.id] || ''}
                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                />
                                <div className="flex justify-between items-center px-1">
                                    <p className="text-[10px] text-slate-600">Mínimo de 50 caracteres para uma boa resposta.</p>
                                    <p className={`text-[10px] font-bold ${answers[q.id]?.length > 50 ? 'text-green-500' : 'text-slate-600'}`}>
                                        {answers[q.id]?.length || 0} caracteres
                                    </p>
                                </div>
                            </div>
                        </GlassCard>
                    ))}

                    <div className="flex justify-end gap-4">
                        <NeonButton
                            variant="purple"
                            size="lg"
                            className="px-12 h-14"
                            onClick={handleSubmit}
                            loading={sending}
                        >
                            <Send size={18} className="mr-2" />
                            Enviar Respostas e Receber Créditos
                        </NeonButton>
                    </div>
                </div>
            </div>
        </div>
    )
}
