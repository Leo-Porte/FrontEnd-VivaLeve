jest.mock('react-native-reanimated', () => require('@/test-utils/reanimated'));
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { LineChart } from '../LineChart';

const cores = { color: '#639', gridColor: '#eee', textColor: '#555' };

describe('charts', () => {
  it('LineChart renderiza vazio e cheio', async () => {
    await render(<LineChart data={[]} {...cores} />);
    const r = await render(<LineChart data={[{ label: 'a', value: 3 }, { label: 'b', value: 4 }]} {...cores} testID="lc" />);
    await fireEvent(r.getByTestId('lc'), 'layout', { nativeEvent: { layout: { width: 300, height: 220 } } });
    expect(r.getByTestId('lc')).toBeTruthy();
  });
});
