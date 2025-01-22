import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// URL base do site dependendo do ambiente
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    console.log('Dados recebidos:', JSON.stringify(data, null, 2))

    // Criar usuário usando signUp normal
    console.log('Criando usuário...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false, // Alterado para false pois vamos enviar o email manualmente
      user_metadata: {
        name: data.name,
        phone_country_code: data.phoneCountryCode,
        phone_area_code: data.phoneAreaCode,
        phone_number: data.phoneNumber,
        birth_date: data.birthDate
      }
    })

    if (authError) {
      console.error('Erro ao criar usuário:', authError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao criar usuário. Por favor, tente novamente.'
        },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao criar usuário. Por favor, tente novamente.'
        },
        { status: 500 }
      )
    }

    // Inserir dados na tabela users
    console.log('Inserindo dados na tabela users...')
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authData.user.id,
        name: data.name,
        email: data.email,
        phone_country_code: data.phoneCountryCode,
        phone_area_code: data.phoneAreaCode,
        phone_number: data.phoneNumber,
        birth_date: data.birthDate,
        credits: 0,
        email_verified: false // Alterado para false até que o email seja verificado
      }])

    if (dbError) {
      console.error('Erro ao inserir dados na tabela users:', dbError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao salvar dados do usuário. Por favor, tente novamente.'
        },
        { status: 500 }
      )
    }

    // Enviar email de verificação
    console.log('Enviando email de verificação...')
    const verificationResponse = await fetch(`${siteUrl}/api/auth/send-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: data.email })
    })

    if (!verificationResponse.ok) {
      console.error('Erro ao enviar email de verificação:', await verificationResponse.text())
      // Não retornamos erro aqui pois o usuário já foi criado
    }

    console.log('Usuário criado com sucesso')
    return NextResponse.json({ 
      success: true,
      redirect: '/login?cadastro=sucesso'
    })
  } catch (error: any) {
    console.error('Erro completo no cadastro:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro ao realizar cadastro'
      },
      { status: 500 }
    )
  }
}
