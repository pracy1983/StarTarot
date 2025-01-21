import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateVerificationCode } from '@/utils/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    console.log('Dados recebidos:', JSON.stringify(data, null, 2))

    // Verificar se o email já existe usando admin
    const { data: existingUser, error: searchError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', data.email)
      .single()

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('Erro ao verificar email:', searchError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao verificar disponibilidade do email'
        },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Este email já está cadastrado. Por favor, use outro email ou faça login.'
        },
        { status: 400 }
      )
    }

    // Gerar código de verificação
    const verificationCode = generateVerificationCode()
    const verificationExpires = new Date()
    verificationExpires.setHours(verificationExpires.getHours() + 24) // Código válido por 24h

    console.log('Criando usuário no auth...')
    // Criar usuário usando o cliente admin do Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        name: data.name,
      }
    })

    if (authError) {
      console.error('Erro ao criar usuário no auth:', authError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao criar usuário. Por favor, tente novamente.'
        },
        { status: 500 }
      )
    }

    if (!authData.user?.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao criar usuário. ID não gerado.'
        },
        { status: 500 }
      )
    }

    console.log('Usuário criado com sucesso. ID:', authData.user.id)
    console.log('Inserindo dados na tabela users...')

    // Dados que serão inseridos
    const userData = {
      id: authData.user.id,
      name: data.name,
      email: data.email,
      phone_country_code: data.phoneCountryCode,
      phone_area_code: data.phoneAreaCode,
      phone_number: data.phoneNumber,
      birth_date: data.birthDate,
      coupon_code: data.coupon,
      verification_code: verificationCode,
      verification_code_expires_at: verificationExpires.toISOString(),
      is_online: false,
      last_online: new Date().toISOString(),
      credits: 0,
      email_verified: false
    }
    
    console.log('Dados a serem inseridos:', JSON.stringify(userData, null, 2))

    // Inserir dados do usuário na tabela users usando admin
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert([userData])

    if (dbError) {
      console.error('Erro ao inserir dados na tabela users:', dbError)
      // Se houver erro ao criar o registro, deletar o usuário da autenticação
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao salvar dados do usuário. Por favor, tente novamente.'
        },
        { status: 500 }
      )
    }

    console.log('Dados inseridos com sucesso')
    console.log('Enviando email de verificação...')

    // Enviar email com código de verificação
    const response = await fetch(new URL('/api/send-verification-email', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        name: data.name,
        code: verificationCode
      })
    })

    if (!response.ok) {
      console.error('Erro ao enviar email:', await response.text())
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cadastro realizado, mas houve um erro ao enviar o email de verificação.'
        },
        { status: 500 }
      )
    }

    console.log('Email enviado com sucesso')
    return NextResponse.json({ success: true })
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
