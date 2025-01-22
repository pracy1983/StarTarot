import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// URL base do site dependendo do ambiente
const siteUrl = process.env.NODE_ENV === 'production'
  ? 'https://startarot.netlify.app'
  : 'http://localhost:3000'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    console.log('Dados recebidos:', JSON.stringify(data, null, 2))

    // Criar usuário usando signUp normal
    console.log('Criando usuário...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
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
        email_verified: true
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
