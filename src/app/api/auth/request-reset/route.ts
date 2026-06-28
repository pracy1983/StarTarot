import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { whatsappService } from '@/lib/whatsapp'
import { onlyDigits, phoneMatches } from '@/utils/phone'

function maskPhone(phone?: string | null) {
    const digits = (phone || '').replace(/\D/g, '')
    if (digits.length <= 4) return '****'
    return `${digits.slice(0, 4)}****${digits.slice(-4)}`
}

function maskEmail(value?: string | null) {
    const email = (value || '').trim().toLowerCase()
    const [name, domain] = email.split('@')
    if (!name || !domain) return '****'
    return `${name.slice(0, 2)}****@${domain}`
}

export async function POST(req: Request) {
    try {
        const { email, phone } = await req.json()

        if (!email || !phone) {
            return NextResponse.json({ error: 'Email e telefone são obrigatórios' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('MISSING ENV VARS:', { hasUrl: !!supabaseUrl, hasServiceKey: !!supabaseServiceKey })
            return NextResponse.json({ 
                error: 'Erro de configuração no servidor (Service Role Key ausente). Contate o administrador.' 
            }, { status: 500 })
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Limpa o telefone sem depender de RPC/migration já aplicada em produção.
        const fullPhone = onlyDigits(phone)
        const normalizedEmail = email.trim().toLowerCase()

        // 2. Gerar OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min

        // 3. Busca perfil via service role e compara telefone com tolerância a
        // máscara, +55 e variação brasileira com/sem nono dígito.
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, email, phone')
            .ilike('email', normalizedEmail)

        if (profileError) {
            console.error('Profile lookup error:', profileError)
            return NextResponse.json({ error: 'Erro ao validar dados de recuperação.' }, { status: 500 })
        }

        const profile = profiles?.find(item => phoneMatches(item.phone, fullPhone))
        if (!profile) {
            return NextResponse.json({
                error: 'Dados não conferem. Verifique seu e-mail e telefone.'
            }, { status: 404 })
        }

        const { error: otpError } = await supabaseAdmin
            .from('password_reset_otps')
            .insert({ user_id: profile.id, otp_code: otp, expires_at: expiresAt })

        if (otpError) {
            console.error('OTP insert error:', otpError)
            return NextResponse.json({ error: 'Erro ao gerar código. Tente novamente.' }, { status: 500 })
        }

        console.log('Password reset OTP requested:', {
            email: maskEmail(normalizedEmail),
            inputPhone: maskPhone(fullPhone),
            profilePhone: maskPhone(profile.phone),
            userId: profile.id
        })

        // 4. Envia via WhatsApp
        const resultWA = await whatsappService.sendTextMessage({
            phone: profile.phone || fullPhone,
            message: `🔐 *Recuperação de Senha - Star Tarot* \n\nOlá ${profile.full_name}, seu código para redefinir sua senha é: *${otp}*\n\nEste código expira em 15 minutos.`
        })

        if (!resultWA.success) {
            return NextResponse.json({ 
                error: `Erro ao enviar WhatsApp: ${resultWA.error || 'Erro desconhecido'}. Verifique se o serviço está online.` 
            }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Error in request-reset route:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
