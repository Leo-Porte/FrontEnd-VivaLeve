import { agruparPorDia, celulasDoMes, chaveDia, plural, posicoes, tituloDoDia, vizinhos } from '../diario/regras';

const e = (id: number, iso: string) => ({ id, title: `t${id}`, text: 'x', emotion: null, createdAt: iso, updatedAt: '' });

describe('diário: regras do calendário e do mural', () => {
  const lista = [e(1, '2026-11-17T20:00:00'), e(2, '2026-11-17T08:00:00'), e(3, '2026-11-13T12:00:00'), e(4, '2026-10-30T09:00:00')];

  it('agrupa por dia local, cada dia em ordem do mais cedo para o mais tarde (ordem do barbante)', () => {
    const porDia = agruparPorDia(lista);
    expect([...porDia.keys()].sort()).toEqual(['2026-10-30', '2026-11-13', '2026-11-17']);
    expect(porDia.get('2026-11-17')!.map((x) => x.id)).toEqual([2, 1]);
  });

  it('monta semanas completas do mês, marca hoje, futuro e fora do mês', () => {
    const cel = celulasDoMes(2026, 10, agruparPorDia(lista), new Date(2026, 10, 17, 15));
    expect(cel.length % 7).toBe(0);
    expect(cel[0].chave).toBe('2026-11-01'); // 1/nov/2026 é domingo
    const hoje = cel.find((c) => c.hoje)!;
    expect(hoje.chave).toBe('2026-11-17');
    expect(hoje.anotacoes).toHaveLength(2);
    expect(cel.find((c) => c.chave === '2026-11-18')!.futuro).toBe(true);
    // 30/out aparece na grade de novembro? não: novembro começa no domingo, sem dias de fora no começo
    expect(cel.some((c) => c.chave === '2026-10-30')).toBe(false);
    expect(cel.filter((c) => !c.doMes).every((c) => c.anotacoes.length === 0)).toBe(true);
  });

  it('acha o dia anterior e o seguinte com anotação', () => {
    const porDia = agruparPorDia(lista);
    expect(vizinhos('2026-11-13', porDia)).toEqual({ anterior: '2026-10-30', seguinte: '2026-11-17' });
    expect(vizinhos('2026-11-17', porDia)).toEqual({ anterior: '2026-11-13', seguinte: null });
  });

  it('textos', () => {
    expect(plural(1)).toBe('1 anotação');
    expect(plural(3)).toBe('3 anotações');
    expect(tituloDoDia('2026-11-17', new Date(2026, 10, 17))).toBe('Terça-feira, 17 de novembro');
    expect(tituloDoDia('2025-12-31', new Date(2026, 10, 17))).toBe('Quarta-feira, 31 de dezembro de 2025');
    expect(chaveDia(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('posições estáveis: zigue-zague no telefone, serpentina na tela larga', () => {
    const tel = posicoes([1, 2, 3], 358, true);
    expect(tel.itens[0].x).toBeLessThan(tel.itens[1].x);
    expect(tel.itens[2].x).toBeLessThan(tel.itens[1].x);
    expect(posicoes([1, 2, 3], 358, true)).toEqual(tel);
    const larga = posicoes([1, 2, 3, 4, 5, 6, 7], 1056, false);
    expect(larga.medidas.colunas).toBe(4);
    // a segunda fileira volta da direita para a esquerda
    expect(larga.itens[5].x).toBeGreaterThan(larga.itens[6].x);
    expect(larga.alturaTotal).toBeGreaterThan(larga.itens[6].y);
  });
});
