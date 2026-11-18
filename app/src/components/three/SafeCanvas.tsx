import { Canvas } from '@react-three/fiber';
import { Component, type ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

/** Em RN o Metro resolve '@react-three/fiber' para a build native (expo-gl); na web, para a DOM. */

export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => vivo && setReduce(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      vivo = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

function webglDisponivel(): boolean {
  if (Platform.OS !== 'web') return true;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

class Limite extends Component<{ fallback: ReactNode; children: ReactNode }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  componentDidCatch() {}
  render() {
    return this.state.erro ? this.props.fallback : this.props.children;
  }
}

type Props = {
  children: ReactNode;
  /** Mostrado se o GL falhar ou não existir. */
  fallback: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Quando true, renderiza um quadro só (reduce motion). */
  still?: boolean;
  testID?: string;
};

export function SafeCanvas({ children, fallback, style, still, testID }: Props) {
  const [ok] = useState(webglDisponivel);
  return (
    <View style={style} testID={testID} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {ok ? (
        <Limite fallback={fallback}>
          <Canvas
            frameloop={still ? 'demand' : 'always'}
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true }}
            camera={{ position: [0, 0, 5], fov: 40 }}
            style={{ flex: 1, backgroundColor: 'transparent' }}
          >
            {children}
          </Canvas>
        </Limite>
      ) : (
        fallback
      )}
    </View>
  );
}
