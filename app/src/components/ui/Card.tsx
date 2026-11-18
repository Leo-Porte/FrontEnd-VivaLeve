import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { SurfaceProvider, useTheme } from '@/theme';
import { Faixa, useSombraGrupo } from './Faixa';
import { PressableScale } from './motion';
import { useScreenLayout } from './useScreenLayout';

export type CardTone = 'default' | 'green' | 'lilac' | 'alt';

export interface CardProps {
  children: React.ReactNode;
  tone?: CardTone;
  /** torna o card tocável */
  onPress?: () => void;
  accessibilityLabel?: string;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** título em faixa sálvia no topo (mesmo padrão dos grupos e diálogos) */
  title?: string;
  /** ação de texto à direita da faixa */
  action?: { label: string; onPress: () => void; testID?: string };
}

/** Bloco de conteúdo que não é lista (gráfico, exercício, texto). Mesmos cantos e sombra dos grupos. */
export function Card({ children, tone = 'default', onPress, accessibilityLabel, padded = true, style, testID, title, action }: CardProps) {
  const { colors, radius, spacing } = useTheme();
  const { isCompact } = useScreenLayout();
  const sombra = useSombraGrupo();
  const bg = { default: colors.surface, alt: colors.surfaceAlt, green: colors.primarySoft, lilac: colors.lilac }[tone];
  const pad = isCompact ? spacing.md : spacing.lg;
  const boxStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor: bg,
      borderRadius: radius.lg,
      gap: spacing.sm,
      borderCurve: 'continuous',
      overflow: title ? 'hidden' : undefined,
      // slop:ok sombra pedido de produto: blocos com sombra suave (padrão da Home)
      boxShadow: sombra,
    },
    padded && !title && { padding: pad },
    style,
  ];
  const body = title ? (
    <>
      <Faixa titulo={title} action={action} />
      <SurfaceProvider value={tone === 'default' ? colors.primarySoft : bg}>
        <View style={[{ gap: spacing.sm }, padded && { padding: pad, paddingTop: spacing.md }]}>{children}</View>
      </SurfaceProvider>
    </>
  ) : (
    <SurfaceProvider value={bg}>{children}</SurfaceProvider>
  );
  if (onPress) {
    return (
      <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={boxStyle} testID={testID}>
        {body}
      </PressableScale>
    );
  }
  return <View style={boxStyle} testID={testID}>{body}</View>;
}
