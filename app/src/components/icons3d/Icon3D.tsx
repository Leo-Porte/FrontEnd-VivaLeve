import { Image } from 'expo-image';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

const ICONES = {
  coracao: require('../../../assets/icons3d/coracao.png'),
  lua: require('../../../assets/icons3d/lua.png'),
  sol: require('../../../assets/icons3d/sol.png'),
  diario: require('../../../assets/icons3d/diario.png'),
  grafico: require('../../../assets/icons3d/grafico.png'),
  chat: require('../../../assets/icons3d/chat.png'),
  config: require('../../../assets/icons3d/config.png'),
  folha: require('../../../assets/icons3d/folha.png'),
  telefone: require('../../../assets/icons3d/telefone.png'),
  estrela: require('../../../assets/icons3d/estrela.png'),
  fogo: require('../../../assets/icons3d/fogo.png'),
  musica: require('../../../assets/icons3d/musica.png'),
  trofeu: require('../../../assets/icons3d/trofeu.png'),
  vela: require('../../../assets/icons3d/vela.png'),
  cha: require('../../../assets/icons3d/cha.png'),
  ideia: require('../../../assets/icons3d/ideia.png'),
  escudo: require('../../../assets/icons3d/escudo.png'),
  sino: require('../../../assets/icons3d/sino.png'),
  lapis: require('../../../assets/icons3d/lapis.png'),
} as const;

export type Icon3DName = keyof typeof ICONES;
export const icon3DNames = Object.keys(ICONES) as Icon3DName[];

type Props = {
  name: Icon3DName;
  size?: number;
  /** Desliga a flutuação (listas longas, por exemplo). */
  still?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

export function Icon3D({ name, size = 48, still = false, accessibilityLabel, testID }: Props) {
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

  const fonte = ICONES[name];
  const img = fonte ? (
    <Image
      source={fonte}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    />
  ) : null;
  if (!fonte) return null; // nome inválido: não renderiza, não quebra
  if (still || reduce) return <MotiView testID={testID}>{img}</MotiView>;
  return (
    <MotiView
      testID={testID}
      from={{ translateY: 0 }}
      animate={{ translateY: -Math.max(2, size * 0.06) }}
      transition={{ translateY: { type: 'timing', duration: 2600, loop: true, repeatReverse: true } }}
    >
      {img}
    </MotiView>
  );
}
