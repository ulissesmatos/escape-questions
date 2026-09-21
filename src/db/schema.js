/**
 * Criação/atualização do schema. Tudo é idempotente (IF NOT EXISTS), então
 * roda em todo start do servidor sem apagar dados de quem já usa o sistema.
 */
const COMANDOS = [
  // ---------------- Escape Room ----------------
  `CREATE TABLE IF NOT EXISTS questions (
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
  )`,
  `CREATE TABLE IF NOT EXISTS question_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    correta BOOLEAN NOT NULL DEFAULT FALSE,
    ordem INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    participantes TEXT NOT NULL,
    turma TEXT NOT NULL,
    respostas JSONB NOT NULL,
    acertos INTEGER NOT NULL,
    total INTEGER NOT NULL,
    completo BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS submissions_turma_idx ON submissions (turma, criado_em DESC)`,

  // ---------------- Mapa de Hardware: estrutura ----------------
  `CREATE TABLE IF NOT EXISTS hw_niveis (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT NOT NULL DEFAULT '',
    ordem INTEGER NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS hw_components (
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
  )`,
  `ALTER TABLE hw_components ADD COLUMN IF NOT EXISTS imagem TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE hw_components ADD COLUMN IF NOT EXISTS nivel_id INTEGER REFERENCES hw_niveis(id) ON DELETE SET NULL`,
  `CREATE TABLE IF NOT EXISTS hw_connections (
    id SERIAL PRIMARY KEY,
    de_id INTEGER NOT NULL REFERENCES hw_components(id) ON DELETE CASCADE,
    para_id INTEGER NOT NULL REFERENCES hw_components(id) ON DELETE CASCADE,
    CHECK (de_id <> para_id)
  )`,

  // Tabelas das versões antigas do banco de perguntas (1 pergunta fixa e
  // depois perguntas só de múltipla escolha/V-F). Não são mais usadas, mas
  // continuam existindo porque o histórico em hw_answers aponta para elas.
  `CREATE TABLE IF NOT EXISTS hw_component_options (
    id SERIAL PRIMARY KEY,
    component_id INTEGER NOT NULL REFERENCES hw_components(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    correta BOOLEAN NOT NULL DEFAULT FALSE,
    ordem INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS hw_component_perguntas (
    id SERIAL PRIMARY KEY,
    component_id INTEGER NOT NULL REFERENCES hw_components(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'multipla_escolha',
    enunciado TEXT NOT NULL DEFAULT '',
    pergunta TEXT NOT NULL DEFAULT '',
    ordem INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS hw_pergunta_opcoes (
    id SERIAL PRIMARY KEY,
    pergunta_id INTEGER NOT NULL REFERENCES hw_component_perguntas(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    correta BOOLEAN NOT NULL DEFAULT FALSE,
    ordem INTEGER NOT NULL DEFAULT 0
  )`,

  // ---------------- Mapa de Hardware: banco adaptativo ----------------
  // Cada questão tem um tipo (ver src/questions) e um conteúdo JSON próprio
  // do tipo — alternativas, afirmações, faixa do slider, pares...
  `CREATE TABLE IF NOT EXISTS hw_questoes (
    id SERIAL PRIMARY KEY,
    component_id INTEGER NOT NULL REFERENCES hw_components(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    dificuldade INTEGER NOT NULL DEFAULT 2 CHECK (dificuldade BETWEEN 1 AND 5),
    enunciado TEXT NOT NULL DEFAULT '',
    pergunta TEXT NOT NULL DEFAULT '',
    conteudo JSONB NOT NULL DEFAULT '{}'::jsonb,
    explicacao TEXT NOT NULL DEFAULT '',
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS hw_questoes_component_idx ON hw_questoes (component_id)`,

  // Perfil adaptativo de cada aluno/grupo (identidade = nome + turma)
  `CREATE TABLE IF NOT EXISTS hw_perfis (
    id SERIAL PRIMARY KEY,
    participantes TEXT NOT NULL,
    turma TEXT NOT NULL,
    habilidade REAL NOT NULL DEFAULT 2,
    sequencia_acertos INTEGER NOT NULL DEFAULT 0,
    sequencia_erros INTEGER NOT NULL DEFAULT 0,
    pausas INTEGER NOT NULL DEFAULT 0,
    pausa_ate TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (participantes, turma)
  )`,

  // Desafio = uma pergunta sorteada e embaralhada para um aluno. Aceita uma
  // única resposta; o gabarito fica só aqui, nunca vai para o navegador.
  `CREATE TABLE IF NOT EXISTS hw_desafios (
    id TEXT PRIMARY KEY,
    perfil_id INTEGER NOT NULL REFERENCES hw_perfis(id) ON DELETE CASCADE,
    component_id INTEGER NOT NULL REFERENCES hw_components(id) ON DELETE CASCADE,
    questao_id INTEGER REFERENCES hw_questoes(id) ON DELETE SET NULL,
    dificuldade INTEGER NOT NULL,
    publico JSONB NOT NULL,
    gabarito JSONB NOT NULL,
    tempo_minimo_ms INTEGER NOT NULL,
    emitido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    respondido_em TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS hw_desafios_perfil_idx ON hw_desafios (perfil_id, emitido_em DESC)`,

  // Tentativas (histórico). Colunas novas são opcionais para manter o
  // histórico das versões antigas.
  `CREATE TABLE IF NOT EXISTS hw_answers (
    id SERIAL PRIMARY KEY,
    participantes TEXT NOT NULL,
    turma TEXT NOT NULL,
    component_id INTEGER REFERENCES hw_components(id) ON DELETE SET NULL,
    componente_nome TEXT NOT NULL,
    opcao_id INTEGER,
    opcao_texto TEXT,
    correta BOOLEAN NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS pergunta_id INTEGER REFERENCES hw_component_perguntas(id) ON DELETE SET NULL`,
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS questao_id INTEGER REFERENCES hw_questoes(id) ON DELETE SET NULL`,
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS desafio_id TEXT`,
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS tipo TEXT`,
  // Sinais de consulta externa durante a pergunta (ver public/js/core/antiCopia.js)
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS copias INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS colagens INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS saidas_aba INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS tempo_fora_ms INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS dificuldade INTEGER`,
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS resultado TEXT`,
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS tempo_ms INTEGER`,
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS tempo_minimo_ms INTEGER`,
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS pergunta_texto TEXT`,
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS resposta_certa_texto TEXT`,
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS habilidade_antes REAL`,
  `ALTER TABLE hw_answers ADD COLUMN IF NOT EXISTS habilidade_depois REAL`,
  `CREATE INDEX IF NOT EXISTS hw_answers_aluno_idx ON hw_answers (participantes, turma, criado_em DESC)`,
  `CREATE INDEX IF NOT EXISTS hw_answers_component_idx ON hw_answers (component_id)`,
  `CREATE INDEX IF NOT EXISTS hw_answers_desafio_idx ON hw_answers (desafio_id)`,

  // ---------------- Monte o PC Ideal ----------------
  `CREATE TABLE IF NOT EXISTS pc_missoes (
    id SERIAL PRIMARY KEY,
    emoji TEXT NOT NULL DEFAULT '💻',
    persona_nome TEXT NOT NULL,
    persona_descricao TEXT NOT NULL DEFAULT '',
    necessidade TEXT NOT NULL DEFAULT '',
    orcamento_centavos INTEGER NOT NULL DEFAULT 0,
    ordem INTEGER NOT NULL DEFAULT 0,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS pc_submissoes (
    id SERIAL PRIMARY KEY,
    missao_id INTEGER NOT NULL REFERENCES pc_missoes(id) ON DELETE CASCADE,
    participantes TEXT NOT NULL,
    turma TEXT NOT NULL,
    justificativa TEXT NOT NULL DEFAULT '',
    total_centavos INTEGER NOT NULL DEFAULT 0,
    dentro_orcamento BOOLEAN NOT NULL DEFAULT TRUE,
    feedback_professor TEXT NOT NULL DEFAULT '',
    revisado BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS pc_submissao_itens (
    id SERIAL PRIMARY KEY,
    submissao_id INTEGER NOT NULL REFERENCES pc_submissoes(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL,
    nome_peca TEXT NOT NULL,
    preco_centavos INTEGER NOT NULL DEFAULT 0,
    link TEXT NOT NULL DEFAULT '',
    ordem INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS pc_submissoes_missao_idx ON pc_submissoes (missao_id, criado_em DESC)`,
];

async function garantirSchema(db) {
  for (const sql of COMANDOS) {
    await db.query(sql);
  }
}

module.exports = { garantirSchema };
