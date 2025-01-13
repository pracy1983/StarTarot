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
    // Verifica se já existem mensagens com esses IDs
    const mensagem1Existe = mensagens.some(m => m.id === '1')
    const mensagem2Existe = mensagens.some(m => m.id === '2')

    if (mensagens.length === 0 && !mensagem1Existe && !mensagem2Existe) {
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
  }, []) // Removido mensagens.length e adicionarMensagem das dependências

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
