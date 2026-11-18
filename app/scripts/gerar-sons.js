/**
 * Gera os 5 loops ambiente (WAV mono 22,05 kHz) portando a síntese de js/sons.js.
 * Uso: node scripts/gerar-sons.js   -> assets/sons/*.wav
 * Os loops fecham sem emenda: ruído com crossfade e LFOs com número inteiro de ciclos.
 */
const fs = require('fs');
const path = require('path');

const SR = 22050;
const DUR = 12; // segundos
const N = SR * DUR;
const XF = SR * 1.5; // crossfade
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

const branco = (n) => Float32Array.from({ length: n }, () => rnd() * 2 - 1);
function marrom(n) {
  const o = new Float32Array(n);
  let u = 0;
  for (let i = 0; i < n; i++) {
    const w = rnd() * 2 - 1;
    u = (u + 0.02 * w) / 1.02;
    o[i] = u * 3.5;
  }
  return o;
}
// biquad (RBJ)
function biquad(x, tipo, f, q = 0.707) {
  const w = (2 * Math.PI * f) / SR, c = Math.cos(w), a = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  if (tipo === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  else if (tipo === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  else { b0 = a; b1 = 0; b2 = -a; } // bp
  const o = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y; o[i] = y;
  }
  return o;
}
// ruído longo (N+XF) -> loop sem emenda de tamanho N
function loopar(x) {
  const o = new Float32Array(N);
  for (let i = 0; i < N; i++) o[i] = x[i];
  for (let i = 0; i < XF; i++) {
    const w = i / XF;
    o[i] = x[i] * w + x[N + i] * (1 - w);
  }
  return o;
}
const longo = (fn) => loopar(fn(N + XF));
const lfo = (ciclos, i) => Math.sin((2 * Math.PI * ciclos * i) / N);
const somar = (...arr) => { const o = new Float32Array(N); arr.forEach((a) => { for (let i = 0; i < N; i++) o[i] += a[i]; }); return o; };
const gan = (x, g) => x.map((v) => v * g);
// evento circular com envelope exponencial
function evento(buf, t0, amostras, pico, dur, ataque = 0.003) {
  const ini = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  for (let k = 0; k < len; k++) {
    const t = k / SR;
    const env = t < ataque ? t / ataque : Math.exp(-(t - ataque) * (6 / dur));
    buf[(ini + k) % N] += amostras(k, t) * env * pico;
  }
}

const sons = {
  chuva() {
    const a = gan(loopar(biquad(biquad(branco(N + XF), 'hp', 700), 'lp', 7500)), 0.34);
    const b = gan(loopar(biquad(branco(N + XF), 'bp', 2800, 0.6)), 0.1);
    const g = new Float32Array(N);
    for (let t = 0.1; t < DUR; t += 0.06 + rnd() * 0.2) {
      const f = 1800 + rnd() * 3200;
      evento(g, t, (k, tt) => Math.sin(2 * Math.PI * f * tt), 0, 0.05, 0.004);
      evento(g, t, (k, tt) => Math.sin(2 * Math.PI * f * tt), 0.035, 0.05, 0.004);
    }
    return somar(a, b, g);
  },
  mar() {
    const base = longo((n) => biquad(marrom(n), 'lp', 450));
    const esp = loopar(biquad(branco(N + XF), 'hp', 2500));
    const o = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const l2 = 0.5 + 0.5 * lfo(2, i - N / 8);
      o[i] = base[i] * (0.18 + 0.7 * l2) * 0.9 + esp[i] * 0.05 * l2 * l2;
    }
    return o;
  },
  vento() {
    const x = longo((n) => biquad(branco(n), 'bp', 480, 0.9));
    const s = longo((n) => biquad(branco(n), 'bp', 1100, 6));
    const o = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      o[i] = x[i] * (0.35 + 0.3 * lfo(1, i)) * 1.6 + s[i] * 0.12 * (0.6 + 0.4 * lfo(1, i + N / 3));
    }
    return o;
  },
  fogueira() {
    const base = gan(longo((n) => biquad(marrom(n), 'lp', 260)), 0.45);
    const e = new Float32Array(N);
    const estalo = (t, forte) => {
      const f = 1400 + rnd() * 3600;
      const ruido = branco(SR);
      const filtrado = biquad(ruido, 'bp', f, 1.2);
      const pico = (forte ? 0.7 : 0.25) * (0.5 + rnd() * 0.5);
      evento(e, t, (k) => filtrado[k % SR], pico, 0.015 + rnd() * (forte ? 0.07 : 0.03), 0.002);
    };
    for (let t = 0.05; t < DUR; t += 0.05 + rnd() * 0.37) { estalo(t, false); if (rnd() < 0.25) estalo(t + 0.03 + rnd() * 0.06, false); }
    for (let t = 0.7; t < DUR; t += 0.7 + rnd() * 1.9) estalo(t, true);
    return somar(base, e);
  },
  tigelas() {
    const o = new Float32Array(N);
    [110, 164.81, 220, 277.18].forEach((f, i) => {
      const c = 1 + i; // ciclos inteiros de modulação
      const fi = Math.round(f * DUR) / DUR; // frequência com ciclos inteiros no loop
      for (let k = 0; k < N; k++) o[k] += Math.sin((2 * Math.PI * fi * k) / SR) * 0.045 * (1 + 0.6 * lfo(c, k)) * 0.8;
    });
    const notas = [220, 261.63, 293.66, 329.63, 392];
    [1.0, 6.5].forEach((t) => {
      const base = notas[Math.floor(rnd() * notas.length)];
      [[1, 0.22, 7], [2.76, 0.09, 4], [5.4, 0.04, 2.5]].forEach(([r, p, d]) => {
        evento(o, t, (k, tt) => Math.sin(2 * Math.PI * base * r * tt), p, d, 0.015);
      });
    });
    return o;
  },
};

function escreverWav(arquivo, x) {
  let pico = 0;
  for (const v of x) pico = Math.max(pico, Math.abs(v));
  const g = 0.85 / (pico || 1);
  const buf = Buffer.alloc(44 + x.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + x.length * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i] * g)) * 32767), 44 + i * 2);
  fs.writeFileSync(arquivo, buf);
}

const saida = path.join(__dirname, '..', 'assets', 'sons');
fs.mkdirSync(saida, { recursive: true });
for (const [nome, fn] of Object.entries(sons)) {
  escreverWav(path.join(saida, `${nome}.wav`), fn());
  console.log('ok', nome);
}
