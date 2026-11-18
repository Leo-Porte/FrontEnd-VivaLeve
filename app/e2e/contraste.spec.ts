import { TELAS, expect, test } from './fixtures';

/** Contraste WCAG AA (4.5:1 texto normal, 3:1 texto grande) calculado no navegador. */
async function violacoes(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const parse = (c: string) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
    };
    const over = (f: any, b: any) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
    const lum = ({ r, g, b }: any) => {
      const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const fundo = (el: Element): any => {
      const pilha: any[] = [];
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.backgroundImage !== 'none') return null; // gradiente/imagem: não dá para medir
        const c = parse(cs.backgroundColor);
        if (c && c.a > 0) { pilha.push(c); if (c.a === 1) break; }
      }
      let base: any = { r: 255, g: 255, b: 255, a: 1 };
      for (const c of pilha.reverse()) base = over(c, base);
      return base;
    };
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const vistos = new Set<Element>();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || vistos.has(el) || !n.textContent?.trim()) continue;
      vistos.add(el);
      if (el.closest('[aria-disabled="true"], [disabled]')) continue; // desabilitado é isento (WCAG 1.4.3)
      if (!/[\p{L}\p{N}]/u.test(n.textContent)) continue; // só emoji/símbolo
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (cs.visibility === 'hidden' || cs.display === 'none' || r.width === 0 || r.height === 0 || +cs.opacity === 0) continue;
      const bg = fundo(el);
      const fg = parse(cs.color);
      if (!bg || !fg) continue;
      const f = over(fg, bg);
      const l1 = lum(f), l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const px = parseFloat(cs.fontSize);
      const grande = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
      if (ratio < (grande ? 3 : 4.5)) out.push(`${ratio.toFixed(2)} "${n.textContent.trim().slice(0, 40)}" (${cs.color} sobre ${cs.backgroundColor})`);
    }
    return out;
  });
}

test.describe('contraste', () => {
  for (const t of TELAS) {
    test(`contraste ${t.nome}`, async ({ logado: page }) => {
      await page.goto(t.rota);
      await expect(page.getByTestId(t.pronta)).toBeVisible();
      await page.waitForTimeout(1500);
      expect(await violacoes(page)).toEqual([]);
    });
  }
});
