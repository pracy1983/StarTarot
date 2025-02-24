import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { sendVerificationEmail } from '@/services/email'

// URL base do site dependendo do ambiente
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o usuário existe
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const user = result.rows[0]

    // Gerar token de verificação
    const verificationToken = jwt.sign(
      { userId: user.id, email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    )

    // Enviar email de verificação
    await sendVerificationEmail(email, verificationToken)

    return NextResponse.json({
      success: true,
      message: 'Email de verificação enviado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao enviar email de verificação:', error)
    return NextResponse.json(
      { error: 'Erro ao enviar email de verificação' },
      { status: 500 }
    )
  }
}
