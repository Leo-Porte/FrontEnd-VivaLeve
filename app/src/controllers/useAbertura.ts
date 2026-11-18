import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { useReduceMotion } from '@/components/ui';

import { CHAVE_ABERTURA, deveMostrar } from './abertura';

export { CHAVE_ABERTURA, deveMostrar };

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type EstadoAbertura = 'decidindo' | 'tocando' | 'fim';

/**
 * - 'decidindo': lendo o armazenamento (a Home fica escondida para não piscar);
 * - 'tocando': a abertura está na tela;
 * - 'fim': Home normal.
 * Quem pediu menos movimento no sistema nunca vê a abertura.
 * `forcar` (ex.: abrir `/?abertura=1`) toca de novo mesmo se já foi vista hoje — útil para testar.
 */
export function useAbertura(forcar = false) {
  const reduce = useReduceMotion();
  const [estado, setEstado] = useState<EstadoAbertura>(reduce ? 'fim' : 'decidindo');
  /** muda a cada repetição, para remontar a animação do começo */
  const [rodada, setRodada] = useState(0);

  useEffect(() => {
    if (reduce) {
      setEstado('fim');
      return;
    }
    let vivo = true;
    AsyncStorage.getItem(CHAVE_ABERTURA)
      .then((vista) => {
        if (!vivo) return;
        const hoje = hojeISO();
        if (forcar || deveMostrar(vista, hoje)) {
          setEstado('tocando');
          AsyncStorage.setItem(CHAVE_ABERTURA, hoje).catch(() => {});
        } else {
          setEstado('fim');
        }
      })
      .catch(() => vivo && setEstado('fim'));
    return () => {
      vivo = false;
    };
  }, [reduce, forcar]);

  const terminar = useCallback(() => setEstado('fim'), []);
  const repetir = useCallback(() => {
    if (reduce) return;
    setRodada((r) => r + 1);
    setEstado('tocando');
  }, [reduce]);

  return { estado, rodada, terminar, repetir };
}
