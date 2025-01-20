"use client";

import { useState, useEffect } from 'react';
import { useMensagensStore } from '@/modules/mensagens/store/mensagensStore';
import { PencilIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Mensagem } from '@/modules/mensagens/types/mensagem';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ConsultasAdminPage() {
  const { 
    mensagens, 
    carregarMensagens, 
    atualizarMensagem, 
    deletarMensagem,
    carregando 
  } = useMensagensStore();
  
  const [mensagemSelecionada, setMensagemSelecionada] = useState<Mensagem | null>(null);
  const [editando, setEditando] = useState(false);
  const [conteudoEditado, setConteudoEditado] = useState('');
  const [mensagensEnviadas, setMensagensEnviadas] = useState<Mensagem[]>([]);

  const formatarData = (data: Date | string) => {
    const date = data instanceof Date ? data : new Date(data)
    return format(date, "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR
    })
  }

  useEffect(() => {
    carregarMensagens();
  }, [carregarMensagens]);

  const handleEditar = (mensagem: Mensagem) => {
    setMensagemSelecionada(mensagem);
    setConteudoEditado(mensagem.conteudo);
    setEditando(true);
  };

  const handleSalvar = async () => {
    if (mensagemSelecionada) {
      await atualizarMensagem(mensagemSelecionada.id, { conteudo: conteudoEditado });
      setEditando(false);
      setMensagemSelecionada(null);
      await carregarMensagens();
    }
  };

  const handleComplete = async (mensagemId: string) => {
    const mensagem = mensagens.find(m => m.id === mensagemId);
    if (mensagem) {
      setMensagensEnviadas(prev => [...prev, mensagem]);
      await deletarMensagem(mensagemId);
      await carregarMensagens();
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Gerenciar Consultas</h1>
      
      <div className="grid gap-6">
        {mensagens.map((mensagem) => (
          <div
            key={mensagem.id}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{mensagem.titulo}</h3>
                <p className="text-sm text-gray-500">
                  {formatarData(mensagem.data)}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditar(mensagem)}
                  className="p-2 text-gray-600 hover:text-primary transition-colors"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleComplete(mensagem.id)}
                  className="p-2 text-gray-600 hover:text-green-500 transition-colors"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {editando && mensagemSelecionada?.id === mensagem.id ? (
              <div>
                <textarea
                  value={conteudoEditado}
                  onChange={(e) => setConteudoEditado(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md mb-2"
                  rows={4}
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setEditando(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSalvar}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: mensagem.conteudo }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
