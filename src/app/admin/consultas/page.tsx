"use client";

import { useState, useEffect } from 'react';
import { useMensagensStore } from '@/modules/mensagens/store/mensagensStore';
import { PencilIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Mensagem } from '@/modules/mensagens/types/mensagem';

export default function ConsultasAdminPage() {
  const { mensagens, carregarMensagens, atualizarMensagem } = useMensagensStore();
  const [mensagemSelecionada, setMensagemSelecionada] = useState<Mensagem | null>(null);
  const [editando, setEditando] = useState(false);
  const [conteudoEditado, setConteudoEditado] = useState('');
  const [mensagensEnviadas, setMensagensEnviadas] = useState<Mensagem[]>([]);

  useEffect(() => {
    carregarMensagens();
  }, [carregarMensagens]);

  const handleEditar = (mensagem: Mensagem) => {
    setMensagemSelecionada(mensagem);
    setConteudoEditado(mensagem.conteudo);
    setEditando(true);
  };

  const handleSalvar = () => {
    if (mensagemSelecionada) {
      atualizarMensagem(mensagemSelecionada.id, conteudoEditado);
      setEditando(false);
      setMensagemSelecionada(null);
    }
  };

  const handleComplete = (mensagemId) => {
    setMensagensEnviadas((prev) => [...prev, ...mensagens.filter(m => m.id === mensagemId)]);
    setMensagens((prev) => prev.filter(m => m.id !== mensagemId));
  };

  function ContadorRegressivo({ initialTime, onComplete }) {
    const [timeLeft, setTimeLeft] = useState(initialTime);

    useEffect(() => {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev > 1) return prev - 1;
          clearInterval(timer);
          onComplete();
          return 0;
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
                    <p className="text-lg font-medium">De: {mensagem.de} | Para: {mensagem.oraculista.nome}</p>
                    <p className="text-sm text-gray-500">Contador regressivo: <ContadorRegressivo initialTime={mensagem.delay || 20} onComplete={() => handleComplete(mensagem.id)} /></p>
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
        <h2 className="text-2xl font-bold text-primary mt-8">Mensagens Enviadas</h2>
        <ul className="space-y-4">
          {mensagensEnviadas.map((mensagem) => (
            <li key={mensagem.id} className="bg-white/10 p-4 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-medium">De: {mensagem.de} | Para: {mensagem.oraculista.nome}</p>
                </div>
                <button
                  onClick={() => handleEditar(mensagem)}
                  className="text-primary hover:text-primary-dark"
                >
                  <PencilIcon className="h-5 w-5" /> Editar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
