'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { ArrowLeft, Sparkles, Calendar, User as UserIcon, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function ConsultationResponsePage() {
    const { id } = useParams()
    const router = useRouter()

    const [consultation, setConsultation] = useState<any>(null)
    const [oracle, setOracle] = useState<any>(null)
    const [questions, setQuestions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) fetchConsultation()
    }, [id])

    const fetchConsultation = async () => {
        try {
            const { data: consultationData, error: consultationError } = await supabase
                .from('consultations')
                .select('*')
                .eq('id', id)
                .single()

            if (consultationError) throw consultationError
            setConsultation(consultationData)

            const { data: oracleData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', consultationData.oracle_id)
                .single()

            setOracle(oracleData)

            const { data: questionsData } = await supabase
                .from('consultation_questions')
                .select('*')
                .eq('consultation_id', id)
                .order('question_order', { ascending: true })

            setQuestions(questionsData || [])
        } catch (err: any) {
            console.error('Error loading consultation:', err)
            toast.error('Erro ao carregar consulta: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!consultation || !oracle) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <p className="text-slate-400">Consulta não encontrada.</p>
                <NeonButton variant="purple" onClick={() => router.push('/app/mensagens')}>Voltar para Mensagens</NeonButton>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.push('/app/mensagens')}
                    className="flex items-center text-slate-400 hover:text-white transition-colors text-sm"
                >
                    <ArrowLeft size={18} className="mr-2" /> Voltar para Mensagens
                </button>
            </div>

            {/* Oracle Header */}
            <GlassCard className="border-white/5" hover={false}>
                <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 rounded-full border border-neon-purple/30 p-0.5">
                        <img
                            src={oracle.avatar_url || `https://ui-avatars.com/api/?name=${oracle.full_name}&background=0a0a1a&color=a855f7`}
                            className="w-full h-full rounded-full object-cover"
                            alt={oracle.full_name}
                        />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-white">{oracle.full_name}</h2>
                        <p className="text-neon-cyan text-xs font-medium uppercase tracking-wider">{oracle.specialty}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500">Consulta realizada em</p>
                        <p className="text-sm font-bold text-white">
                            {new Date(consultation.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                </div>

                {consultation.subject_name && (
                    <div className="flex items-center space-x-4 pt-4 border-t border-white/5">
                        <div className="flex items-center text-sm text-slate-300">
                            <UserIcon size={16} className="mr-2 text-neon-purple" />
                            Consulta sobre: <strong className="ml-1 text-white">{consultation.subject_name}</strong>
                        </div>
                        {consultation.subject_birthdate && (
                            <div className="flex items-center text-sm text-slate-300">
                                <Calendar size={16} className="mr-2 text-neon-cyan" />
                                Nascido em: <strong className="ml-1 text-white">
                                    {new Date(consultation.subject_birthdate).toLocaleDateString('pt-BR')}
                                </strong>
                            </div>
                        )}
                    </div>
                )}
            </GlassCard>

            {/* Questions & Answers */}
            <div className="space-y-6">
                {questions.map((q, idx) => (
                    <motion.div
                        key={q.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <GlassCard className="border-white/5" hover={false}>
                            {/* Pergunta */}
                            <div className="mb-6">
                                <div className="flex items-center space-x-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center text-neon-purple text-sm font-bold">
                                        {idx + 1}
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Sua Pergunta</h3>
                                </div>
                                <p className="text-white leading-relaxed pl-11">{q.question_text}</p>
                            </div>

                            {/* Resposta */}
                            <div className="border-t border-white/5 pt-6">
                                <div className="flex items-center space-x-3 mb-3">
                                    <Sparkles size={20} className="text-neon-gold" />
                                    <h3 className="text-sm font-bold text-neon-gold uppercase tracking-wider">Resposta do Oráculo</h3>
                                </div>
                                <div className="bg-gradient-to-br from-neon-purple/5 to-transparent p-6 rounded-xl border border-neon-purple/10">
                                    <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                                        {q.answer_text || 'Processando resposta...'}
                                    </p>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-6 bg-white/5 border border-white/10 rounded-xl">
                <div className="text-sm text-slate-400 text-center sm:text-left">
                    <p>Gostou da consulta? Você pode fazer uma nova pergunta ao mesmo oráculo.</p>
                </div>
                <NeonButton
                    variant="purple"
                    onClick={() => router.push(`/app/consulta/${oracle.id}`)}
                >
                    <MessageSquare size={18} className="mr-2" />
                    Nova Consulta
                </NeonButton>
            </div>
        </div>
    )
}
