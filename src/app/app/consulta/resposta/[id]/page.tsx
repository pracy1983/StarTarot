'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { ArrowLeft, Sparkles, Calendar, User as UserIcon, MessageSquare, Star, Heart, Award, Video } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// Gift Images
import HeartImg from '@/img/coracao.png'
import FlowersImg from '@/img/buque.png'
import BearImg from '@/img/urso.png'
import MoonImg from '@/img/lua.png'

const REWARD_STARS = 5
const REWARD_TESTIMONIAL = 15
const MIN_WORDS_FOR_REWARD = 10

const GIFTS = [
    { id: 'heart', name: 'Coração', image: HeartImg.src || HeartImg, credits: 5 },
    { id: 'flowers', name: 'Buquê de Flores', image: FlowersImg.src || FlowersImg, credits: 15 },
    { id: 'bear', name: 'Urso de Pelúcia', image: BearImg.src || BearImg, credits: 50 },
    { id: 'moon', name: 'Lua de Cristal', image: MoonImg.src || MoonImg, credits: 150 },
]

export default function ConsultationResponsePage() {
    const { id } = useParams()
    const router = useRouter()
    const { profile, setProfile } = useAuthStore()

    const [consultation, setConsultation] = useState<any>(null)
    const [oracle, setOracle] = useState<any>(null)
    const [questions, setQuestions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Rating State
    const [stars, setStars] = useState(0)
    const [hoverStars, setHoverStars] = useState(0)
    const [testimonial, setTestimonial] = useState('')
    const [isSubmittingRating, setIsSubmittingRating] = useState(false)
    const [hasRated, setHasRated] = useState(false)
    const [showRatingPrompt, setShowRatingPrompt] = useState(false)
    const [isSendingGift, setIsSendingGift] = useState<string | null>(null)
    const [sentGifts, setSentGifts] = useState<string[]>([])

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

    const checkExistingRating = async () => {
        const { data } = await supabase
            .from('ratings')
            .select('*')
            .eq('consultation_id', id)
            .single()

        if (data && data.stars > 0) {
            setStars(data.stars)
            setTestimonial(data.comment || '')
            setHasRated(true)
        }
    }

    useEffect(() => {
        if (consultation) {
            checkExistingRating()
            fetchSentGifts()
        }
    }, [consultation])

    const fetchSentGifts = async () => {
        if (!profile?.id || !id) return

        const { data } = await supabase
            .from('transactions')
            .select('description')
            .eq('user_id', profile.id)
            .eq('type', 'gift_send')
            .contains('metadata', { consultation_id: id })

        if (data) {
            const foundGifts: string[] = []
            data.forEach((tx: any) => {
                const giftName = tx.description.replace('Envio de presente: ', '').trim()
                const gift = GIFTS.find(g => g.name === giftName)
                if (gift) foundGifts.push(gift.id)
            })
            setSentGifts(foundGifts)
        }
    }

    // "Don't leave" guard
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!hasRated && stars === 0) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasRated, stars])

    const handleRatingSubmit = async () => {
        if (stars === 0) {
            toast.error('Por favor, selecione uma nota.')
            return
        }

        const words = testimonial.trim().split(/\s+/).filter(w => w.length > 0)
        const hasTestimonial = words.length >= 10

        setIsSubmittingRating(true)
        try {
            // 1. Inserir Rating
            const { error: ratingError } = await supabase
                .from('ratings')
                .insert({
                    consultation_id: id,
                    client_id: profile!.id,
                    oracle_id: oracle.id,
                    stars,
                    comment: testimonial // Column is 'comment', state is 'testimonial'
                })

            if (ratingError) throw ratingError

            // 2. Calcular recompensas
            let totalReward = REWARD_STARS
            if (hasTestimonial) {
                totalReward += REWARD_TESTIMONIAL
            }

            // 3. Adicionar Créditos (Reward)
            const { error: rewardError } = await supabase.rpc('grant_reward_credits', {
                p_user_id: profile!.id,
                p_amount: totalReward,
                p_description: `Recompensa por avaliação da consulta ${id}`
            })

            if (rewardError) throw rewardError

            // 4. Sucesso!
            setHasRated(true)
            setProfile({
                ...profile!,
                credits: (profile?.credits || 0) + totalReward
            })

            toast.success(`Obrigado! Você ganhou ${totalReward} créditos! ✨`)
        } catch (err: any) {
            console.error('Error submitting rating:', err)
            toast.error('Erro ao enviar avaliação: ' + err.message)
        } finally {
            setIsSubmittingRating(false)
        }
    }

    const handleSendGift = async (gift: typeof GIFTS[0]) => {
        if (!profile || (profile.credits || 0) < gift.credits) {
            toast.error('Saldo insuficiente para enviar este presente.')
            return
        }

        setIsSendingGift(gift.id)
        try {
            const { error } = await supabase.rpc('purchase_gift', {
                p_consultation_id: id,
                p_sender_id: profile.id,
                p_receiver_id: oracle.id,
                p_gift_name: gift.name,
                p_credits: gift.credits
            })

            if (error) throw error

            setProfile({
                ...profile,
                credits: (profile.credits || 0) - gift.credits
            })

            setSentGifts(prev => [...prev, gift.id])
            toast.success(`Presente ${gift.name} enviado com sucesso! 🎁✨`)
        } catch (err: any) {
            console.error('Error sending gift:', err)
            toast.error('Erro ao enviar presente: ' + err.message)
        } finally {
            setIsSendingGift(null)
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
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                            {consultation.client_id === profile?.id ? 'Valor Investido' : 'Ganhos da Consulta'}
                        </p>
                        <p className="text-xl font-bold text-neon-gold">
                            {consultation.total_credits} Créditos
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
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Sua Mensagem</h3>
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

            {/* Video Call Summary (If video) */}
            {consultation.type === 'video' && (
                <GlassCard className="border-neon-cyan/20 bg-neon-cyan/5" hover={false}>
                    <div className="text-center py-4 space-y-4">
                        <div className="w-16 h-16 bg-neon-cyan/10 rounded-full flex items-center justify-center mx-auto">
                            <Video className="text-neon-cyan" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-widest">Resumo da Chamada</h3>
                        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Tempo Online</p>
                                <p className="text-lg font-bold text-white">
                                    {Math.floor((consultation.duration_seconds || 0) / 60)}:{(consultation.duration_seconds % 60 || 0).toString().padStart(2, '0')}
                                </p>
                            </div>
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Créditos Utilizados</p>
                                <p className="text-lg font-bold text-neon-gold">{consultation.total_credits} Créditos</p>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            )}

            {/* Gifts Section */}
            <GlassCard className="border-neon-gold/20 bg-neon-gold/5" hover={false}>
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center space-x-2 text-neon-gold">
                        <Sparkles size={20} />
                        <h3 className="text-lg font-bold uppercase tracking-wider">Envie um Presente Especial</h3>
                    </div>
                    <p className="text-slate-400 text-sm italic">
                        Gostou do atendimento? Demonstre seu carinho enviando um presente simbólico ao oraculista.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                        {GIFTS.map((gift) => {
                            const isSent = sentGifts.includes(gift.id)
                            return (
                                <button
                                    key={gift.id}
                                    onClick={() => !isSent && handleSendGift(gift)}
                                    disabled={isSendingGift === gift.id || isSent}
                                    className={`relative group p-4 rounded-2xl border transition-all flex flex-col items-center justify-center space-y-2 ${isSent
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-white/5 border-white/10 hover:border-neon-gold/50 hover:bg-neon-gold/10'
                                        }`}
                                >
                                    <div className="w-16 h-16 group-hover:scale-110 transition-transform flex items-center justify-center p-1">
                                        <img
                                            src={typeof gift.image === 'string' ? gift.image : gift.image.src}
                                            alt={gift.name}
                                            className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]"
                                        />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-white uppercase truncate w-full px-1">{gift.name}</p>
                                        <p className="text-xs text-neon-gold font-bold">{gift.credits} Créditos</p>
                                    </div>
                                    {isSendingGift === gift.id && (
                                        <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}
                                    {isSent && (
                                        <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-lg border border-white/20">
                                            <Sparkles size={12} />
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </GlassCard>

            {/* Rating Section */}
            {(consultation.type !== 'video' || (consultation.duration_seconds || 0) >= 300) && (
                !hasRated ? (
                    <GlassCard className="border-neon-purple/20 bg-neon-purple/5" hover={false}>
                        <div className="text-center space-y-6 py-4">
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white flex items-center justify-center">
                                    <Heart className="mr-2 text-red-500 fill-red-500" size={20} />
                                    O que achou do atendimento?
                                </h3>
                                <p className="text-slate-400 text-sm">
                                    Ganhe até <span className="text-neon-gold font-bold">20 Créditos</span> avaliando agora!
                                </p>
                            </div>

                            {/* Stars */}
                            <div className="flex justify-center space-x-2">
                                {[1, 2, 3, 4, 5].map((num) => (
                                    <button
                                        key={num}
                                        onMouseEnter={() => setHoverStars(num)}
                                        onMouseLeave={() => setHoverStars(0)}
                                        onClick={() => setStars(num)}
                                        className="transform transition-all active:scale-90"
                                    >
                                        <Star
                                            size={40}
                                            className={`${(hoverStars || stars) >= num
                                                ? 'text-neon-gold fill-neon-gold'
                                                : 'text-slate-600'
                                                } transition-colors`}
                                        />
                                    </button>
                                ))}
                            </div>

                            {/* Testimonial */}
                            <div className="max-w-xl mx-auto space-y-3">
                                <textarea
                                    value={testimonial}
                                    onChange={(e) => setTestimonial(e.target.value)}
                                    placeholder="Deixe um depoimento sobre sua experiência..."
                                    className="w-full bg-deep-space/50 border border-white/10 rounded-xl p-4 text-white placeholder-slate-600 focus:outline-none focus:border-neon-purple/50 transition-colors min-h-[100px]"
                                />

                                <div className="flex flex-wrap justify-center gap-4 text-xs">
                                    <div className={`flex items-center ${stars > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                                        <Award size={14} className="mr-1" /> +5 Créditos pela nota
                                    </div>
                                    <div className={`flex items-center ${testimonial.trim().split(/\s+/).filter(Boolean).length >= MIN_WORDS_FOR_REWARD ? 'text-green-400' : 'text-slate-500'}`}>
                                        <Award size={14} className="mr-1" /> +15 Créditos pelo depoimento (com mais de 10 palavras)
                                    </div>
                                </div>

                                <NeonButton
                                    variant="gold"
                                    fullWidth
                                    loading={isSubmittingRating}
                                    onClick={handleRatingSubmit}
                                >
                                    Enviar e Coletar Recompensa
                                </NeonButton>
                            </div>
                        </div>
                    </GlassCard>
                ) : (
                    <GlassCard className="border-white/5 bg-white/5" hover={false}>
                        <div className="text-center py-4 space-y-3">
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                                <Sparkles className="text-green-400" size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white">Avaliação Enviada!</h3>
                            <p className="text-slate-400 text-sm italic">"{testimonial}"</p>
                            <div className="flex justify-center space-x-1">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <Star key={n} size={16} className={n <= stars ? 'text-neon-gold fill-neon-gold' : 'text-slate-700'} />
                                ))}
                            </div>
                        </div>
                    </GlassCard>
                )
            )}

            {/* Footer */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-6 bg-white/5 border border-white/10 rounded-xl">
                <div className="text-sm text-slate-400 text-center sm:text-left">
                    <p>
                        {consultation.type === 'video'
                            ? 'Gostou da consulta? Favorite este oraculista.'
                            : 'Gostou da consulta? Você pode fazer uma nova mensagem ao mesmo oráculo.'}
                    </p>
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
