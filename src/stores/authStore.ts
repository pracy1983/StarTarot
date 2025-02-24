import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  isAdmin: boolean
  name?: string
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
        const authData = localStorage.getItem('auth-storage')
        if (authData) {
          try {
            const { state } = JSON.parse(authData)
            if (state.user) {
              set({
                user: state.user,
                isAuthenticated: true,
                isLoading: false
              })
              return
            }
          } catch (error) {
            console.error('Erro ao verificar autenticação:', error)
          }
        }
        set({ user: null, isAuthenticated: false, isLoading: false })
      },

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true })
          
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Erro ao fazer login')
          }

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false
          })

          return { success: true }
        } catch (error: any) {
          console.error('Erro no login:', error)
          set({ isLoading: false })
          return { 
            success: false, 
            error: error.message || 'Erro ao fazer login. Tente novamente.'
          }
        }
      },

      logout: async () => {
        set({ user: null, isAuthenticated: false })
        localStorage.removeItem('auth-storage')
      }
    }),
    {
      name: 'auth-storage',
    }
  )
)
