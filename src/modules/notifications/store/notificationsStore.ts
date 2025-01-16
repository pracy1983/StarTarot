import { create } from 'zustand'
import { NotificationService } from '../services/NotificationService'

interface NotificationData {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  timestamp: Date;
}

interface NotificationState {
  notifications: NotificationData[];
  loading: boolean;
  error: string | null;
}

export const useNotificationStore = create<NotificationState>((set: any) => ({
  notifications: [],
  loading: false,
  error: null,

  loadNotifications: async () => {
    try {
      set({ loading: true, error: null });
      const response = await NotificationService.getNotifications();
      set({ notifications: response.data || [], loading: false });
    } catch (err) {
      const error = err as Error;
      set({ error: error.message, loading: false });
    }
  }
})); 