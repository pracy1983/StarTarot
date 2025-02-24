import { create } from 'zustand'
import pool from '@/lib/db'

interface User {
  id: string
  email: string
  name?: string
  isAdmin: boolean
  adminRole?: string
  isOnline?: boolean
  lastOnline?: Date
  credits?: number
  lastConsultation?: Date
}

interface UsersState {
  users: User[]
  loading: boolean
  error: string | null
  fetchUsers: () => Promise<void>
  createUser: (data: Omit<User, 'id'>) => Promise<void>
  updateUser: (id: string, data: Partial<User>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    try {
      set({ loading: true, error: null })

      const result = await pool.query(
        'SELECT id, email, name, is_admin, admin_role, is_online, last_online, credits, last_consultation FROM users ORDER BY created_at DESC'
      )

      const users = result.rows.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        isAdmin: u.is_admin,
        adminRole: u.admin_role,
        isOnline: u.is_online,
        lastOnline: u.last_online ? new Date(u.last_online) : undefined,
        credits: u.credits,
        lastConsultation: u.last_consultation ? new Date(u.last_consultation) : undefined
      }))

      set({ users, loading: false })
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error)
      set({ error: error.message, loading: false })
    }
  },

  createUser: async (data: Omit<User, 'id'>) => {
    try {
      set({ loading: true, error: null })

      const result = await pool.query(
        'INSERT INTO users (email, name, is_admin, admin_role, is_online, last_online, credits, last_consultation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, name, is_admin, admin_role, is_online, last_online, credits, last_consultation',
        [data.email, data.name, data.isAdmin, data.adminRole, data.isOnline, data.lastOnline?.toISOString(), data.credits, data.lastConsultation?.toISOString()]
      )

      const newUser = result.rows[0]
      set(state => ({
        users: [newUser, ...state.users],
        loading: false
      }))
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error)
      set({ error: error.message, loading: false })
    }
  },

  updateUser: async (id: string, data: Partial<User>) => {
    try {
      set({ loading: true, error: null })

      const fields = Object.keys(data)
      const values = Object.values(data)
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ')
      const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING id, email, name, is_admin, admin_role, is_online, last_online, credits, last_consultation`

      const result = await pool.query(query, [id, ...values])

      const updatedUser = result.rows[0]
      set(state => ({
        users: state.users.map(user => user.id === id ? updatedUser : user),
        loading: false
      }))
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error)
      set({ error: error.message, loading: false })
    }
  },

  deleteUser: async (id: string) => {
    try {
      set({ loading: true, error: null })

      await pool.query('DELETE FROM users WHERE id = $1', [id])

      set(state => ({
        users: state.users.filter(user => user.id !== id),
        loading: false
      }))
    } catch (error: any) {
      console.error('Erro ao deletar usuário:', error)
      set({ error: error.message, loading: false })
    }
  }
}))
