import { NotificationData } from '@/types/notifications'

export class NotificationService {
  async getNotifications(userId: string): Promise<NotificationData[]> {
    try {
      const response = await fetch(`/api/notifications/${userId}`)
      if (!response.ok) {
        throw new Error('Erro ao buscar notificações')
      }
      const data = await response.json()
      return data.notifications
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
      return []
    }
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      })
      if (!response.ok) {
        throw new Error('Erro ao marcar notificação como lida')
      }
      return true
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
      return false
    }
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        throw new Error('Erro ao excluir notificação')
      }
      return true
    } catch (error) {
      console.error('Erro ao excluir notificação:', error)
      return false
    }
  }
}
