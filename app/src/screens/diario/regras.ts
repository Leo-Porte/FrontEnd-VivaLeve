import type { DiaryEntry } from '@/models';

/** Regras puras do calendário e do mural do diário (sem React, testáveis). */

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const dois = (n: number) => String(n).padStart(2, '0');

/** Chave do dia no fuso local: 'AAAA-MM-DD'. */
export function chaveDia(d: Date): string {
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

export function dataDaChave(chave: string): Date {
  const [a, m, d] = chave.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function hora(iso: string): string {
  const d = new Date(iso);
  return `${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

export function plural(n: number): string {
  return n === 1 ? '1 anotação' : `${n} anotações`;
}

/** Anotações agrupadas por dia, cada grupo do mais cedo para o mais tarde (ordem do barbante). */
export function agruparPorDia(entradas: readonly DiaryEntry[]): Map<string, DiaryEntry[]> {
  const mapa = new Map<string, DiaryEntry[]>();
  for (const e of entradas) {
    const k = chaveDia(new Date(e.createdAt));
    const lista = mapa.get(k);
    if (lista) lista.push(e);
    else mapa.set(k, [e]);
  }
  for (const lista of mapa.values()) lista.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  return mapa;
}

export interface CelulaDia {
  chave: string;
  dia: number;
  doMes: boolean;
  hoje: boolean;
  futuro: boolean;
  anotacoes: DiaryEntry[];
}

/** Semanas completas (domingo a sábado) que cobrem o mês. `mes` de 0 a 11. */
export function celulasDoMes(ano: number, mes: number, porDia: Map<string, DiaryEntry[]>, hoje: Date): CelulaDia[] {
  const primeiro = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const total = Math.ceil((primeiro.getDay() + ultimoDia) / 7) * 7;
  const kHoje = chaveDia(hoje);
  const out: CelulaDia[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(ano, mes, 1 - primeiro.getDay() + i);
    const chave = chaveDia(d);
    const doMes = d.getMonth() === mes;
    out.push({
      chave,
      dia: d.getDate(),
      doMes,
      hoje: chave === kHoje,
      futuro: chave > kHoje,
      anotacoes: doMes ? porDia.get(chave) ?? [] : [],
    });
  }
  return out;
}

/** Dia com anotação imediatamente antes e depois de `chave` (para "Dia anterior" / "Próximo dia"). */
export function vizinhos(chave: string, porDia: Map<string, DiaryEntry[]>): { anterior: string | null; seguinte: string | null } {
  const dias = [...porDia.keys()].sort();
  let anterior: string | null = null;
  let seguinte: string | null = null;
  for (const d of dias) {
    if (d < chave) anterior = d;
    else if (d > chave && !seguinte) seguinte = d;
  }
  return { anterior, seguinte };
}

export function tituloDoDia(chave: string, hoje: Date): string {
  const d = dataDaChave(chave);
  const ano = d.getFullYear() !== hoje.getFullYear() ? ` de ${d.getFullYear()}` : '';
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}${ano}`;
}

export function nomeDoMes(ano: number, mes: number): string {
  return `${MESES[mes]} de ${ano}`;
}

export function dataLonga(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}, ${hora(iso)}`;
}

export function dataCurtaComHora(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES_CURTOS[d.getMonth()]} · ${hora(iso)}`;
}

// ------------------------------------------------------------ mural

export interface Posicao {
  x: number;
  y: number;
  /** graus */
  rot: number;
  /** tachinha (centro), onde o barbante se prende */
  pino: { x: number; y: number };
}

export interface Medidas {
  largura: number;
  altura: number;
  passoY: number;
  colunas: number;
}

/** Tamanho do post-it e do passo vertical: menor no telefone. */
export function medidasDoMural(larguraMural: number, compacto: boolean): Medidas {
  if (compacto) return { largura: 150, altura: 156, passoY: 128, colunas: 2 };
  const colunas = Math.max(2, Math.min(6, Math.floor((larguraMural + 48) / (196 + 48))));
  return { largura: 196, altura: 200, passoY: 250, colunas };
}

/** Variação estável por id (o post-it não muda de lugar a cada render). */
const variacao = (id: number, mult: number, faixa: number) => (((Math.abs(id) * mult) % faixa) - (faixa - 1) / 2);

/**
 * Posição de cada post-it. Telefone: zigue-zague em 2 colunas. Tela larga: fileiras em serpentina
 * (vai e volta), para o barbante seguir a ordem sem cruzar o mural.
 */
export function posicoes(ids: readonly number[], larguraMural: number, compacto: boolean): { itens: Posicao[]; alturaTotal: number; medidas: Medidas } {
  const m = medidasDoMural(larguraMural, compacto);
  const W = Math.max(m.largura * 2 + 24, larguraMural);
  const passoX = (W - m.largura - 16) / (m.colunas - 1);
  const itens = ids.map((id, i) => {
    let col: number;
    let y: number;
    if (compacto) {
      col = i % 2;
      y = 8 + i * m.passoY + ((id * 13) % 11);
    } else {
      const linha = Math.floor(i / m.colunas);
      col = i % m.colunas;
      if (linha % 2 === 1) col = m.colunas - 1 - col;
      y = 12 + linha * m.passoY + (col % 2) * 34 + variacao(id, 13, 23);
    }
    const x = Math.round(8 + col * passoX + variacao(id, 37, 17));
    const rot = variacao(id, 53, 9) * 0.8;
    return { x, y: Math.round(y), rot, pino: { x: x + m.largura / 2, y: Math.round(y) + 13 } };
  });
  const ultimo = itens[itens.length - 1];
  const alturaTotal = ultimo ? ultimo.y + m.altura + 40 : 0;
  return { itens, alturaTotal, medidas: m };
}

/** Trecho de barbante entre duas tachinhas: curva com barriga para baixo (ou para fora, na volta da fileira). */
export function trecho(a: { x: number; y: number }, b: { x: number; y: number }, larguraMural: number): string {
  const deitado = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
  const barriga = deitado ? 40 : 34;
  const mx = (a.x + b.x) / 2 + (deitado || Math.abs(b.x - a.x) > 20 ? 0 : a.x > larguraMural / 2 ? 70 : -70);
  return `M${a.x} ${a.y} Q${mx} ${(a.y + b.y) / 2 + barriga} ${b.x} ${b.y}`;
}

/** Comprimento aproximado do trecho (para desenhar o barbante com o traço tracejado). */
export function comprimento(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y) + 60;
}
