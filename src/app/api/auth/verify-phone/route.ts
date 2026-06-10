import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { phone, code } = await req.json()

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
        const phoneDigits = phone.replace(/\D/g, '')

        const { data: otp } = await supabaseAdmin
            .from('phone_verification_otps')
            .select('id')
            .eq('phone', phoneDigits)
            .eq('otp_code', code)
            .eq('is_used', false)
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (!otp) {
            return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 401 })
        }

        await supabaseAdmin
            .from('phone_verification_otps')
            .update({ is_used: true })
            .eq('id', otp.id)

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Error in verify-phone route:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
