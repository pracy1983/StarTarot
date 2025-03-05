import { create } from 'zustand'
import { pool } from '@/lib/db'

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
  isModalOpen: boolean
  setIsModalOpen: (isOpen: boolean) => void
  fetchUsers: () => Promise<void>
  createUser: (data: Omit<User, 'id'>) => Promise<void>
  updateUser: (id: string, data: Partial<User>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
}

const initialState: Pick<UsersState, 'users' | 'loading' | 'error' | 'isModalOpen'> = {
  users: [],
  loading: false,
  error: null,
  isModalOpen: false,
}

export const useUsersStore = create<UsersState>((set, get) => ({
  ...initialState,

  setIsModalOpen: (isOpen) => set({ isModalOpen: isOpen }),

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
        lastOnline: u.last_online,
        credits: u.credits,
        lastConsultation: u.last_consultation
      }))

      set({ users, loading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao buscar usuários', loading: false })
    }
  },

  createUser: async (data) => {
    try {
      set({ loading: true, error: null })

      const result = await pool.query(
        'INSERT INTO users (email, name, is_admin, admin_role, is_online, last_online, credits, last_consultation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [
          data.email,
          data.name,
          data.isAdmin,
          data.adminRole,
          data.isOnline,
          data.lastOnline,
          data.credits,
          data.lastConsultation
        ]
      )

      const newUser = {
        id: result.rows[0].id,
        ...data
      }

      set((state) => ({
        users: [...state.users, newUser],
        loading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao criar usuário', loading: false })
    }
  },

  updateUser: async (id, data) => {
    try {
      set({ loading: true, error: null })

      const updateFields = Object.entries(data)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _], index) => {
          // Converter camelCase para snake_case para o SQL
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
          return `${snakeKey} = $${index + 2}`
        })
        .join(', ')

      if (updateFields.length === 0) {
        set({ loading: false })
        return
      }

      const values = [
        id,
        ...Object.entries(data)
          .filter(([_, value]) => value !== undefined)
          .map(([_, value]) => value)
      ]

      await pool.query(
        `UPDATE users SET ${updateFields} WHERE id = $1`,
        values
      )

      set((state) => ({
        users: state.users.map((user) =>
          user.id === id ? { ...user, ...data } : user
        ),
        loading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao atualizar usuário', loading: false })
    }
  },

  deleteUser: async (id) => {
    try {
      set({ loading: true, error: null })

      await pool.query('DELETE FROM users WHERE id = $1', [id])

      set((state) => ({
        users: state.users.filter((user) => user.id !== id),
        loading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao excluir usuário', loading: false })
    }
  },
}))
