import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { type Colors, type Scheme, palettes, radius, spacing, typography } from './core';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface Theme {
  colors: Colors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  /** esquema efetivo (já resolvido) */
  scheme: Scheme;
  /** o que o usuário escolheu */
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** alterna claro/escuro */
  toggle: () => void;
}

const STORAGE_KEY = 'pluma.theme';

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPref(v);
      })
      .catch(() => {});
  }, []);

  const scheme: Scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const value = useMemo<Theme>(
    () => ({
      colors: palettes[scheme],
      spacing,
      radius,
      typography,
      scheme,
      preference,
      setPreference,
      toggle: () => setPreference(scheme === 'dark' ? 'light' : 'dark'),
    }),
    [scheme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>');
  return ctx;
}

/** Cor de fundo atrás do conteúdo atual — `Text` usa para garantir contraste. */
const SurfaceContext = createContext<string | null>(null);
export const SurfaceProvider = SurfaceContext.Provider;
export function useSurface(): string {
  const { colors } = useTheme();
  return useContext(SurfaceContext) ?? colors.bg;
}
