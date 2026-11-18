import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { SurfaceProvider, ensureContrast, useTheme } from '@/theme';
import { Faixa, useSombraGrupo } from './Faixa';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './motion';
import { Text } from './Text';

/**
 * Lista agrupada no padrão dos apps Ajustes/Saúde do iOS:
 * cabeçalho curto acima do grupo, grupo com cantos de 12, linhas com divisória fina recuada,
 * rodapé opcional com explicação. É o "corpo" padrão das telas (ver docs/VISUAL.md).
 */
export interface ListSectionProps {
  /** cabeçalho do grupo (curto, sem ponto final) */
  header?: string;
  /** ação à direita do cabeçalho */
  action?: { label: string; onPress: () => void; testID?: string };
  /** texto de apoio abaixo do grupo */
  footer?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /**
   * Faixa sálvia no cabeçalho (padrão de todos os grupos com título, vindo da Home). Ligada por padrão
   * quando há `header` ou `action`; `destaque={false}` volta ao cabeçalho cinza acima do grupo.
   */
  destaque?: boolean;
}

/**
 * Grupo do app: cantos de 12, sombra suave e, com título, a faixa sálvia que se dissolve no grupo.
 * Sem título, é só o grupo (ex.: ação destrutiva solta no fim da tela).
 */
export function ListSection({ header, action, footer, children, style, testID, destaque }: ListSectionProps) {
  const { colors, radius, spacing } = useTheme();
  const sombra = useSombraGrupo();
  const linhas = React.Children.toArray(children).filter(Boolean);
  const titulo = !!(header || action);
  const comFaixa = titulo && destaque !== false;
  return (
    <View style={[{ gap: 6 }, style]} testID={testID}>
      {titulo && !comFaixa ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: spacing.md }}>
          {header ? (
            <Text variant="caption" tone="muted" accessibilityRole="header" style={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
              {header}
            </Text>
          ) : <View />}
          {action ? (
            <PressableScale onPress={action.onPress} accessibilityRole="button" accessibilityLabel={action.label} testID={action.testID} style={{ minHeight: 32, justifyContent: 'flex-end' }}>
              <Text variant="caption" tone="primary" style={{ fontWeight: '600' }}>{action.label}</Text>
            </PressableScale>
          ) : null}
        </View>
      ) : null}
      {/* camada de fora leva a sombra; a de dentro recorta os cantos (no iOS overflow hidden cortaria a sombra) */}
      <View
        style={{
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          backgroundColor: colors.surface,
          // slop:ok sombra pedido de produto: grupos com sombra suave (padrão da Home)
          boxShadow: sombra,
        }}
      >
        <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.surface }}>
          {comFaixa ? <Faixa titulo={header ?? ''} action={action} /> : null}
          {/* com faixa, o topo do conteúdo fica sobre o resto do degradê: auto-contraste mede contra a mistura mais forte */}
          <SurfaceProvider value={comFaixa ? colors.primarySoft : colors.surface}>
            <View style={comFaixa ? { paddingTop: spacing.xs } : undefined}>
              {linhas.map((linha, i) => (
                <SeparadorCtx.Provider key={i} value={i < linhas.length - 1}>
                  {linha}
                </SeparadorCtx.Provider>
              ))}
            </View>
          </SurfaceProvider>
        </View>
      </View>
      {footer ? <Text variant="caption" tone="muted" style={{ paddingHorizontal: spacing.md }}>{footer}</Text> : null}
    </View>
  );
}

const SeparadorCtx = React.createContext(false);

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** ícone à esquerda (glifo na cor de destaque, sem fundo) */
  icon?: IconName;
  /** cor do ícone (padrão: destaque). Use só cor com papel (emoção, perigo). */
  iconColor?: string;
  /** elemento livre à esquerda (substitui `icon`) */
  left?: React.ReactNode;
  /** valor curto à direita, em cinza (ex.: "Bem", "2 min") */
  value?: string;
  /** elemento livre à direita (substitui `value`) */
  right?: React.ReactNode;
  onPress?: () => void;
  /** seta de navegação (padrão: true quando há onPress) */
  chevron?: boolean;
  /** título na cor de destaque, como ação ("Ligar 188") */
  tone?: 'default' | 'primary' | 'danger';
  numberOfLines?: number;
  accessibilityLabel?: string;
  testID?: string;
}

export function ListRow({
  title, subtitle, icon, iconColor, left, value, right, onPress, chevron, tone = 'default', numberOfLines = 2, accessibilityLabel, testID,
}: ListRowProps) {
  const { colors, spacing } = useTheme();
  const comSeparador = React.useContext(SeparadorCtx);
  const temEsquerda = !!(left || icon);
  const corTitulo = tone === 'primary' ? colors.primary : tone === 'danger' ? colors.danger : colors.text;
  const mostrarSeta = chevron ?? !!onPress;

  const conteudo = (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingLeft: spacing.md }}>
      {temEsquerda ? (
        <View style={{ width: 28, marginRight: 12, alignItems: 'center' }}>
          {left ?? <Icon name={icon!} size={21} color={ensureContrast(iconColor ?? colors.primary, colors.surface, 3)} strokeWidth={1.9} />}
        </View>
      ) : null}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 48,
          paddingVertical: subtitle ? 10 : 12,
          paddingRight: spacing.md,
          gap: spacing.sm,
          borderBottomWidth: comSeparador ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: colors.separator,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text color={corTitulo} numberOfLines={numberOfLines}>{title}</Text>
          {subtitle ? <Text variant="caption" tone="muted" numberOfLines={numberOfLines}>{subtitle}</Text> : null}
        </View>
        {right ?? (value ? <Text tone="muted" numberOfLines={1}>{value}</Text> : null)}
        {mostrarSeta ? <ChevronRight size={18} color={colors.border} strokeWidth={2.2} /> : null}
      </View>
    </View>
  );

  if (!onPress) return <View testID={testID}>{conteudo}</View>;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} testID={testID}>
      {conteudo}
    </PressableScale>
  );
}
