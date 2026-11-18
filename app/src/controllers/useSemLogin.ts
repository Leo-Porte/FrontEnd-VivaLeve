import type { ApiError } from '@/models';

/**
 * Em 401 a infrastructure já limpa a sessão e o <AuthGuard> manda para /login.
 * Aqui só avisamos o controller para não mostrar erro nem seguir o fluxo.
 * Uso: `if (tratarSemLogin(e)) return;`
 */
const tratarSemLogin = (e: unknown): boolean => !!(e as ApiError | undefined)?.semLogin;

export function useSemLogin() {
  return tratarSemLogin;
}
