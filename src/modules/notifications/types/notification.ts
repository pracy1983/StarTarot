export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
  data?: Record<string, unknown>;
} 