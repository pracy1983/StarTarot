'use client'

import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { Check, X, Shield, Clock, Search, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminModerationPage() {
    const [applicants, setApplicants] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    useEffect(() => {
        fetchApplicants()
    }, [])

    const fetchApplicants = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('application_status', 'pending')
                .order('created_at', { ascending: false })

            setApplicants(data || [])
        } catch (err) {
            console.error('Error fetching applicants:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        setProcessingId(id)
        try {
            const updates: any = { application_status: status }
            if (status === 'approved') {
                updates.role = 'oracle'
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', id)

            if (error) throw error

            setApplicants(prev => prev.filter(a => a.id !== id))
            toast.success(`Candidato ${status === 'approved' ? 'aprovado' : 'recusado'} com sucesso.`)
        } catch (err) {
            toast.error('Erro ao processar ação.')
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            <header>
                <h1 className="text-3xl font-bold text-white flex items-center">
                    <Shield className="text-neon-cyan mr-4" size={32} />
                    Moderação de <span className="neon-text-purple ml-2">Oraculistas</span>
                </h1>
                <p className="text-slate-400 mt-2">Revise as solicitações de novos guias para o templo.</p>
            </header>

            {applicants.length === 0 && !loading ? (
                <GlassCard className="border-white/5 text-center py-20" hover={false}>
                    <Clock size={48} className="mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400">Nenhum candidato pendente no momento.</p>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {applicants.map((a) => (
                        <GlassCard key={a.id} className="border-white/5" hover={false}>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="w-20 h-20 rounded-full border border-white/10 flex-shrink-0 overflow-hidden">
                                    <img
                                        src={a.avatar_url || `https://ui-avatars.com/api/?name=${a.full_name}&background=0a0a1a&color=a855f7`}
                                        className="w-full h-full object-cover"
                                        alt=""
                                    />
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{a.full_name}</h3>
                                            <p className="text-neon-cyan text-xs font-bold uppercase">{a.specialty}</p>
                                        </div>
                                        <div className="flex space-x-3">
                                            <NeonButton
                                                variant="purple"
                                                size="sm"
                                                onClick={() => handleAction(a.id, 'approved')}
                                                loading={processingId === a.id}
                                            >
                                                <Check size={18} className="mr-2" /> Aprovar
                                            </NeonButton>
                                            <button
                                                onClick={() => handleAction(a.id, 'rejected')}
                                                className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all flex items-center text-sm font-bold"
                                            >
                                                <X size={18} className="mr-2" /> Recusar
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Biografia</h4>
                                            <p className="text-sm text-slate-300 leading-relaxed">{a.bio || 'Sem biografia.'}</p>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Personalidade</h4>
                                                <p className="text-sm text-slate-300">{a.personality || 'Não informada.'}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Contato</h4>
                                                <p className="text-sm text-white font-mono">{a.phone || 'Não informado.'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    )
}
