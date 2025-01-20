import { create } from 'zustand'
import { User, UserFilters } from '../types/user'
import { supabase } from '@/lib/supabase'

interface UsersStore {
  users: User[]
  filters: UserFilters
  isModalOpen: boolean
  selectedUserId?: string
  setIsModalOpen: (isOpen: boolean) => void
  setSelectedUserId: (id?: string) => void
  setFilters: (filters: Partial<UserFilters>) => void
  getTotalPages: () => number
  carregarUsuarios: () => Promise<void>
  adicionarUsuario: (data: Omit<User, 'id'>) => Promise<{ success: boolean; error?: string }>
  atualizarUsuario: (id: string, data: Partial<User>) => Promise<{ success: boolean; error?: string }>
  excluirUsuario: (id: string) => Promise<{ success: boolean; error?: string }>
}

export const useUsersStore = create<UsersStore>((set, get) => ({
  users: [],
  filters: {
    perPage: 10,
    currentPage: 1,
  },
  isModalOpen: false,
  selectedUserId: undefined,

  setIsModalOpen: (isOpen) => set({ isModalOpen: isOpen }),
  setSelectedUserId: (id) => set({ selectedUserId: id }),
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  getTotalPages: () => {
    const state = get()
    const filteredUsers = state.users.filter((user) => !user.isAdmin)
    return Math.ceil(filteredUsers.length / state.filters.perPage)
  },

  carregarUsuarios: async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const users = data.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        isAdmin: u.is_admin || false,
        adminRole: u.admin_role,
        isOnline: u.is_online || false,
        lastOnline: new Date(u.last_online),
        credits: u.credits || 0,
        lastConsultation: u.last_consultation ? new Date(u.last_consultation) : undefined
      }))

      set({ users })
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error)
    }
  },

  adicionarUsuario: async (data) => {
    try {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          name: data.name,
          email: data.email,
          is_admin: data.isAdmin,
          admin_role: data.adminRole,
          is_online: data.isOnline,
          last_online: data.lastOnline.toISOString(),
          credits: data.credits,
          last_consultation: data.lastConsultation?.toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      const user: User = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        isAdmin: newUser.is_admin || false,
        adminRole: newUser.admin_role,
        isOnline: newUser.is_online || false,
        lastOnline: new Date(newUser.last_online),
        credits: newUser.credits || 0,
        lastConsultation: newUser.last_consultation ? new Date(newUser.last_consultation) : undefined
      }

      set(state => ({
        users: [user, ...state.users]
      }))

      return { success: true }
    } catch (error: any) {
      console.error('Erro ao adicionar usuário:', error)
      return { success: false, error: error.message }
    }
  },

  atualizarUsuario: async (id, data) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: data.name,
          email: data.email,
          is_admin: data.isAdmin,
          admin_role: data.adminRole,
          is_online: data.isOnline,
          last_online: data.lastOnline?.toISOString(),
          credits: data.credits,
          last_consultation: data.lastConsultation?.toISOString()
        })
        .eq('id', id)

      if (error) throw error

      set(state => ({
        users: state.users.map(u =>
          u.id === id
            ? { ...u, ...data }
            : u
        )
      }))

      return { success: true }
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error)
      return { success: false, error: error.message }
    }
  },

  excluirUsuario: async (id) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error

      set(state => ({
        users: state.users.filter(u => u.id !== id)
      }))

      return { success: true }
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error)
      return { success: false, error: error.message }
    }
  }
}))
