import { act, renderHook, waitFor } from '@testing-library/react-native';

import { api } from '@/infrastructure';

import { quandoFoi, useChatController } from '../useChatController';
import { useDiarioController } from '../useDiarioController';
import { useHistoricoController } from '../useHistoricoController';
import { useRespirarController } from '../useRespirarController';

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('@/infrastructure', () => ({
  mensagemErro: (e: any, p?: string) => e?.message || p || 'erro',
  api: {
    auth: { logado: jest.fn(), sair: jest.fn() },
    diario: { listar: jest.fn(), criar: jest.fn(), atualizar: jest.fn(), apagar: jest.fn() },
    historico: { resumo: jest.fn(), evolucao: jest.fn(), distribuicao: jest.fn() },
    humor: { todos: jest.fn() },
    respiracao: { stats: jest.fn(), registrar: jest.fn(), apagarTodas: jest.fn() },
    ia: { conversar: jest.fn(), historico: jest.fn(), sessoes: jest.fn(), ativa: jest.fn(), encerrar: jest.fn(), retomar: jest.fn(), mensagens: jest.fn(), apagarConversa: jest.fn() },
  },
}));

const a = api as any;
const entrada = (id: number, extra = {}) => ({ id, title: `t${id}`, text: `x${id}`, emotion: null, createdAt: `2026-01-0${id}T10:00:00Z`, updatedAt: '', ...extra });

beforeEach(() => jest.clearAllMocks());

describe('useDiarioController', () => {
  it('lista ordenado, cria, edita, busca e exclui', async () => {
    a.diario.listar.mockResolvedValue([entrada(1), entrada(2)]);
    const { result } = await renderHook(() => useDiarioController());
    await waitFor(() => expect(result.current.entradas.map((e) => e.id)).toEqual([2, 1]));

    // validação
    await act(async () => { result.current.novaEntrada(); });
    await act(async () => { await result.current.salvar(); });
    expect(result.current.erroForm).toMatch(/preencha/i);
    expect(a.diario.criar).not.toHaveBeenCalled();

    // criar com emoção (alternar liga e desliga)
    await act(async () => { result.current.mudarForm({ titulo: ' A ', texto: ' B ' }); });
    await act(async () => { result.current.alternarEmocao('BEM'); });
    expect(result.current.form.emocao).toBe('BEM');
    await act(async () => { result.current.alternarEmocao('BEM'); });
    expect(result.current.form.emocao).toBeNull();
    await act(async () => { result.current.alternarEmocao('BEM'); });
    a.diario.criar.mockResolvedValue(entrada(3));
    await act(async () => { await result.current.salvar(); });
    expect(a.diario.criar).toHaveBeenCalledWith({ title: 'A', text: 'B', emotion: 'BEM' });
    expect(result.current.form.aberto).toBe(false);

    // editar
    await act(async () => { result.current.editar(entrada(1) as any); });
    expect(result.current.form.editandoId).toBe(1);
    a.diario.atualizar.mockResolvedValue(entrada(1));
    await act(async () => { await result.current.salvar(); });
    expect(a.diario.atualizar).toHaveBeenCalledWith(1, { title: 't1', text: 'x1', emotion: null });

    // busca vai para o back
    a.diario.listar.mockClear();
    await act(async () => { result.current.setBusca('abc'); });
    await waitFor(() => expect(a.diario.listar).toHaveBeenCalledWith('abc'), { timeout: 2000 });

    // excluir (404 conta como ok)
    await act(async () => { result.current.pedirExclusao(entrada(1) as any); });
    a.diario.apagar.mockRejectedValue({ status: 404, message: 'x' });
    await act(async () => { await result.current.confirmarExclusao(); });
    expect(a.diario.apagar).toHaveBeenCalledWith(1);
    expect(result.current.paraExcluir).toBeNull();
  });

  it('mostra erro de listagem', async () => {
    a.diario.listar.mockRejectedValue({ message: 'caiu' });
    const { result } = await renderHook(() => useDiarioController());
    await waitFor(() => expect(result.current.erro).toBe('caiu'));
  });
});

describe('useHistoricoController', () => {
  it('carrega e troca 7/30 dias', async () => {
    a.historico.resumo.mockResolvedValue({ totalRecords: 3, currentStreak: 1, bestStreak: 2, breathingSessions: 0 });
    a.humor.todos.mockResolvedValue([{ id: 1, mood: 'BEM', note: null, createdAt: '2026-01-01T10:00:00Z' }]);
    a.respiracao.stats.mockResolvedValue({ todaySessions: 0, totalSessions: 9, totalMinutes: 1 });
    a.historico.evolucao.mockResolvedValue([
      { date: '2026-01-01', averageScore: 4, count: 1 },
      { date: '2026-01-02', averageScore: null, count: 0 },
    ]);
    a.historico.distribuicao.mockResolvedValue({ items: [{ mood: 'BEM', count: 1, percentage: 100 }], total: 1, predominant: 'BEM', predominantPercentage: 100 });
    const { result } = await renderHook(() => useHistoricoController());
    await waitFor(() => expect(result.current.pontos).toHaveLength(1));
    expect(result.current.resumo?.breathingSessions).toBe(9);
    expect(a.historico.evolucao).toHaveBeenLastCalledWith(7);
    await act(async () => { result.current.setPeriodo(30); });
    await waitFor(() => expect(a.historico.evolucao).toHaveBeenLastCalledWith(30));
    expect(a.historico.distribuicao).toHaveBeenLastCalledWith(30);
  });

  it('vazio sem registros', async () => {
    a.historico.resumo.mockResolvedValue({ totalRecords: 0, currentStreak: 0, bestStreak: 0, breathingSessions: 0 });
    a.humor.todos.mockResolvedValue([]);
    a.respiracao.stats.mockResolvedValue(null);
    a.historico.evolucao.mockResolvedValue([]);
    a.historico.distribuicao.mockResolvedValue({ items: [], total: 0, predominant: null, predominantPercentage: 0 });
    const { result } = await renderHook(() => useHistoricoController());
    await waitFor(() => expect(result.current.vazio).toBe(true));
  });
});

describe('useRespirarController', () => {
  it('conclui após 60s e registra a sessão uma vez', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    a.respiracao.stats.mockResolvedValue({ todaySessions: 0, totalSessions: 0, totalMinutes: 0 });
    a.respiracao.registrar.mockResolvedValue({});
    const { result } = await renderHook(() => useRespirarController());
    await act(async () => { result.current.iniciar(); });
    expect(result.current.fase?.id).toBe('inhale');
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.fase?.id).toBe('hold');
    await act(async () => {
      jest.advanceTimersByTime(57000);
    });
    expect(result.current.estado).toBe('concluido');
    expect(a.respiracao.registrar).toHaveBeenCalledTimes(1);
    expect(a.respiracao.registrar).toHaveBeenCalledWith({ technique: '3-4-5', cycles: 5, durationSeconds: 60 });
    jest.useRealTimers();
  });

  it('parar não registra e apagar confirma', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    a.respiracao.stats.mockResolvedValue({ todaySessions: 0, totalSessions: 0, totalMinutes: 0 });
    a.respiracao.apagarTodas.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useRespirarController());
    await act(async () => { result.current.iniciar(); });
    await act(async () => { result.current.parar(); });
    await act(async () => {
      jest.advanceTimersByTime(70000);
    });
    expect(a.respiracao.registrar).not.toHaveBeenCalled();
    await act(async () => { result.current.pedirApagar(); });
    await act(async () => { await result.current.confirmarApagar(); });
    expect(a.respiracao.apagarTodas).toHaveBeenCalled();
    expect(result.current.confirmandoApagar).toBe(false);
    jest.useRealTimers();
  });
});

describe('useChatController', () => {
  const sessaoAntiga = { id: 7, useCase: 'CHAT', title: 'Noites sem dormir', createdAt: '2026-11-10T20:00:00Z', lastMessageAt: '2026-11-10T20:10:00Z' };
  const opcoes = { pensarMinMs: 0, pensarMaxMs: 0 };
  const logado = (hist: unknown[] = [], sessoes: unknown[] = [sessaoAntiga]) => {
    a.auth.logado.mockResolvedValue(true);
    a.ia.historico.mockResolvedValue(hist);
    a.ia.sessoes.mockResolvedValue(sessoes);
    a.ia.ativa.mockResolvedValue(hist.length ? 9 : null);
    a.ia.encerrar.mockResolvedValue(undefined);
    a.ia.retomar.mockResolvedValue(undefined);
  };

  it('sem login mostra aviso e não envia', async () => {
    a.auth.logado.mockResolvedValue(false);
    const { result } = await renderHook(() => useChatController(opcoes));
    await waitFor(() => expect(result.current.semLogin).toBe(true));
    await act(async () => { await result.current.enviar('oi'); });
    expect(a.ia.conversar).not.toHaveBeenCalled();
  });

  it('abre no início com as sessões anteriores', async () => {
    logado();
    const { result } = await renderHook(() => useChatController(opcoes));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.tela).toBe('inicio');
    expect(result.current.temHistorico).toBe(true);
  });

  it('sessão não encerrada continua aberta', async () => {
    logado([{ id: 1, role: 'USER', content: 'oi', status: 'SUCCESS', createdAt: '2026-01-01T10:00:00Z' }]);
    const { result } = await renderHook(() => useChatController(opcoes));
    await waitFor(() => expect(result.current.tela).toBe('sessao'));
    expect(result.current.mensagens).toHaveLength(1);
    expect(result.current.ativaId).toBe(9);
  });

  it('do início abre sessão nova, segura até digitar, marca crise e trata erro', async () => {
    logado();
    const { result } = await renderHook(() => useChatController(opcoes));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    a.ia.conversar.mockResolvedValueOnce({ conversationId: 12, reply: 'calma', status: 'CRISIS', crisisDetected: true, createdAt: '2026-01-01T10:01:00Z' });
    await act(async () => { await result.current.enviar('quero sumir'); });
    expect(a.ia.encerrar).toHaveBeenCalled();
    expect(result.current.tela).toBe('sessao');
    const resposta = result.current.mensagens.at(-1)!;
    expect(resposta).toMatchObject({ tipo: 'bot', crise: true, digitar: true });
    expect(result.current.digitandoId).toBe(resposta.id);
    expect(result.current.podeEnviar).toBe(false);

    // enquanto digita, não envia outra
    await act(async () => { await result.current.enviar('mais uma'); });
    expect(a.ia.conversar).toHaveBeenCalledTimes(1);

    await act(async () => { result.current.fimDigitacao(resposta.id); });
    expect(result.current.digitandoId).toBeNull();

    a.ia.conversar.mockRejectedValueOnce({ offline: true, message: 'x' });
    await act(async () => { await result.current.enviar('e agora'); });
    expect(result.current.mensagens.at(-1)?.texto).toMatch(/188/);
    expect(result.current.pensando).toBe(false);
  });

  it('a resposta espera o tempo mínimo de "pensando"', async () => {
    jest.useFakeTimers();
    logado();
    const { result } = await renderHook(() => useChatController({ pensarMinMs: 4000, pensarMaxMs: 4000 }));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    a.ia.conversar.mockResolvedValueOnce({ conversationId: 12, reply: 'oi', status: 'SUCCESS', createdAt: '2026-01-01T10:01:00Z' });
    let envio: Promise<void> = Promise.resolve();
    await act(async () => { envio = result.current.enviar('oi'); });
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(result.current.pensando).toBe(true);
    expect(result.current.mensagens.filter((m) => m.tipo === 'bot')).toHaveLength(0);
    await act(async () => { jest.advanceTimersByTime(1100); await envio; });
    expect(result.current.pensando).toBe(false);
    expect(result.current.mensagens.at(-1)).toMatchObject({ tipo: 'bot', texto: 'oi' });
    jest.useRealTimers();
  });

  it('encerra sem apagar, lê uma sessão anterior e reabre', async () => {
    logado();
    const { result } = await renderHook(() => useChatController(opcoes));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    a.ia.mensagens.mockResolvedValue([
      { id: 1, role: 'USER', content: 'não durmo', status: 'SUCCESS', createdAt: '2026-11-10T20:00:00Z' },
      { id: 2, role: 'ASSISTANT', content: 'o que passa pela cabeça?', status: 'SUCCESS', createdAt: '2026-11-10T20:01:00Z' },
    ]);
    await act(async () => { await result.current.abrirSessao(sessaoAntiga as never); });
    expect(result.current.tela).toBe('leitura');
    expect(result.current.mensagens).toHaveLength(2);
    expect(result.current.podeEnviar).toBe(false);

    await act(async () => { await result.current.reabrir(sessaoAntiga as never); });
    expect(a.ia.retomar).toHaveBeenCalledWith(7);
    expect(result.current.tela).toBe('sessao');
    expect(result.current.ativaId).toBe(7);
    expect(result.current.mensagens.at(-1)).toMatchObject({ tipo: 'divisor' });

    await act(async () => { await result.current.encerrar(); });
    expect(result.current.tela).toBe('inicio');
    expect(a.ia.apagarConversa).not.toHaveBeenCalled();
    expect(a.ia.sessoes).toHaveBeenCalledTimes(2);
  });

  it('apaga a sessão que está lendo', async () => {
    logado();
    a.ia.mensagens.mockResolvedValue([]);
    a.ia.apagarConversa.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useChatController(opcoes));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    await act(async () => { await result.current.abrirSessao(sessaoAntiga as never); });
    await act(async () => { result.current.pedirApagar(); });
    await act(async () => { await result.current.apagarVendo(); });
    expect(a.ia.apagarConversa).toHaveBeenCalledWith(7);
    expect(result.current.tela).toBe('inicio');
    expect(result.current.temHistorico).toBe(false);
  });
});

describe('quandoFoi', () => {
  it('hoje, ontem e data curta', () => {
    const agora = new Date(2026, 10, 17, 12);
    expect(quandoFoi(new Date(2026, 10, 17, 8).toISOString(), agora)).toBe('hoje');
    expect(quandoFoi(new Date(2026, 10, 16, 8).toISOString(), agora)).toBe('ontem');
    expect(quandoFoi(new Date(2026, 10, 3, 8).toISOString(), agora)).toBe('3 nov');
  });
});
