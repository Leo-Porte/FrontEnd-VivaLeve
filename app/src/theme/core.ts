/**
 * Núcleo do tema: auto-contraste (WCAG), paletas claro/escuro e emoções.
 * Sem React. Testes em src/theme/__tests__.
 * Portado de css/style.css e js/app.js do front legado.
 */

import { EMOCOES } from '../entities/catalogo';

// ------------------------------------------------------------ contraste (WCAG 2.1)

type RGB = [number, number, number];

function parseHex(hex: string): RGB {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: RGB): string {
  const p = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`.toUpperCase();
}

export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as RGB;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG entre duas cores hex (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const TEXT_LIGHT = '#FFFFFF';
export const TEXT_DARK = '#1A1A1A';

/** Escolhe texto claro ou escuro, o que tiver maior contraste sobre `bg`. */
export function contrastText(bg: string, light: string = TEXT_LIGHT, dark: string = TEXT_DARK): string {
  return contrastRatio(light, bg) >= contrastRatio(dark, bg) ? light : dark;
}

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): RGB {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/**
 * Ajusta a luminosidade de `fg` (mantendo matiz e saturação) até bater `min`:1 sobre `bg`.
 * Tenta primeiro o sentido natural (escurece sobre fundo claro, clareia sobre escuro);
 * se não chegar, tenta o outro; se nada servir, devolve preto/branco com mais contraste.
 */
export function ensureContrast(fg: string, bg: string, min = 4.5): string {
  if (contrastRatio(fg, bg) >= min) return fg;
  const [h, s, l0] = rgbToHsl(parseHex(fg));
  const preferDarker = luminance(bg) > 0.4;
  for (const dir of preferDarker ? [-1, 1] : [1, -1]) {
    for (let l = l0; l >= 0 && l <= 1; l += dir * 0.01) {
      const c = toHex(hslToRgb([h, s, Math.max(0, Math.min(1, l))]));
      if (contrastRatio(c, bg) >= min) return c;
    }
  }
  return contrastText(bg);
}

// ------------------------------------------------------------ paletas

export type Scheme = 'light' | 'dark';

type BaseColors = Record<
  'bg' | 'surface' | 'surfaceAlt' | 'text' | 'textMuted' | 'primary' | 'primarySoft' | 'lilac' | 'lilacStrong' | 'sage' | 'border' | 'separator' | 'danger' | 'shadow' | 'overlay',
  string
>;

/**
 * Paleta no modelo dos apps Saúde/Ajustes do iOS (cores de sistema da Apple, versão opaca).
 * Uma cor de destaque só — o verde sálvia do Pluma — para ação principal e seleção.
 * `lilac`/`sage` ficaram como apelidos neutros por compatibilidade: não existe cor decorativa (ver docs/VISUAL.md).
 */
const base: Record<Scheme, BaseColors> = {
  light: {
    bg: '#F2F2F7', // systemGroupedBackground
    surface: '#FFFFFF', // secondarySystemGroupedBackground (células)
    surfaceAlt: '#E9E9EE', // fill terciário (campos, trilhos, segmentado)
    text: '#000000', // label
    textMuted: '#636366', // secondaryLabel opaco (escurecido p/ 4,5:1 sobre surfaceAlt)
    primary: '#3D6B2F', // sálvia escuro: ação principal, seleção, texto de destaque
    primarySoft: '#E4EEDF', // sálvia a ~15%: fundo de item selecionado/tinted
    lilac: '#FFFFFF',
    lilacStrong: '#000000',
    sage: '#E4EEDF',
    border: '#8E8E93', // systemGray: contorno de controle (3:1)
    separator: '#C6C6C8', // separator opaco (divisória fina, decorativa)
    danger: '#C00012', // systemRed acessível (escurecido p/ 4,5:1 sobre surfaceAlt)
    shadow: 'rgba(0, 0, 0, 0.10)',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
  dark: {
    bg: '#000000',
    surface: '#1C1C1E',
    surfaceAlt: '#2C2C2E',
    text: '#FFFFFF',
    textMuted: '#AEAEB2',
    primary: '#A9D18E',
    primarySoft: '#26331F',
    lilac: '#1C1C1E',
    lilacStrong: '#FFFFFF',
    sage: '#26331F',
    border: '#8E8E93',
    separator: '#38383A',
    danger: '#FF6961',
    shadow: 'rgba(0, 0, 0, 0.5)',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};

function derive(c: BaseColors) {
  return {
    ...c,
    /** Texto sobre `primary`. */
    onPrimary: contrastText(c.primary),
    /** Texto sobre `primarySoft`. */
    onPrimarySoft: contrastText(c.primarySoft),
    /** Texto sobre `lilac`. */
    onLilac: ensureContrast(c.lilacStrong, c.lilac),
    /** Texto sobre `sage`. */
    onSage: contrastText(c.sage),
    /** Texto sobre `danger`. */
    onDanger: contrastText(c.danger),
    /** Texto sobre `surfaceAlt`. */
    onSurfaceAlt: ensureContrast(c.text, c.surfaceAlt),
  };
}

export type Colors = ReturnType<typeof derive>;

export const palettes: Record<Scheme, Colors> = {
  light: derive(base.light),
  dark: derive(base.dark),
};

/**
 * Menu orbital (navegação). Cada destino tem uma cor clara própria, que só aparece na bolinha apontada
 * e na fatia da roda. É a única exceção à regra "uma cor, um papel", e vale só dentro do menu (docs/VISUAL.md).
 */
export const menu = {
  cores: {
    home: '#9ED9AE',
    humor: '#FFD873',
    diario: '#FFC9A3',
    historico: '#DCD6EC',
    respirar: '#9CC7EF',
    chat: '#C9B8F0',
    config: '#CFDCCB',
    sair: '#FF9B8A',
  },
  /** traço/texto sobre qualquer cor de destino (todas claras): ≥ 7:1 */
  sobreCor: '#1D2421',
  /** porta acesa no ícone de Início */
  luz: '#FFE9A8',
  /** véu sobre o desfoque quando a roda abre */
  veu: { light: 'rgba(242, 246, 242, 0.55)', dark: 'rgba(13, 19, 38, 0.55)' } as Record<Scheme, string>,
  sombra: {
    gatilho: '0 10px 26px rgba(61, 107, 47, 0.35)',
    item: '0 8px 22px rgba(0, 0, 0, 0.12)',
    centro: '0 18px 40px rgba(0, 0, 0, 0.16)',
    /** brilho colorido do item apontado */
    apontado: (cor: string) => `0 12px 30px ${cor}B3`,
  },
} as const;

export type MenuDestino = keyof typeof menu.cores;

/**
 * Abertura da Home: sol (manhã, tarde, entardecer) ou lua (noite). Cores próprias do astro,
 * usadas só na ilustração da abertura e no ícone do cabeçalho — exceção à regra "uma cor" (docs/VISUAL.md).
 */
export const abertura = {
  periodos: {
    manha: { nucleo: '#FFD54F', raio: '#FFB300', brilho: { light: '#FFF3C4', dark: '#5C4A12' }, bochecha: '#FF8A65', legenda: 'Manhã de sol' },
    tarde: { nucleo: '#FFB300', raio: '#FB8C00', brilho: { light: '#FFE0B2', dark: '#5A3A10' }, bochecha: '#E64A19', legenda: 'Tarde clara' },
    entardecer: { nucleo: '#FF7043', raio: '#F4511E', brilho: { light: '#FFCCBC', dark: '#5A2418' }, bochecha: '#C2185B', legenda: 'O sol já está se pondo' },
    noite: { nucleo: '#ECEFF1', raio: '#FFD54F', brilho: { light: '#C5CAE9', dark: '#283593' }, bochecha: '#F48FB1', legenda: 'Noite calma' },
  },
  /** traço do rosto */
  rosto: { sol: '#4E342E', lua: '#37474F' },
  cratera: '#CFD8DC',
} as const;

export type PeriodoDoDia = keyof typeof abertura.periodos;

/**
 * Diário: mural de post-its ligados por barbante e caderneta pautada. Papel, tinta, barbante e a capa
 * são objetos físicos com cor própria, usados só na tela do diário — exceção à regra "uma cor" (docs/VISUAL.md).
 * O papel não muda no tema escuro (papel é papel); o que muda é o fundo da tela.
 */
export const diario = {
  papel: '#FFFDF5',
  /** folha de trás quando o dia tem mais de uma anotação */
  papelVerso: '#F4F1E6',
  /** escrita na caderneta (azul de caneta) */
  tinta: '#1F2A44',
  /** título e texto do post-it */
  tintaPostit: '#2B1F14',
  apoioPostit: '#4A3A2A',
  /** hora no topo do post-it e data na caderneta */
  dataPostit: '#5C4A38',
  dataCaderno: '#6E5B46',
  /** pauta e margem da caderneta */
  pauta: '#C9DCE8',
  margem: '#EFA3A3',
  tracejado: '#B7A890',
  /** tracinhos de "escrita" no mini post-it do calendário */
  rabisco: '#C9B9A0',
  barbante: '#9E2F2F',
  pino: '#B83A3A',
  /** capa da caderneta (sálvia fixo: não clareia no escuro) */
  capa: '#3D6B2F',
  sobreCapa: '#FFFFFF',
  botaoCapa: 'rgba(255, 255, 255, 0.14)',
  anel: ['#8E8E93', '#E5E5EA', '#8E8E93'] as const,
  borda: '#FFFFFF',
  erro: '#C00012',
  veu: 'rgba(30, 20, 10, 0.5)',
  sombra: {
    postit: '0 1px 2px rgba(0, 0, 0, 0.14), 0 12px 20px -8px rgba(0, 0, 0, 0.32)',
    mini: '0 1px 2px rgba(0, 0, 0, 0.16), 0 6px 10px -5px rgba(0, 0, 0, 0.3)',
    pino: '0 2px 2px rgba(0, 0, 0, 0.35)',
    adesivo: '0 1px 2px rgba(0, 0, 0, 0.25)',
    adesivoColado: '0 4px 8px rgba(0, 0, 0, 0.35)',
    caderno: '0 18px 40px rgba(0, 0, 0, 0.45)',
    anel: '0 1px 2px rgba(0, 0, 0, 0.4)',
    grupo: '0 6px 18px rgba(0, 0, 0, 0.12)',
  },
  /** letra de mão (Caveat, carregada só na tela do diário) */
  fonte: { titulo: 'Caveat_700Bold', texto: 'Caveat_500Medium' },
  /** distância entre as linhas da pauta (a escrita usa o mesmo lineHeight) */
  pautaPasso: { compacto: 28, largo: 32 },
  /** tipografia própria do papel (a letra de mão não cabe na escala do iOS) */
  tipo: {
    postitHora: { compacto: { fontSize: 12, lineHeight: 16 }, largo: { fontSize: 13, lineHeight: 18 } },
    postitTitulo: { compacto: { fontFamily: 'Caveat_700Bold', fontSize: 23, lineHeight: 23 }, largo: { fontFamily: 'Caveat_700Bold', fontSize: 27, lineHeight: 27 } },
    postitTexto: { compacto: { fontSize: 13, lineHeight: 17 }, largo: { fontSize: 14, lineHeight: 19 } },
    cadernoData: { compacto: { fontFamily: 'Caveat_500Medium', fontSize: 18, lineHeight: 28 }, largo: { fontFamily: 'Caveat_500Medium', fontSize: 20, lineHeight: 32 } },
    cadernoTitulo: { compacto: { fontFamily: 'Caveat_700Bold', fontSize: 32, lineHeight: 56 }, largo: { fontFamily: 'Caveat_700Bold', fontSize: 38, lineHeight: 64 } },
    cadernoTexto: { compacto: { fontFamily: 'Caveat_500Medium', fontSize: 23, lineHeight: 28 }, largo: { fontFamily: 'Caveat_500Medium', fontSize: 26, lineHeight: 32 } },
    cadernoRotulo: { compacto: { fontFamily: 'Caveat_700Bold', fontSize: 22, lineHeight: 24 }, largo: { fontFamily: 'Caveat_700Bold', fontSize: 25, lineHeight: 26 } },
    adesivo: { compacto: { fontFamily: 'Caveat_700Bold', fontSize: 15, lineHeight: 16 }, largo: { fontFamily: 'Caveat_700Bold', fontSize: 18, lineHeight: 19 } },
    adesivoColado: { compacto: { fontFamily: 'Caveat_700Bold', fontSize: 20, lineHeight: 22 }, largo: { fontFamily: 'Caveat_700Bold', fontSize: 22, lineHeight: 24 } },
    aviso: { compacto: { fontFamily: 'Caveat_500Medium', fontSize: 22, lineHeight: 26 }, largo: { fontFamily: 'Caveat_500Medium', fontSize: 24, lineHeight: 28 } },
    contador: { fontSize: 10, lineHeight: 14, fontWeight: '700' },
  },
} as const;

/**
 * Cena do login: fundo sálvia, colinas e folhas caindo (bordô/laranja do outono canadense e verdes).
 * Cores próprias da ilustração, usadas só na tela de login — exceção à regra "uma cor" (docs/VISUAL.md).
 */
export const cenaLogin = {
  fundo: { light: '#EEF3E6', dark: '#141B12' },
  colinaClara: { light: '#9DC183', dark: '#4E6B3F' },
  colinaEscura: { light: '#3D6B2F', dark: '#24401C' },
  /** título e marca sobre o fundo (≥ 7:1) */
  titulo: { light: '#1F3527', dark: '#E4EEDF' },
  /** texto de apoio sobre o fundo (≥ 4,5:1) */
  apoio: { light: '#3E4A3A', dark: '#B9C7B1' },
  /** sobrelinha dos slides, ponto ativo, contorno das setas */
  destaque: { light: '#3D6B2F', dark: '#A9D18E' },
  /** ponto inativo do carrossel (decorativo; o ativo é que comunica) */
  pontoInativo: { light: '#9AAE8E', dark: '#5C6E53' },
  /** botões imersos na colina escura */
  sobreColina: '#FFFFFF',
  textoBotaoClaro: '#1F3527',
  folhas: ['#C0262D', '#5E9441', '#E07B24', '#EE9A3A', '#A61E26', '#7FB35A'],
  nervura: 'rgba(0, 0, 0, 0.22)',
} as const;

/** Mascote da tela Respirar (panda flat, sem contorno). Igual nos dois temas: é o personagem, não a interface. */
export const mascote = {
  preto: '#3C3C3C',
  cinza: '#5E5E5E',
  branco: '#FFFFFF',
  sombraBranco: '#E6EAEE',
  bochecha: '#FF9FB0',
  lingua: '#FF7A8C',
  sombraChao: 'rgba(0, 0, 0, 0.10)',
  ar: '#8FCFF0',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
/** Raios no padrão iOS (cantos contínuos): 6 chip, 10 botão/campo, 12 grupo/célula, 16 folha. */
export const radius = { xs: 4, sm: 6, md: 10, lg: 12, xl: 16, full: 999 } as const;

/** Escala de texto do iOS (Dynamic Type, tamanho padrão). */
export const typography = {
  display: { fontSize: 34, lineHeight: 41, fontWeight: '700' }, // Large Title
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' }, // Title 2
  subtitle: { fontSize: 17, lineHeight: 22, fontWeight: '600' }, // Headline
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' }, // Body
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' }, // Subheadline semibold
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' }, // Footnote
  /** fase da respiração em tela cheia: o texto é o foco junto com o panda */
  respiracao: { fontSize: 48, lineHeight: 56, fontWeight: '700' },
  /** número da contagem regressiva da respiração */
  contagem: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
} as const;
export type TextVariant = keyof typeof typography;

/** Fonte do sistema: SF Pro no iPhone/Mac, a nativa no Android/Windows. */
export const SYSTEM_FONT_WEB = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", system-ui, sans-serif';
export const fontFamilies = { heading: 'system', body: 'system' } as const;
/** Família para o peso pedido. Com fonte do sistema o peso vai em fontWeight; a família é a mesma. */
export function fontFor(_kind: keyof typeof fontFamilies, _weight: string | number = '400'): string | undefined {
  return typeof document !== 'undefined' ? SYSTEM_FONT_WEB : undefined;
}
export const headingVariants: readonly TextVariant[] = ['display', 'title', 'subtitle', 'label', 'respiracao', 'contagem'];

// ------------------------------------------------------------ emoções

export type EmotionId = 'otimo' | 'bem' | 'mais-ou-menos' | 'mal' | 'depressivo' | 'ansioso';
export type MoodKey = 'OTIMO' | 'BEM' | 'MAIS_OU_MENOS' | 'MAL' | 'DEPRESSIVO' | 'ANSIOSO';

export interface Emotion {
  /** id da tela (usado no legado) */
  id: EmotionId;
  /** valor da API (enum Mood) */
  mood: MoodKey;
  label: string;
  emoji: string;
  /** cor da emoção (fundo de selo/chip) */
  color: string;
  /** 1 a 5 */
  score: number;
}

/** Derivado de EMOCOES (src/entities) — fonte única; aqui só renomeia `cor` para `color`. */
export const emotions: readonly Emotion[] = EMOCOES.map((e) => ({
  id: e.id as EmotionId,
  mood: e.mood as MoodKey,
  label: e.label,
  emoji: e.emoji,
  color: e.cor,
  score: e.score,
}));

const UNKNOWN: Emotion = {
  id: 'mais-ou-menos', mood: 'MAIS_OU_MENOS', label: 'Desconhecido', emoji: '😶', color: '#999999', score: 0,
};

/** Aceita id da tela ('mais-ou-menos'), valor da API ('MAIS_OU_MENOS') ou null. */
export function getEmotion(key: string | null | undefined): Emotion {
  if (!key) return UNKNOWN;
  return emotions.find((e) => e.id === key || e.mood === key) ?? UNKNOWN;
}
export const emotionIdToMood = (id: EmotionId): MoodKey => getEmotion(id).mood;
export const moodToEmotionId = (mood: string): EmotionId => getEmotion(mood).id;

/** Cores de uma emoção já com contraste garantido para o tema. */
export function emotionColors(emotion: Emotion, scheme: Scheme) {
  const surface = palettes[scheme].surface;
  let fill = emotion.color;
  let onFill = contrastText(fill);
  if (contrastRatio(onFill, fill) < 4.5) {
    // nenhum texto passa sobre a cor original: escurece/clareia o fundo o mínimo necessário
    fill = ensureContrast(fill, onFill);
    if (contrastRatio(onFill, fill) < 4.5) onFill = contrastText(fill);
  }
  return {
    /** cor de preenchimento (selo, chip, barra) — a original, ajustada só se preciso */
    fill,
    /** texto/emoji sobre `fill` */
    onFill,
    /** a cor da emoção usada como TEXTO sobre a superfície do tema */
    text: ensureContrast(emotion.color, surface),
  };
}
