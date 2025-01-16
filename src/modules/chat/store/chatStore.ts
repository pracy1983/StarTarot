import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from '@/stores/authStore'
import { UIMessage } from '../types/message'

interface Message {
  id: string
  content: string
  sender: 'user' | 'agent'
  timestamp: Date
}

const INITIAL_MESSAGE: UIMessage = {
  id: '0',
  content: 'Olá, vamos escolher o melhor oraculista pra você? Me fale um pouco no que acredita e que tipo de ajuda precisa.',
  sender: 'assistant',
  timestamp: new Date()
}

interface ChatState {
  isMinimized: boolean
  messages: UIMessage[]
  threadId: string | null
  setMinimized: (state: boolean) => void
  addMessage: (message: UIMessage) => void
  setThreadId: (threadId: string) => void
  resetChat: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      isMinimized: false,
      messages: [INITIAL_MESSAGE],
      threadId: null,
      setMinimized: (state) => set({ isMinimized: state }),
      addMessage: (message) => set((state) => ({ 
        messages: [...state.messages, message] 
      })),
      setThreadId: (threadId) => set({ threadId }),
      resetChat: () => set({ 
        messages: [INITIAL_MESSAGE],
        isMinimized: false,
        threadId: null
      })
    }),
    {
      name: 'chat-storage',
    }
  )
)
