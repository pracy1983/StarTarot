import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT * FROM oraculistas WHERE disponivel = true ORDER BY nome'
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar variáveis de prompt:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar variáveis' },
      { status: 500 }
    )
  }
}
