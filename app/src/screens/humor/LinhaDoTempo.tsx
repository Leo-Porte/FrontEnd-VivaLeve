import { MotiView } from 'moti';
import React from 'react';
import { View } from 'react-native';

import { FadeIn, Icon, iconeDe, Text, useReduceMotion } from '@/components/ui';
import { timing } from '@/components/ui/motion';
import type { DiaDaLinha } from '@/controllers/useHumorController';
import { ATIVIDADES } from '@/entities/catalogo';
import type { MoodLog } from '@/models';
import { SurfaceProvider, emotionColors, getEmotion, useTheme } from '@/theme';

const PONTO = 32;
/** largura da coluna de datas no layout largo */
const COLUNA_DATA = 200;
const COLUNA_PONTO = 48;

function hora(r: MoodLog): string {
  const d = new Date(r.createdAt);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const nomeAtividade = (a: string) => ATIVIDADES.find((x) => x.activity === a)?.label ?? a;

export interface LinhaDoTempoProps {
  dias: DiaDaLinha[];
  /** largo: data numa coluna à esquerda da linha; estreito: data como cabeçalho acima dos registros */
  largo: boolean;
  /** id do registro recém-salvo (ganha fundo de destaque) */
  destaqueId?: number;
}

/** Registros de hoje e dos últimos dias numa linha vertical, do mais novo ao mais antigo. */
export function LinhaDoTempo({ dias, largo, destaqueId }: LinhaDoTempoProps) {
  const { colors, spacing } = useTheme();
  const reduce = useReduceMotion();
  const xLinha = largo ? COLUNA_DATA + spacing.sm + COLUNA_PONTO / 2 - 1 : PONTO / 2 - 1;
  let ordem = 0;

  return (
    <View testID="humor-linha-tempo" style={{ position: 'relative', gap: spacing.xs }}>
      <MotiView
        pointerEvents="none"
        from={{ scaleY: reduce ? 1 : 0 }}
        animate={{ scaleY: 1 }}
        transition={timing(reduce ? 0 : 900)}
        style={{ position: 'absolute', left: xLinha, top: spacing.md, bottom: spacing.md, width: 2, backgroundColor: colors.separator, transformOrigin: 'top' }}
      />
      {dias.map((d) => (
        <View key={d.dia} style={{ gap: spacing.xs }} testID={`humor-dia-${d.dia}`}>
          {largo ? null : (
            <FadeIn delay={Math.min(ordem++, 12) * 60}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingTop: spacing.sm + 4, paddingBottom: spacing.xs }}>
                <View style={{ width: 10, height: 10, marginHorizontal: (PONTO - 10) / 2, borderRadius: 5, backgroundColor: d.hoje ? colors.primary : colors.separator }} />
                <Text variant="label" tone={d.hoje ? 'primary' : 'muted'}>{d.titulo}</Text>
              </View>
            </FadeIn>
          )}
          {d.registros.map((r, i) => (
            <FadeIn key={r.id} delay={Math.min(ordem++, 12) * 60}>
              <Item
                r={r}
                largo={largo}
                titulo={largo && i === 0 ? d.titulo : ''}
                hoje={d.hoje}
                destaque={r.id === destaqueId}
              />
            </FadeIn>
          ))}
        </View>
      ))}
    </View>
  );
}

function Item({ r, largo, titulo, hoje, destaque }: { r: MoodLog; largo: boolean; titulo: string; hoje: boolean; destaque: boolean }) {
  const { colors, spacing, radius, scheme } = useTheme();
  const e = getEmotion(r.mood);
  const ec = emotionColors(e, scheme);
  const fundo = destaque ? colors.surface : colors.bg;

  return (
    <View
      testID={`humor-linha-${r.id}`}
      accessible
      accessibilityLabel={`${titulo || ''} ${hora(r)}, ${e.label}${r.note ? `. ${r.note}` : ''}`.trim()}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: largo ? spacing.sm : 0 }}
    >
      {largo ? (
        <View style={{ width: COLUNA_DATA, paddingTop: spacing.xs + 2, alignItems: 'flex-end' }}>
          {titulo ? <Text variant="label" tone={hoje ? 'primary' : 'muted'} align="right">{titulo}</Text> : null}
        </View>
      ) : null}

      <View style={{ width: largo ? COLUNA_PONTO : PONTO, alignItems: 'center' }}>
        {/* anel na cor do fundo: separa o ponto da linha sem sombra */}
        <View
          style={{
            width: PONTO + 8,
            height: PONTO + 8,
            margin: -4,
            borderRadius: (PONTO + 8) / 2,
            borderWidth: 4,
            borderColor: colors.bg,
            backgroundColor: ec.fill,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={iconeDe(e.id)} size={18} color={ec.onFill} strokeWidth={2.2} />
        </View>
      </View>

      <View
        style={{
          flex: 1,
          minWidth: 0,
          gap: spacing.xs + 2,
          backgroundColor: fundo,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          paddingHorizontal: destaque ? spacing.md : 0,
          paddingVertical: destaque ? spacing.sm + 4 : spacing.xs,
          marginBottom: spacing.sm,
        }}
      >
        <SurfaceProvider value={fundo}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: largo ? 'flex-start' : 'space-between', gap: spacing.sm + 4 }}>
            <Text variant="subtitle">{e.label}</Text>
            <Text variant="caption" tone="muted">{hora(r)}</Text>
          </View>
          {r.note ? (
            <Text tone="muted" numberOfLines={4} style={{ maxWidth: 640 }}>{r.note}</Text>
          ) : null}
          {r.activities?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 }}>
              {r.activities.map((a) => (
                <View key={a} style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
                  <SurfaceProvider value={colors.surfaceAlt}>
                    <Text variant="caption">{nomeAtividade(a)}</Text>
                  </SurfaceProvider>
                </View>
              ))}
            </View>
          ) : null}
        </SurfaceProvider>
      </View>
    </View>
  );
}
