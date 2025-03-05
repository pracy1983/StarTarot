'use client'

import { useEffect, useRef, useState } from 'react'
import { useMensagensStore } from '@/modules/mensagens/store/mensagensStore'
import { MensagemList } from '@/modules/mensagens/components/MensagemList'
import { MensagemThread } from '@/modules/mensagens/components/MensagemThread'
import { useAuthStore } from '@/stores/authStore'
import { Message } from '@/modules/mensagens/types/message'

export default function MensagensPage() {
  const mensagens = useMensagensStore((state) => state.mensagens)
  const loading = useMensagensStore((state) => state.loading)
  const carregarMensagens = useMensagensStore((state) => state.carregarMensagens)
  const marcarComoLida = useMensagensStore((state) => state.marcarComoLida)
  const enviarResposta = useMensagensStore((state) => state.enviarResposta)
  const deletarMensagem = useMensagensStore((state) => state.deletarMensagem)

  const [mensagemAtual, setMensagemAtual] = useState<Message | null>(null)
  const user = useAuthStore(state => state.user)
  const carregando = useRef(false)

  // Carrega mensagens do usuário
  useEffect(() => {
    let mounted = true

    const loadMensagens = async () => {
      if (!user?.id || carregando.current) return
      
      try {
        console.log('Iniciando carregamento para usuário:', user.id)
        carregando.current = true
        await carregarMensagens(user.id)
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error)
      } finally {
        if (mounted) {
          carregando.current = false
        }
      }
    }

    loadMensagens()

    return () => {
      mounted = false
    }
  }, [user?.id, carregarMensagens])

  // Marca a mensagem como lida quando selecionada
  useEffect(() => {
    if (mensagemAtual?.id && !mensagemAtual.lida) {
      marcarComoLida(mensagemAtual.id)
    }
  }, [mensagemAtual?.id, mensagemAtual?.lida, marcarComoLida])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-400 mt-4">Carregando mensagens...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-6">
          {/* Lista de Mensagens */}
          <div className="w-1/3">
            <MensagemList
              mensagens={mensagens}
              mensagemAtual={mensagemAtual}
              setMensagemAtual={setMensagemAtual}
            />
          </div>

          {/* Thread da Mensagem */}
          <div className="flex-1">
            {mensagemAtual ? (
              <MensagemThread
                mensagem={mensagemAtual}
                onEnviarResposta={enviarResposta}
                onDeletarMensagem={deletarMensagem}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400">
                  Selecione uma mensagem para visualizar
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
