import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Easing } from 'react-native-reanimated';

import {
  Button, EmotionPicker, Icon, iconeDe, ListRow, ListSection, Screen, Text, useNavChrome, useReduceMotion,
} from '@/components/ui';
import { timing } from '@/components/ui/motion';
import { abrirLink } from '@/controllers/abrirLink';
import { useAbertura } from '@/controllers/useAbertura';
import { ICONE_APOIO, useHomeController, type DiaDaSemana } from '@/controllers/useHomeController';
import { CVV_TELEFONE } from '@/entities/catalogo';
import type { MoodLog } from '@/models';
import { emotionColors, ensureContrast, getEmotion, useTheme } from '@/theme';
import { AberturaHome, type NoNativo } from './AberturaHome';
import { Astro } from './Astro';

const AVISO =
  'A Pluma é uma ferramenta de apoio emocional e não substitui acompanhamento profissional. Se você está passando por uma crise, procure ajuda especializada.';

function dataExtenso(): string {
  const t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function hora(r: MoodLog): string {
  const d = new Date(r.createdAt);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Home enxuta: uma coluna estreita, três blocos no mesmo formato (cabeçalho curto + grupo).
 * 1. Hoje: registrar com um toque (abre o Humor já com a emoção) ou ver o dia e a semana.
 * 2. Para agora: uma sugestão só, conforme o humor de hoje.
 * 3. Apoio: "Ligar 188" sempre à vista; o resto da rede de apoio sob "Mais apoio".
 * Os atalhos de navegação ficam no menu orbital; privacidade fica em Ajustes.
 * Na primeira entrada do dia toca a abertura (AberturaHome); o sol/lua do cabeçalho repete.
 */
export function HomeScreen() {
  const c = useHomeController();
  const { colors, spacing } = useTheme();
  const { setMenuOculto } = useNavChrome();
  // /?abertura=1 força a abertura mesmo já vista hoje
  const { abertura: forcarAbertura } = useLocalSearchParams<{ abertura?: string }>();
  const ab = useAbertura(forcarAbertura === '1');
  const alvo = useRef<NoNativo>(null);
  // a Home aparece quando a abertura acaba, ou já no voo do sol/lua (onRevelar)
  const [revelado, setRevelado] = useState(ab.estado === 'fim');

  useEffect(() => {
    if (ab.estado === 'fim') setRevelado(true);
    if (ab.estado === 'tocando') setRevelado(false);
  }, [ab.estado, ab.rodada]);

  useEffect(() => {
    setMenuOculto(!revelado);
    return () => setMenuOculto(false);
  }, [revelado, setMenuOculto]);

  const saudacao = c.saudacao.texto.replace(/!$/, '');
  const data = dataExtenso();

  return (
    <View style={{ flex: 1 }}>
      <Screen width="narrow">
        <Revelar visivel={revelado} ordem={0}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Pressable
              ref={alvo}
              onPress={ab.repetir}
              accessibilityRole="button"
              accessibilityLabel="Ver a abertura de novo"
              testID="home-astro"
              hitSlop={10}
              style={{ width: 22, height: 22, opacity: ab.estado === 'fim' ? 1 : 0 }}
            >
              <Astro periodo={c.periodo} tamanho={22} />
            </Pressable>
            <Text variant="caption" tone="muted">{data}</Text>
          </View>
          <Text variant="display" testID="home-saudacao">{saudacao}</Text>
          <Text tone="muted" style={{ fontStyle: 'italic' }} testID="home-frase">
            {`“${c.frase.text}” — ${c.frase.author}`}
          </Text>
        </Revelar>

        <Revelar visivel={revelado} ordem={1}>
          <ListSection header="Hoje" testID="home-hero">
            {c.registroHoje ? <HojeRegistrado r={c.registroHoje} semana={c.semana} /> : <HojeVazio />}
          </ListSection>
        </Revelar>

        <Revelar visivel={revelado} ordem={2}>
          <ParaAgora sugestao={c.sugestao} />
        </Revelar>

        <Revelar visivel={revelado} ordem={3}>
          <Apoio c={c} />
        </Revelar>
      </Screen>

      {ab.estado === 'decidindo' ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: colors.bg }} />
      ) : null}
      {ab.estado === 'tocando' ? (
        <AberturaHome
          key={ab.rodada}
          saudacao={saudacao}
          frase={c.frase}
          data={data}
          periodo={c.periodo}
          alvo={alvo}
          onRevelar={() => setRevelado(true)}
          onTerminar={ab.terminar}
        />
      ) : null}
    </View>
  );
}

/** Entrada em cascata da Home quando a abertura libera (sobe 10 px e aparece, sem mola). */
function Revelar({ visivel, ordem, children }: { visivel: boolean; ordem: number; children: React.ReactNode }) {
  const reduce = useReduceMotion();
  return (
    <MotiView
      animate={{ opacity: visivel ? 1 : 0, translateY: visivel || reduce ? 0 : 10 }}
      transition={{ type: 'timing', duration: reduce ? 0 : 900, delay: visivel && !reduce ? ordem * 200 : 0, easing: reduce ? undefined : Easing.bezier(0.22, 1, 0.36, 1) } as never}
    >
      {children}
    </MotiView>
  );
}

// ------------------------------------------------------------ Hoje

function HojeVazio() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  return (
    <View style={{ padding: spacing.md, gap: spacing.md }}>
      <View style={{ gap: 2 }}>
        <Text variant="subtitle">Como você está agora?</Text>
        <Text variant="caption" tone="muted">Escolha uma para registrar. A nota fica para depois, se quiser.</Text>
      </View>
      <EmotionPicker
        value={null}
        columns={{ compact: 3, medium: 6 }}
        minHeight={76}
        iconSize={26}
        cellColor={colors.surfaceAlt}
        onChange={(_id, mood) => router.navigate({ pathname: '/humor', params: { emocao: mood } } as Href)}
      />
    </View>
  );
}

function HojeRegistrado({ r, semana }: { r: MoodLog; semana: DiaDaSemana[] }) {
  const router = useRouter();
  const { colors, spacing, scheme } = useTheme();
  const reduce = useReduceMotion();
  const e = getEmotion(r.mood);
  const ec = emotionColors(e, scheme);

  return (
    <View style={{ padding: spacing.md, gap: spacing.md + 4 }} testID="home-hoje-registrado">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 6 }}>
        <MotiView
          from={{ scale: reduce ? 1 : 0.5, opacity: reduce ? 1 : 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={timing(reduce ? 0 : 380)}
          style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: ec.fill, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name={iconeDe(e.id)} size={28} color={ec.onFill} />
        </MotiView>
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="muted">{`Hoje, às ${hora(r)}`}</Text>
          <Text variant="title">{`Você está ${e.label.toLowerCase()}`}</Text>
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" tone="muted">Sua semana</Text>
        <View accessibilityRole="list" accessibilityLabel="Humor dos últimos 7 dias" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {semana.map((d) => {
            const de = d.mood ? emotionColors(getEmotion(d.mood), scheme) : null;
            return (
              <View
                key={d.dia}
                accessible
                accessibilityLabel={`${d.nome}: ${d.mood ? getEmotion(d.mood).label : 'sem registro'}`}
                style={{ alignItems: 'center', gap: spacing.xs + 2, flex: 1 }}
                testID={`home-semana-${d.dia}`}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: de ? de.fill : 'transparent',
                    borderWidth: de ? 0 : 2,
                    borderStyle: 'dashed',
                    borderColor: colors.separator,
                  }}
                />
                <Text variant="caption" tone={d.hoje ? 'default' : 'muted'} style={d.hoje ? { fontWeight: '600' } : undefined}>{d.rotulo}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <Button label="Registrar outro momento" variant="secondary" small onPress={() => router.navigate('/humor')} testID="home-registrar" />
        <Button label="Ver histórico" variant="ghost" small onPress={() => router.navigate('/historico')} testID="home-historico" />
      </View>
    </View>
  );
}

// ------------------------------------------------------------ Para agora

function ParaAgora({ sugestao }: { sugestao: ReturnType<typeof useHomeController>['sugestao'] }) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  return (
    <ListSection header="Para agora" testID="home-sugestao">
      <View style={{ padding: spacing.md, flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
        <View style={{ width: 28, paddingTop: 2, alignItems: 'center' }}>
          <Icon name={sugestao.icone} size={24} color={ensureContrast(colors.primary, colors.surface, 3)} />
        </View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="subtitle">{sugestao.titulo}</Text>
          <Text tone="muted">{sugestao.texto}</Text>
          <View style={{ flexDirection: 'row', paddingTop: spacing.sm }}>
            <Button label={sugestao.acao} small onPress={() => router.navigate(sugestao.rota)} testID={`home-sugestao-${sugestao.id}`} />
          </View>
        </View>
      </View>
    </ListSection>
  );
}

// ------------------------------------------------------------ Apoio

function Apoio({ c }: { c: ReturnType<typeof useHomeController> }) {
  const { colors, spacing } = useTheme();
  const reduce = useReduceMotion();
  const [aberto, setAberto] = useState(false);
  const cvv = c.apoioPrincipal;

  return (
    <ListSection header="Apoio" footer={aberto ? AVISO : undefined} testID="home-aviso">
      <View
        style={{
          padding: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.separator,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subtitle">Precisa conversar com alguém?</Text>
          <Text variant="caption" tone="muted">CVV · 24 horas, ligação gratuita</Text>
        </View>
        <Button
          label={`Ligar ${CVV_TELEFONE}`}
          icon="telefone"
          variant="secondary"
          small
          onPress={() => abrirLink(`tel:${cvv.telefone}`)}
          accessibilityLabel={`Ligar ${CVV_TELEFONE}`}
          testID="home-apoio-cvv-ligar"
        />
      </View>

      <ListRow
        title={aberto ? 'Menos opções' : 'Mais apoio'}
        tone="primary"
        chevron={false}
        onPress={() => setAberto((a) => !a)}
        accessibilityLabel={aberto ? 'Esconder mais opções de apoio' : 'Mostrar mais opções de apoio'}
        right={
          <MotiView animate={{ rotate: aberto ? '180deg' : '0deg' }} transition={timing(reduce ? 0 : 220)}>
            <ChevronDown size={18} color={colors.primary} strokeWidth={2.2} />
          </MotiView>
        }
        testID="home-apoio-mais"
      />

      {aberto ? (
        <ListRow icon="site" title="Site do CVV" subtitle="Centro de Valorização da Vida" onPress={() => abrirLink(cvv.url)} testID="home-apoio-cvv-site" />
      ) : null}
      {aberto
        ? c.apoioExtra.map((ap) => (
            <ListRow
              key={ap.id}
              icon={ICONE_APOIO[ap.id] ?? 'coracao'}
              title={ap.titulo}
              subtitle={ap.descricao}
              onPress={() => abrirLink(ap.url)}
              testID={`home-apoio-${ap.id}-abrir`}
            />
          ))
        : null}
    </ListSection>
  );
}
