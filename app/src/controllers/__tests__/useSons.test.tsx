import { act, renderHook } from '@testing-library/react-native';

const mockPlayer = { loop: false, volume: 0, play: jest.fn(), pause: jest.fn(), remove: jest.fn() };
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockPlayer),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(() => Promise.resolve(null)), setItem: jest.fn(() => Promise.resolve()) },
}));

import { createAudioPlayer } from 'expo-audio';

import { SONS } from '@/entities';
import { useSons } from '../useSons';

describe('useSons (motor nativo com expo-audio mockado)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('expõe os 5 sons da entidade', async () => {
    const { result } = await renderHook(() => useSons());
    expect(result.current.sons).toBe(SONS);
    expect(result.current.sons).toHaveLength(5);
    expect(result.current.suportado).toBe(true);
  });

  it('toca, em loop e com o volume, e pausa ao alternar de novo', async () => {
    const { result } = await renderHook(() => useSons());
    await act(async () => result.current.alternar('chuva'));
    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
    expect(mockPlayer.loop).toBe(true);
    expect(mockPlayer.play).toHaveBeenCalled();
    expect(result.current.tocando).toBe('chuva');

    await act(async () => result.current.alternar('chuva'));
    expect(mockPlayer.pause).toHaveBeenCalled();
    expect(result.current.tocando).toBeNull();
  });

  it('ajusta volume (limitado a 0..1) no mockPlayer ativo', async () => {
    const { result } = await renderHook(() => useSons());
    await act(async () => result.current.alternar('chuva'));
    await act(async () => result.current.definirVolume(0.3));
    expect(mockPlayer.volume).toBeCloseTo(0.3);
    await act(async () => result.current.definirVolume(7));
    expect(mockPlayer.volume).toBe(1);
    await act(async () => result.current.parar());
    expect(result.current.tocando).toBeNull();
  });
});
