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

async function ensureSchema() {
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

// Gabarito oficial: fica só no servidor, nunca é enviado ao navegador.
const PISTAS = [
  { id: 'animal_navegador', titulo: 'O Animal Navegador', digito: 6 },
  { id: 'rei_sem_fio', titulo: 'O Rei Sem Fio', digito: 4 },
  { id: 'simbolo_categorias', titulo: 'O Símbolo das Categorias', digito: 3 },
  { id: 'pior_senha', titulo: 'A Pior Senha do Mundo', digito: 6 },
  { id: 'primeiro_video', titulo: 'O Primeiro Vídeo', digito: 4 },
  { id: 'buscador_gigante', titulo: 'O Buscador Gigante', digito: 3 },
  { id: 'ondas_conexao', titulo: 'As Ondas de Conexão', digito: 3 },
  { id: 'arquivos_no_ceu', titulo: 'Arquivos no Céu', digito: 5 },
  { id: 'passaro_extinto', titulo: 'O Pássaro Extinto', digito: 3 },
  { id: 'carinhas_japao', titulo: 'As Carinhas do Japão', digito: 5 },
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

  const detalhes = PISTAS.map((pista) => {
    const respostaBruta = respostas[pista.id];
    const respostaNum = Number(String(respostaBruta ?? '').trim());
    const correta = respostaNum === pista.digito;
    return { id: pista.id, titulo: pista.titulo, resposta: respostaBruta ?? null, correta };
  });

  const acertos = detalhes.filter((d) => d.correta).length;
  const total = PISTAS.length;
  const completo = acertos === total;

  try {
    await pool.query(
      `INSERT INTO submissions (participantes, turma, respostas, acertos, total, completo)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [participantes.trim(), turma.trim(), JSON.stringify(detalhes), acertos, total, completo]
    );
  } catch (err) {
    console.error('Erro ao salvar no banco:', err);
    return res.status(500).json({ erro: 'Erro ao salvar no banco de dados.' });
  }

  res.json({
    acertos,
    total,
    completo,
    detalhes: detalhes.map(({ id, titulo, correta }) => ({ id, titulo, correta })),
  });
});

app.get('/api/admin/submissions', async (req, res) => {
  if (req.query.senha !== ADMIN_PASSWORD) {
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }
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

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Erro ao preparar o banco de dados:', err);
    process.exit(1);
  });
