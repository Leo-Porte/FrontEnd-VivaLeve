import React from 'react';
import { View } from 'react-native';

import { LineChart } from '@/components/charts';
import { EmptyState, ErrorState, FadeIn, ListRow, ListSection, Loading, PressableScale, Screen, Text } from '@/components/ui';
import { iconeDe } from '@/components/ui';
import { useHistoricoController } from '@/controllers/useHistoricoController';
import { emotionColors, getEmotion, useTheme } from '@/theme';

// O back dá nota 0 para ANSIOSO; no eixo, 0 a 5.
const ROTULOS_NOTA: Record<number, string> = { 0: 'Ansioso', 1: 'Baixo', 2: 'Mal', 3: 'Neutro', 4: 'Bem', 5: 'Ótimo' };

const dias = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

/** Controle segmentado do iOS: trilho surfaceAlt, segmento ativo surface. */
function Segmentado({ opcoes, valor, onChange }: { opcoes: { valor: number; label: string; testID: string }[]; valor: number; onChange: (v: number) => void }) {
  const { colors, radius } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderCurve: 'continuous', padding: 2 }}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <PressableScale
            key={o.valor}
            onPress={() => onChange(o.valor)}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: ativo }}
            testID={o.testID}
            style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md - 2, borderCurve: 'continuous', backgroundColor: ativo ? colors.surface : 'transparent' }}
          >
            <Text variant="label" tone={ativo ? 'default' : 'muted'}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

export function HistoricoScreen() {
  const c = useHistoricoController();
  const { colors, spacing, radius, scheme } = useTheme();

  if (c.carregando) return <Screen><Loading label="Carregando..." /></Screen>;
  if (c.erro) return <Screen><ErrorState message={c.erro} onRetry={c.recarregar} /></Screen>;

  const r = c.resumo;
  const pred = c.distribuicao?.predominant ? getEmotion(c.distribuicao.predominant) : null;

  return (
    <Screen width="regular">
      <Text variant="display">Histórico</Text>

      <View style={{ gap: spacing.sm }}>
        <ListSection header="Resumo">
          <ListRow icon="lapis" title="Registros" value={String(r?.totalRecords ?? 0)} testID="historico-total" />
          <ListRow icon="fogo" title="Sequência atual" value={dias(r?.currentStreak ?? 0)} testID="historico-sequencia" />
          <ListRow icon="trofeu" title="Melhor sequência" value={dias(r?.bestStreak ?? 0)} testID="historico-melhor" />
          <ListRow icon="respirar" title="Sessões de respiração" value={String(r?.breathingSessions ?? 0)} testID="historico-respiracao" />
        </ListSection>
        <Text variant="caption" tone="muted" style={{ paddingHorizontal: spacing.md }} testID="historico-mensagem-sequencia">{c.mensagemSequencia}</Text>
      </View>

      {c.vazio ? (
        <EmptyState icon="grafico" title="Ainda não há registros" message="Registre seu humor para ver a evolução aqui." />
      ) : (
        <>
          <Segmentado
            valor={c.periodo}
            onChange={(v) => c.setPeriodo(v as 7 | 30)}
            opcoes={[
              { valor: 7, label: '7 dias', testID: 'historico-periodo-7' },
              { valor: 30, label: '30 dias', testID: 'historico-periodo-30' },
            ]}
          />

          <FadeIn>
            <ListSection header="Evolução do humor" testID="historico-evolucao">
              <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md }}>
              {c.pontos.length === 0 ? (
                <Text tone="muted">Sem registros no período.</Text>
              ) : (
                <LineChart
                  data={c.pontos.map((p) => ({ label: p.label, value: p.value, detail: `${p.count} registro(s)` }))}
                  color={colors.primary}
                  gridColor={colors.separator}
                  textColor={colors.textMuted}
                  pointFill={colors.surface}
                  yLabels={ROTULOS_NOTA}
                  min={0}
                  max={5}
                />
              )}
              </View>
            </ListSection>
          </FadeIn>

          <FadeIn delay={100}>
            <View style={{ gap: spacing.lg }} testID="historico-distribuicao">
              <ListSection header="Predominante" testID="historico-predominante">
                {pred ? (
                  <ListRow
                    icon={iconeDe(pred.id)}
                    iconColor={emotionColors(pred, scheme).fill}
                    title={pred.label}
                    subtitle="Emoção predominante"
                    value={`${Math.round(c.distribuicao?.predominantPercentage ?? 0)}% dos registros`}
                  />
                ) : (
                  <ListRow title="Sem registros no período" />
                )}
              </ListSection>

              <ListSection header="Distribuição por emoção" testID="historico-barras">
                {c.itensDistribuicao.map((i) => {
                  const e = getEmotion(i.mood);
                  const cor = emotionColors(e, scheme).fill;
                  const pct = Math.round(i.percentage || 0);
                  return (
                    <ListRow
                      key={i.mood}
                      icon={iconeDe(e.id)}
                      iconColor={cor}
                      title={e.label}
                      right={
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                          <View style={{ width: 96, height: 6, borderRadius: radius.xs, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
                            <View style={{ width: `${pct}%`, height: '100%', backgroundColor: cor }} />
                          </View>
                          <Text tone="muted" style={{ minWidth: 40, textAlign: 'right' }}>{pct}%</Text>
                        </View>
                      }
                    />
                  );
                })}
              </ListSection>
            </View>
          </FadeIn>

          <FadeIn delay={150}>
            <ListSection
              header="Registros recentes"
              action={c.podeVerTodos ? { label: c.mostrarTodos ? 'Ver menos' : 'Ver todos', onPress: c.alternarTodos, testID: 'historico-ver-todos' } : undefined}
              testID="historico-lista"
             
            >
              {c.visiveis.map((m) => {
                const d = new Date(m.createdAt);
                const e = getEmotion(m.mood);
                const data = `${d.getDate()} ${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')} · ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                return (
                  <ListRow
                    key={m.id}
                    icon={iconeDe(e.id)}
                    iconColor={emotionColors(e, scheme).fill}
                    title={e.label}
                    subtitle={m.note || undefined}
                    value={data}
                    testID={`historico-item-${m.id}`}
                  />
                );
              })}
            </ListSection>
          </FadeIn>
        </>
      )}
    </Screen>
  );
}
