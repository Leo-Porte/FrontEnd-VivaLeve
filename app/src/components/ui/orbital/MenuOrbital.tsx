import { BlurView } from 'expo-blur';
import { usePathname, useRouter, type Href } from 'expo-router';
import { ChevronUp, Feather } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, View, useWindowDimensions, type GestureResponderEvent, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useSession } from '@/controllers/useSession';
import { SurfaceProvider, menu, useTheme, type MenuDestino } from '@/theme';
import { useReduceMotion } from '../motion';
import { useNavChrome } from '../navChrome';
import { Text } from '../Text';
import { IconeOrbital, type IconeOrbitalId } from './IconesOrbitais';

/**
 * Menu orbital: uma bolinha flutuante com a pluma. Ao tocar, a tela desfoca e os destinos orbitam
 * o centro (inspirado na roda de seleção dos jogos).
 * - Telefone/tablet: bolinha embaixo, no centro. Desktop: bolinha no canto inferior direito.
 * - Mouse: apontar na direção de um item já o seleciona (a fatia acende e o centro mostra o nome); clicar navega.
 * - Toque: tocar no item navega. Teclado (web): setas giram, Enter abre, Esc fecha. Android: voltar fecha.
 * - Mouse parado 3 s num item (janela larga): a roda desliza para a esquerda e um painel à direita
 *   explica o módulo. Passar sobre outra bolinha troca o painel; voltar ao centro da roda fecha.
 */

export interface ItemMenu {
  key: MenuDestino;
  icone: IconeOrbitalId;
  label: string;
  dica: string;
  /** explicação do módulo no painel de detalhe */
  sobre: string;
  /** o que dá pra fazer lá (até 3 linhas curtas) */
  destaques: readonly string[];
  href?: string;
  acao?: 'sair';
}

export const ITENS_MENU: readonly ItemMenu[] = [
  {
    key: 'home', icone: 'inicio', label: 'Início', dica: 'Voltar pra casa', href: '/',
    sobre: 'Seu ponto de partida. Mostra como está o seu dia e deixa à mão o que você mais usa.',
    destaques: ['Ver se já registrou o humor hoje', 'Atalhos para diário, respiração e conversa', 'Rede de apoio, com o CVV a um toque'],
  },
  {
    key: 'humor', icone: 'humor', label: 'Humor', dica: 'Como você está agora?', href: '/humor',
    sobre: 'Registre como você está em poucos segundos. Notar o que se sente é o primeiro passo do cuidado.',
    destaques: ['Escolher a emoção do momento', 'Marcar o que você fez no dia', 'Deixar uma nota, se quiser'],
  },
  {
    key: 'diario', icone: 'diario', label: 'Diário', dica: 'Escrever o que sente', href: '/diario',
    sobre: 'Um lugar só seu para colocar no papel o que está na cabeça, sem regra e sem pressa.',
    destaques: ['Escrever entradas com título', 'Marcar como você se sentiu', 'Buscar no que já escreveu'],
  },
  {
    key: 'historico', icone: 'historico', label: 'Histórico', dica: 'Ver seus padrões', href: '/historico',
    sobre: 'Sua evolução ao longo do tempo. Ajuda a perceber padrões que passam despercebidos no dia a dia.',
    destaques: ['Gráfico do humor em 7 ou 30 dias', 'Emoção predominante do período', 'Sequência de dias registrando'],
  },
  {
    key: 'respirar', icone: 'respirar', label: 'Respirar', dica: 'Uma pausa guiada', href: '/respirar',
    sobre: 'Um exercício guiado para quando a ansiedade apertar ou você só precisar de uma pausa.',
    destaques: ['Técnica 3-4-5: inspire, segure, expire', 'Animação que acompanha o ritmo', 'Contagem de sessões e minutos'],
  },
  {
    key: 'chat', icone: 'conversar', label: 'Sessão', dica: 'Uma sessão com a Pluma', href: '/chat',
    sobre: 'Uma sessão com a Pluma para desabafar ou organizar o que você está sentindo.',
    destaques: ['Uma escuta a qualquer hora', 'Retomar sessões anteriores', 'Em emergência, ligue para o CVV: 188'],
  },
  {
    key: 'config', icone: 'config', label: 'Ajustes', dica: 'Do seu jeito', href: '/config',
    sobre: 'Deixe a Pluma do seu jeito e cuide dos seus dados.',
    destaques: ['Tema claro, escuro ou do sistema', 'Ajuda, feedback e privacidade', 'Apagar seus registros'],
  },
  {
    key: 'sair', icone: 'sair', label: 'Sair', dica: 'Até logo', acao: 'sair',
    sobre: 'Encerra a sessão neste aparelho. Seus registros continuam guardados na sua conta.',
    destaques: ['Volta para a tela de entrada', 'Nada é apagado'],
  },
];

const GATILHO = 64;
const MARGEM = 14;
/** tempo com o mouse parado num item até abrir o painel de detalhe */
const ESPERA_DETALHE = 3000;
/** largura mínima da janela para caber roda + painel */
const JANELA_DETALHE = 900;
const PAINEL = 360;
const PASSO = 360 / ITENS_MENU.length;
/** curva com leve passada do ponto (efeito mola); criada sob demanda */
const mola = () => Easing.bezier(0.34, 1.56, 0.64, 1);

const isActive = (pathname: string, href?: string) =>
  !!href && (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'));

const clamp = (min: number, v: number, max: number) => Math.max(min, Math.min(max, v));

/** Mouse fino com hover (desktop web): rótulos só no item apontado, o nome aparece no centro. */
function temMouse(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export interface MenuOrbitalProps {
  /** desktop: bolinha no canto inferior direito em vez de embaixo no centro */
  lateral: boolean;
}

export function MenuOrbital({ lateral }: MenuOrbitalProps) {
  const { colors, scheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { sair } = useSession();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const { setEspacoInferior, menuOculto, menuRecolhido } = useNavChrome();
  // telefone com a tela pedindo espaço: a bolinha afunda e fica só a alça
  const recolhido = menuRecolhido && !lateral;

  const [aberto, setAberto] = useState(false);
  const [montado, setMontado] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const [detalhe, setDetalhe] = useState(false);
  const fechando = useRef<ReturnType<typeof setTimeout> | null>(null);

  // medidas da roda a partir do menor lado da janela
  const m = Math.min(width, height);
  const raio = Math.min(m * 0.34, 200);
  const bolha = clamp(58, m * 0.15, 78);
  const centro = clamp(112, m * 0.27, 150);
  const mouse = useMemo(temMouse, []);

  const base = Math.max(insets.bottom, MARGEM);

  // painel de detalhe: a roda desliza para a esquerda e o painel ocupa a direita
  const cabeDetalhe = mouse && width >= JANELA_DETALHE;
  const deslocamento = detalhe ? -Math.min(width * 0.17, 220) : 0;
  const centroX = width / 2 + deslocamento;

  // as telas reservam espaço no fim da rolagem para o conteúdo não ficar atrás da bolinha
  useEffect(() => {
    setEspacoInferior(recolhido ? ALCA.altura + insets.bottom : GATILHO + base + 8);
    return () => setEspacoInferior(0);
  }, [base, recolhido, insets.bottom, setEspacoInferior]);

  const abrir = useCallback(() => {
    if (fechando.current) clearTimeout(fechando.current);
    setAtivo(-1);
    setDetalhe(false);
    setMontado(true);
    setAberto(true);
  }, []);

  const fechar = useCallback(() => {
    setAberto(false);
    setDetalhe(false);
    fechando.current = setTimeout(() => setMontado(false), reduce ? 0 : 320);
  }, [reduce]);

  useEffect(() => () => {
    if (fechando.current) clearTimeout(fechando.current);
  }, []);

  const executar = useCallback(
    async (i: number) => {
      const item = ITENS_MENU[i];
      if (!item) return;
      fechar();
      if (item.acao === 'sair') {
        await sair();
        router.replace('/login');
        return;
      }
      if (item.href && !isActive(pathname, item.href)) router.navigate(item.href as Href);
    },
    [fechar, sair, router, pathname],
  );

  // Mouse descansando no mesmo item por 3 s abre o painel; sem item apontado, o painel fecha
  useEffect(() => {
    if (!aberto || !cabeDetalhe || ativo < 0) {
      setDetalhe(false);
      return;
    }
    if (detalhe) return;
    const t = setTimeout(() => setDetalhe(true), ESPERA_DETALHE);
    return () => clearTimeout(t);
  }, [aberto, cabeDetalhe, ativo, detalhe]);

  // Android: voltar fecha a roda
  useEffect(() => {
    if (!aberto || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      fechar();
      return true;
    });
    return () => sub.remove();
  }, [aberto, fechar]);

  // Web: Esc fecha, setas giram, Enter abre o item
  useEffect(() => {
    if (!aberto || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const n = ITENS_MENU.length;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        fechar();
      } else if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        const passo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
        setAtivo((a) => (a < 0 ? (passo > 0 ? 0 : n - 1) : (a + passo + n) % n));
      } else if (e.key === 'Enter' && ativo >= 0) {
        e.preventDefault();
        executar(ativo);
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto, ativo, fechar, executar]);

  // Roda: a direção do mouse em relação ao centro da tela escolhe o item
  const aoMoverPonteiro = useCallback(
    (e: { nativeEvent: { clientX?: number; clientY?: number; pageX?: number; pageY?: number; pointerType?: string } }) => {
      const ev = e.nativeEvent;
      if (ev.pointerType && ev.pointerType !== 'mouse') return;
      const x = ev.clientX ?? ev.pageX ?? 0;
      const y = ev.clientY ?? ev.pageY ?? 0;
      const dx = x - centroX;
      const dy = y - height / 2;
      const dist = Math.hypot(dx, dy);
      if (dist < centro / 2) return setAtivo(-1);
      // com o painel aberto, a fatia não segue mais o mouse: assim dá pra ir até o painel sem trocar de item
      // no caminho. Trocar de item passa a ser em cima da bolinha (onHoverIn); voltar ao centro fecha.
      if (detalhe) return;
      if (dist > raio + bolha / 2 + 70) return setAtivo(-1);
      const graus = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
      setAtivo(Math.round(graus / PASSO) % ITENS_MENU.length);
    },
    [centroX, height, centro, raio, bolha, detalhe],
  );

  // clique no fundo: dentro da roda vale a fatia apontada; longe dela, fecha
  const aoTocarFundo = useCallback(
    (e: GestureResponderEvent) => {
      const { pageX, pageY } = e.nativeEvent;
      const dist = Math.hypot(pageX - centroX, pageY - height / 2);
      if (mouse && ativo >= 0 && dist <= raio + bolha / 2 + 70) return executar(ativo);
      fechar();
    },
    [mouse, ativo, centroX, height, raio, bolha, executar, fechar],
  );

  const item = ativo >= 0 ? ITENS_MENU[ativo] : null;

  return (
    <>
      <Gatilho lateral={lateral} base={base} escondido={aberto || menuOculto} recolhido={recolhido} onPress={abrir} />
      {!lateral ? <Alca visivel={recolhido && !aberto && !menuOculto} base={insets.bottom} onPress={abrir} /> : null}

      {montado ? (
        <View
          style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 100 }}
          accessibilityViewIsModal
          onPointerMove={mouse ? aoMoverPonteiro : undefined}
        >
          <Fundo aberto={aberto} escuro={scheme === 'dark'} onPress={aoTocarFundo} />

          <Deslizante deslocamento={deslocamento}>
            <View pointerEvents="box-none" style={{ width: raio * 2 + bolha, height: raio * 2 + bolha }}>
              <Trilho aberto={aberto} raio={raio} bolha={bolha} cor={colors.primary} />
              <Ponteiro ativo={ativo} raio={raio} bolha={bolha} centro={centro} cor={colors.primary} />

              {ITENS_MENU.map((it, i) => (
                <BolhaItem
                  key={it.key}
                  item={it}
                  indice={i}
                  aberto={aberto}
                  ativo={i === ativo}
                  atual={isActive(pathname, it.href)}
                  raio={raio}
                  bolha={bolha}
                  mostrarRotulo={!mouse || i === ativo}
                  onApontar={() => setAtivo(i)}
                  onPress={() => executar(i)}
                />
              ))}

              <Centro
                aberto={aberto}
                tamanho={centro}
                titulo={item?.label ?? 'Pluma'}
                dica={item?.dica ?? 'Pra onde vamos?'}
                onPress={fechar}
              />
            </View>
          </Deslizante>

          {item && cabeDetalhe ? (
            <PainelDetalhe
              visivel={detalhe}
              item={item}
              esquerda={centroX + raio + bolha / 2 + 56}
              largura={Math.min(PAINEL, width - (centroX + raio + bolha / 2 + 56) - 32)}
              onPress={() => executar(ativo)}
            />
          ) : null}
        </View>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------ deslize da roda

function Deslizante({ deslocamento, children }: { deslocamento: number; children: React.ReactNode }) {
  const reduce = useReduceMotion();
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withTiming(deslocamento, { duration: reduce ? 0 : 450, easing: Easing.out(Easing.cubic) });
  }, [deslocamento, reduce, x]);
  const estilo = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }, estilo]}
    >
      {children}
    </Animated.View>
  );
}

// ------------------------------------------------------------ painel de detalhe

function PainelDetalhe({ visivel, item, esquerda, largura, onPress }: { visivel: boolean; item: ItemMenu; esquerda: number; largura: number; onPress: () => void }) {
  const { colors, spacing, radius } = useTheme();
  const reduce = useReduceMotion();
  const p = useSharedValue(0);
  const cor = menu.cores[item.key];

  useEffect(() => {
    p.value = withTiming(visivel ? 1 : 0, { duration: reduce ? 0 : visivel ? 420 : 200, easing: Easing.out(Easing.cubic) });
  }, [visivel, reduce, p]);

  const estilo = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateX: 24 * (1 - p.value) }] }));

  return (
    <Animated.View
      pointerEvents={visivel ? 'auto' : 'none'}
      style={[{ position: 'absolute', left: esquerda, width: largura, top: 0, bottom: 0, justifyContent: 'center' }, estilo]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole={item.href ? 'link' : 'button'}
        accessibilityLabel={`${item.label}. ${item.sobre}`}
        testID="nav-detalhe"
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          padding: spacing.lg,
          gap: spacing.md,
          boxShadow: menu.sombra.centro, // slop:ok sombra navegação flutuante
        }}
      >
        <SurfaceProvider value={colors.surface}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: cor, alignItems: 'center', justifyContent: 'center' }}>
              <IconeOrbital id={item.icone} size={28} color={menu.sobreCor} destaque={cor} ativo={visivel} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title" numberOfLines={1}>{item.label}</Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>{item.dica}</Text>
            </View>
          </View>

          <Text variant="body">{item.sobre}</Text>

          <View style={{ gap: spacing.sm }}>
            {item.destaques.map((d) => (
              <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cor }} />
                <Text variant="body" style={{ flex: 1 }}>{d}</Text>
              </View>
            ))}
          </View>

          <Text variant="caption" tone="muted">{item.acao === 'sair' ? 'Clique para sair' : 'Clique para abrir'}</Text>
        </SurfaceProvider>
      </Pressable>
    </Animated.View>
  );
}

// ------------------------------------------------------------ bolinha flutuante

function Gatilho({ lateral, base, escondido, recolhido, onPress }: { lateral: boolean; base: number; escondido: boolean; recolhido: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const reduce = useReduceMotion();
  const boia = useSharedValue(0);
  const vis = useSharedValue(1);
  const afunda = useSharedValue(0);
  const fundo = GATILHO + base + 24;

  useEffect(() => {
    afunda.value = withTiming(recolhido ? fundo : 0, { duration: reduce ? 0 : 600, easing: Easing.bezier(0.65, 0, 0.25, 1) });
  }, [recolhido, fundo, reduce, afunda]);

  useEffect(() => {
    if (reduce) return;
    boia.value = withRepeat(withTiming(-5, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce, boia]);

  useEffect(() => {
    vis.value = withTiming(escondido ? 0 : 1, { duration: reduce ? 0 : 260, easing: mola() });
  }, [escondido, reduce, vis]);

  const estilo = useAnimatedStyle(() => ({
    opacity: vis.value,
    transform: [{ translateY: boia.value + afunda.value }, { scale: 0.4 + 0.6 * vis.value }],
  }));

  const posicao = lateral
    ? { right: 20, bottom: base }
    : { left: 0, right: 0, bottom: base, alignItems: 'center' as const };

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', ...posicao }}>
      <Animated.View style={estilo}>
        <Pressable
          onPress={onPress}
          disabled={escondido || recolhido}
          accessibilityRole="button"
          accessibilityLabel="Abrir menu"
          accessibilityElementsHidden={recolhido}
          importantForAccessibility={recolhido ? 'no-hide-descendants' : 'auto'}
          accessibilityState={{ expanded: escondido }}
          testID="nav-abrir"
          style={{
            width: GATILHO,
            height: GATILHO,
            borderRadius: GATILHO / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            boxShadow: menu.sombra.gatilho, // slop:ok sombra navegação flutuante
          }}
        >
          <Feather size={28} color={colors.onPrimary} strokeWidth={2} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ------------------------------------------------------------ alça (bolinha afundada)

const ALCA = { largura: 72, altura: 26 } as const;

/** Com a bolinha afundada, sobra esta alça no rodapé; tocar (ou puxar para cima) já abre a roda. */
function Alca({ visivel, base, onPress }: { visivel: boolean; base: number; onPress: () => void }) {
  const { colors, radius } = useTheme();
  const reduce = useReduceMotion();
  const p = useSharedValue(visivel ? 1 : 0);

  useEffect(() => {
    // sobe depois que a bolinha já afundou; some na hora
    p.value = visivel ? withDelay(reduce ? 0 : 350, withTiming(1, { duration: reduce ? 0 : 300, easing: mola() })) : withTiming(0, { duration: reduce ? 0 : 150 });
  }, [visivel, reduce, p]);

  const estilo = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * (ALCA.altura + base) }] }));

  return (
    <Animated.View pointerEvents={visivel ? 'box-none' : 'none'} style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' }, estilo]}>
      <Pressable
        onPress={onPress}
        onTouchMove={(e) => {
          // puxar para cima também abre
          if (e.nativeEvent.locationY < -12) onPress();
        }}
        hitSlop={{ top: 12, left: 16, right: 16 }}
        accessibilityRole="button"
        accessibilityLabel="Abrir menu"
        accessibilityElementsHidden={!visivel}
        testID="nav-alca"
        style={({ pressed }) => ({
          width: ALCA.largura,
          height: ALCA.altura + base,
          paddingBottom: base,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: colors.separator,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <ChevronUp size={20} color={colors.textMuted} strokeWidth={2.4} />
      </Pressable>
    </Animated.View>
  );
}

// ------------------------------------------------------------ fundo desfocado

function Fundo({ aberto, escuro, onPress }: { aberto: boolean; escuro: boolean; onPress: (e: GestureResponderEvent) => void }) {
  const reduce = useReduceMotion();
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withTiming(aberto ? 1 : 0, { duration: reduce ? 0 : 320 });
  }, [aberto, reduce, o]);
  const estilo = useAnimatedStyle(() => ({ opacity: o.value }));
  const veu = menu.veu[escuro ? 'dark' : 'light'];

  // web: o desfoque mora na própria camada que anima a opacidade. Num filho ele não pegaria nada,
  // porque um ancestral com opacidade < 1 isola o que está atrás (backdrop root).
  const desfoqueWeb = { backdropFilter: 'blur(16px) saturate(115%)', WebkitBackdropFilter: 'blur(16px) saturate(115%)' } as ViewStyle;

  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }, Platform.OS === 'web' && desfoqueWeb, estilo]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Fechar menu" style={{ flex: 1 }}>
        {Platform.OS === 'web' ? (
          <View style={{ flex: 1, backgroundColor: veu }} />
        ) : (
          <BlurView intensity={40} tint={escuro ? 'dark' : 'light'} blurMethod="dimezisBlurView" style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: veu }} />
          </BlurView>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ------------------------------------------------------------ trilho e ponteiro

function Trilho({ aberto, raio, bolha, cor }: { aberto: boolean; raio: number; bolha: number; cor: string }) {
  const reduce = useReduceMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(aberto ? 1 : 0, { duration: reduce ? 0 : 600, easing: mola() });
  }, [aberto, reduce, p]);
  const estilo = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value),
    transform: [{ scale: 0.6 + 0.4 * p.value }, { rotate: `${-40 + 40 * p.value}deg` }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: bolha / 2,
          top: bolha / 2,
          width: raio * 2,
          height: raio * 2,
          borderRadius: raio,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: cor,
          opacity: 0.3,
        },
        estilo,
      ]}
    />
  );
}

/** Caminho de uma fatia de anel centrada no topo (±meio passo), em coordenadas de uma caixa 2R×2R. */
function fatia(R: number, r: number): string {
  const a0 = ((-90 - PASSO / 2) * Math.PI) / 180;
  const a1 = ((-90 + PASSO / 2) * Math.PI) / 180;
  const p = (rad: number, a: number) => `${R + rad * Math.cos(a)} ${R + rad * Math.sin(a)}`;
  return `M ${p(r, a0)} L ${p(R, a0)} A ${R} ${R} 0 0 1 ${p(R, a1)} L ${p(r, a1)} A ${r} ${r} 0 0 0 ${p(r, a0)} Z`;
}

function Ponteiro({ ativo, raio, bolha, centro, cor }: { ativo: number; raio: number; bolha: number; centro: number; cor: string }) {
  const reduce = useReduceMotion();
  const R = raio + bolha / 2 + 10;
  const angulo = useSharedValue(0);
  const vis = useSharedValue(0);
  const acumulado = useRef<number | null>(null);

  useEffect(() => {
    vis.value = withTiming(ativo >= 0 ? 1 : 0, { duration: 200 });
    if (ativo < 0) return;
    // gira sempre pelo caminho curto (de 315° para 0° anda +45°, não −315°)
    const alvo = ativo * PASSO;
    if (acumulado.current === null) acumulado.current = alvo;
    else acumulado.current += ((((alvo - acumulado.current) % 360) + 540) % 360) - 180;
    angulo.value = withTiming(acumulado.current, { duration: reduce ? 0 : 350, easing: mola() });
  }, [ativo, reduce, angulo, vis]);

  const estilo = useAnimatedStyle(() => ({ opacity: vis.value, transform: [{ rotate: `${angulo.value}deg` }] }));
  const caixa = 2 * R;
  const d = useMemo(() => fatia(R, centro / 2 + 2), [R, centro]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: raio + bolha / 2 - R, top: raio + bolha / 2 - R, width: caixa, height: caixa }, estilo]}
    >
      <Svg width={caixa} height={caixa}>
        <Path d={d} fill={cor} opacity={0.18} />
      </Svg>
    </Animated.View>
  );
}

// ------------------------------------------------------------ bolinhas da órbita

interface BolhaItemProps {
  item: ItemMenu;
  indice: number;
  aberto: boolean;
  ativo: boolean;
  atual: boolean;
  raio: number;
  bolha: number;
  mostrarRotulo: boolean;
  onApontar: () => void;
  onPress: () => void;
}

function BolhaItem({ item, indice, aberto, ativo, atual, raio, bolha, mostrarRotulo, onApontar, onPress }: BolhaItemProps) {
  const { colors } = useTheme();
  const reduce = useReduceMotion();
  const p = useSharedValue(0);
  const realce = useSharedValue(0);
  const ang = ((-90 + PASSO * indice) * Math.PI) / 180;
  const dx = Math.cos(ang) * raio;
  const dy = Math.sin(ang) * raio;

  // sai do centro para a órbita, um depois do outro
  useEffect(() => {
    p.value = aberto
      ? withDelay(reduce ? 0 : indice * 35, withTiming(1, { duration: reduce ? 0 : 550, easing: mola() }))
      : withTiming(0, { duration: reduce ? 0 : 220 });
  }, [aberto, indice, reduce, p]);

  useEffect(() => {
    realce.value = withTiming(ativo ? 1 : 0, { duration: reduce ? 0 : 320, easing: mola() });
  }, [ativo, reduce, realce]);

  const posicao = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 2),
    transform: [{ translateX: dx * p.value }, { translateY: dy * p.value }, { scale: 0.3 + 0.7 * p.value }],
  }));
  const escala = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.18 * realce.value }] }));

  const cor = menu.cores[item.key];
  const fundo = ativo ? cor : colors.surface;
  const traco = ativo ? menu.sobreCor : colors.text;

  return (
    <Animated.View
      style={[{ position: 'absolute', left: raio, top: raio, width: bolha, height: bolha, zIndex: ativo ? 2 : 1 }, posicao]}
    >
      <Pressable
        onPress={onPress}
        onHoverIn={onApontar}
        onFocus={onApontar}
        accessibilityRole={item.href ? 'link' : 'button'}
        accessibilityLabel={item.label}
        accessibilityHint={item.dica}
        accessibilityState={{ selected: atual }}
        testID={`nav-${item.key}`}
        style={{ width: bolha, height: bolha }}
      >
        <Animated.View
          style={[
            {
              width: bolha,
              height: bolha,
              borderRadius: bolha / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: fundo,
              borderWidth: atual ? 3 : 1,
              borderColor: cor,
              boxShadow: ativo ? menu.sombra.apontado(cor) : menu.sombra.item, // slop:ok sombra navegação flutuante
            },
            escala,
          ]}
        >
          <IconeOrbital id={item.icone} size={Math.round(bolha * 0.46)} color={traco} destaque={cor} ativo={ativo} />
        </Animated.View>
        {mostrarRotulo ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: bolha + 8, left: -30, right: -30, alignItems: 'center' }}>
            <SurfaceProvider value={colors.bg}>
              <Text variant="caption" numberOfLines={1} style={{ fontWeight: '600', opacity: ativo ? 1 : 0.75 }}>
                {item.label}
              </Text>
            </SurfaceProvider>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

// ------------------------------------------------------------ centro da roda

function Centro({ aberto, tamanho, titulo, dica, onPress }: { aberto: boolean; tamanho: number; titulo: string; dica: string; onPress: () => void }) {
  const { colors } = useTheme();
  const reduce = useReduceMotion();
  const p = useSharedValue(0);
  const balanco = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(aberto ? 1 : 0, { duration: reduce ? 0 : 450, easing: mola() });
  }, [aberto, reduce, p]);

  useEffect(() => {
    if (reduce) return;
    balanco.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce, balanco]);

  const estilo = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value), transform: [{ scale: 0.5 + 0.5 * p.value }] }));
  const pluma = useAnimatedStyle(() => ({
    transform: [{ translateY: -3 * balanco.value }, { rotate: `${-8 + 16 * balanco.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: '50%', top: '50%', width: tamanho, height: tamanho, marginLeft: -tamanho / 2, marginTop: -tamanho / 2, zIndex: 3 },
        estilo,
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Fechar menu"
        testID="nav-fechar"
        style={{
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          padding: 12,
          boxShadow: menu.sombra.centro, // slop:ok sombra navegação flutuante
        }}
      >
        <Animated.View style={pluma}>
          <Feather size={24} color={colors.primary} strokeWidth={2} />
        </Animated.View>
        <SurfaceProvider value={colors.surface}>
          <Text variant="subtitle" align="center" numberOfLines={1}>
            {titulo}
          </Text>
          <Text variant="caption" tone="muted" align="center" numberOfLines={2}>
            {dica}
          </Text>
        </SurfaceProvider>
      </Pressable>
    </Animated.View>
  );
}
