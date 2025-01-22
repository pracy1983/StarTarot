import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// URL base do site dependendo do ambiente
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${siteUrl}/login?verificado=true`
      }
    })

    if (error) {
      console.error('Erro ao gerar link de verificação:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao enviar email de verificação. Por favor, tente novamente.'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao enviar email de verificação:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro ao enviar email de verificação'
      },
      { status: 500 }
    )
  }
}
