jest.mock('moti', () => ({ MotiView: require('react-native').View }));
import { render } from '@testing-library/react-native';

import { Icon3D, icon3DNames } from '@/components/icons3d';

describe('Icon3D', () => {
  it('renderiza todos os nomes conhecidos', async () => {
    for (const name of icon3DNames) {
      const r = await render(<Icon3D name={name} size={32} still testID={`i-${name}`} />);
      expect(r.getByTestId(`i-${name}`)).toBeTruthy();
      await r.unmount();
    }
  });

  it('nome inválido não quebra e não renderiza nada', async () => {
    const r = await render(<Icon3D name={'nao-existe' as never} testID="x" />);
    expect(r.queryByTestId('x')).toBeNull();
  });
});
