import { useCallback, useEffect, useMemo, useState } from 'react';

import { REGRAS } from '@/entities';
import { api, mensagemErro } from '@/infrastructure';
import type { HistorySummary, MoodDistribution, MoodLog, EvolutionPoint } from '@/models';

import { useSemLogin } from './useSemLogin';

export type Periodo = (typeof REGRAS.PERIODOS_HISTORICO)[number];
export const RECENTES_INICIAL = 5;

export interface PontoGrafico {
  date: string;
  label: string;
  value: number;
  count: number;
}

function rotuloDia(iso: string) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function useHistoricoController() {
  const tratarSemLogin = useSemLogin();
  const [periodo, setPeriodo] = useState<Periodo>(7);
  const [resumo, setResumo] = useState<HistorySummary | null>(null);
  const [registros, setRegistros] = useState<MoodLog[]>([]);
  const [evolucao, setEvolucao] = useState<EvolutionPoint[]>([]);
  const [distribuicao, setDistribuicao] = useState<MoodDistribution | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const carregarTudo = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [res, lista, resp] = await Promise.all([
        api.historico.resumo(),
        api.humor.todos(),
        api.respiracao.stats().catch(() => null),
      ]);
      // o resumo do back devolve 0 sessões de respiração: usa /v1/breathing/stats
      setResumo({ ...res, breathingSessions: resp ? resp.totalSessions : res.breathingSessions });
      setRegistros([...(lista ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
    } catch (e) {
      if (!tratarSemLogin(e)) setErro(mensagemErro(e));
    } finally {
      setCarregando(false);
    }
  }, [tratarSemLogin]);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [ev, di] = await Promise.all([api.historico.evolucao(periodo), api.historico.distribuicao(periodo)]);
        if (!vivo) return;
        setEvolucao(ev ?? []);
        setDistribuicao(di ?? { items: [], total: 0, predominant: null, predominantPercentage: 0 });
      } catch (e) {
        if (vivo && !tratarSemLogin(e)) setErro(mensagemErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [periodo, tratarSemLogin]);

  // dias sem registro (averageScore null) ficam fora do gráfico
  const pontos: PontoGrafico[] = useMemo(
    () =>
      evolucao
        .filter((p) => p.count > 0 && p.averageScore != null)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((p) => ({ date: p.date, label: rotuloDia(p.date), value: Number((p.averageScore as number).toFixed(2)), count: p.count })),
    [evolucao],
  );

  const itensDistribuicao = useMemo(
    () => (distribuicao?.items ?? []).filter((i) => i.count > 0).sort((a, b) => b.count - a.count),
    [distribuicao],
  );

  const visiveis = mostrarTodos ? registros : registros.slice(0, RECENTES_INICIAL);
  const atual = resumo?.currentStreak ?? 0;
  const mensagemSequencia =
    atual === 0 ? 'Registre seu humor hoje para começar uma sequência.' : atual === 1 ? 'Bom começo! Volte amanhã.' : 'Continue assim!';

  return {
    periodos: REGRAS.PERIODOS_HISTORICO,
    periodo, setPeriodo, resumo, registros, visiveis, pontos, distribuicao, itensDistribuicao,
    carregando, erro, vazio: !carregando && !erro && registros.length === 0,
    mostrarTodos, alternarTodos: () => setMostrarTodos((v) => !v),
    podeVerTodos: registros.length > RECENTES_INICIAL, mensagemSequencia, recarregar: carregarTudo,
  };
}
