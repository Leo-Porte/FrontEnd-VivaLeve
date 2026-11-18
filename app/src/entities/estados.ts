/**
 * Estados de tela como entidades fixas (máquinas de estado pequenas e puras).
 * Controllers guardam o estado com estes tipos e mudam só pelas funções de transição daqui —
 * assim a mesma regra vale em web e mobile e é testável sem renderizar nada.
 */
import { TECNICA_345, type FaseRespiracao, type TecnicaRespiracao } from './catalogo';

// ------------------------------------------------------------ carregamento genérico

export type Carregamento<T> =
  | { readonly tipo: 'ocioso' }
  | { readonly tipo: 'carregando' }
  | { readonly tipo: 'vazio' }
  | { readonly tipo: 'sucesso'; readonly dados: T }
  | { readonly tipo: 'erro'; readonly mensagem: string; readonly semLogin?: boolean };

export const Carregamento = Object.freeze({
  ocioso: <T>(): Carregamento<T> => ({ tipo: 'ocioso' }),
  carregando: <T>(): Carregamento<T> => ({ tipo: 'carregando' }),
  /** Lista vazia vira 'vazio' (EmptyState); qualquer outro valor vira 'sucesso'. */
  de: <T>(dados: T): Carregamento<T> =>
    Array.isArray(dados) && dados.length === 0 ? { tipo: 'vazio' } : { tipo: 'sucesso', dados },
  erro: <T>(mensagem: string, semLogin = false): Carregamento<T> => ({ tipo: 'erro', mensagem, semLogin }),
});

// ------------------------------------------------------------ envio de formulário

export type Envio =
  | { readonly tipo: 'parado' }
  | { readonly tipo: 'enviando' }
  | { readonly tipo: 'enviado' }
  | { readonly tipo: 'falhou'; readonly mensagem: string };

export const Envio = Object.freeze({
  parado: { tipo: 'parado' } as Envio,
  enviando: { tipo: 'enviando' } as Envio,
  enviado: { tipo: 'enviado' } as Envio,
  falhou: (mensagem: string): Envio => ({ tipo: 'falhou', mensagem }),
  /** Bloqueia clique duplo: só pode enviar se não estiver enviando. */
  podeEnviar: (e: Envio) => e.tipo !== 'enviando',
});

// ------------------------------------------------------------ respiração

export type EstadoRespiracao =
  | { readonly tipo: 'pronto' }
  | {
      readonly tipo: 'rodando';
      readonly ciclo: number; // 1..ciclos
      readonly faseIndex: number;
      readonly segundosNaFase: number; // 0..dur-1
    }
  | { readonly tipo: 'concluido'; readonly ciclos: number; readonly durationSeconds: number };

export const Respiracao = Object.freeze({
  inicial: { tipo: 'pronto' } as EstadoRespiracao,

  iniciar: (): EstadoRespiracao => ({ tipo: 'rodando', ciclo: 1, faseIndex: 0, segundosNaFase: 0 }),

  /** Avança 1 segundo. Ao passar da última fase do último ciclo, conclui. */
  tick(e: EstadoRespiracao, t: TecnicaRespiracao = TECNICA_345): EstadoRespiracao {
    if (e.tipo !== 'rodando') return e;
    const fase = t.fases[e.faseIndex];
    if (e.segundosNaFase + 1 < fase.dur) return { ...e, segundosNaFase: e.segundosNaFase + 1 };
    if (e.faseIndex + 1 < t.fases.length) return { ...e, faseIndex: e.faseIndex + 1, segundosNaFase: 0 };
    if (e.ciclo < t.ciclos) return { ...e, ciclo: e.ciclo + 1, faseIndex: 0, segundosNaFase: 0 };
    const porCiclo = t.fases.reduce((s, f) => s + f.dur, 0);
    return { tipo: 'concluido', ciclos: t.ciclos, durationSeconds: porCiclo * t.ciclos };
  },

  parar: (): EstadoRespiracao => ({ tipo: 'pronto' }),

  fase(e: EstadoRespiracao, t: TecnicaRespiracao = TECNICA_345): FaseRespiracao | null {
    return e.tipo === 'rodando' ? t.fases[e.faseIndex] : null;
  },

  /** 0..1 dentro da fase atual (para a animação do orbe). */
  progressoFase(e: EstadoRespiracao, t: TecnicaRespiracao = TECNICA_345): number {
    if (e.tipo !== 'rodando') return e.tipo === 'concluido' ? 1 : 0;
    return (e.segundosNaFase + 1) / t.fases[e.faseIndex].dur;
  },

  /** Segundos restantes na fase atual (contagem regressiva na tela). */
  restanteFase(e: EstadoRespiracao, t: TecnicaRespiracao = TECNICA_345): number {
    return e.tipo === 'rodando' ? t.fases[e.faseIndex].dur - e.segundosNaFase : 0;
  },
});

// ------------------------------------------------------------ login

export type ModoLogin = 'entrar' | 'cadastrar';

export type EstadoLogin =
  | { readonly tipo: 'editando'; readonly modo: ModoLogin }
  | { readonly tipo: 'enviando'; readonly modo: ModoLogin }
  | { readonly tipo: 'erro'; readonly modo: ModoLogin; readonly mensagem: string };

/** Mensagens fixas por status HTTP (paridade com js/login.js). */
export const MENSAGENS_LOGIN = Object.freeze({
  401: 'Email ou senha inválidos.',
  409: 'Este email já tem conta. Entre com ele ou use o Google.',
  400: 'Confira os dados digitados.',
  emailVazio: 'Informe o email.',
  senhaVazia: 'Informe a senha.',
  senhaTamanho: 'A senha deve ter entre 8 e 64 caracteres.',
} as const);
