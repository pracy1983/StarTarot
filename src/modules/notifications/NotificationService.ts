import axios from 'axios';

interface INotificationService {
  subscribe(): void;
  unsubscribe(): void;
  checkForUpdates(): Promise<void>;
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
      const response = await axios.get('/api/notifications');
      const notifications = response.data;
      // Atualize o estado do sininho de notificações aqui
      console.log('Novas notificações:', notifications);
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
    }
  }
}

export default NotificationService;
