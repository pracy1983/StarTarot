import { supabase } from '@/lib/supabase'

interface NotificationData {
  id: string
  message: string
  created_at: string
  read: boolean
}

export class NotificationService {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private readonly pollingInterval: number
  private lastCheck: Date | null = null

  constructor(pollingIntervalMs: number = 30000) {
    this.pollingInterval = pollingIntervalMs
  }

  private async checkForUpdates(): Promise<void> {
    try {
      const now = new Date()
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('read', false)
        .gte('created_at', this.lastCheck?.toISOString() || now.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar notificações:', error)
        return
      }

      if (notifications && notifications.length > 0) {
        // Aqui você pode emitir um evento ou chamar uma callback
        console.log('Novas notificações:', notifications)
      }

      this.lastCheck = now
    } catch (error) {
      console.error('Erro ao verificar notificações:', error)
    }
  }

  public subscribe(): void {
    this.intervalId = setInterval(async () => {
      await this.checkForUpdates()
    }, this.pollingInterval)
  }

  public unsubscribe(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}
