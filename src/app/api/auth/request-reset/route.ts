import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { whatsappService } from '@/lib/whatsapp'

export async function POST(req: Request) {
    try {
        const { email, phone } = await req.json()

        if (!email || !phone) {
            return NextResponse.json({ error: 'Email e telefone são obrigatórios' }, { status: 400 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Limpa e formata o telefone
        const cleanPhone = phone.replace(/\D/g, '')
        const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone

        // 2. Gerar OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min

        // 3. Chama o banco usando a RPC para bypass de RLS
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('request_password_reset', {
            p_email: email,
            p_phone: fullPhone,
            p_otp_code: otp,
            p_expires_at: expiresAt
        })

        if (rpcError) {
            console.error('RPC Error:', rpcError)
            return NextResponse.json({ error: rpcError.message }, { status: 500 })
        }

        const result = Array.isArray(rpcData) ? rpcData[0] : rpcData
        if (!result || !result.success) {
            return NextResponse.json({ 
                error: result?.error || 'Dados não conferem. Verifique seu e-mail e telefone.' 
            }, { status: 404 })
        }

        // 4. Envia via WhatsApp (agora temos o nome e o telefone correto do banco)
        const success = await whatsappService.sendTextMessage({
            phone: result.user_phone || fullPhone,
            message: `🔐 *Recuperação de Senha - Star Tarot* \n\nOlá ${result.full_name}, seu código para redefinir sua senha é: *${otp}*\n\nEste código expira em 15 minutos.`
        })

        if (!success) {
            return NextResponse.json({ error: 'Não foi possível enviar o código para o WhatsApp.' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Error in request-reset route:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
