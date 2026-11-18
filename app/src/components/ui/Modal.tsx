import { MotiView } from 'moti';
import React from 'react';
import { Modal as RNModal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';

import { SurfaceProvider, useTheme } from '@/theme';
import { Button } from './Button';
import { Faixa, useSombraGrupo } from './Faixa';
import { timing, useReduceMotion } from './motion';
import { Text } from './Text';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  /** área de botões embaixo */
  footer?: React.ReactNode;
}

/** Diálogo centralizado, fecha tocando fora ou no botão voltar. Título numa faixa sálvia, como os grupos da Home. */
export function Modal({ visible, onClose, title, children, footer }: ModalProps) {
  const { colors, radius, spacing } = useTheme();
  const reduce = useReduceMotion();
  const { height } = useWindowDimensions();
  const sombra = useSombraGrupo();
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: spacing.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <MotiView
          from={reduce ? undefined : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={timing(200)}
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 440,
            maxHeight: height * 0.85,
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            borderCurve: 'continuous',
            overflow: 'hidden',
            // slop:ok sombra mesmo padrão dos grupos com faixa sálvia
            boxShadow: sombra,
          }}
        >
          {title ? <Faixa titulo={title} /> : null}
          <SurfaceProvider value={colors.surface}>
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: title ? spacing.md : spacing.lg, paddingBottom: spacing.lg - 4, gap: spacing.md, flexShrink: 1 }}>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} contentContainerStyle={{ gap: spacing.sm }}>
                {children}
              </ScrollView>
              {footer ? <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, flexWrap: 'wrap' }}>{footer}</View> : null}
            </View>
          </SurfaceProvider>
        </MotiView>
      </View>
    </RNModal>
  );
}

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** ação destrutiva: botão de confirmar fica vermelho */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmTestID?: string;
  cancelTestID?: string;
}

export function ConfirmDialog({
  visible, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', destructive, loading, onConfirm, onCancel, confirmTestID, cancelTestID,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button label={cancelLabel} variant="ghost" onPress={onCancel} disabled={loading} testID={cancelTestID} />
          <Button label={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} loading={loading} testID={confirmTestID} />
        </>
      }
    >
      {message ? <Text tone="muted">{message}</Text> : null}
    </Modal>
  );
}
