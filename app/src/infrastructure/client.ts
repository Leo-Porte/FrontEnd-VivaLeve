import { MODO_API } from './config';
import { erroApi } from './erros';
import { criarTransporteHttp } from './http';
import { transporteMock } from './mock';
import { sessao } from './sessao';
import type { CamposForm, Metodo, Transporte } from './transporte';

const transporte: Transporte = MODO_API === 'mock' ? transporteMock : criarTransporteHttp();

interface Opcoes {
  json?: unknown;
  form?: CamposForm;
  /** true em login/cadastro/google: não manda token e 401 não derruba a sessão. */
  semToken?: boolean;
}

export async function request<T = any>(metodo: Metodo, endpoint: string, op: Opcoes = {}): Promise<T> {
  const token = op.semToken ? null : await sessao.token();
  try {
    return await transporte.enviar({ metodo, endpoint, json: op.json, form: op.form, token });
  } catch (e: any) {
    if (e?.status === 401 && !op.semToken) {
      await sessao.limpar();
      e.semLogin = true;
    }
    throw e;
  }
}

export const http = {
  get: <T = any>(url: string) => request<T>('GET', url),
  post: <T = any>(url: string, json?: unknown) => request<T>('POST', url, { json }),
  put: <T = any>(url: string, json?: unknown) => request<T>('PUT', url, { json }),
  delete: <T = any>(url: string) => request<T>('DELETE', url),
};

/** Monta "?a=1&b=2" ignorando vazios. */
export function qs(params: Record<string, string | number | undefined | null> = {}): string {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
  });
  const s = p.toString();
  return s ? '?' + s : '';
}

export function exigirEnum(valor: unknown, lista: readonly string[], campo: string): void {
  if (!lista.includes(valor as string)) {
    throw erroApi(`${campo} inválido: "${valor}". Use um destes: ${lista.join(', ')}`);
  }
}

export function exigir(valor: unknown, campo: string): void {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    throw erroApi(`${campo} é obrigatório`);
  }
}
