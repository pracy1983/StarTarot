import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { asaasService } from '@/lib/asaasService'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// POST /api/payments/create - Inicia um pagamento PIX
export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies })

    try {
        const { packageId, cpfCnpj } = await req.json()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // 1. Buscar o pacote
        const { data: pkg, error: pkgError } = await supabase
            .from('credit_packages')
            .select('*')
            .eq('id', packageId)
            .single()

        if (pkgError || !pkg) return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })

        // 2. Buscar ou criar cliente no Asaas (simplificado para MVP: criamos sempre ou usamos metadata se existir)
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

        let asaasCustomerId = profile?.metadata?.asaas_customer_id

        if (!asaasCustomerId) {
            const customer = await asaasService.createCustomer(
                profile?.full_name || 'Cliente Lumina',
                cpfCnpj,
                profile?.email || session.user.email!
            )
            asaasCustomerId = customer.id

            // Salvar no perfil
            await supabaseAdmin
                .from('profiles')
                .update({
                    metadata: { ...(profile?.metadata || {}), asaas_customer_id: asaasCustomerId }
                })
                .eq('id', session.user.id)
        }

        // 3. Criar pagamento no Asaas
        const payment = await asaasService.createPayment(
            asaasCustomerId,
            pkg.price_brl,
            `Compra de ${pkg.coins_amount + (pkg.bonus_amount || 0)} Lumina Coins`,
            `pkg_${pkg.id}_u_${session.user.id}_${Date.now()}`
        )

        // 4. Buscar Pix QR Code
        const pixData = await asaasService.getPixQrCode(payment.id)

        // 5. Registrar transação pendente no banco
        await supabaseAdmin
            .from('transactions')
            .insert({
                user_id: session.user.id,
                amount: pkg.coins_amount + (pkg.bonus_amount || 0),
                money_amount: pkg.price_brl,
                type: 'credit_purchase',
                status: 'pending',
                asaas_payment_id: payment.id,
                metadata: {
                    package_id: pkg.id,
                    external_reference: payment.externalReference,
                    bonus_amount: pkg.bonus_amount
                }
            })

        return NextResponse.json({
            paymentId: payment.id,
            encodedImage: pixData.encodedImage,
            payload: pixData.payload,
            expirationDate: payment.dueDate
        })

    } catch (error: any) {
        console.error('Create payment error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
