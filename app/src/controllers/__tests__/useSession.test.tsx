jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  return { Redirect: ({ href }: { href: string }) => createElement(Text, null, 'redirect:' + href) };
});
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { api, entrarComoTeste, resetarMock, sessao } from '@/infrastructure';
import { AuthGuard, GuestGuard } from '../AuthGuard';
import { SessionProvider, useSession } from '../useSession';

const wrapper = ({ children }: { children: React.ReactNode }) => <SessionProvider>{children}</SessionProvider>;

beforeEach(async () => {
  await AsyncStorage.clear();
  await resetarMock();
});

describe('useSession', () => {
  it('fora do provider lança erro claro', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renderHook(() => useSession())).rejects.toThrow(/SessionProvider/);
  });

  it('começa carregando e termina deslogado', async () => {
    let liberar!: () => void;
    const trava = new Promise<void>((r) => { liberar = r; });
    const esperar = async () => { await trava; return null; };
    // sessao.token() lê 2 chaves; só essas 2 leituras ficam presas
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(esperar).mockImplementationOnce(esperar);
    const { result } = await renderHook(() => useSession(), { wrapper });
    expect(result.current.carregando).toBe(true);
    await act(async () => { liberar(); });
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current).toMatchObject({ logado: false, usuario: null });
  });

  it('restaura sessão guardada', async () => {
    await entrarComoTeste();
    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.logado).toBe(true);
    expect(result.current.usuario?.email).toBe('teste@pluma.dev');
  });

  it('entrar, sair e cadastrar atualizam o estado', async () => {
    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.carregando).toBe(false));
    await act(async () => { await result.current.entrar('a@b.com', '12345678'); });
    expect(result.current.logado).toBe(true);
    await act(async () => { await result.current.sair(); });
    expect(result.current.logado).toBe(false);
    await act(async () => { await result.current.cadastrar('c@d.com', '12345678', 'Cida'); });
    expect(result.current.usuario?.name).toBe('Cida');
  });

  it('erro de login propaga e não loga', async () => {
    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.carregando).toBe(false));
    await act(async () => {
      await expect(result.current.entrar('', '')).rejects.toMatchObject({ status: 400 });
    });
    expect(result.current.logado).toBe(false);
  });

  it('401 em qualquer chamada derruba a sessão', async () => {
    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.carregando).toBe(false));
    await act(async () => { await result.current.entrar('a@b.com', '12345678'); });
    expect(result.current.logado).toBe(true);
    // token que o mock não conhece -> 401
    await AsyncStorage.setItem('pluma_token', 'mock-999');
    await act(async () => { await api.humor.hoje().catch(() => {}); });
    expect(result.current.logado).toBe(false);
    expect(await sessao.token()).toBeNull();
  });
});

describe('AuthGuard / GuestGuard', () => {
  const Filho = () => <Text>conteudo</Text>;

  it('deslogado: AuthGuard redireciona para /login', async () => {
    const r = await render(<SessionProvider><AuthGuard><Filho /></AuthGuard></SessionProvider>);
    await waitFor(() => expect(r.getByText('redirect:/login')).toBeTruthy());
    expect(r.queryByText('conteudo')).toBeNull();
  });

  it('logado: AuthGuard mostra o conteúdo', async () => {
    await entrarComoTeste();
    const r = await render(<SessionProvider><AuthGuard><Filho /></AuthGuard></SessionProvider>);
    await waitFor(() => expect(r.getByText('conteudo')).toBeTruthy());
  });

  it('GuestGuard: logado vai para /, deslogado vê o conteúdo', async () => {
    const a = await render(<SessionProvider><GuestGuard><Filho /></GuestGuard></SessionProvider>);
    await waitFor(() => expect(a.getByText('conteudo')).toBeTruthy());
    a.unmount();
    await entrarComoTeste();
    const b = await render(<SessionProvider><GuestGuard><Filho /></GuestGuard></SessionProvider>);
    await waitFor(() => expect(b.getByText('redirect:/')).toBeTruthy());
  });
});
