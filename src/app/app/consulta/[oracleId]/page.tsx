'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { QuestionInput, SubjectInfo } from '@/components/consultation/QuestionInput'
import { ArrowLeft, Send, AlertCircle, Clock } from 'lucide-react'
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

                    <div className="space-y-4">
                        <div className="flex items-start space-x-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                            <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                                <p><strong>Como funciona:</strong> Você envia todas as suas perguntas de uma vez. O oraculista responderá cada uma delas e você receberá as respostas na sua caixa de entrada.</p>
                                <p className="flex items-center text-neon-cyan">
                                    <Clock size={14} className="mr-1.5" />
                                    Tempo médio de resposta deste oraculista: <strong className="ml-1">30 minutos</strong>
                                </p>
                                <p className="flex items-center text-green-400">
                                    <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    Te enviaremos uma notificação no WhatsApp quando suas perguntas forem respondidas
                                </p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <NeonButton
                                variant="purple"
                                size="lg"
                                fullWidth
                                onClick={handleSubmit}
                                loading={submitting}
                                disabled={questions.filter(q => q.trim()).length === 0}
                                className="text-base font-bold"
                            >
                                <Send size={20} className="mr-2" />
                                Enviar Consulta
                            </NeonButton>
                        </div>
                    </div>
                </div>
            </GlassCard>
        </div>
    )
}
