import { useWindowDimensions } from 'react-native';

/**
 * Sistema de layout do Pluma — uma régua só para telefone, tablet e desktop.
 *
 * Breakpoints pela LARGURA DA JANELA:
 *   compact  < 600   telefone            4 colunas  margem 16  gap 12
 *   medium   600–1023 tablet / janela    8 colunas  margem 24  gap 16
 *   expanded ≥ 1024  desktop            12 colunas  margem 32  gap 20
 *
 * Larguras máximas do conteúdo (container centralizado):
 *   'wide'    1120  telas de painel (Home, Histórico, Diário, Respirar, Config)
 *   'regular'  880  formulários longos (Humor)
 *   'narrow'   720  leitura e conversa (Sessão, Login)
 *
 * Toda grade de cards usa <Grid> com colunas de largura igual: nada de card com largura do próprio conteúdo.
 */

export type Breakpoint = 'compact' | 'medium' | 'expanded';
export type Responsive<T> = T | Partial<Record<Breakpoint, T>>;
export type ContentWidth = 'wide' | 'regular' | 'narrow';

export const BREAKPOINTS = { medium: 600, expanded: 1024 } as const;
export const CONTENT_MAX: Record<ContentWidth, number> = { wide: 1120, regular: 880, narrow: 720 };
export const GUTTER: Record<Breakpoint, number> = { compact: 16, medium: 24, expanded: 32 };
export const GAP: Record<Breakpoint, number> = { compact: 12, medium: 16, expanded: 20 };
export const COLUMNS: Record<Breakpoint, number> = { compact: 4, medium: 8, expanded: 12 };

/** A partir desta largura de janela, a bolinha do menu orbital vai para o canto inferior direito. */
export const MENU_LATERAL = { janelaMinima: 900 } as const;

export function breakpointOf(contentWidth: number): Breakpoint {
  if (contentWidth >= BREAKPOINTS.expanded) return 'expanded';
  if (contentWidth >= BREAKPOINTS.medium) return 'medium';
  return 'compact';
}

/** Resolve um valor responsivo: usa o do breakpoint, senão o do menor breakpoint definido abaixo dele. */
export function resolve<T>(value: Responsive<T>, bp: Breakpoint): T {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return value as T;
  const v = value as Partial<Record<Breakpoint, T>>;
  const ordem: Breakpoint[] = bp === 'expanded' ? ['expanded', 'medium', 'compact'] : bp === 'medium' ? ['medium', 'compact'] : ['compact'];
  for (const k of ordem) if (v[k] !== undefined) return v[k] as T;
  return (v.compact ?? v.medium ?? v.expanded) as T;
}

/** Largura em px de N colunas de um total, descontando os gaps. */
export function spanWidth(container: number, total: number, span: number, gap: number): number {
  const col = (container - gap * (total - 1)) / total;
  return col * span + gap * (span - 1);
}

export interface Layout {
  bp: Breakpoint;
  /** largura útil da janela para o conteúdo */
  areaWidth: number;
  gutter: number;
  gap: number;
  columns: number;
  isCompact: boolean;
  isExpanded: boolean;
  r: <T>(value: Responsive<T>) => T;
}

/**
 * Hook de layout. Telas não devem usar useWindowDimensions direto para decidir layout — usem isto.
 */
export function useLayout(): Layout {
  const { width } = useWindowDimensions();
  const areaWidth = width;
  const bp = breakpointOf(areaWidth);
  return {
    bp,
    areaWidth,
    gutter: GUTTER[bp],
    gap: GAP[bp],
    columns: COLUMNS[bp],
    isCompact: bp === 'compact',
    isExpanded: bp === 'expanded',
    r: (value) => resolve(value, bp),
  };
}
