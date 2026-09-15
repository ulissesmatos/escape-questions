// Catálogo dos efeitos sonoros da Oficina. Cada efeito é uma lista de sons
// (ver tocarSom em Sintetizador.js); `atraso` encadeia sons em sequência.

export const EFEITOS = {
  // Interface
  clique: [{ onda: 'square', freq: 1400, ate: 1000, duracao: 0.035, volume: 0.07 }],
  aba: [{ onda: 'triangle', freq: 620, ate: 900, duracao: 0.07, volume: 0.16 }],
  passo: [
    { onda: 'triangle', freq: 'C6', duracao: 0.09, volume: 0.13 },
    { onda: 'triangle', freq: 'G6', duracao: 0.14, volume: 0.13, atraso: 0.07 },
  ],
  negar: [
    { onda: 'square', freq: 247, duracao: 0.07, volume: 0.1, sustentar: true },
    { onda: 'square', freq: 196, duracao: 0.12, volume: 0.1, sustentar: true, atraso: 0.08 },
  ],

  // Peças
  pegar: [{ onda: 'triangle', freq: 280, ate: 560, duracao: 0.09, volume: 0.2 }],
  soltar: [{ onda: 'triangle', freq: 520, ate: 240, duracao: 0.11, volume: 0.18 }],
  encaixe: [
    { onda: 'square', freq: 170, ate: 80, duracao: 0.06, volume: 0.18 },
    { onda: 'ruido', duracao: 0.05, volume: 0.22, filtro: 'highpass', corte: 3200 },
    { onda: 'triangle', freq: 'E6', duracao: 0.14, volume: 0.1, atraso: 0.05 },
  ],
  erro: [{ onda: 'sawtooth', freq: 190, ate: 110, duracao: 0.26, volume: 0.14, filtro: 'lowpass', corte: 1300 }],
  dano: [
    { onda: 'ruido', duracao: 0.4, volume: 0.32, filtro: 'bandpass', corte: 2800, corteAte: 350, q: 0.8 },
    { onda: 'sawtooth', freq: 420, ate: 55, duracao: 0.45, volume: 0.16 },
  ],
  parafuso: [
    { onda: 'ruido', duracao: 0.2, volume: 0.16, filtro: 'bandpass', corte: 1600, corteAte: 3400, q: 5 },
    { onda: 'square', freq: 900, duracao: 0.03, volume: 0.08, atraso: 0.2 },
  ],
  plugue: [
    { onda: 'ruido', duracao: 0.04, volume: 0.28, filtro: 'highpass', corte: 2200 },
    { onda: 'square', freq: 1500, duracao: 0.03, volume: 0.08, atraso: 0.035 },
  ],
  alavanca: [
    { onda: 'triangle', freq: 380, ate: 720, duracao: 0.12, volume: 0.14 },
    { onda: 'ruido', duracao: 0.045, volume: 0.2, filtro: 'highpass', corte: 4200, atraso: 0.11 },
  ],
  levantar: [{ onda: 'sine', freq: 300, ate: 520, duracao: 0.12, volume: 0.12 }],
  raspar: [{ onda: 'ruido', duracao: 0.32, volume: 0.18, filtro: 'bandpass', corte: 900, corteAte: 1700, q: 2 }],

  // Recompensas
  moeda: [
    { onda: 'square', freq: 'B5', duracao: 0.07, volume: 0.1, sustentar: true },
    { onda: 'square', freq: 'E6', duracao: 0.3, volume: 0.1, atraso: 0.07 },
  ],
  estrela: [
    { onda: 'triangle', freq: 'C6', duracao: 0.1, volume: 0.16 },
    { onda: 'square', freq: 'G6', duracao: 0.22, volume: 0.06, atraso: 0.06 },
  ],
  sucesso: [
    { onda: 'square', freq: 'C5', duracao: 0.09, volume: 0.09, sustentar: true },
    { onda: 'square', freq: 'E5', duracao: 0.09, volume: 0.09, sustentar: true, atraso: 0.1 },
    { onda: 'square', freq: 'G5', duracao: 0.09, volume: 0.09, sustentar: true, atraso: 0.2 },
    { onda: 'square', freq: 'C6', duracao: 0.45, volume: 0.09, atraso: 0.3 },
    { onda: 'triangle', freq: 'E6', duracao: 0.45, volume: 0.12, atraso: 0.3 },
  ],
  fracasso: [
    { onda: 'triangle', freq: 'G4', duracao: 0.16, volume: 0.18, sustentar: true },
    { onda: 'triangle', freq: 'E4', duracao: 0.16, volume: 0.18, sustentar: true, atraso: 0.18 },
    { onda: 'triangle', freq: 'C4', duracao: 0.5, volume: 0.18, atraso: 0.36 },
  ],

  // Ligando o computador
  botaoLigar: [{ onda: 'ruido', duracao: 0.03, volume: 0.25, filtro: 'bandpass', corte: 2500, q: 3 }],
  ligar: [
    { onda: 'sine', freq: 55, ate: 150, duracao: 0.7, volume: 0.22 },
    { onda: 'ruido', duracao: 0.6, volume: 0.06, filtro: 'lowpass', corte: 300, corteAte: 1500 },
  ],
  desligar: [{ onda: 'sine', freq: 170, ate: 38, duracao: 0.8, volume: 0.22 }],
  bip: [{ onda: 'square', freq: 1000, duracao: 0.16, volume: 0.07, sustentar: true }],
  bipLongo: [{ onda: 'square', freq: 1000, duracao: 0.65, volume: 0.07, sustentar: true }],
  tecla: [{ onda: 'square', freq: 2200, duracao: 0.012, volume: 0.025 }],
  estouro: [
    { onda: 'ruido', duracao: 0.3, volume: 0.5, filtro: 'lowpass', corte: 3500, corteAte: 180 },
    { onda: 'square', freq: 130, ate: 40, duracao: 0.32, volume: 0.22 },
  ],
  alarme: [0, 1, 2, 3].map((i) => ({ onda: 'square', freq: i % 2 ? 660 : 880, duracao: 0.14, volume: 0.07, sustentar: true, atraso: i * 0.16 })),
  pontos: [{ onda: 'square', freq: 'A5', duracao: 0.03, volume: 0.04 }],
};
