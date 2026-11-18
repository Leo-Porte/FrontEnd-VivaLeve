// slop:ok gradiente o metal dos anéis da espiral
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal as RNModal, Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';

import { Icon, Text, iconeDe, useReduceMotion } from '@/components/ui';
import type { Mood } from '@/models';
import { SurfaceProvider, diario, emotionColors, emotions, getEmotion, useTheme } from '@/theme';

import { dataLonga } from './regras';
import { Escrita, FonteMaoContext } from './papel';

const timing = (duration: number, delay = 0) => ({ type: 'timing', duration, delay }) as never;

/** Duração de cada movimento da caderneta (a tela usa para encadear as etapas). */
export const CADERNO_MS = { sobe: 480, desce: 420, arranca: 650 } as const;

export type FaseCaderno = 'aberto' | 'arrancando' | 'descendo';

export interface Folha {
  titulo: string;
  texto: string;
  emocao: Mood | null;
  /** data da anotação (nova: agora) */
  quando: string;
}

export interface CadernetaProps {
  visivel: boolean;
  fase: FaseCaderno;
  modo: 'ler' | 'editar';
  folha: Folha;
  compacto: boolean;
  /** "Nova anotação", "Editar anotação" ou o título lido */
  rotulo: string;
  erro?: string | null;
  salvando?: boolean;
  onTitulo: (t: string) => void;
  onTexto: (t: string) => void;
  onEmocao: (m: Mood) => void;
  /** tocar fora, voltar do sistema, Fechar/Cancelar */
  onFechar: () => void;
  onCancelarEdicao: () => void;
  onGuardar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}

/**
 * Caderneta de anotações: capa sálvia, espiral, página pautada com margem. Sobe de baixo ao abrir, desce ao
 * fechar e, ao guardar uma anotação nova, a página escrita é arrancada (a tela cuida das etapas pela `fase`).
 */
export function Caderneta(p: CadernetaProps) {
  const { height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const tam = p.compacto ? 'compacto' : 'largo';
  const passo = diario.pautaPasso[tam];
  const descendo = p.fase === 'descendo';
  const arrancando = p.fase === 'arrancando';

  return (
    <RNModal visible={p.visivel} transparent animationType="none" statusBarTranslucent onRequestClose={p.modo === 'editar' ? p.onCancelarEdicao : p.onFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingTop: p.compacto ? 52 : 56, paddingBottom: p.compacto ? 24 : 32, paddingHorizontal: p.compacto ? 14 : 24 }}>
          <MotiView
            from={reduce ? undefined : { opacity: 0 }}
            animate={{ opacity: descendo ? 0 : 1 }}
            transition={timing(descendo ? CADERNO_MS.desce : 300)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: diario.veu }}
          >
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar caderneta" onPress={p.onFechar} style={{ flex: 1 }} />
          </MotiView>

          <MotiView
            from={reduce ? undefined : { translateY: height }}
            animate={{ translateY: descendo && !reduce ? height : 0 }}
            transition={descendo ? timing(CADERNO_MS.desce) : timing(CADERNO_MS.sobe)}
            accessibilityViewIsModal
            accessibilityLabel={p.rotulo}
            testID="diario-caderneta"
            style={{
              width: '100%',
              maxWidth: p.compacto ? undefined : 620,
              height: '100%',
              maxHeight: 780,
              backgroundColor: diario.capa,
              borderTopLeftRadius: 6,
              borderTopRightRadius: 6,
              borderBottomLeftRadius: 14,
              borderBottomRightRadius: 14,
              paddingTop: p.compacto ? 18 : 22,
              paddingHorizontal: p.compacto ? 8 : 10,
              // slop:ok sombra a caderneta é um objeto sobre a tela (docs/VISUAL.md, Diário)
              boxShadow: diario.sombra.caderno,
            }}
          >
            <Espiral compacto={p.compacto} />

            <View style={{ flex: 1, minHeight: 0 }}>
              {/* folha de baixo: aparece quando a de cima é arrancada */}
              <Papel compacto={p.compacto} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
              <MotiView
                animate={arrancando && !reduce ? { rotate: '-22deg', translateX: 90, translateY: -height * 0.9, opacity: 0 } : { rotate: '0deg', translateX: 0, translateY: 0, opacity: 1 }}
                transition={arrancando ? timing(CADERNO_MS.arranca) : timing(0)}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transformOrigin: 'top left' }}
              >
                <Pagina {...p} passo={passo} tam={tam} />
              </MotiView>
            </View>

            <Rodape {...p} />
          </MotiView>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

function Espiral({ compacto }: { compacto: boolean }) {
  const n = compacto ? 13 : 19;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: compacto ? 22 : 30, right: compacto ? 22 : 30, top: compacto ? -12 : -14, flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 }}>
      {Array.from({ length: n }, (_, i) => (
        // slop:ok gradiente metal do anel da espiral
        <LinearGradient
          key={i}
          colors={[...diario.anel]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          // slop:ok sombra anel de metal da espiral
          style={{ width: compacto ? 9 : 10, height: compacto ? 30 : 34, borderRadius: 5, boxShadow: diario.sombra.anel }}
        />
      ))}
    </View>
  );
}

/** Papel pautado com margem vermelha. Com `altura`, desenha as linhas até lá (conteúdo que rola). */
function Papel({ compacto, style, altura, children }: { compacto: boolean; style?: object; altura?: number; children?: React.ReactNode }) {
  const [medida, setMedida] = useState(0);
  const passo = diario.pautaPasso[compacto ? 'compacto' : 'largo'];
  const h = altura ?? medida;
  const linhas = Math.max(0, Math.floor(h / passo));
  return (
    <View onLayout={altura === undefined ? (e) => setMedida(e.nativeEvent.layout.height) : undefined} style={[{ backgroundColor: diario.papel, borderRadius: 2, overflow: 'hidden' }, style]}>
      {Array.from({ length: linhas }, (_, i) => (
        <View key={i} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: (i + 1) * passo - 1, height: 1, backgroundColor: diario.pauta }} />
      ))}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: compacto ? 33 : 47, width: 1, backgroundColor: diario.margem }} />
      {children}
    </View>
  );
}

function Pagina(p: CadernetaProps & { passo: number; tam: 'compacto' | 'largo' }) {
  const { scheme } = useTheme();
  const fonteCarregada = React.useContext(FonteMaoContext);
  const [alturaConteudo, setAlturaConteudo] = useState(0);
  const emocao = p.folha.emocao ? getEmotion(p.folha.emocao) : null;
  const ec = emocao ? emotionColors(emocao, scheme) : null;
  const margemEsq = p.compacto ? 44 : 64;
  const campo = (estilo: { fontFamily?: string; fontSize: number; lineHeight: number }) => ({
    ...estilo,
    // slop:ok fonte letra de mão do diário (tokens em theme.diario.tipo)
    fontFamily: fonteCarregada ? estilo.fontFamily : undefined,
    color: diario.tinta,
    padding: 0,
    margin: 0,
  });

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <Papel compacto={p.compacto} altura={alturaConteudo} style={{ flexGrow: 1 }}>
        <View
          onLayout={(e) => setAlturaConteudo(e.nativeEvent.layout.height)}
          style={{ flexGrow: 1, paddingTop: p.passo * 0.6, paddingLeft: margemEsq, paddingRight: p.compacto ? 16 : 28, paddingBottom: p.compacto ? 16 : 20 }}
        >
          <Escrita estilo={diario.tipo.cadernoData[p.tam]} cor={diario.dataCaderno} style={{ textAlign: 'right', height: p.passo }}>
            {dataLonga(p.folha.quando)}
          </Escrita>

          {p.modo === 'ler' ? (
            <View style={{ flexGrow: 1 }}>
              <Escrita estilo={diario.tipo.cadernoTitulo[p.tam]} cor={diario.tinta} accessibilityRole="header" testID="diario-ver-titulo">{p.folha.titulo}</Escrita>
              <Escrita estilo={diario.tipo.cadernoTexto[p.tam]} cor={diario.tinta} testID="diario-ver-texto" style={{ flexGrow: 1 }}>{p.folha.texto}</Escrita>
              {emocao && ec ? (
                <View style={{ alignSelf: 'flex-end', marginTop: 20, alignItems: 'center', gap: 2, transform: [{ rotate: '-8deg' }] }}>
                  <View
                    accessibilityRole="image"
                    accessibilityLabel={`Sentimento: ${emocao.label}`}
                    style={{
                      width: p.compacto ? 72 : 88,
                      height: p.compacto ? 72 : 88,
                      borderRadius: p.compacto ? 36 : 44,
                      backgroundColor: ec.fill,
                      borderWidth: p.compacto ? 4 : 5,
                      borderColor: diario.borda,
                      alignItems: 'center',
                      justifyContent: 'center',
                      // slop:ok sombra adesivo colado na página
                      boxShadow: diario.sombra.adesivoColado,
                    }}
                  >
                    <Icon name={iconeDe(emocao.id)} size={p.compacto ? 38 : 44} color={ec.onFill} strokeWidth={2} />
                  </View>
                  <Escrita estilo={diario.tipo.adesivoColado[p.tam]} cor={diario.tinta}>{emocao.label}</Escrita>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={{ flexGrow: 1 }}>
              <TextInput
                value={p.folha.titulo}
                onChangeText={p.onTitulo}
                placeholder="Dê um título…"
                placeholderTextColor={diario.dataCaderno}
                maxLength={200}
                accessibilityLabel="Título"
                testID="diario-titulo"
                selectionColor={diario.capa}
                style={[campo(diario.tipo.cadernoTitulo[p.tam]), { height: p.passo * 2, paddingTop: p.passo * 0.5 }, { outlineStyle: 'none' } as object]}
              />
              <TextInput
                value={p.folha.texto}
                onChangeText={p.onTexto}
                placeholder="Escreva o que estiver sentindo…"
                placeholderTextColor={diario.dataCaderno}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Texto"
                testID="diario-texto"
                selectionColor={diario.capa}
                style={[campo(diario.tipo.cadernoTexto[p.tam]), { flexGrow: 1, minHeight: p.passo * 7 }, { outlineStyle: 'none' } as object]}
              />
              {p.erro ? (
                <Escrita estilo={diario.tipo.aviso[p.tam]} cor={diario.erro} accessibilityLiveRegion="polite" testID="diario-erro">{p.erro}</Escrita>
              ) : null}

              <View accessibilityRole="radiogroup" accessibilityLabel="Como você se sentiu? (opcional)" style={{ marginTop: 8, paddingTop: 10, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: diario.tracejado, gap: 6 }}>
                <Escrita estilo={diario.tipo.cadernoRotulo[p.tam]} cor={diario.tinta}>
                  Como você se sentiu? <Escrita estilo={diario.tipo.cadernoRotulo[p.tam]} cor={diario.dataCaderno}>(opcional)</Escrita>
                </Escrita>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 }}>
                  {emotions.map((em, i) => {
                    const sel = p.folha.emocao === em.mood;
                    const algum = !!p.folha.emocao;
                    const c = emotionColors(em, scheme);
                    const lado = p.compacto ? 42 : 54;
                    return (
                      <Pressable
                        key={em.id}
                        onPress={() => p.onEmocao(em.mood)}
                        accessibilityRole="radio"
                        accessibilityLabel={em.label}
                        accessibilityState={{ selected: sel }}
                        testID={`diario-adesivo-${em.id}`}
                        style={{ width: p.compacto ? '33.33%' : '16.66%', minHeight: p.compacto ? 64 : 76, alignItems: 'center' }}
                      >
                        <MotiView
                          animate={{ rotate: sel ? '-12deg' : `${(i % 3) * 4 - 4}deg`, scale: sel ? 1.16 : 1, opacity: algum && !sel ? 0.45 : 1 }}
                          transition={timing(180)}
                          style={{ alignItems: 'center', gap: 2 }}
                        >
                          <View
                            style={{
                              width: lado,
                              height: lado,
                              borderRadius: lado / 2,
                              backgroundColor: c.fill,
                              borderWidth: p.compacto ? 3 : 4,
                              borderColor: diario.borda,
                              alignItems: 'center',
                              justifyContent: 'center',
                              // slop:ok sombra adesivo na cartela
                              boxShadow: sel ? diario.sombra.adesivoColado : diario.sombra.adesivo,
                            }}
                          >
                            <Icon name={iconeDe(em.id)} size={p.compacto ? 22 : 26} color={c.onFill} strokeWidth={2.2} />
                          </View>
                          <Escrita estilo={diario.tipo.adesivo[p.tam]} cor={diario.tinta} style={{ textAlign: 'center', paddingHorizontal: 2 }}>
                            {em.label}
                          </Escrita>
                        </MotiView>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </View>
      </Papel>
    </ScrollView>
  );
}

function Rodape(p: CadernetaProps) {
  const { spacing, radius } = useTheme();
  const botao = { height: 44, paddingHorizontal: 18, borderRadius: radius.md, alignItems: 'center' as const, justifyContent: 'center' as const, flexDirection: 'row' as const, gap: 6 };
  const ocupado = p.fase !== 'aberto';
  if (p.modo === 'ler') {
    return (
      <SurfaceProvider value={diario.capa}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingTop: 10, paddingBottom: 12, paddingHorizontal: 4 }}>
        <Pressable onPress={p.onExcluir} disabled={ocupado} accessibilityRole="button" accessibilityLabel="Excluir anotação" testID="diario-ver-excluir" style={[botao, { width: 44, paddingHorizontal: 0, backgroundColor: diario.botaoCapa }]}>
          <Icon name="apagar" size={20} color={diario.sobreCapa} />
        </Pressable>
        <Pressable onPress={p.onFechar} disabled={ocupado} accessibilityRole="button" testID="diario-fechar" style={[botao, { flex: 1 }]}>
          <Text variant="subtitle" color={diario.sobreCapa}>Fechar</Text>
        </Pressable>
        <Pressable onPress={p.onEditar} disabled={ocupado} accessibilityRole="button" testID="diario-ver-editar" style={[botao, { flex: 1, backgroundColor: diario.papel }]}>
          <SurfaceProvider value={diario.papel}>
            <Icon name="editar" size={18} color={diario.capa} />
            <Text variant="subtitle" color={diario.capa}>Editar</Text>
          </SurfaceProvider>
        </Pressable>
      </View>
      </SurfaceProvider>
    );
  }
  return (
    <SurfaceProvider value={diario.capa}>
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, paddingTop: 10, paddingBottom: 12, paddingHorizontal: 4 }}>
      <Pressable onPress={p.onCancelarEdicao} disabled={ocupado} accessibilityRole="button" testID="diario-cancelar" style={[botao, p.compacto ? { flex: 1 } : null]}>
        <Text variant="subtitle" color={diario.sobreCapa}>Cancelar</Text>
      </Pressable>
      <Pressable
        onPress={p.onGuardar}
        disabled={ocupado || p.salvando}
        accessibilityRole="button"
        accessibilityState={{ busy: !!p.salvando }}
        testID="diario-salvar"
        style={[botao, { backgroundColor: diario.papel, opacity: p.salvando ? 0.7 : 1 }, p.compacto ? { flex: 1 } : null]}
      >
        <SurfaceProvider value={diario.papel}>
          <Text variant="subtitle" color={diario.capa}>{p.salvando ? 'Guardando…' : 'Guardar'}</Text>
        </SurfaceProvider>
      </Pressable>
    </View>
    </SurfaceProvider>
  );
}
