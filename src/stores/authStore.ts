import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

// Usuário padrão para desenvolvimento
const DEFAULT_USER = {
  email: 'user@startarot.com',
  password: 'startarot123',
  userData: {
    id: '1',
    name: 'Usuário StarTarot',
    email: 'user@startarot.com'
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        // Simula delay de rede
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Verifica credenciais com usuário padrão
        if (email === DEFAULT_USER.email && password === DEFAULT_USER.password) {
          set({
            user: DEFAULT_USER.userData,
            isAuthenticated: true
          })
          return { success: true }
        }

        return {
          success: false,
          error: 'Email ou senha incorretos'
        }
      },
      logout: () => {
        set({
          user: null,
          isAuthenticated: false
        })
      }
    }),
    {
      name: 'auth-storage',
      skipHydration: true
    }
  )
)
