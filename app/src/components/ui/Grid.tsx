import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { type Responsive, resolve } from '@/theme';
import { useScreenLayout } from './useScreenLayout';

export interface GridProps {
  children: React.ReactNode;
  /** número de colunas por breakpoint (ex.: { compact: 2, medium: 3, expanded: 4 }) */
  columns: Responsive<number>;
  /** espaço entre itens (padrão: gap do breakpoint) */
  gap?: number;
  /** itens da mesma linha com a mesma altura (padrão true) */
  equalHeight?: boolean;
  /** a última linha incompleta se estica para ocupar a largura toda (padrão true; evita card órfão) */
  completarUltimaLinha?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export interface GridItemProps {
  children: React.ReactNode;
  /** quantas colunas o item ocupa (padrão 1). Valor maior que as colunas vira linha inteira. */
  span?: Responsive<number>;
  style?: StyleProp<ViewStyle>;
}

/** Item com span. Fora de um Grid, é só uma View. */
export function GridItem({ children, style }: GridItemProps) {
  return <View style={style}>{children}</View>;
}

/**
 * Grade de colunas de largura IGUAL (percentual + calha), sem depender da largura do conteúdo.
 * Cada filho ocupa 1 coluna, ou `span` colunas se for <GridItem span={...}>.
 * Com equalHeight, o filho direto é esticado para a altura da linha (use Card sem altura fixa).
 */
export function Grid({ children, columns, gap: gapProp, equalHeight = true, completarUltimaLinha = true, style, testID }: GridProps) {
  const { bp, gap: gapBp } = useScreenLayout();
  const cols = Math.max(1, resolve(columns, bp));
  const gap = gapProp ?? gapBp;
  const itens = React.Children.toArray(children).filter(Boolean) as React.ReactElement[];

  const spans = itens.map((child) =>
    Math.min(cols, Math.max(1, child.type === GridItem ? resolve((child.props as GridItemProps).span ?? 1, bp) : 1)),
  );
  // largura final de cada item, em frações de coluna (a última linha pode ser esticada)
  const larguras = [...spans];
  if (completarUltimaLinha && cols > 1) {
    let inicioLinha = 0;
    let usado = 0;
    spans.forEach((sp, i) => {
      if (usado + sp > cols) {
        inicioLinha = i;
        usado = 0;
      }
      usado += sp;
    });
    if (usado < cols) for (let i = inicioLinha; i < spans.length; i++) larguras[i] = (spans[i] * cols) / usado;
  }

  return (
    <View
      testID={testID}
      style={[{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2, rowGap: gap }, style]}
    >
      {itens.map((child, i) => {
        const isItem = child.type === GridItem;
        const span = larguras[i];
        const conteudo = isItem ? (child.props as GridItemProps).children : child;
        const extra = isItem ? (child.props as GridItemProps).style : undefined;
        return (
          <View
            key={child.key ?? i}
            style={[
              { width: `${(span / cols) * 100}%`, paddingHorizontal: gap / 2 },
              equalHeight && { alignSelf: 'stretch' },
              extra,
            ]}
          >
            {equalHeight ? <View style={{ flex: 1 }}>{conteudo}</View> : conteudo}
          </View>
        );
      })}
    </View>
  );
}
