import React from 'react';
import { View } from 'react-native';

import { SurfaceProvider, useTheme } from '@/theme';
import { PressableScale } from './motion';
import { Text } from './Text';

/** Altura padrão da faixa sálvia e do degradê que a dissolve no grupo. */
export const FAIXA = 36;
export const DISSOLVE = 12;

/** Sombra suave dos grupos com faixa (padrão da Home). */
export function useSombraGrupo(): string {
  const { colors } = useTheme();
  return `0 6px 18px ${colors.shadow}`;
}

export interface FaixaProps {
  titulo: string;
  /** ação de texto à direita (ex.: "Ver todos") */
  action?: { label: string; onPress: () => void; testID?: string };
  /** controles próprios à direita (substitui `action`), ex.: setas do calendário */
  direita?: React.ReactNode;
  /** altura da faixa (padrão 36; 44 quando leva botões de toque) */
  altura?: number;
}

/**
 * Cabeçalho em faixa sálvia que se dissolve no grupo (degradê com desfoque quase imperceptível).
 * Padrão único dos grupos do app: ListSection, Card com título, diálogos e o calendário do diário.
 * Vai como primeiro filho de um container com `overflow: 'hidden'` e cantos arredondados.
 */
export function Faixa({ titulo, action, direita, altura = FAIXA }: FaixaProps) {
  const { colors, spacing } = useTheme();
  const sobre = colors.onPrimary;
  const legenda = { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 } as const;
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: altura,
          left: -1,
          right: -1,
          height: DISSOLVE + 1,
          // slop:ok gradiente pedido de produto: a faixa do cabeçalho se dissolve no grupo
          backgroundImage: `linear-gradient(to bottom, ${colors.primary}80 0%, ${colors.primary}1F 40%, ${colors.primary}00 100%)`,
          // desfoque quase imperceptível: só tira o serrilhado da passagem
          filter: 'blur(1px)',
        }}
      />
      <SurfaceProvider value={colors.primary}>
        <View
          style={{
            minHeight: altura,
            // a própria linha leva o sálvia: o texto mede contraste contra o fundo real
            backgroundColor: colors.primary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            paddingLeft: spacing.md,
            paddingRight: direita ? spacing.xs : spacing.md,
          }}
        >
          <Text variant="caption" color={sobre} accessibilityRole="header" style={[legenda, { flexShrink: 1 }]}>
            {titulo}
          </Text>
          {direita ??
            (action ? (
              <PressableScale onPress={action.onPress} accessibilityRole="button" accessibilityLabel={action.label} testID={action.testID} style={{ minHeight: 32, justifyContent: 'center' }}>
                <Text variant="caption" color={sobre} style={{ fontWeight: '600' }}>{action.label}</Text>
              </PressableScale>
            ) : null)}
        </View>
      </SurfaceProvider>
    </>
  );
}
