import { supabase } from '@/lib/supabase'
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
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${siteUrl}/verificar-email`,
        data: {
          name: data.name,
          phone_country_code: data.phoneCountryCode,
          phone_area_code: data.phoneAreaCode,
          phone_number: data.phoneNumber,
          birth_date: data.birthDate
        }
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
    const { error: dbError } = await supabase
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
        email_verified: false
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

    // Fazer logout para garantir que o usuário não está logado
    await supabase.auth.signOut()

    console.log('Usuário criado com sucesso')
    return NextResponse.json({ 
      success: true,
      redirect: '/verificar-email'
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
