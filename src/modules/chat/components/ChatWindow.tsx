'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MinusIcon, ArrowsPointingOutIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { ChatService } from '../services/chatService'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { useOraculistasStore } from '@/modules/oraculistas/store/oraculistasStore'
import { v4 as uuidv4 } from 'uuid';

export function ChatWindow() {
  const router = useRouter()
  const { isMinimized, messages, setMinimized, addMessage, threadId, setThreadId, resetChat } = useChatStore()
  const user = useAuthStore(state => state.user)
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const chatService = useRef<ChatService | null>(null)
  const oraculistas = useOraculistasStore(state => state.oraculistas)

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
    // Verifica se o texto contém o código [CONSULTAR:nome-do-oraculista]
    const consultarRegex = /\[CONSULTAR:(.+?)\]/i
    const match = text.match(consultarRegex)
    
    if (match) {
      const oraculistaNome = match[1].toLowerCase().trim()
      const { oraculistas } = useOraculistasStore.getState()
      
      // Procura o oraculista pelo nome
      const oraculista = oraculistas.find(o => 
        o.nome.toLowerCase().trim() === oraculistaNome
      )

      if (oraculista) {
        // Redireciona para a página de pergunta com o ID do oraculista
        router.push(`/dashboard/pergunta?oraculista=${oraculista.id}`)
        return true
      }
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

  // Função para dividir a mensagem do agente em blocos
  const splitAgentMessage = (content: string) => {
    // Divide por pontos, mas mantém os pontos no texto
    const sentences = content.split(/(?<=\.)/).filter(s => s.trim())
    
    // Agrupa em até 3 blocos
    const blocks: string[] = []
    let currentBlock = ''
    
    sentences.forEach((sentence, index) => {
      if (blocks.length < 2) {
        // Para os primeiros 2 blocos
        blocks.push(sentence.trim())
      } else {
        // Último bloco recebe o resto das sentenças
        currentBlock = (currentBlock + ' ' + sentence).trim()
        if (index === sentences.length - 1) {
          blocks.push(currentBlock)
        }
      }
    })
    
    return blocks.length > 0 ? blocks : [content]
  }

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
        // Delay inicial para simular "pensamento"
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const response = await chatService.current.sendMessage(messageText, user.id)
        const messageBlocks = splitAgentMessage(response.content)

        // Adiciona cada bloco como uma mensagem separada com delay
        for (let i = 0; i < messageBlocks.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 800)) // Delay entre blocos
          
          addMessage({
            id: uuidv4(),
            content: messageBlocks[i],
            sender: 'agent',
            timestamp: new Date()
          })
        }
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

  // Função para processar o conteúdo da mensagem
  const processMessageContent = (content: string, isAgent: boolean) => {
    if (!isAgent) return content

    const consultarRegex = /\[CONSULTAR:(.+?)\]/g
    const matches = content.match(consultarRegex)
    
    if (!matches) return content

    // Remove todos os códigos [CONSULTAR:], textos entre ** e hífens isolados
    const cleanContent = content
      .replace(/\[CONSULTAR:[^\]]+\]/g, '')     // Remove [CONSULTAR:nome]
      .replace(/\*\*[^*]+\*\*/g, '')            // Remove **nome**
      .replace(/\s+-\s+/g, '')                  // Remove hífens isolados
      .trim()
    
    // Adiciona os botões no final da mensagem
    const buttons = matches.map(match => {
      const oraculistaNome = match.match(/\[CONSULTAR:(.+?)\]/)?.[1] || ''
      const nomeProcessado = oraculistaNome.toLowerCase().trim().replace(/^vó\s+/i, '')
      
      const oraculista = oraculistas.find(o => 
        o.nome.toLowerCase().trim() === nomeProcessado ||
        o.nome.toLowerCase().trim().replace(/^vó\s+/i, '') === nomeProcessado
      )

      if (oraculista) {
        return `<button 
          class="bg-black/80 backdrop-blur-sm hover:bg-primary/20 text-primary px-4 py-2 rounded-lg m-1 transition-all duration-300 transform hover:scale-105 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_10px_-1px_rgba(0,0,0,0.5)] border border-primary/20 font-medium inline-block"
          onclick="window.location.href='/dashboard/pergunta?oraculista=${oraculista.id}'"
        >
          Consultar ${oraculistaNome}
        </button>`
      }
      return ''
    }).join('')
    
    return cleanContent + (cleanContent ? '<br><br>' : '') + buttons
  }

  // Memoize as mensagens processadas
  const processedMessages = useMemo(() => 
    messages.slice(-10).map(message => ({
      ...message,
      content: processMessageContent(message.content, message.sender === 'agent')
    })), [messages, oraculistas]
  )

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
            className={`flex-1 overflow-y-auto p-4 space-y-4 h-[calc(100%-8rem)] bg-black/80 ${
              isMinimized ? 'hidden' : ''
            }`}
          >
            {processedMessages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-primary/20 text-white rounded-br-none'
                      : 'bg-black/80 backdrop-blur-sm text-gray-200'
                  }`}
                  dangerouslySetInnerHTML={{ 
                    __html: message.sender === 'agent' 
                      ? message.content.replace(/\*\*([^*]+)\*\*/g, '<span class="font-bold text-yellow-400">$1</span>')
                      : message.content 
                  }}
                />
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
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
