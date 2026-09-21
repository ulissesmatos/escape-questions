import { LARGURA, ALTURA, CORES } from '../constantes.js';
import { ehLeve } from '../desempenho.js';

/** Desenha a parede, as prateleiras e a bancada (pixel art feita por código) */
function pintar(g, alturaBancada) {
  const P = 4;

  // Parede com azulejos
  g.fillStyle(CORES.fundo, 1).fillRect(0, 0, LARGURA, ALTURA);
  for (let y = 0; y < ALTURA - alturaBancada; y += 32) {
    for (let x = (y / 32) % 2 ? -24 : 0; x < LARGURA; x += 48) {
      g.fillStyle(CORES.fundoClaro, 1).fillRect(x + 2, y + 2, 44, 28);
    }
  }

  // Prateleiras com caixas de peças
  const coresCaixas = [0x8f63e8, 0x4f7df0, 0xe05252, 0xf5c542, 0x3fae6a, 0xf08a3c];
  for (const [py, deslocamento] of [[70, 0], [150, 3]]) {
    g.fillStyle(0x5a3f2c, 1).fillRect(0, py, LARGURA, P * 2);
    g.fillStyle(0x3d2a1d, 1).fillRect(0, py + P * 2, LARGURA, P);
    for (let i = 0; i < 26; i++) {
      const x = 12 + i * 38 + ((i * 17) % 9);
      const altura = 16 + ((i * 7 + deslocamento) % 3) * 6;
      if ((i + deslocamento) % 4 === 0) continue;
      g.fillStyle(coresCaixas[(i + deslocamento) % coresCaixas.length], 0.55).fillRect(x, py - altura, 28, altura);
      g.fillStyle(0xffffff, 0.15).fillRect(x + 4, py - altura + 4, 12, 4);
    }
  }

  // Bancada
  const topo = ALTURA - alturaBancada;
  g.fillStyle(CORES.bancadaEscura, 1).fillRect(0, topo, LARGURA, alturaBancada);
  g.fillStyle(CORES.bancada, 1).fillRect(0, topo, LARGURA, P * 3);
  for (let x = 0; x < LARGURA; x += 120) g.fillStyle(0x3d2a1d, 1).fillRect(x, topo + P * 3, P, alturaBancada);
  return g;
}

/**
 * Fundo da oficina. São centenas de retângulos, e o Phaser redesenha um
 * Graphics a cada quadro: no modo leve o cenário vira uma imagem, desenhada
 * uma única vez, para poupar o processador.
 */
export function desenharOficina(cena, { alturaBancada = 120 } = {}) {
  if (!ehLeve(cena)) return pintar(cena.add.graphics().setDepth(-10), alturaBancada);

  const chave = `cenario-${alturaBancada}`;
  if (!cena.textures.exists(chave)) {
    const g = pintar(cena.make.graphics({ add: false }), alturaBancada);
    g.generateTexture(chave, LARGURA, ALTURA);
    g.destroy();
  }
  return cena.add.image(0, 0, chave).setOrigin(0).setDepth(-10);
}
