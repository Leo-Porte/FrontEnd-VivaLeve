import React from 'react';
import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { type TextVariant, ensureContrast, fontFor, headingVariants, useSurface, useTheme } from '@/theme';

export type TextTone = 'default' | 'muted' | 'primary' | 'danger' | 'lilac';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** cor explícita; mesmo assim é ajustada para ter contraste sobre o fundo atual */
  color?: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Texto do design system. A cor sempre é ajustada (ensureContrast) contra o fundo
 * em que está (Card/Screen informam via SurfaceProvider), mínimo 4.5:1.
 */
export function Text({ variant = 'body', tone = 'default', color, align, style, accessibilityRole, ...rest }: TextProps) {
  const { colors, typography } = useTheme();
  const surface = useSurface();
  const toneColor = {
    default: colors.text,
    muted: colors.textMuted,
    primary: colors.primary,
    danger: colors.danger,
    lilac: colors.lilacStrong,
  }[tone];
  const fg = ensureContrast(color ?? toneColor, surface);
  const flat = StyleSheet.flatten([typography[variant], style]) ?? {};
  const family = fontFor(headingVariants.includes(variant) ? 'heading' : 'body');
  // títulos grandes com tracking negativo, como o SF Pro Display
  const tracking = variant === 'display' ? { letterSpacing: 0.37 * -1 } : variant === 'title' ? { letterSpacing: -0.26 } : null;
  return (
    <RNText
      accessibilityRole={accessibilityRole ?? (variant === 'display' || variant === 'title' ? 'header' : undefined)}
      {...rest}
      // slop:ok fonte aqui é onde o token de fonte do sistema é aplicado
      style={[flat, tracking, family ? { fontFamily: family } : null, { color: fg }, align ? { textAlign: align } : null]}
    />
  );
}
