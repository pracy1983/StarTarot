import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

        // 1. Limpa e formata o telefone (garante consistência com a RPC)
        const cleanPhone = phone.replace(/\D/g, '')
        const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone

        // 2. Valida o OTP via RPC (Segunda validação no servidor para segurança)
        const { data: verifyData, error: verifyError } = await supabaseAdmin.rpc('verify_password_reset_otp', {
            p_phone: '+' + fullPhone,
            p_otp_code: otpCode
        })

        if (verifyError) {
            console.error('Verify RPC Error:', verifyError)
            return NextResponse.json({ error: verifyError.message }, { status: 500 })
        }

        const result = Array.isArray(verifyData) ? verifyData[0] : verifyData
        if (!result || !result.success) {
            return NextResponse.json({ 
                error: result?.error || 'Código inválido ou expirado.' 
            }, { status: 401 })
        }

        const userId = result.user_id

        // 3. Atualiza a senha via Auth Admin API
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword
        })

        if (updateError) {
            console.error('Update Auth Error:', updateError)
            return NextResponse.json({ error: 'Erro ao atualizar senha no sistema de autenticação.' }, { status: 500 })
        }

        // 4. Limpa o flag force_password_change no perfil
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
