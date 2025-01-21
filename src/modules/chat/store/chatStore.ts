import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Message } from '../types/message'

const INITIAL_MESSAGE: Message = {
  id: '0',
  content: 'Olá, vamos escolher o melhor oraculista pra você? Me fale um pouco no que acredita e que tipo de ajuda precisa.',
  role: 'assistant',
  timestamp: new Date().toISOString()
}

interface ChatState {
  isMinimized: boolean
  messages: Message[]
  threadId: string | null
  setThreadId: (threadId: string | null) => void
  setMinimized: (isMinimized: boolean) => void
  addMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void
  resetChat: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      isMinimized: false,
      messages: [INITIAL_MESSAGE],
      threadId: null,
      setThreadId: (threadId) => set({ threadId }),
      setMinimized: (isMinimized) => set({ isMinimized }),
      addMessage: (message) => set((state) => ({ 
        messages: [...state.messages, message] 
      })),
      setMessages: (messages) => set({ messages }),
      resetChat: () => set({ 
        messages: [INITIAL_MESSAGE],
        isMinimized: false,
        threadId: null
      })
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        messages: state.messages,
        isMinimized: state.isMinimized,
        threadId: state.threadId
      })
    }
  )
)
