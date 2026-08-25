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

async function buscarOpcoesPorComponente(componentIds) {
  if (componentIds.length === 0) return {};
  const { rows } = await pool.query(
    `SELECT id, component_id, texto, correta, ordem FROM hw_component_options
     WHERE component_id = ANY($1::int[]) ORDER BY component_id, ordem, id`,
    [componentIds]
  );
  const porComponente = {};
  rows.forEach((o) => {
    if (!porComponente[o.component_id]) porComponente[o.component_id] = [];
    porComponente[o.component_id].push(o);
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

app.get('/api/hardware/mapa', async (req, res) => {
  try {
    const { rows: componentes } = await pool.query(
      `SELECT id, nome, icone, imagem, tipo, enunciado, pergunta, pos_x, pos_y, inicial FROM hw_components
       WHERE ativo = TRUE ORDER BY id`
    );
    const ids = componentes.map((c) => c.id);
    const opcoesPorComponente = await buscarOpcoesPorComponente(ids);
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
        tipo: c.tipo,
        enunciado: c.enunciado,
        pergunta: c.pergunta,
        posX: c.pos_x,
        posY: c.pos_y,
        inicial: c.inicial,
        opcoes: (opcoesPorComponente[c.id] || []).map((o) => ({ id: o.id, texto: o.texto })),
      })),
      conexoes: conexoes.map((cn) => ({ deId: cn.de_id, paraId: cn.para_id })),
    });
  } catch (err) {
    console.error('Erro ao buscar mapa de hardware:', err);
    res.status(500).json({ erro: 'Erro ao buscar o mapa de hardware.' });
  }
});

app.post('/api/hardware/progresso', async (req, res) => {
  const { participantes, turma } = req.body || {};
  if (typeof participantes !== 'string' || !participantes.trim() || typeof turma !== 'string' || !turma.trim()) {
    return res.status(400).json({ erro: 'Informe o nome e a turma.' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT component_id FROM hw_answers
       WHERE participantes = $1 AND turma = $2 AND correta = TRUE AND component_id IS NOT NULL`,
      [participantes.trim(), turma.trim()]
    );
    res.json({ descobertos: rows.map((r) => r.component_id) });
  } catch (err) {
    console.error('Erro ao buscar progresso de hardware:', err);
    res.status(500).json({ erro: 'Erro ao buscar progresso.' });
  }
});

app.post('/api/hardware/responder', async (req, res) => {
  const { participantes, turma, componentId, opcaoId } = req.body || {};

  if (typeof participantes !== 'string' || !participantes.trim()) {
    return res.status(400).json({ erro: 'Informe o nome do aluno ou os nomes do grupo.' });
  }
  if (typeof turma !== 'string' || !turma.trim()) {
    return res.status(400).json({ erro: 'Informe a turma.' });
  }
  const compId = Number(componentId);
  if (!Number.isInteger(compId)) {
    return res.status(400).json({ erro: 'Componente inválido.' });
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

    const { rows: opcoes } = await pool.query(
      `SELECT id, texto, correta FROM hw_component_options WHERE component_id = $1`,
      [compId]
    );
    const opcaoEscolhida = opcoes.find((o) => o.id === Number(opcaoId));
    const correta = Boolean(opcaoEscolhida && opcaoEscolhida.correta);

    await pool.query(
      `INSERT INTO hw_answers (participantes, turma, component_id, componente_nome, opcao_id, opcao_texto, correta)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        participantes.trim(),
        turma.trim(),
        compId,
        componente.nome,
        opcaoEscolhida ? opcaoEscolhida.id : null,
        opcaoEscolhida ? opcaoEscolhida.texto : null,
        correta,
      ]
    );

    res.json({ correta });
  } catch (err) {
    console.error('Erro ao registrar resposta de hardware:', err);
    res.status(500).json({ erro: 'Erro ao registrar resposta.' });
  }
});

// ---------- Hardware: API do professor ----------

app.get('/api/admin/hardware/components', checarAdmin, async (req, res) => {
  try {
    const { rows: componentes } = await pool.query(
      `SELECT id, nome, icone, imagem, tipo, enunciado, pergunta, pos_x, pos_y, inicial, ativo
       FROM hw_components ORDER BY id`
    );
    const opcoesPorComponente = await buscarOpcoesPorComponente(componentes.map((c) => c.id));
    res.json(componentes.map((c) => ({ ...c, opcoes: opcoesPorComponente[c.id] || [] })));
  } catch (err) {
    console.error('Erro ao listar componentes de hardware:', err);
    res.status(500).json({ erro: 'Erro ao listar componentes.' });
  }
});

function validarPayloadComponente(body) {
  const { tipo, nome, opcoes } = body;

  if (!TIPOS_VALIDOS_HW.includes(tipo)) {
    return 'Tipo de pergunta inválido.';
  }
  if (typeof nome !== 'string' || !nome.trim()) {
    return 'Informe o nome do componente.';
  }

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

  return null;
}

app.post('/api/admin/hardware/components', checarAdmin, async (req, res) => {
  const body = req.body || {};
  const erroValidacao = validarPayloadComponente(body);
  if (erroValidacao) {
    return res.status(400).json({ erro: erroValidacao });
  }

  const { tipo, nome, icone, imagem, enunciado, pergunta, posX, posY, inicial, ativo, opcoes } = body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO hw_components (nome, icone, imagem, tipo, enunciado, pergunta, pos_x, pos_y, inicial, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        nome.trim(),
        (icone && String(icone).trim()) || '🔧',
        (imagem && String(imagem).trim()) || '',
        tipo,
        enunciado || '',
        pergunta || '',
        Number(posX) || 50,
        Number(posY) || 50,
        Boolean(inicial),
        ativo !== false,
      ]
    );
    const componentId = rows[0].id;

    const lista = Array.isArray(opcoes) ? opcoes : [];
    for (let i = 0; i < lista.length; i++) {
      await client.query(
        `INSERT INTO hw_component_options (component_id, texto, correta, ordem) VALUES ($1, $2, $3, $4)`,
        [componentId, String(lista[i].texto).trim(), Boolean(lista[i].correta), i]
      );
    }

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

  const { tipo, nome, icone, imagem, enunciado, pergunta, posX, posY, inicial, ativo, opcoes } = body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rowCount } = await client.query(
      `UPDATE hw_components
       SET nome=$1, icone=$2, imagem=$3, tipo=$4, enunciado=$5, pergunta=$6, pos_x=$7, pos_y=$8, inicial=$9, ativo=$10, atualizado_em=now()
       WHERE id=$11`,
      [
        nome.trim(),
        (icone && String(icone).trim()) || '🔧',
        (imagem && String(imagem).trim()) || '',
        tipo,
        enunciado || '',
        pergunta || '',
        Number(posX) || 50,
        Number(posY) || 50,
        Boolean(inicial),
        ativo !== false,
        id,
      ]
    );

    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Componente não encontrado.' });
    }

    await client.query('DELETE FROM hw_component_options WHERE component_id=$1', [id]);

    const lista = Array.isArray(opcoes) ? opcoes : [];
    for (let i = 0; i < lista.length; i++) {
      await client.query(
        `INSERT INTO hw_component_options (component_id, texto, correta, ordem) VALUES ($1, $2, $3, $4)`,
        [id, String(lista[i].texto).trim(), Boolean(lista[i].correta), i]
      );
    }

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
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Erro ao preparar o banco de dados:', err);
    process.exit(1);
  });
