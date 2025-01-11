'use client'

import { useState, useRef, useEffect } from 'react'
import { MinusIcon, ArrowsPointingOutIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { ChatService } from '@/services/deepseek/chatService'

interface Message {
  id: string
  content: string
  sender: 'user' | 'agent'
  timestamp: Date
}

const INITIAL_MESSAGE: Message = {
  id: '0',
  content: 'Olá, vamos escolher o melhor oraculista pra você? Me fale um pouco no que acredita e que tipo de ajuda precisa',
  sender: 'agent',
  timestamp: new Date()
}

export function ChatWindow() {
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const chatService = useRef<ChatService | null>(null)

  // Inicializa o serviço de chat
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY
    if (apiKey) {
      chatService.current = new ChatService(apiKey)
    }
  }, [])

  // Auto scroll para última mensagem
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async () => {
    if (!inputMessage.trim() || !chatService.current) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)

    try {
      // Converte mensagens para o formato da API
      const history = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))

      // Envia mensagem para a API
      const response = await chatService.current.sendMessage(inputMessage, history)

      // Adiciona resposta do agente
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'agent',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, agentMessage])
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      // Adiciona mensagem de erro
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Desculpe, tive um problema para processar sua mensagem. Pode tentar novamente?',
        sender: 'agent',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className={`fixed right-4 bottom-4 bg-black/95 backdrop-blur-md border border-primary/20 rounded-lg shadow-xl transition-all duration-300 ease-in-out z-[9999] ${
      isMinimized ? 'w-64 h-12' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-primary/20">
        <h3 className="text-primary font-semibold">Chat Espiritual</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-primary transition-colors"
          >
            {isMinimized ? (
              <ArrowsPointingOutIcon className="w-5 h-5" />
            ) : (
              <MinusIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Chat Area */}
      {!isMinimized && (
        <>
          <div 
            ref={chatRef}
            className="flex-1 p-4 overflow-y-auto h-[calc(100%-8rem)]"
          >
            {messages.map(message => (
              <div
                key={message.id}
                className={`mb-4 flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-primary/20 text-white rounded-br-none'
                      : 'bg-gray-800/50 text-gray-300 rounded-bl-none'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-800/50 text-gray-300 p-3 rounded-lg rounded-bl-none">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-primary/20">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-gray-800/50 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={sendMessage}
                className="text-primary hover:text-primary/80 transition-colors"
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