// Categorias de peça. O "nome" é gravado no banco junto com cada peça da
// proposta — não mude o texto sem necessidade.

export const OBRIGATORIAS = [
  { id: 'placa_mae', nome: 'Placa-mãe', icone: '🔌', dica: 'Veja o soquete (ex: AM4, AM5, LGA1700) e o tipo de memória que ela aceita.' },
  { id: 'cpu', nome: 'Processador (CPU)', icone: '🧠', dica: 'O soquete precisa ser o mesmo da placa-mãe.' },
  { id: 'ram', nome: 'Memória RAM', icone: '🧩', dica: 'Veja se é DDR4 ou DDR5 e quantos GB tem.' },
  { id: 'armazenamento', nome: 'Armazenamento (HD/SSD)', icone: '💾', dica: 'SSD é mais rápido que HD. Veja a capacidade (GB ou TB).' },
  { id: 'fonte', nome: 'Fonte de Alimentação', icone: '🔋', dica: 'Veja a potência em watts (W).' },
  { id: 'gabinete', nome: 'Gabinete', icone: '🗄️', dica: 'Veja qual tamanho de placa-mãe cabe nele (ATX, Micro-ATX...).' },
];

export const OPCIONAIS = [
  { id: 'gpu', nome: 'Placa de vídeo (GPU)', rotulo: 'Placa de vídeo', icone: '🎮', dica: 'Importante para jogos e edição de vídeo.' },
  { id: 'cooler', nome: 'Cooler', rotulo: 'Cooler', icone: '❄️', dica: 'Alguns processadores já vêm com cooler na caixa.' },
  { id: 'monitor', nome: 'Monitor', rotulo: 'Monitor', icone: '🖥️', dica: 'Veja o tamanho (polegadas) e a resolução.' },
  { id: 'teclado', nome: 'Teclado', rotulo: 'Teclado', icone: '⌨️', dica: 'Com fio ou sem fio? Mecânico ou comum?' },
  { id: 'mouse', nome: 'Mouse', rotulo: 'Mouse', icone: '🖱️', dica: 'Com fio ou sem fio?' },
  { id: 'extra', nome: 'Outro periférico/extra', rotulo: 'Outro item', icone: '➕', dica: 'Ex: headset, webcam, caixa de som, adaptador Wi-Fi.' },
];

export const MIN_JUSTIFICATIVA = 40;

export const LOJAS = [
  { nome: 'KaBuM', url: 'https://www.kabum.com.br' },
  { nome: 'Terabyte', url: 'https://www.terabyteshop.com.br' },
  { nome: 'Pichau', url: 'https://www.pichau.com.br' },
  { nome: 'MeuPC.net', url: 'https://www.meupc.net' },
];
