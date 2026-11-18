import type { AuthResponse, User } from '@/models';
import { request } from '../client';
import { sessao } from '../sessao';

export const auth = {
  /** Erro 401 = email ou senha inválidos. */
  async login(email: string, password: string): Promise<User> {
    const r = await request<AuthResponse>('POST', '/v1/auth/login', { json: { email, password }, semToken: true });
    return sessao.salvar(r);
  },

  /** Senha de 8 a 64 caracteres. Já entra logado. Erro 409 = email já cadastrado. */
  async register(email: string, password: string, name?: string): Promise<User> {
    const r = await request<AuthResponse>('POST', '/v1/auth/register', {
      json: { email, password, name: name || null },
      semToken: true,
    });
    return sessao.salvar(r);
  },

  /** ID Token do "Entrar com Google". */
  async google(credential: string): Promise<User> {
    const r = await request<AuthResponse>('POST', '/v1/auth/google', { json: { credential }, semToken: true });
    return sessao.salvar(r);
  },

  logado(): Promise<boolean> {
    return sessao.logado();
  },

  sair(): Promise<void> {
    return sessao.limpar();
  },
};
