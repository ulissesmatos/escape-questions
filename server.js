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

ensureSchema()
  .then(() => seedQuestionsIfEmpty())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Erro ao preparar o banco de dados:', err);
    process.exit(1);
  });
