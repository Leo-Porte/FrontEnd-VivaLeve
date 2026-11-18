import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Respiracao,
  TECNICA_345,
  duracaoTotal,
  segundosPorCiclo,
  type EstadoRespiracao,
  type FaseRespiracao,
} from '@/entities';
import { api, mensagemErro } from '@/infrastructure';
import type { BreathingStats } from '@/models';

export const FASES = TECNICA_345.fases;
export const CICLOS = TECNICA_345.ciclos;
export type FaseId = FaseRespiracao['id'];

export function useRespirarController() {
  const [estado, setEstado] = useState<EstadoRespiracao>(Respiracao.inicial);
  const [aviso, setAviso] = useState<string | null>(null);
  const [stats, setStats] = useState<BreathingStats | null>(null);
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [apagando, setApagando] = useState(false);
  const registrada = useRef(false);
  /** muda a cada início/reinício: a animação usa como chave para recomeçar o loop junto com o relógio */
  const [sessao, setSessao] = useState(0);

  const atualizarStats = useCallback(async () => {
    try {
      setStats(await api.respiracao.stats());
    } catch {
      /* 401 é tratado pelo AuthGuard */
    }
  }, []);

  useEffect(() => {
    atualizarStats();
  }, [atualizarStats]);

  // um relógio de 1s enquanto roda; a regra de avanço mora em Respiracao.tick
  const rodando = estado.tipo === 'rodando';
  useEffect(() => {
    if (!rodando) return;
    const t = setInterval(() => setEstado((e) => Respiracao.tick(e)), 1000);
    return () => clearInterval(t);
  }, [rodando]);

  // ao concluir: registra a sessão uma única vez
  useEffect(() => {
    if (estado.tipo !== 'concluido' || registrada.current) return;
    registrada.current = true;
    (async () => {
      try {
        await api.respiracao.registrar({
          technique: TECNICA_345.id,
          cycles: estado.ciclos,
          durationSeconds: estado.durationSeconds,
        });
      } catch (e) {
        setAviso('Exercício concluído, mas a sessão não foi salva: ' + mensagemErro(e));
      }
      atualizarStats();
    })();
  }, [estado, atualizarStats]);

  const iniciar = useCallback(() => {
    registrada.current = false;
    setSessao((n) => n + 1);
    setAviso(null);
    setEstado(Respiracao.iniciar());
  }, []);
  const parar = useCallback(() => setEstado(Respiracao.parar()), []);
  const alternar = useCallback(() => (rodando ? parar() : iniciar()), [rodando, parar, iniciar]);

  const confirmarApagar = useCallback(async () => {
    setApagando(true);
    try {
      await api.respiracao.apagarTodas();
    } catch (e) {
      setAviso(mensagemErro(e, 'Não foi possível apagar as sessões.'));
    }
    setApagando(false);
    setConfirmandoApagar(false);
    atualizarStats();
  }, [atualizarStats]);

  const fase = Respiracao.fase(estado);
  const faseIndex = estado.tipo === 'rodando' ? estado.faseIndex : 0;
  const fimDecorrido = FASES.slice(0, faseIndex + 1).reduce((s, f) => s + f.dur, 0);

  return {
    estado: rodando ? 'rodando' : estado.tipo === 'concluido' ? 'concluido' : ('idle' as const),
    fase,
    ciclo: estado.tipo === 'rodando' ? estado.ciclo : 0,
    restante: Respiracao.restanteFase(estado),
    /** 0..1: progresso do ciclo ao fim da fase atual (anel). */
    progressoFimFase: rodando ? fimDecorrido / segundosPorCiclo(TECNICA_345) : 0,
    /** 0..1 dentro da fase atual (orb 3D). */
    progressoFase: Respiracao.progressoFase(estado),
    sessao,
    aviso, stats, iniciar, parar, alternar, reiniciar: iniciar,
    confirmandoApagar, pedirApagar: () => setConfirmandoApagar(true), cancelarApagar: () => setConfirmandoApagar(false),
    confirmarApagar, apagando,
    duracaoTotal: duracaoTotal(TECNICA_345),
  };
}
