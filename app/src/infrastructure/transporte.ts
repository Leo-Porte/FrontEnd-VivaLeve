/**
 * Interface de transporte: o HTTP real e o mock implementam a mesma coisa.
 * O cliente (client.ts) escolhe um por config e cuida de token e 401.
 */

export type Metodo = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** Campos de um multipart/form-data (ex.: /v1/mood-logs). Valor-array = campo repetido. */
export type CamposForm = Record<string, string | string[]>;

export interface Requisicao {
  metodo: Metodo;
  /** Caminho com query já montada, ex.: "/v1/stats?days=7". */
  endpoint: string;
  /** Corpo JSON. */
  json?: unknown;
  /** Corpo multipart (exclusivo com json). */
  form?: CamposForm;
  /** Bearer token (null em rotas sem login). */
  token: string | null;
}

export interface Transporte {
  enviar(req: Requisicao): Promise<any>;
}
