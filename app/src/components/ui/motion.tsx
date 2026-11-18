import { MotiView } from 'moti';
import React, { useState } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/** Transição suave. (Cast: o tipo de transição do Moti 0.30 não aceita literal inline com Reanimated 4.) */
export const timing = (duration: number, delay?: number) => ({ type: 'timing', duration, delay }) as never;

/** true quando o usuário pediu menos movimento no sistema. */
export function useReduceMotion(): boolean {
  return useReducedMotion();
}

export interface FadeInProps {
  children: React.ReactNode;
  /** atraso em ms */
  delay?: number;
  /** deslocamento vertical inicial em px (sobe até a posição final) */
  offset?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/** Entrada suave: opacidade + leve subida. Sem animação se reduce motion. */
export function FadeIn({ children, delay = 0, offset = 8, duration = 400, style }: FadeInProps) {
  const reduce = useReduceMotion();
  if (reduce) return <MotiView style={style}>{children}</MotiView>;
  return (
    <MotiView
      from={{ opacity: 0, translateY: offset }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={timing(duration, delay)}
      style={style}
    >
      {children}
    </MotiView>
  );
}

export interface StaggerProps {
  children: React.ReactNode;
  /** intervalo entre filhos em ms */
  step?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** Entrada escalonada: cada filho entra com `step` ms depois do anterior (máx. 12 filhos escalonados). */
export function Stagger({ children, step = 70, delay = 0, style }: StaggerProps) {
  const items = React.Children.toArray(children);
  return (
    <MotiView style={style}>
      {items.map((child, i) => (
        <FadeIn key={(React.isValidElement(child) && child.key) || i} delay={delay + Math.min(i, 12) * step}>
          {child}
        </FadeIn>
      ))}
    </MotiView>
  );
}

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children?: React.ReactNode;
}

const CHAVES_EXTERNAS = [
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'position', 'top', 'bottom', 'left', 'right', 'zIndex',
] as const;
/** só na camada de fora (na de dentro duplicariam o deslocamento) */
const CHAVES_SO_FORA = [
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'position', 'top', 'bottom', 'left', 'right', 'zIndex', 'flexBasis', 'alignSelf', 'maxWidth', 'maxHeight',
] as const;

/** Pressable com realce de toque do iOS (escurece/clareia por opacidade; sem escala, que é costume de web). `scaleTo` é ignorado. */
export function PressableScale({ style, scaleTo = 0.97, children, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const reduce = useReduceMotion();
  const [pressed, setPressed] = useState(false);
  // tamanho/posição valem para a área de toque (fora); o resto (cor, borda, padding) fica na camada animada
  const plano = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const externo: ViewStyle = {};
  for (const k of CHAVES_EXTERNAS) if (plano[k] !== undefined) (externo as Record<string, unknown>)[k] = plano[k];
  const interno: Record<string, unknown> = { ...plano };
  for (const k of CHAVES_SO_FORA) delete interno[k];
  if (externo.flex !== undefined || externo.flexGrow !== undefined || externo.height !== undefined) interno.flex = 1;
  return (
    <Pressable
      {...rest}
      style={externo}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
    >
      <MotiView
        animate={{ opacity: pressed && !rest.disabled ? 0.55 : 1 }}
        transition={timing(pressed ? 0 : 180)}
        style={interno as ViewStyle}
      >
        {children}
      </MotiView>
    </Pressable>
  );
}
