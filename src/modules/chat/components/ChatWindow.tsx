'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MinusIcon, ArrowsPointingOutIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { ChatService } from '../services/chatService'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { v4 as uuidv4 } from 'uuid';

export function ChatWindow() {
  const router = useRouter()
  const { isMinimized, messages, setMinimized, addMessage, threadId, setThreadId, resetChat } = useChatStore()
  const user = useAuthStore(state => state.user)
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const chatService = useRef<ChatService | null>(null)

  // Inicializa o serviço de chat e carrega o histórico
  useEffect(() => {
    if (!chatService.current) {
      chatService.current = new ChatService();
    }
    
    if (user?.id && chatService.current) {
      chatService.current.retrieveHistory(user.id).then(history => {
        if (history.length > 0) {
          history.forEach(msg => {
            addMessage({
              id: uuidv4(),
              content: msg.content,
              sender: msg.role === 'assistant' ? 'agent' : 'user',
              timestamp: new Date()
            });
          });
        }
      });
    }
  }, [user?.id, addMessage])

  useEffect(() => {
    if (!threadId) {
      const newThreadId = uuidv4();
      setThreadId(newThreadId);
      addMessage({
        id: uuidv4(),
        content: `Nova thread iniciada: ${newThreadId}.`,
        sender: 'agent',
        timestamp: new Date()
      });
    }
  }, [threadId, setThreadId, addMessage])

  // Auto scroll para última mensagem
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages, isMinimized])

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

  const handleAdminCommand = (command: string) => {
    if (command === '/cleanup' && user?.isAdmin) {
      const previousThreadId = threadId;
      resetChat();
      const newThreadId = uuidv4();
      setThreadId(newThreadId);
      addMessage({
        id: uuidv4(),
        content: `Chat limpo. Thread anterior: ${previousThreadId}. Nova thread: ${newThreadId}.`,
        sender: 'agent',
        timestamp: new Date()
      });
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || isTyping || !user?.id) return

    setIsTyping(true)
    const messageText = inputMessage.trim()
    setInputMessage('')

    // Adiciona mensagem do usuário
    const userMessage = {
      id: uuidv4(),
      content: messageText,
      sender: 'user' as const,
      timestamp: new Date()
    }
    addMessage(userMessage)

    try {
      if (chatService.current) {
        const response = await chatService.current.sendMessage(messageText, user.id)
        
        // Adiciona resposta do assistente
        const assistantMessage = {
          id: uuidv4(),
          content: response.content,
          sender: 'agent' as const,
          timestamp: new Date()
        }
        addMessage(assistantMessage)

        // Verifica redirecionamento
        handleRedirect(response.content)
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      addMessage({
        id: uuidv4(),
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        sender: 'agent',
        timestamp: new Date()
      })
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
                    class="bg-black/80 backdrop-blur-sm hover:bg-primary/20 text-primary px-8 py-3 rounded-lg mt-4 mb-2 transition-all duration-300 transform hover:scale-105 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_10px_-1px_rgba(0,0,0,0.5)] border border-primary/20 font-medium"
                    style="padding-left: calc(2rem + 5px); padding-right: calc(2rem + 5px);"
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
                handleSend()
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
