import { User } from '@/modules/users/types/user'

export class ProfileService {
  async getProfile(userId: string): Promise<any> {
    try {
      const response = await fetch(`/api/users/${userId}`)
      if (!response.ok) {
        throw new Error('Erro ao buscar perfil')
      }
      const profile = await response.json()
      return profile
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
      return null
    }
  }

  async updateProfile(userId: string, data: Partial<User>): Promise<any> {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar perfil')
      }

      const updatedUser = await response.json()
      return { data: updatedUser, error: null }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Erro ao atualizar perfil' }
    }
  }

  async updateEmail(userId: string, email: string): Promise<any> {
    try {
      const response = await fetch(`/api/users/${userId}/email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar email')
      }

      return { error: null }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Erro ao atualizar email' }
    }
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<any> {
    try {
      const response = await fetch(`/api/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar senha')
      }

      return { error: null }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Erro ao atualizar senha' }
    }
  }

  async uploadPhoto(userId: string, photoData: string): Promise<string | null> {
    try {
      // Converter base64 para blob
      const base64Data = photoData.split(',')[1]
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'image/jpeg' })

      // Upload da foto
      const filename = `${userId}/${Date.now()}.jpg`
      const response = await fetch(`/api/users/${userId}/photo`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/jpeg',
        },
        body: blob,
      })

      if (!response.ok) {
        throw new Error('Erro ao fazer upload da foto')
      }

      const publicUrl = await response.text()
      return publicUrl
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error)
      return null
    }
  }
}
