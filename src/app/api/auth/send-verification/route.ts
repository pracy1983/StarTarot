import { NextResponse } from 'next/server'
import { whatsappService } from '@/lib/whatsapp'

export async function POST(req: Request) {
    try {
        const { phone, code } = await req.json()

        if (!phone || !code) {
            return NextResponse.json({ error: 'Telefone e código são obrigatórios' }, { status: 400 })
        }

        // Envia via WhatsApp
        const success = await whatsappService.sendTextMessage({
            phone: phone,
            message: `✨ *Star Tarot* \n\nSeu código de verificação é: *${code}*\n\nNão compartilhe este código com ninguém.`
        })

        if (!success) {
            return NextResponse.json({ error: 'Não foi possível enviar o código para o WhatsApp.' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Error in send-verification route:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
