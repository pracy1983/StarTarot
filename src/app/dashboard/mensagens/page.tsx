'use client'

import { useEffect } from 'react'
import { useMensagensStore } from '@/modules/mensagens/store/mensagensStore'
import { MensagemList } from '@/modules/mensagens/components/MensagemList'
import { MensagemThread } from '@/modules/mensagens/components/MensagemThread'

export default function MensagensPage() {
  const { 
    mensagens,
    mensagemAtual,
    setMensagemAtual,
    marcarComoLida,
    getMensagensFiltradas,
    adicionarMensagem
  } = useMensagensStore()

  // Adiciona mensagens de teste se não houver nenhuma
  useEffect(() => {
    if (mensagens.length === 0) {
      // Mensagem de pergunta
      adicionarMensagem({
        id: '1',
        userId: 'user1',
        titulo: 'Consulta sobre relacionamento',
        conteudo: 'Olá, gostaria de entender melhor sobre minha situação amorosa atual. Tenho sentido muitas dúvidas...',
        lida: false,
        data: new Date('2024-01-11T10:30:00'),
        tipo: 'pergunta'
      })

      // Mensagem de resposta
      adicionarMensagem({
        id: '2',
        userId: 'user1',
        titulo: 'Resposta do Oráculo dos Anjos',
        conteudo: 'Querido consulente, os anjos me mostram que você está em um momento de transição importante...',
        lida: true,
        data: new Date('2024-01-11T11:00:00'),
        tipo: 'resposta',
        threadId: '1'
      })
    }
  }, [mensagens.length, adicionarMensagem])

  // Marca a mensagem como lida quando selecionada
  useEffect(() => {
    if (mensagemAtual && !mensagemAtual.lida) {
      marcarComoLida(mensagemAtual.id)
    }
  }, [mensagemAtual, marcarComoLida])

  return (
    <div className="flex flex-col p-4">
      {/* Cabeçalho */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-raleway font-bold text-primary">
          Caixa de Mensagens
        </h1>
        <p className="text-sm text-gray-300">
          Suas consultas e respostas dos oraculistas
        </p>
      </div>

      {/* Container Principal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto w-full">
        {/* Lista de Mensagens */}
        <div className="lg:h-[450px]">
          <MensagemList
            mensagens={getMensagensFiltradas()}
            onSelectMensagem={setMensagemAtual}
            mensagemSelecionada={mensagemAtual}
          />
        </div>

        {/* Visualização da Mensagem */}
        <div className="hidden lg:block lg:h-[450px]">
          <div className="h-full bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl">
            {mensagemAtual ? (
              <MensagemThread mensagem={mensagemAtual} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">
                  Selecione uma mensagem para visualizar
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Visualização Mobile */}
        {mensagemAtual && (
          <div className="fixed inset-0 z-50 p-4 lg:hidden">
            <div className="bg-black/95 backdrop-blur-md h-full rounded-2xl border border-primary/20">
              <div className="flex justify-between items-center p-4 border-b border-primary/20">
                <h2 className="text-primary font-semibold">Mensagem</h2>
                <button 
                  onClick={() => setMensagemAtual(null)}
                  className="text-gray-400 hover:text-primary"
                >
                  Voltar
                </button>
              </div>
              <div className="h-[calc(100%-4rem)]">
                <MensagemThread mensagem={mensagemAtual} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
