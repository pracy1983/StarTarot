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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

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
            isAuthenticated: true
          })

          return { success: true }
        } catch (error: any) {
          return { success: false, error: error.message }
        }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({
          user: null,
          isAuthenticated: false
        })
      }
    }),
    {
      name: 'auth-storage',
    }
  )
)
