import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { whatsappService } from '@/lib/whatsapp'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getOracleStatus } from '@/lib/status'

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies })

    try {
        const { consultationId } = await req.json()

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // 1. Buscar consultation com dados do Oracle E do Cliente
        const { data: consultation, error: consultationError } = await supabaseAdmin
            .from('consultations')
            .select('*, oracle:profiles!consultations_oracle_id_fkey(*), client:profiles!consultations_client_id_fkey(*)')
            .eq('id', consultationId)
            .single()

        if (consultationError || !consultation) {
            return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
        }

        const oracle = consultation.oracle
        const client = consultation.client

        // 2. Verificar créditos
        const { data: wallet } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('user_id', consultation.client_id)
            .maybeSingle()

        if (!wallet || (wallet.balance < consultation.total_credits)) {
            return NextResponse.json({ error: 'Créditos insuficientes' }, { status: 402 })
        }

        // 3. Deduzir créditos do cliente
        const { error: deductError } = await supabaseAdmin
            .from('wallets')
            .update({
                balance: wallet.balance - consultation.total_credits,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', consultation.client_id)

        if (deductError) {
            console.error('Error deducting credits:', deductError)
            throw new Error('Erro ao processar pagamento de créditos')
        }

        // 4. Se for IA, Adicionar créditos ao oraculista imediatamente.
        if (oracle.is_ai) {
            const { data: oracleWallet } = await supabaseAdmin
                .from('wallets')
                .select('balance')
                .eq('user_id', oracle.id)
                .maybeSingle()

            if (oracleWallet) {
                await supabaseAdmin
                    .from('wallets')
                    .update({
                        balance: (oracleWallet.balance || 0) + consultation.total_credits,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', oracle.id)
            }
        }

        // 5. Buscar Comissão
        const { data: commissionSetting } = await supabaseAdmin
            .from('global_settings')
            .select('value')
            .eq('key', 'oracle_commission_pc')
            .maybeSingle()

        const commissionPc = parseInt(commissionSetting?.value || '70')
        const oracleEarnings = Math.floor(consultation.total_credits * (commissionPc / 100))

        // 6. Buscar perguntas (Se não for vídeo)
        let questions: any[] = []
        if (consultation.type !== 'video') {
            const { data: qData } = await supabaseAdmin
                .from('consultation_questions')
                .select('*')
                .eq('consultation_id', consultationId)
                .order('question_order', { ascending: true })

            questions = qData || []

            if (questions.length === 0) {
                throw new Error('Nenhuma pergunta encontrada')
            }
        }

        // =====================================================
        // 7. HUMANO: Status pending + notificação
        // =====================================================
        if (!oracle.is_ai) {
            await supabaseAdmin
                .from('consultations')
                .update({ status: 'pending' })
                .eq('id', consultationId)

            // Só inserir mensagem na inbox para consultas de TEXTO (vídeo não tem perguntas)
            if (consultation.type !== 'video') {
                await supabaseAdmin.from('inbox_messages').insert({
                    recipient_id: oracle.id,
                    sender_id: consultation.client_id,
                    title: '📧 Nova Consulta Pendente',
                    content: `Você recebeu uma nova consulta de ${client.full_name}. Responda para receber seus créditos.`,
                    metadata: { consultation_id: consultationId, type: 'new_pending_consultation' }
                })
            }

            await supabaseAdmin.from('transactions').insert([
                {
                    user_id: consultation.client_id,
                    type: 'consultation_charge',
                    amount: consultation.total_credits,
                    status: 'confirmed',
                    description: `Consulta com ${oracle.full_name}`,
                    metadata: { consultation_id: consultationId, oracle_id: oracle.id }
                },
                {
                    user_id: oracle.id,
                    type: 'earnings',
                    amount: oracleEarnings,
                    status: 'pending',
                    description: `Pendente: Consulta de ${client.full_name}`,
                    metadata: { consultation_id: consultationId, client_id: consultation.client_id, commission_pc: commissionPc }
                }
            ])

            // WhatsApp para o ORÁCULO apenas se estiver OFFLINE
            // (se online, a notificação visual aparece na tela em tempo real)
            const isOracleOnline = oracle.is_online === true
            if (!isOracleOnline && oracle.whatsapp_notification_enabled && oracle.phone) {
                try {
                    await whatsappService.sendNewConsultationNotificationToOracle(oracle.phone)
                } catch (waErr) {
                    console.error('Error sending WA to oracle:', waErr)
                }
            }

            return NextResponse.json({ success: true, message: 'Consulta humana encaminhada' })
        }

        // =====================================================
        // 8. IA: Agendar processamento com atraso humano
        // =====================================================

        // 8.1. Determinar se o oráculo IA está "online" agora (pela agenda)
        const { data: oracleSchedules } = await supabaseAdmin
            .from('oracle_schedules')
            .select('*')
            .eq('oracle_id', oracle.id)

        const { status: oracleCurrentStatus } = getOracleStatus(
            true,
            oracleSchedules || [],
            undefined,
            true
        )

        // 8.2. Calcular atraso aleatório
        const isCurrentlyOnline = oracleCurrentStatus === 'online'
        const minDelay = isCurrentlyOnline ? 13 : 20 // minutos
        const maxDelay = isCurrentlyOnline ? 25 : 80 // minutos
        const delayMinutes = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
        const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()

        // 8.3. Salvar como pending com agendamento
        await supabaseAdmin
            .from('consultations')
            .update({
                status: 'pending',
                metadata: {
                    ...consultation.metadata,
                    is_ai_scheduled: true,
                    scheduled_process_at: scheduledAt,
                    delay_minutes: delayMinutes,
                    oracle_was_online: isCurrentlyOnline,
                    retry_count: 0
                }
            })
            .eq('id', consultationId)

        // 8.4. Registrar transações (Cliente + IA confirmadas)
        await supabaseAdmin.from('transactions').insert([
            {
                user_id: consultation.client_id,
                type: 'consultation_charge',
                amount: consultation.total_credits,
                status: 'confirmed',
                description: `Consulta com ${oracle.full_name}`,
                metadata: { consultation_id: consultationId, oracle_id: oracle.id }
            },
            {
                user_id: oracle.id,
                type: 'earnings',
                amount: oracleEarnings,
                status: 'confirmed',
                description: `Ganhos: Consulta de ${client.full_name}`,
                metadata: { consultation_id: consultationId, client_id: consultation.client_id, commission_pc: commissionPc }
            }
        ])

        console.log(`[AI Delay] Consultation ${consultationId} scheduled for ${scheduledAt} (delay: ${delayMinutes}m, online: ${isCurrentlyOnline})`)

        return NextResponse.json({ success: true, message: 'Consulta IA agendada', scheduled_at: scheduledAt })
    } catch (error: any) {
        console.error('Consultation processing error:', error)
        return NextResponse.json({ error: error.message || 'Erro ao processar consulta' }, { status: 500 })
    }
}
