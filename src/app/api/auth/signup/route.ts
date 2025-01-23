import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// URL base do site dependendo do ambiente
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Dividir nome completo em primeiro nome e sobrenome
    const nameParts = data.name.split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ')

    // 1. Verificar se o email já existe
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUser.users.some(user => user.email === data.email)
    
    if (userExists) {
      return NextResponse.json(
        { success: false, error: 'Este email já está cadastrado.' },
        { status: 400 }
      )
    }

    // 2. Criar usuário no Auth com verificação de email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    })

    if (authError) {
      console.error('Erro ao criar usuário:', authError)
      return NextResponse.json(
        { success: false, error: 'Erro ao criar conta. Tente novamente.' },
        { status: 500 }
      )
    }

    // 3. Criar ou atualizar perfil do usuário na tabela profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        first_name: firstName,
        last_name: lastName || '',
        email: data.email,
        phone_country_code: data.phoneCountryCode,
        phone_area_code: data.phoneAreaCode,
        phone_number: data.phoneNumber,
        birth_date: data.birthDate,
        credits: 0
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      // Se falhar ao criar o perfil, remove o usuário do Auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      console.error('Erro ao criar perfil:', profileError)
      return NextResponse.json(
        { success: false, error: 'Erro ao criar perfil. Tente novamente.' },
        { status: 500 }
      )
    }

    // 4. Enviar email de confirmação
    const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: data.email,
      password: data.password,
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    })

    if (emailError) {
      console.error('Erro ao enviar email:', emailError)
      // Se falhar o envio do email, vamos retornar erro mas não deletar o usuário
      return NextResponse.json(
        { success: false, error: 'Erro ao enviar email de confirmação. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso! Verifique seu email para confirmar.',
      redirect: `/verificar-email?email=${encodeURIComponent(data.email)}`
    })

  } catch (error) {
    console.error('Erro no cadastro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro inesperado. Tente novamente.' },
      { status: 500 }
    )
  }
}
