import { MOODS, ACTIVITIES } from '@/models';
import {
  ATIVIDADES, Carregamento, EMOCOES, Envio, FRASES_MOTIVACIONAIS, Respiracao, SONS, TECNICA_345,
  duracaoTotal, emocaoPorId, emocaoPorMood, fraseDoDia, segundosPorCiclo, type EstadoRespiracao,
} from '@/entities';

describe('catálogo', () => {
  it('tem uma emoção por Mood da API, sem repetir id', () => {
    expect(EMOCOES.map((e) => e.mood).sort()).toEqual([...MOODS].sort());
    expect(new Set(EMOCOES.map((e) => e.id)).size).toBe(EMOCOES.length);
  });

  it('tem uma atividade por Activity da API', () => {
    expect(ATIVIDADES.map((a) => a.activity).sort()).toEqual([...ACTIVITIES].sort());
  });

  it('é imutável', () => {
    expect(Object.isFrozen(EMOCOES)).toBe(true);
    expect(Object.isFrozen(EMOCOES[0])).toBe(true);
    expect(Object.isFrozen(TECNICA_345.fases[0])).toBe(true);
    try {
      (EMOCOES[0] as { label: string }).label = 'x';
    } catch {
      /* em strict mode lança; fora dele ignora — nos dois casos não pode mudar */
    }
    expect(EMOCOES[0].label).toBe('Ótimo');
  });

  it('busca emoção por mood e id, com fallback', () => {
    expect(emocaoPorMood('MAIS_OU_MENOS').id).toBe('mais-ou-menos');
    expect(emocaoPorId('ansioso').mood).toBe('ANSIOSO');
    expect(emocaoPorMood(null).id).toBe('desconhecido');
  });

  it('respiração 3-4-5 dura 12s por ciclo e 60s no total', () => {
    expect(segundosPorCiclo(TECNICA_345)).toBe(12);
    expect(duracaoTotal(TECNICA_345)).toBe(60);
  });

  it('tem os 5 sons do legado', () => {
    expect(SONS.map((s) => s.id)).toEqual(['chuva', 'mar', 'vento', 'fogueira', 'tigelas']);
  });

  it('frase do dia é estável no mesmo dia', () => {
    const d = new Date(2026, 10, 17, 8);
    expect(fraseDoDia(d)).toBe(fraseDoDia(new Date(2026, 10, 17, 22)));
    expect(FRASES_MOTIVACIONAIS).toContain(fraseDoDia(d));
  });
});

describe('estados', () => {
  it('Carregamento.de separa vazio de sucesso', () => {
    expect(Carregamento.de([]).tipo).toBe('vazio');
    expect(Carregamento.de([1]).tipo).toBe('sucesso');
    expect(Carregamento.de({ a: 1 }).tipo).toBe('sucesso');
  });

  it('Envio bloqueia clique duplo', () => {
    expect(Envio.podeEnviar(Envio.enviando)).toBe(false);
    expect(Envio.podeEnviar(Envio.parado)).toBe(true);
  });

  it('respiração percorre todas as fases e conclui em 60 ticks', () => {
    let e: EstadoRespiracao = Respiracao.iniciar();
    const fases: string[] = [];
    let ticks = 0;
    while (e.tipo === 'rodando') {
      fases.push(Respiracao.fase(e)!.id);
      e = Respiracao.tick(e);
      ticks++;
    }
    expect(ticks).toBe(60);
    expect(e).toEqual({ tipo: 'concluido', ciclos: 5, durationSeconds: 60 });
    expect(fases.slice(0, 12)).toEqual([
      'inhale', 'inhale', 'inhale', 'hold', 'hold', 'hold', 'hold', 'exhale', 'exhale', 'exhale', 'exhale', 'exhale',
    ]);
  });

  it('respiração: progresso e contagem regressiva', () => {
    const e = Respiracao.iniciar();
    expect(Respiracao.restanteFase(e)).toBe(3);
    expect(Respiracao.progressoFase(e)).toBeCloseTo(1 / 3);
    expect(Respiracao.tick(Respiracao.inicial)).toBe(Respiracao.inicial);
  });
});
