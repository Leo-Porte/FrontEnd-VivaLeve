import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { ThemeProvider } from '@/theme';
import { StyleSheet } from 'react-native';

import { contrastRatio, palettes } from '@/theme';
import { Button, Chip, EmotionBadge, TextField } from '..';
import { EmotionPicker } from '..';

jest.mock('react-native-reanimated', () => ({ useReducedMotion: () => true }));
jest.mock('expo-router', () => ({ usePathname: () => '/', useRouter: () => ({ navigate: jest.fn() }) }));
jest.mock('moti', () => ({ MotiView: require('react-native').View }));
const mockGetItem = jest.fn((_k?: string) => Promise.resolve<string | null>(null));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (k: string) => mockGetItem(k),
  setItem: jest.fn(() => Promise.resolve()),
}));

const wrap = async (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Button', () => {
  it('chama onPress', async () => {
    const onPress = jest.fn();
    await wrap(<Button label="Salvar" onPress={onPress} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Salvar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('disabled não dispara', async () => {
    const onPress = jest.fn();
    await wrap(<Button label="Salvar" onPress={onPress} disabled />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Salvar' }));
    expect(onPress).not.toHaveBeenCalled();
  });
  it('loading bloqueia e marca busy', async () => {
    const onPress = jest.fn();
    await wrap(<Button label="Entrar" onPress={onPress} loading />);
    const b = await screen.findByRole('button', { name: 'Entrar' });
    await fireEvent.press(b);
    expect(onPress).not.toHaveBeenCalled();
    expect(b.props.accessibilityState).toMatchObject({ busy: true });
  });
});

describe('EmotionPicker', () => {
  it('seleciona e devolve id e mood', async () => {
    const onChange = jest.fn();
    await wrap(<EmotionPicker value={null} onChange={onChange} />);
    await fireEvent.press(await screen.findByTestId('emotion-mais-ou-menos'));
    expect(onChange).toHaveBeenCalledWith('mais-ou-menos', 'MAIS_OU_MENOS');
  });
  it('marca a emoção selecionada', async () => {
    await wrap(<EmotionPicker value="ANSIOSO" onChange={() => {}} />);
    expect((await screen.findByTestId('emotion-ansioso')).props.accessibilityState).toMatchObject({ selected: true });
  });
});

describe('TextField', () => {
  it('digita e mostra erro', async () => {
    const onChangeText = jest.fn();
    await wrap(<TextField label="Email" error="Inválido" onChangeText={onChangeText} />);
    await fireEvent.changeText(await screen.findByLabelText('Email'), 'a@b.c');
    expect(onChangeText).toHaveBeenCalledWith('a@b.c');
    expect(screen.getByText('Inválido')).toBeTruthy();
  });
  it('senha alterna mostrar/ocultar', async () => {
    await wrap(<TextField label="Senha" secure />);
    const input = await screen.findByLabelText('Senha');
    expect(input.props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByLabelText('Mostrar senha'));
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(false);
  });
});

describe.each(['light', 'dark'] as const)('contraste do texto sobre fundo colorido [%s] (regressão do rótulo cinza)', (scheme) => {
  beforeEach(() => mockGetItem.mockResolvedValue(scheme));
  const cor = (el: { props: { style?: unknown } }) => (StyleSheet.flatten(el.props.style as never) as { color: string }).color;
  it('Button primary: rótulo contra o verde', async () => {
    await wrap(<Button label="Salvar" />);
    expect(contrastRatio(cor(await screen.findByText('Salvar')), palettes[scheme].primary)).toBeGreaterThanOrEqual(4.5);
  });
  it('Button danger e secondary', async () => {
    await wrap(<><Button label="Sair" variant="danger" /><Button label="Outro" variant="secondary" /></>);
    // iOS: danger = texto vermelho sobre fundo neutro; secondary = texto sálvia sobre fundo tingido
    expect(contrastRatio(cor(await screen.findByText('Sair')), palettes[scheme].surfaceAlt)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(cor(await screen.findByText('Outro')), palettes[scheme].primarySoft)).toBeGreaterThanOrEqual(4.5);
  });
  it('Chip selecionado e EmotionBadge', async () => {
    await wrap(<><Chip label="Sete" selected /><EmotionBadge emotion="ANSIOSO" /></>);
    expect(contrastRatio(cor(await screen.findByText('Sete')), palettes[scheme].primary)).toBeGreaterThanOrEqual(4.5);
    await waitFor(() => expect(contrastRatio(cor(screen.getByText('Ansioso')), '#E91E63')).toBeGreaterThanOrEqual(4));
  });
});
