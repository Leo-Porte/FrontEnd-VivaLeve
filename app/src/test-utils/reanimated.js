/** Mock mínimo do Reanimated para testes de componentes das telas (sem worklets nativos). */
const React = require('react');
const { View } = require('react-native');

const Animated = { View, createAnimatedComponent: (c) => c };
const ease = (x) => x;
module.exports = {
  __esModule: true,
  default: Animated,
  useSharedValue: (v) =>
    React.useRef({
      value: v,
      get() {
        return this.value;
      },
      set(n) {
        this.value = typeof n === 'function' ? n(this.value) : n;
      },
    }).current,
  useDerivedValue: (fn) => ({ value: fn() }),
  useAnimatedProps: (fn) => {
    try {
      return fn();
    } catch {
      return {};
    }
  },
  useAnimatedStyle: (fn) => {
    try {
      return fn();
    } catch {
      return {};
    }
  },
  withTiming: (v) => v,
  withDelay: (_d, v) => v,
  withRepeat: (v) => v,
  withSequence: (...vs) => vs[vs.length - 1],
  cancelAnimation: () => {},
  interpolate: (x, input, output) => {
    if (x <= input[0]) return output[0];
    for (let i = 1; i < input.length; i++) {
      if (x <= input[i]) return output[i - 1] + ((x - input[i - 1]) / (input[i] - input[i - 1])) * (output[i] - output[i - 1]);
    }
    return output[output.length - 1];
  },
  useReducedMotion: () => true,
  Easing: { bezier: () => ease, out: () => ease, in: () => ease, inOut: () => ease, cubic: ease, sin: ease, linear: ease },
};
