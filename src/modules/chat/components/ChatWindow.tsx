'use client'

import { useState, useRef, useEffect } from 'react'
import { CSSProperties } from 'react'

interface CustomCSSProperties extends CSSProperties {
  '--chat-bg': string
}
import { ArrowsPointingOutIcon, MinusIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { ChatService } from '../services/chatService'
import { Message } from '../types/message'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '../store/chatStore'
import { processMessageContent } from '../utils/messageProcessor'

export default function ChatWindow() {
  const { isMinimized, messages, setMinimized, addMessage, setMessages } = useChatStore()
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const user = useAuthStore(state => state.user)
  const chatService = useRef<ChatService>()

  useEffect(() => {
    const initChat = async () => {
      if (user) {
        try {
          chatService.current = new ChatService()
          const history = await chatService.current.retrieveHistory(user.id)
          if (history.length > 0) {
            setMessages(history)
          }
        } catch (error) {
          console.error('Erro ao inicializar chat:', error)
        }
      }
    }
    initChat()
  }, [user, setMessages])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user || !chatService.current) return

    const content = inputMessage.trim()
    setInputMessage('')
    setIsTyping(true)

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date()
    }
    addMessage(userMessage)

    try {
      const response = await chatService.current.sendMessage(content, user.id)
      addMessage(response)
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Desculpe, tive um problema para processar sua mensagem. Pode tentar novamente?',
        role: 'assistant',
        timestamp: new Date()
      }
      addMessage(errorMessage)
    } finally {
      setIsTyping(false)
    }
  }

  const processedMessages = messages.map(msg => ({
    ...msg,
    processedContent: processMessageContent(msg.content)
  }))


  return (
    <div
      className={`fixed bottom-4 right-4 w-96 bg-black/90 backdrop-blur-lg rounded-lg shadow-lg border border-primary transition-all duration-300 ease-in-out z-[9999] ${
        isMinimized ? 'h-14' : 'h-[600px]'
      } bg-[image:var(--chat-bg)] bg-cover bg-center`}
      style={{
        boxShadow: '0 0 10px rgba(255, 215, 0, 0.3)',
        '--chat-bg': "url('/background.jpg')"
      } as CustomCSSProperties}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black border-b border-primary/30">
        <h3 className="text-lg font-semibold text-primary">Chat</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setMinimized(!isMinimized)}
            className="text-primary hover:text-primary/80 transition-colors"
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
            className="flex-1 p-4 space-y-4 overflow-y-auto h-[calc(100%-8rem)] scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
          >
            {processedMessages.length > 0 ? (
              processedMessages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  } items-end gap-2`}
                >
                  {message.role !== 'user' && (
                    <div className="flex-none" style={{ width: '32px', height: '32px', position: 'relative' }}>
                      <img 
                        src="/agent-avatar.jpeg" 
                        alt="Agent" 
                        className="rounded-full w-full h-full object-cover absolute"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://ui-avatars.com/api/?name=Agent&background=000&color=fff';
                        }}
                      />
                    </div>
                  )}
                  <div
                    className={`relative p-3 rounded-lg shadow-md ${
                      message.role === 'user'
                        ? 'bg-primary text-black bg-opacity-85 rounded-br-none ml-0 mr-2'
                        : 'rounded-bl-none ml-2 mr-0 text-white'
                    }`}
                    style={{
                      backgroundColor: message.role === 'user' ? undefined : 'rgb(31, 41, 55)',
                      maxWidth: '85%'
                    }}
                  >
                    <div
                      className={`absolute bottom-0 ${
                        message.role === 'user' 
                          ? '-right-2 border-l-primary' 
                          : '-left-2'
                      } w-4 h-4 transform ${
                        message.role === 'user'
                          ? 'border-b-[10px] border-l-[10px] border-b-primary border-l-transparent'
                          : 'border-b-[10px] border-r-[10px] border-r-transparent'
                      }`}
                      style={{
                        borderBottomColor: message.role === 'user' ? undefined : 'rgb(31, 41, 55)'
                      }}
                    />
                    <div 
                      dangerouslySetInnerHTML={{ __html: message.processedContent || processMessageContent(message.content) }}
                      className="font-medium break-words"
                    />
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-none" style={{ width: '32px', height: '32px', position: 'relative' }}>
                      <img 
                        src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=000&color=fff`}
                        alt="User" 
                        className="rounded-full w-full h-full object-cover absolute"
                      />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400">
                Nenhuma mensagem ainda...
              </div>
            )}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-800/50 text-white p-3 rounded-lg rounded-bl-none relative">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                  <div className="absolute bottom-0 -left-2 w-4 h-4 transform border-b-[10px] border-r-[10px] border-b-gray-800/50 border-r-transparent" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-primary/30 bg-black/50">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-gray-800/50 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary border border-primary/30 placeholder-gray-400"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="bg-primary/20 text-primary p-2 rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-primary/30"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
