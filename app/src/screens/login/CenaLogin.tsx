import React, { useEffect, useMemo, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useReduceMotion } from '@/components/ui';
import { SurfaceProvider, cenaLogin, useTheme } from '@/theme';

/**
 * Cena do login: fundo sálvia, folhas caindo com o vento e duas colinas no canto inferior esquerdo.
 * As folhas passam por trás das colinas; o que vier em `children` fica na frente de tudo.
 * Com "reduzir movimento" as folhas ficam paradas, espalhadas.
 */

const BORDO =
  'M50 4 L57 22 L68 16 L64 40 L78 28 L82 36 L96 33 L90 50 L96 54 L74 72 L77 81 L54 77 L52 96 L48 96 L46 77 L23 81 L26 72 L4 54 L10 50 L4 33 L18 36 L22 28 L36 40 L32 16 L43 22 Z';
const OVAL = 'M50 4 C80 24 88 60 52 94 C14 62 20 24 50 4 Z';
const NERVURA = 'M50 12 C52 40 52 66 51 92';

interface DadosFolha {
  bordo: boolean;
  cor: string;
  /** posição horizontal inicial, em % da largura */
  left: number;
  size: number;
  /** deriva horizontal total, em px */
  dx: number;
  /** ms para atravessar a cena */
  dur: number;
  /** ponto do ciclo em que a folha começa (0–1), para a cena já abrir cheia */
  fase: number;
  /** ms de meia volta do giro */
  giro: number;
}

/** Folhas determinísticas (mesma semente, mesma cena). */
function gerarFolhas(qtd: number, tamanho: 'grande' | 'compacta'): DadosFolha[] {
  let seed = tamanho === 'grande' ? 7 : 11;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const grande = tamanho === 'grande';
  return Array.from({ length: qtd }, (_, i) => {
    const bordo = i % 2 === 0;
    const dur = (grande ? 10 + rnd() * 9 : 10 + rnd() * 8) * 1000;
    return {
      bordo,
      cor: cenaLogin.folhas[i % cenaLogin.folhas.length],
      size: Math.round(grande ? 20 + rnd() * 26 : 16 + rnd() * 20),
      left: rnd() * 100 - (grande ? 15 : 25),
      dx: Math.round(grande ? 160 + rnd() * 320 : 120 + rnd() * 200),
      dur,
      fase: rnd(),
      giro: (2.4 + rnd() * 2.8) * 1000,
    };
  });
}

function Folha({ f, queda, parada }: { f: DadosFolha; queda: number; parada: boolean }) {
  const p = useSharedValue(f.fase);
  const g = useSharedValue(f.fase);

  useEffect(() => {
    if (parada) return;
    p.value = withSequence(
      withTiming(1, { duration: f.dur * (1 - f.fase), easing: Easing.linear }),
      withRepeat(
        withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: f.dur, easing: Easing.linear })),
        -1,
        false,
      ),
    );
    g.value = withRepeat(withTiming(1, { duration: f.giro, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(p);
      cancelAnimation(g);
    };
  }, [parada, f, p, g]);

  const estilo = useAnimatedStyle(() => ({
    opacity: parada ? 1 : interpolate(p.value, [0, 0.06, 0.92, 1], [0, 1, 1, 0]),
    transform: [
      {
        translateX: interpolate(p.value, [0, 0.35, 0.65, 1], [0, f.dx * 0.3 + 24, f.dx * 0.65 - 18, f.dx]),
      },
      { translateY: p.value * queda },
      { rotate: `${interpolate(g.value, [0, 1], [-25, 190])}deg` },
      // achatamento no lugar de rotateX: o giro 3D quebrava a ordem de pintura no navegador (folha por cima do texto)
      { scaleY: interpolate(g.value, [0, 0.5, 1], [1, 0.45, 0.95]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: -60,
          left: `${f.left}%`,
          width: f.size,
          height: f.size,
        },
        estilo,
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        {f.bordo ? (
          <Path d={BORDO} fill={f.cor} />
        ) : (
          <>
            <Path d={OVAL} fill={f.cor} />
            <Path d={NERVURA} fill="none" stroke={cenaLogin.nervura} strokeWidth={3} strokeLinecap="round" />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}

interface Colina {
  left: number;
  bottom: number;
  size: number;
}
const COLINAS: Record<'grande' | 'compacta', { clara: Colina; escura: Colina }> = {
  grande: {
    clara: { left: 140, bottom: -560, size: 860 },
    escura: { left: -280, bottom: -520, size: 780 },
  },
  compacta: {
    clara: { left: 150, bottom: -260, size: 640 },
    escura: { left: -200, bottom: -520, size: 800 },
  },
};

export interface CenaLoginProps {
  /** `grande`: painel do computador; `compacta`: tela cheia do celular */
  tamanho: 'grande' | 'compacta';
  folhas?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CenaLogin({ tamanho, folhas, children, style }: CenaLoginProps) {
  const { scheme } = useTheme();
  const reduce = useReduceMotion();
  const [altura, setAltura] = useState(0);
  const lista = useMemo(() => gerarFolhas(folhas ?? (tamanho === 'grande' ? 18 : 14), tamanho), [folhas, tamanho]);
  const colinas = COLINAS[tamanho];
  const circulo = (c: Colina, cor: string) => ({
    position: 'absolute' as const,
    left: c.left,
    bottom: c.bottom,
    width: c.size,
    height: c.size,
    borderRadius: c.size / 2,
    backgroundColor: cor,
  });

  return (
    <View
      style={[{ overflow: 'hidden', backgroundColor: cenaLogin.fundo[scheme] }, style]}
      onLayout={(e) => setAltura(e.nativeEvent.layout.height)}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {altura > 0 ? lista.map((f, i) => <Folha key={i} f={f} queda={altura + 120} parada={reduce} />) : null}
        <View style={circulo(colinas.clara, cenaLogin.colinaClara[scheme])} />
        <View style={circulo(colinas.escura, cenaLogin.colinaEscura[scheme])} />
      </View>
      {/* conteúdo acima das folhas (folha animada cria camada própria e passaria por cima do texto) */}
      <SurfaceProvider value={cenaLogin.fundo[scheme]}>
        <View style={{ flex: 1, zIndex: 1 }}>{children}</View>
      </SurfaceProvider>
    </View>
  );
}
