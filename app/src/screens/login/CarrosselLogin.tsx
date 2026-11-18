import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text, useReduceMotion } from '@/components/ui';
import { timing } from '@/components/ui/motion';
import { cenaLogin, spacing, useTheme } from '@/theme';

/** O que a Pluma oferece, um slide por recurso (texto das descrições das telas). */
const SLIDES = [
  {
    sobre: 'Um dia de cada vez',
    titulo: 'Um lugar leve para entender o que você sente.',
    apoio: 'Humor, diário, respiração e conversa num só espaço, pra você se acompanhar sem pressão.',
  },
  {
    sobre: 'Humor',
    titulo: 'Registre como você está em poucos toques.',
    apoio: 'Marque o humor do dia e veja, semana a semana, o que mexe com você.',
  },
  {
    sobre: 'Diário',
    titulo: 'Escreva sem filtro.',
    apoio: 'Um diário emocional para soltar pensamentos e reflexões sempre que precisar.',
  },
  {
    sobre: 'Respirar',
    titulo: 'Respire quando o dia apertar.',
    apoio: 'Técnicas guiadas de respiração para relaxar e lidar com a ansiedade.',
  },
  {
    sobre: 'Conversa e histórico',
    titulo: 'Converse e veja sua evolução.',
    apoio: 'Um assistente de apoio emocional pra conversar, e gráficos que mostram sua caminhada.',
  },
] as const;

const INTERVALO = 6000;

export interface CarrosselLoginProps {
  /** false pausa a troca automática (ex.: formulário aberto por cima) */
  ativo?: boolean;
  /** setas de anterior/próximo (computador) */
  setas?: boolean;
  /** altura da área dos slides */
  altura: number;
}

export function CarrosselLogin({ ativo = true, setas, altura }: CarrosselLoginProps) {
  const { scheme } = useTheme();
  const reduce = useReduceMotion();
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const toqueX = useRef<number | null>(null);
  const total = SLIDES.length;
  const irPara = (i: number) => setAtual(((i % total) + total) % total);

  useEffect(() => {
    if (!ativo || pausado) return;
    const t = setInterval(() => setAtual((s) => (s + 1) % total), INTERVALO);
    return () => clearInterval(t);
  }, [ativo, pausado, total]);

  const destaque = cenaLogin.destaque[scheme];

  const seta = (dir: 'anterior' | 'proximo') => {
    const Icone = dir === 'anterior' ? ChevronLeft : ChevronRight;
    return (
      <Pressable
        onPress={() => irPara(atual + (dir === 'anterior' ? -1 : 1))}
        accessibilityRole="button"
        accessibilityLabel={dir === 'anterior' ? 'Slide anterior' : 'Próximo slide'}
        testID={`login-carrossel-${dir}`}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 1.5,
          borderColor: destaque,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.55 : 1,
        })}
      >
        <Icone size={18} color={destaque} strokeWidth={2} />
      </Pressable>
    );
  };

  return (
    <View
      accessibilityLabel="O que a Pluma oferece"
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => setPausado(false)}
      onTouchStart={(e) => {
        toqueX.current = e.nativeEvent.pageX;
      }}
      onTouchEnd={(e) => {
        if (toqueX.current == null) return;
        const d = e.nativeEvent.pageX - toqueX.current;
        if (Math.abs(d) > 40) irPara(atual + (d < 0 ? 1 : -1));
        toqueX.current = null;
      }}
      style={{ gap: spacing.lg }}
      testID="login-carrossel"
    >
      <View style={{ height: altura }}>
        {SLIDES.map((s, i) => {
          const visivel = i === atual;
          return (
            <MotiView
              key={s.sobre}
              animate={{
                opacity: visivel ? 1 : 0,
                translateY: visivel || reduce ? 0 : 14,
              }}
              transition={timing(reduce ? 0 : 700)}
              pointerEvents={visivel ? 'auto' : 'none'}
              accessibilityElementsHidden={!visivel}
              aria-hidden={!visivel}
              importantForAccessibility={visivel ? 'auto' : 'no-hide-descendants'}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                gap: spacing.sm + 4,
              }}
            >
              <Text
                variant="caption"
                color={destaque}
                style={{
                  fontWeight: '600',
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                }}
              >
                {s.sobre}
              </Text>
              <Text variant="display" color={cenaLogin.titulo[scheme]}>
                {s.titulo}
              </Text>
              <Text color={cenaLogin.apoio[scheme]}>{s.apoio}</Text>
            </MotiView>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {setas ? seta('anterior') : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: setas ? 0 : -spacing.sm - 2,
          }}
        >
          {SLIDES.map((s, i) => (
            <Pressable
              key={s.sobre}
              onPress={() => irPara(i)}
              accessibilityRole="button"
              accessibilityLabel={`Ir para o slide ${i + 1}`}
              accessibilityState={{ selected: i === atual }}
              style={{
                minWidth: 32,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MotiView
                animate={{
                  width: i === atual ? 26 : 8,
                  backgroundColor: i === atual ? destaque : cenaLogin.pontoInativo[scheme],
                }}
                transition={timing(reduce ? 0 : 400)}
                style={{ height: 8, borderRadius: 4 }}
              />
            </Pressable>
          ))}
        </View>
        {setas ? seta('proximo') : null}
      </View>
    </View>
  );
}
