import { act, renderHook, waitFor } from '@testing-library/react-native';

import { api } from '@/infrastructure';

import { useConfigController } from '../useConfigController';
import { deveMostrar } from '../abertura';
import { periodoDoDia, semanaDe, sugestaoPara, useHomeController } from '../useHomeController';
import { agruparPorDia, tituloDoDia, useHumorController } from '../useHumorController';
import { useLoginController } from '../useLoginController';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, navigate: jest.fn() }) }));
jest.mock('../useSession', () => ({
  useSession: () => ({ usuario: { id: 1, email: 'a@b.com', name: 'Ana', pictureUrl: null }, sair: mockSair }),
}));
const mockSair = jest.fn().mockResolvedValue(undefined);
jest.mock('@/theme', () => ({
  useTheme: () => ({ preference: 'system', setPreference: jest.fn(), scheme: 'light' }),
}));
jest.mock('@/infrastructure', () => ({
  GOOGLE_CLIENT_ID: '',
  mensagemErro: (e: any, p?: string) => e?.message || p || 'erro',
  api: {
    auth: { logado: jest.fn(), login: jest.fn(), register: jest.fn(), google: jest.fn() },
    usuarios: { eu: jest.fn() },
    humor: { todos: jest.fn(), criar: jest.fn(), apagar: jest.fn() },
    diario: { listar: jest.fn(), apagar: jest.fn() },
    ia: { conversas: jest.fn(), apagarConversa: jest.fn() },
    respiracao: { apagarTodas: jest.fn() },
  },
}));

const a = api as any;
beforeEach(() => {
  jest.clearAllMocks();
  a.auth.logado.mockResolvedValue(false);
  a.humor.todos.mockResolvedValue([]);
  a.usuarios.eu.mockResolvedValue({ id: 1, email: 'a@b.com', name: 'Ana Maria', pictureUrl: null });
});

describe('useLoginController', () => {
  it('valida e-mail, senha e tamanho da senha no cadastro', async () => {
    const { result } = await renderHook(() => useLoginController());
    await act(async () => { await result.current.enviar(); });
    expect(result.current.erro).toBe('Informe o email.');
    await act(async () => { result.current.setEmail('x@y.com'); });
    await act(async () => { await result.current.enviar(); });
    expect(result.current.erro).toBe('Informe a senha.');
    await act(async () => { result.current.alternarModo(); result.current.setSenha('123'); });
    expect(result.current.cadastro).toBe(true);
    await act(async () => { await result.current.enviar(); });
    expect(result.current.erro).toBe('A senha deve ter entre 8 e 64 caracteres.');
    expect(a.auth.register).not.toHaveBeenCalled();
  });

  it('entra, cadastra e mapeia 401/409/400/offline', async () => {
    const { result } = await renderHook(() => useLoginController());
    await act(async () => { result.current.setEmail(' x@y.com '); result.current.setSenha('segredo123'); });
    a.auth.login.mockResolvedValue({});
    await act(async () => { await result.current.enviar(); });
    expect(a.auth.login).toHaveBeenCalledWith('x@y.com', 'segredo123');
    expect(mockReplace).toHaveBeenCalledWith('/');

    a.auth.login.mockRejectedValue({ status: 401 });
    await act(async () => { await result.current.enviar(); });
    expect(result.current.erro).toBe('Email ou senha inválidos.');
    expect(result.current.carregando).toBe(false);
    a.auth.login.mockRejectedValue({ offline: true });
    await act(async () => { await result.current.enviar(); });
    expect(result.current.erro).toMatch(/conectar ao servidor/);

    await act(async () => { result.current.alternarModo(); result.current.setNome('Ana'); });
    a.auth.register.mockRejectedValue({ status: 409 });
    await act(async () => { await result.current.enviar(); });
    expect(a.auth.register).toHaveBeenCalledWith('x@y.com', 'segredo123', 'Ana');
    expect(result.current.erro).toMatch(/já tem conta/);
    a.auth.register.mockRejectedValue({ status: 400, message: 'Dados ruins' });
    await act(async () => { await result.current.enviar(); });
    expect(result.current.erro).toBe('Dados ruins');
  });

  it('alterna visibilidade da senha e avisa Google sem client id', async () => {
    const { result } = await renderHook(() => useLoginController());
    expect(result.current.senhaVisivel).toBe(false);
    await act(async () => { result.current.alternarSenha(); });
    expect(result.current.senhaVisivel).toBe(true);
    await act(async () => { result.current.clicarGoogle(); });
    expect(result.current.erroSocial).not.toBe('');
  });

  it('já logado vai direto para a home', async () => {
    a.auth.logado.mockResolvedValue(true);
    await renderHook(() => useLoginController());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });
});

describe('useHomeController', () => {
  it('saudação com primeiro nome e apoio com o CVV à frente', async () => {
    const { result } = await renderHook(() => useHomeController());
    await waitFor(() => expect(result.current.saudacao.texto).toContain('Ana'));
    expect(result.current.saudacao.texto).not.toContain('Maria');
    expect(result.current.apoioPrincipal.telefone).toBe('188');
    expect(result.current.apoioExtra.some((r) => r.telefone)).toBe(false);
    expect(result.current.registroHoje).toBeNull();
    expect(result.current.sugestao.id).toBe('respirar');
  });

  it('sugestão: respirar em dia difícil, diário em dia bom', () => {
    expect(sugestaoPara('ANSIOSO').rota).toBe('/respirar');
    expect(sugestaoPara('DEPRESSIVO').rota).toBe('/respirar');
    expect(sugestaoPara('OTIMO').rota).toBe('/diario');
    expect(sugestaoPara(null).rota).toBe('/respirar');
  });

  it('semana: 7 dias até hoje, com o humor mais recente de cada dia', () => {
    const r = (id: number, logDate: string, hora: number, mood: 'BEM' | 'MAL') => ({
      id, mood, note: null, activities: [], imageUrl: null, logDate, createdAt: `${logDate}T${String(hora).padStart(2, '0')}:00:00`, updatedAt: '',
    });
    const semana = semanaDe([r(1, '2026-11-17', 9, 'MAL'), r(2, '2026-11-17', 15, 'BEM'), r(3, '2026-11-12', 10, 'MAL'), r(4, '2026-11-01', 10, 'BEM')], new Date(2026, 10, 17, 18));
    expect(semana.map((d) => d.dia)).toEqual(['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17']);
    expect(semana[6]).toMatchObject({ hoje: true, rotulo: 'Hoje', mood: 'BEM' });
    expect(semana[1].mood).toBe('MAL');
    expect(semana[0].mood).toBeNull();
  });
});

describe('useHumorController', () => {
  it('salva emoção com atividades e nota, e bloqueia clique duplo', async () => {
    const { result } = await renderHook(() => useHumorController());
    expect(result.current.podeSalvar).toBe(false);
    await act(async () => { result.current.setEmocao('BEM'); });
    await act(async () => { result.current.alternarAtividade('WORK'); result.current.alternarAtividade('FAMILY'); });
    await act(async () => { result.current.alternarAtividade('WORK'); });
    await act(async () => { result.current.setNota('  dia bom  '); });
    let fim!: () => void;
    a.humor.criar.mockReturnValue(new Promise((r) => { fim = () => r({}); }));
    await act(async () => { void result.current.salvar(); void result.current.salvar(); });
    expect(a.humor.criar).toHaveBeenCalledTimes(1);
    expect(a.humor.criar).toHaveBeenCalledWith('BEM', 'dia bom', ['FAMILY']);
    await act(async () => { fim(); });
    await waitFor(() => expect(result.current.salvo).toBe(true));
  });

  it('mostra erro da API (limite diário) e limita a nota a 500', async () => {
    const { result } = await renderHook(() => useHumorController());
    await act(async () => { result.current.setEmocao('MAL'); result.current.setNota('x'.repeat(600)); });
    expect(result.current.nota.length).toBe(500);
    a.humor.criar.mockRejectedValue({ message: 'Limite de 3 registros por dia' });
    await act(async () => { await result.current.salvar(); });
    expect(result.current.erro).toBe('Limite de 3 registros por dia');
    expect(result.current.salvo).toBe(false);
  });

  it('separa registros de hoje e recentes (7 mais novos)', async () => {
    const hoje = new Date();
    const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const regs = Array.from({ length: 9 }, (_, i) => ({
      id: i + 1, mood: 'BEM', note: null, activities: [], imageUrl: null,
      logDate: i === 8 ? iso : '2020-01-01', createdAt: new Date(2026, 0, i + 1).toISOString(), updatedAt: '',
    }));
    a.humor.todos.mockResolvedValue(regs);
    const { result } = await renderHook(() => useHumorController());
    await waitFor(() => expect(result.current.recentes).toHaveLength(7));
    expect(result.current.recentes[0].id).toBe(9);
    expect(result.current.registrosHoje.map((r) => r.id)).toEqual([9]);
  });
});

describe('abertura da Home', () => {
  it('período pelo horário: manhã, tarde, entardecer e noite', () => {
    const as = (h: number) => periodoDoDia(new Date(2026, 10, 17, h, 30));
    expect([as(4), as(5), as(11), as(12), as(16), as(17), as(18), as(19), as(23)]).toEqual(
      ['noite', 'manha', 'manha', 'tarde', 'tarde', 'entardecer', 'entardecer', 'noite', 'noite'],
    );
  });

  it('toca só na primeira entrada do dia', () => {
    expect(deveMostrar(null, '2026-11-17')).toBe(true);
    expect(deveMostrar('2026-11-16', '2026-11-17')).toBe(true);
    expect(deveMostrar('2026-11-17', '2026-11-17')).toBe(false);
  });
});

describe('linha do tempo do humor', () => {
  const reg = (id: number, logDate: string, hora = 10) => ({
    id, mood: 'BEM' as const, note: null, activities: [], imageUrl: null,
    logDate, createdAt: `${logDate}T${String(hora).padStart(2, '0')}:00:00`, updatedAt: '',
  });

  it('agrupa por dia mantendo a ordem e nomeia hoje e ontem', () => {
    const dias = agruparPorDia([reg(4, '2026-11-17', 15), reg(3, '2026-11-17', 9), reg(2, '2026-11-16'), reg(1, '2026-11-15')], '2026-11-17');
    expect(dias.map((d) => d.dia)).toEqual(['2026-11-17', '2026-11-16', '2026-11-15']);
    expect(dias[0].registros.map((r) => r.id)).toEqual([4, 3]);
    expect(dias.map((d) => d.hoje)).toEqual([true, false, false]);
    expect(dias[0].titulo).toBe('Hoje');
    expect(dias[1].titulo).toBe('Ontem');
    expect(dias[2].titulo.toLowerCase()).toContain('15');
  });

  it('ontem atravessa a virada do mês', () => {
    expect(tituloDoDia('2026-10-31', '2026-11-01')).toBe('Ontem');
  });

  it('depois de salvar, a confirmação fica até pedir novo registro', async () => {
    jest.useFakeTimers();
    try {
      const { result } = await renderHook(() => useHumorController());
      await act(async () => { result.current.setEmocao('OTIMO'); });
      a.humor.criar.mockResolvedValue({});
      await act(async () => { await result.current.salvar(); });
      expect(result.current.salvo).toBe(true);
      expect(result.current.emocao).toBeNull();
      await act(async () => { jest.advanceTimersByTime(10_000); });
      expect(result.current.salvo).toBe(true);
      await act(async () => { result.current.novoRegistro(); });
      expect(result.current.salvo).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('useConfigController', () => {
  it('apagar tudo: dois passos, apaga humor, diário, conversas e respiração', async () => {
    a.humor.todos.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    a.diario.listar.mockResolvedValue([{ id: 7 }]);
    a.ia.conversas.mockResolvedValue([{ id: 9 }]);
    const { result } = await renderHook(() => useConfigController());
    await act(async () => { result.current.pedirApagar(); });
    expect(result.current.confirmando).toBe(1);
    await act(async () => { result.current.confirmarApagar(); });
    expect(result.current.confirmando).toBe(2);
    expect(a.humor.apagar).not.toHaveBeenCalled();
    await act(async () => { result.current.confirmarApagar(); });
    await waitFor(() => expect(result.current.aviso?.tipo).toBe('ok'));
    expect(a.humor.apagar).toHaveBeenCalledTimes(2);
    expect(a.diario.apagar).toHaveBeenCalledWith(7);
    expect(a.ia.apagarConversa).toHaveBeenCalledWith(9);
    expect(a.respiracao.apagarTodas).toHaveBeenCalled();
    expect(result.current.confirmando).toBe(0);
  });

  it('cancelar não apaga; erro mostra aviso; 404 é ignorado', async () => {
    a.humor.todos.mockResolvedValue([{ id: 1 }]);
    a.diario.listar.mockResolvedValue([]);
    a.ia.conversas.mockResolvedValue([]);
    const { result } = await renderHook(() => useConfigController());
    await act(async () => { result.current.pedirApagar(); });
    await act(async () => { result.current.cancelarApagar(); });
    expect(a.humor.todos).not.toHaveBeenCalled();

    a.humor.apagar.mockRejectedValue({ status: 404 });
    await act(async () => { result.current.pedirApagar(); });
    await act(async () => { result.current.confirmarApagar(); });
    await act(async () => { result.current.confirmarApagar(); });
    await waitFor(() => expect(result.current.aviso?.tipo).toBe('ok'));

    a.humor.apagar.mockRejectedValue({ status: 500, message: 'caiu' });
    await act(async () => { result.current.pedirApagar(); });
    await act(async () => { result.current.confirmarApagar(); });
    await act(async () => { result.current.confirmarApagar(); });
    await waitFor(() => expect(result.current.aviso?.tipo).toBe('erro'));
  });

  it('sair limpa a sessão e vai para o login', async () => {
    const { result } = await renderHook(() => useConfigController());
    await act(async () => { await result.current.sairDaConta(); });
    expect(mockSair).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
});
