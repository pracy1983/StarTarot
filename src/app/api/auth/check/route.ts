import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT id, email, name, is_admin, password FROM users WHERE email = $1',
      ['paularacy@gmail.com']
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado' })
    }

    return NextResponse.json({ user: result.rows[0] })
  } catch (error) {
    console.error('Erro ao verificar usuário:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' })
  }
}
