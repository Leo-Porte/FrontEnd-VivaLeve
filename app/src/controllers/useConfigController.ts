import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { api, mensagemErro } from '@/infrastructure';
import type { ApiError, User } from '@/models';
import { useTheme } from '@/theme';
import type { ThemePreference } from '@/theme';

import { useSession } from './useSession';

export function useConfigController() {
  const router = useRouter();
  const { usuario: usuarioSessao, sair } = useSession();
  const { preference, setPreference, scheme } = useTheme();

  const [usuario, setUsuario] = useState<User | null>(usuarioSessao);
  const [confirmando, setConfirmando] = useState<0 | 1 | 2>(0);
  const [apagando, setApagando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    api.usuarios
      .eu()
      .then((u) => vivo && setUsuario(u))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const trocarTema = useCallback((p: ThemePreference) => setPreference(p), [setPreference]);

  const sairDaConta = useCallback(async () => {
    await sair();
    router.replace('/login');
  }, [sair, router]);

  /** Dois passos, como no legado: pergunta e "última confirmação". */
  const pedirApagar = useCallback(() => {
    setAviso(null);
    setConfirmando(1);
  }, []);
  const cancelarApagar = useCallback(() => setConfirmando(0), []);

  const apagarTudo = useCallback(async () => {
    setApagando(true);
    try {
      const [humor, diario, conversas] = await Promise.all([
        api.humor.todos(),
        api.diario.listar(),
        api.ia.conversas(),
      ]);
      const passos: (() => Promise<unknown>)[] = [
        ...(humor ?? []).map((r) => () => api.humor.apagar(r.id)),
        ...(diario ?? []).map((r) => () => api.diario.apagar(r.id)),
        ...(conversas ?? []).map((r) => () => api.ia.apagarConversa(r.id)),
        () => api.respiracao.apagarTodas(),
      ];
      // um de cada vez, para não sobrecarregar o servidor grátis
      for (const passo of passos) {
        try {
          await passo();
        } catch (e) {
          if ((e as ApiError).status !== 404) throw e;
        }
      }
      setAviso({ tipo: 'ok', texto: 'Seus registros foram apagados.' });
    } catch (e) {
      if ((e as ApiError).semLogin) {
        router.replace('/login');
        return;
      }
      setAviso({ tipo: 'erro', texto: `Não foi possível apagar tudo: ${mensagemErro(e)}` });
    } finally {
      setApagando(false);
      setConfirmando(0);
    }
  }, [router]);

  const confirmarApagar = useCallback(() => {
    if (confirmando === 1) setConfirmando(2);
    else if (confirmando === 2) void apagarTudo();
  }, [confirmando, apagarTudo]);

  return {
    usuario, scheme, preferenciaTema: preference, trocarTema,
    sairDaConta,
    confirmando, pedirApagar, cancelarApagar, confirmarApagar, apagando, aviso,
  };
}
