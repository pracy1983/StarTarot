import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('Tentando login para:', email)
    console.log('Senha fornecida:', password)

    if (!email || !password) {
      console.log('Email ou senha não fornecidos')
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar usuário pelo email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    console.log('Resultado da busca:', result.rows)

    console.log('Resultado da busca:', result.rows.length > 0 ? 'Usuário encontrado' : 'Usuário não encontrado')

    if (result.rows.length === 0) {
      console.log('Usuário não encontrado')
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 401 }
      )
    }

    const user = result.rows[0]
    console.log('Senha do banco:', user.password_hash)

    // Verificar senha
    if (user.password_hash !== password) { 
      console.log('Senha incorreta. Esperado:', user.password_hash, 'Recebido:', password)
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
    }

    console.log('Login bem-sucedido')

    // Gerar token JWT com todas as informações necessárias
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        isAdmin: user.is_admin,
        adminRole: user.admin_role,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Configurar cookie
    const cookieStore = cookies()
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 dias
    })

    // Atualizar status online do usuário
    await pool.query(
      'UPDATE users SET is_online = true, last_online = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    )

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.is_admin,
        adminRole: user.admin_role,
        credits: user.credits,
        phoneCountryCode: user.phone_country_code,
        phoneAreaCode: user.phone_area_code,
        phoneNumber: user.phone_number,
        birthDate: user.birth_date,
        emailVerified: user.email_verified,
        lastConsultation: user.last_consultation
      }
    })
  } catch (error) {
    console.error('Erro detalhado no login:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
