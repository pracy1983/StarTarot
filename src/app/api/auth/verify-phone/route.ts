import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { onlyDigits, phoneMatches } from '@/utils/phone'

export async function POST(req: Request) {
    try {
        const { phone, code, consume = false } = await req.json()

        if (!phone || !code) {
            return NextResponse.json({ error: 'Telefone e código são obrigatórios' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('MISSING ENV VARS in verify-phone')
            return NextResponse.json({
                error: 'Erro de configuração no servidor. Contate o administrador.'
            }, { status: 500 })
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
        const phoneDigits = onlyDigits(phone)
        const cleanCode = onlyDigits(code)

        const { data: otps, error: otpError } = await supabaseAdmin
            .from('phone_verification_otps')
            .select('id, phone, created_at')
            .eq('otp_code', cleanCode)
            .eq('is_used', false)
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })

        if (otpError) {
            console.error('Error fetching phone OTP:', otpError)
            return NextResponse.json({ error: 'Erro ao validar código. Tente novamente.' }, { status: 500 })
        }

        const otp = otps?.find(item => phoneMatches(item.phone, phoneDigits))

        if (!otp) {
            return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 401 })
        }

        if (consume) {
            await supabaseAdmin
                .from('phone_verification_otps')
                .update({ is_used: true })
                .eq('id', otp.id)
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Error in verify-phone route:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
