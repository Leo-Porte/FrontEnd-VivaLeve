import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { mascote } from '@/theme';

const COR = mascote;

export type ModoPanda = 'idle' | 'rodando' | 'concluido';

interface Props {
  modo: ModoPanda;
  /** segundos de inspirar, segurar e expirar (o ciclo do exercício) */
  tempos: { inspira: number; segura: number; expira: number };
  size: number;
  /** disco atrás do panda; omita quando o fundo da tela já dá contraste */
  fundo?: string;
  /**
   * Só no modo 'rodando'. false = não respira: fica na pose de repouso (antes de começar)
   * ou volta suavemente para ela (ao parar), em vez de congelar no meio do fôlego.
   */
  ativo?: boolean;
}

const VB = 200; // viewBox quadrado de todas as camadas
const LOOP_IDLE = 5; // s: respiração de repouso
const LOOP_FESTA = 1.6; // s: pulinho de comemoração

// ---------------------------------------------------------------- curvas (worklets)

function clamp01(x: number) {
  'worklet';
  return Math.min(1, Math.max(0, x));
}
/** entrada e saída suaves (seno) */
function suave(x: number) {
  'worklet';
  return 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
}
/** sobe de 0 a 1 entre `ini` e `ini + dur` */
function rampa(s: number, ini: number, dur: number) {
  'worklet';
  return suave((s - ini) / dur);
}
/** corcova 0→1→0 dentro de [ini, fim], zero fora (sem quina nas bordas) */
function corcova(s: number, ini: number, fim: number) {
  'worklet';
  if (s <= ini || s >= fim) return 0;
  return Math.sin((Math.PI * (s - ini)) / (fim - ini));
}

interface Quadro {
  respiro: number; // 0 vazio … 1 cheio
  flutua: number; // micro-movimento enquanto segura
  balanco: number; // -1..1: vaivém lento que nunca para (o panda não "congela" entre as fases)
  braco: number; // graus
  olhoAberto: number;
  olhoFechado: number;
  olhoFeliz: number;
  bochechaCheia: number;
  bocaSorriso: number;
  bocaW: number;
  bocaReta: number;
  bocaO: number;
  bocaFeliz: number;
}

/**
 * Tudo sai de um único relógio em loop (t: 0..1). Cada parte é uma curva contínua do tempo,
 * então a virada do ciclo (expira → inspira) e as trocas de expressão viram crossfade, nunca corte.
 */
function quadro(modo: ModoPanda, t: number, a: number, h: number, e: number): Quadro {
  'worklet';
  const zero = { balanco: 0, olhoFeliz: 0, bocaSorriso: 0, bocaW: 0, bocaReta: 0, bocaO: 0, bocaFeliz: 0, bochechaCheia: 0, flutua: 0 };

  if (modo === 'concluido') {
    const s = t * LOOP_FESTA;
    const pulo = corcova(s, 0, LOOP_FESTA);
    return { ...zero, respiro: 0.35 + 0.15 * pulo, braco: 58 + 8 * pulo, olhoAberto: 0, olhoFechado: 0, olhoFeliz: 1, bocaFeliz: 1 };
  }

  if (modo === 'idle') {
    const s = t * LOOP_IDLE;
    const respiro = 0.3 * (0.5 - 0.5 * Math.cos((2 * Math.PI * s) / LOOP_IDLE));
    const piscada = corcova(s, LOOP_IDLE - 0.5, LOOP_IDLE - 0.28); // piscadinha no fim do loop
    const balanco = Math.sin((2 * Math.PI * s) / LOOP_IDLE);
    return { ...zero, respiro, balanco, braco: -18 + 12 * respiro, olhoAberto: 1 - piscada, olhoFechado: piscada, bocaSorriso: 1 };
  }

  // rodando: [0,a) inspira · [a,a+h) segura · [a+h,T) expira
  const T = a + h + e;
  const s = t * T;
  let respiro = 1;
  if (s < a) respiro = suave(s / a);
  else if (s >= a + h) respiro = 1 - suave((s - a - h) / e);

  const flutua = corcova(s, a, a + h);
  // olhos fecham ao segurar e reabrem perto do fim da expiração
  const olhoFechado = clamp01(rampa(s, a, 0.6) - rampa(s, T - 0.7, 0.7));
  const bochechaCheia = clamp01(rampa(s, a, 0.7) - rampa(s, a + h, 0.7));
  const bocaO = clamp01(rampa(s, a + h - 0.25, 0.5) - rampa(s, T - 0.6, 0.6));
  const bocaReta = clamp01(rampa(s, a, 0.5) - rampa(s, a + h - 0.25, 0.5));
  const bocaW = clamp01(1 - bocaReta - bocaO);

  // período = metade do ciclo: fecha exatamente na virada, então o loop emenda sem costura
  const balanco = Math.sin((4 * Math.PI * s) / T);

  return {
    ...zero,
    respiro,
    flutua,
    balanco,
    braco: -18 + 40 * respiro,
    olhoAberto: 1 - olhoFechado,
    olhoFechado,
    bochechaCheia,
    bocaW,
    bocaReta,
    bocaO,
  };
}

// ---------------------------------------------------------------- componente

/**
 * Panda que respira junto com o usuário, em loop contínuo.
 * Inspira: peito enche, cabeça sobe, braços abrem. Segura: olhos fecham, bochechas enchem, flutua.
 * Expira: boca em "o" soltando ar, tudo volta. Camadas separadas para animar sem worklet dentro do SVG.
 */
export function PandaRespiracao({ modo, tempos, size, fundo, ativo = true }: Props) {
  const { inspira: a, segura: h, expira: e } = tempos;
  const t = useSharedValue(0);
  const tocando = modo !== 'rodando' || ativo;

  // um relógio só, linear e infinito; o formato do movimento mora nas curvas
  useEffect(() => {
    cancelAnimation(t);
    if (!tocando) {
      // volta ao repouso pelo caminho mais curto: t=0 e t=1 são a mesma pose (pulmão vazio, olhos abertos)
      const alvo = t.value < 0.5 ? 0 : 1;
      t.value = withTiming(alvo, { duration: 700, easing: Easing.inOut(Easing.sin) });
      return;
    }
    const loop = modo === 'rodando' ? a + h + e : modo === 'idle' ? LOOP_IDLE : LOOP_FESTA;
    t.value = 0; // parado ele sempre está em 0 ou 1, que são a mesma pose
    t.value = withRepeat(withTiming(1, { duration: loop * 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [modo, tocando, a, h, e, t]);

  const q = useDerivedValue(() => quadro(modo, t.value, a, h, e));

  const estiloCorpo = useAnimatedStyle(() => {
    const k = 1 + 0.1 * q.value.respiro + 0.015 * q.value.flutua;
    return { transform: [{ scaleX: 1 + (k - 1) * 0.6 }, { scaleY: k }] };
  });
  const estiloCabeca = useAnimatedStyle(() => ({
    transform: [
      { translateX: (1.5 * q.value.balanco * size) / VB },
      { translateY: ((-7 * q.value.respiro - 2.5 * q.value.flutua) * size) / VB },
      { rotate: `${1.6 * q.value.balanco}deg` },
    ],
  }));
  const estiloBracoE = useAnimatedStyle(() => ({ transform: [{ rotate: `${q.value.braco}deg` }] }));
  const estiloBracoD = useAnimatedStyle(() => ({ transform: [{ rotate: `${-q.value.braco}deg` }] }));
  const estiloSombra = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 + 0.08 * q.value.respiro }] }));

  const camada = { position: 'absolute' as const, width: size, height: size };
  const svg = (children: React.ReactNode) => (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} style={{ position: 'absolute', left: 0, top: 0 }}>
      {children}
    </Svg>
  );

  return (
    <View style={{ width: size, height: size }} testID="respirar-orb" accessibilityRole="image" accessibilityLabel={ROTULO[modo]}>
      {fundo ? (
        <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} style={{ position: 'absolute' }}>
          <Circle cx={100} cy={104} r={92} fill={fundo} />
        </Svg>
      ) : null}
      <Animated.View style={[camada, estiloSombra]}>
        {svg(<Ellipse cx={100} cy={188} rx={54} ry={7} fill={COR.sombraChao} />)}
      </Animated.View>

      {/* corpo + pernas: escala a partir do chão */}
      <Animated.View style={[camada, { transformOrigin: '50% 94%' }, estiloCorpo]}>
        {svg(
          <G>
            <Ellipse cx={100} cy={146} rx={47} ry={40} fill={COR.branco} />
            <Ellipse cx={104} cy={152} rx={40} ry={33} fill={COR.sombraBranco} />
            <Ellipse cx={98} cy={146} rx={38} ry={33} fill={COR.branco} />
            <Ellipse cx={66} cy={178} rx={24} ry={14} fill={COR.preto} />
            <Ellipse cx={134} cy={178} rx={24} ry={14} fill={COR.preto} />
            <Ellipse cx={62} cy={179} rx={10} ry={7} fill={COR.cinza} />
            <Ellipse cx={138} cy={179} rx={10} ry={7} fill={COR.cinza} />
          </G>,
        )}
      </Animated.View>

      {/* braços giram no ombro: patas na barriga em repouso, abrem ao inspirar */}
      <Animated.View style={[camada, { transformOrigin: '32% 60%' }, estiloBracoE]}>
        {svg(<Path d="M54 120 Q64 112 74 120 L76 154 Q66 168 56 156 Z" fill={COR.preto} />)}
      </Animated.View>
      <Animated.View style={[camada, { transformOrigin: '68% 60%' }, estiloBracoD]}>
        {svg(<Path d="M146 120 Q136 112 126 120 L124 154 Q134 168 144 156 Z" fill={COR.preto} />)}
      </Animated.View>

      {/* cabeça: base fixa + expressões em camadas que se cruzam por opacidade */}
      <Animated.View style={[camada, { transformOrigin: '50% 62%' }, estiloCabeca]}>
        {svg(<CabecaBase />)}
        <Expressao q={q} k="bochechaCheia" inverso size={size}>{svg(<Bochechas cheia={false} />)}</Expressao>
        <Expressao q={q} k="bochechaCheia" size={size}>{svg(<Bochechas cheia />)}</Expressao>
        {svg(<Focinho />)}
        <Expressao q={q} k="olhoAberto" size={size}>{svg(<OlhosAbertos />)}</Expressao>
        <Expressao q={q} k="olhoFechado" size={size}>{svg(<OlhosFechados />)}</Expressao>
        <Expressao q={q} k="olhoFeliz" size={size}>{svg(<OlhosFelizes />)}</Expressao>
        <Expressao q={q} k="bocaSorriso" size={size}>{svg(<Path d="M90 108 Q95 114 100 108 Q105 114 110 108" {...TRACO_BOCA} />)}</Expressao>
        <Expressao q={q} k="bocaW" size={size}>{svg(<Path d="M93 109 Q96.5 113 100 109 Q103.5 113 107 109" {...TRACO_BOCA} />)}</Expressao>
        <Expressao q={q} k="bocaReta" size={size}>{svg(<Path d="M95 112 Q100 114 105 112" {...TRACO_BOCA} />)}</Expressao>
        <Expressao q={q} k="bocaO" size={size}>
          {svg(
            <G>
              <Ellipse cx={100} cy={115} rx={6.5} ry={7.5} fill={COR.preto} />
              <Ellipse cx={100} cy={118} rx={3.5} ry={3} fill={COR.lingua} />
            </G>,
          )}
        </Expressao>
        <Expressao q={q} k="bocaFeliz" size={size}>
          {svg(
            <G>
              <Path d="M86 107 Q100 128 114 107 Z" fill={COR.preto} />
              <Path d="M93 116 Q100 122 107 116 Q100 112 93 116 Z" fill={COR.lingua} />
            </G>,
          )}
        </Expressao>
        {modo === 'rodando' ? (
          <Expressao q={q} k="bocaO" size={size}>
            <Sopro size={size} />
          </Expressao>
        ) : null}
      </Animated.View>
    </View>
  );
}

const ROTULO: Record<ModoPanda, string> = {
  idle: 'Panda esperando para respirar com você',
  rodando: 'Panda respirando junto com você',
  concluido: 'Panda comemorando',
};

const TRACO_BOCA = { stroke: COR.preto, strokeWidth: 3.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
const TRACO_OLHO = { stroke: COR.branco, strokeWidth: 4, strokeLinecap: 'round' as const, fill: 'none' };

type ChaveOpacidade = 'olhoAberto' | 'olhoFechado' | 'olhoFeliz' | 'bochechaCheia' | 'bocaSorriso' | 'bocaW' | 'bocaReta' | 'bocaO' | 'bocaFeliz';

/** Camada cuja opacidade segue uma das curvas do quadro. */
function Expressao({ q, k, inverso, size, children }: { q: SharedValue<Quadro>; k: ChaveOpacidade; inverso?: boolean; size: number; children: React.ReactNode }) {
  const estilo = useAnimatedStyle(() => ({ opacity: inverso ? 1 - q.value[k] : q.value[k] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, estilo]}>
      {children}
    </Animated.View>
  );
}

function CabecaBase() {
  return (
    <G>
      <Circle cx={50} cy={36} r={19} fill={COR.preto} />
      <Circle cx={150} cy={36} r={19} fill={COR.preto} />
      <Circle cx={52} cy={38} r={9} fill={COR.cinza} />
      <Circle cx={148} cy={38} r={9} fill={COR.cinza} />
      <Ellipse cx={100} cy={76} rx={63} ry={53} fill={COR.sombraBranco} />
      <Ellipse cx={97} cy={72} rx={60} ry={49} fill={COR.branco} />
      {/* manchas dos olhos, caídas para fora */}
      <Ellipse cx={70} cy={80} rx={18} ry={24} fill={COR.preto} transform="rotate(32 70 80)" />
      <Ellipse cx={130} cy={80} rx={18} ry={24} fill={COR.preto} transform="rotate(-32 130 80)" />
    </G>
  );
}

function Bochechas({ cheia }: { cheia: boolean }) {
  const rx = cheia ? 13 : 9;
  const ry = cheia ? 10 : 6;
  return (
    <G>
      <Ellipse cx={58} cy={104} rx={rx} ry={ry} fill={COR.bochecha} opacity={0.85} />
      <Ellipse cx={142} cy={104} rx={rx} ry={ry} fill={COR.bochecha} opacity={0.85} />
    </G>
  );
}

function Focinho() {
  return (
    <G>
      <Path d="M91 96 Q100 91 109 96 Q105 104 100 104 Q95 104 91 96 Z" fill={COR.preto} />
      <Ellipse cx={97} cy={95.5} rx={2.5} ry={1.4} fill={COR.cinza} />
    </G>
  );
}

function OlhosAbertos() {
  return (
    <G>
      {[72, 128].map((cx) => (
        <G key={cx}>
          <Circle cx={cx} cy={80} r={12} fill={COR.branco} />
          <Circle cx={cx + (cx < 100 ? 1.5 : -1.5)} cy={80} r={7} fill={COR.preto} />
          <Circle cx={cx + (cx < 100 ? -0.5 : -3.5)} cy={76.5} r={2.4} fill={COR.branco} />
        </G>
      ))}
    </G>
  );
}

/** fechados e calmos (curva para baixo) */
function OlhosFechados() {
  return (
    <G>
      <Path d="M61 82 Q71 89 81 82" {...TRACO_OLHO} />
      <Path d="M119 82 Q129 89 139 82" {...TRACO_OLHO} />
    </G>
  );
}

/** fechados de alegria (^ ^) */
function OlhosFelizes() {
  return (
    <G>
      <Path d="M61 86 Q71 74 81 86" {...TRACO_OLHO} />
      <Path d="M119 86 Q129 74 139 86" {...TRACO_OLHO} />
    </G>
  );
}

/** Nuvenzinhas de ar saindo da boca; visíveis só enquanto a boca está em "o". */
function Sopro({ size }: { size: number }) {
  const k = size / VB;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Bolha key={i} atraso={i * 550} x={108 * k} y={116 * k} r={(7 - i * 1.5) * k} distancia={70 * k} />
      ))}
    </>
  );
}

function Bolha({ atraso, x, y, r, distancia }: { atraso: number; x: number; y: number; r: number; distancia: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(atraso, withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }), -1));
    return () => cancelAnimation(t);
  }, [atraso, t]);
  const estilo = useAnimatedStyle(() => ({
    opacity: t.value < 0.15 ? t.value / 0.15 : 1 - t.value,
    transform: [{ translateX: t.value * distancia }, { translateY: t.value * distancia * 0.25 }, { scale: 0.6 + t.value * 0.8 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: x, top: y - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: COR.ar }, estilo]}
    />
  );
}
