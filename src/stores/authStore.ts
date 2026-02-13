import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type UserRole = 'owner' | 'oracle' | 'client'

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  is_ai: boolean
  specialty: string | null
  credits?: number
}

interface AuthState {
  profile: Profile | null
  isAuthenticated: boolean
  isLoading: boolean
  checkAuth: () => Promise<void>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  isAuthenticated: false,
  isLoading: true,

  checkAuth: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*, wallets(balance)')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          set({
            profile: {
              ...profile,
              credits: profile.wallets?.[0]?.balance || 0
            },
            isAuthenticated: true,
            isLoading: false
          })
        } else {
          set({ profile: null, isAuthenticated: false, isLoading: false })
        }
      } else {
        set({ profile: null, isAuthenticated: false, isLoading: false })
      }
    } catch (error) {
      set({ profile: null, isAuthenticated: false, isLoading: false })
    }
  },

  login: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, wallets(balance)')
          .eq('id', data.user.id)
          .single()

        if (profile) {
          set({
            profile: {
              ...profile,
              credits: profile.wallets?.[0]?.balance || 0
            },
            isAuthenticated: true
          })
          return { success: true }
        }
      }
      return { success: false, error: 'Perfil não encontrado' }
    } catch (error: any) {
      console.error('Erro no login:', error)
      return { success: false, error: error.message || 'Credenciais inválidas' }
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ profile: null, isAuthenticated: false })
  },
}))
