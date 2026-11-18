/** Regra pura de quando mostrar a abertura da Home (sem React, sem armazenamento: testável). */

/** Guarda o dia (AAAA-MM-DD) em que a abertura da Home já foi vista. */
export const CHAVE_ABERTURA = 'pluma_abertura_vista';

/**
 * Quando mostrar a abertura animada da Home.
 * Regra: só na primeira entrada do dia (8 s toda vez que volta para a Home cansa).
 * Para mostrar sempre, troque `deveMostrar` por `() => true`.
 */
export function deveMostrar(vistaEm: string | null, hoje: string): boolean {
  return vistaEm !== hoje;
}
