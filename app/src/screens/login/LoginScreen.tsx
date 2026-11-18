import { ChevronLeft, Feather } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, Text, useReduceMotion, useScreenLayout } from '@/components/ui';
import { timing } from '@/components/ui/motion';
import { useLoginController } from '@/controllers/useLoginController';
import { SurfaceProvider, cenaLogin, radius, spacing, useTheme } from '@/theme';

import { CarrosselLogin } from './CarrosselLogin';
import { CenaLogin } from './CenaLogin';
import { FormularioLogin } from './FormularioLogin';

/** Ícone + nome do app. */
function Marca({ onLayout }: { onLayout?: (largura: number) => void }) {
  const { scheme } = useTheme();
  return (
    <View
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 2,
        alignSelf: 'flex-start',
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: cenaLogin.colinaEscura.light,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather size={20} color={cenaLogin.sobreColina} strokeWidth={2} />
      </View>
      <Text variant="title" color={cenaLogin.titulo[scheme]}>
        Pluma
      </Text>
    </View>
  );
}

/**
 * Computador (expanded): cena com o carrossel à esquerda e o formulário à direita; na divisa, o verde da
 * cena se dissolve dentro do painel do login.
 */
function LoginLargo() {
  const c = useLoginController();
  const { colors, scheme } = useTheme();
  const fundo = cenaLogin.fundo[scheme];
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.surface }}>
      <CenaLogin tamanho="grande" style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingVertical: spacing.xxl,
            paddingHorizontal: spacing.xxl + spacing.md,
          }}
        >
          <Marca />
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              paddingBottom: 240,
              maxWidth: 560,
            }}
          >
            <CarrosselLogin setas altura={300} />
          </View>
        </View>
      </CenaLogin>

      <SurfaceProvider value={colors.surface}>
        <View
          style={{
            width: 480,
            justifyContent: 'center',
            paddingHorizontal: spacing.xl,
          }}
        >
          {/* divisa suave: o fundo da cena continua por 120 px dentro do painel e some, com leve desfoque */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: -6,
              width: 126,
              // slop:ok gradiente transição pedida entre a cena e o painel do login; não é fundo de conteúdo
              backgroundImage: `linear-gradient(to right, ${fundo} 0%, ${fundo}99 40%, ${fundo}00 100%)`,
              filter: 'blur(6px)',
            }}
          />
          <ScrollView
            style={{ zIndex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              paddingVertical: spacing.xxl,
            }}
          >
            <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center' }}>
              <FormularioLogin c={c} />
            </View>
          </ScrollView>
        </View>
      </SurfaceProvider>
    </View>
  );
}

const DURACAO = 800;

/**
 * Telefone e tablet: abertura com a cena em tela cheia e os botões imersos na colina. Ao tocar num deles,
 * os botões sobem e somem, a cena sai por cima, o painel do formulário sobe e toma a tela, e a marca
 * desliza do canto para o centro. "Voltar" desfaz na ordem inversa.
 */
function LoginCompacto() {
  const c = useLoginController();
  const { colors, scheme } = useTheme();
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const [tela, setTela] = useState<'inicio' | 'form'>('inicio');
  const [dim, setDim] = useState({ w: 0, h: 0 });
  const [larguraMarca, setLarguraMarca] = useState(0);
  const noForm = tela === 'form';
  const t = (ms: number, atraso?: number) => timing(reduce ? 0 : ms, reduce ? 0 : atraso);

  const abrir = (modo: 'entrar' | 'cadastrar') => {
    c.definirModo(modo);
    setTela('form');
  };

  const topoMarca = insets.top + (noForm ? 44 : 20);
  const esquerdaMarca = noForm && dim.w > 0 ? (dim.w - larguraMarca) / 2 : spacing.lg;
  const escondido = (oculto: boolean) => ({
    pointerEvents: (oculto ? 'none' : 'auto') as 'none' | 'auto',
    accessibilityElementsHidden: oculto,
    importantForAccessibility: (oculto ? 'no-hide-descendants' : 'auto') as 'no-hide-descendants' | 'auto',
    ...(Platform.OS === 'web' ? { 'aria-hidden': oculto } : null),
  });

  return (
    <View
      style={{ flex: 1, overflow: 'hidden', backgroundColor: colors.surface }}
      onLayout={(e) =>
        setDim({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }
    >
      {/* cena em tela cheia */}
      <MotiView
        {...escondido(noForm)}
        animate={{
          opacity: noForm ? 0 : 1,
          translateY: noForm ? -dim.h * 0.14 : 0,
          scale: noForm ? 1.04 : 1,
        }}
        transition={t(DURACAO)}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <CenaLogin tamanho="compacta" style={{ flex: 1 }}>
          <View
            style={{
              position: 'absolute',
              top: insets.top + 100,
              left: spacing.lg,
              right: spacing.lg,
            }}
          >
            <CarrosselLogin ativo={!noForm} altura={230} />
          </View>
        </CenaLogin>
      </MotiView>

      {/* botões imersos na colina escura */}
      <MotiView
        {...escondido(noForm)}
        animate={{ translateY: noForm ? -320 : 0, opacity: noForm ? 0 : 1 }}
        transition={t(650)}
        style={{
          position: 'absolute',
          left: spacing.lg,
          right: spacing.lg,
          bottom: insets.bottom + 40,
          gap: spacing.sm + 4,
        }}
      >
        <SurfaceProvider value={cenaLogin.colinaEscura[scheme]}>
          <PressableScale
            onPress={() => abrir('entrar')}
            accessibilityRole="button"
            testID="login-abrir-entrar"
            style={{
              minHeight: 54,
              borderRadius: radius.md,
              backgroundColor: cenaLogin.sobreColina,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SurfaceProvider value={cenaLogin.sobreColina}>
              <Text variant="subtitle" color={cenaLogin.textoBotaoClaro}>
                Entrar
              </Text>
            </SurfaceProvider>
          </PressableScale>
          <PressableScale
            onPress={() => abrir('cadastrar')}
            accessibilityRole="button"
            testID="login-abrir-cadastrar"
            style={{
              minHeight: 54,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: cenaLogin.sobreColina,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="subtitle" color={cenaLogin.sobreColina}>
              Criar conta
            </Text>
          </PressableScale>
        </SurfaceProvider>
      </MotiView>

      {/* painel do formulário */}
      <MotiView
        {...escondido(!noForm)}
        animate={{ translateY: noForm ? 0 : dim.h || 2000 }}
        transition={t(DURACAO, noForm ? 80 : 0)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.surface,
        }}
      >
        <SurfaceProvider value={colors.surface}>
          <Pressable
            onPress={() => setTela('inicio')}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            testID="login-voltar"
            style={({ pressed }) => ({
              position: 'absolute',
              zIndex: 2,
              top: insets.top + 42,
              left: spacing.sm + 4,
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.55 : 1,
            })}
          >
            <ChevronLeft size={24} color={colors.text} strokeWidth={2} />
          </Pressable>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingTop: insets.top + 120,
              paddingBottom: insets.bottom + spacing.xl,
              paddingHorizontal: spacing.lg,
            }}
          >
            <MotiView
              // sem `key`/remontagem: o botão oficial do Google fica preso ao nó em que foi desenhado
              animate={{ opacity: noForm ? 1 : 0, translateY: noForm || reduce ? 0 : 16 }}
              transition={t(550, noForm ? 320 : 0)}
              style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}
            >
              <FormularioLogin c={c} centralizado />
            </MotiView>
          </ScrollView>
        </SurfaceProvider>
      </MotiView>

      {/* marca: no canto na abertura, centralizada acima do formulário depois */}
      <MotiView
        pointerEvents="none"
        animate={{
          translateX: esquerdaMarca,
          translateY: topoMarca,
          scale: noForm ? 1.12 : 1,
        }}
        transition={t(DURACAO + 100)}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 3 }}
      >
        <Marca onLayout={setLarguraMarca} />
      </MotiView>
    </View>
  );
}

export function LoginScreen() {
  const { isExpanded } = useScreenLayout();
  return isExpanded ? <LoginLargo /> : <LoginCompacto />;
}
