'use client'

import { useEffect } from 'react'
import { useMensagensStore } from '@/modules/mensagens/store/mensagensStore'
import { MensagemList } from '@/modules/mensagens/components/MensagemList'
import { MensagemThread } from '@/modules/mensagens/components/MensagemThread'
import { useAuthStore } from '@/stores/authStore'
import { enviarMensagemTeste } from '@/modules/mensagens/services/mensagensService'

export default function MensagensPage() {
  const { 
    mensagens,
    mensagemAtual,
    setMensagemAtual,
    marcarComoLida,
    getMensagensFiltradas,
    carregarMensagens
  } = useMensagensStore()

  const user = useAuthStore(state => state.user)

  // Carrega mensagens do usuário
  useEffect(() => {
    if (user?.id) {
      carregarMensagens(user.id)
      // Envia uma mensagem de teste se não houver mensagens
      if (mensagens.length === 0) {
        enviarMensagemTeste(user.id)
          .then(() => carregarMensagens(user.id))
          .catch(console.error)
      }
    }
  }, [user?.id, carregarMensagens, mensagens.length])

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
        <div className="h-[600px]">
          <MensagemList
            mensagens={getMensagensFiltradas()}
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
