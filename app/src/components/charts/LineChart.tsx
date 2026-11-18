import React, { useEffect, useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text as RNText, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { fontFor } from '@/theme/core';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface LinePoint {
  label: string;
  value: number;
  /** texto de acessibilidade/detalhe (ex.: "3 registros") */
  detail?: string;
}

export interface LineChartProps {
  data: LinePoint[];
  height?: number;
  min?: number;
  max?: number;
  /** rótulos do eixo Y (valor inteiro -> texto curto) */
  yLabels?: Record<number, string>;
  color: string;
  gridColor: string;
  textColor: string;
  /** cor do miolo dos pontos (superfície) */
  pointFill?: string;
  testID?: string;
}

const PAD = { top: 12, right: 16, bottom: 26, left: 56 };

/** Curva suave (Catmull-Rom -> Bézier) por todos os pontos. */
function caminho(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.2 / 1.5;
    const c1x = p1.x + (p2.x - p0.x) * t;
    const c1y = p1.y + (p2.y - p0.y) * t;
    const c2x = p2.x - (p3.x - p1.x) * t;
    const c2y = p2.y - (p3.y - p1.y) * t;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function Ponto({ x, y, fill, stroke, progress, i, n }: { x: number; y: number; fill: string; stroke: string; progress: { value: number }; i: number; n: number }) {
  const props = useAnimatedProps(() => {
    const aparece = n <= 1 ? 1 : Math.min(1, Math.max(0, (progress.value * n - i) / 1));
    return { r: 4 * aparece };
  });
  return <AnimatedCircle cx={x} cy={y} fill={fill} stroke={stroke} strokeWidth={2} animatedProps={props} />;
}

export function LineChart({ data, height = 220, min = 0, max = 5, yLabels, color, gridColor, textColor, pointFill, testID }: LineChartProps) {
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const { pts, d, comprimento, ticks } = useMemo(() => {
    const w = Math.max(0, width - PAD.left - PAD.right);
    const h = height - PAD.top - PAD.bottom;
    const n = data.length;
    const ps = data.map((p, i) => ({
      x: PAD.left + (n === 1 ? w / 2 : (i / (n - 1)) * w),
      y: PAD.top + h - ((p.value - min) / (max - min)) * h,
    }));
    const dd = caminho(ps);
    let len = 0;
    for (let i = 1; i < ps.length; i++) len += Math.hypot(ps[i].x - ps[i - 1].x, ps[i].y - ps[i - 1].y);
    const tk: { v: number; y: number }[] = [];
    for (let v = Math.ceil(min); v <= max; v++) tk.push({ v, y: PAD.top + h - ((v - min) / (max - min)) * h });
    return { pts: ps, d: dd, comprimento: len * 1.25 + 20, ticks: tk };
  }, [data, width, height, min, max]);

  const chave = data.map((p) => p.value).join(',');
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [chave, progress]);

  const linhaProps = useAnimatedProps(() => ({ strokeDashoffset: comprimento * (1 - progress.value) }));

  const resumoA11y = data.map((p) => `${p.label}: ${p.value.toFixed(1)}${p.detail ? `, ${p.detail}` : ''}`).join('; ');

  return (
    <View onLayout={onLayout} style={{ width: '100%', height }} testID={testID} accessibilityRole="image" accessibilityLabel={`Gráfico de evolução do humor. ${resumoA11y}`}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {ticks.map((t) => (
            <React.Fragment key={t.v}>
              <Line x1={PAD.left} x2={width - PAD.right} y1={t.y} y2={t.y} stroke={gridColor} strokeWidth={StyleSheet.hairlineWidth} />
              <SvgText x={PAD.left - 8} y={t.y + 4} fontSize={11} fontFamily={fontFor("body", "500")} fill={textColor} color={textColor} textAnchor="end">
                {yLabels?.[t.v] ?? String(t.v)}
              </SvgText>
            </React.Fragment>
          ))}
          <AnimatedPath
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${comprimento} ${comprimento}`}
            animatedProps={linhaProps}
          />
          {/* só o último ponto fica marcado; o resto é leitura de linha */}
          {pts.length > 0 ? (
            <Ponto x={pts[pts.length - 1].x} y={pts[pts.length - 1].y} fill={pointFill ?? color} stroke={color} progress={progress} i={pts.length - 1} n={pts.length} />
          ) : null}
          {data.map((p, i) => {
            // rótulos do eixo X: evita sobreposição mostrando no máx. ~6
            const passo = Math.ceil(data.length / 6);
            if (i % passo !== 0 && i !== data.length - 1) return null;
            return (
              <SvgText key={p.label + i} x={pts[i].x} y={height - 8} fontSize={11} fontFamily={fontFor("body", "500")} fill={textColor} color={textColor} textAnchor="middle">
                {p.label}
              </SvgText>
            );
          })}
        </Svg>
      )}
      <RNText style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>{resumoA11y}</RNText>
    </View>
  );
}
