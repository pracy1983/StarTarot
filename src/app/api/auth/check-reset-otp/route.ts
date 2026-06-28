import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { onlyDigits, phoneMatches } from '@/utils/phone'

export async function POST(req: Request) {
    try {
        const { phone, otpCode } = await req.json()

        if (!phone || !otpCode) {
            return NextResponse.json({ error: 'Telefone e código são obrigatórios' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('MISSING ENV VARS in check-reset-otp')
            return NextResponse.json({
                error: 'Erro de configuração no servidor. Contate o administrador.'
            }, { status: 500 })
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
        const fullPhone = onlyDigits(phone)

        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, phone')
            .not('phone', 'is', null)

        if (profileError) {
            console.error('Profile lookup error in check-reset-otp:', profileError)
            return NextResponse.json({ error: 'Erro ao validar código.' }, { status: 500 })
        }

        const matchingProfiles = profiles?.filter(profile => phoneMatches(profile.phone, fullPhone)) || []

        if (matchingProfiles.length === 0) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
        }

        const { data: otp, error: otpError } = await supabaseAdmin
            .from('password_reset_otps')
            .select('id, user_id')
            .in('user_id', matchingProfiles.map(profile => profile.id))
            .eq('otp_code', otpCode)
            .eq('is_used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (otpError) {
            console.error('OTP lookup error in check-reset-otp:', otpError)
            return NextResponse.json({ error: 'Erro ao validar código.' }, { status: 500 })
        }

        if (!otp) {
            return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 401 })
        }

        return NextResponse.json({ success: true, userId: otp.user_id })
    } catch (err: any) {
        console.error('Error in check-reset-otp route:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
