import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Inicializar cliente Supabase Admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
)

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const firstName = data.firstName?.trim()
    const lastName = data.lastName?.trim()

    if (!data.email || !data.password || !firstName) {
      return NextResponse.json(
        { success: false, error: 'Dados incompletos.' },
        { status: 400 }
      )
    }

    // 1. Criar usuário com signUp e confirmação de email habilitada
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    })

    if (signUpError) {
      console.error('Erro ao criar usuário:', signUpError)
      return NextResponse.json(
        { success: false, error: 'Erro ao criar conta. Tente novamente.' },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { success: false, error: 'Erro ao criar usuário.' },
        { status: 500 }
      )
    }

    // 2. Criar perfil do usuário
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
      console.error('Erro ao criar perfil:', profileError)
      // Se falhar ao criar o perfil, remove o usuário do Auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { success: false, error: 'Erro ao criar perfil. Tente novamente.' },
        { status: 500 }
      )
    }

    // 3. Reenviar email de confirmação explicitamente
    const { error: resendError } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email: data.email,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`
      }
    })

    if (resendError) {
      console.error('Erro ao reenviar email:', resendError)
      // Não vamos deletar o usuário se falhar o envio do email
      return NextResponse.json(
        { success: false, error: 'Erro ao enviar email de confirmação. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Usuário criado com sucesso. Por favor, verifique seu email para confirmar sua conta.' 
    })

  } catch (error) {
    console.error('Erro no servidor:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
