import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    console.log('Dados recebidos:', data)

    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: data.email,
    })

    if (error) {
      console.error('Erro ao gerar link:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao enviar email de verificação'
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao enviar email:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro ao processar requisição'
    })
  }
}
