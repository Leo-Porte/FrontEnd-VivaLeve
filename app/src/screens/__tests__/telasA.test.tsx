import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { ThemeProvider } from '@/theme';

import { ConfigScreen } from '../config/ConfigScreen';
import { HomeScreen } from '../home/HomeScreen';
import { HumorScreen } from '../humor/HumorScreen';
import { LoginScreen } from '../login/LoginScreen';

jest.mock('react-native-reanimated', () => require('@/test-utils/reanimated'));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('moti', () => ({ MotiView: require('react-native').View }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), navigate: jest.fn() }), useLocalSearchParams: () => ({}) }));
jest.mock('@/components/three', () => ({ HeroScene: () => null }));
jest.mock('@/components/sons', () => ({ SonsPanel: () => null }));
jest.mock('@/components/icons3d', () => ({ Icon3D: () => null }));
jest.mock('@/controllers/useSession', () => ({
  useSession: () => ({ usuario: { id: 1, email: 'a@b.com', name: 'Ana', pictureUrl: null }, sair: jest.fn() }),
}));
jest.mock('@/infrastructure', () => ({
  GOOGLE_CLIENT_ID: '',
  mensagemErro: (e: any) => e?.message ?? 'erro',
  api: {
    auth: { logado: jest.fn().mockResolvedValue(false) },
    usuarios: { eu: jest.fn().mockResolvedValue({ id: 1, email: 'a@b.com', name: 'Ana', pictureUrl: null }) },
    humor: { todos: jest.fn().mockResolvedValue([]) },
  },
}));

const comTema = (ui: React.ReactElement) => <ThemeProvider>{ui}</ThemeProvider>;

describe('telas A renderizam', () => {
  it('login', async () => {
    await render(comTema(<LoginScreen />));
    // telefone: abertura com a cena; o formulário só aparece depois de escolher Entrar ou Criar conta
    await waitFor(() => expect(screen.getByTestId('login-abrir-entrar')).toBeTruthy());
    expect(screen.queryByTestId('login-email')).toBeNull();
    await fireEvent.press(screen.getByTestId('login-abrir-entrar'));
    expect(screen.getByTestId('login-email')).toBeTruthy();
    expect(screen.getByTestId('login-senha')).toBeTruthy();
    expect(screen.getByTestId('login-entrar')).toBeTruthy();
    expect(screen.getByTestId('login-google')).toBeTruthy();
    expect(screen.queryByTestId('login-nome')).toBeNull();
  });

  it('login: Criar conta abre o cadastro, Voltar retorna à abertura', async () => {
    await render(comTema(<LoginScreen />));
    await waitFor(() => expect(screen.getByTestId('login-abrir-cadastrar')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('login-abrir-cadastrar'));
    expect(screen.getByTestId('login-nome')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('login-aba-entrar'));
    expect(screen.queryByTestId('login-nome')).toBeNull();
    await fireEvent.press(screen.getByTestId('login-voltar'));
    expect(screen.queryByTestId('login-email')).toBeNull();
  });

  it('home', async () => {
    await render(comTema(<HomeScreen />));
    await waitFor(() => expect(screen.getByTestId('home-saudacao')).toBeTruthy());
    expect(screen.getByTestId('home-apoio-cvv-ligar')).toBeTruthy();
    expect(screen.getByTestId('home-hero')).toBeTruthy();
    expect(screen.getByTestId('emotion-bem')).toBeTruthy();
    expect(screen.getByTestId('home-sugestao-respirar')).toBeTruthy();
    expect(screen.queryByTestId('home-apoio-psicologos-abrir')).toBeNull();
    await fireEvent.press(screen.getByTestId('home-apoio-mais'));
    expect(screen.getByTestId('home-apoio-psicologos-abrir')).toBeTruthy();
  });

  it('humor', async () => {
    await render(comTema(<HumorScreen />));
    await waitFor(() => expect(screen.getByTestId('humor-salvar')).toBeTruthy());
    expect(screen.getByTestId('emotion-bem')).toBeTruthy();
    expect(screen.getByTestId('humor-atividade-trabalho')).toBeTruthy();
  });

  it('config', async () => {
    await render(comTema(<ConfigScreen />));
    await waitFor(() => expect(screen.getByTestId('config-sair')).toBeTruthy());
    expect(screen.getByTestId('config-apagar')).toBeTruthy();
    expect(screen.getByTestId('config-tema-escuro')).toBeTruthy();
  });
});
