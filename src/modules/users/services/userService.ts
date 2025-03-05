import { pool } from '@/lib/db'
import { User, CreateUserInput, UpdateUserInput } from '../types/user'

export const userService = {
  async getUserById(id: string): Promise<User | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      )
      return result.rows[0] || null
    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error)
      throw error
    }
  },

  async createUser(userData: CreateUserInput): Promise<User> {
    try {
      const result = await pool.query(
        `INSERT INTO users (
          email, password, name, is_admin, admin_role,
          is_online, credits, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *`,
        [
          userData.email,
          userData.password,
          userData.name,
          userData.is_admin || false,
          userData.admin_role,
          false, // is_online
          0 // credits
        ]
      )
      return result.rows[0]
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      throw error
    }
  },

  async updateUser(id: string, userData: UpdateUserInput): Promise<User | null> {
    try {
      const fields = Object.keys(userData)
      const values = Object.values(userData)
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ')
      const query = `
        UPDATE users 
        SET ${setClause}, updated_at = NOW() 
        WHERE id = $1 
        RETURNING *
      `

      const result = await pool.query(query, [id, ...values])
      return result.rows[0] || null
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
      throw error
    }
  },

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [id]
      )
      return result.rowCount > 0
    } catch (error) {
      console.error('Erro ao deletar usuário:', error)
      throw error
    }
  },

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      )
      return result.rows[0] || null
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error)
      throw error
    }
  }
}
