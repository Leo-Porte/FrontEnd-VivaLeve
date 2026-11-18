import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SafeCanvas } from '@/components/three/SafeCanvas';

jest.mock('@react-three/fiber', () => ({
  Canvas: () => {
    throw new Error('GL indisponível');
  },
  useFrame: jest.fn(),
}));

describe('SafeCanvas', () => {
  it('mostra o fallback 2D quando o GL falha', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const r = await render(
      <SafeCanvas fallback={<Text>fallback-2d</Text>} testID="sc">
        <></>
      </SafeCanvas>,
    );
    expect(r.getByText('fallback-2d', { includeHiddenElements: true })).toBeTruthy();
    spy.mockRestore();
  });
});
