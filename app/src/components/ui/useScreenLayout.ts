import { useLayout, type Layout } from '@/theme';

/** useLayout já descontando o espaço do menu lateral. Use este nas telas. */
export function useScreenLayout(): Layout {
  return useLayout();
}
