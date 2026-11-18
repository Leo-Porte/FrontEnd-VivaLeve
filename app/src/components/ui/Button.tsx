import React from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import { SurfaceProvider, ensureContrast, useSurface, useTheme } from '@/theme';
import { PressableScale } from './motion';
import { Icon, iconNames, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  /** ocupa a largura toda */
  fullWidth?: boolean;
  /** emoji ou elemento antes do rótulo (ex.: Icon3D) */
  icon?: React.ReactNode;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Button({
  label, onPress, variant = 'primary', loading, disabled, fullWidth, icon, small, style, accessibilityLabel, testID,
}: ButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const surface = useSurface();
  const off = disabled || loading;

  let bg = 'transparent';
  let fg = colors.text;
  // iOS: primary = preenchido, secondary = tingido, ghost = só texto, danger = tingido vermelho
  if (variant === 'primary') { bg = colors.primary; fg = colors.onPrimary; }
  else if (variant === 'secondary') { bg = colors.primarySoft; fg = colors.primary; }
  else if (variant === 'danger') { bg = colors.surfaceAlt; fg = colors.danger; }
  else { fg = ensureContrast(colors.primary, surface); }
  fg = ensureContrast(fg, bg === 'transparent' ? surface : bg);
  if (bg !== 'transparent') fg = ensureContrast(fg, bg);

  return (
    <PressableScale
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      testID={testID}
      style={[
        {
          minHeight: small ? 36 : 50,
          paddingHorizontal: small ? spacing.md - 2 : spacing.lg - 4,
          borderRadius: radius.md,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          opacity: disabled ? 0.4 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      <SurfaceProvider value={bg === 'transparent' ? surface : bg}>
        {loading ? <ActivityIndicator color={fg} /> : icon ? <View>{typeof icon === 'string' ? ((iconNames as string[]).includes(icon) ? <Icon name={icon as IconName} size={18} color={fg} /> : null) : icon}</View> : null}
        <Text variant={small ? 'label' : 'subtitle'} color={fg}>
          {label}
        </Text>
      </SurfaceProvider>
    </PressableScale>
  );
}

