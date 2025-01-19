export interface Message {
  id: string
  role: 'system' | 'user' | 'agent'
  content: string
  sender: 'user' | 'agent'
  timestamp: Date
}
