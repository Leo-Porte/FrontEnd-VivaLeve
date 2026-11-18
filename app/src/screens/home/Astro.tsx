import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg';

import { useReduceMotion } from '@/components/ui';
import { abertura, useTheme, type PeriodoDoDia } from '@/theme';

/**
 * Sol (manhã, tarde, entardecer) ou lua (noite), em viewBox 120×120.
 * - `rosto`: versão grande da abertura (brilho pulsando, raios girando, estrelas, olhos e sorriso).
 * - sem `rosto`: ícone pequeno do cabeçalho (só a forma).
 * - `piscar`: fecha e abre o olho direito uma vez.
 * As partes que se mexem ficam em camadas (Animated.View), como nos ícones do menu orbital.
 */
export interface AstroProps {
  periodo: PeriodoDoDia;
  tamanho: number;
  rosto?: boolean;
  piscar?: boolean;
}

const RAIOS: [number, number, number, number][] = [
  [60, 6, 60, 16], [60, 104, 60, 114], [6, 60, 16, 60], [104, 60, 114, 60],
  [22, 22, 29, 29], [91, 91, 98, 98], [98, 22, 91, 29], [29, 91, 22, 98],
];

/** curva suave (criada sob demanda: testes com Reanimated simplificado não quebram no import) */
const suave = () => Easing.bezier(0.45, 0.05, 0.55, 0.95);

export function Astro({ periodo, tamanho, rosto = false, piscar = false }: AstroProps) {
  const { colors, scheme } = useTheme();
  const reduce = useReduceMotion();
  const p = abertura.periodos[periodo];
  const lua = periodo === 'noite';
  const corRosto = lua ? abertura.rosto.lua : abertura.rosto.sol;

  const giro = useSharedValue(0);
  const pulso = useSharedValue(0);
  const olho = useSharedValue(1);

  useEffect(() => {
    if (!rosto || reduce) return;
    giro.value = withRepeat(withTiming(360, { duration: 40000, easing: Easing.linear }), -1, false);
    pulso.value = withRepeat(withTiming(1, { duration: 2250, easing: suave() }), -1, true);
    return () => {
      cancelAnimation(giro);
      cancelAnimation(pulso);
    };
  }, [rosto, reduce, giro, pulso]);

  useEffect(() => {
    if (!piscar || reduce) return;
    olho.value = withSequence(
      withTiming(0.1, { duration: 405, easing: suave() }),
      withTiming(0.1, { duration: 90 }),
      withTiming(1, { duration: 405, easing: suave() }),
    );
  }, [piscar, reduce, olho]);

  const estiloRaios = useAnimatedStyle(() => ({ transform: [{ rotate: `${giro.value}deg` }] }));
  const estiloBrilho = useAnimatedStyle(() => ({
    opacity: 0.5 + 0.25 * pulso.value,
    transform: [{ scale: 0.97 + 0.07 * pulso.value }],
  }));
  const estiloOlho = useAnimatedStyle(() => ({ transform: [{ scaleY: olho.value }] }));

  const camada = { position: 'absolute' as const, left: 0, top: 0, width: tamanho, height: tamanho };
  const xOlhoDir = lua ? 68 : 72;

  // ícone do cabeçalho: só a forma
  if (!rosto) {
    return (
      <Svg width={tamanho} height={tamanho} viewBox="0 0 120 120">
        {lua ? (
          <>
            <Circle cx={60} cy={60} r={42} fill={p.nucleo} />
            <Circle cx={78} cy={48} r={38} fill={colors.bg} opacity={0.92} />
          </>
        ) : (
          <>
            <G stroke={p.raio} strokeWidth={8} strokeLinecap="round">
              {RAIOS.map(([x1, y1, x2, y2], i) => <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
            </G>
            <Circle cx={60} cy={60} r={36} fill={p.nucleo} />
          </>
        )}
      </Svg>
    );
  }

  return (
    <View style={{ width: tamanho, height: tamanho }} pointerEvents="none">
      <Animated.View style={[camada, estiloBrilho]}>
        <Svg width={tamanho} height={tamanho} viewBox="0 0 120 120">
          <Circle cx={60} cy={60} r={lua ? 56 : 58} fill={p.brilho[scheme]} />
        </Svg>
      </Animated.View>

      {lua ? (
        <Animated.View style={[camada, estiloBrilho]}>
          <Svg width={tamanho} height={tamanho} viewBox="0 0 120 120">
            <Path d="M14 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill={p.raio} />
            <Path d="M104 22 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill={p.raio} />
            <Path d="M100 96 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill={p.raio} />
          </Svg>
        </Animated.View>
      ) : (
        <Animated.View style={[camada, estiloRaios]}>
          <Svg width={tamanho} height={tamanho} viewBox="0 0 120 120">
            <G stroke={p.raio} strokeWidth={6} strokeLinecap="round">
              {RAIOS.map(([x1, y1, x2, y2], i) => <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
            </G>
          </Svg>
        </Animated.View>
      )}

      <View style={camada}>
        <Svg width={tamanho} height={tamanho} viewBox="0 0 120 120">
          {lua ? (
            <>
              <Circle cx={60} cy={60} r={38} fill={p.nucleo} />
              <Circle cx={77} cy={44} r={6} fill={abertura.cratera} />
              <Circle cx={82} cy={72} r={4} fill={abertura.cratera} />
              <Circle cx={38} cy={40} r={3.4} fill={abertura.cratera} />
              <Circle cx={44} cy={70} r={4.6} fill={p.bochecha} opacity={0.5} />
              <Ellipse cx={50} cy={56} rx={3.4} ry={4.4} fill={corRosto} />
              <Path d="M51 67 q8 7 16 0" stroke={corRosto} strokeWidth={3.4} fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <Circle cx={60} cy={60} r={36} fill={p.nucleo} />
              <Circle cx={43} cy={68} r={5} fill={p.bochecha} opacity={0.55} />
              <Circle cx={77} cy={68} r={5} fill={p.bochecha} opacity={0.55} />
              <Ellipse cx={48} cy={56} rx={3.6} ry={4.6} fill={corRosto} />
              <Path d="M49 68 q11 9 22 0" stroke={corRosto} strokeWidth={3.6} fill="none" strokeLinecap="round" />
            </>
          )}
        </Svg>
      </View>

      {/* olho direito em camada própria: é ele que pisca */}
      <Animated.View style={[camada, { transformOrigin: `${(xOlhoDir / 120) * 100}% ${(56 / 120) * 100}%` }, estiloOlho]}>
        <Svg width={tamanho} height={tamanho} viewBox="0 0 120 120">
          <Ellipse cx={xOlhoDir} cy={56} rx={lua ? 3.4 : 3.6} ry={lua ? 4.4 : 4.6} fill={corRosto} />
        </Svg>
      </Animated.View>
    </View>
  );
}
