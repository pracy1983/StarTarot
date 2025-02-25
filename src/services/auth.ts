import jwt from 'jsonwebtoken'
import { pool } from '@/lib/db'
import bcrypt from 'bcrypt'

interface SignUpData {
  name: string
  email: string
  password: string
}

interface SignInData {
  email: string
  password: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AuthResponse {
  user?: User
  token?: string
  error?: string
}

export async function signIn({ email, password }: SignInData): Promise<AuthResponse> {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    if (rows.length === 0) {
      return { error: 'Credenciais inválidas' }
    }

    const user = rows[0]
    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      return { error: 'Credenciais inválidas' }
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    }
  } catch (error) {
    console.error('Erro ao fazer login:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao fazer login' }
  }
}

export async function signUp({ name, email, password }: SignUpData): Promise<AuthResponse> {
  try {
    // Verificar se o email já existe
    const { rows: existingUsers } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    if (existingUsers.length > 0) {
      return { error: 'Email já cadastrado' }
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const { rows } = await pool.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, 'user']
    )

    const user = rows[0]
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    }
  } catch (error) {
    console.error('Erro ao criar conta:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao criar conta' }
  }
}

export async function sendPasswordResetEmail(email: string): Promise<{ error?: string }> {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    if (rows.length === 0) {
      return { error: 'Email não encontrado' }
    }

    const user = rows[0]
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    )

    // Aqui você implementaria a lógica de envio de email
    console.log(`Token de redefinição de senha para ${email}: ${token}`)

    return {}
  } catch (error) {
    console.error('Erro ao enviar email de recuperação:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao enviar email de recuperação' }
  }
}
