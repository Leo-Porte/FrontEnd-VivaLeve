import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { Group, Mesh } from 'three';
import { SafeCanvas, useReduceMotion } from './SafeCanvas';

type Props = {
  /** Cor principal do orbe (hex). */
  color?: string;
  /** Cor secundária das partículas (hex). */
  accent?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const PARTICULAS = [
  { p: [1.7, 0.9, -0.5], s: 0.12, f: 0.8 },
  { p: [-1.6, 0.4, 0.2], s: 0.09, f: 1.1 },
  { p: [1.2, -1.1, 0.4], s: 0.1, f: 0.6 },
  { p: [-1.1, -1.0, -0.4], s: 0.07, f: 1.3 },
  { p: [0.2, 1.6, -0.3], s: 0.08, f: 0.9 },
] as const;

function Orbe({ color, accent, animar }: { color: string; accent: string; animar: boolean }) {
  const grupo = useRef<Group>(null);
  const orbe = useRef<Mesh>(null);
  const parts = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!animar) return;
    const t = clock.getElapsedTime();
    if (grupo.current) grupo.current.position.y = Math.sin(t * 0.8) * 0.12;
    if (orbe.current) {
      orbe.current.rotation.y = t * 0.15;
      orbe.current.scale.setScalar(1 + Math.sin(t * 0.6) * 0.03);
    }
    parts.current?.children.forEach((m, i) => {
      const d = PARTICULAS[i];
      m.position.y = d.p[1] + Math.sin(t * d.f + i) * 0.15;
    });
  });

  return (
    <group ref={grupo}>
      <mesh ref={orbe}>
        <icosahedronGeometry args={[1.1, 4]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.05} />
      </mesh>
      <group ref={parts}>
        {PARTICULAS.map((d, i) => (
          <mesh key={i} position={[d.p[0], d.p[1], d.p[2]]}>
            <sphereGeometry args={[d.s, 16, 16]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function HeroScene({ color = '#7c9cff', accent = '#ffd6a5', size = 220, style }: Props) {
  const reduce = useReduceMotion();
  return (
    <SafeCanvas
      style={[{ width: size, height: size }, style]}
      still={reduce}
      testID="hero-scene"
      fallback={
        <View
          style={{ flex: 1, borderRadius: size, backgroundColor: color, opacity: 0.85, margin: size * 0.15 }}
        />
      }
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <pointLight position={[-3, -2, 2]} intensity={0.8} color={accent} />
      <Orbe color={color} accent={accent} animar={!reduce} />
    </SafeCanvas>
  );
}
