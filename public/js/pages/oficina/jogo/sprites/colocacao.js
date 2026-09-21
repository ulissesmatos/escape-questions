import { SPRITES } from './manifesto.js';

/**
 * Geometria das peças montadas, compartilhada pelo jogo e pelo editor de
 * zonas: a prévia do editor usa as mesmas regras da bancada.
 *
 * Retângulos são objetos simples { x, y, width, height } — dá para ler um
 * Phaser.Geom.Rectangle do mesmo jeito.
 */

export const retangulo = (x, y, width, height) => ({ x, y, width, height });

/** [x, y, largura, altura] em frações (0 a 1) → pixels dentro da base */
export function daFracao([fx, fy, fw, fh], base) {
  return retangulo(base.x + fx * base.width, base.y + fy * base.height, fw * base.width, fh * base.height);
}

function inflar(r, dx, dy) {
  return retangulo(r.x - dx, r.y - dy, r.width + dx * 2, r.height + dy * 2);
}

/** Arte no tamanho do sprite × escala, com o centro no centro da caixa */
export function centralizar(chave, caixa, escala) {
  const { largura, altura } = SPRITES[chave];
  const w = largura * escala;
  const h = altura * escala;
  return retangulo(caixa.x + (caixa.width - w) / 2, caixa.y + (caixa.height - h) / 2, w, h);
}

/** Maior tamanho da arte que cabe na caixa, mantendo a proporção */
export function caber(chave, caixa, margem = 1) {
  const { largura, altura } = SPRITES[chave];
  return centralizar(chave, caixa, Math.min((caixa.width * margem) / largura, (caixa.height * margem) / altura));
}

/**
 * Onde a arte de cada peça fica, dado o retângulo do encaixe. `escala` é a
 * escala da placa-mãe na tela: peças que não se ajustam ao encaixe
 * (cooler, memória, SSD, placa de vídeo) acompanham o tamanho da placa.
 */
export const ARTE_NO_ENCAIXE = {
  // A arte do processador tem margem própria: ocupa um pouco mais que o socket
  cpu: (chave, r) => caber(chave, r, 1.02),
  cooler: (chave, r, escala) => centralizar(chave, r, escala),
  // Pentes um pouco maiores que a escala da placa, para se destacarem do slot vazio
  ram: (chave, r, escala) => centralizar(chave, r, escala * 1.16),
  // SSD M.2: contatos no começo do slot, centralizado na altura
  m2: (chave, r, escala) => {
    const { largura, altura } = SPRITES[chave];
    return retangulo(r.x, r.y + r.height / 2 - (altura * escala) / 2, largura * escala, altura * escala);
  },
  // Placa de vídeo: contatos sobre o slot e suporte metálico um pouco antes dele
  gpu: (chave, r, escala) => {
    const { largura, altura } = SPRITES[chave];
    return retangulo(r.x - 6 * escala, r.y + r.height / 2 + 2 * escala - altura * escala, largura * escala, altura * escala);
  },
  placa: (chave, r) => caber(chave, r),
  fonte: (chave, r) => caber(chave, r, 0.98),
  sata: (chave, r) => caber(chave, r, 0.95),
};

/** Área onde a peça pode ser solta: um pouco maior que o encaixe, para não exigir mira perfeita */
export const AREA_DE_SOLTAR = {
  cpu: (r) => r,
  cooler: (r) => inflar(r, r.width * 0.3, r.height * 0.3),
  ram: (r) => inflar(r, r.width * 0.8, 0),
  m2: (r) => inflar(r, 0, r.height),
  gpu: (r) => inflar(r, 0, r.height * 2),
  fonte: (r) => r,
  sata: (r) => r,
};

/** Qual regra de peça vale para cada tipo de zona (conectores não recebem peça) */
export const PECA_DA_ZONA = {
  socket: 'cpu',
  ram: 'ram',
  m2: 'm2',
  pcie: 'gpu',
  placa: 'placa',
  fonte: 'fonte',
  sata: 'sata',
};
