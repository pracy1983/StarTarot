'use client'

import { useEffect, useRef } from 'react'
import { useMensagensStore } from '@/modules/mensagens/store/mensagensStore'
import { MensagemList } from '@/modules/mensagens/components/MensagemList'
import { MensagemThread } from '@/modules/mensagens/components/MensagemThread'
import { useAuthStore } from '@/stores/authStore'

export default function MensagensPage() {
  const { 
    mensagens,
    mensagemAtual,
    setMensagemAtual,
    marcarComoLida,
    getMensagensFiltradas,
    carregarMensagens,
    limparMensagens
  } = useMensagensStore()

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
        limparMensagens()
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
  }, [user?.id])

  // Marca a mensagem como lida quando selecionada
  useEffect(() => {
    if (mensagemAtual && !mensagemAtual.lida) {
      marcarComoLida(mensagemAtual.id)
    }
  }, [mensagemAtual, marcarComoLida])

  return (
    <div className="flex flex-col h-full">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary">Caixa de Mensagens</h1>
        <p className="text-gray-400">Suas consultas e respostas dos oraculistas</p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lista de Mensagens */}
        <div className="h-[600px] bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl">
          <MensagemList
            mensagens={getMensagensFiltradas('todas')}
            onSelectMensagem={setMensagemAtual}
            mensagemSelecionada={mensagemAtual}
          />
        </div>

        {/* Thread da Mensagem */}
        <div className="h-[600px] bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl">
          {mensagemAtual ? (
            <MensagemThread mensagem={mensagemAtual} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Selecione uma mensagem para visualizar
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
