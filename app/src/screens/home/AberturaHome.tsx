import { MotiView } from 'moti';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { SurfaceProvider, abertura, useTheme, type PeriodoDoDia } from '@/theme';
import { Astro } from './Astro';

/**
 * Abertura animada da Home (~8 s), no ritmo de uma tela de carregamento:
 * 0 saudação palavra por palavra · 1 frase · 2 o texto sai · 3 sol/lua + data · 4 piscadinha
 * · 5 o astro "volta" até o cabeçalho enquanto a cortina some e a Home entra · 6 fim.
 * Curvas sem passar do ponto (nada de mola) e uma barra fina que enche até o voo.
 */

/** [fase, ms desde o início] */
const ROTEIRO: [number, number][] = [[1, 1400], [2, 3700], [3, 4300], [4, 5500], [5, 6400], [6, 7900]];
const DURACAO_ATE_VOO = 6400;

/** nó nativo com measureInWindow (no RN 0.88 `View` é função, não classe) */
export type NoNativo = React.ComponentRef<typeof View>;

/** curvas criadas sob demanda (testes com Reanimated simplificado não quebram no import) */
const entrar = () => Easing.bezier(0.22, 1, 0.36, 1);
const emEOut = () => Easing.bezier(0.65, 0, 0.35, 1);
const suave = (duration: number, delay = 0, easing = entrar) => ({ type: 'timing', duration, delay, easing: easing() }) as never;

export interface AberturaHomeProps {
  /** "Boa tarde, Ana" */
  saudacao: string;
  frase: { text: string; author: string };
  /** "Terça-feira, 17 de novembro" */
  data: string;
  periodo: PeriodoDoDia;
  /** onde o astro pousa: o ícone do cabeçalho da Home */
  alvo: React.RefObject<NoNativo | null>;
  /** a Home pode começar a aparecer (o astro já está voltando) */
  onRevelar: () => void;
  /** a abertura acabou e pode sair da tela */
  onTerminar: () => void;
}

export function AberturaHome({ saudacao, frase, data, periodo, alvo, onRevelar, onTerminar }: AberturaHomeProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [fase, setFase] = useState(0);
  const [caixa, setCaixa] = useState({ w: 0, h: 0 });
  const raiz = useRef<NoNativo>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const voo = useSharedValue(0);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const escalaFinal = useSharedValue(1);
  const cortina = useSharedValue(1);

  const tamanho = Math.min(220, Math.max(140, caixa.w * 0.44));
  const cx = caixa.w / 2;
  const cy = caixa.h * 0.4;

  const limpar = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    timers.current = ROTEIRO.map(([f, ms]) => setTimeout(() => setFase(f), ms));
    return limpar;
  }, []);

  // 5: mede o ícone do cabeçalho e voa até ele; a cortina some junto
  useEffect(() => {
    if (fase === 5) {
      onRevelar();
      cortina.value = withTiming(0, { duration: 1300, easing: emEOut() });
      const voar = () => {
        voo.value = withTiming(1, { duration: 1400, easing: emEOut() });
      };
      const r = raiz.current;
      const a = alvo.current;
      if (!r || !a) return voar();
      r.measureInWindow((ox, oy) => {
        a.measureInWindow((ax, ay, aw, ah) => {
          dx.value = ax - ox + aw / 2 - cx;
          dy.value = ay - oy + ah / 2 - cy;
          escalaFinal.value = aw > 0 ? aw / tamanho : 0.12;
          voar();
        });
      });
    }
    if (fase === 6) onTerminar();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage só à troca de fase
  }, [fase]);

  const pular = useCallback(() => {
    limpar();
    onRevelar();
    onTerminar();
  }, [onRevelar, onTerminar]);

  const estiloCortina = useAnimatedStyle(() => ({ opacity: cortina.value }));
  const estiloVoo = useAnimatedStyle(() => ({
    transform: [
      { translateX: dx.value * voo.value },
      { translateY: dy.value * voo.value },
      { scale: 1 + (escalaFinal.value - 1) * voo.value },
    ],
  }));

  const palavras = saudacao.split(' ');
  const legenda = abertura.periodos[periodo].legenda;

  return (
    <View
      ref={raiz}
      onLayout={(e: LayoutChangeEvent) => setCaixa({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      pointerEvents={fase >= 5 ? 'none' : 'box-none'}
      style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 50 }}
      accessibilityViewIsModal={fase < 5}
      testID="home-abertura"
    >
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: colors.bg }, estiloCortina]} />

      <SurfaceProvider value={colors.bg}>
        {fase <= 2 ? (
          <MotiView
            animate={{ opacity: fase >= 2 ? 0 : 1, translateY: fase >= 2 ? -10 : 0 }}
            transition={suave(900, 0, emEOut)}
            style={{ position: 'absolute', left: spacing.xl, right: spacing.xl, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}
          >
            <View accessible accessibilityRole="header" accessibilityLabel={saudacao} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 10 }}>
              {palavras.map((p, i) => (
                <MotiView key={`${p}-${i}`} from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={suave(1000, i * 280)}>
                  <Text variant="display" align="center">{p}</Text>
                </MotiView>
              ))}
            </View>
            {fase >= 1 ? (
              <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={suave(900)} style={{ maxWidth: 560, gap: spacing.xs }}>
                <Text variant="title" tone="muted" align="center" style={{ fontStyle: 'italic', fontWeight: '400' }}>{`“${frase.text}”`}</Text>
                <Text tone="muted" align="center">{`— ${frase.author}`}</Text>
              </MotiView>
            ) : null}
          </MotiView>
        ) : null}

        {fase >= 3 && fase <= 5 && caixa.w > 0 ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[{ position: 'absolute', left: cx - tamanho / 2, top: cy - tamanho / 2, width: tamanho, height: tamanho }, estiloVoo]}
            >
              <MotiView from={{ opacity: 0, scale: 0.86 }} animate={{ opacity: 1, scale: 1 }} transition={suave(1100)}>
                <Astro periodo={periodo} tamanho={tamanho} rosto piscar={fase === 4} />
              </MotiView>
            </Animated.View>
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: fase >= 5 ? 0 : 1, translateY: fase >= 5 ? -10 : 0 }}
              transition={suave(900, fase >= 5 ? 0 : 200)}
              style={{ position: 'absolute', left: spacing.xl, right: spacing.xl, top: cy + tamanho / 2 + spacing.lg, alignItems: 'center', gap: 2 }}
            >
              <Text variant="title" align="center">{data}</Text>
              <Text tone="muted" align="center">{legenda}</Text>
            </MotiView>
          </>
        ) : null}

        {fase < 5 ? (
          <>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Abrindo a Pluma"
              style={{ position: 'absolute', left: '50%', bottom: insets.bottom + 56, width: 120, marginLeft: -60, height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}
            >
              <MotiView
                from={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={suave(DURACAO_ATE_VOO, 0, () => Easing.bezier(0.45, 0.05, 0.55, 0.95))}
                style={{ height: 3, backgroundColor: colors.primary, transformOrigin: 'left' }}
              />
            </View>
            <Pressable
              onPress={pular}
              accessibilityRole="button"
              accessibilityLabel="Pular abertura"
              testID="home-abertura-pular"
              hitSlop={8}
              style={{ position: 'absolute', top: insets.top + spacing.md, right: spacing.md, minHeight: 36, paddingHorizontal: spacing.md, borderRadius: 18, justifyContent: 'center', backgroundColor: colors.surfaceAlt }}
            >
              <SurfaceProvider value={colors.surfaceAlt}>
                <Text variant="label">Pular</Text>
              </SurfaceProvider>
            </Pressable>
          </>
        ) : null}
      </SurfaceProvider>
    </View>
  );
}
