import type { User } from '@/models';
import { http } from '../client';
import { sessao } from '../sessao';

export const usuarios = {
  /** Usuário logado; atualiza o cache local. */
  async eu(): Promise<User> {
    const u = await http.get<User>('/v1/users/me');
    if (u) await sessao.guardarUsuario(u);
    return u;
  },
};
