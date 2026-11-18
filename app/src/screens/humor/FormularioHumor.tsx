import { MotiView } from 'moti';
import React from 'react';
import { View } from 'react-native';

import {
  Button, Chip, EmotionPicker, FadeIn, Grid, Icon, iconeDe, Screen, Text, TextField, useReduceMotion, useScreenLayout,
} from '@/components/ui';
import { timing } from '@/components/ui/motion';
import { LIMITE_NOTA, type useHumorController } from '@/controllers/useHumorController';
import { SurfaceProvider, useTheme } from '@/theme';

function dataExtenso(): string {
  const t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Registro de humor em tela larga: as três perguntas numa página só, sem cartão em volta,
 * separadas por divisória fina. Pergunta à esquerda, resposta à direita (no expanded).
 */
export function FormularioHumor({ c }: { c: ReturnType<typeof useHumorController> }) {
  const { spacing } = useTheme();
  const { isExpanded } = useScreenLayout();

  return (
    <Screen width="wide">
      <FadeIn>
        <Text variant="caption" tone="muted" testID="humor-data">{dataExtenso()}</Text>
        <Text variant="display">Como você está?</Text>
        <Text tone="muted">Três perguntas rápidas. Só a primeira é obrigatória.</Text>
      </FadeIn>

      <View>
        <Pergunta numero={1} feito={!!c.emocao} titulo="Como você está se sentindo?" apoio="Escolha a emoção que mais combina com agora." lado={isExpanded} atraso={60}>
          <EmotionPicker
            value={c.emocao}
            columns={{ compact: 3, medium: 6 }}
            minHeight={120}
            iconSize={34}
            onChange={(_id, mood) => c.setEmocao(mood)}
          />
        </Pergunta>

        <Pergunta numero={2} feito={c.nota.trim().length > 0} titulo="Quer adicionar uma nota?" apoio="Opcional. Escreva o que quiser lembrar sobre hoje." lado={isExpanded} atraso={120}>
          <TextField
            accessibilityLabel="Nota"
            placeholder="O que aconteceu hoje? Como isso te deixou?"
            value={c.nota}
            onChangeText={c.setNota}
            multiline
            maxLength={LIMITE_NOTA}
            hint={`${c.nota.length}/${LIMITE_NOTA} caracteres`}
            testID="humor-nota"
          />
        </Pergunta>

        <Pergunta numero={3} feito={c.atividades.length > 0} titulo="O que você fez hoje?" apoio="Marque quantas quiser. Ajuda a entender o que pesa e o que alivia." lado={isExpanded} atraso={180}>
          <Grid columns={{ compact: 2, medium: 3, expanded: 3 }}>
            {c.atividadesDisponiveis.map((a) => (
              <Chip
                key={a.id}
                label={a.label}
                icon={iconeDe(a.id)}
                selected={c.atividades.includes(a.activity)}
                onPress={() => c.alternarAtividade(a.activity)}
                style={{ flex: 1 }}
                testID={`humor-atividade-${a.id}`}
              />
            ))}
          </Grid>
        </Pergunta>

        <FadeIn delay={240}>
          <Rodape c={c} />
        </FadeIn>
      </View>
    </Screen>
  );
}

function Rodape({ c }: { c: ReturnType<typeof useHumorController> }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.separator, paddingTop: spacing.lg, gap: spacing.sm }}>
      {c.erro ? <Text tone="danger" accessibilityRole="alert" align="right" testID="humor-erro">{c.erro}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.md }}>
        <Text tone="muted">{c.emocao ? 'A nota e as atividades são opcionais.' : 'Escolha como você está para salvar.'}</Text>
        <Button
          label="Salvar registro"
          onPress={c.salvar}
          loading={c.salvando}
          disabled={!c.podeSalvar && !c.salvando}
          testID="humor-salvar"
        />
      </View>
    </View>
  );
}

interface PerguntaProps {
  numero: number;
  feito: boolean;
  titulo: string;
  apoio: string;
  /** pergunta à esquerda e resposta à direita */
  lado: boolean;
  atraso: number;
  children: React.ReactNode;
}

function Pergunta({ numero, feito, titulo, apoio, lado, atraso, children }: PerguntaProps) {
  const { colors, spacing } = useTheme();
  return (
    <FadeIn delay={atraso}>
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.separator,
          paddingVertical: spacing.xl,
          flexDirection: lado ? 'row' : 'column',
          gap: lado ? spacing.xxl : spacing.md,
        }}
      >
        <View style={{ width: lado ? 280 : undefined, gap: spacing.sm }}>
          <Numero numero={numero} feito={feito} />
          <Text variant="title">{titulo}</Text>
          <Text variant="caption" tone="muted">{apoio}</Text>
        </View>
        <View style={{ flex: lado ? 1 : undefined, minWidth: 0 }}>{children}</View>
      </View>
    </FadeIn>
  );
}

/** Número da pergunta; vira um ✓ quando ela tem resposta. */
function Numero({ numero, feito }: { numero: number; feito: boolean }) {
  const { colors } = useTheme();
  const reduce = useReduceMotion();
  return (
    <View
      accessible
      accessibilityLabel={feito ? `Pergunta ${numero} respondida` : `Pergunta ${numero}`}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: feito ? colors.primary : colors.border,
        backgroundColor: feito ? colors.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {feito ? (
        <MotiView key="ok" from={{ scale: reduce ? 1 : 0.4 }} animate={{ scale: 1 }} transition={timing(reduce ? 0 : 260)}>
          <Icon name="ok" size={16} color={colors.onPrimary} strokeWidth={3} />
        </MotiView>
      ) : (
        <SurfaceProvider value={colors.bg}>
          <Text variant="label" tone="muted">{String(numero)}</Text>
        </SurfaceProvider>
      )}
    </View>
  );
}
