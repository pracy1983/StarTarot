'use server'

import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { pool } from '@/lib/db'

export async function getServerUser() {
  const cookieStore = cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    const { rows } = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [decoded.userId]
    )

    if (rows.length === 0) {
      return null
    }

    return rows[0]
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}

export async function serverSignOut() {
  cookies().delete('token')
}

export async function verifyEmailAction(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    await pool.query(
      'UPDATE users SET email_verified = true WHERE id = $1',
      [decoded.userId]
    )
    return { success: true }
  } catch (error) {
    console.error('Error verifying email:', error)
    return { error: 'Token inválido ou expirado' }
  }
}
