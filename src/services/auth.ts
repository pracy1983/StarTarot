import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { pool } from '@/lib/db'
import bcrypt from 'bcrypt'

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

export async function login(email: string, password: string) {
  try {
    const result = await pool.query(
      'SELECT id, email, nome, foto, password_hash FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      throw new Error('Usuário não encontrado')
    }

    const user = result.rows[0]
    const passwordMatch = await bcrypt.compare(password, user.password_hash)

    if (!passwordMatch) {
      throw new Error('Senha incorreta')
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    const cookieStore = cookies()
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    })

    return {
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        foto: user.foto
      }
    }
  } catch (error) {
    console.error('Erro ao fazer login:', error)
    throw error
  }
}

export async function logout() {
  try {
    const cookieStore = cookies()
    cookieStore.delete('token')
    return { success: true }
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
    throw error
  }
}

export async function resetPassword(email: string) {
  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      throw new Error('Usuário não encontrado')
    }

    const user = result.rows[0]
    const resetToken = jwt.sign(
      { userId: user.id, email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    )

    // TODO: Implementar envio de email com link de redefinição de senha
    // await sendPasswordResetEmail(email, resetToken)

    return { success: true }
  } catch (error) {
    console.error('Erro ao solicitar redefinição de senha:', error)
    throw error
  }
}

export async function verifyEmail(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string
      email: string
    }

    await pool.query(
      'UPDATE users SET email_verified = true WHERE id = $1',
      [decoded.userId]
    )

    return { success: true }
  } catch (error) {
    console.error('Erro ao verificar email:', error)
    throw error
  }
}

export async function getUser() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return null
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string
      email: string
    }

    const result = await pool.query(
      'SELECT id, email, nome, foto FROM users WHERE id = $1',
      [decoded.userId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const user = result.rows[0]
    return {
      id: user.id,
      email: user.email,
      nome: user.nome,
      foto: user.foto
    }
  } catch (error) {
    console.error('Erro ao obter usuário:', error)
    return null
  }
}

export async function signUp(data: SignUpData) {
  try {
    const result = await pool.query(
      'INSERT INTO users (nome, email, password_hash, phone_country_code, phone_area_code, phone_number, birth_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        data.name,
        data.email,
        await bcrypt.hash(data.password, 10),
        data.phoneCountryCode,
        data.phoneAreaCode,
        data.phoneNumber,
        data.birthDate
      ]
    )

    const user = result.rows[0]
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    const cookieStore = cookies()
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    })

    return {
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        foto: user.foto
      }
    }
  } catch (error) {
    console.error('Erro ao fazer cadastro:', error)
    throw error
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  try {
    // TODO: Implementar envio de email com link de redefinição de senha
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro ao enviar email de recuperação' }
  }
}
