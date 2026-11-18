import type { AiResponse, ChatMessage, Conversation } from '@/models';
import { REGRAS } from '@/entities';
import { http, request } from '../client';
import { sessao } from '../sessao';

async function nomeParaIa(): Promise<string | null> {
  const u = await sessao.usuario();
  return u?.name ? u.name.slice(0, REGRAS.NOME_IA_MAX) : null;
}

export const ia = {
  /** Envia mensagem; continua a conversa salva do usuário (retry sem conversa em 404). */
  async conversar(mensagem: string): Promise<AiResponse> {
    const salva = await sessao.conversaSalva();
    const body = { conversationId: salva, message: mensagem, userName: await nomeParaIa() };
    try {
      const resp = await request<AiResponse>('POST', '/v1/ai/chat', { json: body });
      if (resp.conversationId != null) await sessao.salvarConversa(resp.conversationId);
      return resp;
    } catch (e: any) {
      if (e?.status === 404 && body.conversationId) {
        await sessao.limparConversa();
        return ia.conversar(mensagem);
      }
      throw e;
    }
  },

  /** Mensagens da conversa salva ([] se não houver). */
  async historico(): Promise<ChatMessage[]> {
    const salva = await sessao.conversaSalva();
    if (!salva) return [];
    try {
      return await http.get<ChatMessage[]>(`/v1/ai/conversations/${salva}/messages`);
    } catch (e: any) {
      if (e?.status === 404) {
        await sessao.limparConversa();
        return [];
      }
      throw e;
    }
  },

  /**
   * Encerra a sessão ativa sem apagar: o back continua com a conversa, que passa a aparecer
   * em "Sessões anteriores". A próxima mensagem abre outra conversa.
   */
  async encerrar(): Promise<void> {
    await sessao.limparConversa();
  },

  /** Id da sessão ativa (null se nenhuma). */
  ativa(): Promise<number | null> {
    return sessao.conversaSalva();
  },

  /** Torna `conversationId` a sessão ativa: as próximas mensagens continuam nela. */
  async retomar(conversationId: number): Promise<void> {
    await sessao.salvarConversa(conversationId);
  },

  /** Conversas de sessão (sem as de insight/reflexão), da mais recente para a mais antiga. */
  async sessoes(): Promise<Conversation[]> {
    const todas = await http.get<Conversation[]>('/v1/ai/conversations');
    return todas
      .filter((c) => !c.useCase || c.useCase === 'CHAT')
      .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
  },

  conversas(): Promise<Conversation[]> {
    return http.get('/v1/ai/conversations');
  },
  mensagens(conversationId: number): Promise<ChatMessage[]> {
    return http.get(`/v1/ai/conversations/${conversationId}/messages`);
  },
  apagarConversa(conversationId: number): Promise<void> {
    return http.delete(`/v1/ai/conversations/${conversationId}`);
  },

  async insightHumor(days = 7): Promise<AiResponse> {
    return http.post('/v1/ai/insights/mood', { days, userName: await nomeParaIa() });
  },
  async reflexaoRegistro(moodLogId: number): Promise<AiResponse> {
    return http.post(`/v1/ai/mood-logs/${moodLogId}/reflection`, { userName: await nomeParaIa() });
  },
};
