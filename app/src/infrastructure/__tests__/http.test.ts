jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
import AsyncStorage from '@react-native-async-storage/async-storage';
import { criarTransporteHttp } from '../http';
import { mensagemErro } from '../erros';
import { sessao } from '../sessao';

const base = 'http://api.test';
const resp = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)),
});

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  (global as any).fetch = fetchMock;
});
afterEach(() => jest.useRealTimers());

describe('transporte HTTP', () => {
  const t = criarTransporteHttp(base);

  it('GET manda Bearer e devolve JSON', async () => {
    fetchMock.mockResolvedValue(resp(200, { ok: 1 }));
    const r = await t.enviar({ metodo: 'GET', endpoint: '/v1/x?a=1', token: 'abc' });
    expect(r).toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(base + '/v1/x?a=1');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer abc');
    expect(init.body).toBeUndefined();
  });

  it('sem token não manda Authorization; JSON recebe Content-Type', async () => {
    fetchMock.mockResolvedValue(resp(200, {}));
    await t.enviar({ metodo: 'POST', endpoint: '/v1/auth/login', json: { email: 'e' }, token: null });
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"email":"e"}');
  });

  it('form vira FormData (campo repetido) e sem Content-Type manual', async () => {
    fetchMock.mockResolvedValue(resp(200, {}));
    await t.enviar({
      metodo: 'POST', endpoint: '/v1/mood-logs', token: 't',
      form: { mood: 'BEM', note: 'n', activities: ['WORK', 'REST'] },
    });
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('mood')).toBe('BEM');
    expect(init.body.getAll('activities')).toEqual(['WORK', 'REST']);
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('resposta vazia (204) vira null', async () => {
    fetchMock.mockResolvedValue(resp(204, undefined));
    expect(await t.enviar({ metodo: 'DELETE', endpoint: '/v1/x/1', token: 't' })).toBeNull();
  });

  it('erro HTTP usa message do corpo e guarda status', async () => {
    fetchMock.mockResolvedValue(resp(409, { message: 'Email já cadastrado' }));
    await expect(t.enviar({ metodo: 'POST', endpoint: '/x', token: null })).rejects.toMatchObject({
      message: 'Email já cadastrado', status: 409,
    });
  });

  it('erro HTTP sem message cai no texto padrão', async () => {
    fetchMock.mockResolvedValue(resp(500, 'boom'));
    await expect(t.enviar({ metodo: 'GET', endpoint: '/x', token: null })).rejects.toMatchObject({
      message: 'Erro HTTP 500', status: 500,
    });
  });

  it('falha de rede = offline', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const e = await t.enviar({ metodo: 'GET', endpoint: '/x', token: null }).catch((x) => x);
    expect(e.offline).toBe(true);
    expect(e.message).toMatch(/não está acessível/);
    expect(mensagemErro(e)).toMatch(/acordando/);
  });

  it('timeout de 70s aborta e vira offline', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation((_u: string, init: any) =>
      new Promise((_res, rej) => {
        init.signal.addEventListener('abort', () => rej(Object.assign(new Error('abort'), { name: 'AbortError' })));
      }),
    );
    const p = t.enviar({ metodo: 'GET', endpoint: '/x', token: null }).catch((x) => x);
    await jest.advanceTimersByTimeAsync(69999);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(2);
    const e = await p;
    expect(e.offline).toBe(true);
    expect(e.message).toMatch(/não respondeu a tempo/);
  });
});

describe('client: 401 e erros', () => {
  // client.ts escolhe o transporte no import; aqui forçamos modo http com URL.
  async function carregarClienteHttp() {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_URL = base;
    const mod = {
      client: require('../client'),
      sessao: require('../sessao').sessao,
      humor: require('../recursos/humor').humor,
      auth: require('../recursos/auth').auth,
    };
    return mod;
  }
  afterEach(() => { delete process.env.EXPO_PUBLIC_API_URL; });

  it('401 em rota protegida limpa a sessão e marca semLogin', async () => {
    const m = await carregarClienteHttp();
    await AsyncStorage.clear();
    await m.sessao.salvar({ token: 'tk', tokenType: 'Bearer', expiresAt: new Date(Date.now() + 1e6).toISOString(), user: { id: 1, email: 'a@b', name: 'a', pictureUrl: null } });
    const avisos = jest.fn();
    m.sessao.aoMudar(avisos);
    fetchMock.mockResolvedValue(resp(401, { message: 'Token inválido' }));
    const e = await m.humor.hoje().catch((x: any) => x);
    expect(e).toMatchObject({ status: 401, semLogin: true });
    expect(await m.sessao.token()).toBeNull();
    expect(avisos).toHaveBeenLastCalledWith(null);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tk');
    expect(mensagemErro(e)).toMatch(/sessão expirou/);
  });

  it('401 no login (semToken) NÃO é semLogin e não limpa nada', async () => {
    const m = await carregarClienteHttp();
    fetchMock.mockResolvedValue(resp(401, { message: 'Email ou senha inválidos' }));
    const e = await m.auth.login('a@b.com', 'x').catch((x: any) => x);
    expect(e.status).toBe(401);
    expect(e.semLogin).toBeUndefined();
    expect(mensagemErro(e)).toBe('Email ou senha inválidos');
  });

  it('humor.criar manda multipart e valida enum antes do fetch', async () => {
    const m = await carregarClienteHttp();
    fetchMock.mockResolvedValue(resp(200, { id: 1 }));
    await m.humor.criar('BEM', 'n', ['WORK']);
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.getAll('activities')).toEqual(['WORK']);
    fetchMock.mockClear();
    await expect(Promise.resolve().then(() => m.humor.criar('XX'))).rejects.toThrow(/mood inválido/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('PUT sem activities (null) não manda o campo', async () => {
    const m = await carregarClienteHttp();
    fetchMock.mockResolvedValue(resp(200, { id: 1 }));
    await m.humor.atualizar(1, 'BEM', 'n');
    const fd = fetchMock.mock.calls[0][1].body as FormData;
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
    expect(fd.has('activities')).toBe(false);
  });
});

describe('mensagemErro', () => {
  it('padrões', () => {
    expect(mensagemErro(null)).toMatch(/Não foi possível/);
    expect(mensagemErro(new Error(''), 'pad')).toBe('pad');
    expect(mensagemErro(new Error('x'))).toBe('x');
  });
});
