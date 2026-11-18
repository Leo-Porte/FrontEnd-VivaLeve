import { Caveat_500Medium, Caveat_700Bold, useFonts } from '@expo-google-fonts/caveat';
import { AnimatePresence, MotiView } from 'moti';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, TextInput, View, useWindowDimensions } from 'react-native';

import { Button, ConfirmDialog, EmptyState, ErrorState, Icon, Loading, Screen, Text, useReduceMotion, useScreenLayout } from '@/components/ui';
import { useDiarioController } from '@/controllers/useDiarioController';
import type { DiaryEntry } from '@/models';
import { useTheme } from '@/theme';

import { Calendario } from './Calendario';
import { CADERNO_MS, Caderneta, type FaseCaderno, type Folha } from './Caderneta';
import { agruparPorDia, celulasDoMes, chaveDia, dataDaChave, plural, tituloDoDia, vizinhos } from './regras';
import { Mural, type Rodada } from './Mural';
import { FonteMaoContext } from './papel';

const timing = (duration: number, delay = 0) => ({ type: 'timing', duration, delay }) as never;
const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Quanto dura cada etapa das animações da tela (ms). */
const MS = { troca: 360, queda: 1250, religar: 1000, novo: 2600 } as const;

type Visao = { tipo: 'calendario' } | { tipo: 'dia'; chave: string };

/** Campo de busca do iOS: fundo surfaceAlt, lupa à esquerda. */
function Busca({ value, onChangeText }: { value: string; onChangeText: (t: string) => void }) {
  const { colors, radius, spacing, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderCurve: 'continuous', paddingHorizontal: spacing.sm + 2, minHeight: 44 }}>
      <Icon name="buscar" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Buscar nas anotações"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        returnKeyType="search"
        accessibilityLabel="Buscar nas anotações do diário"
        testID="diario-busca"
        style={[{ flex: 1, minHeight: 44, ...typography.body, color: colors.text }, { outlineStyle: 'none' } as object]}
      />
    </View>
  );
}

/**
 * Diário: calendário do mês → toque num dia → mural com os post-its do dia, ligados por barbante na ordem do dia.
 * Tocar no post-it abre a caderneta; tocar na tachinha solta o post-it. A busca mostra o mural com os resultados.
 */
export function DiarioScreen() {
  const c = useDiarioController();
  const { colors, spacing } = useTheme();
  const { isCompact } = useScreenLayout();
  const { height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const [fonteMao] = useFonts({ Caveat_500Medium, Caveat_700Bold });

  const hoje = new Date();
  const [visao, setVisao] = useState<Visao>({ tipo: 'calendario' });
  const [mes, setMes] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [dir, setDir] = useState<'cima' | 'baixo'>('cima');
  const [rodada, setRodada] = useState<Rodada>({ chave: 1, desde: 0, atraso: 200 });
  const novaRodada = useCallback((atraso: number) => setRodada((r) => ({ chave: r.chave + 1, desde: 0, atraso })), []);

  // caderneta
  const [fase, setFase] = useState<FaseCaderno | null>(null);
  const [congelada, setCongelada] = useState<{ folha: Folha; modo: 'ler' | 'editar' } | null>(null);
  // mural
  const [novoId, setNovoId] = useState<number | null>(null);
  const [caindoId, setCaindoId] = useState<number | null>(null);
  const [religarId, setReligarId] = useState<number | null>(null);
  const [soltando, setSoltando] = useState<DiaryEntry | null>(null);
  const [proximoDoSolto, setProximoDoSolto] = useState<number | null>(null);

  const buscando = !!c.busca.trim();
  const chaveHoje = chaveDia(hoje);
  const porDia = agruparPorDia(c.entradas);
  const celulas = celulasDoMes(mes.ano, mes.mes, porDia, dataDaChave(chaveHoje));
  const doDiaBruto = visao.tipo === 'dia' ? porDia.get(visao.chave) ?? [] : [];
  // dia que ficou vazio (excluiu ou soltou a última anotação): volta para o calendário
  const diaVazio = visao.tipo === 'dia' && doDiaBruto.length === 0 && !c.carregando && caindoId === null && novoId === null && fase === null;
  const visaoTela: Visao = diaVazio ? { tipo: 'calendario' } : visao;
  const doDia = doDiaBruto;
  const viz = visao.tipo === 'dia' ? vizinhos(visao.chave, porDia) : { anterior: null, seguinte: null };
  const ehMesAtual = mes.ano === hoje.getFullYear() && mes.mes === hoje.getMonth();

  // ------------------------------------------------------------ navegação (a tela rola de uma para a outra)
  const trocar = useCallback(
    (nova: Visao, sentido: 'cima' | 'baixo') => {
      setDir(sentido);
      // o sentido precisa valer antes da troca: a tela que sai usa o `exit` do render anterior
      setTimeout(() => {
        setVisao(nova);
        novaRodada(reduce ? 0 : MS.troca);
      }, 0);
    },
    [novaRodada, reduce],
  );

  const abrirDia = (chave: string) => trocar({ tipo: 'dia', chave }, 'cima');
  const voltarAoCalendario = () => {
    if (visao.tipo === 'dia') {
      const d = dataDaChave(visao.chave);
      setMes({ ano: d.getFullYear(), mes: d.getMonth() });
    }
    trocar({ tipo: 'calendario' }, 'baixo');
  };
  const irParaDia = (chave: string | null) => {
    if (!chave) return;
    const d = dataDaChave(chave);
    setMes({ ano: d.getFullYear(), mes: d.getMonth() });
    setVisao({ tipo: 'dia', chave });
    novaRodada(50);
  };
  const mudarMes = (delta: number) => {
    setMes((m) => {
      const d = new Date(m.ano, m.mes + delta, 1);
      return { ano: d.getFullYear(), mes: d.getMonth() };
    });
    novaRodada(50);
  };

  // começar ou limpar a busca: os post-its grudam de novo (ajuste de estado durante o render, sem efeito)
  const [buscandoAntes, setBuscandoAntes] = useState(buscando);
  if (buscandoAntes !== buscando) {
    setBuscandoAntes(buscando);
    setRodada((r) => ({ chave: r.chave + 1, desde: 0, atraso: 50 }));
  }

  // ------------------------------------------------------------ caderneta
  const aberta = !!(c.form.aberto || c.visualizando || congelada);
  const modo: 'ler' | 'editar' = congelada?.modo ?? (c.form.aberto ? 'editar' : 'ler');
  const folhaAtual: Folha = c.form.aberto
    ? { titulo: c.form.titulo, texto: c.form.texto, emocao: c.form.emocao, quando: c.visualizando?.createdAt ?? hoje.toISOString() }
    : c.visualizando
      ? { titulo: c.visualizando.title, texto: c.visualizando.text, emocao: c.visualizando.emotion, quando: c.visualizando.createdAt }
      : { titulo: '', texto: '', emocao: null, quando: hoje.toISOString() };
  const folha = congelada?.folha ?? folhaAtual;

  const abrirPostit = (e: DiaryEntry) => {
    setFase('aberto');
    c.ver(e);
  };
  const novaAnotacao = () => {
    setFase('aberto');
    c.novaEntrada();
  };

  /** A caderneta desce e some; depois limpa o que estava aberto. */
  const descer = async () => {
    setCongelada({ folha, modo });
    setFase('descendo');
    await esperar(reduce ? 0 : CADERNO_MS.desce);
    c.fecharForm();
    c.fecharVisualizacao();
    setFase(null);
    setCongelada(null);
  };

  const fechar = () => {
    if (fase && fase !== 'aberto') return;
    void descer();
  };
  // cancelar a edição de uma anotação que já existe volta para a leitura; nova anotação desce
  const cancelarEdicao = () => {
    if (c.visualizando) c.fecharForm();
    else fechar();
  };

  const guardar = async () => {
    if (c.form.editandoId) {
      const salva = await c.salvar();
      if (salva) c.ver(salva);
      return;
    }
    // nova: a página é arrancada enquanto salva; depois a caderneta desce e o post-it é cravado no mural do dia
    const inicio = Date.now();
    setCongelada({ folha: folhaAtual, modo: 'editar' });
    setFase('arrancando');
    const salva = await c.salvar();
    if (!salva) {
      setFase('aberto');
      setCongelada(null);
      return;
    }
    await esperar(Math.max(0, (reduce ? 0 : CADERNO_MS.arranca) - (Date.now() - inicio)));
    const chave = chaveDia(new Date(salva.createdAt));
    const d = dataDaChave(chave);
    setMes({ ano: d.getFullYear(), mes: d.getMonth() });
    setVisao({ tipo: 'dia', chave });
    setNovoId(salva.id);
    setFase('descendo');
    await esperar(reduce ? 0 : CADERNO_MS.desce);
    setFase(null);
    setCongelada(null);
    setTimeout(() => setNovoId(null), MS.novo);
  };

  const confirmarExclusao = async () => {
    setDir('baixo');
    setCongelada({ folha, modo: 'ler' });
    setFase('descendo');
    const [ok] = await Promise.all([c.confirmarExclusao(), esperar(reduce ? 0 : CADERNO_MS.desce)]);
    if (!ok) c.fecharVisualizacao();
    setFase(null);
    setCongelada(null);
  };

  // ------------------------------------------------------------ soltar o post-it pela tachinha
  const lista = buscando ? c.entradas : doDia;
  const confirmarSoltar = async () => {
    const alvo = soltando;
    setSoltando(null);
    if (!alvo) return;
    const i = lista.findIndex((e) => e.id === alvo.id);
    setProximoDoSolto(lista[i + 1]?.id ?? null);
    setDir('baixo');
    setCaindoId(alvo.id);
    await esperar(reduce ? 0 : MS.queda);
    const ok = await c.apagar(alvo);
    if (!ok) setCaindoId(null);
  };
  // o post-it só sai de vez quando a lista recarregada não o tem mais; aí o barbante religa os vizinhos
  if (caindoId !== null && !c.entradas.some((e) => e.id === caindoId)) {
    setCaindoId(null);
    setReligarId(proximoDoSolto);
  }
  useEffect(() => {
    if (religarId === null) return;
    const t = setTimeout(() => setReligarId(null), MS.religar);
    return () => clearTimeout(t);
  }, [religarId]);

  // ------------------------------------------------------------ tela
  const chaveTela = buscando ? 'busca' : visaoTela.tipo === 'dia' ? 'dia' : 'calendario';
  const deslocamento = reduce ? 0 : height;

  let corpo: React.ReactNode;
  if (c.carregando && c.entradas.length === 0) corpo = <Loading label="Carregando..." />;
  else if (c.erro) corpo = <ErrorState message={c.erro} onRetry={c.recarregar} />;
  else if (buscando) {
    corpo = c.entradas.length ? (
      <Mural entradas={c.entradas} compacto={isCompact} comData rodada={rodada} novoId={novoId} caindoId={caindoId} religarId={religarId} onAbrir={abrirPostit} onSoltar={setSoltando} />
    ) : (
      <EmptyState icon="buscar" title={`Nenhuma anotação encontrada para "${c.busca.trim()}"`} />
    );
  } else if (visaoTela.tipo === 'calendario' || visao.tipo !== 'dia') {
    corpo = (
      <Calendario
        ano={mes.ano}
        mes={mes.mes}
        celulas={celulas}
        compacto={isCompact}
        rodada={rodada.chave}
        podeSeguinte={!ehMesAtual}
        onDia={abrirDia}
        onMesAnterior={() => mudarMes(-1)}
        onMesSeguinte={() => mudarMes(1)}
        onHoje={() => {
          setMes({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
          novaRodada(50);
        }}
      />
    );
  } else {
    corpo = (
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Pressable onPress={voltarAoCalendario} accessibilityRole="button" testID="diario-voltar" style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 }}>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <Icon name="avancar" size={20} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text tone="primary">Calendário</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ flex: 1 }}>
              <Text variant="title" testID="diario-dia-titulo">{tituloDoDia(visao.chave, hoje)}</Text>
              <Text variant="caption" tone="muted">{plural(doDia.length)}</Text>
            </View>
            <SetaDia sentido="anterior" desabilitada={!viz.anterior} onPress={() => irParaDia(viz.anterior)} />
            <SetaDia sentido="seguinte" desabilitada={!viz.seguinte} onPress={() => irParaDia(viz.seguinte)} />
          </View>
        </View>
        <Mural entradas={doDia} compacto={isCompact} comData={false} rodada={rodada} novoId={novoId} caindoId={caindoId} religarId={religarId} onAbrir={abrirPostit} onSoltar={setSoltando} />
      </View>
    );
  }

  return (
    <FonteMaoContext.Provider value={fonteMao}>
      <Screen>
        <View style={{ gap: spacing.xs }}>
          <Text variant="display">Diário</Text>
          <Text tone="muted">Seu mural de anotações.</Text>
        </View>

        <View style={{ flexDirection: isCompact ? 'column' : 'row', alignItems: isCompact ? 'stretch' : 'center', gap: spacing.sm }}>
          <View style={{ flex: isCompact ? undefined : 1 }}>
            <Busca value={c.busca} onChangeText={c.setBusca} />
          </View>
          <Button label="Nova anotação" icon="adicionar" fullWidth={isCompact} onPress={novaAnotacao} testID="diario-novo" />
        </View>

        <AnimatePresence exitBeforeEnter>
          <MotiView
            key={chaveTela}
            from={{ translateY: dir === 'cima' ? deslocamento : -deslocamento }}
            animate={{ translateY: 0 }}
            exit={{ translateY: dir === 'cima' ? -deslocamento : deslocamento }}
            transition={timing(MS.troca / 2 + 20)}
            exitTransition={timing(MS.troca / 2 - 20)}
          >
            {corpo}
          </MotiView>
        </AnimatePresence>
      </Screen>

      <Caderneta
        visivel={aberta}
        fase={fase ?? 'aberto'}
        modo={modo}
        folha={folha}
        compacto={isCompact}
        rotulo={modo === 'ler' ? `Anotação: ${folha.titulo}` : c.form.editandoId ? 'Editar anotação' : 'Nova anotação'}
        erro={c.erroForm}
        salvando={c.salvando}
        onTitulo={(t) => c.mudarForm({ titulo: t })}
        onTexto={(t) => c.mudarForm({ texto: t })}
        onEmocao={c.alternarEmocao}
        onFechar={fechar}
        onCancelarEdicao={cancelarEdicao}
        onGuardar={guardar}
        onEditar={() => c.visualizando && c.editar(c.visualizando)}
        onExcluir={() => c.visualizando && c.pedirExclusao(c.visualizando)}
      />

      <ConfirmDialog
        visible={!!c.paraExcluir}
        title="Excluir anotação"
        message="Tem certeza que deseja excluir esta anotação? O post-it sai do mural."
        confirmLabel="Excluir"
        destructive
        loading={c.excluindo}
        confirmTestID="confirm-ok"
        cancelTestID="confirm-cancelar"
        onConfirm={confirmarExclusao}
        onCancel={c.cancelarExclusao}
      />
      <ConfirmDialog
        visible={!!soltando}
        title="Soltar este post-it?"
        message="Ele vai sair do mural e a anotação será apagada."
        confirmLabel="Soltar"
        destructive
        confirmTestID="soltar-ok"
        cancelTestID="soltar-cancelar"
        onConfirm={confirmarSoltar}
        onCancel={() => setSoltando(null)}
      />
    </FonteMaoContext.Provider>
  );
}

function SetaDia({ sentido, desabilitada, onPress }: { sentido: 'anterior' | 'seguinte'; desabilitada: boolean; onPress: () => void }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitada}
      accessibilityRole="button"
      accessibilityLabel={sentido === 'anterior' ? 'Dia anterior com anotação' : 'Próximo dia com anotação'}
      accessibilityState={{ disabled: desabilitada }}
      testID={`diario-dia-${sentido}`}
      style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', opacity: desabilitada ? 0.35 : 1 }}
    >
      <View style={sentido === 'anterior' ? { transform: [{ scaleX: -1 }] } : undefined}>
        <Icon name="avancar" size={20} color={colors.primary} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}
