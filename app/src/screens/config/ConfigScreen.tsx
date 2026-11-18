import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { SonsPanel } from '@/components/sons';
import { ConfirmDialog, FadeIn, Grid, Icon, ListRow, ListSection, Screen, Text } from '@/components/ui';
import { abrirLink } from '@/controllers/abrirLink';
import { useConfigController } from '@/controllers/useConfigController';
import { POLITICA_PRIVACIDADE_URL } from '@/entities/catalogo';
import { useTheme } from '@/theme';

export function ConfigScreen() {
  const c = useConfigController();
  const router = useRouter();
  const { spacing, colors } = useTheme();

  const check = (ativo: boolean) => (ativo ? <Icon name="ok" size={20} color={colors.primary} strokeWidth={2.4} /> : <View style={{ width: 20 }} />);

  return (
    <Screen width="regular">
      <FadeIn>
        <Text variant="display">Ajustes</Text>
      </FadeIn>

      <ListSection header="Conta" testID="config-conta">
        <ListRow
          icon="usuario"
          title={c.usuario?.name || c.usuario?.email || '—'}
          subtitle={c.usuario?.name ? c.usuario.email : undefined}
          testID="config-usuario"
        />
      </ListSection>

      <ListSection header="Aparência" footer="Reduza a luminosidade com o modo escuro.">
        <ListRow icon="sol" title="Claro" right={check(c.preferenciaTema === 'light')} onPress={() => c.trocarTema('light')} chevron={false} testID="config-tema-claro" />
        <ListRow icon="escuro" title="Escuro" right={check(c.preferenciaTema === 'dark')} onPress={() => c.trocarTema('dark')} chevron={false} testID="config-tema-escuro" />
        <ListRow icon="sistema" title="Sistema" right={check(c.preferenciaTema === 'system')} onPress={() => c.trocarTema('system')} chevron={false} testID="config-tema-sistema" />
      </ListSection>

      <SonsPanel testID="config-sons" />

      <Grid columns={{ compact: 1, medium: 1, expanded: 1 }}>
        <ListSection header="Suporte">
          <ListRow icon="chat" title="Chat de apoio" subtitle="Converse com a Pluma" onPress={() => router.navigate('/chat')} testID="config-link-chat" />
          <ListRow icon="ideia" title="Central de ajuda" subtitle="Perguntas frequentes" value="Em breve" />
          <ListRow icon="coracao" title="Enviar feedback" subtitle="Ajude-nos a melhorar" value="Em breve" />
        </ListSection>
      </Grid>

      <View style={{ gap: spacing.sm }}>
        <ListSection header="Seus dados" footer="Apaga registros de humor, diário, respiração e conversas.">
          <ListRow
            title="Apagar todos os registros"
            tone="danger"
            onPress={c.apagando ? undefined : c.pedirApagar}
            chevron={false}
            testID="config-apagar"
          />
        </ListSection>
        {c.apagando ? <Text tone="muted" variant="caption" testID="config-apagando">Apagando...</Text> : null}
        {c.aviso ? (
          <Text
            tone={c.aviso.tipo === 'erro' ? 'danger' : 'primary'}
            accessibilityRole="alert"
            testID="config-aviso"
          >
            {c.aviso.texto}
          </Text>
        ) : null}
      </View>

      <ListSection
        header="Sobre"
        footer="A Pluma é uma ferramenta de apoio e não substitui acompanhamento profissional."
      >
        <ListRow title="Versão" value="1.0.0" />
        <ListRow title="Termos de uso" value="Em breve" testID="config-termos" />
        <ListRow title="Privacidade" onPress={() => abrirLink(POLITICA_PRIVACIDADE_URL)} testID="config-privacidade" />
      </ListSection>

      <ListSection>
        <ListRow title="Sair da conta" tone="danger" onPress={c.sairDaConta} chevron={false} testID="config-sair" />
      </ListSection>

      <ConfirmDialog
        visible={c.confirmando === 1}
        title="Apagar tudo?"
        message="Apagar TODOS os seus registros de humor, diário, respiração e conversas com a Pluma? Esta ação não pode ser desfeita."
        confirmLabel="Continuar"
        destructive
        confirmTestID="confirm-ok"
        cancelTestID="confirm-cancelar"
        onConfirm={c.confirmarApagar}
        onCancel={c.cancelarApagar}
      />
      <ConfirmDialog
        visible={c.confirmando === 2}
        title="Última confirmação"
        message="Apagar tudo mesmo?"
        confirmLabel="Apagar tudo"
        destructive
        loading={c.apagando}
        confirmTestID="confirm-ok"
        cancelTestID="confirm-cancelar"
        onConfirm={c.confirmarApagar}
        onCancel={c.cancelarApagar}
      />
    </Screen>
  );
}
