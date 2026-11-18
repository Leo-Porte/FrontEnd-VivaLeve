import type { ApiError } from '@/models';

export function erroApi(
  message: string,
  extra: { status?: number; semLogin?: boolean; offline?: boolean } = {},
): ApiError {
  const e = new Error(message) as ApiError;
  Object.assign(e, extra);
  return e;
}

/** Mensagem amigável para mostrar na tela a partir de um erro. */
export function mensagemErro(
  e: unknown,
  padrao = 'Não foi possível falar com o servidor. Tente de novo.',
): string {
  if (!e) return padrao;
  const err = e as Partial<ApiError>;
  if (err.semLogin) return 'Sua sessão expirou. Entre de novo.';
  if (err.offline)
    return 'O servidor não respondeu. Ele pode estar acordando: tente de novo em alguns segundos.';
  return err.message || padrao;
}
