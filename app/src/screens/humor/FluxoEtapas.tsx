import { ChevronLeft } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import {
  Button, Chip, EmotionBadge, EmotionPicker, Grid, iconeDe, Screen, Text, TextField, useReduceMotion,
} from '@/components/ui';
import { timing } from '@/components/ui/motion';
import { LIMITE_NOTA, type useHumorController } from '@/controllers/useHumorController';
import { useTheme } from '@/theme';

type Etapa = 1 | 2 | 3;
const ETAPAS: Etapa[] = [1, 2, 3];
/** tempo entre tocar na emoção e passar para a nota (dá para ver a seleção acontecer) */
const ESPERA_AVANCO = 420;

function dataExtenso(): string {
  const t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Registro de humor no celular, uma pergunta por vez:
 * 1. como você está (tocar já avança), 2. nota (opcional), 3. o que fez hoje (opcional) e salvar.
 * As etapas deslizam para a direita ao avançar e para a esquerda ao voltar.
 */
export function FluxoEtapas({ c, etapaInicial = 1 }: { c: ReturnType<typeof useHumorController>; etapaInicial?: Etapa }) {
  const { colors, spacing } = useTheme();
  const reduce = useReduceMotion();
  const [etapa, setEtapa] = useState<Etapa>(etapaInicial);
  const [sentido, setSentido] = useState<1 | -1>(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const ir = (e: Etapa) => {
    if (timer.current) clearTimeout(timer.current);
    setSentido(e > etapa ? 1 : -1);
    setEtapa(e);
  };

  return (
    <Screen width="regular" scroll={false}>
      <View style={{ gap: spacing.sm + 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
          {etapa > 1 ? (
            <Pressable
              onPress={() => ir((etapa - 1) as Etapa)}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              testID="humor-voltar"
              hitSlop={8}
              style={{ width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevronLeft size={26} color={colors.primary} strokeWidth={2.2} />
            </Pressable>
          ) : (
            <Text variant="caption" tone="muted" testID="humor-data">{dataExtenso()}</Text>
          )}
          <Text variant="caption" tone="muted" testID="humor-passo">{`Passo ${etapa} de 3`}</Text>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Progresso do registro"
          accessibilityValue={{ min: 1, max: 3, now: etapa }}
          style={{ flexDirection: 'row', gap: spacing.xs + 2 }}
        >
          {ETAPAS.map((n) => (
            <View key={n} style={{ flex: 1, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
              <MotiView
                animate={{ scaleX: etapa >= n ? 1 : 0 }}
                transition={timing(reduce ? 0 : 420)}
                style={{ height: 4, backgroundColor: colors.primary, transformOrigin: 'left' }}
              />
            </View>
          ))}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: spacing.sm }} keyboardShouldPersistTaps="handled">
        <MotiView
          key={etapa}
          from={{ opacity: 0, translateX: reduce ? 0 : 48 * sentido }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={timing(reduce ? 0 : 380)}
          style={{ gap: spacing.lg }}
        >
          {etapa === 1 ? (
            <>
              <View style={{ gap: spacing.xs + 2 }}>
                <Text variant="display">Como você está se sentindo?</Text>
                <Text tone="muted">Escolha a emoção que mais combina com agora.</Text>
              </View>
              <EmotionPicker
                value={c.emocao}
                columns={{ compact: 2 }}
                minHeight={116}
                iconSize={36}
                onChange={(_id, mood) => {
                  c.setEmocao(mood);
                  if (timer.current) clearTimeout(timer.current);
                  timer.current = setTimeout(() => ir(2), reduce ? 0 : ESPERA_AVANCO);
                }}
              />
            </>
          ) : null}

          {etapa === 2 ? (
            <>
              {c.emocao ? <EmotionBadge emotion={c.emocao} /> : null}
              <View style={{ gap: spacing.xs + 2 }}>
                <Text variant="display">Quer contar um pouco mais?</Text>
                <Text tone="muted">Uma nota é opcional. Escreva o que quiser lembrar.</Text>
              </View>
              <TextField
                accessibilityLabel="Nota"
                placeholder="O que aconteceu hoje? Como isso te deixou?"
                value={c.nota}
                onChangeText={c.setNota}
                multiline
                maxLength={LIMITE_NOTA}
                hint={`${c.nota.length}/${LIMITE_NOTA}`}
                testID="humor-nota"
              />
            </>
          ) : null}

          {etapa === 3 ? (
            <>
              <View style={{ gap: spacing.xs + 2 }}>
                <Text variant="display">O que você fez hoje?</Text>
                <Text tone="muted">Marque quantas quiser. Ajuda a entender o que pesa e o que alivia.</Text>
              </View>
              <Grid columns={{ compact: 2 }}>
                {c.atividadesDisponiveis.map((a) => (
                  <Chip
                    key={a.id}
                    label={a.label}
                    icon={iconeDe(a.id)}
                    selected={c.atividades.includes(a.activity)}
                    onPress={() => c.alternarAtividade(a.activity)}
                    style={{ flex: 1, minHeight: 52 }}
                    testID={`humor-atividade-${a.id}`}
                  />
                ))}
              </Grid>
              {c.erro ? <Text tone="danger" accessibilityRole="alert" testID="humor-erro">{c.erro}</Text> : null}
            </>
          ) : null}
        </MotiView>
      </ScrollView>

      <View style={{ paddingTop: spacing.sm }}>
        {etapa === 1 ? (
          <Text variant="caption" tone="muted" align="center">Toque numa emoção para continuar</Text>
        ) : null}
        {etapa === 2 ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm + 4 }}>
            <Button label="Pular" variant="secondary" onPress={() => ir(3)} style={{ flex: 1 }} testID="humor-pular" />
            <Button label="Continuar" onPress={() => ir(3)} style={{ flex: 1 }} testID="humor-continuar" />
          </View>
        ) : null}
        {etapa === 3 ? (
          <Button
            label="Salvar registro"
            onPress={c.salvar}
            loading={c.salvando}
            disabled={!c.podeSalvar && !c.salvando}
            fullWidth
            testID="humor-salvar"
          />
        ) : null}
      </View>
    </Screen>
  );
}
