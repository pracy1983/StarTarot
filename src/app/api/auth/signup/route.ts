import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// URL base do site dependendo do ambiente
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    console.log('=== DEBUG ===')
    console.log('1. Dados recebidos:', { 
      ...data, 
      password: '[REDACTED]',
      name: data.name || 'CAMPO NAME NÃO ENCONTRADO'
    })
    
    // Dividir nome completo em primeiro nome e sobrenome
    const nameParts = data.name ? data.name.split(' ') : []
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    console.log('2. Nome processado:', { 
      nameParts,
      firstName,
      lastName,
      nameCompleto: data.name
    })

    // 1. Verificar se o email já existe
    console.log('3. Verificando se o email já existe...')
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUser.users.some(user => user.email === data.email)
    
    if (userExists) {
      console.log('4. Email já existe:', data.email)
      return NextResponse.json(
        { success: false, error: 'Este email já está cadastrado.' },
        { status: 400 }
      )
    }

    console.log('5. Email não existe, prosseguindo...')

    // 2. Criar usuário no Auth com verificação de email
    console.log('6. Criando usuário no Auth com dados:', {
      email: data.email,
      metadata: {
        first_name: firstName,
        last_name: lastName
      }
    })

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    })

    if (authError) {
      console.error('7. Erro no Auth:', {
        error: authError,
        code: authError.status,
        message: authError.message
      })
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao criar conta. Tente novamente.',
          details: {
            code: authError.status,
            message: authError.message
          }
        },
        { status: 500 }
      )
    }

    console.log('8. Usuário criado no Auth:', { userId: authData.user.id, userEmail: authData.user.email })

    // 3. Criar ou atualizar perfil do usuário na tabela profiles
    console.log('9. Criando perfil do usuário...')
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
      })

    if (profileError) {
      console.error('10. Erro ao criar perfil:', {
        error: profileError,
        code: profileError.code,
        message: profileError.message
      })
      // Se falhar ao criar o perfil, remove o usuário do Auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao criar perfil. Tente novamente.',
          details: {
            code: profileError.code,
            message: profileError.message
          }
        },
        { status: 500 }
      )
    }

    console.log('11. Perfil criado com sucesso')

    // 4. Enviar email de confirmação
    console.log('12. Enviando email de confirmação...')
    const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: data.email,
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    })

    if (emailError) {
      console.error('13. Erro ao enviar email:', {
        error: emailError,
        code: emailError.status,
        message: emailError.message
      })
      // Se falhar o envio do email, vamos retornar erro mas não deletar o usuário
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao enviar email de confirmação. Tente novamente.',
          details: {
            code: emailError.status,
            message: emailError.message
          }
        },
        { status: 500 }
      )
    }

    console.log('14. Email de confirmação enviado com sucesso')

    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso! Verifique seu email para confirmar.',
      user: authData.user,
      redirect: '/verificar-email'
    })

  } catch (error: any) {
    console.error('15. Erro não tratado:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor.',
        details: {
          message: error.message,
          stack: error.stack
        }
      },
      { status: 500 }
    )
  }
}
