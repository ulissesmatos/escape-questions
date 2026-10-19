const express = require('express');
const { rota, validar } = require('../../http/routing');

/**
 * Configurações da Operação Word que o professor muda no painel. Ficam numa
 * linha da tabela `configuracoes`.
 *
 * liberarTudo: todas as missões abertas desde o começo (sem precisar
 * concluir a anterior). Útil para revisar um assunto com a turma.
 *
 * semMostreMe: esconde o botão "Mostre-me" nas missões (menos na missão
 * guiada). Sem ele, o aluno precisa ler o objetivo e procurar sozinho; a
 * Dica continua. Bom para turmas que só clicam no Mostre-me sem ler.
 */
const CHAVE = 'word';
const PADRAO = Object.freeze({ liberarTudo: false, semMostreMe: false });

class WordConfig {
  constructor(db) {
    this.db = db;
  }

  async ler() {
    const linha = await this.db.one('SELECT valor FROM configuracoes WHERE chave = $1', [CHAVE]);
    return { ...PADRAO, ...(linha && linha.valor) };
  }

  async salvar(dados = {}) {
    const atual = await this.ler();
    const novo = {
      ...atual,
      ...(typeof dados.liberarTudo === 'boolean' && { liberarTudo: dados.liberarTudo }),
      ...(typeof dados.semMostreMe === 'boolean' && { semMostreMe: dados.semMostreMe }),
    };
    await this.db.query(
      `INSERT INTO configuracoes (chave, valor, atualizado_em) VALUES ($1, $2, now())
       ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now()`,
      [CHAVE, JSON.stringify(novo)]
    );
    return novo;
  }
}

/** /api/word: o aluno cria o @, entra com ele e registra o progresso */
function wordRoutes({ contas, config }) {
  const r = express.Router();

  r.get('/config', rota(async (req, res) => res.json(await config.ler())));
  r.get('/arroba/:arroba', rota(async (req, res) => res.json(await contas.disponivel(req.params.arroba))));
  r.post('/contas', rota(async (req, res) => res.status(201).json(await contas.criar(req.body || {}))));
  r.post('/entrar', rota(async (req, res) => res.json(await contas.entrar(req.body || {}))));

  r.use(contas.exigirConta());
  r.get('/eu', rota(async (req, res) => res.json(await contas.eu(req.contaWord))));
  r.post('/missoes/:missao/inicio', rota(async (req, res) => res.json(await contas.iniciar(req.contaWord, req.params.missao))));
  r.post('/missoes/:missao/conclusao', rota(async (req, res) => res.json(await contas.concluir(req.contaWord, req.params.missao, req.body || {}))));
  return r;
}

/** /api/admin/word: o professor acompanha os alunos (exige a sessão do admin) */
function adminWordRoutes({ contas, config }) {
  const r = express.Router();
  r.get('/config', rota(async (req, res) => res.json(await config.ler())));
  r.put('/config', rota(async (req, res) => res.json(await config.salvar(req.body || {}))));
  r.get('/alunos', rota(async (req, res) => res.json(await contas.listar({ turma: String(req.query.turma || '') }))));
  r.get('/missoes', rota(async (req, res) => res.json(await contas.estatisticas({ turma: String(req.query.turma || '') }))));
  r.get('/alunos/:id', rota(async (req, res) => res.json(await contas.detalhe(validar.id(req.params.id)))));
  r.patch('/alunos/:id', rota(async (req, res) => res.json(await contas.editar(validar.id(req.params.id), req.body || {}))));
  r.delete('/alunos/:id/progresso', rota(async (req, res) => res.json(await contas.zerar(validar.id(req.params.id)))));
  r.delete('/alunos/:id', rota(async (req, res) => res.json(await contas.excluir(validar.id(req.params.id)))));
  return r;
}

module.exports = { wordRoutes, adminWordRoutes, WordConfig };
