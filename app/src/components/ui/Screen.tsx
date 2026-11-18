import React from 'react';
import { RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTENT_MAX, SurfaceProvider, useTheme, type ContentWidth } from '@/theme';
import { useNavChrome } from './navChrome';
import { useScreenLayout } from './useScreenLayout';

export interface ScreenProps {
  children: React.ReactNode;
  /** rolagem vertical (padrão true) */
  scroll?: boolean;
  /** largura do container: 'wide' 1120 (padrão), 'regular' 880, 'narrow' 720 — ver theme/layout.ts */
  width?: ContentWidth;
  /** largura máxima em px (sobrescreve `width`; evite, prefira `width`) */
  maxWidth?: number;
  /** padding interno (padrão true) */
  padded?: boolean;
  /** pull-to-refresh */
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Container de tela: fundo do tema, safe area superior, conteúdo centralizado com largura máxima. */
export function Screen({ children, scroll = true, width = 'wide', maxWidth, padded = true, refreshing, onRefresh, contentStyle }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const { gutter, gap } = useScreenLayout();
  const insets = useSafeAreaInsets();
  const { espacoInferior } = useNavChrome();
  const inner: StyleProp<ViewStyle> = [
    { width: '100%', maxWidth: maxWidth ?? CONTENT_MAX[width], alignSelf: 'center' },
    padded && { paddingHorizontal: gutter, paddingTop: gutter, gap: gap + 4 },
    contentStyle,
  ];
  return (
    <SurfaceProvider value={colors.bg}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.xl + espacoInferior }}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
          >
            <View style={inner}>{children}</View>
          </ScrollView>
        ) : (
          <View style={[{ flex: 1, paddingBottom: espacoInferior }, inner]}>{children}</View>
        )}
      </View>
    </SurfaceProvider>
  );
}
