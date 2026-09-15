import { tocarSom } from './Sintetizador.js';

/**
 * Faixas escritas como texto, compasso a compasso, em colcheias:
 *   'C5 - E5 . G5 - - .'  →  nota, "-" segura a nota anterior, "." é pausa
 * Bateria: k = bumbo, s = caixa, h = chimbal.  Acordes: um por compasso.
 */

const BATERIA = {
  k: [{ onda: 'sine', freq: 150, ate: 42, duracao: 0.16, volume: 0.5 }],
  s: [
    { onda: 'ruido', duracao: 0.12, volume: 0.16, filtro: 'bandpass', corte: 1900, q: 0.9 },
    { onda: 'triangle', freq: 190, ate: 120, duracao: 0.08, volume: 0.12 },
  ],
  h: [{ onda: 'ruido', duracao: 0.035, volume: 0.07, filtro: 'highpass', corte: 7000 }],
};

const separarCompassos = (texto) => texto.split('|').map((c) => c.trim().split(/\s+/));

/**
 * Transforma a faixa em eventos por passo (função pura, testável).
 * @returns {{ duracaoPasso: number, passos: number, eventos: Array<Array<object>> }}
 */
export function compilarFaixa(faixa) {
  const duracaoPasso = 60 / faixa.bpm / 2;
  const passos = faixa.compassos * 8;
  const eventos = Array.from({ length: passos }, () => []);

  for (const trilha of faixa.trilhas) {
    if (trilha.tipo === 'acordes') {
      trilha.acordes.forEach((acorde, compasso) => {
        for (const nota of acorde.split(' ')) {
          eventos[compasso * 8].push({ ...trilha.som, freq: nota, duracao: duracaoPasso * 8 * 0.98, sustentar: true });
        }
      });
      continue;
    }
    const tokens = separarCompassos(trilha.notas).flat();
    if (tokens.length !== passos) throw new Error(`Trilha "${trilha.nome}" tem ${tokens.length} passos; a faixa tem ${passos}.`);
    tokens.forEach((token, passo) => {
      if (token === '.' || token === '-') return;
      if (trilha.tipo === 'bateria') {
        for (const letra of token) eventos[passo].push(...BATERIA[letra].map((som) => ({ ...som, volume: som.volume * (trilha.volume ?? 1) })));
        return;
      }
      let tamanho = 1;
      while (tokens[passo + tamanho] === '-') tamanho++;
      eventos[passo].push({ ...trilha.som, freq: token, duracao: duracaoPasso * tamanho * 0.92, sustentar: true });
    });
  }
  return { duracaoPasso, passos, eventos };
}

/** Toca uma faixa em loop, agendando as notas um pouco à frente do relógio do áudio */
export class Musica {
  constructor(ctx, destino) {
    this.ctx = ctx;
    this.destino = destino;
    this.atual = null;
  }

  tocar(nome, faixa) {
    if (this.atual?.nome === nome) return;
    this.parar();
    const saida = this.ctx.createGain();
    saida.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    saida.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 1.2);
    saida.connect(this.destino);
    this.atual = { nome, saida, compilada: compilarFaixa(faixa), passo: 0, proximo: this.ctx.currentTime + 0.1 };
    this.relogio = setInterval(() => this.agendar(), 30);
  }

  agendar() {
    const faixa = this.atual;
    if (!faixa) return;
    const { duracaoPasso, passos, eventos } = faixa.compilada;
    const agora = this.ctx.currentTime;
    // Aba escondida ou áudio pausado: recomeça do relógio atual em vez de tocar tudo atrasado de uma vez
    if (faixa.proximo < agora - 0.25) faixa.proximo = agora + 0.05;
    while (faixa.proximo < agora + 0.15) {
      for (const nota of eventos[faixa.passo]) tocarSom(this.ctx, faixa.saida, nota, faixa.proximo);
      faixa.passo = (faixa.passo + 1) % passos;
      faixa.proximo += duracaoPasso;
    }
  }

  parar() {
    clearInterval(this.relogio);
    if (!this.atual) return;
    const { saida } = this.atual;
    const agora = this.ctx.currentTime;
    saida.gain.cancelScheduledValues(agora);
    saida.gain.setValueAtTime(saida.gain.value, agora);
    saida.gain.linearRampToValueAtTime(0.0001, agora + 0.6);
    setTimeout(() => saida.disconnect(), 900);
    this.atual = null;
  }
}
