import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  email: string
  isAdmin: boolean
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      checkAuth: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            const isAdmin = session.user.user_metadata?.isAdmin || false
            
            set({
              user: {
                id: session.user.id,
                email: session.user.email!,
                isAdmin
              },
              isAuthenticated: true,
              isLoading: false
            })
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false })
          }
        } catch (error) {
          console.error('Erro ao verificar autenticação:', error)
          set({ user: null, isAuthenticated: false, isLoading: false })
        }
      },

      login: async (email: string, password: string) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) throw error

          const isAdmin = data.user?.user_metadata?.isAdmin || false

          set({
            user: {
              id: data.user.id,
              email: data.user.email!,
              isAdmin
            },
            isAuthenticated: true,
            isLoading: false
          })

          return { success: true }
        } catch (error: any) {
          set({ isLoading: false })
          return { success: false, error: error.message }
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut()
          set({ user: null, isAuthenticated: false })
        } catch (error) {
          console.error('Erro ao fazer logout:', error)
        }
      }
    }),
    {
      name: 'auth-storage',
    }
  )
)
