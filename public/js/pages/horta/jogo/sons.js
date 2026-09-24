// Efeitos sonoros do Robô na Horta, sintetizados com o mesmo motor 8-bit da
// Oficina (sem arquivos de áudio). O contexto de áudio só nasce no primeiro
// clique, como os navegadores exigem.

import { tocarSom } from '../../oficina/jogo/audio/Sintetizador.js';
import { armazenamentoLocal } from '../../../core/SafeStorage.js';

const EFEITOS = {
  clique: [{ onda: 'square', freq: 1400, ate: 1000, duracao: 0.035, volume: 0.06 }],
  encaixar: [{ onda: 'triangle', freq: 520, ate: 780, duracao: 0.07, volume: 0.14 }],
  tirar: [{ onda: 'triangle', freq: 500, ate: 220, duracao: 0.1, volume: 0.13 }],
  andar: [{ onda: 'ruido', duracao: 0.06, volume: 0.06, filtro: 'bandpass', corte: 700, q: 2 }],
  virar: [{ onda: 'square', freq: 330, ate: 440, duracao: 0.05, volume: 0.05 }],
  pergunta: [{ onda: 'triangle', freq: 880, ate: 1320, duracao: 0.07, volume: 0.07 }],
  sim: [{ onda: 'triangle', freq: 'E6', duracao: 0.08, volume: 0.08 }],
  nao: [{ onda: 'triangle', freq: 'A4', duracao: 0.08, volume: 0.08 }],
  colher: [
    { onda: 'square', freq: 300, ate: 900, duracao: 0.06, volume: 0.09 },
    { onda: 'triangle', freq: 'C6', duracao: 0.1, volume: 0.1, atraso: 0.05 },
  ],
  plantar: [
    { onda: 'ruido', duracao: 0.1, volume: 0.12, filtro: 'lowpass', corte: 900 },
    { onda: 'triangle', freq: 'G5', duracao: 0.08, volume: 0.08, atraso: 0.08 },
  ],
  regar: [{ onda: 'ruido', duracao: 0.28, volume: 0.1, filtro: 'bandpass', corte: 2600, corteAte: 1200, q: 1.5 }],
  moeda: [
    { onda: 'square', freq: 'B5', duracao: 0.07, volume: 0.08, sustentar: true },
    { onda: 'square', freq: 'E6', duracao: 0.25, volume: 0.08, atraso: 0.07 },
  ],
  bater: [
    { onda: 'ruido', duracao: 0.18, volume: 0.25, filtro: 'lowpass', corte: 1200, corteAte: 200 },
    { onda: 'square', freq: 160, ate: 60, duracao: 0.22, volume: 0.12 },
  ],
  errar: [
    { onda: 'square', freq: 247, duracao: 0.08, volume: 0.08, sustentar: true },
    { onda: 'square', freq: 196, duracao: 0.16, volume: 0.08, sustentar: true, atraso: 0.09 },
  ],
  hortaOk: [
    { onda: 'square', freq: 'G5', duracao: 0.08, volume: 0.07, sustentar: true },
    { onda: 'square', freq: 'C6', duracao: 0.18, volume: 0.07, atraso: 0.09 },
  ],
  sucesso: [
    { onda: 'square', freq: 'C5', duracao: 0.09, volume: 0.08, sustentar: true },
    { onda: 'square', freq: 'E5', duracao: 0.09, volume: 0.08, sustentar: true, atraso: 0.1 },
    { onda: 'square', freq: 'G5', duracao: 0.09, volume: 0.08, sustentar: true, atraso: 0.2 },
    { onda: 'square', freq: 'C6', duracao: 0.45, volume: 0.08, atraso: 0.3 },
    { onda: 'triangle', freq: 'E6', duracao: 0.45, volume: 0.1, atraso: 0.3 },
  ],
  estrela: [
    { onda: 'triangle', freq: 'C6', duracao: 0.1, volume: 0.14 },
    { onda: 'square', freq: 'G6', duracao: 0.2, volume: 0.05, atraso: 0.06 },
  ],
};

class Sons {
  constructor() {
    this.ctx = null;
    this.ligado = armazenamentoLocal.ler('horta:som', true) !== false;
  }

  alternar() {
    this.ligado = !this.ligado;
    armazenamentoLocal.salvar('horta:som', this.ligado);
    return this.ligado;
  }

  tocar(nome, { tom = 0 } = {}) {
    if (!this.ligado || !EFEITOS[nome]) return;
    try {
      if (!this.ctx) {
        const Contexto = window.AudioContext || window.webkitAudioContext;
        if (!Contexto) return;
        this.ctx = new Contexto();
        this.saida = this.ctx.createGain();
        this.saida.gain.value = 0.8;
        this.saida.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      for (const n of EFEITOS[nome]) tocarSom(this.ctx, this.saida, n, this.ctx.currentTime, { tom });
    } catch {
      // sem áudio: o jogo segue mudo
    }
  }
}

export const sons = new Sons();
