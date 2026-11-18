import { useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useEffect } from 'react';
import { View } from 'react-native';

import { Button, FadeIn, Icon, Screen, Text, useReduceMotion, useScreenLayout } from '@/components/ui';
import { timing } from '@/components/ui/motion';
import { useHumorController } from '@/controllers/useHumorController';
import { EMOCOES } from '@/entities/catalogo';
import type { Mood } from '@/models';
import { useTheme } from '@/theme';
import { FluxoEtapas } from './FluxoEtapas';
import { FormularioHumor } from './FormularioHumor';
import { LinhaDoTempo } from './LinhaDoTempo';

/**
 * Registro de humor.
 * - Celular (compact): uma pergunta por vez, em etapas animadas (FluxoEtapas).
 * - Tablet/computador: as três perguntas num formulário aberto (FormularioHumor).
 * - Depois de salvar: confirmação + linha do tempo com hoje e os últimos dias.
 */
export function HumorScreen() {
  const c = useHumorController();
  const { isCompact } = useScreenLayout();
  // vindo da Home com a emoção já escolhida (/humor?emocao=BEM): pré-seleciona e, no celular, começa na nota
  const { emocao: param } = useLocalSearchParams<{ emocao?: string }>();
  const emocaoInicial = EMOCOES.some((e) => e.mood === param) ? (param as Mood) : null;
  const { setEmocao } = c;

  useEffect(() => {
    if (emocaoInicial) setEmocao(emocaoInicial);
  }, [emocaoInicial, setEmocao]);

  if (c.salvo) return <RegistroSalvo c={c} />;
  return isCompact ? <FluxoEtapas c={c} etapaInicial={emocaoInicial ? 2 : 1} /> : <FormularioHumor c={c} />;
}

function RegistroSalvo({ c }: { c: ReturnType<typeof useHumorController> }) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { isCompact } = useScreenLayout();
  const reduce = useReduceMotion();
  const ultimo = c.linhaDoTempo[0]?.hoje ? c.linhaDoTempo[0].registros[0] : undefined;

  const acoes = (
    <View style={{ flexDirection: 'row', gap: spacing.sm + 4 }}>
      <Button label="Novo registro" variant="secondary" onPress={c.novoRegistro} style={isCompact ? { flex: 1 } : undefined} testID="humor-novo" />
      <Button label="Ver histórico" variant="ghost" onPress={() => router.navigate('/historico')} style={isCompact ? { flex: 1 } : undefined} testID="humor-ver-historico" />
    </View>
  );

  return (
    <Screen width={isCompact ? 'regular' : 'wide'}>
      <View
        testID="humor-salvo"
        style={{
          flexDirection: isCompact ? 'column' : 'row',
          alignItems: isCompact ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          paddingBottom: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.separator,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 6 }}>
          <MotiView
            from={{ scale: reduce ? 1 : 0.4, opacity: reduce ? 1 : 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={timing(reduce ? 0 : 380)}
            style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="ok" size={26} color={colors.onPrimary} strokeWidth={2.6} />
          </MotiView>
          <FadeIn delay={100} style={{ flex: 1 }}>
            <Text variant="title" accessibilityRole="header">Registro salvo</Text>
            <Text tone="muted">Continue cuidando de você.</Text>
          </FadeIn>
        </View>
        {acoes}
      </View>

      <FadeIn delay={180}>
        <Text variant="display">Sua linha do tempo</Text>
        <Text tone="muted">Hoje e os últimos dias, do mais recente para o mais antigo.</Text>
      </FadeIn>

      {c.linhaDoTempo.length > 0 ? (
        <LinhaDoTempo dias={c.linhaDoTempo} largo={!isCompact} destaqueId={ultimo?.id} />
      ) : (
        <Text tone="muted">Carregando seus registros…</Text>
      )}
    </Screen>
  );
}
