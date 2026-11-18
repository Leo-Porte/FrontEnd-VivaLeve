import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@/models';
import { api, sessao } from '@/infrastructure';

export interface SessionValue {
  usuario: User | null;
  logado: boolean;
  /** true enquanto lê a sessão guardada (1ª carga). */
  carregando: boolean;
  entrar(email: string, senha: string): Promise<User>;
  cadastrar(email: string, senha: string, nome?: string): Promise<User>;
  entrarGoogle(credential: string): Promise<User>;
  sair(): Promise<void>;
  recarregarUsuario(): Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    // aoMudar cobre login, logout e 401 vindo de qualquer chamada
    const cancelar = sessao.aoMudar((u) => vivo && setUsuario(u));
    (async () => {
      const logado = await sessao.logado();
      const u = logado ? await sessao.usuario() : null;
      if (vivo) {
        setUsuario(u);
        setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
      cancelar();
    };
  }, []);

  const entrar = useCallback((e: string, s: string) => api.auth.login(e, s), []);
  const cadastrar = useCallback((e: string, s: string, n?: string) => api.auth.register(e, s, n), []);
  const entrarGoogle = useCallback((c: string) => api.auth.google(c), []);
  const sair = useCallback(() => api.auth.sair(), []);
  const recarregarUsuario = useCallback(async () => {
    await api.usuarios.eu();
  }, []);

  const valor = useMemo<SessionValue>(
    () => ({ usuario, logado: usuario !== null, carregando, entrar, cadastrar, entrarGoogle, sair, recarregarUsuario }),
    [usuario, carregando, entrar, cadastrar, entrarGoogle, sair, recarregarUsuario],
  );
  return createElement(Ctx.Provider, { value: valor }, children);
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession precisa estar dentro de <SessionProvider>');
  return v;
}
