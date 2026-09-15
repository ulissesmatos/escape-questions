// Músicas de fundo da Oficina (formato em Musica.js). Volumes baixos de
// propósito: a música acompanha, não disputa atenção com a montagem.

const PAD = { onda: 'triangle', volume: 0.018, ataque: 0.25 };

export const FAIXAS = {
  // Menu: tranquila, C – Am – F – G
  menu: {
    bpm: 88,
    compassos: 8,
    trilhas: [
      {
        nome: 'melodia',
        som: { onda: 'square', volume: 0.028, ataque: 0.01 },
        notas: `G5 - E5 - C5 . D5 E5 | C5 - A4 - . . C5 D5 | F5 - E5 - C5 . A4 C5 | D5 - - - B4 . . .
              | G5 - A5 G5 E5 . C5 D5 | E5 - C5 - A4 . C5 E5 | F5 - A5 - G5 . E5 D5 | C5 - - - . . . .`,
      },
      {
        nome: 'baixo',
        som: { onda: 'triangle', volume: 0.09, ataque: 0.01 },
        notas: `C3 . . C3 G2 . . . | A2 . . A2 E2 . . . | F2 . . F2 C3 . . . | G2 . . G2 D3 . B2 .
              | C3 . . C3 G2 . . . | A2 . . A2 E2 . . . | F2 . . F2 C3 . . . | G2 . . G2 C3 . . .`,
      },
      { nome: 'acordes', tipo: 'acordes', som: PAD, acordes: ['C4 E4 G4', 'A3 C4 E4', 'F3 A3 C4', 'G3 B3 D4', 'C4 E4 G4', 'A3 C4 E4', 'F3 A3 C4', 'G3 B3 D4'] },
      {
        nome: 'bateria',
        tipo: 'bateria',
        volume: 0.7,
        notas: `k . h . s . h . | k . h . s . h . | k . h . s . h . | k . h k s . h h
              | k . h . s . h . | k . h . s . h . | k . h . s . h . | k . h k s h s h`,
      },
    ],
  },

  // Bancada: animada e leve, G – Em – C – D
  oficina: {
    bpm: 108,
    compassos: 8,
    trilhas: [
      {
        nome: 'arpejo',
        som: { onda: 'triangle', volume: 0.045, ataque: 0.005 },
        notas: `B4 . D5 . G5 . D5 . | B4 . E5 . G5 . E5 . | C5 . E5 . G5 . E5 . | A4 . D5 . F#5 - E5 D5
              | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . .`,
      },
      {
        nome: 'melodia',
        som: { onda: 'square', volume: 0.022, ataque: 0.01 },
        notas: `. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . .
              | G5 - - D5 E5 - D5 B4 | E5 - D5 B4 G4 - . . | C5 - E5 - G5 - A5 G5 | F#5 - - D5 E5 - F#5 -`,
      },
      {
        nome: 'baixo',
        som: { onda: 'triangle', volume: 0.085, ataque: 0.005 },
        notas: `G2 . G2 D3 G2 . D3 . | E2 . E2 B2 E2 . B2 . | C3 . C3 G2 C3 . G2 . | D3 . D3 A2 D3 . F#2 .
              | G2 . G2 D3 G2 . D3 . | E2 . E2 B2 E2 . B2 . | C3 . C3 G2 C3 . G2 . | D3 . D3 A2 D3 . A2 .`,
      },
      { nome: 'acordes', tipo: 'acordes', som: PAD, acordes: ['G3 B3 D4', 'E3 G3 B3', 'C4 E4 G4', 'D4 F#4 A4', 'G3 B3 D4', 'E3 G3 B3', 'C4 E4 G4', 'D4 F#4 A4'] },
      {
        nome: 'bateria',
        tipo: 'bateria',
        volume: 0.6,
        notas: `k . h . s . h h | k . h k s . h . | k . h . s . h h | k . h k s . s s
              | k . h . s . h h | k . h k s . h . | k . h . s . h h | k k h k s s s s`,
      },
    ],
  },
};
