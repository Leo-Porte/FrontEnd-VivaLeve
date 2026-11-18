import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Polyline, Rect } from 'react-native-svg';

import { menu } from '@/theme';
import { useReduceMotion } from '../motion';

type EstiloAnimado = React.ComponentProps<typeof Animated.View>['style'];

/**
 * Ícones do menu orbital. Cada um tem uma animação própria que roda enquanto o item está apontado:
 * fumaça na chaminé, carinha piscando, páginas folheando, gráfico se desenhando, vento soprando,
 * balões subindo, engrenagem rodando e seta saindo pela porta.
 *
 * Tudo em viewBox 32×32. As partes que se mexem ficam em camadas (Animated.View por cima do SVG base),
 * o que funciona igual no iOS, Android e web; só o traço tracejado usa props animadas do SVG.
 */

export type IconeOrbitalId = 'inicio' | 'humor' | 'diario' | 'historico' | 'respirar' | 'conversar' | 'config' | 'sair';

export interface IconeOrbitalProps {
  id: IconeOrbitalId;
  /** lado do ícone em px */
  size: number;
  /** cor do traço */
  color: string;
  /** cor de destaque do item (páginas do diário) */
  destaque: string;
  /** item apontado: liga a animação */
  ativo: boolean;
}

export function IconeOrbital(props: IconeOrbitalProps) {
  const C = COMPONENTES[props.id];
  return (
    <View style={{ width: props.size, height: props.size }} pointerEvents="none">
      <C {...props} />
    </View>
  );
}

// ------------------------------------------------------------ base

/** Componentes SVG animados criados sob demanda (testes com Reanimated simplificado não quebram no import). */
let animados: { Path: React.ComponentType<any>; Polyline: React.ComponentType<any> } | null = null;
function svgAnimado() {
  if (!animados) {
    animados = {
      Path: Animated.createAnimatedComponent(Path) as React.ComponentType<any>,
      Polyline: Animated.createAnimatedComponent(Polyline) as React.ComponentType<any>,
    };
  }
  return animados;
}

/** Relógio 0→1 em loop enquanto `ativo`; volta a 0 quando sai. Parado se o usuário pediu menos movimento. */
function useCiclo(ativo: boolean, duracao: number): SharedValue<number> {
  const t = useSharedValue(0);
  const reduce = useReduceMotion();
  useEffect(() => {
    cancelAnimation(t);
    t.value = 0;
    if (ativo && !reduce) {
      t.value = withRepeat(withTiming(1, { duration: duracao, easing: Easing.linear }), -1, false);
    }
    return () => cancelAnimation(t);
  }, [ativo, reduce, duracao, t]);
  return t;
}

interface CamadaProps {
  size: number;
  color: string;
  style?: EstiloAnimado;
  children: React.ReactNode;
}

/** Uma folha de SVG do tamanho do ícone, empilhada sobre as outras. */
function Camada({ size, color, style, children }: CamadaProps) {
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <G fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {children}
        </G>
      </Svg>
    </Animated.View>
  );
}

/** Bolinha sólida posicionada em coordenadas do viewBox. */
function Ponto({ size, cx, cy, r, color, style }: { size: number; cx: number; cy: number; r: number; color: string; style?: EstiloAnimado }) {
  const k = size / 32;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: (cx - r) * k, top: (cy - r) * k, width: 2 * r * k, height: 2 * r * k, borderRadius: r * k, backgroundColor: color },
        style,
      ]}
    />
  );
}

// ------------------------------------------------------------ Início: fumaça e luz na porta

function useFumaca(t: SharedValue<number>, fase: number, ativo: boolean, k: number) {
  return useAnimatedStyle(() => {
    const f = (t.value + fase) % 1;
    return {
      opacity: ativo ? interpolate(f, [0, 0.3, 1], [0, 0.85, 0]) : 0,
      transform: [
        { translateX: interpolate(f, [0, 1], [0, 3 * k]) },
        { translateY: interpolate(f, [0, 1], [4 * k, -7 * k]) },
        { scale: interpolate(f, [0, 1], [0.6, 1.7]) },
      ],
    };
  });
}

function Inicio({ size, color, ativo }: IconeOrbitalProps) {
  const k = size / 32;
  const t = useCiclo(ativo, 1600);
  const f1 = useFumaca(t, 0, ativo, k);
  const f2 = useFumaca(t, 0.5, ativo, k);
  const luz = useAnimatedStyle(() => ({ opacity: withTiming(ativo ? 1 : 0, { duration: 300 }) }));

  return (
    <>
      <Camada size={size} color={color} style={luz}>
        <Rect x={13.5} y={18} width={5} height={8} rx={1} fill={menu.luz} stroke="none" />
      </Camada>
      <Camada size={size} color={color}>
        <Path d="M21 10V6.5h3V13" />
        <Path d="M5 15 16 6l11 9" />
        <Path d="M8 13v13h16V13" />
        <Rect x={13.5} y={18} width={5} height={8} rx={1} />
      </Camada>
      <Ponto size={size} cx={22.5} cy={4} r={1.6} color={color} style={f1} />
      <Ponto size={size} cx={22.5} cy={4} r={1.3} color={color} style={f2} />
    </>
  );
}

// ------------------------------------------------------------ Humor: balança, pisca e sorri

function Humor({ size, color, ativo }: IconeOrbitalProps) {
  const t = useCiclo(ativo, 1400);
  const rosto = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(t.value, [0, 0.25, 0.75, 1], [0, -10, 10, 0])}deg` }],
  }));
  const olhos = useAnimatedStyle(() => ({
    transform: [{ scaleY: interpolate(t.value, [0, 0.4, 0.46, 0.52, 1], [1, 1, 0.1, 1, 1]) }],
  }));
  const boca = useAnimatedStyle(() => ({
    transform: [{ scaleX: withTiming(ativo ? 1.2 : 1, { duration: 300 }) }, { scaleY: withTiming(ativo ? 1.35 : 1, { duration: 300 }) }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size, transformOrigin: '50% 50%' }, rosto]}>
      <Camada size={size} color={color}>
        <Circle cx={16} cy={16} r={11} />
      </Camada>
      <Camada size={size} color={color} style={[{ transformOrigin: '50% 43%' }, olhos]}>
        <Line x1={12} y1={13} x2={12} y2={14.5} />
        <Line x1={20} y1={13} x2={20} y2={14.5} />
      </Camada>
      <Camada size={size} color={color} style={[{ transformOrigin: '50% 62%' }, boca]}>
        <Path d="M11 19c1.5 2.3 3.2 3.2 5 3.2s3.5-.9 5-3.2" />
      </Camada>
    </Animated.View>
  );
}

// ------------------------------------------------------------ Diário: páginas folheando

const PAGINA = 'M16 9c2.6-1.6 5.6-2 9-1.8v15.5c-3.4-.2-6.4.2-9 1.8';

function usePagina(t: SharedValue<number>, atraso: number, ativo: boolean) {
  return useAnimatedStyle(() => {
    const f = (t.value - atraso + 1) % 1;
    return {
      opacity: ativo ? interpolate(f, [0, 0.08, 0.65, 0.8, 1], [0, 1, 1, 0, 0]) : 0,
      transform: [{ scaleX: interpolate(f, [0, 0.35, 0.65, 1], [1, 0.15, -1, -1]) }],
    };
  });
}

function Diario({ size, color, destaque, ativo }: IconeOrbitalProps) {
  const t = useCiclo(ativo, 1500);
  const p1 = usePagina(t, 0, ativo);
  const p2 = usePagina(t, 0.17, ativo);
  const p3 = usePagina(t, 0.34, ativo);

  return (
    <>
      <Camada size={size} color={color}>
        <Path d="M16 9c-3-2-7-2.5-11-2v17c4-.5 8 0 11 2" />
        <Path d="M16 9c3-2 7-2.5 11-2v17c-4-.5-8 0-11 2" />
        <Line x1={16} y1={9} x2={16} y2={26} />
      </Camada>
      {[p1, p2, p3].map((estilo, i) => (
        <Camada key={i} size={size} color={color} style={[{ transformOrigin: '50% 50%' }, estilo]}>
          <Path d={PAGINA} fill={destaque} />
        </Camada>
      ))}
    </>
  );
}

// ------------------------------------------------------------ Histórico: a linha se desenha

const LINHA_PONTOS = '8,22 13,15 17,18 22,10 26,12';
const LINHA_COMPRIMENTO = 27.6;

function Historico({ size, color, ativo }: IconeOrbitalProps) {
  const { Polyline: APolyline } = svgAnimado();
  const t = useCiclo(ativo, 1800);
  const linha = useAnimatedProps(() => ({
    strokeDashoffset: ativo ? interpolate(t.value, [0, 0.55, 1], [LINHA_COMPRIMENTO, 0, 0]) : 0,
  }));
  const ponto = useAnimatedStyle(() => ({
    transform: [{ scale: ativo ? interpolate(t.value, [0, 0.5, 0.65, 0.8, 1], [0, 0, 1.6, 1, 1]) : 1 }],
  }));

  return (
    <>
      <Camada size={size} color={color}>
        <Path d="M5 5v22h22" />
        <APolyline points={LINHA_PONTOS} strokeDasharray={[LINHA_COMPRIMENTO, LINHA_COMPRIMENTO]} animatedProps={linha} />
      </Camada>
      <Ponto size={size} cx={26} cy={12} r={1.8} color={color} style={ponto} />
    </>
  );
}

// ------------------------------------------------------------ Respirar: o vento soprando

const VENTOS = [
  { d: 'M3 11h15a3.5 3.5 0 1 0-3.5-3.5', comprimento: 31.5, voltas: 2 },
  { d: 'M3 17h21a3.5 3.5 0 1 1-3.5 3.5', comprimento: 37.5, voltas: 2 },
  { d: 'M3 23h9', comprimento: 9, voltas: 3 },
] as const;

function LinhaDeVento({ d, comprimento, voltas, t, ativo }: (typeof VENTOS)[number] & { t: SharedValue<number>; ativo: boolean }) {
  const { Path: APath } = svgAnimado();
  const props = useAnimatedProps(() => ({ strokeDashoffset: ativo ? -comprimento * ((t.value * voltas) % 1) : 0 }));
  return <APath d={d} strokeDasharray={ativo ? [comprimento * 0.62, comprimento * 0.38] : undefined} animatedProps={props} />;
}

function Respirar({ size, color, ativo }: IconeOrbitalProps) {
  const k = size / 32;
  const t = useCiclo(ativo, 2600);
  const sopro = useAnimatedStyle(() => ({
    transform: [{ translateX: ativo ? Math.sin(t.value * Math.PI * 4) * 1.5 * k : 0 }],
  }));

  return (
    <Camada size={size} color={color} style={sopro}>
      {VENTOS.map((v) => (
        <LinhaDeVento key={v.d} {...v} t={t} ativo={ativo} />
      ))}
    </Camada>
  );
}

// ------------------------------------------------------------ Conversar: balões subindo dos dois lados

function useBolha(t: SharedValue<number>, fase: number, ativo: boolean, k: number) {
  return useAnimatedStyle(() => {
    const f = (t.value + fase) % 1;
    return {
      opacity: ativo ? interpolate(f, [0, 0.25, 1], [0, 0.9, 0]) : 0,
      transform: [{ translateY: interpolate(f, [0, 1], [0, -18 * k]) }, { scale: interpolate(f, [0, 1], [0.6, 1.4]) }],
    };
  });
}

function useBoiar(t: SharedValue<number>, fase: number, ativo: boolean, k: number) {
  return useAnimatedStyle(() => ({
    transform: [{ translateY: ativo ? -Math.sin(((t.value + fase) % 1) * Math.PI) * 2.5 * k : 0 }],
  }));
}

function Conversar({ size, color, ativo }: IconeOrbitalProps) {
  const k = size / 32;
  const t = useCiclo(ativo, 1400);
  const bEsq = useBolha(t, 0, ativo, k);
  const bDir = useBolha(t, 0.5, ativo, k);
  const balaoEsq = useBoiar(t, 0, ativo, k);
  const balaoDir = useBoiar(t, 0.5, ativo, k);

  return (
    <>
      <Ponto size={size} cx={6} cy={27} r={1.9} color={color} style={bEsq} />
      <Ponto size={size} cx={26} cy={27} r={1.9} color={color} style={bDir} />
      <Camada size={size} color={color} style={balaoEsq}>
        <Path d="M5 7h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-8l-4 3v-3H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
      </Camada>
      <Camada size={size} color={color} style={balaoDir}>
        <Path d="M22 12h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v3l-4-3h-6a2 2 0 0 1-2-2v-1" />
      </Camada>
    </>
  );
}

// ------------------------------------------------------------ Configurações: engrenagem rodando

function Config({ size, color, ativo }: IconeOrbitalProps) {
  const t = useCiclo(ativo, 2400);
  const giro = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.value * 360}deg` }] }));
  return (
    <Camada size={size} color={color} style={[{ transformOrigin: '50% 50%' }, giro]}>
      <Circle cx={16} cy={16} r={11} strokeWidth={3.2} strokeLinecap="butt" strokeDasharray={[4.32, 4.32]} />
      <Circle cx={16} cy={16} r={8} />
      <Circle cx={16} cy={16} r={3} />
    </Camada>
  );
}

// ------------------------------------------------------------ Sair: seta saindo pela porta

function Sair({ size, color, ativo }: IconeOrbitalProps) {
  const k = size / 32;
  const t = useCiclo(ativo, 900);
  const seta = useAnimatedStyle(() => ({
    transform: [{ translateX: ativo ? interpolate(t.value, [0, 0.5, 1], [0, 4 * k, 0]) : 0 }],
  }));
  return (
    <>
      <Camada size={size} color={color}>
        <Path d="M14 5H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h7" />
      </Camada>
      <Camada size={size} color={color} style={seta}>
        <Line x1={13} y1={16} x2={27} y2={16} />
        <Polyline points="22,11 27,16 22,21" />
      </Camada>
    </>
  );
}

const COMPONENTES: Record<IconeOrbitalId, (p: IconeOrbitalProps) => React.ReactElement> = {
  inicio: Inicio,
  humor: Humor,
  diario: Diario,
  historico: Historico,
  respirar: Respirar,
  conversar: Conversar,
  config: Config,
  sair: Sair,
};
