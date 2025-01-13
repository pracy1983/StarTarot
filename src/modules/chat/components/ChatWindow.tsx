'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MinusIcon, ArrowsPointingOutIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { ChatService } from '../services/chatService'
import { useChatStore } from '../store/chatStore'

export function ChatWindow() {
  const router = useRouter()
  const { isMinimized, messages, setMinimized, addMessage } = useChatStore()
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const chatService = useRef<ChatService | null>(null)

  // Inicializa o serviço de chat
  useEffect(() => {
    chatService.current = new ChatService()
  }, [])

  // Auto scroll para última mensagem
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const handleRedirect = (text: string) => {
    // Verifica se o texto contém "me apssa" ou "me transfere" seguido do nome do oraculista
    const redirectRegex = /(?:me (?:apssa|transfere) pr[ao]|quero) (.+)/i
    const match = text.match(redirectRegex)
    
    if (match) {
      const oraculistaNome = match[1].toLowerCase().trim()
      router.push(`/consulta/${encodeURIComponent(oraculistaNome)}`)
      return true
    }
    return false
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !chatService.current) return

    // Verifica se é um comando de redirecionamento
    if (handleRedirect(inputMessage)) {
      setInputMessage('')
      return
    }

    const userMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user' as const,
      timestamp: new Date()
    }

    addMessage(userMessage)
    setInputMessage('')
    setIsTyping(true)

    try {
      const response = await chatService.current.sendMessage(inputMessage)
      
      // Verifica se a resposta do assistente contém um redirecionamento
      if (handleRedirect(response.content)) {
        return
      }
      
      // Quebra a resposta em balões separados
      const sentences = response.content.split(/(?<=[.!?])\s+/)
      
      for (const sentence of sentences) {
        if (!sentence.trim()) continue
        
        // Calcula o tempo de digitação baseado no tamanho da mensagem
        const baseTime = Math.min(Math.max(sentence.length * 50, 1500), 3000)
        const randomVariation = Math.random() * 500
        const typingTime = baseTime + randomVariation
        
        await new Promise(resolve => setTimeout(resolve, typingTime))
        
        const agentMessage = {
          id: Date.now().toString(),
          content: sentence,
          sender: 'agent' as const,
          timestamp: new Date()
        }
        
        addMessage(agentMessage)
      }

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      const errorMessage = {
        id: Date.now().toString(),
        content: 'Desculpe, tive um problema para processar sua mensagem. Pode tentar novamente?',
        sender: 'agent' as const,
        timestamp: new Date()
      }
      addMessage(errorMessage)
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
        <h3 className="text-primary font-semibold">Chat ao vivo</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMinimized(!isMinimized)}
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
            style={{
              backgroundImage: 'url(/background.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundBlendMode: 'overlay'
            }}
            className="flex-1 p-4 overflow-y-auto h-[calc(100%-8rem)] bg-black/80"
          >
            {messages.map(message => {
              // Processa o código [CONSULTAR:nome] na mensagem
              let content = message.content
              const consultarMatch = content.match(/\[CONSULTAR:(.+?)\]/i)
              
              if (consultarMatch && message.sender === 'agent') {
                const oraculistaNome = consultarMatch[1]
                content = content.replace(
                  consultarMatch[0],
                  `<button 
                    class="bg-primary/90 hover:bg-primary text-white px-6 py-3 rounded-lg mt-2 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl border border-primary/20 font-medium"
                    onclick="window.location.href='/consulta/${encodeURIComponent(oraculistaNome.toLowerCase().trim())}'"
                  >
                    Consultar ${oraculistaNome.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </button>`
                )
              }

              // Remove colchetes extras que possam ter ficado
              content = content.replace(/\[|\]/g, '')

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  } mb-4`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-primary/50 text-white rounded-br-none'
                        : 'bg-gray-800/50 text-gray-300 rounded-bl-none'
                    }`}
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                </div>
              )
            })}

            {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-800/50 text-gray-300 p-3 rounded-lg rounded-bl-none">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-primary/20">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage()
              }}
              className="flex space-x-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-gray-800/50 text-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="text-primary hover:text-primary/90 transition-colors"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
