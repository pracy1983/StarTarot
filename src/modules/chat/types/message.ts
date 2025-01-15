// Tipo para mensagens no serviço de chat (API)
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// Tipo para mensagens na UI
export interface UIMessage {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
}

// Função auxiliar para converter entre tipos
export function convertChatToUIMessage(msg: ChatMessage): UIMessage {
  return {
    id: Date.now().toString(),
    content: msg.content,
    sender: msg.role === 'system' ? 'assistant' : msg.role,
    timestamp: new Date()
  }
}

// Função auxiliar para converter UI para chat
export function convertUIToChatMessage(msg: UIMessage): ChatMessage {
  return {
    role: msg.sender,
    content: msg.content
  }
}
