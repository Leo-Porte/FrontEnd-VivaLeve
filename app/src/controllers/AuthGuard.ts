import { createElement, Fragment, type ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useSession } from './useSession';

/** 'ok' = pode renderizar · 'espera' = ainda lendo a sessão · 'login' = redirecionar. */
export function useAuthGuard(): 'ok' | 'espera' | 'login' {
  const { logado, carregando } = useSession();
  if (carregando) return 'espera';
  return logado ? 'ok' : 'login';
}

/** Envolve rotas protegidas: deslogado vai para /login. */
export function AuthGuard({ children }: { children: ReactNode }) {
  const estado = useAuthGuard();
  if (estado === 'espera') return null;
  if (estado === 'login') return createElement(Redirect, { href: '/login' });
  return createElement(Fragment, null, children);
}

/** Envolve /login: quem já está logado vai para a home. */
export function GuestGuard({ children }: { children: ReactNode }) {
  const { logado, carregando } = useSession();
  if (carregando) return null;
  if (logado) return createElement(Redirect, { href: '/' });
  return createElement(Fragment, null, children);
}
