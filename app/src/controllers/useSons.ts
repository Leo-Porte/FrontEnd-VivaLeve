import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { SONS } from '@/entities/catalogo';

import { motorSom } from './sonsEngine';

const CHAVE = 'pluma_som_ambiente';

/**
 * Estado dos sons ambiente. O som tocando vive no motor (singleton), então continua ao trocar de tela;
 * a preferência (qual som + volume) fica em AsyncStorage.
 */
let tocandoGlobal: string | null = null;
let volumeGlobal = 0.6;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

function salvar() {
  AsyncStorage.setItem(CHAVE, JSON.stringify({ id: tocandoGlobal, volume: volumeGlobal })).catch(() => {});
}

export function useSons() {
  const [, forcar] = useState(0);

  useEffect(() => {
    const f = () => forcar((n) => n + 1);
    ouvintes.add(f);
    // lê o volume salvo (não retoma sozinho: navegadores bloqueiam áudio sem toque do usuário)
    AsyncStorage.getItem(CHAVE)
      .then((v) => {
        if (!v) return;
        const { volume } = JSON.parse(v) as { volume?: number };
        if (typeof volume === 'number' && !tocandoGlobal) {
          volumeGlobal = Math.min(1, Math.max(0, volume));
          avisar();
        }
      })
      .catch(() => {});
    return () => {
      ouvintes.delete(f);
    };
  }, []);

  const alternar = useCallback((id: string) => {
    if (tocandoGlobal === id) {
      motorSom.parar();
      tocandoGlobal = null;
    } else {
      motorSom.tocar(id, volumeGlobal);
      tocandoGlobal = id;
    }
    salvar();
    avisar();
  }, []);

  const parar = useCallback(() => {
    motorSom.parar();
    tocandoGlobal = null;
    salvar();
    avisar();
  }, []);

  const definirVolume = useCallback((v: number) => {
    volumeGlobal = Math.min(1, Math.max(0, v));
    motorSom.definirVolume(volumeGlobal);
    salvar();
    avisar();
  }, []);

  return {
    sons: SONS,
    suportado: motorSom.suportado,
    tocando: tocandoGlobal,
    volume: volumeGlobal,
    alternar,
    parar,
    definirVolume,
  };
}
