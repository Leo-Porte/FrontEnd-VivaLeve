import { MotiView } from 'moti';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Faixa, Grid, Icon, Text, useReduceMotion, useSombraGrupo } from '@/components/ui';
import { SurfaceProvider, diario, emotionColors, getEmotion, useTheme } from '@/theme';

import { SEMANA, nomeDoMes, plural, type CelulaDia } from './regras';
import { Escrita } from './papel';

const timing = (duration: number, delay = 0) => ({ type: 'timing', duration, delay }) as never;

/** Faixa sálvia padrão, um pouco mais alta para caber a navegação (44 pt). */
const FAIXA = 44;

export interface CalendarioProps {
  ano: number;
  mes: number;
  celulas: CelulaDia[];
  compacto: boolean;
  /** muda a cada navegação: os mini post-its entram em cascata de novo */
  rodada: number;
  podeSeguinte: boolean;
  onDia: (chave: string) => void;
  onMesAnterior: () => void;
  onMesSeguinte: () => void;
  onHoje: () => void;
}

export function Calendario({ ano, mes, celulas, compacto, rodada, podeSeguinte, onDia, onMesAnterior, onMesSeguinte, onHoje }: CalendarioProps) {
  const { colors, spacing, radius, scheme } = useTheme();
  const reduce = useReduceMotion();
  const sombra = useSombraGrupo();
  const noMes = celulas.reduce((n, c) => n + c.anotacoes.length, 0);
  const altura = compacto ? 60 : 128;
  const padX = compacto ? spacing.sm + 2 : spacing.lg - 4;

  return (
    <View
      accessibilityLabel="Calendário de anotações"
      testID="diario-calendario"
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        overflow: 'hidden',
        paddingHorizontal: padX,
        paddingBottom: compacto ? 14 : spacing.lg,
        gap: compacto ? 10 : spacing.md,
        // slop:ok sombra mesmo padrão dos grupos com faixa sálvia
        boxShadow: sombra,
      }}
    >
      <View style={{ marginHorizontal: -padX }}>
        <Faixa
          titulo={nomeDoMes(ano, mes)}
          altura={FAIXA}
          direita={
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Pressable onPress={onHoje} accessibilityRole="button" testID="diario-cal-hoje" style={{ height: 44, paddingHorizontal: spacing.sm + 2, justifyContent: 'center' }}>
                    <Text variant="caption" color={colors.onPrimary} style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 }}>Hoje</Text>
                  </Pressable>
                  <Pressable onPress={onMesAnterior} accessibilityRole="button" accessibilityLabel="Mês anterior" testID="diario-cal-anterior" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ transform: [{ scaleX: -1 }] }}>
                      <Icon name="avancar" size={20} color={colors.onPrimary} strokeWidth={2.2} />
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={onMesSeguinte}
                    disabled={!podeSeguinte}
                    accessibilityRole="button"
                    accessibilityLabel="Mês seguinte"
                    accessibilityState={{ disabled: !podeSeguinte }}
                    testID="diario-cal-seguinte"
                    style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: podeSeguinte ? 1 : 0.35 }}
                  >
                    <Icon name="avancar" size={20} color={colors.onPrimary} strokeWidth={2.2} />
                  </Pressable>
            </View>
          }
        />
      </View>
      <SurfaceProvider value={colors.surface}>
        <Grid columns={7} gap={compacto ? 4 : 8} equalHeight={false}>
          {SEMANA.map((s) => (
            <Text key={s} variant="caption" tone="muted" align={compacto ? 'center' : 'left'} style={{ fontWeight: '600', textTransform: 'uppercase', paddingHorizontal: compacto ? 0 : 4 }}>
              {s}
            </Text>
          ))}
        </Grid>
        <Grid columns={7} gap={compacto ? 4 : 8} equalHeight={false}>
          {celulas.map((c, i) => {
            const n = c.anotacoes.length;
            // fora do mês fica vazio; o futuro sai em cinza (sem opacidade, para manter o contraste)
            if (!c.doMes) return <View key={c.chave} style={{ height: altura }} />;
            const numero = (
              <SurfaceProvider value={c.hoje ? colors.primary : colors.bg}>
              <View
                style={{
                  width: compacto ? 24 : 28,
                  height: compacto ? 24 : 28,
                  borderRadius: compacto ? 12 : 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.hoje ? colors.primary : undefined,
                }}
              >
                <Text variant="caption" color={c.hoje ? colors.onPrimary : c.futuro ? colors.textMuted : colors.text} style={{ fontWeight: n || c.hoje ? '600' : '400' }}>
                  {c.dia}
                </Text>
              </View>
              </SurfaceProvider>
            );
            if (!n) {
              return (
                <View key={c.chave} style={{ height: altura, padding: compacto ? 0 : spacing.sm, paddingTop: 4, alignItems: compacto ? 'center' : 'flex-start' }}>
                  {numero}
                </View>
              );
            }
            const primeira = c.anotacoes[c.anotacoes.length - 1];
            const emocao = primeira.emotion ? emotionColors(getEmotion(primeira.emotion), scheme) : null;
            const rot = (((c.dia * 37) % 7) - 3) * (compacto ? 1.2 : 0.8);
            return (
              <Pressable
                key={c.chave}
                onPress={() => onDia(c.chave)}
                accessibilityRole="button"
                accessibilityLabel={`${c.dia} de ${nomeDoMes(ano, mes).split(' de ')[0]}, ${plural(n)}`}
                testID={`diario-dia-${c.chave}`}
                style={{
                  height: altura,
                  borderRadius: compacto ? 8 : radius.md,
                  backgroundColor: colors.bg,
                  padding: compacto ? 0 : spacing.sm,
                  paddingTop: 4,
                  alignItems: compacto ? 'center' : 'stretch',
                  gap: 4,
                }}
              >
                {numero}
                <MotiView
                  key={rodada}
                  from={reduce ? undefined : { opacity: 0, translateY: -8, scale: 1.3 }}
                  animate={{ opacity: 1, translateY: 0, scale: 1 }}
                  transition={timing(350, 200 + i * 25)}
                  style={compacto ? { width: 28, height: 22 } : { flex: 1, marginRight: 8 }}
                >
                  {n > 1 ? (
                    <View
                      style={{
                        position: 'absolute', top: 2, bottom: 2, left: compacto ? 3 : 14, right: 0,
                        backgroundColor: diario.papelVerso,
                        transform: [{ rotate: compacto ? '8deg' : '5deg' }],
                        // slop:ok sombra folha de trás do mini post-it
                        boxShadow: diario.sombra.adesivo,
                      }}
                    />
                  ) : null}
                  <View
                    style={{
                      position: 'absolute', top: compacto ? 0 : 6, bottom: 0, left: compacto ? 0 : 2, right: compacto ? 0 : 0,
                      backgroundColor: diario.papel,
                      transform: [{ rotate: `${rot}deg` }],
                      padding: compacto ? 5 : 8,
                      justifyContent: compacto ? 'center' : 'flex-start',
                      gap: 3,
                      // slop:ok sombra mini post-it no calendário
                      boxShadow: diario.sombra.mini,
                    }}
                  >
                    {compacto ? (
                      <>
                        <View style={{ height: 2, borderRadius: 1, backgroundColor: diario.rabisco }} />
                        <View style={{ height: 2, width: '60%', borderRadius: 1, backgroundColor: diario.rabisco }} />
                      </>
                    ) : (
                      <Escrita estilo={diario.tipo.postitTitulo.compacto} cor={diario.tintaPostit} numberOfLines={2}>{primeira.title}</Escrita>
                    )}
                    {emocao ? (
                      <View
                        style={{
                          position: 'absolute',
                          right: compacto ? -5 : -6,
                          ...(compacto ? { top: -5 } : { bottom: -6 }),
                          width: compacto ? 12 : 20,
                          height: compacto ? 12 : 20,
                          borderRadius: compacto ? 6 : 10,
                          borderWidth: compacto ? 1.5 : 2,
                          borderColor: diario.borda,
                          backgroundColor: emocao.fill,
                        }}
                      />
                    ) : null}
                  </View>
                  {n > 1 ? (
                    <View
                      style={{
                        position: 'absolute',
                        left: compacto ? -6 : 0,
                        bottom: compacto ? -5 : -4,
                        minWidth: 14,
                        paddingHorizontal: compacto ? 3 : 7,
                        borderRadius: radius.sm,
                        backgroundColor: colors.primary,
                        alignItems: 'center',
                      }}
                    >
                      <Text variant="caption" color={colors.onPrimary} style={compacto ? diario.tipo.contador : { fontWeight: '600' }}>
                        {compacto ? String(n) : plural(n)}
                      </Text>
                    </View>
                  ) : null}
                </MotiView>
              </Pressable>
            );
          })}
        </Grid>
        <Text variant="caption" tone="muted" style={{ paddingHorizontal: compacto ? 6 : 0 }}>
          {noMes ? `${plural(noMes)} em ${nomeDoMes(ano, mes).split(' de ')[0]}. Toque num dia para ver os post-its.` : `Nenhuma anotação em ${nomeDoMes(ano, mes).split(' de ')[0]}.`}
        </Text>
      </SurfaceProvider>
    </View>
  );
}
