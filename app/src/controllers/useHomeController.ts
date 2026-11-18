import { useEffect, useMemo, useState } from 'react';

import type { IconName } from '@/components/ui';
import { fraseDoDia, REDE_APOIO } from '@/entities/catalogo';
import { api } from '@/infrastructure';
import type { Mood, MoodLog } from '@/models';
import type { PeriodoDoDia } from '@/theme';

/** Humores em que a Home sugere uma pausa (respiração) em vez de escrever no diário. */
const DIFICEIS: readonly Mood[] = ['ANSIOSO', 'MAL', 'DEPRESSIVO'];

export interface Sugestao {
  id: 'respirar' | 'diario';
  rota: '/respirar' | '/diario';
  icone: IconName;
  titulo: string;
  texto: string;
  acao: string;
}

/** Uma sugestão só para agora, conforme o humor de hoje (ou a falta dele). */
export function sugestaoPara(humorHoje: Mood | null): Sugestao {
  if (!humorHoje) {
    return {
      id: 'respirar', rota: '/respirar', icone: 'respirar',
      titulo: 'Cinco minutos para você',
      texto: 'Uma respiração guiada ajuda a desacelerar antes de seguir o dia.',
      acao: 'Respirar agora',
    };
  }
  if (DIFICEIS.includes(humorHoje)) {
    return {
      id: 'respirar', rota: '/respirar', icone: 'respirar',
      titulo: 'Uma pausa de 2 minutos',
      texto: 'Respiração 3-4-5: inspire 3 s, segure 4 s, expire 5 s. Ajuda quando a ansiedade aperta.',
      acao: 'Começar a respirar',
    };
  }
  return {
    id: 'diario', rota: '/diario', icone: 'diario',
    titulo: 'Quer guardar esse momento?',
    texto: 'Escreva no diário o que fez o dia ser assim. Ajuda a lembrar do que te faz bem.',
    acao: 'Escrever no diário',
  };
}

export interface DiaDaSemana {
  /** AAAA-MM-DD */
  dia: string;
  /** "Seg", "Ter"… ou "Hoje" */
  rotulo: string;
  /** "Segunda", "Terça"… ou "Hoje" (para leitor de tela) */
  nome: string;
  hoje: boolean;
  /** humor mais recente do dia; null = sem registro */
  mood: Mood | null;
}

const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function isoDe(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const diaDe = (r: MoodLog) => r.logDate || isoDe(new Date(r.createdAt));

/** Os últimos 7 dias (do mais antigo até hoje), cada um com o humor mais recente registrado nele. */
export function semanaDe(registros: MoodLog[], agora = new Date()): DiaDaSemana[] {
  const porDia = new Map<string, MoodLog>();
  for (const r of registros) {
    const atual = porDia.get(diaDe(r));
    if (!atual || new Date(r.createdAt).getTime() > new Date(atual.createdAt).getTime()) porDia.set(diaDe(r), r);
  }
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - (6 - i));
    const iso = isoDe(d);
    const hoje = i === 6;
    return {
      dia: iso,
      rotulo: hoje ? 'Hoje' : DIAS_CURTOS[d.getDay()],
      nome: hoje ? 'Hoje' : DIAS_LONGOS[d.getDay()],
      hoje,
      mood: porDia.get(iso)?.mood ?? null,
    };
  });
}

/** Manhã 5–12h, tarde 12–17h, entardecer 17–19h, noite 19–5h. */
export function periodoDoDia(agora = new Date()): PeriodoDoDia {
  const h = agora.getHours();
  if (h >= 5 && h < 12) return 'manha';
  if (h >= 12 && h < 17) return 'tarde';
  if (h >= 17 && h < 19) return 'entardecer';
  return 'noite';
}

const SAUDACAO: Record<PeriodoDoDia, string> = { manha: 'Bom dia', tarde: 'Boa tarde', entardecer: 'Boa tarde', noite: 'Boa noite' };

function saudacaoDaHora(nome: string): { texto: string } {
  const sufixo = nome ? `, ${nome}` : '';
  return { texto: `${SAUDACAO[periodoDoDia()]}${sufixo}!` };
}

export function useHomeController() {
  const [nome, setNome] = useState('');
  const [registros, setRegistros] = useState<MoodLog[]>([]);

  useEffect(() => {
    let vivo = true;
    api.usuarios
      .eu()
      .then((u) => {
        if (vivo) setNome(u.name?.trim().split(/\s+/)[0] ?? '');
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    let vivo = true;
    try {
      api.humor
        .todos()
        .then((todos) => {
          if (!vivo) return;
          setRegistros(todos.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        })
        .catch(() => {});
    } catch {
      /* sem registros: a Home mostra o estado vazio */
    }
    return () => {
      vivo = false;
    };
  }, []);

  const saudacao = useMemo(() => saudacaoDaHora(nome), [nome]);
  const frase = useMemo(() => fraseDoDia(), []);
  const hoje = isoDe(new Date());
  const registroHoje = registros.find((r) => diaDe(r) === hoje) ?? null;
  const semana = useMemo(() => semanaDe(registros), [registros]);
  const sugestao = sugestaoPara(registroHoje?.mood ?? null);
  const apoioPrincipal = REDE_APOIO.find((r) => r.telefone) ?? REDE_APOIO[0];
  const apoioExtra = REDE_APOIO.filter((r) => r !== apoioPrincipal);

  const periodo = useMemo(() => periodoDoDia(), []);

  return { saudacao, periodo, frase, registroHoje, semana, sugestao, apoioPrincipal, apoioExtra, redeApoio: REDE_APOIO };
}

/** Ícone de cada item da rede de apoio. */
export const ICONE_APOIO: Record<string, IconName> = {
  cvv: 'telefone',
  psicologos: 'escudo',
  'terapia-online': 'cha',
  ansiedade: 'ideia',
};
