import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { asaasService } from '@/lib/asaasService'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// POST /api/payments/create - Inicia um pagamento PIX
export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies })

    try {
        const { packageId, cpfCnpj, billingType = 'PIX', couponCode } = await req.json()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // 1. Buscar o pacote
        const { data: pkg, error: pkgError } = await supabase
            .from('credit_packages')
            .select('*')
            .eq('id', packageId)
            .single()

        if (pkgError || !pkg) return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })

        // 1.5 Validar Cupom
        let finalPrice = pkg.price_brl
        let discountAmount = 0
        let couponId = null
        let couponData = null

        if (couponCode) {
            const { data: coupon, error: couponError } = await supabaseAdmin
                .from('coupons')
                .select('*')
                .eq('code', couponCode.toUpperCase())
                .eq('active', true)
                .single()

            if (coupon && !couponError) {
                // Verificar validade e uso
                const now = new Date()
                const expiresAt = coupon.expires_at ? new Date(coupon.expires_at) : null
                const maxUses = coupon.max_uses || Infinity

                if ((!expiresAt || expiresAt > now) && (coupon.used_count < maxUses)) {
                    couponId = coupon.id
                    couponData = coupon
                    const discount = Math.round((pkg.price_brl * (coupon.discount_percent / 100)) * 100) / 100
                    discountAmount = discount
                    finalPrice = Math.max(0, pkg.price_brl - discount)
                }
            }
        }

        // 2. Buscar ou criar cliente no Asaas
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
            finalPrice,
            `Compra de ${pkg.coins_amount + (pkg.bonus_amount || 0)} Lumina Coins${couponCode ? ` (Cupom: ${couponCode})` : ''}`,
            `pkg_${pkg.id}_u_${session.user.id}_${Date.now()}`,
            billingType
        )

        // 4. Buscar Pix QR Code APENAS se for PIX
        let pixData = null
        if (billingType === 'PIX') {
            pixData = await asaasService.getPixQrCode(payment.id)
        }

        // 5. Registrar transação pendente no banco
        await supabaseAdmin
            .from('transactions')
            .insert({
                user_id: session.user.id,
                amount: pkg.coins_amount + (pkg.bonus_amount || 0),
                money_amount: finalPrice,
                type: 'credit_purchase',
                status: 'pending',
                asaas_payment_id: payment.id,
                metadata: {
                    package_id: pkg.id,
                    external_reference: payment.externalReference,
                    bonus_amount: pkg.bonus_amount,
                    original_price: pkg.price_brl,
                    discount_amount: discountAmount,
                    coupon_id: couponId,
                    billing_type: billingType
                }
            })

        // Atualizar contagem de uso do cupom (opcional: fazer só no webhook de confirmação para garantir que pagou)
        // Por enquanto não incrementamos aqui, deixamos para o webhook confirmar.

        return NextResponse.json({
            paymentId: payment.id,
            encodedImage: pixData?.encodedImage,
            payload: pixData?.payload,
            expirationDate: payment.dueDate,
            invoiceUrl: payment.invoiceUrl || payment.bankSlipUrl // Retorna URL para pagamento (Boleto/Cartão)
        })

    } catch (error: any) {
        console.error('Create payment error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
