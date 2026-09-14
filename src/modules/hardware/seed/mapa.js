// Estrutura inicial do Mapa de Hardware: níveis, componentes (posição no
// mapa de 0 a 100) e conexões. Só é usada para popular um banco vazio —
// depois disso tudo é editável pelo professor no admin.

const NIVEIS = [
  {
    chave: 'basicos',
    nome: 'Nível 1 — Componentes Básicos',
    descricao: 'As peças por dentro do computador: placa-mãe, processador, memória e companhia.',
    ordem: 1,
  },
  {
    chave: 'perifericos',
    nome: 'Nível 2 — Periféricos',
    descricao: 'O que se conecta ao computador por fora: impressora, webcam, pen drive e mais.',
    ordem: 2,
  },
  {
    chave: 'redes',
    nome: 'Nível 3 — Redes e Internet',
    descricao: 'Como o computador se conecta ao mundo: roteador, modem, nuvem e segurança.',
    ordem: 3,
  },
];

const COMPONENTES = [
  // Nível 1
  { nivel: 'basicos', nome: 'Placa-mãe', icone: '🔌', imagem: '/images/hardware/motherboard.jpg', inicial: true, posX: 50, posY: 46 },
  { nivel: 'basicos', nome: 'Processador (CPU)', icone: '🧠', imagem: '/images/hardware/cpu.jpg', posX: 50, posY: 16 },
  { nivel: 'basicos', nome: 'Cooler', icone: '❄️', imagem: '/images/hardware/cooler.jpg', posX: 76, posY: 12 },
  { nivel: 'basicos', nome: 'Memória RAM', icone: '💭', imagem: '/images/hardware/ram.jpg', posX: 20, posY: 28 },
  { nivel: 'basicos', nome: 'Armazenamento (HD/SSD)', icone: '💾', imagem: '/images/hardware/armazenamento.jpg', posX: 80, posY: 28 },
  { nivel: 'basicos', nome: 'Placa de vídeo (GPU)', icone: '🎮', imagem: '/images/hardware/gpu.jpg', posX: 80, posY: 68 },
  { nivel: 'basicos', nome: 'Monitor', icone: '🖼️', imagem: '/images/hardware/monitor.jpg', posX: 97, posY: 34 },
  { nivel: 'basicos', nome: 'Fonte de Alimentação', icone: '🔋', imagem: '/images/hardware/fonte.jpg', posX: 14, posY: 56 },
  { nivel: 'basicos', nome: 'Gabinete', icone: '🖥️', imagem: '/images/hardware/gabinete.jpg', posX: 50, posY: 76 },
  { nivel: 'basicos', nome: 'Teclado', icone: '⌨️', imagem: '/images/hardware/teclado.jpg', posX: 30, posY: 92 },
  { nivel: 'basicos', nome: 'Mouse', icone: '🖱️', imagem: '/images/hardware/mouse.jpg', posX: 70, posY: 92 },

  // Nível 2
  { nivel: 'perifericos', nome: 'Porta USB', icone: '🔌', inicial: true, posX: 50, posY: 50 },
  { nivel: 'perifericos', nome: 'Pen Drive', icone: '💾', posX: 50, posY: 14 },
  { nivel: 'perifericos', nome: 'Impressora', icone: '🖨️', posX: 80, posY: 24 },
  { nivel: 'perifericos', nome: 'Scanner', icone: '📠', posX: 96, posY: 10 },
  { nivel: 'perifericos', nome: 'Webcam', icone: '📷', posX: 88, posY: 58 },
  { nivel: 'perifericos', nome: 'Headset', icone: '🎧', posX: 66, posY: 86 },
  { nivel: 'perifericos', nome: 'Caixa de Som', icone: '🔊', posX: 34, posY: 86 },
  { nivel: 'perifericos', nome: 'Leitor de Cartão SD', icone: '🗂️', posX: 12, posY: 58 },

  // Nível 3
  { nivel: 'redes', nome: 'Roteador Wi-Fi', icone: '📶', inicial: true, posX: 50, posY: 50 },
  { nivel: 'redes', nome: 'Modem', icone: '📡', posX: 50, posY: 14 },
  { nivel: 'redes', nome: 'Provedor de Internet (ISP)', icone: '🌐', posX: 80, posY: 6 },
  { nivel: 'redes', nome: 'Cabo de Rede (Ethernet)', icone: '🔗', posX: 86, posY: 36 },
  { nivel: 'redes', nome: 'Endereço IP', icone: '🔢', posX: 82, posY: 74 },
  { nivel: 'redes', nome: 'Nuvem (Cloud)', icone: '☁️', posX: 46, posY: 90 },
  { nivel: 'redes', nome: 'Firewall', icone: '🛡️', posX: 14, posY: 70 },
];

const CONEXOES = [
  ['Placa-mãe', 'Processador (CPU)'],
  ['Processador (CPU)', 'Cooler'],
  ['Placa-mãe', 'Memória RAM'],
  ['Placa-mãe', 'Armazenamento (HD/SSD)'],
  ['Placa-mãe', 'Placa de vídeo (GPU)'],
  ['Placa de vídeo (GPU)', 'Monitor'],
  ['Placa-mãe', 'Fonte de Alimentação'],
  ['Placa-mãe', 'Gabinete'],
  ['Gabinete', 'Teclado'],
  ['Gabinete', 'Mouse'],

  ['Porta USB', 'Pen Drive'],
  ['Porta USB', 'Impressora'],
  ['Impressora', 'Scanner'],
  ['Porta USB', 'Webcam'],
  ['Porta USB', 'Headset'],
  ['Porta USB', 'Caixa de Som'],
  ['Porta USB', 'Leitor de Cartão SD'],

  ['Roteador Wi-Fi', 'Modem'],
  ['Modem', 'Provedor de Internet (ISP)'],
  ['Roteador Wi-Fi', 'Cabo de Rede (Ethernet)'],
  ['Roteador Wi-Fi', 'Endereço IP'],
  ['Roteador Wi-Fi', 'Nuvem (Cloud)'],
  ['Roteador Wi-Fi', 'Firewall'],
];

module.exports = { NIVEIS, COMPONENTES, CONEXOES };
