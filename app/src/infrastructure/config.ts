/** Configuração da API: mock x HTTP real. */

export const PRODUCAO_URL = 'https://back-end-vivaleve.onrender.com';

/** O Render grátis "dorme": a 1ª chamada pode levar ~1 min; a IA ainda pode levar 30s. */
export const TIMEOUT_MS = 70000;

/** Client ID "Web application" do Google (não é segredo). Mesmo do GOOGLE_CLIENT_ID do back. */
export const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
  '1085961204416-v75mbqjm8k2hhgrtapndf1lm1ame0qb1.apps.googleusercontent.com';

declare const __DEV__: boolean | undefined;

function resolver(): { modo: 'mock' | 'http'; baseUrl: string } {
  // Atenção: a referência precisa ser literal para o Expo inlinar a variável.
  const env = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
  if (env.toLowerCase() === 'mock') return { modo: 'mock', baseUrl: 'mock' };
  if (env) return { modo: 'http', baseUrl: env.replace(/\/$/, '') };
  const dev = typeof __DEV__ !== 'undefined' && __DEV__;
  return dev ? { modo: 'mock', baseUrl: 'mock' } : { modo: 'http', baseUrl: PRODUCAO_URL };
}

const cfg = resolver();

/** 'mock' | 'http' */
export const MODO_API = cfg.modo;
export const BASE_URL = cfg.baseUrl;
