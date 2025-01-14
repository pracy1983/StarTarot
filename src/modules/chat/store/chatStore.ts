import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from '@/stores/authStore'

interface Message {
  id: string
  content: string
  sender: 'user' | 'agent'
  timestamp: Date
}

const INITIAL_MESSAGE: Message = {
  id: '0',
  content: 'Olá, vamos escolher o melhor oraculista pra você? Me fale um pouco no que acredita e que tipo de ajuda precisa.',
  sender: 'agent',
  timestamp: new Date()
}

interface ChatState {
  isMinimized: boolean
  messages: Message[]
  threadId: string | null
  setMinimized: (state: boolean) => void
  addMessage: (message: Message) => void
  resetChat: () => void
  setThreadId: (id: string) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      isMinimized: false,
      messages: [INITIAL_MESSAGE],
      threadId: null,
      setMinimized: (state) => set({ isMinimized: state }),
      addMessage: (message) => set((state) => {
        // Mantém apenas as últimas 10 mensagens no localStorage
        const updatedMessages = [...state.messages, message].slice(-10)
        return { messages: updatedMessages }
      }),
      resetChat: () => set({ 
        messages: [INITIAL_MESSAGE],
        isMinimized: false 
      }),
      setThreadId: (id) => set({ threadId: id })
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        // Persiste apenas as últimas 10 mensagens e o estado minimizado
        messages: state.messages.slice(-10),
        isMinimized: state.isMinimized,
        threadId: state.threadId
      })
    }
  )
)
