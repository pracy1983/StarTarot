export class AuthService {
  async login(email: string, password: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error('Erro ao fazer login')
      }

      return true
    } catch (error) {
      console.error('Erro ao fazer login:', error)
      return false
    }
  }

  async signup(email: string, password: string, name: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      })

      if (!response.ok) {
        throw new Error('Erro ao criar conta')
      }

      return true
    } catch (error) {
      console.error('Erro ao criar conta:', error)
      return false
    }
  }

  async logout(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Erro ao fazer logout')
      }

      return true
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      return false
    }
  }

  async forgotPassword(email: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error('Erro ao solicitar redefinição de senha')
      }

      return true
    } catch (error) {
      console.error('Erro ao solicitar redefinição de senha:', error)
      return false
    }
  }

  async resetPassword(token: string, password: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      if (!response.ok) {
        throw new Error('Erro ao redefinir senha')
      }

      return true
    } catch (error) {
      console.error('Erro ao redefinir senha:', error)
      return false
    }
  }

  async verifyEmail(token: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        throw new Error('Erro ao verificar email')
      }

      return true
    } catch (error) {
      console.error('Erro ao verificar email:', error)
      return false
    }
  }
}
