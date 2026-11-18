import type { Activity } from '@/models';
import { ATIVIDADES } from '@/entities';

/** Data local AAAA-MM-DD (toISOString usa UTC e vira o dia errado à noite no Brasil). */
export function dataLocal(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * As telas usam ids em minúsculo com hífen ("mais-ou-menos"); o back usa MAIS_OU_MENOS.
 */
export const emocao = {
  paraApi(id?: string | null): string | null {
    return id ? String(id).toUpperCase().replace(/-/g, '_') : null;
  },
  daApi(valor?: string | null): string | null {
    return valor ? String(valor).toLowerCase().replace(/_/g, '-') : null;
  },
};

/** Atividades da tela -> enum do back (derivado de ATIVIDADES em '@/entities'). */
export const ATIVIDADE_PARA_API: Record<string, Activity> = Object.fromEntries(
  ATIVIDADES.map((a) => [a.id, a.activity]),
);
