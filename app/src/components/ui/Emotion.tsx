import { MotiView } from 'moti';
import React from 'react';
import { View } from 'react-native';

import { SurfaceProvider, type EmotionId, type MoodKey, type Responsive, emotionColors, ensureContrast, emotions, getEmotion, useTheme } from '@/theme';
import { timing, PressableScale, useReduceMotion } from './motion';
import { Grid } from './Grid';
import { Icon, iconeDe } from './Icon';
import { Text } from './Text';

export interface EmotionPickerProps {
  /** id da tela ('mais-ou-menos') ou valor da API ('MAIS_OU_MENOS'); null = nenhum */
  value: EmotionId | MoodKey | null | undefined;
  /** devolve id da tela e valor da API */
  onChange: (id: EmotionId, mood: MoodKey) => void;
  disabled?: boolean;
  /** colunas por breakpoint (padrão: 3 no compact, 6 a partir do medium) */
  columns?: Responsive<number>;
  /** altura mínima de cada célula (padrão 92) */
  minHeight?: number;
  /** tamanho do ícone (padrão 30) */
  iconSize?: number;
  /** fundo das células não selecionadas (padrão `surface`; dentro de um grupo use `surfaceAlt`) */
  cellColor?: string;
}

/** Grade com as 6 emoções (3 por linha no mobile). */
export function EmotionPicker({ value, onChange, disabled, columns = { compact: 3, medium: 6 }, minHeight = 92, iconSize = 30, cellColor }: EmotionPickerProps) {
  const { colors, radius, spacing, scheme } = useTheme();
  const reduce = useReduceMotion();
  const current = value ? getEmotion(value).id : null;
  const fundo = cellColor ?? colors.surface;
  return (
    <View accessibilityRole="radiogroup">
    <Grid columns={columns} gap={spacing.sm}>
      {emotions.map((e) => {
        const selected = current === e.id;
        const ec = emotionColors(e, scheme);
        return (
          <PressableScale
            key={e.id}
            disabled={disabled}
            onPress={() => onChange(e.id, e.mood)}
            accessibilityRole="radio"
            accessibilityLabel={e.label}
            accessibilityState={{ selected, disabled: !!disabled }}
            testID={`emotion-${e.id}`}
            style={{
              flex: 1,
              minHeight,
              borderRadius: radius.md,
              backgroundColor: selected ? ec.fill : fundo,
              borderCurve: 'continuous',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
              padding: spacing.sm,
            }}
          >
            <SurfaceProvider value={selected ? ec.fill : fundo}>
              <MotiView animate={{ scale: selected && !reduce ? 1.12 : 1 }} transition={timing(200)}>
                <Icon name={iconeDe(e.id)} size={iconSize} color={selected ? ec.onFill : ensureContrast(ec.text, fundo, 3)} />
              </MotiView>
              <Text variant="label" color={selected ? ec.onFill : colors.text} align="center" numberOfLines={2}>{e.label}</Text>
            </SurfaceProvider>
          </PressableScale>
        );
      })}
    </Grid>
    </View>
  );
}

export interface EmotionBadgeProps {
  /** id da tela, valor da API, ou null/undefined (mostra "Desconhecido") */
  emotion: string | null | undefined;
  /** mostra o texto ao lado do emoji (padrão true) */
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  testID?: string;
}

/** Selo com emoji e nome da emoção, cores com contraste garantido. */
export function EmotionBadge({ emotion, showLabel = true, size = 'md', testID }: EmotionBadgeProps) {
  const { radius, spacing, scheme } = useTheme();
  const e = getEmotion(emotion);
  const ec = emotionColors(e, scheme);
  const emoji = { sm: 14, md: 16, lg: 22 }[size];
  return (
    <View
      accessible
      testID={testID}
      accessibilityLabel={e.label}
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 2,
        backgroundColor: ec.fill,
        borderRadius: radius.md,
        paddingHorizontal: showLabel ? spacing.sm + 4 : spacing.sm,
        paddingVertical: spacing.xs + 1,
      }}
    >
      <SurfaceProvider value={ec.fill}>
        <Icon name={iconeDe(e.id)} size={emoji} color={ec.onFill} />
        {showLabel ? <Text variant={size === 'sm' ? 'caption' : 'label'} color={ec.onFill} style={{ fontWeight: '600' }}>{e.label}</Text> : null}
      </SurfaceProvider>
    </View>
  );
}
