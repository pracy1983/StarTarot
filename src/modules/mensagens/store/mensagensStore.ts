import { create } from 'zustand'
import { MensagensService } from '../services/mensagensService'
import { Message } from '../types/message'

interface MensagensState {
  mensagens: Message[]
  loading: boolean
  error: string | null
  mensagensService: MensagensService
  carregarMensagens: (userId?: string) => Promise<void>
  enviarPergunta: (userId: string, formData: { oraculistaId: string; conteudo: string }) => Promise<void>
  enviarResposta: (mensagemId: string, oraculistaId: string, conteudo: string) => Promise<void>
  marcarComoLida: (mensagemId: string) => Promise<void>
  deletarMensagem: (mensagemId: string, userId: string) => Promise<void>
}

export const useMensagensStore = create<MensagensState>((set, get) => ({
  mensagens: [],
  loading: false,
  error: null,
  mensagensService: new MensagensService(),

  carregarMensagens: async (userId?: string) => {
    try {
      set({ loading: true, error: null });
      const mensagens = await get().mensagensService.buscarMensagens({ userId });
      set({ mensagens, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao carregar mensagens',
        loading: false
      });
    }
  },

  enviarPergunta: async (userId: string, formData: { oraculistaId: string; conteudo: string }) => {
    try {
      set({ loading: true, error: null });
      
      // Obter nome do oraculista para incluir na mensagem
      const oraculistaNome = ""; // Este valor será preenchido pelo backend
      
      const result = await get().mensagensService.enviarMensagem({
        user_id: userId,
        oraculista_id: formData.oraculistaId,
        oraculista_nome: oraculistaNome,
        conteudo: formData.conteudo,
        tipo: 'pergunta',
        data: new Date().toISOString(),
        lida: false,
        updatedAt: new Date().toISOString()
      });

      if (result.success) {
        await get().carregarMensagens(userId);
      } else {
        throw new Error(result.error);
      }

      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao enviar mensagem',
        loading: false
      });
    }
  },

  enviarResposta: async (mensagemId: string, oraculistaId: string, conteudo: string) => {
    try {
      set({ loading: true, error: null });
      
      // Buscar a mensagem original para obter o user_id
      const mensagemOriginal = get().mensagens.find(m => m.id === mensagemId);
      if (!mensagemOriginal) {
        throw new Error('Mensagem original não encontrada');
      }
      
      // Enviar a resposta como uma nova mensagem
      const result = await get().mensagensService.enviarMensagem({
        user_id: mensagemOriginal.user_id,
        oraculista_id: oraculistaId,
        oraculista_nome: "", // Este valor será preenchido pelo backend
        conteudo: conteudo,
        tipo: 'resposta',
        data: new Date().toISOString(),
        lida: false,
        pergunta_ref: mensagemId,
        updatedAt: new Date().toISOString()
      });

      if (result.success) {
        await get().carregarMensagens(mensagemOriginal.user_id);
      } else {
        throw new Error(result.error);
      }

      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao enviar resposta',
        loading: false
      });
    }
  },

  marcarComoLida: async (mensagemId: string) => {
    try {
      set({ loading: true, error: null });
      const result = await get().mensagensService.marcarComoLida(mensagemId);

      if (result.success) {
        const mensagens = get().mensagens.map(msg =>
          msg.id === mensagemId ? { ...msg, lida: true } : msg
        );
        set({ mensagens });
      } else {
        throw new Error(result.error);
      }

      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao marcar mensagem como lida',
        loading: false
      });
    }
  },

  deletarMensagem: async (mensagemId: string, userId: string) => {
    try {
      set({ loading: true, error: null });
      const result = await get().mensagensService.excluirMensagem(mensagemId);

      if (result.success) {
        await get().carregarMensagens(userId);
      } else {
        throw new Error(result.error);
      }

      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao deletar mensagem',
        loading: false
      });
    }
  }
}));
