import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID é obrigatório' }, { status: 400 })
    }

    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    )

    return NextResponse.json({ notifications: result.rows })
  } catch (error) {
    console.error('Erro ao buscar notificações:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar notificações' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url)
    const notificationId = url.searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json(
        { error: 'ID da notificação é obrigatório' },
        { status: 400 }
      )
    }

    await pool.query(
      'UPDATE notifications SET read = true WHERE id = $1',
      [notificationId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error)
    return NextResponse.json(
      { error: 'Erro ao marcar notificação como lida' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const notificationId = url.searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json(
        { error: 'ID da notificação é obrigatório' },
        { status: 400 }
      )
    }

    await pool.query('DELETE FROM notifications WHERE id = $1', [notificationId])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir notificação:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir notificação' },
      { status: 500 }
    )
  }
}
