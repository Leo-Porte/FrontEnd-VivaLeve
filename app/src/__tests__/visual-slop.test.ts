/**
 * Piso visual (docs/VISUAL.md, "O que não entra"): falha o `npm test` quando o código volta aos vícios
 * de interface gerada. Adaptado do `slop.swift --check` proposto no Friday.
 * Exceção pontual: comentário `slop:ok <regra> <motivo>` na mesma linha ou na anterior.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = join(__dirname, '..');
/** Onde cor/sombra/fonte literal é permitida (é ali que os tokens moram). */
const ISENTOS = ['theme/', 'components/three/', 'entities/', '__tests__/', 'test-utils/'];

interface Regra {
  id: string;
  padrao: RegExp;
  msg: string;
}

const REGRAS: Regra[] = [
  { id: 'hex', padrao: /['"`]#[0-9a-fA-F]{3,8}['"`]/, msg: 'cor literal: use token do tema' },
  { id: 'rgba', padrao: /rgba?\(\s*\d/, msg: 'cor literal: use token do tema' },
  { id: 'sombra', padrao: /boxShadow|shadowColor|elevation\s*:/, msg: 'sombra só na navegação (menu orbital)' },
  { id: 'fonte', padrao: /fontFamily\s*:|fontSize\s*:\s*\d/, msg: 'tipografia só por Text variant' },
  { id: 'gradiente', padrao: /LinearGradient|RadialGradient/, msg: 'sem gradiente no conteúdo' },
  { id: 'escala', padrao: /scaleTo=\{0\.\d+\}|scale:\s*pressed/, msg: 'sem escala ao apertar (realce por opacidade)' },
  { id: 'pilula', padrao: /borderRadius:\s*(999|radius\.full)/, msg: 'pílula só na navegação' },
];

const EMOJI = /\p{Extended_Pictographic}/u;

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return arquivos(p);
    return /\.(tsx?)$/.test(n) ? [p] : [];
  });
}

function violacoes(): string[] {
  const out: string[] = [];
  for (const arq of arquivos(RAIZ)) {
    const rel = relative(RAIZ, arq).replace(/\\/g, '/');
    if (ISENTOS.some((i) => rel.startsWith(i) || rel.includes('/' + i))) continue;
    const linhas = readFileSync(arq, 'utf8').split('\n');
    linhas.forEach((linha, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(linha)) return;
      const vetado = (id: string) => [linha, linhas[i - 1] ?? ''].some((l) => new RegExp(`slop:ok\\s+${id}\\s+\\S`).test(l));
      for (const r of REGRAS) if (r.padrao.test(linha) && !vetado(r.id)) out.push(`${rel}:${i + 1} [${r.id}] ${r.msg}`);
      if (EMOJI.test(linha) && !vetado('emoji')) out.push(`${rel}:${i + 1} [emoji] sem emoji na interface`);
    });
  }
  return out;
}

describe('piso visual (docs/VISUAL.md)', () => {
  it('não tem vícios de interface gerada fora dos tokens', () => {
    expect(violacoes()).toEqual([]);
  });
});
