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
  phone?: string | null
  video_enabled?: boolean
  message_enabled?: boolean
  initial_fee?: number
  application_status?: 'pending' | 'approved' | 'rejected' | 'waitlist'
  rejection_reason?: string | null
}

interface AuthState {
  profile: Profile | null
  isAuthenticated: boolean
  isLoading: boolean
  checkAuth: () => Promise<void>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, full_name: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  setProfile: (profile: Profile) => void
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

  signUp: async (email: string, password: string, full_name: string, role: UserRole = 'client') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            role
          }
        }
      })

      if (error) throw error

      if (data.user) {
        // O trigger handle_new_auth_user no Postgres cuidará de criar o perfil
        // Mas podemos forçar o login ou informar ao usuário para checar e-mail (se confirmação ativa)
        // Por padrão, vamos tentar logar ou assumir sucesso.
        return { success: true }
      }
      return { success: false, error: 'Ocorreu um erro ao criar a conta.' }
    } catch (error: any) {
      console.error('Erro no signUp:', error)
      return { success: false, error: error.message || 'Erro ao criar conta' }
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ profile: null, isAuthenticated: false })
  },

  setProfile: (profile: Profile) => {
    set({ profile })
  },
}))
