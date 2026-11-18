import { useRef, useState } from 'react';
import { PanResponder, Pressable, View, type LayoutChangeEvent } from 'react-native';

import { useSons } from '@/controllers/useSons';
import { Icon, ListRow, ListSection, Text, iconeDe } from '@/components/ui';
import { useTheme } from '@/theme';

function Volume({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  const { colors, radius } = useTheme();
  const largura = useRef(1);
  const [, setL] = useState(0);
  const aplicar = useRef(onChange);
  aplicar.current = onChange;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => aplicar.current(Math.min(1, Math.max(0, e.nativeEvent.locationX / largura.current))),
      onPanResponderMove: (e) => aplicar.current(Math.min(1, Math.max(0, e.nativeEvent.locationX / largura.current))),
    }),
  ).current;
  const onLayout = (e: LayoutChangeEvent) => {
    largura.current = e.nativeEvent.layout.width || 1;
    setL(largura.current);
  };
  const pct = Math.round(valor * 100);
  return (
    <View
      testID="sons-volume"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Volume"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const d = e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1;
        onChange(Math.min(1, Math.max(0, valor + d)));
      }}
      onLayout={onLayout}
      style={{ flex: 1, height: 44, justifyContent: 'center' }}
      {...pan.panHandlers}
    >
      <View style={{ height: 4, borderRadius: radius.xs, backgroundColor: colors.surfaceAlt }}>
        <View style={{ width: `${pct}%`, height: '100%', borderRadius: radius.xs, backgroundColor: colors.primary }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: `${pct}%`,
          marginLeft: -12,
          width: 24,
          height: 24,
          borderRadius: 12, // slop:ok pilula alça do controle deslizante é circular, como no iOS
          backgroundColor: colors.surface,
          borderWidth: 0.5,
          borderColor: colors.border,
        }}
      />
    </View>
  );
}

/** Sons ambiente como grupo de lista (padrão Ajustes): uma linha por som, linha de volume no fim. */
export function SonsPanel({ testID = 'sons-panel' }: { testID?: string }) {
  const { colors, spacing } = useTheme();
  const { sons, suportado, tocando, volume, alternar, parar, definirVolume } = useSons();

  if (!suportado) {
    return (
      <ListSection header="Sons" testID={testID}>
        <ListRow title="Sons ambiente indisponíveis neste dispositivo" />
      </ListSection>
    );
  }

  const atual = sons.find((s) => s.id === tocando);
  return (
    <ListSection header="Sons" footer={atual ? `Tocando: ${atual.nome}` : 'Toque em um som para tocar; toque de novo para pausar.'} testID={testID}>
      {sons.map((s) => {
        const ativo = tocando === s.id;
        return (
          <ListRow
            key={s.id}
            testID={`som-${s.id}`}
            icon={iconeDe(s.id, 'musica')}
            title={s.nome}
            subtitle={s.desc}
            onPress={() => alternar(s.id)}
            chevron={false}
            accessibilityLabel={`${s.nome}. ${s.desc}. ${ativo ? 'Tocando, toque para pausar' : 'Toque para tocar'}`}
            right={<Icon name={ativo ? 'pausar' : 'tocar'} size={18} color={ativo ? colors.primary : colors.textMuted} />}
          />
        );
      })}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, minHeight: 52 }}>
        <View style={{ width: 28, alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Icon name="musica" size={20} color={colors.textMuted} />
        </View>
        <Volume valor={volume} onChange={definirVolume} />
        <Pressable
          testID="sons-parar"
          onPress={parar}
          disabled={!tocando}
          accessibilityRole="button"
          accessibilityState={{ disabled: !tocando }}
          style={{ minHeight: 44, minWidth: 56, alignItems: 'flex-end', justifyContent: 'center', opacity: tocando ? 1 : 0.4 }}
        >
          <Text variant="label" tone="primary">Parar</Text>
        </Pressable>
      </View>
    </ListSection>
  );
}
