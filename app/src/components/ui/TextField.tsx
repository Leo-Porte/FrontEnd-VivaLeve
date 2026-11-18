import React, { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  /** campo de senha com botão mostrar/ocultar */
  secure?: boolean;
}

export function TextField({ label, error, hint, secure, multiline, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text variant="label">{label}</Text> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          backgroundColor: colors.surface,
          borderRadius: radius.sm,
          borderWidth: focused ? 2 : 1.5,
          borderColor,
          paddingHorizontal: spacing.md,
        }}
      >
        <TextInput
          accessibilityLabel={rest.accessibilityLabel ?? label}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          {...rest}
          multiline={multiline}
          secureTextEntry={secure && !shown}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={[
            {
              flex: 1,
              minHeight: multiline ? 110 : 48,
              paddingVertical: spacing.sm + 2,
              ...typography.body,
              color: colors.text,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            // remove o contorno padrão do navegador (já desenhamos o foco)
            { outlineStyle: 'none' } as object,
          ]}
        />
        {secure ? (
          <Pressable
            onPress={() => setShown((s) => !s)}
            testID={rest.testID ? `${rest.testID}-toggle` : undefined}
            accessibilityRole="button"
            accessibilityLabel={shown ? 'Ocultar senha' : 'Mostrar senha'}
            hitSlop={8}
            style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text variant="caption" tone="primary" style={{ fontWeight: '600' }}>{shown ? 'Ocultar' : 'Mostrar'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">{error}</Text> : hint ? <Text variant="caption" tone="muted">{hint}</Text> : null}
    </View>
  );
}
