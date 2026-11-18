import React, { createContext, useContext } from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

/**
 * Escrita sobre papel (post-it e caderneta). Não usa o `Text` do design system: o papel é sempre claro,
 * em qualquer tema, e a letra de mão tem escala própria (tokens em `theme.diario.tipo`).
 */

/** true quando a Caveat já carregou; antes disso a escrita sai na fonte do sistema. */
export const FonteMaoContext = createContext(false);

export interface EscritaProps extends TextProps {
  estilo: TextStyle;
  cor: string;
}

export function Escrita({ estilo, cor, style, ...rest }: EscritaProps) {
  const carregada = useContext(FonteMaoContext);
  const { fontFamily, ...semFamilia } = estilo;
  const familia = carregada && fontFamily ? { fontFamily } : null;
  return <RNText {...rest} style={[semFamilia, familia, { color: cor }, style]} />;
}
