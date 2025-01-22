import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// URL base do site dependendo do ambiente
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // 1. Verificar se o email já está em uso
    const { data: existingUser, error: searchError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', data.email)
      .maybeSingle()

    if (searchError) {
      return NextResponse.json(
        { success: false, error: 'Erro ao verificar email. Tente novamente.' },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Este email já está cadastrado.' },
        { status: 400 }
      )
    }

    // 2. Criar o usuário no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, error: 'Erro ao criar conta. Tente novamente.' },
        { status: 500 }
      )
    }

    // 3. Criar o perfil do usuário
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: data.email,
        name: data.name,
        phone_country_code: data.phoneCountryCode,
        phone_area_code: data.phoneAreaCode,
        phone_number: data.phoneNumber,
        birth_date: data.birthDate,
        credits: 0,
        email_verified: false
      })

    if (profileError) {
      return NextResponse.json(
        { success: false, error: 'Erro ao salvar perfil. Tente novamente.' },
        { status: 500 }
      )
    }

    // 4. Enviar email de verificação
    const { error: emailError } = await supabaseAdmin.auth.admin.sendEmailInvite({
      email: data.email,
      options: {
        data: { name: data.name }
      }
    })

    // Se falhar o envio do email, ainda retornamos sucesso pois a conta foi criada
    if (emailError) {
      console.error('Erro ao enviar email:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso! Verifique seu email.',
      redirect: '/login?cadastro=sucesso'
    })

  } catch (error) {
    console.error('Erro no cadastro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro inesperado. Tente novamente.' },
      { status: 500 }
    )
  }
}
