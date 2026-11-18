import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { SurfaceProvider, contrastText, useTheme } from '@/theme';
import { Button } from './Button';
import { Card } from './Card';
import { FadeIn } from './motion';
import { PressableScale } from './motion';
import { Icon, IconBadge, iconNames, type IconName } from './Icon';
import { Text } from './Text';

// ------------------------------------------------------------ StatTile

export interface StatTileProps {
  label: string;
  value: string | number;
  hint?: string;
  /** emoji ou elemento (ex.: Icon3D) */
  icon?: React.ReactNode;
  /** atalho para `icon` com emoji */
  emoji?: string;
  testID?: string;
  /** cor de fundo do tile (padrão: surface). O texto se ajusta sozinho. */
  color?: string;
}

export function StatTile({ label, value, hint, icon: iconProp, emoji, color, testID }: StatTileProps) {
  const icon = iconProp ?? emoji;
  const { colors, radius, spacing, scheme } = useTheme();
  const bg = color ?? colors.surface;
  const fg = color ? contrastText(color) : colors.text;
  return (
    <View
      accessible
      testID={testID}
      accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ''}`}
      style={{
        flex: 1,
        backgroundColor: bg,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <SurfaceProvider value={bg}>
        {icon ? <View>{typeof icon === 'string' ? (ehIcone(icon) ? <IconBadge name={icon} size={36} /> : null) : icon}</View> : null}
        <Text variant="display" color={fg}>{String(value)}</Text>
        <Text variant="label" color={fg}>{label}</Text>
        {hint ? <Text variant="caption" color={fg}>{hint}</Text> : null}
      </SurfaceProvider>
    </View>
  );
}

// ------------------------------------------------------------ SectionHeader

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md }}>
      <View style={{ flex: 1 }}>
        <Text variant="subtitle" accessibilityRole="header">{title}</Text>
        {subtitle ? <Text variant="caption" tone="muted">{subtitle}</Text> : null}
      </View>
      {action ? (
        <PressableScale onPress={action.onPress} accessibilityRole="button" accessibilityLabel={action.label} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text variant="label" tone="primary">{action.label}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------ EmptyState / ErrorState / Loading

export interface EmptyStateProps {
  icon?: React.ReactNode;
  /** atalho para `icon` com emoji */
  emoji?: string;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  /** atalho para `action` */
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

export function EmptyState({ icon: iconProp, emoji, title, message, action: actionProp, actionLabel, onAction, testID }: EmptyStateProps) {
  const { spacing } = useTheme();
  const icon = iconProp ?? emoji ?? 'folha';
  const action = actionProp ?? (actionLabel && onAction ? { label: actionLabel, onPress: onAction } : undefined);
  return (
    <FadeIn>
      <View testID={testID} style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
        {typeof icon === 'string' ? <IconBadge name={ehIcone(icon) ? icon : 'folha'} size={56} /> : icon}
        <Text variant="subtitle" align="center">{title}</Text>
        {message ? <Text tone="muted" align="center">{message}</Text> : null}
        {action ? <Button label={action.label} onPress={action.onPress} /> : null}
      </View>
    </FadeIn>
  );
}

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  title?: string;
  testID?: string;
}

export function ErrorState({ testID, message = 'Algo deu errado. Tente de novo em instantes.', onRetry, title = 'Não deu certo' }: ErrorStateProps) {
  const { spacing, colors } = useTheme();
  return (
    <Card testID={testID}>
      <View accessibilityRole="alert" style={{ alignItems: 'center', gap: spacing.sm }}>
        <Icon name="alerta" size={28} color={colors.textMuted} />
        <Text variant="subtitle" align="center">{title}</Text>
        <Text tone="muted" align="center">{message}</Text>
        {onRetry ? <Button label="Tentar de novo" variant="secondary" onPress={onRetry} /> : null}
      </View>
    </Card>
  );
}

export interface LoadingProps {
  label?: string;
  /** ocupa a área toda e centraliza */
  fill?: boolean;
  testID?: string;
}

export function Loading({ label = 'Carregando…', fill, testID }: LoadingProps) {
  const { colors, spacing } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[{ alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl }, fill ? { flex: 1 } : null]}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text variant="caption" tone="muted">{label}</Text>
    </View>
  );
}

// ------------------------------------------------------------ ListItem

export interface ListItemProps {
  title: string;
  subtitle?: string;
  /** elemento à esquerda (emoji, EmotionBadge, Icon3D…) */
  left?: React.ReactNode;
  /** elemento à direita */
  right?: React.ReactNode;
  onPress?: () => void;
  /** linha divisória embaixo */
  divider?: boolean;
  numberOfLines?: number;
  testID?: string;
}

export function ListItem({ title, subtitle, left, right, onPress, divider, numberOfLines = 2, testID }: ListItemProps) {
  const { colors, spacing } = useTheme();
  const content = (
    <View
      style={{
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: colors.surfaceAlt,
      }}
    >
      {left ? <View>{typeof left === 'string' ? null : left}</View> : null}
      <View style={{ flex: 1 }}>
        <Text variant="label" numberOfLines={numberOfLines}>{title}</Text>
        {subtitle ? <Text variant="caption" tone="muted" numberOfLines={numberOfLines}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
  if (!onPress) return <View testID={testID}>{content}</View>;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={title} testID={testID}>
      {content}
    </PressableScale>
  );
}

/** string vira ícone Lucide se for um IconName; emoji solto é ignorado (sem emoji na interface). */
function ehIcone(s: string): s is IconName {
  return (iconNames as string[]).includes(s);
}
