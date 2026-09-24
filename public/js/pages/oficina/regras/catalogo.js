// Catálogo de peças da Oficina de PCs. Placas-mãe, processadores e memórias
// usam modelos reais, com os dados técnicos que importam para a montagem
// (socket, tipo de memória, formato, consumo, vídeo integrado). Preços em
// centavos, aproximados. `sprite` aponta para a imagem em
// /images/oficina/<sprite>.png.

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
  // AMD AM4 (DDR4)
  placa({
    id: 'pm-am4-matx',
    nome: 'ASUS Prime A520M-K',
    socket: 'AM4',
    plataforma: 'AMD',
    tipoRam: 'DDR4',
    slotsRam: 2,
    slotsM2: 1,
    formato: 'Micro-ATX',
    sprite: 'placa-matx',
    preco: 49900,
  }),
  placa({
    id: 'pm-am4-b550m',
    nome: 'ASRock B550M-HDV',
    socket: 'AM4',
    plataforma: 'AMD',
    tipoRam: 'DDR4',
    slotsRam: 2,
    slotsM2: 1,
    formato: 'Micro-ATX',
    sprite: 'placa-matx',
    preco: 64900,
  }),
  // AMD AM5 (só DDR5)
  placa({
    id: 'pm-am5-a620m',
    nome: 'ASRock A620M-HDV/M.2+',
    socket: 'AM5',
    plataforma: 'AMD',
    tipoRam: 'DDR5',
    slotsRam: 2,
    slotsM2: 1,
    formato: 'Micro-ATX',
    sprite: 'placa-matx-intel',
    preco: 74900,
  }),
  placa({
    id: 'pm-am5-atx',
    nome: 'MSI B650 Gaming Plus WiFi',
    socket: 'AM5',
    plataforma: 'AMD',
    tipoRam: 'DDR5',
    slotsRam: 4,
    slotsM2: 2,
    formato: 'ATX',
    sprite: 'placa-atx',
    preco: 119900,
  }),
  placa({
    id: 'pm-am5-x870',
    nome: 'ASUS TUF Gaming X870-Plus WiFi',
    socket: 'AM5',
    plataforma: 'AMD',
    tipoRam: 'DDR5',
    slotsRam: 4,
    slotsM2: 2,
    formato: 'ATX',
    sprite: 'placa-atx',
    preco: 219900,
  }),
  // Intel LGA1700 (12ª a 14ª geração): existem versões DDR4 e versões DDR5
  placa({
    id: 'pm-lga1700-matx',
    nome: 'Gigabyte H610M S2H DDR4',
    socket: 'LGA1700',
    plataforma: 'Intel',
    tipoRam: 'DDR4',
    slotsRam: 2,
    slotsM2: 1,
    formato: 'Micro-ATX',
    sprite: 'placa-matx-intel',
    preco: 69900,
  }),
  placa({
    id: 'pm-lga1700-b760m-d5',
    nome: 'MSI PRO B760M-E DDR5',
    socket: 'LGA1700',
    plataforma: 'Intel',
    tipoRam: 'DDR5',
    slotsRam: 2,
    slotsM2: 1,
    formato: 'Micro-ATX',
    sprite: 'placa-matx-intel',
    preco: 84900,
  }),
  placa({
    id: 'pm-lga1700-b760-d4',
    nome: 'Gigabyte B760 Gaming X DDR4',
    socket: 'LGA1700',
    plataforma: 'Intel',
    tipoRam: 'DDR4',
    slotsRam: 4,
    slotsM2: 2,
    formato: 'ATX',
    sprite: 'placa-atx',
    preco: 109900,
  }),
  placa({
    id: 'pm-lga1700-z790',
    nome: 'MSI PRO Z790-P WiFi',
    socket: 'LGA1700',
    plataforma: 'Intel',
    tipoRam: 'DDR5',
    slotsRam: 4,
    slotsM2: 2,
    formato: 'ATX',
    sprite: 'placa-atx',
    preco: 169900,
  }),
  // Intel LGA1851 (Core Ultra 200S, a plataforma mais nova): só DDR5
  placa({
    id: 'pm-lga1851-b860m',
    nome: 'ASUS Prime B860M-K',
    socket: 'LGA1851',
    plataforma: 'Intel',
    tipoRam: 'DDR5',
    slotsRam: 2,
    slotsM2: 1,
    formato: 'Micro-ATX',
    sprite: 'placa-matx-intel',
    preco: 119900,
  }),
  placa({
    id: 'pm-lga1851-z890',
    nome: 'ASUS Prime Z890-P WiFi',
    socket: 'LGA1851',
    plataforma: 'Intel',
    tipoRam: 'DDR5',
    slotsRam: 4,
    slotsM2: 2,
    formato: 'ATX',
    sprite: 'placa-atx',
    preco: 229900,
  }),

  // ---------------- Processadores ----------------
  // Dica que o jogo ensina: na AMD, o "G" no nome indica vídeo integrado; na
  // Intel, o "F" indica que NÃO tem vídeo integrado.
  // AMD AM4
  processador({
    id: 'cpu-am4-6g',
    nome: 'AMD Ryzen 5 5600G',
    socket: 'AM4',
    nucleos: 6,
    threads: 12,
    tdp: 65,
    videoIntegrado: true,
    graficos: 'Radeon Vega 7',
    sprite: 'cpu-am4',
    preco: 69900,
    descricao: 'O "G" no nome indica vídeo integrado: liga o monitor sem placa de vídeo. Ótimo para PCs de escritório.',
  }),
  processador({
    id: 'cpu-am4-5600',
    nome: 'AMD Ryzen 5 5600',
    socket: 'AM4',
    nucleos: 6,
    threads: 12,
    tdp: 65,
    videoIntegrado: false,
    sprite: 'cpu-am4',
    preco: 59900,
    descricao: 'Sem o "G" no nome: não tem vídeo integrado. Precisa de uma placa de vídeo para dar imagem.',
  }),
  processador({
    id: 'cpu-am4-5700x',
    nome: 'AMD Ryzen 7 5700X',
    socket: 'AM4',
    nucleos: 8,
    threads: 16,
    tdp: 65,
    videoIntegrado: false,
    sprite: 'cpu-am4',
    preco: 89900,
    descricao: '8 núcleos econômicos, mas sem vídeo integrado: precisa de placa de vídeo.',
  }),
  // AMD AM5
  processador({
    id: 'cpu-am5-7500f',
    nome: 'AMD Ryzen 5 7500F',
    socket: 'AM5',
    nucleos: 6,
    threads: 12,
    tdp: 65,
    videoIntegrado: false,
    sprite: 'cpu-am5',
    preco: 89900,
    descricao: 'Quase todo Ryzen AM5 tem vídeo básico, mas o "F" deste indica que NÃO tem. Precisa de placa de vídeo.',
  }),
  processador({
    id: 'cpu-am5-6',
    nome: 'AMD Ryzen 5 7600',
    socket: 'AM5',
    nucleos: 6,
    threads: 12,
    tdp: 65,
    videoIntegrado: true,
    graficos: 'Radeon Graphics (2 núcleos)',
    sprite: 'cpu-am5',
    preco: 109900,
    descricao: 'Tem vídeo integrado básico: dá imagem e serve para o dia a dia, mas não para jogos.',
  }),
  processador({
    id: 'cpu-am5-9600x',
    nome: 'AMD Ryzen 5 9600X',
    socket: 'AM5',
    nucleos: 6,
    threads: 12,
    tdp: 65,
    videoIntegrado: true,
    graficos: 'Radeon Graphics (2 núcleos)',
    sprite: 'cpu-am5',
    preco: 149900,
    descricao: 'Geração mais nova (Zen 5), com vídeo integrado básico.',
  }),
  processador({
    id: 'cpu-am5-8700g',
    nome: 'AMD Ryzen 7 8700G',
    socket: 'AM5',
    nucleos: 8,
    threads: 16,
    tdp: 65,
    videoIntegrado: true,
    graficos: 'Radeon 780M',
    pontosVideo: 600,
    sprite: 'cpu-am5',
    preco: 179900,
    descricao: 'Vídeo integrado forte (Radeon 780M): roda até jogos leves sem placa de vídeo.',
  }),
  processador({
    id: 'cpu-am5-8',
    nome: 'AMD Ryzen 7 7800X3D',
    socket: 'AM5',
    nucleos: 8,
    threads: 16,
    tdp: 120,
    videoIntegrado: true,
    graficos: 'Radeon Graphics (2 núcleos)',
    sprite: 'cpu-am5',
    preco: 209900,
    descricao: 'Um dos melhores para jogos. Tem vídeo integrado básico, mas quem compra usa com placa de vídeo. Esquenta: precisa de cooler bom.',
  }),
  processador({
    id: 'cpu-am5-9950x',
    nome: 'AMD Ryzen 9 9950X',
    socket: 'AM5',
    nucleos: 16,
    threads: 32,
    tdp: 170,
    videoIntegrado: true,
    graficos: 'Radeon Graphics (2 núcleos)',
    sprite: 'cpu-am5',
    preco: 399900,
    descricao: '16 núcleos para edição de vídeo e 3D. Gasta 170 W: pede cooler torre e fonte com folga.',
  }),
  // Intel LGA1700
  processador({
    id: 'cpu-lga1700-i3',
    nome: 'Intel Core i3-12100',
    socket: 'LGA1700',
    nucleos: 4,
    threads: 8,
    tdp: 60,
    videoIntegrado: true,
    graficos: 'Intel UHD 730',
    sprite: 'cpu-intel',
    preco: 54900,
    descricao: 'Barato e com vídeo integrado: bom para escritório e escola.',
  }),
  processador({
    id: 'cpu-lga1700-12400',
    nome: 'Intel Core i5-12400',
    socket: 'LGA1700',
    nucleos: 6,
    threads: 12,
    tdp: 65,
    videoIntegrado: true,
    graficos: 'Intel UHD 730',
    sprite: 'cpu-intel',
    preco: 84900,
    descricao: 'Sem "F" no nome: tem vídeo integrado.',
  }),
  processador({
    id: 'cpu-lga1700-6f',
    nome: 'Intel Core i5-12400F',
    socket: 'LGA1700',
    nucleos: 6,
    threads: 12,
    tdp: 65,
    videoIntegrado: false,
    sprite: 'cpu-intel',
    preco: 74900,
    descricao: 'O "F" no nome indica que NÃO tem vídeo integrado: sem placa de vídeo, o monitor fica preto.',
  }),
  processador({
    id: 'cpu-lga1700-14600k',
    nome: 'Intel Core i5-14600K',
    socket: 'LGA1700',
    nucleos: 14,
    threads: 20,
    tdp: 125,
    videoIntegrado: true,
    graficos: 'Intel UHD 770',
    sprite: 'cpu-intel',
    preco: 169900,
    descricao: '14 núcleos (6 de desempenho + 8 de eficiência), com vídeo integrado. Esquenta: precisa de cooler bom.',
  }),
  processador({
    id: 'cpu-lga1700-14700kf',
    nome: 'Intel Core i7-14700KF',
    socket: 'LGA1700',
    nucleos: 20,
    threads: 28,
    tdp: 125,
    videoIntegrado: false,
    sprite: 'cpu-intel',
    preco: 229900,
    descricao: '20 núcleos, mas o "F" indica que NÃO tem vídeo integrado. Precisa de placa de vídeo e cooler bom.',
  }),
  // Intel LGA1851 (Core Ultra 200S)
  processador({
    id: 'cpu-lga1851-245k',
    nome: 'Intel Core Ultra 5 245K',
    socket: 'LGA1851',
    nucleos: 14,
    threads: 14,
    tdp: 125,
    videoIntegrado: true,
    graficos: 'Intel Graphics (4 núcleos Xe)',
    sprite: 'cpu-intel',
    preco: 189900,
    descricao: 'Plataforma nova da Intel (LGA1851), com vídeo integrado. Só encaixa em placa LGA1851.',
  }),
  processador({
    id: 'cpu-lga1851-265kf',
    nome: 'Intel Core Ultra 7 265KF',
    socket: 'LGA1851',
    nucleos: 20,
    threads: 20,
    tdp: 125,
    videoIntegrado: false,
    sprite: 'cpu-intel',
    preco: 249900,
    descricao: '20 núcleos na plataforma nova (LGA1851). O "F" indica que NÃO tem vídeo integrado.',
  }),

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
  // DDR4 e DDR5 têm o entalhe em posições diferentes: uma não entra no slot da outra.
  memoria({ id: 'ram-ddr4-8', nome: 'Kingston Fury Beast DDR4 8 GB', tipoRam: 'DDR4', gb: 8, mhz: 3200, preco: 14900 }),
  memoria({ id: 'ram-ddr4-16', nome: 'Kingston Fury Beast DDR4 16 GB', tipoRam: 'DDR4', gb: 16, mhz: 3200, preco: 27900 }),
  memoria({ id: 'ram-ddr4-32', nome: 'Corsair Vengeance LPX DDR4 32 GB', tipoRam: 'DDR4', gb: 32, mhz: 3200, preco: 49900 }),
  memoria({ id: 'ram-ddr5-8', nome: 'Kingston Fury Beast DDR5 8 GB', tipoRam: 'DDR5', gb: 8, mhz: 5600, preco: 19900 }),
  memoria({ id: 'ram-ddr5-16', nome: 'Corsair Vengeance DDR5 16 GB', tipoRam: 'DDR5', gb: 16, mhz: 5600, preco: 34900 }),
  memoria({ id: 'ram-ddr5-32', nome: 'XPG Lancer DDR5 32 GB', tipoRam: 'DDR5', gb: 32, mhz: 6000, preco: 59900 }),

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

// ---------------- Montadores (texto dos cartões a partir dos dados técnicos) ----------------
// A quantidade de slots segue o desenho da placa no jogo (2 ou 4 de memória,
// 1 ou 2 M.2) e pode ser diferente do modelo real.

function placa(p) {
  return {
    categoria: 'placa_mae',
    ...p,
    resumo: `${p.socket} · ${p.tipoRam} · ${p.formato === 'Micro-ATX' ? 'mATX' : p.formato}`,
    detalhes: [
      `Socket ${p.socket} (${p.plataforma})`,
      `Memória ${p.tipoRam} · ${p.slotsRam} slots`,
      `${p.slotsM2} ${p.slotsM2 === 1 ? 'slot' : 'slots'} M.2`,
      `Formato ${p.formato}`,
    ],
  };
}

function processador(p) {
  return {
    categoria: 'cpu',
    ...p,
    resumo: p.videoIntegrado ? '✔ Com vídeo integrado' : '✖ SEM vídeo integrado',
    detalhes: [
      `Socket ${p.socket}`,
      `${p.nucleos} núcleos / ${p.threads} threads`,
      `${p.tdp} W`,
      p.videoIntegrado ? `Com vídeo integrado (${p.graficos})` : 'SEM vídeo integrado: precisa de placa de vídeo',
    ],
  };
}

function memoria(p) {
  return {
    categoria: 'ram',
    ...p,
    sprite: p.tipoRam === 'DDR5' ? 'ram-ddr5' : 'ram-ddr4',
    resumo: `${p.tipoRam} · ${p.gb} GB · ${p.mhz} MHz`,
    detalhes: [p.tipoRam, `${p.gb} GB por pente`, `${p.mhz} MHz`],
  };
}

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
