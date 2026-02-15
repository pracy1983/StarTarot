'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { QuestionInput, SubjectInfo } from '@/components/consultation/QuestionInput'
import { ArrowLeft, Send, AlertCircle, Clock, Save, User, Calendar, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function NewConsultationPage() {
    const { oracleId } = useParams()
    const router = useRouter()
    const { profile, setProfile } = useAuthStore()

    const [oracle, setOracle] = useState<any>(null)
    const [walletBalance, setWalletBalance] = useState(0)
    const [questions, setQuestions] = useState([''])

    // Subject Info (Outra pessoa)
    const [subjectName, setSubjectName] = useState('')
    const [subjectBirthdate, setSubjectBirthdate] = useState('')
    const [subjectBirthtime, setSubjectBirthtime] = useState('')

    // Client Info (Eu mesmo)
    const [clientBirthDate, setClientBirthDate] = useState('')
    const [clientBirthTime, setClientBirthTime] = useState('')
    const [clientBirthPlace, setClientBirthPlace] = useState('')

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Derived state
    const isAstroOrNum = oracle?.specialty?.toLowerCase().includes('astrologia') ||
        oracle?.specialty?.toLowerCase().includes('numerologia')

    useEffect(() => {
        if (oracleId && profile?.id) {
            fetchData()
        }
    }, [oracleId, profile?.id])

    useEffect(() => {
        if (profile) {
            setClientBirthDate(profile.birth_date || '')
            setClientBirthTime(profile.birth_time || '')
            setClientBirthPlace(profile.birth_place || '')
        }
    }, [profile])

    const fetchData = async () => {
        try {
            // Buscar oracle com as novas colunas
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
        // 1. Validação de Perguntas
        const validQuestions = questions.filter(q => q.trim().length > 0)
        if (validQuestions.length === 0) {
            toast.error('Adicione pelo menos uma pergunta')
            return
        }

        // 2. Validação dos Dados do Cliente (Seus Dados)
        if (oracle?.requires_birthdate && !clientBirthDate) {
            toast.error('O oraculista exige sua Data de Nascimento.')
            return
        }
        if (oracle?.requires_birthtime && !clientBirthTime) {
            toast.error('O oraculista exige sua Hora de Nascimento.')
            return
        }

        // 3. Validação do Subject (Se for Astro/Num E o usuário preencheu nome do subject)
        // Lógica: Se preencheu nome do subject, assume que é para outra pessoa.
        // Se é Astro/Num, obriga data de nascimento DO SUBJECT.
        if (subjectName.trim() && isAstroOrNum) {
            if (!subjectBirthdate) {
                toast.error('Data de nascimento é obrigatória para o tema da consulta')
                return
            }
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
            // A. Atualizar perfil do cliente se mudou algo
            if (
                clientBirthDate !== profile?.birth_date ||
                clientBirthTime !== profile?.birth_time ||
                clientBirthPlace !== profile?.birth_place
            ) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        birth_date: clientBirthDate || null,
                        birth_time: clientBirthTime || null,
                        birth_place: clientBirthPlace || null
                    })
                    .eq('id', profile!.id)

                if (profileError) throw profileError

                // Atualiza store local
                setProfile({
                    ...profile!,
                    birth_date: clientBirthDate,
                    birth_time: clientBirthTime,
                    birth_place: clientBirthPlace
                })
            }

            // B. Criar consultation
            // Metadata agora inclui snapshot dos dados do cliente
            const metadata = {
                client_snapshot: {
                    name: profile!.full_name,
                    birth_date: clientBirthDate,
                    birth_time: clientBirthTime,
                    birth_place: clientBirthPlace
                },
                subject: subjectName ? {
                    name: subjectName,
                    birth_date: subjectBirthdate,
                    birth_time: subjectBirthtime
                } : null
            }

            const { data: consultation, error: consultationError } = await supabase
                .from('consultations')
                .insert({
                    client_id: profile!.id,
                    oracle_id: oracleId,
                    total_questions: validQuestions.length,
                    total_credits: totalCost,
                    subject_name: subjectName || null, // Mantemos compatibilidade
                    subject_birthdate: subjectBirthdate || null, // Mantemos compatibilidade
                    metadata: metadata,
                    status: 'pending'
                })
                .select()
                .single()

            if (consultationError) throw consultationError

            // C. Inserir perguntas
            const questionsToInsert = validQuestions.map((q, idx) => ({
                consultation_id: consultation.id,
                question_text: q,
                question_order: idx + 1
            }))

            const { error: questionsError } = await supabase
                .from('consultation_questions')
                .insert(questionsToInsert)

            if (questionsError) throw questionsError

            // D. Chamar API para processar (Notificações, etc)
            // Não bloqueia se falhar a API, pois o banco já foi
            fetch('/api/consultations/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consultationId: consultation.id })
            }).catch(e => console.error('Erro ao chamar process:', e))

            toast.success('Consulta enviada com sucesso!')
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
                        {/* Badges de Requisitos */}
                        <div className="flex gap-2 mt-2">
                            {oracle.requires_birthdate && <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-300">Exige Nasc.</span>}
                            {oracle.requires_birthtime && <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-300">Exige Hora</span>}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500">Valor por pergunta</p>
                        <p className="text-lg font-bold text-neon-gold">{pricePerQuestion} CR</p>
                    </div>
                </div>
            </GlassCard>

            {/* Form */}
            <GlassCard className="border-white/5" hover={false}>
                <div className="space-y-8">

                    {/* SEUS DADOS (CLIENTE) */}
                    <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                        <h3 className="text-sm font-bold text-white flex items-center">
                            <span className="w-2 h-2 bg-neon-purple rounded-full mr-2" />
                            Seus Dados para o Atendimento
                        </h3>
                        <p className="text-xs text-slate-500">
                            Confira seus dados. Se alterar aqui, seu perfil será atualizado automaticamente.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">Nome Completo</label>
                                <input disabled value={profile?.full_name || ''} className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-slate-400 text-sm cursor-not-allowed" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">Data de Nascimento {oracle.requires_birthdate && <span className="text-neon-purple">*</span>}</label>
                                <input
                                    type="date"
                                    value={clientBirthDate}
                                    onChange={e => setClientBirthDate(e.target.value)}
                                    className={`w-full bg-black/20 border rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-purple/50 transition-all ${!clientBirthDate && oracle.requires_birthdate ? 'border-red-500/30' : 'border-white/5'}`}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">Hora de Nascimento {oracle.requires_birthtime && <span className="text-neon-purple">*</span>}</label>
                                <input
                                    type="time"
                                    value={clientBirthTime}
                                    onChange={e => setClientBirthTime(e.target.value)}
                                    className={`w-full bg-black/20 border rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-purple/50 transition-all ${!clientBirthTime && oracle.requires_birthtime ? 'border-red-500/30' : 'border-white/5'}`}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-slate-500">Local de Nascimento</label>
                                <input
                                    type="text"
                                    value={clientBirthPlace}
                                    onChange={e => setClientBirthPlace(e.target.value)}
                                    placeholder="Ex: São Paulo, SP"
                                    className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-purple/50 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/5 my-4" />

                    <SubjectInfo
                        subjectName={subjectName}
                        subjectBirthdate={subjectBirthdate}
                        subjectBirthtime={subjectBirthtime}
                        onNameChange={setSubjectName}
                        onBirthdateChange={setSubjectBirthdate}
                        onBirthtimeChange={setSubjectBirthtime}
                        isMandatory={false}
                    />

                    <QuestionInput
                        questions={questions}
                        onChange={setQuestions}
                        pricePerQuestion={pricePerQuestion}
                    />

                    {/* Info de como funciona */}
                    <div className="flex items-start space-x-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                        <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                            <p><strong>Como funciona:</strong> O oraculista responderá suas perguntas e você receberá as respostas na sua caixa de entrada.</p>
                            <p className="flex items-center text-neon-cyan">
                                <Clock size={14} className="mr-1.5" />
                                Tempo médio de resposta: <strong className="ml-1">30 minutos</strong>
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
                            className="text-base font-bold py-4 gap-3"
                        >
                            <Send size={20} />
                            <span>Enviar Consulta</span>
                        </NeonButton>
                    </div>
                </div>
            </GlassCard>
        </div>
    )
}
