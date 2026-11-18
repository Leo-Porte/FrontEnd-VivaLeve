import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { SurfaceProvider, contrastText, ensureContrast, useSurface, useTheme } from '@/theme';
import { PressableScale } from './motion';
import { Icon, iconNames, type IconName } from './Icon';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  /** ícone Lucide antes do texto */
  icon?: IconName;
  /** legado: nome de ícone em string; emoji solto é ignorado */
  emoji?: string;
  selected?: boolean;
  onPress?: () => void;
  /** cor de fundo quando selecionado (padrão: primary). O texto se ajusta sozinho. */
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Chip({ label, icon, emoji, selected, onPress, color, style, testID }: ChipProps) {
  const { colors, radius, spacing } = useTheme();
  const surface = useSurface();
  const selBg = color ?? colors.primary;
  const bg = selected ? selBg : colors.surfaceAlt;
  const fg = selected ? contrastText(selBg) : ensureContrast(colors.text, colors.surfaceAlt);
  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      testID={testID}
      style={[
        {
          minHeight: 44,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs + 2,
        },
        style,
      ]}
    >
      <SurfaceProvider value={bg}>
        {/* flexShrink 0: sem isso o SVG encolhia até sumir quando o rótulo apertava a célula (web, grade de 3) */}
        {icon || (emoji && (iconNames as string[]).includes(emoji)) ? (
          <View style={{ flexShrink: 0 }}>
            <Icon name={(icon ?? emoji) as IconName} size={16} color={fg} />
          </View>
        ) : null}
        <Text variant="label" color={fg}>{label}</Text>
      </SurfaceProvider>
    </PressableScale>
  );
}

export const ChipRow = ({ children }: { children: React.ReactNode }) => {
  const { spacing } = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>;
};
