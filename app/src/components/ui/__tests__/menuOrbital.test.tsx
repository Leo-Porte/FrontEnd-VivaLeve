import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ThemeProvider } from '@/theme';
import { NavChromeProvider } from '../navChrome';
import { MenuOrbital } from '../orbital/MenuOrbital';

jest.mock('react-native-reanimated', () => require('@/test-utils/reanimated'));
jest.mock('moti', () => ({ MotiView: require('react-native').View }));
jest.mock('expo-blur', () => ({ BlurView: require('react-native').View }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ usePathname: () => '/humor', useRouter: () => ({ navigate: mockNavigate, replace: mockReplace }) }));
const mockSair = jest.fn(() => Promise.resolve());
jest.mock('@/controllers/useSession', () => ({ useSession: () => ({ sair: mockSair }) }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

const montar = () =>
  render(
    <ThemeProvider>
      <NavChromeProvider>
        <MenuOrbital lateral={false} />
      </NavChromeProvider>
    </ThemeProvider>,
  );

beforeEach(() => jest.clearAllMocks());

describe('MenuOrbital', () => {
  it('fechado mostra só a bolinha', async () => {
    await montar();
    expect(await screen.findByTestId('nav-abrir')).toBeTruthy();
    expect(screen.queryByTestId('nav-diario')).toBeNull();
  });

  it('abre a roda com os 8 destinos e marca a tela atual', async () => {
    await montar();
    await fireEvent.press(await screen.findByTestId('nav-abrir'));
    for (const k of ['home', 'humor', 'diario', 'historico', 'respirar', 'chat', 'config', 'sair']) {
      expect(screen.getByTestId(`nav-${k}`)).toBeTruthy();
    }
    expect(screen.getByTestId('nav-humor').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('tocar num destino navega', async () => {
    await montar();
    await fireEvent.press(await screen.findByTestId('nav-abrir'));
    await fireEvent.press(screen.getByTestId('nav-diario'));
    expect(mockNavigate).toHaveBeenCalledWith('/diario');
  });

  it('tocar na tela atual só fecha, sem navegar', async () => {
    await montar();
    await fireEvent.press(await screen.findByTestId('nav-abrir'));
    await fireEvent.press(screen.getByTestId('nav-humor'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('sair encerra a sessão e vai para o login', async () => {
    await montar();
    await fireEvent.press(await screen.findByTestId('nav-abrir'));
    await fireEvent.press(screen.getByTestId('nav-sair'));
    expect(mockSair).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
});
