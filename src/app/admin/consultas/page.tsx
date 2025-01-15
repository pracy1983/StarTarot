"use client";

import { useState, useEffect } from 'react';
import { useMensagensStore } from '@/modules/mensagens/store/mensagensStore';
import { PencilIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Mensagem } from '@/modules/mensagens/types/mensagem';

export default function ConsultasAdminPage() {
  const { mensagens, carregarMensagens, atualizarMensagem, deletarMensagem } = useMensagensStore();
  const [mensagemSelecionada, setMensagemSelecionada] = useState<Mensagem | null>(null);
  const [editando, setEditando] = useState<boolean>(false);
  const [conteudoEditado, setConteudoEditado] = useState<string>('');
  const [mensagensEnviadas, setMensagensEnviadas] = useState<Mensagem[]>([]);

  useEffect(() => {
    carregarMensagens();
  }, [carregarMensagens]);

  const handleEditar = (mensagem: Mensagem): void => {
    setMensagemSelecionada(mensagem);
    setConteudoEditado(mensagem.conteudo);
    setEditando(true);
  };

  const handleSalvar = (): void => {
    if (mensagemSelecionada) {
      atualizarMensagem(mensagemSelecionada.id, { conteudo: conteudoEditado });
      setEditando(false);
      setMensagemSelecionada(null);
    }
  };

  const handleComplete = (mensagemId: string): void => {
    const mensagemCompleta = mensagens.find(m => m.id === mensagemId);
    if (mensagemCompleta) {
      setMensagensEnviadas(prev => [...prev, mensagemCompleta]);
      deletarMensagem(mensagemId);
    }
  };

  interface ContadorRegresivoProps {
    initialTime: number;
    onComplete: () => void;
  }

  function ContadorRegressivo({ initialTime, onComplete }: ContadorRegresivoProps) {
    const [timeLeft, setTimeLeft] = useState<number>(initialTime);

    useEffect(() => {
      const timer = setInterval(() => {
        setTimeLeft((prev: number) => {
          if (prev <= 1) {
            clearInterval(timer);
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }, [onComplete]);

    return <span>{timeLeft}s</span>;
  }

  return (
    <div className="min-h-screen p-6 bg-black/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-6">Consultas</h1>
        {mensagens.length === 0 ? (
          <p className="text-center text-gray-400">Não há novas mensagens</p>
        ) : (
          <ul className="space-y-4">
            {mensagens.map((mensagem) => (
              <li key={mensagem.id} className="bg-white/10 p-4 rounded-lg shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-medium">
                      De: {mensagem.userId} | Para: {mensagem.oraculista?.nome || 'Não atribuído'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Contador regressivo: <ContadorRegressivo 
                        initialTime={20} 
                        onComplete={() => handleComplete(mensagem.id)} 
                      />
                    </p>
                  </div>
                  <button
                    onClick={() => handleEditar(mensagem)}
                    className="text-primary hover:text-primary-dark"
                  >
                    <PencilIcon className="h-5 w-5" /> Editar
                  </button>
                </div>
                {mensagemSelecionada?.id === mensagem.id && (
                  <div className="mt-4">
                    <textarea
                      className="w-full p-2 border rounded"
                      value={conteudoEditado}
                      onChange={(e) => setConteudoEditado(e.target.value)}
                    />
                    <button
                      onClick={handleSalvar}
                      className="mt-2 px-4 py-2 bg-primary text-white rounded"
                    >
                      Salvar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <h2 className="text-2xl font-bold text-primary mt-8 mb-4">Mensagens Enviadas</h2>
        {mensagensEnviadas.length === 0 ? (
          <p className="text-center text-gray-400">Nenhuma mensagem enviada</p>
        ) : (
          <ul className="space-y-4">
            {mensagensEnviadas.map((mensagem) => (
              <li key={mensagem.id} className="bg-white/10 p-4 rounded-lg shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-medium">
                      De: {mensagem.userId} | Para: {mensagem.oraculista?.nome || 'Não atribuído'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEditar(mensagem)}
                    className="text-primary hover:text-primary-dark"
                  >
                    <PencilIcon className="h-5 w-5" /> Editar
                  </button>
                </div>
                {mensagemSelecionada?.id === mensagem.id && editando && (
                  <div className="mt-4">
                    <textarea
                      className="w-full p-2 border rounded"
                      value={conteudoEditado}
                      onChange={(e) => setConteudoEditado(e.target.value)}
                    />
                    <button
                      onClick={handleSalvar}
                      className="mt-2 px-4 py-2 bg-primary text-white rounded"
                    >
                      Salvar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
