import { usePathname } from 'expo-router';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { MENU_LATERAL, useTheme } from '@/theme';
import { NavChromeProvider } from './navChrome';
import { MenuOrbital } from './orbital/MenuOrbital';

export interface AppShellProps {
  children: React.ReactNode;
  /** rotas em que a navegação some (padrão: ['/login']) */
  hideOn?: string[];
}

/**
 * Casca do app: as telas + o menu orbital (bolinha da pluma que abre a roda de navegação).
 * - Telefone/tablet: bolinha embaixo, no centro. Janela larga (≥ MENU_LATERAL.janelaMinima): canto inferior direito.
 * - Nos dois casos o conteúdo fica centralizado e as telas reservam espaço no fim da rolagem (`espacoInferior`),
 *   para o último item nunca ficar atrás da bolinha.
 */
export function AppShell(props: AppShellProps) {
  return (
    <NavChromeProvider>
      <ShellInterno {...props} />
    </NavChromeProvider>
  );
}

function ShellInterno({ children, hideOn = ['/login'] }: AppShellProps) {
  const { colors } = useTheme();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const lateral = width >= MENU_LATERAL.janelaMinima;

  if (hideOn.includes(pathname)) return <View style={{ flex: 1, backgroundColor: colors.bg }}>{children}</View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>{children}</View>
      <MenuOrbital lateral={lateral} />
    </View>
  );
}
