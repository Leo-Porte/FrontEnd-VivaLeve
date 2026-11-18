/**
 * Motor de sons ambiente — nativo (iOS/Android): loops WAV de assets/sons (gerados por scripts/gerar-sons.js,
 * porta da síntese do legado) tocados com expo-audio. A versão web (sonsEngine.web.ts) sintetiza com Web Audio.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export interface MotorSom {
  suportado: boolean;
  tocar(id: string, volume: number): void;
  parar(): void;
  definirVolume(v: number): void;
}

const ARQUIVOS: Record<string, number> = {
  chuva: require('../../assets/sons/chuva.wav'),
  mar: require('../../assets/sons/mar.wav'),
  vento: require('../../assets/sons/vento.wav'),
  fogueira: require('../../assets/sons/fogueira.wav'),
  tigelas: require('../../assets/sons/tigelas.wav'),
};

let player: AudioPlayer | null = null;
let modoDefinido = false;

function liberar() {
  if (!player) return;
  try {
    player.pause();
    player.remove();
  } catch {
    /* já liberado */
  }
  player = null;
}

export const motorSom: MotorSom = {
  suportado: true,
  tocar(id, volume) {
    const fonte = ARQUIVOS[id];
    if (!fonte) return;
    liberar();
    if (!modoDefinido) {
      modoDefinido = true;
      setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
    }
    try {
      player = createAudioPlayer(fonte);
      player.loop = true;
      player.volume = volume;
      player.play();
    } catch {
      player = null;
    }
  },
  parar: liberar,
  definirVolume(v) {
    if (player) player.volume = v;
  },
};
