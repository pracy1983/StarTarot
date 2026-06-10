import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { whatsappService } from '@/lib/whatsapp'

export async function POST(req: Request) {
    try {
        const { phone } = await req.json()

        if (!phone) {
            return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('MISSING ENV VARS in send-verification')
            return NextResponse.json({
                error: 'Erro de configuração no servidor. Contate o administrador.'
            }, { status: 500 })
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
        const phoneDigits = phone.replace(/\D/g, '')

        // Rate limit simples: máximo 3 códigos a cada 10 minutos por telefone
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
        const { count } = await supabaseAdmin
            .from('phone_verification_otps')
            .select('*', { count: 'exact', head: true })
            .eq('phone', phoneDigits)
            .gte('created_at', tenMinAgo)

        if ((count || 0) >= 3) {
            return NextResponse.json({
                error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
            }, { status: 429 })
        }

        // Código gerado NO SERVIDOR (antes era gerado no navegador e visível no DevTools)
        const code = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

        // Invalida códigos anteriores não usados deste telefone
        await supabaseAdmin
            .from('phone_verification_otps')
            .update({ is_used: true })
            .eq('phone', phoneDigits)
            .eq('is_used', false)

        const { error: insertError } = await supabaseAdmin
            .from('phone_verification_otps')
            .insert({ phone: phoneDigits, otp_code: code, expires_at: expiresAt })

        if (insertError) {
            console.error('Error storing OTP:', insertError)
            return NextResponse.json({ error: 'Erro ao gerar código. Tente novamente.' }, { status: 500 })
        }

        const resultWA = await whatsappService.sendTextMessage({
            phone: phone,
            message: `✨ *Star Tarot* \n\nSeu código de verificação é: *${code}*\n\nNão compartilhe este código com ninguém.`
        })

        if (!resultWA.success) {
            return NextResponse.json({
                error: `Erro ao enviar WhatsApp: ${resultWA.error || 'Erro desconhecido'}.`
            }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Error in send-verification route:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
