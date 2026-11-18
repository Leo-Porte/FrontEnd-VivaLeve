/** Motor de sons ambiente (web): sons sintetizados na hora com Web Audio, sem arquivos de áudio. */
import type { MotorSom } from './sonsEngine';

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let branco: AudioBuffer | null = null;
let marrom: AudioBuffer | null = null;
let atual: { nodes: AudioNode[]; timers: ReturnType<typeof setTimeout>[]; bus: GainNode; ativo: boolean } | null = null;

function contexto(volume: number): Ctx | null {
  if (ctx) return ctx;
  const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext });
  const Ctor = AC.AudioContext ?? AC.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  const n = ctx.sampleRate * 4;
  branco = ctx.createBuffer(1, n, ctx.sampleRate);
  marrom = ctx.createBuffer(1, n, ctx.sampleRate);
  const b = branco.getChannelData(0);
  const m = marrom.getChannelData(0);
  let ultimo = 0;
  for (let i = 0; i < n; i++) {
    const r = Math.random() * 2 - 1;
    b[i] = r;
    ultimo = (ultimo + 0.02 * r) / 1.02;
    m[i] = ultimo * 3.5;
  }
  return ctx;
}

function fonte(c: Ctx, buf: AudioBuffer, nodes: AudioNode[]) {
  const s = c.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.start();
  nodes.push(s);
  return s;
}

function lfo(c: Ctx, freq: number, profundidade: number, alvo: AudioParam, nodes: AudioNode[]) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = freq;
  g.gain.value = profundidade;
  o.connect(g).connect(alvo);
  o.start();
  nodes.push(o, g);
}

function repetir(fn: () => void, minMs: number, maxMs: number, som: NonNullable<typeof atual>) {
  const passo = () => {
    if (!som.ativo) return;
    fn();
    som.timers.push(setTimeout(passo, minMs + Math.random() * (maxMs - minMs)));
  };
  som.timers.push(setTimeout(passo, minMs));
}

function montar(c: Ctx, id: string): NonNullable<typeof atual> {
  const bus = c.createGain();
  bus.gain.value = 0;
  bus.connect(master!);
  const nodes: AudioNode[] = [bus];
  const som = { nodes, timers: [] as ReturnType<typeof setTimeout>[], bus, ativo: true };

  const filtro = (tipo: BiquadFilterType, f: number, q = 0.7) => {
    const x = c.createBiquadFilter();
    x.type = tipo;
    x.frequency.value = f;
    x.Q.value = q;
    nodes.push(x);
    return x;
  };
  const ganho = (v: number) => {
    const g = c.createGain();
    g.gain.value = v;
    nodes.push(g);
    return g;
  };

  if (id === 'chuva') {
    fonte(c, branco!, nodes).connect(filtro('highpass', 900)).connect(filtro('lowpass', 7000)).connect(ganho(0.35)).connect(bus);
  } else if (id === 'mar') {
    const g = ganho(0.5);
    fonte(c, marrom!, nodes).connect(filtro('lowpass', 700)).connect(g).connect(bus);
    lfo(c, 0.12, 0.35, g.gain, nodes);
  } else if (id === 'vento') {
    const f = filtro('bandpass', 600, 0.8);
    const g = ganho(0.5);
    fonte(c, branco!, nodes).connect(f).connect(g).connect(bus);
    lfo(c, 0.08, 300, f.frequency, nodes);
    lfo(c, 0.1, 0.25, g.gain, nodes);
  } else if (id === 'fogueira') {
    fonte(c, marrom!, nodes).connect(filtro('lowpass', 350)).connect(ganho(0.3)).connect(bus);
    repetir(() => {
      const s = c.createBufferSource();
      s.buffer = branco!;
      const f = filtro('bandpass', 1500 + Math.random() * 3000, 2);
      const g = c.createGain();
      g.gain.setValueAtTime(0.25 + Math.random() * 0.3, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05 + Math.random() * 0.08);
      s.connect(f).connect(g).connect(bus);
      s.start(c.currentTime, Math.random() * 3, 0.15);
    }, 120, 700, som);
  } else if (id === 'tigelas') {
    repetir(() => {
      const base = [196, 220, 261.6, 293.7][Math.floor(Math.random() * 4)];
      [1, 2.76, 5.4].forEach((r, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.frequency.value = base * r;
        g.gain.setValueAtTime(0, c.currentTime);
        g.gain.linearRampToValueAtTime(0.18 / (i + 1), c.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0005, c.currentTime + 7);
        o.connect(g).connect(bus);
        o.start();
        o.stop(c.currentTime + 7.2);
      });
    }, 3500, 7000, som);
  }

  bus.gain.linearRampToValueAtTime(1, c.currentTime + 1.2);
  return som;
}

function encerrar(som: NonNullable<typeof atual>) {
  som.ativo = false;
  som.timers.forEach(clearTimeout);
  const c = ctx;
  if (!c) return;
  som.bus.gain.cancelScheduledValues(c.currentTime);
  som.bus.gain.setValueAtTime(som.bus.gain.value, c.currentTime);
  som.bus.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);
  setTimeout(() => {
    som.nodes.forEach((n) => {
      try {
        (n as AudioScheduledSourceNode).stop?.();
      } catch {}
      try {
        n.disconnect();
      } catch {}
    });
  }, 800);
}

export const motorSom: MotorSom = {
  suportado: typeof window !== 'undefined' && Boolean((window as unknown as { AudioContext?: unknown }).AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext),
  tocar(id, volume) {
    const c = contexto(volume);
    if (!c) return;
    if (c.state === 'suspended') void c.resume();
    if (atual) encerrar(atual);
    master!.gain.value = volume;
    atual = montar(c, id);
  },
  parar() {
    if (atual) encerrar(atual);
    atual = null;
  },
  definirVolume(v) {
    if (master && ctx) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
  },
};
