require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const TIPOS_VALIDOS = ['digito', 'multipla_escolha', 'verdadeiro_falso'];
const TIPOS_VALIDOS_HW = ['multipla_escolha', 'verdadeiro_falso'];

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      ordem INTEGER NOT NULL DEFAULT 0,
      tipo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      enunciado TEXT NOT NULL DEFAULT '',
      pergunta TEXT NOT NULL DEFAULT '',
      resposta_digito INTEGER,
      ativa BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS question_options (
      id SERIAL PRIMARY KEY,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      texto TEXT NOT NULL,
      correta BOOLEAN NOT NULL DEFAULT FALSE,
      ordem INTEGER NOT NULL DEFAULT 0
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      participantes TEXT NOT NULL,
      turma TEXT NOT NULL,
      respostas JSONB NOT NULL,
      acertos INTEGER NOT NULL,
      total INTEGER NOT NULL,
      completo BOOLEAN NOT NULL DEFAULT FALSE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Mapa de descoberta de componentes de Hardware: cada componente é um nó
  // com uma pergunta de gabarito fechado (múltipla escolha / V-F), e as
  // conexões formam o "mapa" — acertar um componente libera os vizinhos
  // conectados a ele para os alunos.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hw_components (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      icone TEXT NOT NULL DEFAULT '🔧',
      imagem TEXT NOT NULL DEFAULT '',
      tipo TEXT NOT NULL DEFAULT 'multipla_escolha',
      enunciado TEXT NOT NULL DEFAULT '',
      pergunta TEXT NOT NULL DEFAULT '',
      pos_x REAL NOT NULL DEFAULT 50,
      pos_y REAL NOT NULL DEFAULT 50,
      inicial BOOLEAN NOT NULL DEFAULT FALSE,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // Coluna adicionada depois da primeira versão da tabela — em bancos já
  // existentes o CREATE TABLE acima não altera colunas, então garantimos
  // aqui que ela exista.
  await pool.query(`ALTER TABLE hw_components ADD COLUMN IF NOT EXISTS imagem TEXT NOT NULL DEFAULT '';`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hw_component_options (
      id SERIAL PRIMARY KEY,
      component_id INTEGER NOT NULL REFERENCES hw_components(id) ON DELETE CASCADE,
      texto TEXT NOT NULL,
      correta BOOLEAN NOT NULL DEFAULT FALSE,
      ordem INTEGER NOT NULL DEFAULT 0
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hw_connections (
      id SERIAL PRIMARY KEY,
      de_id INTEGER NOT NULL REFERENCES hw_components(id) ON DELETE CASCADE,
      para_id INTEGER NOT NULL REFERENCES hw_components(id) ON DELETE CASCADE,
      CHECK (de_id <> para_id)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hw_answers (
      id SERIAL PRIMARY KEY,
      participantes TEXT NOT NULL,
      turma TEXT NOT NULL,
      component_id INTEGER REFERENCES hw_components(id) ON DELETE SET NULL,
      componente_nome TEXT NOT NULL,
      opcao_id INTEGER,
      opcao_texto TEXT,
      correta BOOLEAN NOT NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Níveis do Mapa de Hardware (Nível 1, 2, 3...) — cada componente pertence
  // a um nível, e um nível só é liberado depois que o anterior é 100%
  // descoberto pelo aluno/turma.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hw_niveis (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      descricao TEXT NOT NULL DEFAULT '',
      ordem INTEGER NOT NULL DEFAULT 0,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE hw_components ADD COLUMN IF NOT EXISTS nivel_id INTEGER REFERENCES hw_niveis(id) ON DELETE SET NULL;`);

  // Banco de perguntas por componente: cada componente pode ter várias
  // perguntas cadastradas, e uma é sorteada a cada vez que o aluno clica no
  // nó. Substitui as colunas tipo/enunciado/pergunta de hw_components e a
  // tabela hw_component_options, que ficam paradas (sem uso) só para não
  // apagar dado de quem já tinha o mapa antigo — a migração em
  // expandirMapaHardwareParaNiveis() copia o conteúdo antigo pra cá.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hw_component_perguntas (
      id SERIAL PRIMARY KEY,
      component_id INTEGER NOT NULL REFERENCES hw_components(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL DEFAULT 'multipla_escolha',
      enunciado TEXT NOT NULL DEFAULT '',
      pergunta TEXT NOT NULL DEFAULT '',
      ordem INTEGER NOT NULL DEFAULT 0
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hw_pergunta_opcoes (
      id SERIAL PRIMARY KEY,
      pergunta_id INTEGER NOT NULL REFERENCES hw_component_perguntas(id) ON DELETE CASCADE,
      texto TEXT NOT NULL,
      correta BOOLEAN NOT NULL DEFAULT FALSE,
      ordem INTEGER NOT NULL DEFAULT 0
    );
  `);
  await pool.query(`ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS pergunta_id INTEGER REFERENCES hw_component_perguntas(id) ON DELETE SET NULL;`);
}

// Perguntas originais do escape room, usadas só para popular o banco na
// primeira vez que o servidor roda (tabela "questions" ainda vazia). Depois
// disso, tudo é gerenciado pelo professor via /admin.html — nada fica preso
// no código.
const PERGUNTAS_INICIAIS = [
  {
    titulo: '🧭 O Animal Navegador',
    enunciado: 'O "Firefox" é um dos navegadores de internet mais conhecidos do mundo. Pesquise a logo dele. Qual animal aparece abraçando o globo terrestre?',
    pergunta: 'Escreva o nome desse animal em português. Quantas letras tem essa palavra?',
    respostaDigito: 6,
  },
  {
    titulo: '📶 O Rei Sem Fio',
    enunciado: 'A tecnologia que conecta nossos celulares aos fones de ouvido sem fio tem um nome curioso: Bluetooth. Pesquise a origem desse nome na internet. Ele foi inspirado em um antigo rei viking que tinha um dente de uma cor bem específica.',
    pergunta: 'Que cor era o dente do rei? Quantas letras tem o nome dessa cor?',
    respostaDigito: 4,
  },
  {
    titulo: '# O Símbolo das Categorias',
    enunciado: 'Quando queremos agrupar um assunto no Instagram, TikTok ou YouTube, usamos o símbolo cerquilha ( # ) antes de uma palavra (ex: #futebol). Essa prática é chamada de Hashtag.',
    pergunta: 'Olhe para o teclado do computador. Qual tecla de número você precisa apertar (junto com o Shift) para fazer o símbolo #?',
    respostaDigito: 3,
  },
  {
    titulo: '🔓 A Pior Senha do Mundo',
    enunciado: 'Todo ano, as empresas de segurança na internet divulgam a lista das senhas mais usadas (e mais facilmente hackeadas) do planeta.',
    pergunta: 'Qual é a senha número 1 mais usada no mundo? (Dica: é uma sequência numérica muito óbvia de seis números). Qual é o último número dessa senha?',
    respostaDigito: 6,
  },
  {
    titulo: '🎬 O Primeiro Vídeo',
    enunciado: 'O primeiro vídeo postado na história do YouTube, em 2005, se chama "Me at the zoo" (Eu no zoológico). Pesquise sobre esse vídeo clássico.',
    pergunta: 'Em frente a qual animal enorme o rapaz do vídeo estava? Escreva o nome do animal e conte: quantas vogais tem o nome desse animal?',
    respostaDigito: 4,
  },
  {
    titulo: '🔍 O Buscador Gigante',
    enunciado: 'O Google é a página inicial da internet para a maioria das pessoas. O nome surgiu de um erro de matemática, inspirado no número "Googol".',
    pergunta: 'Olhe para a palavra GOOGLE. Se você contar apenas as vogais dessa palavra, qual é o total?',
    respostaDigito: 3,
  },
  {
    titulo: '📡 As Ondas de Conexão',
    enunciado: 'O ícone do Wi-Fi é universal. Em qualquer lugar do mundo que você for, ele indicará que há internet sem fio. O símbolo clássico é formado por um pontinho na base e algumas "ondas" curvadas acima dele.',
    pergunta: 'Olhe para o ícone do Wi-Fi no celular ou pesquise na internet. Quantas linhas curvadas existem acima do ponto no ícone clássico completo?',
    respostaDigito: 3,
  },
  {
    titulo: '💾 Arquivos no Céu',
    enunciado: 'Hoje em dia, não precisamos salvar tudo no pen drive. Quando salvamos fotos e arquivos na internet (como no Google Drive), dizemos que eles estão armazenados em um lugar que normalmente fica no céu.',
    pergunta: 'Que lugar é esse? (Dica: "Armazenamento em..."). Quantas letras tem essa palavra?',
    respostaDigito: 5,
  },
  {
    titulo: '🐦 O Pássaro Extinto',
    enunciado: 'Uma das redes sociais mais famosas do mundo mudou de nome recentemente e agora se chama "X". Porém, antes dessa mudança, ela era famosa por ter um passarinho azul como logotipo.',
    pergunta: 'Qual era o antigo nome dessa rede social? Quantas letras "T" (apenas a letra T) existem nessa palavra?',
    respostaDigito: 3,
  },
  {
    titulo: '😀 As Carinhas do Japão',
    enunciado: 'As carinhas e símbolos que usamos nas mensagens de texto (😂, ❤️, 👍) para demonstrar emoções revolucionaram a comunicação na internet. O nome original dessas carinhas surgiu no Japão.',
    pergunta: 'Qual é o nome oficial dessas carinhas? Quantas letras tem essa palavra?',
    respostaDigito: 5,
  },
];

async function seedQuestionsIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM questions');
  if (rows[0].total > 0) return;

  for (let i = 0; i < PERGUNTAS_INICIAIS.length; i++) {
    const p = PERGUNTAS_INICIAIS[i];
    await pool.query(
      `INSERT INTO questions (ordem, tipo, titulo, enunciado, pergunta, resposta_digito)
       VALUES ($1, 'digito', $2, $3, $4, $5)`,
      [i, p.titulo, p.enunciado, p.pergunta, p.respostaDigito]
    );
  }
}

// Componentes iniciais do Mapa de Hardware, usados só para popular o banco
// na primeira vez que o servidor roda (tabela "hw_components" ainda vazia).
// A Placa-mãe é o nó inicial (sempre visível); os demais vão sendo
// liberados conforme os alunos acertam as perguntas dos componentes
// conectados a ela. Depois disso, tudo é editável pelo professor em
// /admin.html, aba "Hardware".
const COMPONENTES_HW_INICIAIS = [
  {
    nome: 'Placa-mãe',
    icone: '🔌',
    imagem: '/images/hardware/motherboard.jpg',
    inicial: true,
    posX: 50,
    posY: 46,
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise para que serve a Placa-mãe (motherboard) dentro do computador — muita gente compara ela a uma parte do nosso corpo, por ligar tudo.',
    pergunta: 'A placa-mãe é comparada a qual parte do corpo humano, por ligar todas as peças do computador entre si?',
    opcoes: [
      { texto: 'Esqueleto', correta: true },
      { texto: 'Cérebro', correta: false },
      { texto: 'Coração', correta: false },
      { texto: 'Pulmão', correta: false },
    ],
  },
  {
    nome: 'Processador (CPU)',
    icone: '🧠',
    imagem: '/images/hardware/cpu.jpg',
    posX: 50,
    posY: 16,
    tipo: 'verdadeiro_falso',
    enunciado: 'Pesquise para que serve o Processador (CPU) dentro do computador.',
    pergunta: 'O processador (CPU) é conhecido como o "cérebro" do computador.',
    opcoes: [
      { texto: 'Verdadeiro', correta: true },
      { texto: 'Falso', correta: false },
    ],
  },
  {
    nome: 'Cooler',
    icone: '❄️',
    imagem: '/images/hardware/cooler.jpg',
    posX: 76,
    posY: 12,
    tipo: 'verdadeiro_falso',
    enunciado: 'Pesquise o que pode acontecer com o processador quando ele trabalha muito, e por que ele precisa do Cooler.',
    pergunta: 'O cooler serve para resfriar o processador e evitar que ele superaqueça.',
    opcoes: [
      { texto: 'Verdadeiro', correta: true },
      { texto: 'Falso', correta: false },
    ],
  },
  {
    nome: 'Memória RAM',
    icone: '💭',
    imagem: '/images/hardware/ram.jpg',
    posX: 20,
    posY: 28,
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise o que a Memória RAM guarda enquanto o computador está ligado.',
    pergunta: 'O que acontece com as informações da memória RAM quando o computador é desligado?',
    opcoes: [
      { texto: 'Elas são apagadas', correta: true },
      { texto: 'Ficam guardadas para sempre', correta: false },
      { texto: 'Vão direto para a internet', correta: false },
      { texto: 'Viram um arquivo de música', correta: false },
    ],
  },
  {
    nome: 'Armazenamento (HD/SSD)',
    icone: '💾',
    imagem: '/images/hardware/armazenamento.jpg',
    posX: 80,
    posY: 28,
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise a diferença entre o HD (Disco Rígido) e o SSD.',
    pergunta: 'Qual desses tipos de armazenamento costuma ser mais rápido para abrir arquivos e programas?',
    opcoes: [
      { texto: 'SSD', correta: true },
      { texto: 'HD', correta: false },
      { texto: 'Pen drive', correta: false },
      { texto: 'CD-ROM', correta: false },
    ],
  },
  {
    nome: 'Placa de vídeo (GPU)',
    icone: '🎮',
    imagem: '/images/hardware/gpu.jpg',
    posX: 82,
    posY: 60,
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise para que serve a Placa de Vídeo (GPU) no computador.',
    pergunta: 'Qual é a principal função da placa de vídeo (GPU)?',
    opcoes: [
      { texto: 'Processar as imagens e os gráficos que aparecem na tela', correta: true },
      { texto: 'Conectar o computador à internet', correta: false },
      { texto: 'Guardar arquivos permanentemente', correta: false },
      { texto: 'Resfriar o processador', correta: false },
    ],
  },
  {
    nome: 'Monitor',
    icone: '🖼️',
    imagem: '/images/hardware/monitor.jpg',
    posX: 94,
    posY: 40,
    tipo: 'verdadeiro_falso',
    enunciado: 'Pesquise se o Monitor é um dispositivo de entrada (que manda informação PARA o computador) ou de saída (que MOSTRA informação do computador).',
    pergunta: 'O monitor é um dispositivo de saída (output), pois mostra as informações processadas pelo computador.',
    opcoes: [
      { texto: 'Verdadeiro', correta: true },
      { texto: 'Falso', correta: false },
    ],
  },
  {
    nome: 'Fonte de Alimentação',
    icone: '🔋',
    imagem: '/images/hardware/fonte.jpg',
    posX: 14,
    posY: 56,
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise qual é a função da Fonte de Alimentação dentro do computador.',
    pergunta: 'Qual é a função da fonte de alimentação?',
    opcoes: [
      { texto: 'Converter a energia da tomada para o computador poder usar', correta: true },
      { texto: 'Guardar os arquivos do computador', correta: false },
      { texto: 'Resfriar o processador', correta: false },
      { texto: 'Conectar o mouse e o teclado', correta: false },
    ],
  },
  {
    nome: 'Gabinete',
    icone: '🖥️',
    imagem: '/images/hardware/gabinete.jpg',
    posX: 50,
    posY: 76,
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise qual é a função do Gabinete, a "caixa" que forma o computador.',
    pergunta: 'Qual é a função do gabinete?',
    opcoes: [
      { texto: 'Proteger e organizar todos os componentes internos do computador', correta: true },
      { texto: 'Aumentar a velocidade da internet', correta: false },
      { texto: 'Guardar as senhas do usuário', correta: false },
      { texto: 'Deixar o computador mais rápido', correta: false },
    ],
  },
  {
    nome: 'Teclado',
    icone: '⌨️',
    imagem: '/images/hardware/teclado.jpg',
    posX: 30,
    posY: 92,
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise se o Teclado é um dispositivo de entrada ou de saída de informações.',
    pergunta: 'O teclado é um dispositivo de qual tipo?',
    opcoes: [
      { texto: 'Entrada (input)', correta: true },
      { texto: 'Saída (output)', correta: false },
      { texto: 'Armazenamento', correta: false },
      { texto: 'Processamento', correta: false },
    ],
  },
  {
    nome: 'Mouse',
    icone: '🖱️',
    imagem: '/images/hardware/mouse.jpg',
    posX: 70,
    posY: 92,
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise sobre a origem do nome "mouse" (que significa "rato" em inglês) para esse periférico de computador.',
    pergunta: 'Por que esse periférico ficou conhecido como "mouse" (rato)?',
    opcoes: [
      { texto: 'Porque seu formato e o fio lembravam um rato com rabo', correta: true },
      { texto: 'Porque foi inventado por um cientista chamado Douglas Mouse', correta: false },
      { texto: 'Porque ele emite um som parecido com um rato', correta: false },
      { texto: 'Porque foi criado para caçar vírus de computador', correta: false },
    ],
  },
];

const CONEXOES_HW_INICIAIS = [
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
];

// Segunda pergunta de cada componente do Nível 1 (a primeira é migrada das
// colunas antigas de hw_components por expandirMapaHardwareParaNiveis()).
// Chave = nome do componente, igual ao usado em COMPONENTES_HW_INICIAIS.
const PERGUNTAS_EXTRA_NIVEL_1 = {
  'Placa-mãe': {
    tipo: 'verdadeiro_falso',
    enunciado: 'Pesquise onde a placa-mãe fica localizada dentro do gabinete e por que ela é considerada a base de tudo.',
    pergunta: 'Sem a placa-mãe conectando as peças, o processador, a memória RAM e a placa de vídeo não conseguem se comunicar entre si.',
    opcoes: [
      { texto: 'Verdadeiro', correta: true },
      { texto: 'Falso', correta: false },
    ],
  },
  'Processador (CPU)': {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise o que significa a sigla CPU em inglês.',
    pergunta: 'O que a sigla CPU significa?',
    opcoes: [
      { texto: 'Central Processing Unit', correta: true },
      { texto: 'Computer Power Unit', correta: false },
      { texto: 'Central Program Utility', correta: false },
      { texto: 'Compact Processing USB', correta: false },
    ],
  },
  Cooler: {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise quais são os tipos mais comuns de resfriamento para o processador, além do cooler a ar com ventoinha.',
    pergunta: 'Qual outro tipo de resfriamento, além do cooler a ar, é comum em computadores?',
    opcoes: [
      { texto: 'Water cooler (resfriamento líquido)', correta: true },
      { texto: 'Cooler a vácuo', correta: false },
      { texto: 'Cooler solar', correta: false },
      { texto: 'Cooler magnético', correta: false },
    ],
  },
  'Memória RAM': {
    tipo: 'verdadeiro_falso',
    enunciado: 'Pesquise a diferença de velocidade entre a memória RAM e o armazenamento (HD/SSD).',
    pergunta: 'A memória RAM costuma ser muito mais rápida que o HD ou o SSD para o processador acessar dados.',
    opcoes: [
      { texto: 'Verdadeiro', correta: true },
      { texto: 'Falso', correta: false },
    ],
  },
  'Armazenamento (HD/SSD)': {
    tipo: 'verdadeiro_falso',
    enunciado: 'Pesquise se o SSD (Solid State Drive) tem peças mecânicas girando como o HD tradicional.',
    pergunta: 'O SSD não tem discos girando como o HD — ele guarda os dados em chips de memória, por isso costuma ser mais rápido e silencioso.',
    opcoes: [
      { texto: 'Verdadeiro', correta: true },
      { texto: 'Falso', correta: false },
    ],
  },
  'Placa de vídeo (GPU)': {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise por que jogos, edição de vídeo e design gráfico precisam de uma placa de vídeo potente.',
    pergunta: 'Para quais atividades uma placa de vídeo (GPU) potente é mais importante?',
    opcoes: [
      { texto: 'Jogos, edição de vídeo e design gráfico', correta: true },
      { texto: 'Só para digitar textos', correta: false },
      { texto: 'Só para navegar em sites simples', correta: false },
      { texto: 'Só para ouvir música', correta: false },
    ],
  },
  Monitor: {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise o que significa a taxa de atualização de um monitor, medida em Hz (Hertz).',
    pergunta: 'O que a taxa de atualização (Hz) de um monitor indica?',
    opcoes: [
      { texto: 'Quantas vezes a imagem é atualizada na tela por segundo', correta: true },
      { texto: 'O tamanho da tela em polegadas', correta: false },
      { texto: 'A quantidade de cores que a tela mostra', correta: false },
      { texto: 'O consumo de energia do monitor', correta: false },
    ],
  },
  'Fonte de Alimentação': {
    tipo: 'verdadeiro_falso',
    enunciado: 'Pesquise o que aconteceria com o computador se a fonte de alimentação parasse de funcionar.',
    pergunta: 'Sem a fonte de alimentação funcionando corretamente, o computador não liga nem os outros componentes recebem energia.',
    opcoes: [
      { texto: 'Verdadeiro', correta: true },
      { texto: 'Falso', correta: false },
    ],
  },
  Gabinete: {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise por que os gabinetes costumam ter ventoinhas extras, além do cooler do processador.',
    pergunta: 'Qual é a função das ventoinhas extras no gabinete?',
    opcoes: [
      { texto: 'Ajudar a circular o ar e manter os componentes resfriados', correta: true },
      { texto: 'Deixar o computador mais silencioso', correta: false },
      { texto: 'Aumentar a velocidade da internet', correta: false },
      { texto: 'Guardar arquivos extras', correta: false },
    ],
  },
  Teclado: {
    tipo: 'verdadeiro_falso',
    enunciado: 'Pesquise a origem do layout de teclado mais usado no mundo, chamado QWERTY.',
    pergunta: "O nome 'QWERTY' vem das seis primeiras letras da fileira superior de letras do teclado.",
    opcoes: [
      { texto: 'Verdadeiro', correta: true },
      { texto: 'Falso', correta: false },
    ],
  },
  Mouse: {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise como o mouse óptico detecta o movimento, sem precisar da bolinha dos mouses antigos.',
    pergunta: 'Como o mouse óptico (sem bolinha) detecta o movimento na mesa?',
    opcoes: [
      { texto: 'Usando uma luz (sensor óptico) que analisa a superfície várias vezes por segundo', correta: true },
      { texto: 'Usando um ímã que gruda na mesa', correta: false },
      { texto: 'Usando bluetooth para calcular a distância', correta: false },
      { texto: 'Usando um giroscópio como o de celular', correta: false },
    ],
  },
};

// Nível 2 — Periféricos: tudo que se conecta ao computador "por fora",
// pendurado na Porta USB (nó inicial deste nível).
const COMPONENTES_NIVEL_2 = [
  {
    nome: 'Porta USB',
    icone: '🔌',
    inicial: true,
    posX: 50,
    posY: 50,
    perguntas: [
      {
        tipo: 'multipla_escolha',
        enunciado: 'Pesquise o que a sigla USB significa e para que ela serve.',
        pergunta: 'O que a sigla USB significa?',
        opcoes: [
          { texto: 'Universal Serial Bus', correta: true },
          { texto: 'United System Board', correta: false },
          { texto: 'Ultra Speed Byte', correta: false },
          { texto: 'Universal Screen Backup', correta: false },
        ],
      },
      {
        tipo: 'verdadeiro_falso',
        enunciado: 'Pesquise se dá para conectar vários tipos diferentes de periféricos na mesma porta USB.',
        pergunta: 'A porta USB é usada por muitos tipos diferentes de periféricos, como pen drives, teclados, mouses e impressoras.',
        opcoes: [
          { texto: 'Verdadeiro', correta: true },
          { texto: 'Falso', correta: false },
        ],
      },
    ],
  },
  {
    nome: 'Pen Drive',
    icone: '💾',
    posX: 50,
    posY: 14,
    perguntas: [
      {
        tipo: 'verdadeiro_falso',
        enunciado: 'Pesquise se o pen drive perde os arquivos guardados quando é desconectado do computador.',
        pergunta: 'Os arquivos guardados em um pen drive continuam salvos mesmo depois de desconectá-lo do computador.',
        opcoes: [
          { texto: 'Verdadeiro', correta: true },
          { texto: 'Falso', correta: false },
        ],
      },
      {
        tipo: 'multipla_escolha',
        enunciado: 'Pesquise para que serve um pen drive.',
        pergunta: 'Qual é a principal função de um pen drive?',
        opcoes: [
          { texto: 'Guardar e transportar arquivos entre computadores', correta: true },
          { texto: 'Aumentar a velocidade do processador', correta: false },
          { texto: 'Conectar o computador à internet', correta: false },
          { texto: 'Resfriar os componentes internos', correta: false },
        ],
      },
    ],
  },
  {
    nome: 'Impressora',
    icone: '🖨️',
    posX: 80,
    posY: 24,
    perguntas: [
      {
        tipo: 'multipla_escolha',
        enunciado: 'Pesquise a diferença entre impressora jato de tinta e impressora a laser.',
        pergunta: 'O que uma impressora faz?',
        opcoes: [
          { texto: 'Transforma arquivos digitais em documentos impressos no papel', correta: true },
          { texto: 'Digitaliza documentos de papel para o computador', correta: false },
          { texto: 'Grava arquivos em um pen drive', correta: false },
          { texto: 'Conecta o computador à internet', correta: false },
        ],
      },
      {
        tipo: 'verdadeiro_falso',
        enunciado: 'Pesquise se todas as impressoras usam tinta líquida para imprimir.',
        pergunta: 'Além das impressoras a jato de tinta, existem impressoras a laser, que usam um pó chamado toner em vez de tinta líquida.',
        opcoes: [
          { texto: 'Verdadeiro', correta: true },
          { texto: 'Falso', correta: false },
        ],
      },
    ],
  },
  {
    nome: 'Scanner',
    icone: '📠',
    posX: 96,
    posY: 10,
    perguntas: [
      {
        tipo: 'multipla_escolha',
        enunciado: 'Pesquise para que serve um scanner.',
        pergunta: 'Qual é a função de um scanner?',
        opcoes: [
          { texto: 'Transformar um documento de papel em um arquivo digital (como uma imagem)', correta: true },
          { texto: 'Imprimir documentos no papel', correta: false },
          { texto: 'Guardar arquivos permanentemente', correta: false },
          { texto: 'Aumentar o volume do som', correta: false },
        ],
      },
      {
        tipo: 'verdadeiro_falso',
        enunciado: 'Pesquise se o scanner é considerado um dispositivo de entrada (que manda informação PARA o computador) ou de saída.',
        pergunta: 'O scanner é um dispositivo de entrada, pois envia a imagem digitalizada para o computador.',
        opcoes: [
          { texto: 'Verdadeiro', correta: true },
          { texto: 'Falso', correta: false },
        ],
      },
    ],
  },
  {
    nome: 'Webcam',
    icone: '📷',
    posX: 88,
    posY: 58,
    perguntas: [
      {
        tipo: 'multipla_escolha',
        enunciado: 'Pesquise para que serve uma webcam.',
        pergunta: 'Para que uma webcam é usada?',
        opcoes: [
          { texto: 'Capturar vídeo e imagem para videochamadas e gravações', correta: true },
          { texto: 'Imprimir fotos', correta: false },
          { texto: 'Guardar arquivos na nuvem', correta: false },
          { texto: 'Aumentar a memória RAM', correta: false },
        ],
      },
      {
        tipo: 'verdadeiro_falso',
        enunciado: 'Pesquise se a webcam é um dispositivo de entrada ou de saída de informações.',
        pergunta: 'A webcam é um dispositivo de entrada (input), pois captura imagens e envia para o computador.',
        opcoes: [
          { texto: 'Verdadeiro', correta: true },
          { texto: 'Falso', correta: false },
        ],
      },
    ],
  },
  {
    nome: 'Headset',
    icone: '🎧',
    posX: 66,
    posY: 86,
    perguntas: [
      {
        tipo: 'multipla_escolha',
        enunciado: 'Pesquise o que diferencia um headset de um fone de ouvido comum.',
        pergunta: 'O que um headset tem que um fone de ouvido comum normalmente não tem?',
        opcoes: [
          { texto: 'Um microfone embutido', correta: true },
          { texto: 'Uma tela de vídeo', correta: false },
          { texto: 'Um teclado embutido', correta: false },
          { texto: 'Uma bateria de longa duração', correta: false },
        ],
      },
      {
        tipo: 'verdadeiro_falso',
        enunciado: 'Pesquise se o headset consegue enviar E receber informação de áudio ao mesmo tempo.',
        pergunta: 'O headset funciona tanto como dispositivo de saída (fone, para ouvir) quanto de entrada (microfone, para falar).',
        opcoes: [
          { texto: 'Verdadeiro', correta: true },
          { texto: 'Falso', correta: false },
        ],
      },
    ],
  },
  {
    nome: 'Caixa de Som',
    icone: '🔊',
    posX: 34,
    posY: 86,
    perguntas: [
      {
        tipo: 'verdadeiro_falso',
        enunciado: 'Pesquise se a caixa de som é um dispositivo de entrada ou de saída de informações.',
        pergunta: 'A caixa de som é um dispositivo de saída (output), pois reproduz o som que o computador processa.',
        opcoes: [
          { texto: 'Verdadeiro', correta: true },
          { texto: 'Falso', correta: false },
        ],
      },
      {
        tipo: 'multipla_escolha',
        enunciado: 'Pesquise como as caixas de som costumam se conectar ao computador.',
        pergunta: 'De quais formas uma caixa de som pode se conectar a um computador?',
        opcoes: [
          { texto: 'Por cabo (P2/USB) ou sem fio (Bluetooth)', correta: true },
          { texto: 'Só por cartão de memória', correta: false },
          { texto: 'Só por cabo de rede', correta: false },
          { texto: 'Só por infravermelho', correta: false },
        ],
      },
    ],
  },
  {
    nome: 'Leitor de Cartão SD',
    icone: '🗂️',
    posX: 12,
    posY: 58,
    perguntas: [
      {
        tipo: 'multipla_escolha',
        enunciado: 'Pesquise onde os cartões de memória SD costumam ser usados, além do computador.',
        pergunta: 'Onde os cartões de memória SD são usados com mais frequência?',
        opcoes: [
          { texto: 'Câmeras fotográficas, celulares e drones', correta: true },
          { texto: 'Só em impressoras', correta: false },
          { texto: 'Só em monitores', correta: false },
          { texto: 'Só em fontes de alimentação', correta: false },
        ],
      },
      {
        tipo: 'verdadeiro_falso',
        enunciado: 'Pesquise para que serve um leitor de cartão SD conectado ao computador.',
        pergunta: 'O leitor de cartão SD permite que o computador acesse os arquivos guardados em um cartão de memória.',
        opcoes: [
          { texto: 'Verdadeiro', correta: true },
          { texto: 'Falso', correta: false },
        ],
      },
    ],
  },
];

const CONEXOES_NIVEL_2 = [
  ['Porta USB', 'Pen Drive'],
  ['Porta USB', 'Impressora'],
  ['Impressora', 'Scanner'],
  ['Porta USB', 'Webcam'],
  ['Porta USB', 'Headset'],
  ['Porta USB', 'Caixa de Som'],
  ['Porta USB', 'Leitor de Cartão SD'],
];

// Nível 3 — Redes e Internet: mais conceitual, bom para aumentar a
// dificuldade depois que os alunos já dominam os componentes físicos.
const COMPONENTES_NIVEL_3 = [
  {
    nome: 'Roteador Wi-Fi',
    icone: '📶',
    inicial: true,
    posX: 50,
    posY: 50,
    perguntas: [
      {
        tipo: 'multipla_escolha',
        enunciado: 'Pesquise para que serve um roteador Wi-Fi em uma casa ou escola.',
        pergunta: 'Qual é a principal função de um roteador Wi-Fi?',
        opcoes: [
          { texto: 'Distribuir o sinal de internet sem fio para vários dispositivos', correta: true },
          { texto: 'Guardar arquivos na nuvem', correta: false },
          { texto: 'Imprimir documentos', correta: false },
          { texto: 'Resfriar o computador', correta: false },
        ],
      },
      {
        tipo: 'verdadeiro_falso',
        enunciado: 'Pesquise se um roteador Wi-Fi consegue conectar mais de um dispositivo à internet ao mesmo tempo.',
        pergunta: 'Um roteador Wi-Fi permite que vários dispositivos (celulares, computadores, tablets) fiquem conectados à internet ao mesmo tempo.',
        opcoes: [
          { texto: 'Verdadeiro', correta: true },
          { texto: 'Falso', correta: false },
        ],
      },
    ],
  },
  {
    nome: 'Modem',
    icone: '📡',
    posX: 50,
    posY: 14,
    perguntas: [
      {
        tipo: 'multipla_escolha',
        enunciado: 'Pesquise a diferença entre o modem e o roteador.',
        pergunta: 'Qual é a função do modem?',
        opcoes: [
          { texto: 'Converter o sinal que vem do provedor de internet para um formato que a casa consegue usar', correta: true },
          { texto: 'Guardar as senhas de Wi-Fi', correta: false },
          { texto: 'Aumentar a velocidade do processador', correta: false },
          { texto: 'Imprimir documentos', correta: false },
        ],
      },
      {
        tipo: 'verdadeiro_falso',
        enunciado: 'Pesquise se modem e roteador são sempre o mesmo aparelho.',
        pergunta: 'Em muitas casas, o modem e o roteador vêm juntos em um único aparelho, mas tecnicamente são funções diferentes.',
        opcoes: [
          { texto: 'Verdadeiro', correta: true },
          { texto: 'Falso', correta: false },
        ],
      },
    ],
  },
  {
    nome: 'Provedor de Internet (ISP)',
    icone: '🌐',
    posX: 80,
    posY: 6,
    perguntas: [
      {
        tipo: 'multipla_escolha',
        enunciado: 'Pesquise o que é um provedor de internet (ISP) e qual é a função dele.',
        pergunta: 'O que é um provedor de internet (ISP)?',
        opcoes: [
          { texto: 'Uma empresa que fornece a conexão de internet para casas e empresas', correta: true },
          { texto: 'Um programa que remove vírus do computador', correta: false },
          { texto: 'Um tipo de cabo de rede', correta: false },
          { texto: 'Um site de pesquisa', correta: false },
        ],
      },
      {
        tipo: 'verdadeiro_falso',
        enunciado: 'Pesquise se é possível ter internet em casa sem contratar um provedor (ISP).',
        pergunta: 'Para ter acesso à internet em casa, normalmente é preciso contratar um provedor de internet (ISP).',
        opcoes: [
          { texto: 'Verdadeiro', correta: true },
          { texto: 'Falso', correta: false },
        ],
      },
    ],
  },
  {
    nome: 'Cabo de Rede (Ethernet)',
    icone: '🔗',
    posX: 86,
    posY: 36,
    perguntas: [
      {
        tipo: 'verdadeiro_falso',
        enunciado: 'Pesquise se a conexão por cabo de rede costuma ser mais estável que o Wi-Fi.',
        pergunta: 'A conexão por cabo de rede (Ethernet) costuma ser mais estável e rápida do que a conexão sem fio (Wi-Fi).',
        opcoes: [
          { texto: 'Verdadeiro', correta: true },
          { texto: 'Falso', correta: false },
        ],
      },
      {
        tipo: 'multipla_escolha',
        enunciado: 'Pesquise o nome do tipo de conector usado nas pontas de um cabo de rede.',
        pergunta: 'Como se chama o conector usado nas pontas do cabo de rede (Ethernet)?',
        opcoes: [
          { texto: 'RJ-45', correta: true },
          { texto: 'USB-C', correta: false },
          { texto: 'HDMI', correta: false },
          { texto: 'P2', correta: false },
        ],
      },
    ],
  },
  {
    nome: 'Endereço IP',
    icone: '🔢',
    posX: 82,
    posY: 74,
    perguntas: [
      {
        tipo: 'multipla_escolha',
        enunciado: 'Pesquise o que é um endereço IP e para que ele serve na internet.',
        pergunta: 'Para que serve um endereço IP?',
        opcoes: [
          { texto: 'Identificar um dispositivo dentro de uma rede ou na internet', correta: true },
          { texto: 'Guardar fotos e vídeos', correta: false },
          { texto: 'Aumentar a velocidade da internet', correta: false },
          { texto: 'Proteger contra vírus', correta: false },
        ],
      },
      {
        tipo: 'verdadeiro_falso',
        enunciado: 'Pesquise se cada dispositivo conectado à internet tem um endereço IP.',
        pergunta: 'Assim como uma casa tem um endereço para receber correspondências, um dispositivo na internet tem um endereço IP para receber e enviar dados.',
        opcoes: [
          { texto: 'Verdadeiro', correta: true },
          { texto: 'Falso', correta: false },
        ],
      },
    ],
  },
  {
    nome: 'Nuvem (Cloud)',
    icone: '☁️',
    posX: 46,
    posY: 90,
    perguntas: [
      {
        tipo: 'multipla_escolha',
        enunciado: "Pesquise o que significa guardar arquivos 'na nuvem'.",
        pergunta: "O que realmente é a 'nuvem' (cloud)?",
        opcoes: [
          { texto: 'Servidores de computadores conectados à internet, guardados em outro lugar', correta: true },
          { texto: 'Um tipo de memória RAM mais rápida', correta: false },
          { texto: 'Um cabo especial de rede', correta: false },
          { texto: 'Um vírus de computador inofensivo', correta: false },
        ],
      },
      {
        tipo: 'verdadeiro_falso',
        enunciado: 'Pesquise se é preciso estar conectado à internet para acessar arquivos guardados na nuvem.',
        pergunta: 'Para acessar arquivos guardados na nuvem, normalmente é preciso ter uma conexão com a internet.',
        opcoes: [
          { texto: 'Verdadeiro', correta: true },
          { texto: 'Falso', correta: false },
        ],
      },
    ],
  },
  {
    nome: 'Firewall',
    icone: '🛡️',
    posX: 14,
    posY: 70,
    perguntas: [
      {
        tipo: 'multipla_escolha',
        enunciado: 'Pesquise para que serve um firewall na segurança de uma rede.',
        pergunta: 'Qual é a principal função de um firewall?',
        opcoes: [
          { texto: 'Filtrar o tráfego da rede e bloquear acessos não autorizados', correta: true },
          { texto: 'Aumentar a velocidade do Wi-Fi', correta: false },
          { texto: 'Guardar senhas na nuvem', correta: false },
          { texto: 'Imprimir relatórios de uso da internet', correta: false },
        ],
      },
      {
        tipo: 'verdadeiro_falso',
        enunciado: "Pesquise se o nome 'firewall' (parede de fogo, em inglês) tem relação com a ideia de proteção contra ameaças.",
        pergunta: "O nome 'firewall' vem da ideia de uma parede que impede que um incêndio (ameaça) se espalhe de um lado para o outro.",
        opcoes: [
          { texto: 'Verdadeiro', correta: true },
          { texto: 'Falso', correta: false },
        ],
      },
    ],
  },
];

const CONEXOES_NIVEL_3 = [
  ['Roteador Wi-Fi', 'Modem'],
  ['Modem', 'Provedor de Internet (ISP)'],
  ['Roteador Wi-Fi', 'Cabo de Rede (Ethernet)'],
  ['Roteador Wi-Fi', 'Endereço IP'],
  ['Roteador Wi-Fi', 'Nuvem (Cloud)'],
  ['Roteador Wi-Fi', 'Firewall'],
];

async function seedHardwareIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM hw_components');
  if (rows[0].total > 0) return;

  const idsPorNome = {};

  for (const c of COMPONENTES_HW_INICIAIS) {
    const { rows: inseridos } = await pool.query(
      `INSERT INTO hw_components (nome, icone, imagem, tipo, enunciado, pergunta, pos_x, pos_y, inicial)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [c.nome, c.icone, c.imagem || '', c.tipo, c.enunciado, c.pergunta, c.posX, c.posY, Boolean(c.inicial)]
    );
    const id = inseridos[0].id;
    idsPorNome[c.nome] = id;

    for (let i = 0; i < c.opcoes.length; i++) {
      const o = c.opcoes[i];
      await pool.query(
        `INSERT INTO hw_component_options (component_id, texto, correta, ordem) VALUES ($1, $2, $3, $4)`,
        [id, o.texto, o.correta, i]
      );
    }
  }

  for (const [deNome, paraNome] of CONEXOES_HW_INICIAIS) {
    await pool.query(`INSERT INTO hw_connections (de_id, para_id) VALUES ($1, $2)`, [
      idsPorNome[deNome],
      idsPorNome[paraNome],
    ]);
  }
}

// Insere um componente novo (já no formato "banco de perguntas") junto com
// suas perguntas e opções, dentro de uma transação. Usado tanto para o
// conteúdo novo do Nível 2/3 quanto reaproveitável por outras seeds futuras.
async function inserirComponenteHw(client, nivelId, dados) {
  const { rows } = await client.query(
    `INSERT INTO hw_components (nome, icone, imagem, pos_x, pos_y, inicial, nivel_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [dados.nome, dados.icone, dados.imagem || '', dados.posX, dados.posY, Boolean(dados.inicial), nivelId]
  );
  const componentId = rows[0].id;

  for (let i = 0; i < dados.perguntas.length; i++) {
    const p = dados.perguntas[i];
    const { rows: perguntaRows } = await client.query(
      `INSERT INTO hw_component_perguntas (component_id, tipo, enunciado, pergunta, ordem)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [componentId, p.tipo, p.enunciado, p.pergunta, i]
    );
    const perguntaId = perguntaRows[0].id;
    for (let j = 0; j < p.opcoes.length; j++) {
      const o = p.opcoes[j];
      await client.query(
        `INSERT INTO hw_pergunta_opcoes (pergunta_id, texto, correta, ordem) VALUES ($1, $2, $3, $4)`,
        [perguntaId, o.texto, o.correta, j]
      );
    }
  }

  return componentId;
}

// Cria os 3 níveis do Mapa de Hardware, migra o conteúdo antigo (1 pergunta
// por componente, direto nas colunas de hw_components) para o banco de
// perguntas novo, acrescenta uma segunda pergunta a cada componente do
// Nível 1, e insere os componentes/perguntas/conexões novos dos Níveis 2 e
// 3. Roda uma única vez (guardada por hw_niveis estar vazia) — tanto faz se
// o banco é novo ou se já tinha o mapa antigo de antes desta migração.
async function expandirMapaHardwareParaNiveis() {
  const { rows: niveisExistentes } = await pool.query('SELECT COUNT(*)::int AS total FROM hw_niveis');
  if (niveisExistentes[0].total > 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: nivel1Rows } = await client.query(
      `INSERT INTO hw_niveis (nome, descricao, ordem) VALUES ($1, $2, 1) RETURNING id`,
      ['Nível 1 — Componentes Básicos', 'As peças por dentro do computador: placa-mãe, processador, memória e companhia.']
    );
    const nivel1Id = nivel1Rows[0].id;

    const { rows: nivel2Rows } = await client.query(
      `INSERT INTO hw_niveis (nome, descricao, ordem) VALUES ($1, $2, 2) RETURNING id`,
      ['Nível 2 — Periféricos', 'O que se conecta ao computador por fora: impressora, webcam, pen drive e mais.']
    );
    const nivel2Id = nivel2Rows[0].id;

    const { rows: nivel3Rows } = await client.query(
      `INSERT INTO hw_niveis (nome, descricao, ordem) VALUES ($1, $2, 3) RETURNING id`,
      ['Nível 3 — Redes e Internet', 'Como o computador se conecta ao mundo: roteador, modem, nuvem e mais.']
    );
    const nivel3Id = nivel3Rows[0].id;

    // Componentes que já existiam (do banco novo recém-semeado ou de um
    // banco de dev anterior à Fase 2) entram todos no Nível 1.
    await client.query(`UPDATE hw_components SET nivel_id=$1 WHERE nivel_id IS NULL`, [nivel1Id]);

    // Migra a pergunta única antiga de cada componente do Nível 1 (se ainda
    // não tiver nenhuma no banco de perguntas novo) e acrescenta a segunda.
    const { rows: componentesNivel1 } = await client.query(
      `SELECT id, nome, tipo, enunciado, pergunta FROM hw_components
       WHERE nivel_id = $1 AND id NOT IN (SELECT DISTINCT component_id FROM hw_component_perguntas)`,
      [nivel1Id]
    );

    for (const c of componentesNivel1) {
      const { rows: perguntaRows } = await client.query(
        `INSERT INTO hw_component_perguntas (component_id, tipo, enunciado, pergunta, ordem)
         VALUES ($1, $2, $3, $4, 0) RETURNING id`,
        [c.id, c.tipo, c.enunciado, c.pergunta]
      );
      const perguntaId = perguntaRows[0].id;

      const { rows: opcoesAntigas } = await client.query(
        `SELECT texto, correta, ordem FROM hw_component_options WHERE component_id=$1 ORDER BY ordem, id`,
        [c.id]
      );
      for (const o of opcoesAntigas) {
        await client.query(
          `INSERT INTO hw_pergunta_opcoes (pergunta_id, texto, correta, ordem) VALUES ($1, $2, $3, $4)`,
          [perguntaId, o.texto, o.correta, o.ordem]
        );
      }

      const extra = PERGUNTAS_EXTRA_NIVEL_1[c.nome];
      if (extra) {
        const { rows: extraRows } = await client.query(
          `INSERT INTO hw_component_perguntas (component_id, tipo, enunciado, pergunta, ordem)
           VALUES ($1, $2, $3, $4, 1) RETURNING id`,
          [c.id, extra.tipo, extra.enunciado, extra.pergunta]
        );
        const extraPerguntaId = extraRows[0].id;
        for (let i = 0; i < extra.opcoes.length; i++) {
          const o = extra.opcoes[i];
          await client.query(
            `INSERT INTO hw_pergunta_opcoes (pergunta_id, texto, correta, ordem) VALUES ($1, $2, $3, $4)`,
            [extraPerguntaId, o.texto, o.correta, i]
          );
        }
      }
    }

    const idsNivel2 = {};
    for (const dados of COMPONENTES_NIVEL_2) {
      idsNivel2[dados.nome] = await inserirComponenteHw(client, nivel2Id, dados);
    }
    for (const [deNome, paraNome] of CONEXOES_NIVEL_2) {
      await client.query(`INSERT INTO hw_connections (de_id, para_id) VALUES ($1, $2)`, [
        idsNivel2[deNome],
        idsNivel2[paraNome],
      ]);
    }

    const idsNivel3 = {};
    for (const dados of COMPONENTES_NIVEL_3) {
      idsNivel3[dados.nome] = await inserirComponenteHw(client, nivel3Id, dados);
    }
    for (const [deNome, paraNome] of CONEXOES_NIVEL_3) {
      await client.query(`INSERT INTO hw_connections (de_id, para_id) VALUES ($1, $2)`, [
        idsNivel3[deNome],
        idsNivel3[paraNome],
      ]);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Duas perguntas mais difíceis para o Nível 1 (só nesses 2 componentes — o
// resto do nível fica como estava). Chave = nome do componente.
const PERGUNTAS_DIFICEIS_NIVEL_1 = {
  'Placa-mãe': {
    tipo: 'multipla_escolha',
    enunciado: "Pesquise o que é o 'chipset' de uma placa-mãe e por que ele determina quais outras peças você pode usar.",
    pergunta: 'Por que nem toda placa-mãe é compatível com qualquer processador ou memória RAM?',
    opcoes: [
      { texto: 'Porque o chipset e o soquete da placa-mãe só suportam determinados modelos e tipos de peça', correta: true },
      { texto: 'Porque as placas-mãe mais caras funcionam com qualquer peça', correta: false },
      { texto: 'Porque isso depende só da cor da placa-mãe', correta: false },
      { texto: 'Porque todas as placas-mãe são sempre compatíveis entre si', correta: false },
    ],
  },
  'Processador (CPU)': {
    tipo: 'multipla_escolha',
    enunciado: "Pesquise o que significa um processador ter 'múltiplos núcleos' (multi-core) e por que isso importa.",
    pergunta: 'O que significa dizer que um processador tem, por exemplo, 4 núcleos (quad-core)?',
    opcoes: [
      { texto: 'Ele tem 4 unidades de processamento dentro do mesmo chip, podendo executar tarefas em paralelo', correta: true },
      { texto: 'Ele funciona 4 vezes mais devagar', correta: false },
      { texto: 'Ele precisa de 4 placas-mãe para funcionar', correta: false },
      { texto: 'Ele só liga se tiver 4 pentes de memória RAM instalados', correta: false },
    ],
  },
};

// Uma pergunta levemente mais difícil a mais para cada componente dos
// Níveis 2 e 3 — um degrau só acima das 2 perguntas mais básicas que cada
// um já tem, não perguntas de trivia obscura.
const PERGUNTAS_MEDIAS_NIVEL_2_3 = {
  'Porta USB': {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise a diferença de velocidade entre USB 2.0 e USB 3.0.',
    pergunta: 'O que geralmente diferencia o USB 3.0 do USB 2.0?',
    opcoes: [
      { texto: 'O USB 3.0 transfere dados muito mais rápido', correta: true },
      { texto: 'O USB 3.0 só serve para carregar bateria', correta: false },
      { texto: 'O USB 3.0 não aceita pen drive', correta: false },
      { texto: 'O USB 3.0 é mais lento que o 2.0', correta: false },
    ],
  },
  'Pen Drive': {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise que tipo de memória (sem partes móveis) o pen drive usa para guardar os dados.',
    pergunta: 'O pen drive guarda os dados em qual tipo de memória?',
    opcoes: [
      { texto: 'Memória flash (sem partes móveis)', correta: true },
      { texto: 'Fita magnética', correta: false },
      { texto: 'Disco óptico, como um CD', correta: false },
      { texto: 'Memória RAM', correta: false },
    ],
  },
  Impressora: {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise o que a resolução de impressão, medida em DPI, indica.',
    pergunta: 'O que a sigla DPI (usada para medir a qualidade de impressão) significa?',
    opcoes: [
      { texto: 'Dots Per Inch (pontos por polegada) — indica a nitidez da imagem impressa', correta: true },
      { texto: 'Data Print Index', correta: false },
      { texto: 'Digital Photo Interface', correta: false },
      { texto: 'Document Page Info', correta: false },
    ],
  },
  Scanner: {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise o que é o OCR (Reconhecimento Óptico de Caracteres) e como ele se relaciona com o scanner.',
    pergunta: 'O que a tecnologia OCR permite fazer com um documento escaneado?',
    opcoes: [
      { texto: 'Transformar o texto da imagem escaneada em texto editável no computador', correta: true },
      { texto: 'Deixar a imagem colorida automaticamente', correta: false },
      { texto: 'Aumentar a velocidade de impressão', correta: false },
      { texto: 'Conectar o scanner à internet', correta: false },
    ],
  },
  Webcam: {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise o que a resolução de vídeo, como 720p ou 1080p (Full HD), indica na qualidade de uma webcam.',
    pergunta: 'O que uma resolução maior (como 1080p) numa webcam costuma indicar?',
    opcoes: [
      { texto: 'Uma imagem mais nítida e detalhada', correta: true },
      { texto: 'Um microfone mais potente', correta: false },
      { texto: 'Uma conexão Wi-Fi mais rápida', correta: false },
      { texto: 'Uma bateria que dura mais', correta: false },
    ],
  },
  Headset: {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise a diferença entre um headset com fio e um headset sem fio (Bluetooth).',
    pergunta: 'Qual é uma vantagem comum de um headset com fio em relação a um sem fio?',
    opcoes: [
      { texto: 'Não depende de bateria e tem menos atraso (latência) no som', correta: true },
      { texto: 'É sempre mais bonito', correta: false },
      { texto: 'Só funciona com celular', correta: false },
      { texto: 'Não pode ser usado para jogos', correta: false },
    ],
  },
  'Caixa de Som': {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise o que a potência de uma caixa de som, medida em watts (W), indica.',
    pergunta: 'O que a potência (em watts) de uma caixa de som geralmente indica?',
    opcoes: [
      { texto: 'O quão alto e forte o som pode ficar', correta: true },
      { texto: 'A quantidade de músicas que ela guarda', correta: false },
      { texto: 'A velocidade da internet dela', correta: false },
      { texto: 'A cor da luz que ela emite', correta: false },
    ],
  },
  'Leitor de Cartão SD': {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise a diferença entre um cartão SD comum e um cartão microSD.',
    pergunta: 'Qual é a principal diferença entre um cartão SD e um cartão microSD?',
    opcoes: [
      { texto: 'O microSD é bem menor fisicamente, mas pode ter a mesma capacidade de armazenamento', correta: true },
      { texto: 'O microSD não guarda fotos, só vídeos', correta: false },
      { texto: 'O SD comum é mais rápido em todos os casos', correta: false },
      { texto: 'O microSD só funciona em impressoras', correta: false },
    ],
  },
  'Roteador Wi-Fi': {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise a diferença entre as frequências de Wi-Fi 2,4 GHz e 5 GHz.',
    pergunta: 'O que costuma diferenciar a rede Wi-Fi de 5 GHz da de 2,4 GHz?',
    opcoes: [
      { texto: 'A de 5 GHz costuma ser mais rápida, mas alcança menos distância', correta: true },
      { texto: 'A de 5 GHz não funciona com celular', correta: false },
      { texto: 'A de 2,4 GHz é sempre mais rápida', correta: false },
      { texto: 'Não existe diferença nenhuma entre elas', correta: false },
    ],
  },
  Modem: {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise os diferentes tipos de conexão que um modem pode converter (por exemplo, internet a cabo, fibra óptica ou linha telefônica).',
    pergunta: 'Por que existem diferentes tipos de modem?',
    opcoes: [
      { texto: 'Porque cada tipo de conexão de internet (fibra, cabo, linha telefônica) usa uma tecnologia diferente de sinal', correta: true },
      { texto: 'Porque cada marca de computador precisa de um modem diferente', correta: false },
      { texto: 'Porque o modem muda de tipo dependendo da cor do cabo', correta: false },
      { texto: 'Não existem tipos diferentes de modem', correta: false },
    ],
  },
  'Provedor de Internet (ISP)': {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise o que a velocidade de um plano de internet, medida em Mbps (Megabits por segundo), representa.',
    pergunta: 'O que a velocidade contratada com o provedor de internet (em Mbps) indica?',
    opcoes: [
      { texto: 'A quantidade de dados que pode ser transferida por segundo', correta: true },
      { texto: 'O número de dispositivos que podem se conectar', correta: false },
      { texto: 'O tamanho da tela dos dispositivos conectados', correta: false },
      { texto: 'A quantidade de e-mails que podem ser enviados por dia', correta: false },
    ],
  },
  'Cabo de Rede (Ethernet)': {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise se existem diferentes categorias de cabo de rede (como Cat5e, Cat6) e o que elas indicam.',
    pergunta: 'O que as categorias de cabo de rede (como Cat5e ou Cat6) costumam indicar?',
    opcoes: [
      { texto: 'A velocidade máxima de internet que o cabo suporta', correta: true },
      { texto: 'A cor que o cabo deve ter', correta: false },
      { texto: 'O tamanho do conector RJ-45', correta: false },
      { texto: 'O fabricante do cabo', correta: false },
    ],
  },
  'Endereço IP': {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise a diferença entre um endereço IP público e um endereço IP privado (local).',
    pergunta: 'Qual é a diferença entre um IP público e um IP privado?',
    opcoes: [
      { texto: 'O IP público identifica o dispositivo na internet; o IP privado, só dentro da rede local (como a de casa)', correta: true },
      { texto: 'O IP público é usado só por empresas grandes', correta: false },
      { texto: 'O IP privado nunca muda', correta: false },
      { texto: 'Não existe diferença, é o mesmo tipo de IP', correta: false },
    ],
  },
  'Nuvem (Cloud)': {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise por que guardar arquivos na nuvem é considerado mais seguro contra perda de dados do que guardar só no computador.',
    pergunta: 'Por que guardar arquivos na nuvem ajuda a evitar a perda deles?',
    opcoes: [
      { texto: 'Porque ficam salvos em servidores externos, protegidos mesmo se o computador quebrar ou for perdido', correta: true },
      { texto: 'Porque a nuvem nunca pode ser hackeada', correta: false },
      { texto: 'Porque arquivos na nuvem não ocupam espaço nenhum', correta: false },
      { texto: 'Porque a internet nunca cai', correta: false },
    ],
  },
  Firewall: {
    tipo: 'multipla_escolha',
    enunciado: 'Pesquise se um firewall pode ser um programa (software) ou também um aparelho físico (hardware).',
    pergunta: 'Um firewall pode existir de quais formas?',
    opcoes: [
      { texto: 'Tanto como um programa instalado no computador quanto como um aparelho de rede dedicado', correta: true },
      { texto: 'Só como um aparelho físico, nunca como programa', correta: false },
      { texto: 'Só como um programa, nunca como aparelho', correta: false },
      { texto: 'Um firewall é sempre uma pessoa, não uma tecnologia', correta: false },
    ],
  },
};

// Acrescenta as perguntas mais difíceis acima aos componentes já existentes,
// uma vez por componente (guardado pelo total de perguntas que ele já tem —
// funciona mesmo que o servidor reinicie várias vezes).
async function adicionarPerguntasDificeis() {
  const todas = { ...PERGUNTAS_DIFICEIS_NIVEL_1, ...PERGUNTAS_MEDIAS_NIVEL_2_3 };

  for (const [nome, pergunta] of Object.entries(todas)) {
    const { rows: componentes } = await pool.query('SELECT id FROM hw_components WHERE nome = $1', [nome]);
    if (componentes.length === 0) continue;
    const componentId = componentes[0].id;

    const { rows: contagem } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM hw_component_perguntas WHERE component_id = $1',
      [componentId]
    );
    if (contagem[0].total >= 3) continue;

    const { rows: perguntaRows } = await pool.query(
      `INSERT INTO hw_component_perguntas (component_id, tipo, enunciado, pergunta, ordem)
       VALUES ($1, $2, $3, $4, 2) RETURNING id`,
      [componentId, pergunta.tipo, pergunta.enunciado, pergunta.pergunta]
    );
    const perguntaId = perguntaRows[0].id;

    for (let i = 0; i < pergunta.opcoes.length; i++) {
      const o = pergunta.opcoes[i];
      await pool.query(
        `INSERT INTO hw_pergunta_opcoes (pergunta_id, texto, correta, ordem) VALUES ($1, $2, $3, $4)`,
        [perguntaId, o.texto, o.correta, i]
      );
    }
  }
}

function checarAdmin(req, res, next) {
  const senha = req.get('x-admin-password') || req.query.senha;
  if (senha !== ADMIN_PASSWORD) {
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }
  next();
}

async function buscarOpcoesPorPergunta(questionIds) {
  if (questionIds.length === 0) return {};
  const { rows } = await pool.query(
    `SELECT id, question_id, texto, correta, ordem FROM question_options
     WHERE question_id = ANY($1::int[]) ORDER BY question_id, ordem, id`,
    [questionIds]
  );
  const porPergunta = {};
  rows.forEach((o) => {
    if (!porPergunta[o.question_id]) porPergunta[o.question_id] = [];
    porPergunta[o.question_id].push(o);
  });
  return porPergunta;
}

// Busca, para cada componente, sua lista de perguntas já com as opções
// aninhadas (usado só pelo admin — inclui o gabarito). O mapa/modal público
// usa GET /api/hardware/pergunta/:id, que sorteia uma pergunta por vez.
async function buscarPerguntasPorComponentes(componentIds) {
  if (componentIds.length === 0) return {};
  const { rows: perguntas } = await pool.query(
    `SELECT id, component_id, tipo, enunciado, pergunta, ordem FROM hw_component_perguntas
     WHERE component_id = ANY($1::int[]) ORDER BY component_id, ordem, id`,
    [componentIds]
  );
  const { rows: opcoes } = await pool.query(
    `SELECT id, pergunta_id, texto, correta, ordem FROM hw_pergunta_opcoes
     WHERE pergunta_id = ANY($1::int[]) ORDER BY pergunta_id, ordem, id`,
    [perguntas.map((p) => p.id)]
  );
  const opcoesPorPergunta = {};
  opcoes.forEach((o) => {
    (opcoesPorPergunta[o.pergunta_id] ||= []).push(o);
  });

  const porComponente = {};
  perguntas.forEach((p) => {
    (porComponente[p.component_id] ||= []).push({
      id: p.id,
      tipo: p.tipo,
      enunciado: p.enunciado,
      pergunta: p.pergunta,
      opcoes: opcoesPorPergunta[p.id] || [],
    });
  });
  return porComponente;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- API pública ----------

app.get('/api/questions', async (req, res) => {
  try {
    const { rows: perguntas } = await pool.query(
      `SELECT id, ordem, tipo, titulo, enunciado, pergunta FROM questions
       WHERE ativa = TRUE ORDER BY ordem, id`
    );
    const opcoesPorPergunta = await buscarOpcoesPorPergunta(perguntas.map((p) => p.id));

    const resultado = perguntas.map((p) => ({
      id: p.id,
      tipo: p.tipo,
      titulo: p.titulo,
      enunciado: p.enunciado,
      pergunta: p.pergunta,
      opcoes:
        p.tipo === 'digito'
          ? undefined
          : (opcoesPorPergunta[p.id] || []).map((o) => ({ id: o.id, texto: o.texto })),
    }));

    res.json(resultado);
  } catch (err) {
    console.error('Erro ao buscar perguntas:', err);
    res.status(500).json({ erro: 'Erro ao buscar perguntas.' });
  }
});

app.post('/api/submit', async (req, res) => {
  const { participantes, turma, respostas } = req.body || {};

  if (typeof participantes !== 'string' || !participantes.trim()) {
    return res.status(400).json({ erro: 'Informe o nome do aluno ou os nomes do grupo.' });
  }
  if (typeof turma !== 'string' || !turma.trim()) {
    return res.status(400).json({ erro: 'Informe a turma.' });
  }
  if (!respostas || typeof respostas !== 'object') {
    return res.status(400).json({ erro: 'Respostas inválidas.' });
  }

  try {
    const { rows: perguntas } = await pool.query(
      `SELECT id, tipo, titulo, resposta_digito FROM questions WHERE ativa = TRUE ORDER BY ordem, id`
    );
    const opcoesPorPergunta = await buscarOpcoesPorPergunta(perguntas.map((p) => p.id));

    const detalhes = perguntas.map((p) => {
      const resposta = respostas[p.id] || {};
      let correta = false;
      let respostaSalva;

      if (p.tipo === 'digito') {
        const respostaTexto = typeof resposta.texto === 'string' ? resposta.texto.trim() : '';
        const respostaDigito = Number(String(resposta.digito ?? '').trim());
        correta = respostaDigito === p.resposta_digito;
        respostaSalva = { respostaTexto, respostaDigito: resposta.digito ?? null };
      } else {
        const opcaoId = Number(resposta.opcaoId);
        const opcaoEscolhida = (opcoesPorPergunta[p.id] || []).find((o) => o.id === opcaoId);
        correta = Boolean(opcaoEscolhida && opcaoEscolhida.correta);
        respostaSalva = {
          opcaoId: resposta.opcaoId ?? null,
          opcaoTexto: opcaoEscolhida ? opcaoEscolhida.texto : null,
        };
      }

      return { id: p.id, titulo: p.titulo, tipo: p.tipo, ...respostaSalva, correta };
    });

    const acertos = detalhes.filter((d) => d.correta).length;
    const total = perguntas.length;
    const completo = total > 0 && acertos === total;

    await pool.query(
      `INSERT INTO submissions (participantes, turma, respostas, acertos, total, completo)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [participantes.trim(), turma.trim(), JSON.stringify(detalhes), acertos, total, completo]
    );

    res.json({ acertos, total, completo });
  } catch (err) {
    console.error('Erro ao salvar submissão:', err);
    res.status(500).json({ erro: 'Erro ao salvar no banco de dados.' });
  }
});

// ---------- API do professor ----------

app.get('/api/admin/submissions', checarAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, participantes, turma, respostas, acertos, total, completo, criado_em
       FROM submissions ORDER BY criado_em DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar submissões:', err);
    res.status(500).json({ erro: 'Erro ao buscar dados.' });
  }
});

app.get('/api/admin/questions', checarAdmin, async (req, res) => {
  try {
    const { rows: perguntas } = await pool.query(
      `SELECT id, ordem, tipo, titulo, enunciado, pergunta, resposta_digito, ativa
       FROM questions ORDER BY ordem, id`
    );
    const opcoesPorPergunta = await buscarOpcoesPorPergunta(perguntas.map((p) => p.id));
    const resultado = perguntas.map((p) => ({ ...p, opcoes: opcoesPorPergunta[p.id] || [] }));
    res.json(resultado);
  } catch (err) {
    console.error('Erro ao listar perguntas:', err);
    res.status(500).json({ erro: 'Erro ao listar perguntas.' });
  }
});

function validarPayloadPergunta(body) {
  const { tipo, titulo, respostaDigito, opcoes } = body;

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return 'Tipo de pergunta inválido.';
  }
  if (typeof titulo !== 'string' || !titulo.trim()) {
    return 'Informe o título da pergunta.';
  }

  if (tipo === 'digito') {
    const n = Number(respostaDigito);
    if (!Number.isInteger(n) || n < 0 || n > 9) {
      return 'Informe o dígito correto (0 a 9).';
    }
  } else {
    const lista = Array.isArray(opcoes) ? opcoes : [];
    if (lista.length < 2) {
      return 'Adicione ao menos 2 opções de resposta.';
    }
    if (lista.some((o) => !o.texto || !String(o.texto).trim())) {
      return 'Toda opção precisa ter um texto.';
    }
    if (!lista.some((o) => o.correta)) {
      return 'Marque qual opção é a correta.';
    }
  }

  return null;
}

app.post('/api/admin/questions', checarAdmin, async (req, res) => {
  const body = req.body || {};
  const erroValidacao = validarPayloadPergunta(body);
  if (erroValidacao) {
    return res.status(400).json({ erro: erroValidacao });
  }

  const { tipo, titulo, enunciado, pergunta, ordem, ativa, respostaDigito, opcoes } = body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const respostaDigitoFinal = tipo === 'digito' ? Number(respostaDigito) : null;

    const { rows } = await client.query(
      `INSERT INTO questions (ordem, tipo, titulo, enunciado, pergunta, resposta_digito, ativa)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [Number(ordem) || 0, tipo, titulo.trim(), enunciado || '', pergunta || '', respostaDigitoFinal, ativa !== false]
    );
    const perguntaId = rows[0].id;

    if (tipo !== 'digito') {
      const lista = Array.isArray(opcoes) ? opcoes : [];
      for (let i = 0; i < lista.length; i++) {
        await client.query(
          `INSERT INTO question_options (question_id, texto, correta, ordem) VALUES ($1, $2, $3, $4)`,
          [perguntaId, String(lista[i].texto).trim(), Boolean(lista[i].correta), i]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ id: perguntaId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar pergunta:', err);
    res.status(500).json({ erro: 'Erro ao criar pergunta.' });
  } finally {
    client.release();
  }
});

app.put('/api/admin/questions/:id', checarAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }

  const body = req.body || {};
  const erroValidacao = validarPayloadPergunta(body);
  if (erroValidacao) {
    return res.status(400).json({ erro: erroValidacao });
  }

  const { tipo, titulo, enunciado, pergunta, ordem, ativa, respostaDigito, opcoes } = body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const respostaDigitoFinal = tipo === 'digito' ? Number(respostaDigito) : null;

    const { rowCount } = await client.query(
      `UPDATE questions
       SET ordem=$1, tipo=$2, titulo=$3, enunciado=$4, pergunta=$5, resposta_digito=$6, ativa=$7, atualizado_em=now()
       WHERE id=$8`,
      [Number(ordem) || 0, tipo, titulo.trim(), enunciado || '', pergunta || '', respostaDigitoFinal, ativa !== false, id]
    );

    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Pergunta não encontrada.' });
    }

    await client.query('DELETE FROM question_options WHERE question_id=$1', [id]);

    if (tipo !== 'digito') {
      const lista = Array.isArray(opcoes) ? opcoes : [];
      for (let i = 0; i < lista.length; i++) {
        await client.query(
          `INSERT INTO question_options (question_id, texto, correta, ordem) VALUES ($1, $2, $3, $4)`,
          [id, String(lista[i].texto).trim(), Boolean(lista[i].correta), i]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar pergunta:', err);
    res.status(500).json({ erro: 'Erro ao atualizar pergunta.' });
  } finally {
    client.release();
  }
});

app.delete('/api/admin/questions/:id', checarAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }
  try {
    await pool.query('DELETE FROM questions WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir pergunta:', err);
    res.status(500).json({ erro: 'Erro ao excluir pergunta.' });
  }
});

// ---------- Hardware: API pública ----------

async function nivelPadraoId() {
  const { rows } = await pool.query(
    `SELECT id FROM hw_niveis WHERE ativo = TRUE ORDER BY ordem, id LIMIT 1`
  );
  return rows.length ? rows[0].id : null;
}

app.get('/api/hardware/mapa', async (req, res) => {
  try {
    const nivelId = Number(req.query.nivelId) || (await nivelPadraoId());
    if (!nivelId) {
      return res.json({ componentes: [], conexoes: [] });
    }

    const { rows: componentes } = await pool.query(
      `SELECT id, nome, icone, imagem, pos_x, pos_y, inicial FROM hw_components
       WHERE ativo = TRUE AND nivel_id = $1 ORDER BY id`,
      [nivelId]
    );
    const ids = componentes.map((c) => c.id);
    const { rows: conexoes } = ids.length
      ? await pool.query(
          `SELECT de_id, para_id FROM hw_connections
           WHERE de_id = ANY($1::int[]) AND para_id = ANY($1::int[])`,
          [ids]
        )
      : { rows: [] };

    res.json({
      componentes: componentes.map((c) => ({
        id: c.id,
        nome: c.nome,
        icone: c.icone,
        imagem: c.imagem,
        posX: c.pos_x,
        posY: c.pos_y,
        inicial: c.inicial,
      })),
      conexoes: conexoes.map((cn) => ({ deId: cn.de_id, paraId: cn.para_id })),
    });
  } catch (err) {
    console.error('Erro ao buscar mapa de hardware:', err);
    res.status(500).json({ erro: 'Erro ao buscar o mapa de hardware.' });
  }
});

// Sorteia uma pergunta do banco daquele componente — chamada a cada clique
// num nó, para não repetir sempre a mesma pergunta.
app.get('/api/hardware/pergunta/:componentId', async (req, res) => {
  const compId = Number(req.params.componentId);
  if (!Number.isInteger(compId)) {
    return res.status(400).json({ erro: 'Componente inválido.' });
  }
  try {
    const { rows: perguntas } = await pool.query(
      `SELECT id, tipo, enunciado, pergunta FROM hw_component_perguntas
       WHERE component_id = $1 ORDER BY random() LIMIT 1`,
      [compId]
    );
    if (perguntas.length === 0) {
      return res.status(404).json({ erro: 'Esse componente ainda não tem pergunta cadastrada.' });
    }
    const pergunta = perguntas[0];

    const { rows: opcoes } = await pool.query(
      `SELECT id, texto FROM hw_pergunta_opcoes WHERE pergunta_id = $1 ORDER BY ordem, id`,
      [pergunta.id]
    );

    res.json({
      perguntaId: pergunta.id,
      tipo: pergunta.tipo,
      enunciado: pergunta.enunciado,
      pergunta: pergunta.pergunta,
      opcoes: opcoes.map((o) => ({ id: o.id, texto: o.texto })),
    });
  } catch (err) {
    console.error('Erro ao sortear pergunta de hardware:', err);
    res.status(500).json({ erro: 'Erro ao buscar a pergunta.' });
  }
});

app.post('/api/hardware/progresso', async (req, res) => {
  const { participantes, turma, nivelId } = req.body || {};
  if (typeof participantes !== 'string' || !participantes.trim() || typeof turma !== 'string' || !turma.trim()) {
    return res.status(400).json({ erro: 'Informe o nome e a turma.' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT a.component_id FROM hw_answers a
       JOIN hw_components c ON c.id = a.component_id
       WHERE a.participantes = $1 AND a.turma = $2 AND a.correta = TRUE AND c.nivel_id = $3`,
      [participantes.trim(), turma.trim(), Number(nivelId) || null]
    );
    res.json({ descobertos: rows.map((r) => r.component_id) });
  } catch (err) {
    console.error('Erro ao buscar progresso de hardware:', err);
    res.status(500).json({ erro: 'Erro ao buscar progresso.' });
  }
});

// Lista os níveis com o total de componentes, quantos o aluno/turma já
// descobriu, e se o nível está desbloqueado (o primeiro sempre está; os
// seguintes só depois do anterior 100% descoberto).
app.post('/api/hardware/niveis', async (req, res) => {
  const { participantes, turma } = req.body || {};
  if (typeof participantes !== 'string' || !participantes.trim() || typeof turma !== 'string' || !turma.trim()) {
    return res.status(400).json({ erro: 'Informe o nome e a turma.' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT n.id, n.nome, n.descricao, n.ordem,
              COUNT(c.id)::int AS total,
              COUNT(DISTINCT CASE WHEN a.correta THEN a.component_id END)::int AS descobertos
       FROM hw_niveis n
       LEFT JOIN hw_components c ON c.nivel_id = n.id AND c.ativo = TRUE
       LEFT JOIN hw_answers a ON a.component_id = c.id AND a.participantes = $1 AND a.turma = $2 AND a.correta = TRUE
       WHERE n.ativo = TRUE
       GROUP BY n.id
       ORDER BY n.ordem, n.id`,
      [participantes.trim(), turma.trim()]
    );

    let anteriorCompleto = true;
    const niveis = rows.map((n) => {
      const desbloqueado = anteriorCompleto;
      anteriorCompleto = n.descobertos >= n.total;
      return {
        id: n.id,
        nome: n.nome,
        descricao: n.descricao,
        ordem: n.ordem,
        total: n.total,
        descobertos: n.descobertos,
        desbloqueado,
      };
    });

    res.json(niveis);
  } catch (err) {
    console.error('Erro ao buscar níveis de hardware:', err);
    res.status(500).json({ erro: 'Erro ao buscar níveis.' });
  }
});

app.post('/api/hardware/responder', async (req, res) => {
  const { participantes, turma, componentId, perguntaId, opcaoId } = req.body || {};

  if (typeof participantes !== 'string' || !participantes.trim()) {
    return res.status(400).json({ erro: 'Informe o nome do aluno ou os nomes do grupo.' });
  }
  if (typeof turma !== 'string' || !turma.trim()) {
    return res.status(400).json({ erro: 'Informe a turma.' });
  }
  const compId = Number(componentId);
  const pergId = Number(perguntaId);
  if (!Number.isInteger(compId) || !Number.isInteger(pergId)) {
    return res.status(400).json({ erro: 'Componente ou pergunta inválidos.' });
  }

  try {
    const { rows: componentes } = await pool.query(
      `SELECT id, nome FROM hw_components WHERE id = $1 AND ativo = TRUE`,
      [compId]
    );
    if (componentes.length === 0) {
      return res.status(404).json({ erro: 'Componente não encontrado.' });
    }
    const componente = componentes[0];

    const { rows: perguntas } = await pool.query(
      `SELECT id FROM hw_component_perguntas WHERE id = $1 AND component_id = $2`,
      [pergId, compId]
    );
    if (perguntas.length === 0) {
      return res.status(404).json({ erro: 'Pergunta não encontrada para esse componente.' });
    }

    const { rows: opcoes } = await pool.query(
      `SELECT id, texto, correta FROM hw_pergunta_opcoes WHERE pergunta_id = $1`,
      [pergId]
    );
    const opcaoEscolhida = opcoes.find((o) => o.id === Number(opcaoId));
    const correta = Boolean(opcaoEscolhida && opcaoEscolhida.correta);

    await pool.query(
      `INSERT INTO hw_answers (participantes, turma, component_id, componente_nome, opcao_id, opcao_texto, correta, pergunta_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        participantes.trim(),
        turma.trim(),
        compId,
        componente.nome,
        opcaoEscolhida ? opcaoEscolhida.id : null,
        opcaoEscolhida ? opcaoEscolhida.texto : null,
        correta,
        pergId,
      ]
    );

    res.json({ correta });
  } catch (err) {
    console.error('Erro ao registrar resposta de hardware:', err);
    res.status(500).json({ erro: 'Erro ao registrar resposta.' });
  }
});

// ---------- Hardware: API do professor ----------

app.get('/api/admin/hardware/niveis', checarAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM hw_niveis ORDER BY ordem, id`);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar níveis de hardware:', err);
    res.status(500).json({ erro: 'Erro ao listar níveis.' });
  }
});

app.post('/api/admin/hardware/niveis', checarAdmin, async (req, res) => {
  const { nome, descricao, ordem, ativo } = req.body || {};
  if (typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ erro: 'Informe o nome do nível.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO hw_niveis (nome, descricao, ordem, ativo) VALUES ($1, $2, $3, $4) RETURNING id`,
      [nome.trim(), descricao || '', Number(ordem) || 0, ativo !== false]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error('Erro ao criar nível de hardware:', err);
    res.status(500).json({ erro: 'Erro ao criar nível.' });
  }
});

app.put('/api/admin/hardware/niveis/:id', checarAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { nome, descricao, ordem, ativo } = req.body || {};
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }
  if (typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ erro: 'Informe o nome do nível.' });
  }
  try {
    const { rowCount } = await pool.query(
      `UPDATE hw_niveis SET nome=$1, descricao=$2, ordem=$3, ativo=$4 WHERE id=$5`,
      [nome.trim(), descricao || '', Number(ordem) || 0, ativo !== false, id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ erro: 'Nível não encontrado.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao atualizar nível de hardware:', err);
    res.status(500).json({ erro: 'Erro ao atualizar nível.' });
  }
});

app.delete('/api/admin/hardware/niveis/:id', checarAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }
  try {
    await pool.query('DELETE FROM hw_niveis WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir nível de hardware:', err);
    res.status(500).json({ erro: 'Erro ao excluir nível.' });
  }
});

app.get('/api/admin/hardware/components', checarAdmin, async (req, res) => {
  try {
    const { rows: componentes } = await pool.query(
      `SELECT id, nome, icone, imagem, pos_x, pos_y, inicial, ativo, nivel_id
       FROM hw_components ORDER BY id`
    );
    const perguntasPorComponente = await buscarPerguntasPorComponentes(componentes.map((c) => c.id));
    res.json(componentes.map((c) => ({ ...c, perguntas: perguntasPorComponente[c.id] || [] })));
  } catch (err) {
    console.error('Erro ao listar componentes de hardware:', err);
    res.status(500).json({ erro: 'Erro ao listar componentes.' });
  }
});

function validarPayloadComponente(body) {
  const { nome, perguntas } = body;

  if (typeof nome !== 'string' || !nome.trim()) {
    return 'Informe o nome do componente.';
  }

  const listaPerguntas = Array.isArray(perguntas) ? perguntas : [];
  if (listaPerguntas.length === 0) {
    return 'Adicione ao menos 1 pergunta para o componente.';
  }

  for (const p of listaPerguntas) {
    if (!TIPOS_VALIDOS_HW.includes(p.tipo)) {
      return 'Tipo de pergunta inválido.';
    }
    const lista = Array.isArray(p.opcoes) ? p.opcoes : [];
    if (lista.length < 2) {
      return 'Cada pergunta precisa de ao menos 2 opções de resposta.';
    }
    if (lista.some((o) => !o.texto || !String(o.texto).trim())) {
      return 'Toda opção precisa ter um texto.';
    }
    if (!lista.some((o) => o.correta)) {
      return 'Marque qual opção é a correta em cada pergunta.';
    }
  }

  return null;
}

async function gravarPerguntasComponente(client, componentId, perguntas, { substituir } = {}) {
  if (substituir) {
    await client.query('DELETE FROM hw_component_perguntas WHERE component_id=$1', [componentId]);
  }
  for (let i = 0; i < perguntas.length; i++) {
    const p = perguntas[i];
    const { rows: perguntaRows } = await client.query(
      `INSERT INTO hw_component_perguntas (component_id, tipo, enunciado, pergunta, ordem)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [componentId, p.tipo, p.enunciado || '', p.pergunta || '', i]
    );
    const perguntaId = perguntaRows[0].id;
    const opcoes = Array.isArray(p.opcoes) ? p.opcoes : [];
    for (let j = 0; j < opcoes.length; j++) {
      await client.query(
        `INSERT INTO hw_pergunta_opcoes (pergunta_id, texto, correta, ordem) VALUES ($1, $2, $3, $4)`,
        [perguntaId, String(opcoes[j].texto).trim(), Boolean(opcoes[j].correta), j]
      );
    }
  }
}

app.post('/api/admin/hardware/components', checarAdmin, async (req, res) => {
  const body = req.body || {};
  const erroValidacao = validarPayloadComponente(body);
  if (erroValidacao) {
    return res.status(400).json({ erro: erroValidacao });
  }

  const { nome, icone, imagem, posX, posY, inicial, ativo, nivelId, perguntas } = body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO hw_components (nome, icone, imagem, pos_x, pos_y, inicial, ativo, nivel_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        nome.trim(),
        (icone && String(icone).trim()) || '🔧',
        (imagem && String(imagem).trim()) || '',
        Number(posX) || 50,
        Number(posY) || 50,
        Boolean(inicial),
        ativo !== false,
        Number(nivelId) || null,
      ]
    );
    const componentId = rows[0].id;

    await gravarPerguntasComponente(client, componentId, perguntas);

    await client.query('COMMIT');
    res.status(201).json({ id: componentId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar componente de hardware:', err);
    res.status(500).json({ erro: 'Erro ao criar componente.' });
  } finally {
    client.release();
  }
});

app.put('/api/admin/hardware/components/:id', checarAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }

  const body = req.body || {};
  const erroValidacao = validarPayloadComponente(body);
  if (erroValidacao) {
    return res.status(400).json({ erro: erroValidacao });
  }

  const { nome, icone, imagem, posX, posY, inicial, ativo, nivelId, perguntas } = body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rowCount } = await client.query(
      `UPDATE hw_components
       SET nome=$1, icone=$2, imagem=$3, pos_x=$4, pos_y=$5, inicial=$6, ativo=$7, nivel_id=$8, atualizado_em=now()
       WHERE id=$9`,
      [
        nome.trim(),
        (icone && String(icone).trim()) || '🔧',
        (imagem && String(imagem).trim()) || '',
        Number(posX) || 50,
        Number(posY) || 50,
        Boolean(inicial),
        ativo !== false,
        Number(nivelId) || null,
        id,
      ]
    );

    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Componente não encontrado.' });
    }

    await gravarPerguntasComponente(client, id, perguntas, { substituir: true });

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar componente de hardware:', err);
    res.status(500).json({ erro: 'Erro ao atualizar componente.' });
  } finally {
    client.release();
  }
});

app.patch('/api/admin/hardware/components/:id/posicao', checarAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }
  const posX = Number(req.body?.posX);
  const posY = Number(req.body?.posY);
  if (!Number.isFinite(posX) || !Number.isFinite(posY)) {
    return res.status(400).json({ erro: 'Posição inválida.' });
  }
  try {
    await pool.query(`UPDATE hw_components SET pos_x=$1, pos_y=$2, atualizado_em=now() WHERE id=$3`, [
      posX,
      posY,
      id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao mover componente de hardware:', err);
    res.status(500).json({ erro: 'Erro ao mover componente.' });
  }
});

app.delete('/api/admin/hardware/components/:id', checarAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }
  try {
    await pool.query('DELETE FROM hw_components WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir componente de hardware:', err);
    res.status(500).json({ erro: 'Erro ao excluir componente.' });
  }
});

app.get('/api/admin/hardware/connections', checarAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT hc.id, hc.de_id, hc.para_id, a.nome AS de_nome, b.nome AS para_nome
       FROM hw_connections hc
       JOIN hw_components a ON a.id = hc.de_id
       JOIN hw_components b ON b.id = hc.para_id
       ORDER BY hc.id`
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar conexões de hardware:', err);
    res.status(500).json({ erro: 'Erro ao listar conexões.' });
  }
});

app.post('/api/admin/hardware/connections', checarAdmin, async (req, res) => {
  const deId = Number(req.body?.deId);
  const paraId = Number(req.body?.paraId);
  if (!Number.isInteger(deId) || !Number.isInteger(paraId) || deId === paraId) {
    return res.status(400).json({ erro: 'Selecione dois componentes diferentes.' });
  }
  try {
    const { rows: existentes } = await pool.query(
      `SELECT id FROM hw_connections WHERE (de_id=$1 AND para_id=$2) OR (de_id=$2 AND para_id=$1)`,
      [deId, paraId]
    );
    if (existentes.length > 0) {
      return res.status(400).json({ erro: 'Essa conexão já existe.' });
    }
    const { rows } = await pool.query(`INSERT INTO hw_connections (de_id, para_id) VALUES ($1, $2) RETURNING id`, [
      deId,
      paraId,
    ]);
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error('Erro ao criar conexão de hardware:', err);
    res.status(500).json({ erro: 'Erro ao criar conexão.' });
  }
});

app.delete('/api/admin/hardware/connections/:id', checarAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }
  try {
    await pool.query('DELETE FROM hw_connections WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir conexão de hardware:', err);
    res.status(500).json({ erro: 'Erro ao excluir conexão.' });
  }
});

app.get('/api/admin/hardware/respostas', checarAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, participantes, turma, componente_nome, opcao_texto, correta, criado_em
       FROM hw_answers ORDER BY criado_em DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar respostas de hardware:', err);
    res.status(500).json({ erro: 'Erro ao buscar respostas.' });
  }
});

ensureSchema()
  .then(() => seedQuestionsIfEmpty())
  .then(() => seedHardwareIfEmpty())
  .then(() => expandirMapaHardwareParaNiveis())
  .then(() => adicionarPerguntasDificeis())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Erro ao preparar o banco de dados:', err);
    process.exit(1);
  });
