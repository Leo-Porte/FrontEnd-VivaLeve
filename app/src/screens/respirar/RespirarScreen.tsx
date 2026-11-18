import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, ConfirmDialog, FadeIn, ListRow, ListSection, Screen, Text, useScreenLayout } from '@/components/ui';
import { CICLOS, FASES, useRespirarController } from '@/controllers/useRespirarController';
import { SurfaceProvider, useTheme } from '@/theme';

import { PandaRespiracao } from './PandaRespiracao';

const TEMPOS = {
  inspira: FASES.find((f) => f.id === 'inhale')?.dur ?? 3,
  segura: FASES.find((f) => f.id === 'hold')?.dur ?? 4,
  expira: FASES.find((f) => f.id === 'exhale')?.dur ?? 5,
};

/** ms do voo do panda entre o card e a tela cheia */
const VOO = 800;

interface Retangulo {
  x: number;
  y: number;
  w: number;
}

/**
 * fechado → entrando (panda voa do card para a tela cheia) → dentro (exercício rodando)
 * → saindo (ao parar ou concluir, volta para o card) → fechado
 */
type Etapa = 'fechado' | 'entrando' | 'dentro' | 'saindo';

export function RespirarScreen() {
  const c = useRespirarController();
  const { colors, spacing } = useTheme();
  const { areaWidth, gutter } = useScreenLayout();
  const reduzir = useReducedMotion();
  // área menos margens da tela e padding do card; no desktop a coluna do exercício é ~2/3 da largura
  const size = Math.min(240, Math.max(180, areaWidth - gutter * 2 - spacing.lg * 2));

  const rodando = c.estado === 'rodando';
  const concluido = c.estado === 'concluido';

  const [etapa, setEtapa] = useState<Etapa>('fechado');
  const [origem, setOrigem] = useState<Retangulo | null>(null);
  const [pandaNaTela, setPandaNaTela] = useState(false);
  const [chaveCard, setChaveCard] = useState(0);
  const pandaCard = useRef<React.ComponentRef<typeof View>>(null);
  const duracaoVoo = reduzir ? 0 : VOO;

  const comecar = useCallback(() => {
    // abre já; a posição de origem chega antes do layout da tela cheia (que é quando o voo começa)
    setOrigem(null);
    pandaCard.current?.measureInWindow?.((x, y, w) => setOrigem({ x, y, w }));
    setEtapa('entrando');
  }, []);

  // o exercício só começa quando o panda pousa: primeiro ele chega, depois respira
  const pousou = useCallback(() => {
    c.iniciar();
    setEtapa('dentro');
  }, [c]);

  // parou ou concluiu: o panda volta para o card
  const sair = etapa === 'dentro' && !rodando;
  const fechou = useCallback(() => {
    setEtapa('fechado');
    setPandaNaTela(false);
    setChaveCard((k) => k + 1); // recomeça a respiração de repouso do zero, sem salto na troca
  }, []);

  return (
    <Screen width="regular">
      <View style={{ gap: spacing.xs }}>
        <Text variant="display">Respirar</Text>
        <Text tone="muted">Técnica 3-4-5: inspire 3s, segure 4s, expire 5s.</Text>
      </View>

      <Card style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl }} testID="respirar-card">
        {/* some quando o da tela cheia aparece no mesmo lugar: parece um panda só que levanta voo */}
        <View ref={pandaCard} collapsable={false} style={{ opacity: pandaNaTela ? 0 : 1 }}>
          <PandaRespiracao key={chaveCard} modo={concluido ? 'concluido' : 'idle'} tempos={TEMPOS} size={size} fundo={colors.primarySoft} />
        </View>

        <View style={{ alignItems: 'center', gap: spacing.xs, marginTop: spacing.md }} accessibilityLiveRegion="polite">
          <Text variant="title" align="center" testID="respirar-titulo">{concluido ? 'Muito bem' : 'Pronto?'}</Text>
          <Text tone="muted" align="center" testID="respirar-chamada">
            {concluido ? `Você fez ${CICLOS} ciclos de respiração 3-4-5` : 'O panda respira com você. Acompanhe o ritmo dele.'}
          </Text>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Button label={concluido ? 'Repetir' : 'Começar'} onPress={comecar} disabled={etapa !== 'fechado'} testID="respirar-iniciar" />
        </View>
        {c.aviso ? <Text tone="danger" align="center" accessibilityLiveRegion="polite" testID="respirar-aviso">{c.aviso}</Text> : null}
      </Card>

      <FadeIn>
        <ListSection header="Suas sessões">
          <ListRow icon="sol" title="Hoje" value={String(c.stats?.todaySessions ?? 0)} testID="respirar-stat-hoje" />
          <ListRow icon="respirar" title="Total de sessões" value={String(c.stats?.totalSessions ?? 0)} testID="respirar-stat-total" />
          <ListRow icon="atividade" title="Minutos" value={String(c.stats?.totalMinutes ?? 0)} testID="respirar-stat-minutos" />
        </ListSection>
      </FadeIn>

      <ListSection>
        <ListRow title="Apagar sessões" tone="danger" onPress={c.pedirApagar} chevron={false} testID="respirar-apagar" />
      </ListSection>

      <Modal visible={etapa !== 'fechado'} transparent animationType="none" statusBarTranslucent onRequestClose={c.parar}>
        <RespiracaoTelaCheia
          c={c}
          origem={origem}
          sair={sair}
          duracaoVoo={duracaoVoo}
          onPronto={() => setPandaNaTela(true)}
          onPousou={pousou}
          onFechou={fechou}
        />
      </Modal>

      <ConfirmDialog
        visible={c.confirmandoApagar}
        title="Apagar sessões"
        message="Apagar todas as suas sessões de respiração? Isso não pode ser desfeito."
        confirmLabel="Apagar"
        destructive
        loading={c.apagando}
        confirmTestID="confirm-ok"
        cancelTestID="confirm-cancelar"
        onConfirm={c.confirmarApagar}
        onCancel={c.cancelarApagar}
      />
    </Screen>
  );
}

type Controller = ReturnType<typeof useRespirarController>;

interface TelaCheiaProps {
  c: Controller;
  /** onde o panda estava no card (coordenadas da janela); null = só aparece */
  origem: Retangulo | null;
  /** true = fazer o caminho de volta e fechar */
  sair: boolean;
  duracaoVoo: number;
  onPronto: () => void;
  onPousou: () => void;
  onFechou: () => void;
}

/**
 * Durante o exercício o panda ocupa a tela toda. Ele sai do card voando até o centro
 * (fundo e textos aparecem por trás), e faz o caminho inverso ao terminar.
 */
function RespiracaoTelaCheia({ c, origem, sair, duracaoVoo, onPronto, onPousou, onFechou }: TelaCheiaProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // o panda fica com o que sobra depois dos textos e do botão
  const size = Math.max(200, Math.min(width - spacing.sm * 2, height - insets.top - insets.bottom - 300, 620));

  const slot = useRef<React.ComponentRef<typeof View>>(null);
  const [destino, setDestino] = useState<Retangulo | null>(null);
  const p = useSharedValue(0); // 0 = no card, 1 = na tela cheia

  const medir = useCallback(() => {
    const fallback = () => setDestino({ x: 0, y: 0, w: size });
    if (slot.current?.measureInWindow) slot.current.measureInWindow((x, y, w) => (w ? setDestino({ x, y, w }) : fallback()));
    else fallback();
  }, [size]);

  // se o layout não reportar (ambiente sem medição), aparece no lugar em vez de travar
  useEffect(() => {
    const t = setTimeout(() => setDestino((d) => d ?? { x: 0, y: 0, w: size }), 400);
    return () => clearTimeout(t);
  }, [size]);

  // entrada: assim que sabe onde vai pousar, voa
  useEffect(() => {
    if (!destino) return;
    onPronto();
    p.set(withTiming(1, { duration: duracaoVoo, easing: Easing.inOut(Easing.cubic) }));
    const t = setTimeout(onPousou, duracaoVoo);
    return () => clearTimeout(t);
    // só na primeira medição
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destino !== null]);

  // saída: dá um respiro para o panda voltar ao repouso e então voa de volta
  useEffect(() => {
    if (!sair) return;
    const espera = duracaoVoo ? 700 : 0;
    p.set(withDelay(espera, withTiming(0, { duration: duracaoVoo, easing: Easing.inOut(Easing.cubic) })));
    const t = setTimeout(onFechou, espera + duracaoVoo);
    return () => clearTimeout(t);
  }, [sair, duracaoVoo, onFechou, p]);

  const dx = origem && destino ? origem.x + origem.w / 2 - (destino.x + destino.w / 2) : 0;
  const dy = origem && destino ? origem.y + origem.w / 2 - (destino.y + destino.w / 2) : 0;
  const s0 = origem && destino ? origem.w / destino.w : 0.6;

  const estiloFundo = useAnimatedStyle(() => ({ opacity: p.value }));
  const estiloPanda = useAnimatedStyle(() => {
    const r = 1 - p.value;
    return {
      opacity: destino ? (origem ? 1 : p.value) : 0,
      transform: [{ translateX: dx * r }, { translateY: dy * r }, { scale: 1 + (s0 - 1) * r }],
    };
  });
  // textos chegam depois do panda, e saem antes dele
  const estiloTextos = useAnimatedStyle(() => ({
    opacity: Math.max(0, (p.value - 0.6) / 0.4),
    transform: [{ translateY: (1 - p.value) * 24 }],
  }));

  const fase = c.fase;
  return (
    <SurfaceProvider value={colors.bg}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg }, estiloFundo]} />
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'space-evenly',
        }}
        testID="respirar-tela-cheia"
      >
        <View ref={slot} collapsable={false} onLayout={medir} style={{ width: size, height: size }}>
          <Animated.View style={estiloPanda}>
            <PandaRespiracao modo="rodando" ativo={c.estado === 'rodando'} tempos={TEMPOS} size={size} fundo={colors.primarySoft} />
          </Animated.View>
        </View>

        {/* o que importa durante o exercício: o que fazer agora e por quanto tempo */}
        <Animated.View style={[{ alignItems: 'center', width: '100%', maxWidth: 440, gap: spacing.sm }, estiloTextos]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 72 }}>
            <Text variant="respiracao" align="center" testID="respirar-fase">
              {fase?.texto ?? (c.estado === 'concluido' ? 'Muito bem' : 'Prepare-se')}
            </Text>
            {fase ? (
              <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
                <SurfaceProvider value={colors.primary}>
                  <Text variant="contagem" color={colors.onPrimary} testID="respirar-timer">
                    {c.restante}
                  </Text>
                </SurfaceProvider>
              </View>
            ) : null}
          </View>
          <View style={{ alignItems: 'center', gap: spacing.xs, minHeight: 56 }} accessibilityLiveRegion="polite">
            <Text variant="title" align="center" testID="respirar-instrucao">{fase?.label ?? ''}</Text>
            <Text tone="muted" align="center" testID="respirar-descricao">{fase?.desc ?? ''}</Text>
          </View>
          <View style={{ marginTop: spacing.lg }}>
            <Button label="Parar" variant="ghost" onPress={c.parar} disabled={c.estado !== 'rodando'} testID="respirar-parar" />
          </View>
        </Animated.View>
      </View>
    </SurfaceProvider>
  );
}
