import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { asaasService } from '@/lib/asaasService'

// POST /api/payments/webhook/asaas
export async function POST(req: Request) {
    try {
        // 0. Autenticação do webhook (defesa em profundidade)
        // Se ASAAS_WEBHOOK_TOKEN estiver configurado, exigimos que o header
        // 'asaas-access-token' bata. Configure o MESMO token no painel do Asaas.
        const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN
        if (expectedToken) {
            const receivedToken = req.headers.get('asaas-access-token')
            if (receivedToken !== expectedToken) {
                console.error('Asaas webhook: token inválido')
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        }

        const body = await req.json()
        const { event, payment } = body

        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
            const asaasPaymentId = payment?.id
            if (!asaasPaymentId) {
                return NextResponse.json({ received: true })
            }

            // 1. Buscar transação pendente no banco
            const { data: transaction, error: tError } = await supabaseAdmin
                .from('transactions')
                .select('*')
                .eq('asaas_payment_id', asaasPaymentId)
                .eq('status', 'pending')
                .single()

            if (tError || !transaction) {
                // Já processada ou inexistente — OK para o Asaas não reenviar.
                console.error('Webhook: Transação não encontrada ou já processada:', asaasPaymentId)
                return NextResponse.json({ received: true })
            }

            // 2. CONFIRMAÇÃO AUTORITATIVA: consulta o pagamento direto na API do
            // Asaas. Mesmo que o payload do webhook seja forjado, só creditamos
            // se o Asaas confirmar que o pagamento foi efetivamente recebido.
            let verified
            try {
                verified = await asaasService.getPayment(asaasPaymentId)
            } catch (err: any) {
                console.error('Webhook: falha ao verificar pagamento no Asaas:', err.message)
                // 502 faz o Asaas reenviar depois (não perdemos pagamentos reais).
                return NextResponse.json({ error: 'verification_failed' }, { status: 502 })
            }

            const paidStatuses = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']
            if (!verified || !paidStatuses.includes(verified.status)) {
                console.error('Webhook: pagamento não confirmado pela API Asaas. Status:', verified?.status)
                return NextResponse.json({ received: true })
            }

            // 3. Marcar transação como paga de forma idempotente: o update só
            // afeta linhas que ainda estão 'pending'. Se outra entrega do webhook
            // já creditou, o count será 0 e não creditamos de novo.
            const { data: updatedRows, error: updateErr } = await supabaseAdmin
                .from('transactions')
                .update({ status: 'paid', updated_at: new Date().toISOString() })
                .eq('id', transaction.id)
                .eq('status', 'pending')
                .select('id')

            if (updateErr || !updatedRows || updatedRows.length === 0) {
                // Corrida com outra entrega — já foi creditado.
                return NextResponse.json({ received: true })
            }

            // 4. Creditar na carteira do usuário
            const { data: wallet, error: wError } = await supabaseAdmin
                .from('wallets')
                .select('balance')
                .eq('user_id', transaction.user_id)
                .single()

            if (!wError && wallet) {
                const newBalance = wallet.balance + transaction.amount
                await supabaseAdmin
                    .from('wallets')
                    .update({ balance: newBalance })
                    .eq('user_id', transaction.user_id)

                console.log(`Sucesso: Creditado ${transaction.amount} moedas para o usuário ${transaction.user_id}`)
            }
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Webhook error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
