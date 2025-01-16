import axios from 'axios';

interface INotificationService {
  subscribe(): void;
  unsubscribe(): void;
  checkForUpdates(): Promise<void>;
}

interface NotificationData {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  timestamp: Date;
}

interface NotificationResponse {
  data: NotificationData[];
}

class NotificationService implements INotificationService {
  private pollingInterval: number;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(pollingInterval: number = 5000) {
    this.pollingInterval = pollingInterval;
  }

  public subscribe(): void {
    this.intervalId = setInterval(async () => {
      await this.checkForUpdates();
    }, this.pollingInterval);
  }

  public unsubscribe(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public async checkForUpdates(): Promise<void> {
    try {
      const response = await axios.get<NotificationResponse>('/api/notifications');
      const notifications = response.data;
      console.log('Novas notificações:', notifications);
    } catch (error: any) {
      const err = error as Error | { message: string };
      console.error('Erro ao verificar atualizações:', err.message);
    }
  }
}

export default NotificationService;
