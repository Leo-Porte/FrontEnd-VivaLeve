import { BlurView } from 'expo-blur';
// slop:ok gradiente o fim do texto do post-it se dissolve no papel (docs/VISUAL.md, Diário)
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Icon, iconeDe, useReduceMotion } from '@/components/ui';
import type { DiaryEntry } from '@/models';
import { diario, emotionColors, getEmotion, useTheme } from '@/theme';

import { comprimento, dataCurtaComHora, hora, posicoes, trecho } from './regras';
import { Escrita } from './papel';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const timing = (duration: number, delay = 0) => ({ type: 'timing', duration, delay }) as never;

/** Intervalo entre um post-it e o seguinte na cascata, e quantos entram em cascata por rodada. */
const PASSO_MS = 110;
const MAX_CASCATA = 24;

export interface Rodada {
  /** muda a cada navegação: replays da cascata */
  chave: number;
  /** índice a partir do qual os post-its entram grudando (os anteriores já estavam no mural) */
  desde: number;
  /** espera antes do primeiro (ms), para a tela terminar de entrar */
  atraso: number;
}

export interface MuralProps {
  entradas: readonly DiaryEntry[];
  compacto: boolean;
  /** busca mistura dias: mostra data e hora; no dia, só a hora */
  comData: boolean;
  rodada: Rodada;
  /** recém-guardada: crava depois que a caderneta desce */
  novoId?: number | null;
  /** soltando: cai até o chão */
  caindoId?: number | null;
  /** o barbante se desenha de novo até este post-it (depois que o vizinho caiu) */
  religarId?: number | null;
  onAbrir: (e: DiaryEntry) => void;
  onSoltar: (e: DiaryEntry) => void;
}

export function Mural({ entradas, compacto, comData, rodada, novoId, caindoId, religarId, onAbrir, onSoltar }: MuralProps) {
  const [largura, setLargura] = useState(0);
  const reduce = useReduceMotion();
  const { itens, alturaTotal, medidas } = posicoes(entradas.map((e) => e.id), largura || (compacto ? 358 : 1056), compacto);

  const cascata = (i: number) => !reduce && i >= rodada.desde && i - rodada.desde < MAX_CASCATA;
  const atrasoDe = (i: number) => rodada.atraso + (i - rodada.desde) * PASSO_MS;

  const trechos = itens.slice(1).map((p, j) => {
    const i = j + 1;
    const a = itens[i - 1];
    const e = entradas[i];
    const solto = caindoId != null && (e.id === caindoId || entradas[i - 1].id === caindoId);
    let atraso: number | null = null;
    if (!reduce && e.id === novoId) atraso = 1250;
    else if (!reduce && e.id === religarId) atraso = 0;
    else if (cascata(i)) atraso = atrasoDe(i) + 300;
    return { chave: `${entradas[i - 1].id}-${e.id}-${atraso === null ? 0 : rodada.chave}`, d: trecho(a.pino, p.pino, largura), len: comprimento(a.pino, p.pino), atraso, solto };
  });

  return (
    <View onLayout={(ev) => setLargura(Math.round(ev.nativeEvent.layout.width))} style={{ width: '100%', height: alturaTotal }}>
      <Svg width="100%" height={alturaTotal} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        {trechos.map((t) => (t.solto ? null : <Trecho key={t.chave} d={t.d} len={t.len} atraso={t.atraso} grosso={!compacto} />))}
      </Svg>
      {entradas.map((e, i) => {
        const novo = e.id === novoId && !reduce;
        const anima = novo || cascata(i);
        return (
          <PostIt
            key={`${e.id}-${anima ? rodada.chave : 0}`}
            entrada={e}
            pos={itens[i]}
            largura={medidas.largura}
            altura={medidas.altura}
            compacto={compacto}
            topo={comData ? dataCurtaComHora(e.createdAt) : hora(e.createdAt)}
            chegada={anima ? (novo ? 450 : atrasoDe(i)) : null}
            caindo={e.id === caindoId}
            onAbrir={() => onAbrir(e)}
            onSoltar={() => onSoltar(e)}
          />
        );
      })}
    </View>
  );
}

/** Um trecho do barbante. Com `atraso`, se desenha do começo ao fim (traço tracejado correndo). */
function Trecho({ d, len, atraso, grosso }: { d: string; len: number; atraso: number | null; grosso: boolean }) {
  const resto = useSharedValue(atraso === null ? 0 : len);
  useEffect(() => {
    if (atraso !== null) resto.value = withDelay(atraso, withTiming(0, { duration: 450 }));
  }, [atraso, len, resto]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: resto.value }));
  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={diario.barbante}
      strokeWidth={grosso ? 2 : 1.8}
      strokeLinecap="round"
      strokeDasharray={[len, len]}
      animatedProps={props}
    />
  );
}

interface PostItProps {
  entrada: DiaryEntry;
  pos: { x: number; y: number; rot: number };
  largura: number;
  altura: number;
  compacto: boolean;
  topo: string;
  /** ms até grudar; null = já estava no mural */
  chegada: number | null;
  caindo: boolean;
  onAbrir: () => void;
  onSoltar: () => void;
}

function PostIt({ entrada: e, pos, largura, altura, compacto, topo, chegada, caindo, onAbrir, onSoltar }: PostItProps) {
  const { scheme } = useTheme();
  const tam = compacto ? 'compacto' : 'largo';
  const emocao = e.emotion ? emotionColors(getEmotion(e.emotion), scheme) : null;
  const pino = compacto ? 14 : 16;
  const alvoPino = compacto ? 32 : 36;

  const animate = caindo
    ? { opacity: 0, translateY: 900, translateX: 40, rotate: '40deg', scale: 1 }
    : { opacity: 1, translateY: 0, translateX: 0, rotate: '0deg', scale: 1 };

  return (
    <View style={{ position: 'absolute', left: pos.x, top: pos.y, width: largura, height: altura, transform: [{ rotate: `${pos.rot}deg` }] }}>
      <MotiView
        from={chegada !== null ? { opacity: 0, translateY: -46, translateX: 0, rotate: '0deg', scale: 1.12 } : undefined}
        animate={animate}
        transition={caindo ? timing(1050, 150) : timing(500, chegada ?? 0)}
        style={{ flex: 1, transformOrigin: 'top' }}
      >
        <Pressable
          onPress={onAbrir}
          accessibilityRole="button"
          accessibilityLabel={`Abrir anotação ${e.title}, ${topo}`}
          testID={`diario-entrada-${e.id}`}
          style={{
            flex: 1,
            backgroundColor: diario.papel,
            paddingTop: compacto ? 22 : 26,
            paddingHorizontal: compacto ? 12 : 16,
            paddingBottom: compacto ? 12 : 16,
            gap: compacto ? 4 : 6,
            overflow: 'hidden',
            // slop:ok sombra o post-it é papel solto sobre o fundo (docs/VISUAL.md, Diário)
            boxShadow: diario.sombra.postit,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: compacto ? 24 : 28 }}>
            <Escrita estilo={diario.tipo.postitHora[tam]} cor={diario.dataPostit}>{topo}</Escrita>
            {emocao ? (
              <View
                accessibilityRole="image"
                accessibilityLabel={getEmotion(e.emotion).label}
                style={{
                  width: compacto ? 24 : 28,
                  height: compacto ? 24 : 28,
                  borderRadius: compacto ? 12 : 14,
                  backgroundColor: emocao.fill,
                  borderWidth: 2,
                  borderColor: diario.borda,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ rotate: '-10deg' }],
                  // slop:ok sombra adesivo colado no papel
                  boxShadow: diario.sombra.adesivo,
                }}
              >
                <Icon name={iconeDe(getEmotion(e.emotion).id)} size={compacto ? 14 : 15} color={emocao.onFill} strokeWidth={2.4} />
              </View>
            ) : null}
          </View>
          <Escrita estilo={diario.tipo.postitTitulo[tam]} cor={diario.tintaPostit} numberOfLines={2}>{e.title}</Escrita>
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <Escrita estilo={diario.tipo.postitTexto[tam]} cor={diario.apoioPostit}>{e.text}</Escrita>
            {/* quando o texto passa do papel, some com desfoque em vez de um corte seco */}
            <BlurView intensity={6} tint="light" pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 18 }} />
            {/* slop:ok gradiente o texto se dissolve no papel em vez de cortar seco */}
            <LinearGradient
              pointerEvents="none"
              colors={[`${diario.papel}00`, `${diario.papel}CC`, diario.papel]}
              locations={[0, 0.55, 1]}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 30 }}
            />
          </View>
        </Pressable>

        <Pressable
          onPress={onSoltar}
          accessibilityRole="button"
          accessibilityLabel={`Soltar o post-it ${e.title}`}
          testID={`diario-pino-${e.id}`}
          hitSlop={6}
          style={{ position: 'absolute', top: (compacto ? 12 : 14) - alvoPino / 2, left: largura / 2 - alvoPino / 2, width: alvoPino, height: alvoPino, alignItems: 'center', justifyContent: 'center' }}
        >
          <MotiView
            from={chegada !== null ? { opacity: 0, translateY: -14, scale: 1.6 } : undefined}
            animate={caindo ? { opacity: 0, translateY: -16, scale: 1.5 } : { opacity: 1, translateY: 0, scale: 1 }}
            transition={caindo ? timing(250) : timing(300, (chegada ?? 0) + 350)}
            style={{
              width: pino,
              height: pino,
              borderRadius: pino / 2,
              backgroundColor: diario.pino,
              // slop:ok sombra tachinha cravada no papel
              boxShadow: diario.sombra.pino,
            }}
          />
        </Pressable>
      </MotiView>
    </View>
  );
}
