import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// URL base do site dependendo do ambiente
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    console.log('Dados recebidos:', JSON.stringify(data, null, 2))

    // Verificar se o usuário já existe
    console.log('Verificando se o usuário já existe...')
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', data.email)
      .single()

    if (existingUser) {
      console.log('Usuário já existe:', existingUser)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Este email já está cadastrado. Por favor, use outro email ou faça login.'
        },
        { status: 400 }
      )
    }

    // Criar usuário usando signUp normal
    console.log('Criando usuário...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false,
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
      // Verificar se o erro é de usuário já existente
      if (authError.message?.includes('already exists')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Este email já está cadastrado. Por favor, use outro email ou faça login.'
          },
          { status: 400 }
        )
      }
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

    // Enviar email de verificação
    console.log('Enviando email de verificação...')
    const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: data.email,
      options: {
        redirectTo: `${siteUrl}/login?verificado=true`
      }
    })

    if (emailError) {
      console.error('Erro ao enviar email de verificação:', emailError)
      // Não retornamos erro aqui pois o usuário já foi criado
    }

    console.log('Usuário criado com sucesso')
    return NextResponse.json({ 
      success: true,
      message: 'Cadastro realizado com sucesso! Verifique seu email para confirmar sua conta.',
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
