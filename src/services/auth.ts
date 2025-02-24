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

export const sendPasswordResetEmail = async (email: string) => {
  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      throw new Error('Erro ao enviar email de recuperação')
    }

    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro ao enviar email de recuperação' }
  }
}

export const verifyEmail = async (token: string) => {
  try {
    const response = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    if (!response.ok) {
      throw new Error('Erro ao verificar email')
    }

    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro ao verificar email' }
  }
}
