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

    // 1. Criar usuário com verificação de email
    console.log('3. Criando usuário com verificação de email...')
    const redirectUrl = `${siteUrl}/verificar-email?email=${encodeURIComponent(data.email)}`
    
    console.log('3.1 Configurando redirecionamento:', {
      redirectUrl,
      siteUrl,
      email: data.email
    })

    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    })

    // Verificar se o email foi enviado
    if (!signUpData.user?.identities || signUpData.user.identities.length === 0) {
      throw new Error('Usuário já existe')
    }

    if (!signUpData.user || signUpError) {
      throw new Error(signUpError?.message || 'Erro ao criar usuário')
    }

    console.log('3.2 Usuário criado com sucesso:', {
      userId: signUpData.user.id,
      email: signUpData.user.email
    })

    // 2. Criar ou atualizar perfil do usuário na tabela profiles
    console.log('4. Criando perfil do usuário...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: signUpData.user.id,
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
      console.error('5. Erro ao criar perfil:', {
        error: profileError,
        code: profileError.code,
        message: profileError.message
      })
      // Se falhar ao criar o perfil, remove o usuário do Auth
      await supabaseAdmin.auth.admin.deleteUser(signUpData.user.id)
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

    console.log('6. Perfil criado com sucesso')

    if (signUpError) {
      // Converter para AuthError se necessário
      const authError = signUpError as { status?: number; message?: string }
      
      const errorDetails = {
        code: authError.status || 500,
        message: authError.message || 'Erro desconhecido ao enviar email de confirmação'
      }
      
      console.error('13. Erro ao enviar email:', {
        error: signUpError,
        code: errorDetails.code,
        message: errorDetails.message
      })
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao enviar email de confirmação. Tente novamente.',
          details: errorDetails
        },
        { status: errorDetails.code }
      )
    }

    console.log('14. Email de confirmação enviado com sucesso')

    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso! Verifique seu email para confirmar.',
      user: signUpData.user,
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
