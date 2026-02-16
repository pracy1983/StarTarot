import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies })

    try {
        const { consultationId, reason } = await req.json()

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // 1. Buscar consultation e verificar permissão
        const { data: consultation, error: consultationError } = await supabaseAdmin
            .from('consultations')
            .select('*, client:profiles!client_id(full_name, id), oracle:profiles!oracle_id(full_name, id)')
            .eq('id', consultationId)
            .single()

        if (consultationError || !consultation) {
            return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
        }

        if (consultation.oracle_id !== session.user.id) {
            return NextResponse.json({ error: 'Você não tem permissão para rejeitar esta consulta' }, { status: 403 })
        }

        if (consultation.status !== 'pending') {
            return NextResponse.json({ error: 'Esta consulta não pode mais ser rejeitada' }, { status: 400 })
        }

        // 2. Devolver créditos ao cliente
        const { data: clientWallet } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('user_id', consultation.client_id)
            .single()

        if (clientWallet) {
            await supabaseAdmin
                .from('wallets')
                .update({
                    balance: clientWallet.balance + consultation.total_credits,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', consultation.client_id)
        }

        // 3. Atualizar status da consulta
        await supabaseAdmin
            .from('consultations')
            .update({
                status: 'rejected',
                metadata: { ...consultation.metadata, rejection_reason: reason }
            })
            .eq('id', consultationId)

        // 4. Atualizar transações
        // Cliente (Charges) -> Refunded
        await supabaseAdmin
            .from('transactions')
            .update({ status: 'refunded' })
            .eq('user_id', consultation.client_id)
            .eq('type', 'consultation_charge')
            .contains('metadata', { consultation_id: consultationId })

        // Oracle (Earnings) -> Cancelled
        await supabaseAdmin
            .from('transactions')
            .update({ status: 'cancelled' })
            .eq('user_id', consultation.oracle_id)
            .eq('type', 'earnings')
            .contains('metadata', { consultation_id: consultationId })

        // 5. Registrar transação de estorno (Visualização explícita se necessário, mas update do status costuma bastar)
        // Opcional: Criar uma transação do tipo 'refund' se o sistema exigir histórico aditivo.
        // Por enquanto, atualizar o status da charge original para 'refunded' e devolver o saldo no wallet é suficiente.

        // 6. Notificar Cliente
        await supabaseAdmin.from('inbox_messages').insert({
            recipient_id: consultation.client_id,
            sender_id: consultation.oracle_id,
            title: '❌ Consulta Cancelada/Estornada',
            content: `O oraculista não pôde atender sua solicitação no momento. Seus ${consultation.total_credits} créditos foram devolvidos integralmente.`,
            metadata: { consultation_id: consultationId, type: 'consultation_rejected' }
        })

        return NextResponse.json({ success: true, message: 'Consulta rejeitada e créditos estornados.' })

    } catch (error: any) {
        console.error('Error rejecting consultation:', error)
        return NextResponse.json({ error: error.message || 'Erro ao rejeitar consulta' }, { status: 500 })
    }
}
