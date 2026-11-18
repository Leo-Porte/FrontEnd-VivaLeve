import { useCallback, useEffect, useRef, useState } from 'react';

import { api, mensagemErro } from '@/infrastructure';
import { ATIVIDADES } from '@/entities/catalogo';
import { Envio } from '@/entities/estados';
import type { Activity, Mood, MoodLog } from '@/models';

export const LIMITE_NOTA = 500;
/** quantos registros a linha do tempo mostra depois de salvar */
export const LIMITE_LINHA_DO_TEMPO = 10;

function isoDe(d: Date) {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function hojeISO() {
  return isoDe(new Date());
}

/** Dia do registro (AAAA-MM-DD): o `logDate` da API; sem ele, a data local do `createdAt`. */
function diaDe(r: MoodLog): string {
  if (r.logDate) return r.logDate;
  return isoDe(new Date(r.createdAt));
}

/** "Hoje", "Ontem" ou "Domingo, 15 de novembro". */
export function tituloDoDia(iso: string, hoje: string): string {
  if (iso === hoje) return 'Hoje';
  const [a, m, d] = hoje.split('-').map(Number);
  if (iso === isoDe(new Date(a, m - 1, d - 1))) return 'Ontem';
  const [ya, ym, yd] = iso.split('-').map(Number);
  const t = new Date(ya, ym - 1, yd).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export interface DiaDaLinha {
  /** AAAA-MM-DD */
  dia: string;
  titulo: string;
  hoje: boolean;
  registros: MoodLog[];
}

/** Agrupa registros (já do mais novo ao mais antigo) por dia, mantendo a ordem. */
export function agruparPorDia(registros: MoodLog[], hoje: string): DiaDaLinha[] {
  const dias: DiaDaLinha[] = [];
  for (const r of registros) {
    const dia = diaDe(r);
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo.dia === dia) ultimo.registros.push(r);
    else dias.push({ dia, titulo: tituloDoDia(dia, hoje), hoje: dia === hoje, registros: [r] });
  }
  return dias;
}

export function useHumorController() {
  const [emocao, setEmocao] = useState<Mood | null>(null);
  const [atividades, setAtividades] = useState<Activity[]>([]);
  const [nota, setNotaBruta] = useState('');
  const [envio, setEnvio] = useState<Envio>(Envio.parado);
  const enviando = useRef(false); // trava clique duplo no mesmo instante, antes do re-render
  const salvando = envio.tipo === 'enviando';
  const salvo = envio.tipo === 'enviado';
  const erro = envio.tipo === 'falhou' ? envio.mensagem : '';
  const [registros, setRegistros] = useState<MoodLog[]>([]);

  const carregar = useCallback(async () => {
    try {
      const todos = await api.humor.todos();
      setRegistros(
        todos
          .slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      );
    } catch {
      setRegistros([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const setNota = useCallback((t: string) => setNotaBruta(t.slice(0, LIMITE_NOTA)), []);

  const alternarAtividade = useCallback((a: Activity) => {
    setAtividades((atual) => (atual.includes(a) ? atual.filter((x) => x !== a) : [...atual, a]));
  }, []);

  const limparCampos = useCallback(() => {
    setEmocao(null);
    setAtividades([]);
    setNotaBruta('');
  }, []);

  /** Volta ao começo para um novo registro (sai da tela de "Registro salvo"). */
  const limpar = useCallback(() => {
    limparCampos();
    setEnvio(Envio.parado);
  }, [limparCampos]);

  const salvar = useCallback(async () => {
    if (!emocao || enviando.current || !Envio.podeEnviar(envio)) return;
    enviando.current = true;
    setEnvio(Envio.enviando);
    try {
      // Se falhar (ex.: limite de 3 por dia), nada é salvo.
      await api.humor.criar(emocao, nota.trim() || undefined, atividades);
      // a tela de "Registro salvo" com a linha do tempo fica até a pessoa pedir um novo registro
      setEnvio(Envio.enviado);
      limparCampos();
      void carregar();
    } catch (e) {
      setEnvio(Envio.falhou(mensagemErro(e, 'Erro ao salvar. Tente novamente.')));
    } finally {
      enviando.current = false;
    }
  }, [emocao, envio, nota, atividades, carregar, limparCampos]);

  const hoje = hojeISO();
  const registrosHoje = registros.filter((r) => r.logDate === hoje);
  const recentes = registros.slice(0, 7);
  const linhaDoTempo = agruparPorDia(registros.slice(0, LIMITE_LINHA_DO_TEMPO), hoje);

  return {
    emocao, setEmocao, atividades, alternarAtividade, nota, setNota,
    salvando, salvo, erro, salvar, podeSalvar: Boolean(emocao) && !salvando,
    registrosHoje, recentes, linhaDoTempo, atividadesDisponiveis: ATIVIDADES, novoRegistro: limpar,
  };
}
