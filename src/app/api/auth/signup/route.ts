import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { sendVerificationEmail } from '@/services/email'

export async function POST(request: Request) {
  try {
    const { email, password, nome, foto } = await request.json()

    // Validação básica
    if (!email || !password || !nome) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o email já existe
    const userExists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )

    if (userExists.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email já está em uso' },
        { status: 400 }
      )
    }

    // Gerar hash da senha
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Criar usuário
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, nome, foto, email_verified)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, email, nome, foto`,
      [email, passwordHash, nome, foto]
    )

    const user = result.rows[0]

    // Gerar token de verificação
    const verificationToken = jwt.sign(
      { userId: user.id, email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    )

    // Enviar email de verificação
    await sendVerificationEmail(email, verificationToken)

    // Gerar token JWT para autenticação
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    // Configurar cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    }

    // Criar resposta com cookie
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          nome: user.nome,
          foto: user.foto
        }
      },
      { status: 201 }
    )

    response.cookies.set('token', token, cookieOptions)

    return response
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao criar usuário' },
      { status: 500 }
    )
  }
}
