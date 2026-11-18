import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions,
  type LayoutChangeEvent, type ScrollViewInstance, type TextInputContentSizeChangeEvent, type TextInputInstance,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, ConfirmDialog, FadeIn, Icon, Loading, Screen, Text, useNavChrome, useReduceMotion, useScreenLayout } from '@/components/ui';
import { AJUDA_CRISE, quandoFoi, type MensagemChat, useChatController } from '@/controllers/useChatController';
import { PALAVRAS_PENSANDO, RITMO_SESSAO } from '@/entities';
import type { Conversation } from '@/models';
import { MENU_LATERAL, SurfaceProvider, useTheme } from '@/theme';

type Sessao = ReturnType<typeof useChatController>;

// slop:ok raio balão fora da escala de radius: o balão do iOS tem raio 18 e canto de 4
const BALAO = 18;
const CANTO = 4;
/** campo de mensagem arredondado como o do protótipo aprovado (Sessão, 17/11/2026) */
const RAIO_CAMPO = 24;
const LARGURA_MAX = 720;
const LARGURA_LATERAL = 280;
/** bolinha do menu na lateral: 64 + 20 de margem; se o campo encostar nisso, reserva espaço embaixo */
const BOLINHA_LATERAL = 92;
const LINHA = 22;
const CAMPO_MAX = LINHA * RITMO_SESSAO.CAMPO_MAX_LINHAS;
const BOTAO = { inicio: 36, sessao: 46 } as const;
/** o campo começa um pouco acima do meio da área */
const TOPO_INICIO = 0.46;
const DESCIDA_MS = 850;

// ------------------------------------------------------------ rolagem fina (web)

/** Web: barra de rolagem invisível, que só aparece enquanto a pessoa rola. No celular o sistema já faz assim. */
function useRolagemFinaWeb(cor: string) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const id = 'pluma-rolagem-fina';
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent =
      '[data-rolagem]{scrollbar-width:thin;scrollbar-color:transparent transparent}' +
      '[data-rolagem]::-webkit-scrollbar{width:6px;height:6px}' +
      '[data-rolagem]::-webkit-scrollbar-track{background:transparent}' +
      '[data-rolagem]::-webkit-scrollbar-thumb{background:transparent;border-radius:3px}' +
      `[data-rolagem="ativa"]{scrollbar-color:${cor} transparent}` +
      `[data-rolagem="ativa"]::-webkit-scrollbar-thumb{background:${cor}}`;
  }, [cor]);
}

/** Liga a barra enquanto rola e apaga 900 ms depois. Devolve as props para espalhar no elemento rolável. */
function useRolagem() {
  const [ativa, setAtiva] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (t.current) clearTimeout(t.current);
  }, []);
  const aoRolar = useCallback(() => {
    setAtiva(true);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setAtiva(false), 900);
  }, []);
  // dataSet vira data-* no react-native-web; no nativo é ignorado
  const dataSet = { dataSet: { rolagem: ativa ? 'ativa' : 'fina' } } as object;
  return { aoRolar, dataSet };
}

// ------------------------------------------------------------ tela

export function ChatScreen() {
  const c = useChatController();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const lateral = width >= MENU_LATERAL.janelaMinima;
  const { setMenuRecolhido } = useNavChrome();
  const [gaveta, setGaveta] = useState(false);

  useRolagemFinaWeb(colors.border);

  // telefone com a sessão aberta: a bolinha do menu afunda e sobra a alça, o campo ganha espaço
  const recolher = !c.carregando && !c.semLogin && c.tela !== 'inicio';
  useEffect(() => {
    setMenuRecolhido(recolher);
  }, [recolher, setMenuRecolhido]);
  useEffect(() => () => setMenuRecolhido(false), [setMenuRecolhido]);

  if (c.carregando) return <Screen><Loading label="Carregando..." /></Screen>;

  if (c.semLogin) {
    return (
      <Screen>
        <Card title="Sessão com a Pluma" testID="chat-sem-login">
          <Text>Para fazer uma sessão com a Pluma, entre na sua conta (email e senha ou Google). Assim suas sessões ficam guardadas só para você.</Text>
          <Button label="Entrar" icon="avancar" onPress={c.entrar} testID="chat-entrar" />
        </Card>
      </Screen>
    );
  }

  const lista = <ListaSessoes c={c} gaveta={!lateral} onFechar={() => setGaveta(false)} />;

  return (
    <SurfaceProvider value={colors.bg}>
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
        {lateral ? (
          <View style={{ width: LARGURA_LATERAL, borderRightWidth: 1, borderRightColor: colors.separator, backgroundColor: colors.surface }}>{lista}</View>
        ) : null}
        <AreaSessao c={c} lateral={lateral} abrirGaveta={() => setGaveta(true)} />
        {!lateral ? <Gaveta aberta={gaveta} onFechar={() => setGaveta(false)}>{lista}</Gaveta> : null}

        <ConfirmDialog
          visible={c.confirmandoApagar}
          title="Apagar sessão"
          message="Apagar esta sessão com a Pluma? As mensagens não poderão ser recuperadas."
          confirmLabel="Apagar"
          destructive
          loading={c.apagando}
          confirmTestID="confirm-ok"
          cancelTestID="confirm-cancelar"
          onConfirm={c.apagarVendo}
          onCancel={c.cancelarApagar}
        />
      </View>
    </SurfaceProvider>
  );
}

// ------------------------------------------------------------ área principal

function AreaSessao({ c, lateral, abrirGaveta }: { c: Sessao; lateral: boolean; abrirGaveta: () => void }) {
  const { colors, spacing, typography } = useTheme();
  const { gutter } = useScreenLayout();
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { espacoInferior } = useNavChrome();
  const rolagemLista = useRolagem();
  const rolagemCampo = useRolagem();

  const inicio = c.tela === 'inicio';
  const leitura = c.tela === 'leitura';

  // medidas (estado para o layout, shared value para a animação)
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [alturaLinha, setAlturaLinha] = useState(LINHA + 28);
  const [alturaNota, setAlturaNota] = useState(28);
  const [alturaBarra, setAlturaBarra] = useState(120);
  const [alturaTexto, setAlturaTexto] = useState(LINHA);
  const H = useSharedValue(0);
  const HL = useSharedValue(LINHA + 28);
  const HN = useSharedValue(28);
  const HA = useSharedValue(46);
  const HBARRA = useSharedValue(120);
  const RES = useSharedValue(0);

  // espaço embaixo: telefone = a alça do menu (vem de espacoInferior); lateral = só se a bolinha encostar no campo
  const larguraCampo = Math.min(area.w - gutter * 2, LARGURA_MAX);
  const folgaLateral = (area.w - larguraCampo) / 2;
  const reserva = lateral ? (folgaLateral < BOLINHA_LATERAL ? espacoInferior : Math.max(insets.bottom, spacing.sm)) : espacoInferior;
  useEffect(() => {
    RES.value = reserva;
  }, [reserva, RES]);

  // p: 0 início → 1 sessão (campo desce) · q: botão de enviar se encaixa (com atraso) · l: leitura · o: lista visível
  const p = useSharedValue(inicio ? 0 : 1);
  const q = useSharedValue(inicio ? 0 : 1);
  const l = useSharedValue(leitura ? 1 : 0);
  const o = useSharedValue(inicio ? 0 : 1);
  useEffect(() => {
    const curva = Easing.bezier(0.65, 0, 0.25, 1);
    const d = (ms: number) => (reduce ? 0 : ms);
    const alvo = inicio ? 0 : 1;
    p.value = withTiming(alvo, { duration: d(DESCIDA_MS), easing: curva });
    q.value = withDelay(d(inicio ? 0 : 250), withTiming(alvo, { duration: d(550), easing: curva }));
    o.value = inicio ? withTiming(0, { duration: d(200) }) : withDelay(d(350), withTiming(1, { duration: d(450) }));
    l.value = withTiming(leitura ? 1 : 0, { duration: d(550), easing: curva });
  }, [inicio, leitura, reduce, p, q, o, l]);

  const estiloComp = useAnimatedStyle(() => {
    const topoInicio = H.value * TOPO_INICIO;
    const topoSessao = H.value - HL.value - HN.value - RES.value;
    return {
      top: topoInicio + (topoSessao - topoInicio) * p.value,
      opacity: H.value > 0 ? 1 - l.value : 0,
      transform: [{ translateY: l.value * (HL.value + HN.value + RES.value + 24) }],
    };
  });
  const estiloAcoes = useAnimatedStyle(() => ({
    height: HA.value * (1 - p.value),
    opacity: Math.max(0, 1 - p.value * 2.5),
  }));
  const estiloHero = useAnimatedStyle(() => ({
    bottom: H.value * (1 - TOPO_INICIO) + 28,
    opacity: H.value > 0 ? Math.max(0, 1 - p.value * 1.6) : 0,
    transform: [{ translateY: -28 * p.value }],
  }));
  const estiloCaixa = useAnimatedStyle(() => ({ paddingRight: 60 - 42 * q.value }));
  const estiloEnviar = useAnimatedStyle(() => {
    const t = BOTAO.inicio + (BOTAO.sessao - BOTAO.inicio) * q.value;
    return { width: t, height: t, borderRadius: t / 2, marginLeft: -50 + 58 * q.value, marginBottom: 7 - 5 * q.value };
  });
  const estiloLista = useAnimatedStyle(() => ({ opacity: o.value }));
  const estiloBarra = useAnimatedStyle(() => ({ opacity: l.value, transform: [{ translateY: (1 - l.value) * (HBARRA.value + RES.value + 20) }] }));

  const medir = (set: (n: number) => void, sv: { value: number }) => (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    sv.value = h;
    set(h);
  };

  // ---- campo: cresce até 6 linhas, depois rola
  const campo = useRef<TextInputInstance>(null);
  const ajustarAltura = (h: number) => setAlturaTexto(Math.max(LINHA, Math.min(Math.ceil(h), CAMPO_MAX)));
  const zerarAltura = () => {
    setAlturaTexto(LINHA);
    if (Platform.OS === 'web') {
      const el = campo.current as unknown as HTMLTextAreaElement | null;
      if (el?.style) el.style.height = `${LINHA}px`;
    }
  };
  const aoMudarWeb = (e: { target?: unknown; nativeEvent?: { target?: unknown } }) => {
    if (Platform.OS !== 'web') return;
    const el = (e.target ?? e.nativeEvent?.target) as HTMLTextAreaElement | undefined;
    if (!el?.style) return;
    el.style.height = 'auto';
    const h = Math.max(LINHA, Math.min(el.scrollHeight, CAMPO_MAX));
    el.style.height = `${h}px`;
    ajustarAltura(h);
  };

  // ---- rolagem das mensagens: segue o fim enquanto a pessoa está no fim
  const lista = useRef<ScrollViewInstance>(null);
  const grudado = useRef(true);
  const ultimaMinha = c.mensagens.filter((m) => m.tipo === 'user').length;
  useEffect(() => {
    grudado.current = true;
  }, [ultimaMinha, c.tela]);
  useEffect(() => {
    if (leitura) lista.current?.scrollTo({ y: 0, animated: false });
  }, [leitura, c.vendo?.id]);
  const seguirFim = () => {
    if (grudado.current && !leitura) lista.current?.scrollToEnd({ animated: false });
  };

  const paddingFim = leitura ? alturaBarra + reserva + spacing.md : alturaLinha + alturaNota + reserva + spacing.md;
  const desligado = !c.podeEnviar;

  const enviar = () => {
    if (!c.podeEnviar) return;
    zerarAltura();
    c.enviar();
  };

  const conteudo = (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <Topo c={c} lateral={lateral} abrirGaveta={abrirGaveta} />

      <View style={{ flex: 1 }} onLayout={(e) => { const { width, height } = e.nativeEvent.layout; H.value = height; setArea({ w: width, h: height }); }}>
        {/* mensagens */}
        <Animated.View pointerEvents={inicio ? 'none' : 'auto'} style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, estiloLista]}>
          <ScrollView
            ref={lista}
            {...rolagemLista.dataSet}
            onScroll={(e) => {
              rolagemLista.aoRolar();
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              grudado.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
            }}
            scrollEventThrottle={32}
            onContentSizeChange={seguirFim}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: spacing.sm, paddingBottom: paddingFim }}
            testID="chat-mensagens"
          >
            <View style={{ width: '100%', maxWidth: LARGURA_MAX, alignSelf: 'center', gap: spacing.md - 2 }}>
              {c.mensagens.map((m) => <Mensagem key={m.id} m={m} digitando={c.digitandoId === m.id} onFim={c.fimDigitacao} />)}
              {c.pensando ? <Pensando atraso={c.mensagens.length <= 1 ? 600 : 150} /> : null}
              {c.abrindo ? <Loading label="Abrindo a sessão..." /> : null}
            </View>
          </ScrollView>
        </Animated.View>

        {/* abertura: nome + frase */}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: gutter, right: gutter, alignItems: 'center', gap: spacing.sm + 2 }, estiloHero]} testID="chat-boas-vindas">
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="pluma" size={28} color={colors.primary} />
          </View>
          <Text variant="display" align="center">Pluma</Text>
          <Text tone="muted" align="center" style={{ maxWidth: 460 }}>{c.frase.texto}</Text>
          {c.frase.autor ? <Text variant="caption" tone="muted" align="center">— {c.frase.autor}</Text> : null}
        </Animated.View>

        {/* compositor: começa no centro e desce para o rodapé */}
        <Animated.View
          pointerEvents={leitura ? 'none' : 'box-none'}
          style={[{ position: 'absolute', left: 0, right: 0, paddingHorizontal: gutter, backgroundColor: inicio ? undefined : colors.bg }, estiloComp]}
        >
          <View style={{ width: '100%', maxWidth: LARGURA_MAX, alignSelf: 'center' }}>
            <View onLayout={medir(setAlturaLinha, HL)} style={{ paddingTop: spacing.sm }}>
              {c.erro ? <Text variant="caption" tone="danger" align="center" style={{ marginBottom: spacing.xs }}>{c.erro}</Text> : null}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <Animated.View
                  style={[
                    { flex: 1, minWidth: 0, paddingLeft: spacing.md + 2, paddingVertical: 13, borderRadius: RAIO_CAMPO, borderCurve: 'continuous', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.separator },
                    estiloCaixa,
                  ]}
                >
                  <TextInput
                    ref={campo}
                    {...rolagemCampo.dataSet}
                    // web: textarea nasce com 2 linhas; 1 linha é o ponto de partida
                    {...(Platform.OS === 'web' ? ({ rows: 1 } as object) : null)}
                    value={c.texto}
                    onChangeText={c.setTexto}
                    onChange={aoMudarWeb as never}
                    onContentSizeChange={(e: TextInputContentSizeChangeEvent) => {
                      if (Platform.OS !== 'web') ajustarAltura(e.nativeEvent.contentSize.height);
                    }}
                    onScroll={rolagemCampo.aoRolar}
                    scrollEnabled={alturaTexto >= CAMPO_MAX}
                    placeholder={inicio ? 'Como você está se sentindo hoje?' : 'Escreva para a Pluma…'}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    accessibilityLabel="Mensagem para a Pluma"
                    onKeyPress={(e) => {
                      const ev = e.nativeEvent as unknown as { key: string; shiftKey?: boolean; isComposing?: boolean };
                      if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) {
                        (e as unknown as { preventDefault?: () => void }).preventDefault?.();
                        enviar();
                      }
                    }}
                    testID="chat-input"
                    style={[
                      { ...typography.body, color: colors.text, height: alturaTexto, maxHeight: CAMPO_MAX, padding: 0, margin: 0, textAlignVertical: 'top' },
                      { outlineStyle: 'none', resize: 'none' } as object,
                    ]}
                  />
                </Animated.View>
                <Animated.View style={[{ overflow: 'hidden' }, estiloEnviar]}>
                  <Pressable
                    onPress={enviar}
                    disabled={desligado}
                    accessibilityRole="button"
                    accessibilityLabel="Enviar"
                    accessibilityState={{ disabled: desligado }}
                    testID="chat-enviar"
                    style={({ pressed }) => ({
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: desligado ? colors.surfaceAlt : colors.primary,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Icon name="subir" size={20} strokeWidth={2.4} color={desligado ? colors.textMuted : colors.onPrimary} />
                  </Pressable>
                </Animated.View>
              </View>
            </View>

            {/* "Reabrir última sessão": só no início, recolhe quando o campo desce (as anteriores ficam no botão de menu do topo ou na lateral) */}
            <Animated.View pointerEvents={inicio ? 'box-none' : 'none'} style={[{ overflow: 'hidden' }, estiloAcoes]}>
              <View onLayout={medir(() => {}, HA)} style={{ position: 'absolute', left: 0, right: 0, top: 0, paddingTop: spacing.md - 2, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
                <BotaoPequeno icone="reiniciar" label="Reabrir última sessão" onPress={c.reabrirUltima} disabled={!c.temHistorico} testID="chat-reabrir-ultima" />
              </View>
            </Animated.View>

            <View onLayout={medir(setAlturaNota, HN)} style={{ paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
              <Text variant="caption" tone="muted" align="center">Em uma emergência, ligue 188 (CVV, 24h) ou 192 (SAMU).</Text>
            </View>
          </View>
        </Animated.View>

        {/* rodapé da sessão finalizada */}
        <Animated.View
          pointerEvents={leitura ? 'box-none' : 'none'}
          onLayout={medir(setAlturaBarra, HBARRA)}
          style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: gutter, paddingTop: spacing.md, paddingBottom: reserva + spacing.sm, backgroundColor: colors.bg }, estiloBarra]}
        >
          <View style={{ width: '100%', maxWidth: LARGURA_MAX, alignSelf: 'center', alignItems: 'center', gap: spacing.sm + 2, padding: spacing.md, borderRadius: BALAO, borderCurve: 'continuous', backgroundColor: colors.surface }}>
            <Text variant="caption" tone="muted" align="center">
              {c.vendo ? `Esta sessão foi finalizada ${quandoFoi(c.vendo.lastMessageAt).replace(/^(\d)/, 'em $1')}.` : ''}
            </Text>
            <Button label="Reabrir esta sessão" icon="reiniciar" small style={{ alignSelf: 'center' }} onPress={() => c.vendo && c.reabrir(c.vendo)} disabled={c.abrindo} testID="chat-reabrir" />
          </View>
        </Animated.View>
      </View>
    </View>
  );

  if (Platform.OS === 'ios') {
    return <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>{conteudo}</KeyboardAvoidingView>;
  }
  return <View style={{ flex: 1 }}>{conteudo}</View>;
}

// ------------------------------------------------------------ topo

function Topo({ c, lateral, abrirGaveta }: { c: Sessao; lateral: boolean; abrirGaveta: () => void }) {
  const { colors, spacing } = useTheme();
  const sub = c.pensando ? 'pensando…' : c.digitandoId ? 'escrevendo…' : 'em andamento';
  return (
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm }}>
      {!lateral ? <BotaoIcone icone="menu" label="Sessões anteriores" onPress={abrirGaveta} testID="chat-abrir-sessoes" /> : <View style={{ width: spacing.sm }} />}
      <View style={{ flex: 1, minWidth: 0, paddingHorizontal: spacing.sm, alignItems: lateral ? 'flex-start' : 'center' }}>
        {c.tela === 'sessao' ? (
          <>
            <Text variant="subtitle" numberOfLines={1}>Sessão com a Pluma</Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>{sub}</Text>
          </>
        ) : null}
        {c.tela === 'leitura' && c.vendo ? (
          <>
            <Text variant="subtitle" numberOfLines={1}>{c.vendo.title || 'Sessão'}</Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>Sessão finalizada · {quandoFoi(c.vendo.lastMessageAt)}</Text>
          </>
        ) : null}
      </View>
      {c.tela === 'sessao' ? <Button label="Encerrar" variant="secondary" small onPress={c.encerrar} testID="chat-encerrar" /> : null}
      {c.tela === 'leitura' ? (
        <>
          <BotaoIcone icone="apagar" label="Apagar sessão" cor={colors.danger} onPress={c.pedirApagar} testID="chat-apagar" />
          <BotaoIcone icone="fechar" label="Fechar sessão" onPress={c.voltarInicio} testID="chat-fechar" />
        </>
      ) : null}
      {c.tela === 'inicio' ? <View style={{ width: 44 }} /> : null}
    </View>
  );
}

// ------------------------------------------------------------ lista de sessões (lateral e gaveta)

function ListaSessoes({ c, gaveta, onFechar }: { c: Sessao; gaveta: boolean; onFechar: () => void }) {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const rolagem = useRolagem();
  const selecionada = c.vendo?.id ?? (c.tela === 'sessao' ? c.ativaId : null);

  const escolher = (s: Conversation) => {
    onFechar();
    if (c.tela === 'sessao' && s.id === c.ativaId) return;
    c.abrirSessao(s);
  };
  const nova = () => {
    onFechar();
    if (c.tela === 'sessao') c.encerrar();
    else c.voltarInicio();
  };

  return (
    <SurfaceProvider value={colors.surface}>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: spacing.md + 2, paddingRight: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="pluma" size={22} color={colors.primary} />
            <Text variant="subtitle">Pluma</Text>
          </View>
          {gaveta ? <BotaoIcone icone="fechar" label="Fechar" onPress={onFechar} testID="chat-fechar-sessoes" /> : null}
        </View>
        <View style={{ paddingHorizontal: spacing.md - 4, paddingBottom: spacing.md - 4 }}>
          <Button label="Nova sessão" icon="novaSessao" variant="secondary" small fullWidth onPress={nova} testID="chat-nova-sessao" />
        </View>
        <Text variant="caption" tone="muted" style={{ paddingHorizontal: spacing.md + 2, paddingVertical: spacing.xs, textTransform: 'uppercase' }}>Sessões anteriores</Text>
        <ScrollView {...rolagem.dataSet} onScroll={rolagem.aoRolar} scrollEventThrottle={32} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.md }}>
          {c.sessoes.length === 0 ? (
            <Text variant="caption" tone="muted" style={{ margin: spacing.sm + 2 }}>Quando você encerrar uma sessão, ela fica guardada aqui.</Text>
          ) : null}
          {c.sessoes.map((s) => {
            const ativa = s.id === selecionada;
            const andamento = c.tela === 'sessao' && s.id === c.ativaId;
            return (
              <Pressable
                key={s.id}
                onPress={() => escolher(s)}
                accessibilityRole="button"
                accessibilityState={{ selected: ativa }}
                testID={`chat-sessao-${s.id}`}
                style={({ pressed }) => ({
                  minHeight: 56,
                  justifyContent: 'center',
                  gap: 2,
                  paddingHorizontal: spacing.md - 4,
                  paddingVertical: spacing.sm + 2,
                  borderRadius: radius.md,
                  backgroundColor: ativa ? colors.surfaceAlt : 'transparent',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text numberOfLines={1}>{s.title || 'Sessão'}</Text>
                <Text variant="caption" tone="muted">{andamento ? 'em andamento' : quandoFoi(s.lastMessageAt)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ paddingHorizontal: spacing.md + 2, paddingVertical: spacing.md - 4, borderTopWidth: 1, borderTopColor: colors.separator }}>
          <Text variant="caption" tone="muted">A Pluma não substitui acompanhamento profissional.</Text>
        </View>
      </View>
    </SurfaceProvider>
  );
}

/** Telefone: a lista de sessões entra pela esquerda, sobre um véu. */
function Gaveta({ aberta, onFechar, children }: { aberta: boolean; onFechar: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const largura = Math.min(300, width * 0.84);
  const a = useSharedValue(0);
  useEffect(() => {
    a.value = withTiming(aberta ? 1 : 0, { duration: reduce ? 0 : 420, easing: Easing.bezier(0.3, 0.8, 0.3, 1) });
  }, [aberta, reduce, a]);
  const estiloVeu = useAnimatedStyle(() => ({ opacity: a.value }));
  const estiloPainel = useAnimatedStyle(() => ({ transform: [{ translateX: -(largura + 8) * (1 - a.value) }] }));

  return (
    <View pointerEvents={aberta ? 'auto' : 'none'} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} accessibilityElementsHidden={!aberta} importantForAccessibility={aberta ? 'auto' : 'no-hide-descendants'}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: colors.overlay }, estiloVeu]}>
        <Pressable style={{ flex: 1 }} onPress={onFechar} accessibilityRole="button" accessibilityLabel="Fechar sessões anteriores" />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, width: largura, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.separator }, estiloPainel]}>
        {children}
      </Animated.View>
    </View>
  );
}

// ------------------------------------------------------------ mensagens

function Avatar({ girando = false }: { girando?: boolean }) {
  const { colors } = useTheme();
  const reduce = useReduceMotion();
  const r = useSharedValue(0);
  useEffect(() => {
    if (!girando || reduce) return;
    r.value = withRepeat(withSequence(withTiming(8, { duration: 900 }), withTiming(-8, { duration: 900 })), -1, true);
  }, [girando, reduce, r]);
  const estilo = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={estilo}>
        <Icon name="pluma" size={15} strokeWidth={2.2} color={colors.primary} />
      </Animated.View>
    </View>
  );
}

function Mensagem({ m, digitando, onFim }: { m: MensagemChat; digitando: boolean; onFim: (id: string) => void }) {
  const { colors, spacing } = useTheme();

  if (m.tipo === 'divisor') {
    return (
      <FadeIn offset={6} duration={300} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, marginVertical: spacing.xs }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
        <Text variant="caption" tone="muted">{m.texto}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
      </FadeIn>
    );
  }

  if (m.tipo === 'user') {
    return (
      <FadeIn offset={10} duration={350} style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
        <View
          testID="chat-msg-user"
          style={{ backgroundColor: colors.primary, borderRadius: BALAO + 2, borderBottomRightRadius: CANTO + 2, borderCurve: 'continuous', paddingHorizontal: spacing.md - 2, paddingVertical: spacing.sm + 2 }}
        >
          <SurfaceProvider value={colors.primary}>
            <Text color={colors.onPrimary} style={{ whiteSpace: 'pre-wrap' } as object}>{m.texto}</Text>
          </SurfaceProvider>
        </View>
      </FadeIn>
    );
  }

  const digitar = !!m.digitar && digitando;
  return (
    <FadeIn offset={10} duration={350} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, maxWidth: '100%' }}>
      <Avatar />
      <View
        testID="chat-msg-bot"
        accessibilityLabel={m.texto}
        style={{
          maxWidth: '80%',
          flexShrink: 1,
          gap: spacing.sm + 2,
          backgroundColor: colors.surface,
          borderRadius: BALAO + 2,
          borderBottomLeftRadius: CANTO + 2,
          borderCurve: 'continuous',
          paddingHorizontal: spacing.md - 2,
          paddingVertical: spacing.sm + 2,
          borderWidth: m.crise ? 1.5 : 0,
          borderColor: colors.danger,
        }}
      >
        <SurfaceProvider value={colors.surface}>
          {digitar ? <TextoDigitado id={m.id} texto={m.texto} onFim={onFim} /> : <Text style={{ whiteSpace: 'pre-wrap' } as object}>{m.texto}</Text>}
          {m.crise && !digitar ? (
            <FadeIn>
              <View style={{ gap: spacing.sm }} testID="chat-crise">
                <Text variant="label" tone="danger">Ajuda agora</Text>
                {AJUDA_CRISE.map((a) => (
                  <Button key={a.url} label={a.label} variant="secondary" small fullWidth onPress={() => Linking.openURL(a.url)} />
                ))}
              </View>
            </FadeIn>
          ) : null}
        </SurfaceProvider>
      </View>
    </FadeIn>
  );
}

/** Digitação em ritmo fixo: um caractere a cada RITMO_SESSAO.DIGITAR_MS; o balão cresce junto com o texto. */
function TextoDigitado({ id, texto, onFim }: { id: string; texto: string; onFim: (id: string) => void }) {
  const reduce = useReduceMotion();
  const [n, setN] = useState(reduce ? texto.length : 0);
  const fim = n >= texto.length;

  useEffect(() => {
    if (fim) return;
    const iv = setInterval(() => setN((x) => Math.min(x + 1, texto.length)), RITMO_SESSAO.DIGITAR_MS);
    return () => clearInterval(iv);
  }, [fim, texto.length]);

  useEffect(() => {
    if (fim) onFim(id);
  }, [fim, id, onFim]);

  return (
    <Text style={{ whiteSpace: 'pre-wrap' } as object}>
      {texto.slice(0, n)}
      {!fim ? <Cursor /> : null}
    </Text>
  );
}

function Cursor() {
  const { colors } = useTheme();
  const reduce = useReduceMotion();
  const v = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    v.value = withRepeat(withSequence(withTiming(0, { duration: 1 }), withDelay(450, withTiming(1, { duration: 1 })), withDelay(450, withTiming(1, { duration: 1 }))), -1);
  }, [reduce, v]);
  const estilo = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View style={[{ width: 2, height: 17, marginLeft: 2, transform: [{ translateY: 3 }], backgroundColor: colors.text }, estilo]} />;
}

/** "Pensando": a pena balança e os trocadilhos de psicologia se revezam. */
function Pensando({ atraso }: { atraso: number }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * PALAVRAS_PENSANDO.length));
  useEffect(() => {
    const iv = setInterval(() => setI((x) => (x + 1 + Math.floor(Math.random() * 3)) % PALAVRAS_PENSANDO.length), RITMO_SESSAO.PALAVRA_MS);
    return () => clearInterval(iv);
  }, []);
  const { spacing } = useTheme();
  return (
    <FadeIn delay={atraso} offset={8} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, minHeight: 28 }}>
      <View accessibilityLiveRegion="polite" accessibilityLabel="A Pluma está pensando" testID="chat-pensando" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 }}>
        <Avatar girando />
        <FadeIn key={i} offset={7} duration={450}>
          <Text variant="caption" tone="muted" style={{ fontStyle: 'italic' }}>{PALAVRAS_PENSANDO[i]}</Text>
        </FadeIn>
      </View>
    </FadeIn>
  );
}

// ------------------------------------------------------------ botões

function BotaoPequeno({ icone, label, onPress, disabled, testID }: { icone: 'reiniciar'; label: string; onPress: () => void; disabled?: boolean; testID?: string }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={({ pressed }) => ({
        minHeight: 32,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 2,
        paddingHorizontal: spacing.md - 4,
        borderRadius: radius.xl,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.border,
        opacity: disabled ? 0.45 : pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icone} size={14} strokeWidth={2} />
      <Text variant="caption">{label}</Text>
    </Pressable>
  );
}

function BotaoIcone({ icone, label, onPress, cor, testID }: { icone: 'menu' | 'fechar' | 'apagar'; label: string; onPress: () => void; cor?: string; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
    >
      <Icon name={icone} size={22} color={cor} />
    </Pressable>
  );
}
