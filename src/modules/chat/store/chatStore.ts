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
  setMinimized: (state: boolean) => void
  addMessage: (message: Message) => void
  resetChat: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      isMinimized: false,
      messages: [INITIAL_MESSAGE],
      setMinimized: (state) => set({ isMinimized: state }),
      addMessage: (message) => set((state) => ({ 
        messages: [...state.messages, message] 
      })),
      resetChat: () => set({ 
        messages: [INITIAL_MESSAGE],
        isMinimized: false 
      })
    }),
    {
      name: 'chat-storage',
    }
  )
)
