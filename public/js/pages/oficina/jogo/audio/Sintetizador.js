// Sons sintetizados na hora com Web Audio, no estilo dos jogos 8-bit.
// Nada de arquivos: cada som é descrito por forma de onda, frequência (com
// deslize), envelope e, se quiser, ruído passando por um filtro.

const buffersDeRuido = new WeakMap();

function bufferDeRuido(ctx) {
  if (!buffersDeRuido.has(ctx)) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const dados = buffer.getChannelData(0);
    for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
    buffersDeRuido.set(ctx, buffer);
  }
  return buffersDeRuido.get(ctx);
}

const SEMITONS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'A4' → 440 Hz; aceita sustenido (#) e bemol (b) */
export function frequenciaDaNota(nome) {
  const partes = /^([A-G])([#b]?)(-?\d)$/.exec(nome);
  if (!partes) throw new Error(`Nota inválida: ${nome}`);
  const [, letra, acidente, oitava] = partes;
  const midi = (Number(oitava) + 1) * 12 + SEMITONS[letra] + (acidente === '#' ? 1 : acidente === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

const emHertz = (valor, tom = 0) => (typeof valor === 'string' ? frequenciaDaNota(valor) : valor) * 2 ** (tom / 12);

/**
 * Agenda um som.
 * n: { onda: 'square'|'triangle'|'sine'|'sawtooth'|'ruido', freq, ate, duracao, ataque, volume,
 *      sustentar, atraso, filtro: 'lowpass'|'highpass'|'bandpass', corte, corteAte, q }
 * `sustentar` mantém o volume e só solta no fim (bipes, notas longas);
 * sem ele o som decai logo depois do ataque (cliques, pancadas).
 */
export function tocarSom(ctx, destino, n, inicio = ctx.currentTime, { tom = 0 } = {}) {
  const t0 = inicio + (n.atraso || 0);
  const duracao = n.duracao ?? 0.1;
  const ataque = Math.min(n.ataque ?? 0.004, duracao / 2);
  const volume = Math.max(0.0002, n.volume ?? 0.2);
  const fim = t0 + duracao;

  const ganho = ctx.createGain();
  ganho.gain.setValueAtTime(0.0001, t0);
  ganho.gain.linearRampToValueAtTime(volume, t0 + ataque);
  if (n.sustentar) {
    ganho.gain.setValueAtTime(volume, Math.max(t0 + ataque, fim - 0.03));
    ganho.gain.linearRampToValueAtTime(0.0001, fim);
  } else {
    ganho.gain.exponentialRampToValueAtTime(0.0001, fim);
  }

  let saida = ganho;
  if (n.filtro) {
    const filtro = ctx.createBiquadFilter();
    filtro.type = n.filtro;
    filtro.Q.value = n.q ?? 1;
    filtro.frequency.setValueAtTime(n.corte ?? 1000, t0);
    if (n.corteAte) filtro.frequency.exponentialRampToValueAtTime(n.corteAte, fim);
    ganho.connect(filtro);
    saida = filtro;
  }
  saida.connect(destino);

  let fonte;
  if (n.onda === 'ruido') {
    fonte = ctx.createBufferSource();
    fonte.buffer = bufferDeRuido(ctx);
    fonte.loop = true;
    fonte.playbackRate.value = 2 ** (tom / 12);
  } else {
    fonte = ctx.createOscillator();
    fonte.type = n.onda || 'square';
    fonte.frequency.setValueAtTime(emHertz(n.freq ?? 440, tom), t0);
    if (n.ate) fonte.frequency.exponentialRampToValueAtTime(emHertz(n.ate, tom), fim);
  }
  fonte.connect(ganho);
  fonte.start(t0);
  fonte.stop(fim + 0.02);
  fonte.onended = () => saida.disconnect();
}

/**
 * Som contínuo (ventoinha, apertar o tubo de pasta): ruído filtrado cuja
 * intensidade (0 a 1) muda o volume e o "brilho" do som.
 */
export class SomContinuo {
  constructor(ctx, destino, { volume = 0.15, corteMinimo = 200, corteMaximo = 2400, filtro = 'lowpass', q = 0.7 } = {}) {
    this.ctx = ctx;
    this.config = { volume, corteMinimo, corteMaximo };
    this.fonte = ctx.createBufferSource();
    this.fonte.buffer = bufferDeRuido(ctx);
    this.fonte.loop = true;
    this.filtro = ctx.createBiquadFilter();
    this.filtro.type = filtro;
    this.filtro.Q.value = q;
    this.ganho = ctx.createGain();
    this.ganho.gain.value = 0.0001;
    this.fonte.connect(this.filtro).connect(this.ganho).connect(destino);
    this.fonte.start();
  }

  intensidade(valor, segundos = 0.3) {
    const { volume, corteMinimo, corteMaximo } = this.config;
    const v = Math.min(1, Math.max(0, valor));
    const agora = this.ctx.currentTime;
    this.ganho.gain.setTargetAtTime(Math.max(0.0001, volume * v), agora, segundos / 3);
    this.filtro.frequency.setTargetAtTime(corteMinimo + (corteMaximo - corteMinimo) * v, agora, segundos / 3);
    return this;
  }

  parar(segundos = 0.25) {
    const agora = this.ctx.currentTime;
    this.ganho.gain.setTargetAtTime(0.0001, agora, segundos / 3);
    this.fonte.stop(agora + segundos + 0.05);
    this.fonte.onended = () => this.ganho.disconnect();
  }
}
