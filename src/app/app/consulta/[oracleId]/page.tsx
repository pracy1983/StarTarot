'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { QuestionInput, SubjectInfo } from '@/components/consultation/QuestionInput'
import { ArrowLeft, Send, AlertCircle, Clock, Save, User, Calendar, MapPin, Video } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { ClientCallModal } from '@/components/client/ClientCallModal'

export default function NewConsultationPage() {
    const { oracleId } = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const consultationType = searchParams.get('type') || 'message'
    const isVideo = consultationType === 'video'
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

    // Coupon State
    const [couponCode, setCouponCode] = useState('')
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false)

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [callModalOpen, setCallModalOpen] = useState(false)
    const [consultationId, setConsultationId] = useState<string | null>(null)

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

    useEffect(() => {
        if (!consultationId || !callModalOpen) return

        const channel = supabase
            .channel(`consultation_${consultationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'consultations',
                    filter: `id=eq.${consultationId}`
                },
                (payload) => {
                    const newStatus = payload.new.status
                    if (newStatus === 'active') {
                        // Accepted!
                        toast.success('O oraculista aceitou a chamada!')
                        router.push(`/app/consulta/video/${consultationId}`)
                    } else if (newStatus === 'canceled' || newStatus === 'missed') {
                        // Rejected/Timeout
                        setCallModalOpen(false)
                        setConsultationId(null)
                        toast.error('O oraculista não pôde atender no momento.')
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [consultationId, callModalOpen])

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

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return
        setIsValidatingCoupon(true)
        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', couponCode.toUpperCase())
                .eq('active', true)
                .is('is_deleted', false)
                .single()

            if (error || !data) {
                toast.error('Cupom inválido ou expirado')
                setAppliedCoupon(null)
                return
            }

            // Check expiry
            if (data.expires_at && new Date(data.expires_at) < new Date()) {
                toast.error('Cupom expirado')
                setAppliedCoupon(null)
                return
            }

            // Check target type (must be consultation)
            if (data.target_type !== 'consultation') {
                toast.error('Este cupom não é válido para consultas')
                setAppliedCoupon(null)
                return
            }

            toast.success('Cupom aplicado!')
            setAppliedCoupon(data)
        } catch (err) {
            toast.error('Erro ao validar cupom')
        } finally {
            setIsValidatingCoupon(false)
        }
    }

    const calculateTotal = () => {
        const validQuestions = questions.filter(q => q.trim().length > 0)
        const pricePerQuestion = oracle?.price_per_message || 10
        const initialFee = oracle?.initial_fee_credits || 0
        let total = (validQuestions.length * pricePerQuestion) + initialFee

        if (appliedCoupon) {
            if (appliedCoupon.discount_type === 'percent') {
                total = total * (1 - (appliedCoupon.discount_value / 100))
            } else {
                total = Math.max(0, total - appliedCoupon.discount_value)
            }
        }

        if (isVideo) {
            return initialFee
        }

        return Math.ceil(total)
    }

    const handleSubmit = async () => {
        const validQuestions = questions.filter(q => q.trim().length > 0)
        if (!isVideo && validQuestions.length === 0) {
            toast.error('Adicione pelo menos uma mensagem')
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

        const totalCost = calculateTotal()

        if (walletBalance < totalCost) {
            toast.error(`Créditos insuficientes. Você precisa de ${totalCost} Créditos.`)
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
                    total_questions: isVideo ? 0 : validQuestions.length,
                    total_credits: totalCost,
                    type: consultationType,
                    subject_name: subjectName || null, // Mantemos compatibilidade
                    subject_birthdate: subjectBirthdate || null, // Mantemos compatibilidade
                    metadata: {
                        ...metadata,
                        coupon_id: appliedCoupon?.id
                    },
                    status: 'pending'
                })
                .select()
                .single()

            if (consultationError) throw consultationError

            // C. Inserir perguntas
            if (!isVideo) {
                const questionsToInsert = validQuestions.map((q, idx) => ({
                    consultation_id: consultation.id,
                    question_text: q,
                    question_order: idx + 1
                }))

                const { error: questionsError } = await supabase
                    .from('consultation_questions')
                    .insert(questionsToInsert)

                if (questionsError) throw questionsError
            }

            // D. Chamar API para processar (Notificações, etc)
            // Não bloqueia se falhar a API, pois o banco já foi
            fetch('/api/consultations/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consultationId: consultation.id })
            }).catch(e => console.error('Erro ao chamar process:', e))

            if (isVideo) {
                setConsultationId(consultation.id)
                setCallModalOpen(true)
            } else {
                toast.success('Consulta enviada com sucesso!')
                router.push('/app/mensagens')
            }
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
    const initialFee = oracle?.initial_fee_credits || 0

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
                <h1 className="text-lg font-bold text-white">
                    Nova {isVideo ? 'Consulta por Vídeo' : 'Consulta por Mensagem'}
                </h1>
                <div className="text-sm font-bold text-neon-gold">
                    Saldo: {walletBalance} Créditos
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
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${isVideo ? 'bg-neon-purple/20 text-neon-purple' : 'bg-neon-cyan/20 text-neon-cyan'}`}>
                                {isVideo ? 'Modo Vídeo' : 'Modo Mensagem'}
                            </span>
                            {oracle.requires_birthdate && <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-300">Exige Nasc.</span>}
                            {oracle.requires_birthtime && <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-300">Exige Hora</span>}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500">{isVideo ? 'Valor por minuto' : 'Valor por mensagem'}</p>
                        <p className="text-lg font-bold text-neon-gold">
                            {isVideo ? oracle.credits_per_minute : pricePerQuestion} Créditos
                        </p>
                        {initialFee > 0 && (
                            <p className="text-[10px] text-slate-400 mt-1">
                                + {initialFee} Créditos taxa inicial
                            </p>
                        )}
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

                    {!isVideo && (
                        <QuestionInput
                            questions={questions}
                            onChange={setQuestions}
                            pricePerQuestion={pricePerQuestion}
                        />
                    )}

                    {/* COUPON SECTION */}
                    <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                        <label className="text-sm font-bold text-white flex items-center">
                            <AlertCircle size={16} className="mr-2 text-neon-gold" />
                            Possui um cupom de desconto?
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={couponCode}
                                onChange={e => setCouponCode(e.target.value)}
                                placeholder="DIGITE SEU CUPOM"
                                className="flex-1 bg-black/20 border border-white/5 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-neon-gold/50"
                            />
                            <button
                                onClick={handleApplyCoupon}
                                disabled={!couponCode || isValidatingCoupon}
                                className="px-4 py-2 bg-neon-gold/20 text-neon-gold border border-neon-gold/30 rounded-lg text-sm font-bold hover:bg-neon-gold/30 disabled:opacity-50 transition-all"
                            >
                                {isValidatingCoupon ? '...' : 'Aplicar'}
                            </button>
                        </div>
                        {appliedCoupon && (
                            <div className="flex justify-between items-center text-xs text-green-400 font-bold px-1 animate-fadeIn">
                                <span>Cupom {appliedCoupon.code} aplicado!</span>
                                <span>-{appliedCoupon.discount_type === 'percent' ? `${appliedCoupon.discount_value}%` : `${appliedCoupon.discount_value} Créditos`}</span>
                            </div>
                        )}
                    </div>

                    {initialFee > 0 && (
                        <div className="flex justify-between items-center px-4 py-2 bg-neon-gold/5 border border-neon-gold/20 rounded-lg text-xs font-bold text-neon-gold">
                            <span>Taxa de Abertura (Fixa):</span>
                            <span>{initialFee} Créditos</span>
                        </div>
                    )}

                    {/* Info de como funciona */}
                    <div className="flex items-start space-x-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                        <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                            <p><strong>Como funciona:</strong> {isVideo ? 'Você entrará em uma sala de vídeo privada com o oraculista. A cobrança é feita por minuto.' : 'O oraculista responderá suas mensagens e você receberá as respostas na sua caixa de entrada.'}</p>
                            {!isVideo && (
                                <p className="flex items-center text-neon-cyan">
                                    <Clock size={14} className="mr-1.5" />
                                    Tempo médio de resposta: <strong className="ml-1">30 minutos</strong>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="pt-2">
                        <NeonButton
                            variant={isVideo ? 'gold' : 'purple'}
                            size="lg"
                            fullWidth
                            onClick={handleSubmit}
                            loading={submitting}
                            disabled={(!isVideo && questions.filter(q => q.trim()).length === 0) || submitting}
                            className="text-base font-bold py-4 gap-3"
                        >
                            <div className="flex flex-col items-center leading-none">
                                <span className="flex items-center gap-2">
                                    {isVideo ? <Video size={24} /> : <Send size={20} />}
                                    {isVideo ? 'Iniciar Chamada de Vídeo' : 'Enviar Consulta'}
                                </span>
                                <span className="text-[10px] opacity-80 font-normal mt-1">
                                    {isVideo ? `Custo Inicial: ${calculateTotal()} Créditos` : `Total: ${calculateTotal()} Créditos`}
                                </span>
                            </div>
                        </NeonButton>
                    </div>
                </div>
            </GlassCard>
            <ClientCallModal
                isOpen={callModalOpen}
                oracleName={oracle.full_name}
                avatarUrl={oracle.avatar_url || ''}
                onCancel={async () => {
                    if (consultationId) {
                        await supabase.from('consultations').update({ status: 'canceled' }).eq('id', consultationId)
                    }
                    setCallModalOpen(false)
                    setConsultationId(null)
                }}
            />
        </div>
    )
}
