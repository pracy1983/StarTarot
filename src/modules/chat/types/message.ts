export type MessageRole = 'system' | 'user' | 'assistant'

export interface BaseMessage {
  content: string
  role: MessageRole
}

export interface Message extends BaseMessage {
  id: string
  timestamp: Date
}

export interface ApiMessage extends BaseMessage {
  timestamp?: string | Date
}

export interface DatabaseMessage extends BaseMessage {
  id: string
  user_id: string
  created_at: Date | string
}
