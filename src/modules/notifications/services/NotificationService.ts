import { Notification } from '../types/notification'

export class NotificationService {
  static async getNotifications(): Promise<{ data: Notification[] }> {
    // Por enquanto retorna vazio
    return { data: [] }
  }
} 