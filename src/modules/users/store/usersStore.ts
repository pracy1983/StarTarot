import { create } from 'zustand'
import { createStore } from 'zustand/vanilla'
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

const createUsersStore = () =>
  createStore<UsersState>()((set, get) => ({
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
          lastOnline: u.last_online ? new Date(u.last_online) : undefined,
          credits: u.credits,
          lastConsultation: u.last_consultation ? new Date(u.last_consultation) : undefined
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
          'INSERT INTO users (email, name, is_admin, admin_role) VALUES ($1, $2, $3, $4) RETURNING id',
          [data.email, data.name, data.isAdmin, data.adminRole]
        )

        const newUser = { ...data, id: result.rows[0].id }
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
          .map(([key, _], index) => `${key} = $${index + 2}`)
          .join(', ')

        await pool.query(
          `UPDATE users SET ${updateFields} WHERE id = $1`,
          [id, ...Object.values(data)]
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

let store: ReturnType<typeof createUsersStore>

const initializeStore = (preloadedState: Partial<UsersState> = {}) => {
  const _store = store ?? createUsersStore()

  if (preloadedState) {
    _store.setState({
      ..._store.getState(),
      ...preloadedState,
    })
  }

  if (typeof window === 'undefined') return _store
  if (!store) store = _store

  return _store
}

export const useUsersStore = create<UsersState>(initializeStore)
