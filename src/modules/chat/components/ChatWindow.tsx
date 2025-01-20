'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MinusIcon, ArrowsPointingOutIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { ChatService } from '../services/chatService'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { useOraculistasStore } from '@/modules/oraculistas/store/oraculistasStore'
import { v4 as uuidv4 } from 'uuid'
import { Message } from '../types/message'

interface ProcessedMessage extends Message {
  processedContent: string
}

export function ChatWindow() {
  const router = useRouter()
  const { isMinimized, messages, setMinimized, addMessage } = useChatStore()
  const user = useAuthStore(state => state.user)
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const chatService = useRef<ChatService | null>(null)
  const oraculistas = useOraculistasStore(state => state.oraculistas)
  const { carregarOraculistas } = useOraculistasStore()

  // Inicializa o serviço de chat e carrega o histórico
  useEffect(() => {
    const initChat = async () => {
      if (!chatService.current) {
        await carregarOraculistas()
        chatService.current = new ChatService()
      }
      
      if (user?.id) {
        const history = await chatService.current.retrieveHistory(user.id)
        history.forEach(msg => {
          addMessage({
            id: uuidv4(),
            content: msg.content,
            role: msg.role,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
          })
        })
      }
    }

    initChat()
  }, [user?.id, addMessage, carregarOraculistas])

  // Scroll para a última mensagem
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  // Função para processar o conteúdo da mensagem
  const processMessageContent = (content: string, isAssistant: boolean): string => {
    if (!isAssistant) return content

    // Processa links para oraculistas
    return content.replace(/\[CONSULTAR:([^\]]+)\]/g, (_, name) => {
      const oraculista = oraculistas.find(o => 
        o.nome.toLowerCase() === name.toLowerCase()
      )
      if (oraculista) {
        return `<button 
          class="text-primary hover:text-primary/80 transition-colors"
          onclick="window.location.href='/oraculista/${oraculista.id}'">
          Consultar ${oraculista.nome}
        </button>`
      }
      return name
    })
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !chatService.current || !user?.id) return

    const userMessage: Message = {
      id: uuidv4(),
      content: inputMessage,
      role: 'user',
      timestamp: new Date()
    }

    addMessage(userMessage)
    setInputMessage('')
    setIsTyping(true)

    try {
      const response = await chatService.current.sendMessage(inputMessage, user.id)
      addMessage(response)

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      const errorMessage: Message = {
        id: uuidv4(),
        content: 'Desculpe, tive um problema para processar sua mensagem. Pode tentar novamente?',
        role: 'assistant',
        timestamp: new Date()
      }
      addMessage(errorMessage)
    } finally {
      setIsTyping(false)
    }
  }

  // Processa as últimas 10 mensagens para exibição
  const processedMessages = useMemo(() => 
    messages.slice(-10).map(message => ({
      ...message,
      processedContent: processMessageContent(message.content, message.role === 'assistant')
    })), [messages, oraculistas]
  )

  return (
    <div
      className={`fixed bottom-4 right-4 w-96 bg-gray-900/95 backdrop-blur-lg rounded-lg shadow-lg transition-all duration-300 ease-in-out ${
        isMinimized ? 'h-14' : 'h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white">Chat</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setMinimized(!isMinimized)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isMinimized ? (
              <ArrowsPointingOutIcon className="w-5 h-5" />
            ) : (
              <MinusIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Chat Container */}
      {!isMinimized && (
        <>
          {/* Messages */}
          <div
            ref={chatRef}
            className="flex-1 p-4 space-y-4 overflow-y-auto h-[calc(100%-8rem)]"
          >
            {processedMessages.map(message => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary/20 text-white rounded-br-none'
                      : 'bg-black/80 backdrop-blur-sm text-gray-200'
                  }`}
                >
                  <div
                    dangerouslySetInnerHTML={{
                      __html: message.processedContent
                    }}
                  />
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-black/80 backdrop-blur-sm text-gray-200 p-4 rounded-lg max-w-[80%]">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-black/50 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleSendMessage}
                disabled={isTyping}
                className={`text-primary hover:text-primary/80 transition-colors ${
                  isTyping ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <PaperAirplaneIcon className="w-6 h-6 transform rotate-90" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
