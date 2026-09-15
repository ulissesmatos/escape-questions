// Catálogo de peças da Oficina de PCs. Os valores técnicos seguem a lógica
// real (socket, tipo de memória, formato, consumo), com preços fictícios em
// centavos. `sprite` aponta para a imagem em /images/oficina/<sprite>.png.

export const CATEGORIAS = [
  { id: 'placa_mae', nome: 'Placa-mãe', curto: 'Placa-mãe' },
  { id: 'cpu', nome: 'Processador', curto: 'Processador' },
  { id: 'cooler', nome: 'Cooler', curto: 'Cooler' },
  { id: 'ram', nome: 'Memória', curto: 'Memória' },
  { id: 'armazenamento', nome: 'Armazenamento', curto: 'SSD / HD' },
  { id: 'gpu', nome: 'Placa de vídeo', curto: 'Vídeo' },
  { id: 'fonte', nome: 'Fonte', curto: 'Fonte' },
  { id: 'gabinete', nome: 'Gabinete', curto: 'Gabinete' },
  { id: 'ferramenta', nome: 'Ferramentas', curto: 'Ferramentas' },
];

export const PECAS = [
  // ---------------- Placas-mãe ----------------
  {
    id: 'pm-am4-matx',
    categoria: 'placa_mae',
    nome: 'Placa-mãe AM4 Micro-ATX',
    detalhes: ['Socket AM4', 'Memória DDR4 · 2 slots', '1 slot M.2', 'Formato Micro-ATX'],
    preco: 49900,
    sprite: 'placa-matx',
    socket: 'AM4',
    tipoRam: 'DDR4',
    slotsRam: 2,
    slotsM2: 1,
    formato: 'Micro-ATX',
  },
  {
    id: 'pm-lga1700-matx',
    categoria: 'placa_mae',
    nome: 'Placa-mãe LGA1700 Micro-ATX',
    detalhes: ['Socket LGA1700 (Intel)', 'Memória DDR4 · 2 slots', '1 slot M.2', 'Formato Micro-ATX'],
    preco: 69900,
    sprite: 'placa-matx-intel',
    socket: 'LGA1700',
    tipoRam: 'DDR4',
    slotsRam: 2,
    slotsM2: 1,
    formato: 'Micro-ATX',
  },
  {
    id: 'pm-am5-atx',
    categoria: 'placa_mae',
    nome: 'Placa-mãe AM5 ATX',
    detalhes: ['Socket AM5', 'Memória DDR5 · 4 slots', '2 slots M.2', 'Formato ATX'],
    preco: 119900,
    sprite: 'placa-atx',
    socket: 'AM5',
    tipoRam: 'DDR5',
    slotsRam: 4,
    slotsM2: 2,
    formato: 'ATX',
  },

  // ---------------- Processadores ----------------
  {
    id: 'cpu-am4-6g',
    categoria: 'cpu',
    nome: 'Processador AM4 6 núcleos G',
    detalhes: ['Socket AM4', '6 núcleos', '65 W', 'Com vídeo integrado'],
    preco: 69900,
    sprite: 'cpu-am4',
    socket: 'AM4',
    nucleos: 6,
    tdp: 65,
    videoIntegrado: true,
  },
  {
    id: 'cpu-lga1700-6f',
    categoria: 'cpu',
    nome: 'Processador LGA1700 6 núcleos F',
    detalhes: ['Socket LGA1700 (Intel)', '6 núcleos', '65 W', 'SEM vídeo integrado'],
    preco: 74900,
    sprite: 'cpu-intel',
    socket: 'LGA1700',
    nucleos: 6,
    tdp: 65,
    videoIntegrado: false,
  },
  {
    id: 'cpu-am5-6',
    categoria: 'cpu',
    nome: 'Processador AM5 6 núcleos',
    detalhes: ['Socket AM5', '6 núcleos', '65 W', 'Com vídeo integrado'],
    preco: 109900,
    sprite: 'cpu-am5',
    socket: 'AM5',
    nucleos: 6,
    tdp: 65,
    videoIntegrado: true,
  },
  {
    id: 'cpu-am5-8',
    categoria: 'cpu',
    nome: 'Processador AM5 8 núcleos',
    detalhes: ['Socket AM5', '8 núcleos', '120 W', 'Com vídeo integrado'],
    preco: 209900,
    sprite: 'cpu-am5',
    socket: 'AM5',
    nucleos: 8,
    tdp: 120,
    videoIntegrado: true,
  },

  // ---------------- Coolers ----------------
  {
    id: 'cooler-box',
    categoria: 'cooler',
    nome: 'Cooler box simples',
    detalhes: ['Dissipa até 65 W', 'Compacto'],
    preco: 5900,
    sprite: 'cooler-box',
    capacidade: 65,
  },
  {
    id: 'cooler-torre',
    categoria: 'cooler',
    nome: 'Cooler torre',
    detalhes: ['Dissipa até 180 W', 'Heatpipes de cobre'],
    preco: 24900,
    sprite: 'cooler-torre',
    capacidade: 180,
  },

  // ---------------- Memória RAM (preço por pente) ----------------
  { id: 'ram-ddr4-8', categoria: 'ram', nome: 'Memória DDR4 8 GB', detalhes: ['DDR4', '8 GB por pente'], preco: 14900, sprite: 'ram-ddr4', tipoRam: 'DDR4', gb: 8 },
  { id: 'ram-ddr4-16', categoria: 'ram', nome: 'Memória DDR4 16 GB', detalhes: ['DDR4', '16 GB por pente'], preco: 27900, sprite: 'ram-ddr4', tipoRam: 'DDR4', gb: 16 },
  { id: 'ram-ddr5-8', categoria: 'ram', nome: 'Memória DDR5 8 GB', detalhes: ['DDR5', '8 GB por pente'], preco: 19900, sprite: 'ram-ddr5', tipoRam: 'DDR5', gb: 8 },
  { id: 'ram-ddr5-16', categoria: 'ram', nome: 'Memória DDR5 16 GB', detalhes: ['DDR5', '16 GB por pente'], preco: 34900, sprite: 'ram-ddr5', tipoRam: 'DDR5', gb: 16 },

  // ---------------- Armazenamento ----------------
  { id: 'ssd-nvme-500', categoria: 'armazenamento', nome: 'SSD M.2 NVMe 500 GB', detalhes: ['Encaixa no slot M.2', '500 GB', 'Muito rápido'], preco: 27900, sprite: 'ssd-m2', interface: 'nvme', gb: 500, ssd: true },
  { id: 'ssd-nvme-1tb', categoria: 'armazenamento', nome: 'SSD M.2 NVMe 1 TB', detalhes: ['Encaixa no slot M.2', '1 TB', 'Muito rápido'], preco: 44900, sprite: 'ssd-m2', interface: 'nvme', gb: 1000, ssd: true },
  { id: 'ssd-sata-1tb', categoria: 'armazenamento', nome: 'SSD SATA 1 TB', detalhes: ['Vai na baia SATA', '1 TB', 'Rápido'], preco: 39900, sprite: 'ssd-sata', interface: 'sata', gb: 1000, ssd: true },
  { id: 'hd-2tb', categoria: 'armazenamento', nome: 'HD 2 TB', detalhes: ['Vai na baia SATA', '2 TB', 'Lento, mas barato'], preco: 39900, sprite: 'hd', interface: 'sata', gb: 2000, ssd: false },

  // ---------------- Placas de vídeo ----------------
  { id: 'gpu-entrada', categoria: 'gpu', nome: 'Placa de vídeo de entrada', detalhes: ['Nível 1 (jogos leves)', '115 W', 'Sem cabo extra', '229 mm'], preco: 139900, sprite: 'gpu-1', nivel: 1, consumo: 115, cabosEnergia: 0, comprimento: 229 },
  { id: 'gpu-media', categoria: 'gpu', nome: 'Placa de vídeo intermediária', detalhes: ['Nível 2 (jogos e edição)', '200 W', '1 cabo de energia', '268 mm'], preco: 289900, sprite: 'gpu-2', nivel: 2, consumo: 200, cabosEnergia: 1, comprimento: 268 },
  { id: 'gpu-topo', categoria: 'gpu', nome: 'Placa de vídeo topo de linha', detalhes: ['Nível 3 (a melhor da loja)', '350 W', '1 cabo de energia', '336 mm'], preco: 899900, sprite: 'gpu-3', nivel: 3, consumo: 350, cabosEnergia: 1, comprimento: 336 },

  // ---------------- Fontes ----------------
  { id: 'fonte-450', categoria: 'fonte', nome: 'Fonte 450 W', detalhes: ['450 W'], preco: 27900, sprite: 'fonte', potencia: 450 },
  { id: 'fonte-650', categoria: 'fonte', nome: 'Fonte 650 W', detalhes: ['650 W', '80 Plus Bronze'], preco: 44900, sprite: 'fonte', potencia: 650 },
  { id: 'fonte-850', categoria: 'fonte', nome: 'Fonte 850 W', detalhes: ['850 W', '80 Plus Gold'], preco: 79900, sprite: 'fonte', potencia: 850 },

  // ---------------- Gabinetes ----------------
  { id: 'gab-mini', categoria: 'gabinete', nome: 'Gabinete Mini Tower', detalhes: ['Aceita Micro-ATX e Mini-ITX', 'Placa de vídeo até 280 mm'], preco: 24900, sprite: 'gabinete-mini', formatos: ['Micro-ATX', 'Mini-ITX'], gpuMax: 280 },
  { id: 'gab-mid', categoria: 'gabinete', nome: 'Gabinete Mid Tower', detalhes: ['Aceita ATX, Micro-ATX e Mini-ITX', 'Placa de vídeo até 360 mm'], preco: 44900, sprite: 'gabinete-mid', formatos: ['ATX', 'Micro-ATX', 'Mini-ITX'], gpuMax: 360 },

  // ---------------- Ferramentas (não são compradas) ----------------
  { id: 'pasta-termica', categoria: 'ferramenta', nome: 'Pasta térmica', detalhes: ['Vai entre o processador e o cooler', 'Arraste até o processador'], preco: 0, sprite: 'pasta', ferramenta: true },
];

const PORID = new Map(PECAS.map((p) => [p.id, p]));

export function peca(id) {
  const encontrada = PORID.get(id);
  if (!encontrada) throw new Error(`Peça desconhecida: ${id}`);
  return encontrada;
}

export function pecasDaCategoria(categoria) {
  return PECAS.filter((p) => p.categoria === categoria);
}

export function formatarPreco(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
