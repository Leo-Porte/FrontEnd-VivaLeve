import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CVV_TELEFONE, FRASES_SESSAO, RITMO_SESSAO, type FraseSessao } from '@/entities';
import { api, mensagemErro } from '@/infrastructure';
import type { ApiError, ChatMessage, Conversation } from '@/models';

/**
 * Sessão com a Pluma (rota /chat). Na interface a palavra é sempre "sessão", nunca "chat".
 *
 * Telas:
 * - `inicio`: nome da Pluma, frase e o campo no centro; "Sessões anteriores" e "Reabrir última sessão".
 * - `sessao`: sessão ativa, campo no rodapé.
 * - `leitura`: uma sessão anterior aberta só para ler, com "Reabrir esta sessão".
 *
 * Encerrar NÃO apaga: a conversa continua no back e passa para "Sessões anteriores".
 * A resposta da IA só aparece depois de RITMO_SESSAO.PENSAR_MIN_MS..MAX_MS (pedido de produto),
 * e chega marcada com `digitar` para a tela escrever caractere a caractere.
 */

export type TelaSessao = 'inicio' | 'sessao' | 'leitura';

export interface MensagemChat {
  id: string;
  tipo: 'user' | 'bot' | 'divisor';
  texto: string;
  data: string;
  crise: boolean;
  /** resposta nova: a tela digita o texto e chama `fimDigitacao` */
  digitar?: boolean;
}

export const AJUDA_CRISE = [
  { label: 'CVV - ligar 188 (24h, gratuito)', url: `tel:${CVV_TELEFONE}` },
  { label: 'Chat do CVV (cvv.org.br)', url: 'https://cvv.org.br' },
  { label: 'SAMU - ligar 192', url: 'tel:192' },
];

export interface OpcoesSessao {
  /** sobrescreve o ritmo (testes usam 0) */
  pensarMinMs?: number;
  pensarMaxMs?: number;
}

let seq = 0;
const novoId = () => `m${Date.now()}-${seq++}`;
const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function sortearFrase(atual?: FraseSessao): FraseSessao {
  const outras = FRASES_SESSAO.filter((f) => f !== atual);
  return outras[Math.floor(Math.random() * outras.length)] ?? FRASES_SESSAO[0];
}

function paraMensagens(hist: ChatMessage[]): MensagemChat[] {
  return hist
    .filter((m) => m.role === 'USER' || m.role === 'ASSISTANT')
    .map((m) => ({
      id: `h${m.id}`,
      tipo: m.role === 'USER' ? 'user' : 'bot',
      texto: m.content,
      data: m.createdAt,
      crise: m.status === 'CRISIS',
    }));
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "hoje", "ontem" ou "14 nov". */
export function quandoFoi(iso: string, agora: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dia = (x: Date) => Math.floor(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / 86400000);
  const diff = dia(agora) - dia(d);
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'ontem';
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function useChatController(opcoes: OpcoesSessao = {}) {
  const pensarMin = opcoes.pensarMinMs ?? RITMO_SESSAO.PENSAR_MIN_MS;
  const pensarMax = opcoes.pensarMaxMs ?? RITMO_SESSAO.PENSAR_MAX_MS;
  const router = useRouter();

  const [tela, setTela] = useState<TelaSessao>('inicio');
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [digitandoId, setDigitandoId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [abrindo, setAbrindo] = useState(false);
  const [semLogin, setSemLogin] = useState(false);
  const [sessoes, setSessoes] = useState<Conversation[]>([]);
  const [vendo, setVendo] = useState<Conversation | null>(null);
  const [ativaId, setAtivaId] = useState<number | null>(null);
  const [frase, setFrase] = useState<FraseSessao>(() => sortearFrase());
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [apagando, setApagando] = useState(false);

  const ocupado = useRef(false);
  /** muda a cada troca de sessão: resposta que chega depois disso é descartada */
  const geracao = useRef(0);
  const vivo = useRef(true);

  const tratarErro = useCallback((e: unknown, padrao: string) => {
    if ((e as ApiError).semLogin) setSemLogin(true);
    else setErro(mensagemErro(e, padrao));
  }, []);

  const recarregarSessoes = useCallback(async () => {
    try {
      const lista = await api.ia.sessoes();
      if (vivo.current) setSessoes(lista);
    } catch (e) {
      if ((e as ApiError).semLogin && vivo.current) setSemLogin(true);
    }
  }, []);

  useEffect(() => {
    vivo.current = true;
    (async () => {
      try {
        if (!(await api.auth.logado())) {
          if (vivo.current) setSemLogin(true);
          return;
        }
        // Sessão que não foi encerrada continua aberta (quem saiu da tela no meio volta para ela).
        const [hist, lista, ativa] = await Promise.all([
          api.ia.historico(),
          api.ia.sessoes().catch(() => [] as Conversation[]),
          api.ia.ativa().catch(() => null),
        ]);
        if (!vivo.current) return;
        setSessoes(lista);
        const msgs = paraMensagens(hist);
        if (msgs.length) {
          setMensagens(msgs);
          setTela('sessao');
          setAtivaId(ativa);
        }
      } catch (e) {
        if (vivo.current && (e as ApiError).semLogin) setSemLogin(true);
        // API fora: abre no início; o erro aparece ao enviar.
      } finally {
        if (vivo.current) setCarregando(false);
      }
    })();
    return () => {
      vivo.current = false;
    };
  }, []);

  const enviar = useCallback(
    async (fixo?: string) => {
      const t = (fixo ?? texto).trim();
      if (!t || ocupado.current || semLogin || tela === 'leitura') return;
      ocupado.current = true;
      const minha = ++geracao.current;
      const doInicio = tela === 'inicio';
      const inicio = Date.now();
      const alvo = pensarMin + Math.random() * Math.max(0, pensarMax - pensarMin);
      const msgUser: MensagemChat = { id: novoId(), tipo: 'user', texto: t, data: new Date().toISOString(), crise: false };

      setErro(null);
      if (fixo === undefined) setTexto('');
      setMensagens((m) => (doInicio ? [msgUser] : [...m, msgUser]));
      setTela('sessao');
      setPensando(true);

      let resposta: MensagemChat;
      try {
        // começar do início abre outra conversa no back
        if (doInicio) {
          await api.ia.encerrar();
          setAtivaId(null);
        }
        const r = await api.ia.conversar(t);
        if (r.conversationId != null && minha === geracao.current) setAtivaId(r.conversationId);
        resposta = { id: novoId(), tipo: 'bot', texto: r.reply, data: r.createdAt, crise: r.status === 'CRISIS' || !!r.crisisDetected, digitar: true };
      } catch (e) {
        if ((e as ApiError).semLogin) {
          ocupado.current = false;
          setPensando(false);
          setSemLogin(true);
          return;
        }
        const msg = (e as ApiError).offline
          ? 'Não consegui me conectar agora. Verifique sua internet e tente de novo.'
          : 'Tive um problema para responder. Tente de novo em instantes.';
        resposta = { id: novoId(), tipo: 'bot', texto: msg + `\n\nSe precisar conversar com alguém agora, o CVV atende 24h pelo ${CVV_TELEFONE}.`, data: new Date().toISOString(), crise: false, digitar: true };
      }

      // "pensando" dura no mínimo 4 a 5 s, mesmo com a resposta pronta
      const resta = alvo - (Date.now() - inicio);
      if (resta > 0) await esperar(resta);
      if (!vivo.current || minha !== geracao.current) return;

      setPensando(false);
      setMensagens((m) => [...m, resposta]);
      setDigitandoId(resposta.id);
      // `ocupado` só libera quando a tela terminar de digitar (fimDigitacao)
    },
    [texto, semLogin, tela, pensarMin, pensarMax],
  );

  /** A tela terminou de digitar a resposta `id`. */
  const fimDigitacao = useCallback((id: string) => {
    setMensagens((m) => m.map((x) => (x.id === id && x.digitar ? { ...x, digitar: false } : x)));
    setDigitandoId((atual) => {
      if (atual === id) ocupado.current = false;
      return atual === id ? null : atual;
    });
  }, []);

  /** Cancela resposta pendente e digitação em andamento. */
  const interromper = useCallback(() => {
    geracao.current++;
    ocupado.current = false;
    setPensando(false);
    setDigitandoId(null);
    setMensagens((m) => m.map((x) => (x.digitar ? { ...x, digitar: false } : x)));
  }, []);

  const encerrar = useCallback(async () => {
    interromper();
    setErro(null);
    setTela('inicio');
    setVendo(null);
    setAtivaId(null);
    setFrase((f) => sortearFrase(f));
    try {
      await api.ia.encerrar();
    } catch {}
    await recarregarSessoes();
  }, [interromper, recarregarSessoes]);

  const voltarInicio = useCallback(() => {
    setTela('inicio');
    setVendo(null);
    setErro(null);
    setFrase((f) => sortearFrase(f));
  }, []);

  const abrirSessao = useCallback(
    async (c: Conversation) => {
      const eraAtiva = tela === 'sessao';
      interromper();
      const minha = geracao.current;
      setErro(null);
      setVendo(c);
      setTela('leitura');
      setMensagens([]);
      setAbrindo(true);
      try {
        // a sessão ativa fica guardada como anterior
        if (eraAtiva) {
          await api.ia.encerrar();
          setAtivaId(null);
          recarregarSessoes();
        }
        const hist = await api.ia.mensagens(c.id);
        if (vivo.current && minha === geracao.current) setMensagens(paraMensagens(hist));
      } catch (e) {
        tratarErro(e, 'Não foi possível abrir esta sessão. Tente de novo.');
      } finally {
        if (vivo.current) setAbrindo(false);
      }
    },
    [tela, interromper, recarregarSessoes, tratarErro],
  );

  const reabrir = useCallback(
    async (c: Conversation) => {
      interromper();
      const minha = geracao.current;
      setErro(null);
      setAbrindo(true);
      try {
        await api.ia.retomar(c.id);
        const hist = vendo?.id === c.id && mensagens.length ? null : await api.ia.mensagens(c.id);
        if (!vivo.current || minha !== geracao.current) return;
        const base = hist ? paraMensagens(hist) : mensagens;
        setMensagens([...base, { id: novoId(), tipo: 'divisor', texto: 'Sessão retomada hoje', data: new Date().toISOString(), crise: false }]);
        setAtivaId(c.id);
        setVendo(null);
        setTela('sessao');
      } catch (e) {
        tratarErro(e, 'Não foi possível reabrir esta sessão. Tente de novo.');
      } finally {
        if (vivo.current) setAbrindo(false);
      }
    },
    [interromper, vendo, mensagens, tratarErro],
  );

  const reabrirUltima = useCallback(() => {
    const ultima = sessoes[0];
    if (ultima) reabrir(ultima);
  }, [sessoes, reabrir]);

  const apagarVendo = useCallback(async () => {
    if (!vendo || apagando) return;
    setApagando(true);
    try {
      await api.ia.apagarConversa(vendo.id);
      setSessoes((l) => l.filter((x) => x.id !== vendo.id));
      setConfirmandoApagar(false);
      voltarInicio();
    } catch (e) {
      tratarErro(e, 'Não foi possível apagar a sessão. Tente de novo.');
      setConfirmandoApagar(false);
    } finally {
      setApagando(false);
    }
  }, [vendo, apagando, voltarInicio, tratarErro]);

  /** Sem sessão: limpa o que sobrou e leva para o login. */
  const entrar = useCallback(async () => {
    try {
      await api.auth.sair();
    } catch {}
    router.replace('/login');
  }, [router]);

  const ocupadoAgora = pensando || digitandoId !== null;

  return {
    entrar, carregando, semLogin, tela, mensagens, texto, setTexto, enviar, pensando, digitandoId, fimDigitacao,
    podeEnviar: !ocupadoAgora && !!texto.trim() && !semLogin && tela !== 'leitura',
    sessoes, vendo, ativaId, frase, abrindo, erro,
    temHistorico: sessoes.length > 0,
    encerrar, voltarInicio, abrirSessao, reabrir, reabrirUltima,
    confirmandoApagar, pedirApagar: () => setConfirmandoApagar(true), cancelarApagar: () => setConfirmandoApagar(false),
    apagarVendo, apagando,
  };
}
