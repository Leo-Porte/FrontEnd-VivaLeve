jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sessao } from '../sessao';

const user = { id: 7, email: 'a@b.com', name: '', pictureUrl: null };
const auth = (expiresAt: string) => ({ token: 'tk', tokenType: 'Bearer', expiresAt, user });

beforeEach(async () => { await AsyncStorage.clear(); });

describe('sessao', () => {
  it('salva e devolve token e usuário (nome vem do email se vazio)', async () => {
    const u = await sessao.salvar(auth(new Date(Date.now() + 60000).toISOString()));
    expect(u.name).toBe('a');
    expect(await sessao.token()).toBe('tk');
    expect(await sessao.logado()).toBe(true);
    expect(await sessao.usuario()).toMatchObject({ id: 7, email: 'a@b.com' });
  });

  it('token vencido é apagado', async () => {
    await sessao.salvar(auth(new Date(Date.now() - 1000).toISOString()));
    expect(await sessao.token()).toBeNull();
    expect(await sessao.usuario()).toBeNull();
    expect(await AsyncStorage.getItem('pluma_token')).toBeNull();
  });

  it('sem expiresAt, o token não expira', async () => {
    await sessao.salvar({ ...auth(''), expiresAt: '' });
    expect(await sessao.token()).toBe('tk');
  });

  it('limpar avisa os ouvintes; aoMudar cancela', async () => {
    const f = jest.fn();
    const cancelar = sessao.aoMudar(f);
    await sessao.salvar(auth(new Date(Date.now() + 60000).toISOString()));
    await sessao.limpar();
    expect(f).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 7 }));
    expect(f).toHaveBeenNthCalledWith(2, null);
    cancelar();
    await sessao.limpar();
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('conversa fica por usuário e sobrevive ao logout', async () => {
    await sessao.salvar(auth(new Date(Date.now() + 60000).toISOString()));
    await sessao.salvarConversa(42);
    expect(await sessao.conversaSalva()).toBe(42);
    await sessao.limpar(); // vira "anon"
    expect(await sessao.conversaSalva()).toBeNull();
    await sessao.salvar(auth(new Date(Date.now() + 60000).toISOString()));
    expect(await sessao.conversaSalva()).toBe(42);
    await sessao.limparConversa();
    expect(await sessao.conversaSalva()).toBeNull();
  });
});
