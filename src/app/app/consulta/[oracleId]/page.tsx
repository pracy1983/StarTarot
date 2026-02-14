'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { QuestionInput, SubjectInfo } from '@/components/consultation/QuestionInput'
import { ArrowLeft, Send, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function NewConsultationPage() {
    const { oracleId } = useParams()
    const router = useRouter()
    const { profile } = useAuthStore()

    const [oracle, setOracle] = useState<any>(null)
    const [walletBalance, setWalletBalance] = useState(0)
    const [questions, setQuestions] = useState([''])
    const [subjectName, setSubjectName] = useState('')
    const [subjectBirthdate, setSubjectBirthdate] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (oracleId && profile?.id) {
            fetchData()
        }
    }, [oracleId, profile?.id])

    const fetchData = async () => {
        try {
            // Buscar oracle
            const { data: oracleData, error: oracleError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', oracleId)
                .single()

            if (oracleError) throw oracleError
            setOracle(oracleData)

            // Buscar saldo
            const { data: walletData } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', profile!.id)
                .maybeSingle()

            setWalletBalance(walletData?.balance ?? 0)
        } catch (err: any) {
            console.error('Error loading consultation page:', err)
            toast.error('Erro ao carregar página: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        // Validações
        const validQuestions = questions.filter(q => q.trim().length > 0)
        if (validQuestions.length === 0) {
            toast.error('Adicione pelo menos uma pergunta')
            return
        }

        const pricePerQuestion = oracle?.price_per_message || 10
        const totalCost = validQuestions.length * pricePerQuestion

        if (walletBalance < totalCost) {
            toast.error(`Créditos insuficientes. Você precisa de ${totalCost} CR.`)
            router.push('/app/carteira')
            return
        }

        setSubmitting(true)

        try {
            // 1. Criar consultation
            const { data: consultation, error: consultationError } = await supabase
                .from('consultations')
                .insert({
                    client_id: profile!.id,
                    oracle_id: oracleId,
                    total_questions: validQuestions.length,
                    total_credits: totalCost,
                    subject_name: subjectName || null,
                    subject_birthdate: subjectBirthdate || null,
                    status: 'pending'
                })
                .select()
                .single()

            if (consultationError) throw consultationError

            // 2. Inserir perguntas
            const questionsToInsert = validQuestions.map((q, idx) => ({
                consultation_id: consultation.id,
                question_text: q,
                question_order: idx + 1
            }))

            const { error: questionsError } = await supabase
                .from('consultation_questions')
                .insert(questionsToInsert)

            if (questionsError) throw questionsError

            // 3. Chamar API para processar
            const response = await fetch('/api/consultations/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consultationId: consultation.id })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Erro ao processar consulta')
            }

            toast.success('Consulta enviada! Você receberá as respostas na sua caixa de entrada.')
            router.push('/app/mensagens')
        } catch (err: any) {
            console.error('Error submitting consultation:', err)
            toast.error('Erro: ' + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!oracle) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <p className="text-slate-400">Oraculista não encontrado.</p>
                <NeonButton variant="purple" onClick={() => router.push('/app')}>Voltar ao Templo</NeonButton>
            </div>
        )
    }

    const pricePerQuestion = oracle?.price_per_message || 10

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-slate-400 hover:text-white transition-colors text-sm"
                >
                    <ArrowLeft size={18} className="mr-2" /> Voltar
                </button>
                <div className="text-sm font-bold text-neon-gold">
                    Saldo: {walletBalance} CR
                </div>
            </div>

            {/* Oracle Info */}
            <GlassCard className="border-white/5" hover={false}>
                <div className="flex items-center space-x-4">
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
                        <p className="text-xs text-slate-500">Valor por pergunta</p>
                        <p className="text-lg font-bold text-neon-gold">{pricePerQuestion} CR</p>
                    </div>
                </div>
            </GlassCard>

            {/* Form */}
            <GlassCard className="border-white/5" hover={false}>
                <h3 className="text-lg font-bold text-white mb-6">Faça suas perguntas ao oráculo</h3>

                <div className="space-y-8">
                    <SubjectInfo
                        subjectName={subjectName}
                        subjectBirthdate={subjectBirthdate}
                        onNameChange={setSubjectName}
                        onBirthdateChange={setSubjectBirthdate}
                    />

                    <QuestionInput
                        questions={questions}
                        onChange={setQuestions}
                        pricePerQuestion={pricePerQuestion}
                    />

                    <div className="flex items-start space-x-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                        <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-300 leading-relaxed">
                            <strong>Como funciona:</strong> Você envia todas as suas perguntas de uma vez.
                            O oráculo responderá cada uma delas e você receberá as respostas na sua caixa de entrada.
                            Não é possível enviar mensagens adicionais após o envio.
                        </div>
                    </div>

                    <NeonButton
                        variant="purple"
                        size="lg"
                        fullWidth
                        onClick={handleSubmit}
                        loading={submitting}
                        disabled={questions.filter(q => q.trim()).length === 0}
                    >
                        <Send size={20} className="mr-2" />
                        Enviar Consulta
                    </NeonButton>
                </div>
            </GlassCard>
        </div>
    )
}
