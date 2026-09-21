// Manifesto dos sprites da Oficina de PCs.
//
// Cada sprite tem um tamanho de exibição fixo (em pixels do jogo, que roda
// em 960×540). Se existir /images/oficina/<chave>.png, ele é usado e
// redimensionado para esse tamanho; senão o jogo desenha um provisório.
//
// `pedido` é o texto sugerido para gerar a imagem no ChatGPT (ver
// docs/oficina-sprites.md para o estilo comum e o passo a passo).

export const SPRITES = {
  // ---------------- Placas-mãe (vista de cima) ----------------
  'placa-atx': {
    largura: 240,
    altura: 300,
    pedido: 'placa-mãe ATX vista de cima, PCB verde escuro, socket AMD AM5 prateado quadrado no centro-alto, 4 slots de memória verticais pretos à direita do socket, dissipadores cinza em volta do socket, 2 slots M.2, slot PCI Express x16 comprido horizontal na parte de baixo, conector de 24 pinos branco na borda direita',
  },
  'placa-matx': {
    largura: 240,
    altura: 240,
    pedido: 'placa-mãe Micro-ATX quadrada vista de cima, PCB verde escuro, socket AMD AM4 bege com furinhos, 2 slots de memória verticais pretos à direita do socket, 1 slot M.2, slot PCI Express x16 horizontal embaixo, conector de 24 pinos branco na borda direita',
  },
  'placa-matx-intel': {
    largura: 240,
    altura: 240,
    pedido: 'placa-mãe Micro-ATX quadrada vista de cima, PCB azul escuro, socket Intel LGA1700 retangular prateado com pinos dourados e alavanca de metal, 2 slots de memória verticais pretos à direita, 1 slot M.2, slot PCI Express x16 horizontal embaixo',
  },

  // ---------------- Processadores ----------------
  'cpu-am4': { largura: 44, altura: 44, pedido: 'processador AMD AM4 visto de cima, tampa metálica prateada quadrada, pequeno triângulo dourado no canto inferior esquerdo' },
  'cpu-am5': { largura: 44, altura: 44, pedido: 'processador AMD AM5 visto de cima, tampa metálica prateada com recortes nas bordas (formato de polvo), triângulo dourado no canto inferior esquerdo' },
  'cpu-intel': { largura: 48, altura: 40, pedido: 'processador Intel retangular visto de cima, borda de placa verde, tampa metálica prateada, triângulo dourado no canto inferior esquerdo' },

  // ---------------- Refrigeração ----------------
  pasta: { largura: 52, altura: 20, pedido: 'seringa/tubo de pasta térmica cinza deitado, rótulo azul, tampa na ponta' },
  'cooler-box': { largura: 72, altura: 72, pedido: 'cooler box de processador visto de cima, ventoinha preta redonda com pás, moldura quadrada de alumínio' },
  'cooler-torre': { largura: 80, altura: 80, pedido: 'cooler torre de processador visto de cima, bloco de aletas de alumínio, ventoinha preta de um lado, pontas de heatpipes de cobre' },

  // ---------------- Memórias (em pé, como vão no slot) ----------------
  'ram-ddr4': { largura: 14, altura: 96, pedido: 'pente de memória RAM DDR4 vertical, placa verde com chips pretos, contatos dourados na lateral com um entalhe no meio' },
  'ram-ddr5': { largura: 14, altura: 96, pedido: 'pente de memória RAM DDR5 vertical com dissipador preto e faixa roxa, contatos dourados na lateral com entalhe fora do centro' },

  // ---------------- Armazenamento ----------------
  'ssd-m2': { largura: 60, altura: 16, pedido: 'SSD M.2 NVMe deitado, placa pequena e comprida preta com chips e etiqueta, contatos dourados na ponta esquerda' },
  'ssd-sata': { largura: 48, altura: 32, pedido: 'SSD SATA 2,5 polegadas, caixa preta retangular com etiqueta azul' },
  hd: { largura: 52, altura: 36, pedido: 'HD de 3,5 polegadas visto de cima, carcaça prateada com etiqueta e parafusos' },

  // ---------------- Placas de vídeo (deitadas, vista lateral) ----------------
  'gpu-1': { largura: 116, altura: 40, pedido: 'placa de vídeo pequena de 1 ventoinha, vista lateral, carcaça cinza escura, contatos dourados embaixo, suporte metálico na ponta esquerda' },
  'gpu-2': { largura: 136, altura: 42, pedido: 'placa de vídeo intermediária de 2 ventoinhas, vista lateral, carcaça preta com detalhes cinza, contatos dourados embaixo, suporte metálico na ponta esquerda' },
  'gpu-3': { largura: 164, altura: 46, pedido: 'placa de vídeo topo de linha enorme de 3 ventoinhas, vista lateral, carcaça preta com faixa de LED colorido, contatos dourados embaixo, suporte metálico na ponta esquerda' },

  // ---------------- Fonte e gabinetes ----------------
  fonte: { largura: 88, altura: 56, pedido: 'fonte de alimentação ATX preta, grade redonda da ventoinha, etiqueta amarela' },
  'gabinete-mini': { largura: 270, altura: 320, pedido: 'gabinete Mini Tower aberto visto de lado, interior cinza escuro vazio, ventoinha traseira no alto à esquerda, compartimento da fonte embaixo, baias de disco à direita' },
  'gabinete-mid': { largura: 300, altura: 350, pedido: 'gabinete Mid Tower aberto visto de lado, interior preto vazio, ventoinhas traseira e superior, compartimento da fonte embaixo, baias de disco à direita, frente com grade' },

  // ---------------- Clientes e ícones ----------------
  'cliente-cida': { largura: 56, altura: 56, pedido: 'retrato de uma senhora simpática de cabelo grisalho e óculos, fundo transparente' },
  'cliente-ricardo': { largura: 56, altura: 56, pedido: 'retrato de um professor de barba curta e óculos, camisa social, fundo transparente' },
  'cliente-enzo': { largura: 56, altura: 56, pedido: 'retrato de um adolescente gamer com headset, fundo transparente' },
  'cliente-marina': { largura: 56, altura: 56, pedido: 'retrato de uma jovem criadora de conteúdo com coque no cabelo, fundo transparente' },
  moeda: { largura: 18, altura: 18, pedido: 'moeda dourada brilhante' },
  estrela: { largura: 28, altura: 28, pedido: 'estrela dourada brilhante' },
  'estrela-vazia': { largura: 28, altura: 28, pedido: 'estrela vazia, só o contorno cinza' },
};

/**
 * Zonas padrão dos encaixes em cada placa-mãe, em frações da imagem (0 a 1):
 * [x, y, largura, altura] a partir do canto superior esquerdo.
 *
 * Para calibrar sobre a arte, use o editor visual (oficina-zonas.html): ele
 * grava só as diferenças em public/images/oficina/zonas.json, que o jogo
 * aplica por cima destes valores (ver sprites/zonas.js).
 */
export const LAYOUT_PLACAS = {
  'placa-atx': {
    socket: [0.3, 0.16, 0.24, 0.19],
    ram: [
      [0.64, 0.07, 0.045, 0.4],
      [0.705, 0.07, 0.045, 0.4],
      [0.77, 0.07, 0.045, 0.4],
      [0.835, 0.07, 0.045, 0.4],
    ],
    m2: [
      [0.24, 0.53, 0.3, 0.05],
      [0.24, 0.82, 0.3, 0.05],
    ],
    pcie: [0.08, 0.65, 0.62, 0.045],
    conector24: [0.92, 0.17, 0.06, 0.2],
    conectorCpu: [0.07, 0.04, 0.13, 0.05],
  },
  'placa-matx': {
    socket: [0.28, 0.17, 0.28, 0.27],
    ram: [
      [0.7, 0.07, 0.055, 0.5],
      [0.78, 0.07, 0.055, 0.5],
    ],
    m2: [[0.22, 0.57, 0.38, 0.06]],
    pcie: [0.07, 0.75, 0.68, 0.055],
    conector24: [0.91, 0.2, 0.07, 0.26],
    conectorCpu: [0.06, 0.03, 0.15, 0.06],
  },
};
// Começa igual à Micro-ATX AMD, mas é uma cópia: a arte Intel pode ser calibrada separadamente
LAYOUT_PLACAS['placa-matx-intel'] = structuredClone(LAYOUT_PLACAS['placa-matx']);

/** Regiões internas de cada gabinete (frações da imagem) */
export const LAYOUT_GABINETES = {
  'gabinete-mini': {
    placa: [0.1, 0.1, 0.56, 0.5],
    fonte: [0.08, 0.76, 0.46, 0.17],
    sata: [
      [0.72, 0.42, 0.22, 0.11],
      [0.72, 0.57, 0.22, 0.11],
    ],
  },
  'gabinete-mid': {
    placa: [0.1, 0.1, 0.56, 0.58],
    fonte: [0.08, 0.78, 0.46, 0.15],
    sata: [
      [0.73, 0.44, 0.21, 0.1],
      [0.73, 0.58, 0.21, 0.1],
    ],
  },
};
