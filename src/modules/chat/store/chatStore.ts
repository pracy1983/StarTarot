import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Message } from '../types/message'

const INITIAL_MESSAGE: Message = {
  id: '0',
  content: 'Olá, vamos escolher o melhor oraculista pra você? Me fale um pouco no que acredita e que tipo de ajuda precisa.',
  role: 'assistant',
  timestamp: new Date()
}

interface ChatState {
  isMinimized: boolean
  messages: Message[]
  setMinimized: (isMinimized: boolean) => void
  addMessage: (message: Message) => void
  resetChat: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      isMinimized: false,
      messages: [INITIAL_MESSAGE],
      setMinimized: (isMinimized) => set({ isMinimized }),
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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        messages: state.messages,
        isMinimized: state.isMinimized
      })
    }
  )
)
