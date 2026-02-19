import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// POST /api/payments/webhook/asaas
export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { event, payment } = body

        console.log('Asaas Webhook payload:', JSON.stringify(body, null, 2))

        // Verificamos apenas pagamentos recebidos (PAYMENT_RECEIVED ou PAYMENT_CONFIRMED)
        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
            const asaasPaymentId = payment.id

            // 1. Buscar transação pendente no banco
            const { data: transaction, error: tError } = await supabaseAdmin
                .from('transactions')
                .select('*')
                .eq('asaas_payment_id', asaasPaymentId)
                .eq('status', 'pending')
                .single()

            if (tError || !transaction) {
                console.error('Webhook: Transação não encontrada ou já processada:', asaasPaymentId)
                return NextResponse.json({ received: true }) // Retornamos OK para o Asaas não reenviar
            }

            // 2. Atualizar transação para 'paid'
            await supabaseAdmin
                .from('transactions')
                .update({ status: 'paid', updated_at: new Date().toISOString() })
                .eq('id', transaction.id)

            // 3. Creditar na carteira do usuário
            // Usando RPC ou lógica direta com supabaseAdmin
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
