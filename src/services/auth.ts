import { supabase } from '@/lib/supabase'

interface SignUpData {
  name: string
  email: string
  password: string
  phoneCountryCode: string
  phoneAreaCode: string
  phoneNumber: string
  birthDate: string
  coupon?: string
}

export const signUp = async (data: SignUpData) => {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Erro no cadastro:', error)
    return { 
      success: false, 
      error: error.message || 'Erro ao realizar cadastro' 
    }
  }
}

export const verifyEmail = async (code: string) => {
  try {
    // Buscar usuário pelo código de verificação
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('verification_code', code)
      .single()

    if (userError) throw userError
    if (!userData) throw new Error('Código inválido')

    // Verificar se o código expirou
    const expiresAt = new Date(userData.verification_code_expires_at)
    if (expiresAt < new Date()) {
      throw new Error('Código expirado')
    }

    // Atualizar usuário como verificado
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        verification_code: null,
        verification_code_expires_at: null
      })
      .eq('id', userData.id)

    if (updateError) throw updateError

    return { success: true }
  } catch (error: any) {
    console.error('Erro na verificação:', error)
    return { 
      success: false, 
      error: error.message || 'Erro ao verificar email' 
    }
  }
}
