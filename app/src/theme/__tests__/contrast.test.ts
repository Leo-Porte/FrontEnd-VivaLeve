import { contrastRatio, contrastText, emotionColors, emotions, ensureContrast, menu, palettes } from '../core';

const schemes = ['light', 'dark'] as const;

describe('pares de tokens (WCAG AA)', () => {
  for (const scheme of schemes) {
    const c = palettes[scheme];
    const texto: [string, string, string][] = [];
    for (const bg of ['bg', 'surface', 'surfaceAlt'] as const) {
      for (const fg of ['text', 'textMuted', 'primary', 'lilacStrong', 'danger'] as const) texto.push([fg, c[fg], c[bg]]);
    }
    texto.push(
      ['onPrimary/primary', c.onPrimary, c.primary],
      ['onPrimarySoft/primarySoft', c.onPrimarySoft, c.primarySoft],
      ['onLilac/lilac', c.onLilac, c.lilac],
      ['onSage/sage', c.onSage, c.sage],
      ['onDanger/danger', c.onDanger, c.danger],
      ['onSurfaceAlt/surfaceAlt', c.onSurfaceAlt, c.surfaceAlt],
    );
    it.each(texto)(`[${scheme}] %s >= 4.5`, (_n, fg, bg) => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
    it(`[${scheme}] borda >= 3:1 sobre surface`, () => {
      expect(contrastRatio(c.border, c.surface)).toBeGreaterThanOrEqual(3);
    });
    it.each(emotions.map((e) => [e.id, e] as const))(`[${scheme}] emoção %s`, (_id, e) => {
      const ec = emotionColors(e, scheme);
      expect(contrastRatio(ec.onFill, ec.fill)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(ec.text, palettes[scheme].surface)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('menu orbital', () => {
  it.each(Object.entries(menu.cores))('traço sobre %s >= 7:1', (_k, cor) => {
    expect(contrastRatio(menu.sobreCor, cor)).toBeGreaterThanOrEqual(7);
  });
});

describe('funções', () => {
  it('contrastRatio preto/branco = 21', () => expect(contrastRatio('#000', '#FFF')).toBeCloseTo(21, 1));
  it('contrastText escolhe claro em fundo escuro e escuro em fundo claro', () => {
    expect(contrastText('#000000')).toBe('#FFFFFF');
    expect(contrastText('#FFFFFF')).toBe('#1A1A1A');
    expect(contrastText('#FFC107')).toBe('#1A1A1A');
  });
  it('ensureContrast mantém cor boa e corrige cor ruim', () => {
    expect(ensureContrast('#222222', '#FFFFFF')).toBe('#222222');
    const fix = ensureContrast('#9DC183', '#FFFFFF');
    expect(fix).not.toBe('#9DC183');
    expect(contrastRatio(fix, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    const fixDark = ensureContrast('#3D6B2F', '#1A1A2E');
    expect(contrastRatio(fixDark, '#1A1A2E')).toBeGreaterThanOrEqual(4.5);
  });
  it('ensureContrast respeita mínimo customizado', () => {
    expect(contrastRatio(ensureContrast('#888888', '#FFFFFF', 7), '#FFFFFF')).toBeGreaterThanOrEqual(7);
  });
  it('emoções derivam de EMOCOES (ansioso score 1)', () => {
    expect(emotions).toHaveLength(6);
    expect(emotions.find((e) => e.mood === 'ANSIOSO')?.score).toBe(1);
  });
});
