import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { onlyDigits, phoneMatches } from '@/utils/phone'

export async function POST(req: Request) {
    try {
        const { phone, otpCode, newPassword } = await req.json()

        if (!phone || !otpCode || !newPassword) {
            return NextResponse.json({ error: 'Dados incompletos para redefinição' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('MISSING ENV VARS in complete-reset')
            return NextResponse.json({ 
                error: 'Erro de configuração no servidor. Contate o administrador.' 
            }, { status: 500 })
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Limpa e compara telefone no backend, sem depender da RPC do banco
        // estar atualizada em produção.
        const fullPhone = onlyDigits(phone)

        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, phone')
            .not('phone', 'is', null)

        if (profileError) {
            console.error('Profile lookup error in complete-reset:', profileError)
            return NextResponse.json({ error: 'Erro ao validar dados de redefinição.' }, { status: 500 })
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
            console.error('OTP lookup error in complete-reset:', otpError)
            return NextResponse.json({ error: 'Erro ao validar código.' }, { status: 500 })
        }

        if (!otp) {
            return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 401 })
        }

        const userId = otp.user_id

        // 2. Atualiza a senha via Auth Admin API
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword
        })

        if (updateError) {
            console.error('Update Auth Error:', updateError)
            return NextResponse.json({ error: 'Erro ao atualizar senha no sistema de autenticação.' }, { status: 500 })
        }

        // 3. Consome o código e limpa o flag force_password_change no perfil
        await supabaseAdmin
            .from('password_reset_otps')
            .update({ is_used: true })
            .eq('id', otp.id)

        await supabaseAdmin
            .from('profiles')
            .update({ force_password_change: false })
            .eq('id', userId)

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Error in complete-reset route:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
