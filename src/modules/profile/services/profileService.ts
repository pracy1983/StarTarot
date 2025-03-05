import { User } from '@/modules/users/types/user'
import { ProfileData } from '../types/profile'

export class ProfileService {
  async getProfile(userId: string): Promise<ProfileData | null> {
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

  async updateProfile(userId: string, data: Partial<ProfileData>): Promise<boolean> {
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
      return true
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      return false
    }
  }

  async updateEmail(userId: string, email: string): Promise<boolean> {
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

      return true
    } catch (error) {
      console.error('Erro ao atualizar email:', error)
      return false
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
      const response = await fetch(`/api/users/${userId}/photo`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photo: photoData }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar foto')
      }

      const data = await response.json()
      return data.photoUrl
    } catch (error) {
      console.error('Erro ao atualizar foto:', error)
      return null
    }
  }
}
