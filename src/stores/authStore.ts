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
        // Buscamos o perfil sem o join primeiro para ver se o erro 500 persiste
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (error) {
          console.error('Erro ao buscar perfil (checkAuth):', error)
          set({ profile: null, isAuthenticated: false, isLoading: false })
          return
        }

        if (profile) {
          // Buscamos a carteira separadamente para evitar erro de join 500
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', profile.id)
            .single()

          set({
            profile: {
              ...profile,
              credits: wallet?.balance || 0
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
      console.error('Erro no checkAuth:', error)
      set({ profile: null, isAuthenticated: false, isLoading: false })
    }
  },

  login: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      if (data.user) {
        // Query separada para evitar o erro 500 do Join observado no console
        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (pError) {
          console.error('Erro ao buscar perfil após login:', pError)
          throw new Error('Perfil não encontrado no banco de dados.')
        }

        if (profile) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', profile.id)
            .single()

          set({
            profile: {
              ...profile,
              credits: wallet?.balance || 0
            },
            isAuthenticated: true
          })
          return { success: true }
        }
      }
      return { success: false, error: 'Usuário autenticado mas perfil não localizado.' }
    } catch (error: any) {
      console.error('Erro detalhado no login:', error)
      return { success: false, error: error.message || 'Credenciais inválidas' }
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ profile: null, isAuthenticated: false })
  },
}))
