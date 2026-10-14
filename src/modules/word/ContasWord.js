const crypto = require('crypto');
const HttpError = require('../../http/HttpError');
const { nomeOfensivo } = require('../laboratorio/nomes');
const { validarArroba, normalizarArroba } = require('./arroba');

const MISSAO_VALIDA = /^[a-z0-9-]{1,40}$/;
const MAX_DOCUMENTO = 150 * 1024; // HTML da entrega (só texto; imagens são caminhos)

/** Tira scripts e atributos de evento: o professor vê a entrega num iframe sem scripts, isto é só uma segunda barreira */
function limparDocumento(html) {
  if (typeof html !== 'string') return null;
  return html
    .slice(0, MAX_DOCUMENTO)
    .replace(/<\s*(script|style|iframe|object|textarea)\b[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<\/?\s*(script|style|iframe|object|embed|link|meta|base|form)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2');
}

function validarNomeAluno(nome) {
  const limpo = String(nome ?? '').replace(/\s+/g, ' ').trim();
  if (limpo.length < 2) throw HttpError.badRequest('Digite seu nome (pelo menos 2 letras).');
  if (limpo.length > 40) throw HttpError.badRequest('Use um nome menor (até 40 letras).');
  if (!/^[\p{L} .'-]+$/u.test(limpo)) throw HttpError.badRequest('Use só letras no nome.');
  if (nomeOfensivo(limpo)) throw HttpError.badRequest('Esse nome não é permitido. Use seu nome de verdade.');
  return limpo;
}

function validarTurma(turma) {
  const limpa = String(turma ?? '').replace(/\s+/g, ' ').trim();
  if (!limpa) throw HttpError.badRequest('Informe a sua turma.');
  return limpa.slice(0, 30);
}

const numeroLimitado = (valor, maximo) => Math.min(maximo, Math.max(0, Math.round(Number(valor) || 0)));

/**
 * Contas da Operação Word: o aluno cria um @ (com nome e turma) e depois
 * entra só com ele, sem senha. O token que o navegador guarda é o id da conta
 * assinado (HMAC), só para as rotas de progresso saberem quem é.
 */
class ContasWord {
  constructor({ db, segredo }) {
    this.db = db;
    this.segredo = segredo;
  }

  token(id) {
    const assinatura = crypto.createHmac('sha256', this.segredo).update(`word:${id}`).digest('base64url');
    return `${id}.${assinatura}`;
  }

  /** Devolve o id da conta do token, ou null se ele não confere */
  lerToken(token) {
    const [id, assinatura] = String(token || '').split('.');
    if (!/^\d+$/.test(id || '') || !assinatura) return null;
    const esperado = this.token(id).split('.')[1];
    const a = Buffer.from(assinatura);
    const b = Buffer.from(esperado);
    return a.length === b.length && crypto.timingSafeEqual(a, b) ? Number(id) : null;
  }

  /** Middleware: exige o token do aluno e põe req.contaWord = id */
  exigirConta() {
    return (req, res, next) => {
      const id = this.lerToken((req.get('authorization') || '').replace(/^Bearer\s+/i, ''));
      if (!id) return next(HttpError.unauthorized('Entre com o seu @ para continuar.'));
      req.contaWord = id;
      next();
    };
  }

  static publica(linha) {
    return { id: linha.id, arroba: linha.arroba, nome: linha.nome, turma: linha.turma, criadoEm: linha.criado_em };
  }

  async disponivel(texto) {
    let arroba;
    try {
      arroba = validarArroba(texto);
    } catch (erro) {
      return { arroba: normalizarArroba(texto), disponivel: false, erro: erro.message };
    }
    const existe = await this.db.one('SELECT 1 FROM word_contas WHERE arroba = $1', [arroba]);
    return { arroba, disponivel: !existe, erro: existe ? 'Esse @ já existe. Se for o seu, use "Já tenho meu @".' : null };
  }

  async criar({ arroba: texto, nome, turma } = {}) {
    let arroba;
    try {
      arroba = validarArroba(texto);
    } catch (erro) {
      throw HttpError.badRequest(erro.message);
    }
    const dados = [arroba, validarNomeAluno(nome), validarTurma(turma)];
    const linha = await this.db.one(
      `INSERT INTO word_contas (arroba, nome, turma) VALUES ($1, $2, $3)
       ON CONFLICT (arroba) DO NOTHING
       RETURNING id, arroba, nome, turma, criado_em`,
      dados
    );
    if (!linha) throw HttpError.conflict('Esse @ já existe. Se for o seu, use "Já tenho meu @".');
    return { conta: ContasWord.publica(linha), token: this.token(linha.id), progresso: [] };
  }

  async entrar({ arroba: texto } = {}) {
    const arroba = normalizarArroba(texto);
    const linha = arroba
      ? await this.db.one(
          `UPDATE word_contas SET ultimo_acesso = now() WHERE arroba = $1
           RETURNING id, arroba, nome, turma, criado_em`,
          [arroba]
        )
      : null;
    if (!linha) throw HttpError.notFound(`Não encontramos o @${arroba || '...'}. Confira se digitou certo ou crie o seu @.`);
    return { conta: ContasWord.publica(linha), token: this.token(linha.id), progresso: await this.progresso(linha.id) };
  }

  async eu(id) {
    const linha = await this.db.one('SELECT id, arroba, nome, turma, criado_em FROM word_contas WHERE id = $1', [id]);
    if (!linha) throw HttpError.unauthorized('Essa conta não existe mais. Entre ou crie seu @ de novo.');
    return { conta: ContasWord.publica(linha), progresso: await this.progresso(id) };
  }

  async progresso(id) {
    const linhas = await this.db.many(
      `SELECT missao, tentativas, estrelas, melhor_tempo_ms, concluida_em
       FROM word_progresso WHERE conta_id = $1`,
      [id]
    );
    return linhas.map((l) => ({
      missao: l.missao,
      tentativas: l.tentativas,
      estrelas: l.estrelas,
      melhorTempoMs: l.melhor_tempo_ms,
      concluida: Boolean(l.concluida_em),
    }));
  }

  static missao(id) {
    if (!MISSAO_VALIDA.test(String(id))) throw HttpError.badRequest('Missão inválida.');
    return String(id);
  }

  async iniciar(contaId, missao) {
    await this.db.query(
      `INSERT INTO word_progresso (conta_id, missao, tentativas, iniciada_em) VALUES ($1, $2, 1, now())
       ON CONFLICT (conta_id, missao) DO UPDATE SET tentativas = word_progresso.tentativas + 1, iniciada_em = now()`,
      [contaId, ContasWord.missao(missao)]
    );
    await this.db.query('UPDATE word_contas SET ultimo_acesso = now() WHERE id = $1', [contaId]);
    return { ok: true };
  }

  /**
   * Guarda o resultado: estrelas e tempo ficam com o melhor; ajuda, "perdido"
   * e o documento entregue ficam com a última vez (é o que o professor quer ver).
   */
  async concluir(contaId, missao, corpo = {}) {
    const dados = [
      contaId,
      ContasWord.missao(missao),
      numeroLimitado(corpo.estrelas, 3) || 1,
      numeroLimitado(corpo.tempoMs, 6 * 60 * 60 * 1000),
      numeroLimitado(corpo.dicas, 999),
      numeroLimitado(corpo.mostreMe, 999),
      numeroLimitado(corpo.perdido, 999),
      limparDocumento(corpo.documento),
    ];
    const linha = await this.db.one(
      `INSERT INTO word_progresso
         (conta_id, missao, tentativas, estrelas, melhor_tempo_ms, dicas, mostre_me, perdido, documento, iniciada_em, concluida_em)
       VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, now(), now())
       ON CONFLICT (conta_id, missao) DO UPDATE SET
         estrelas = GREATEST(word_progresso.estrelas, EXCLUDED.estrelas),
         melhor_tempo_ms = LEAST(COALESCE(word_progresso.melhor_tempo_ms, EXCLUDED.melhor_tempo_ms), EXCLUDED.melhor_tempo_ms),
         dicas = EXCLUDED.dicas,
         mostre_me = EXCLUDED.mostre_me,
         perdido = EXCLUDED.perdido,
         documento = COALESCE(EXCLUDED.documento, word_progresso.documento),
         concluida_em = now()
       RETURNING missao, tentativas, estrelas, melhor_tempo_ms, concluida_em`,
      dados
    );
    await this.db.query('UPDATE word_contas SET ultimo_acesso = now() WHERE id = $1', [contaId]);
    return { missao: linha.missao, tentativas: linha.tentativas, estrelas: linha.estrelas, melhorTempoMs: linha.melhor_tempo_ms, concluida: true };
  }

  // ---------------- Área do professor ----------------

  async listar({ turma = '' } = {}) {
    const linhas = await this.db.many(
      `SELECT c.id, c.arroba, c.nome, c.turma, c.criado_em, c.ultimo_acesso,
              COUNT(p.concluida_em)::int AS concluidas,
              COALESCE(SUM(p.estrelas) FILTER (WHERE p.concluida_em IS NOT NULL), 0)::int AS estrelas,
              COALESCE(SUM(p.perdido), 0)::int AS perdido,
              COALESCE(SUM(p.dicas + p.mostre_me), 0)::int AS ajudas,
              (SELECT missao FROM word_progresso q
                WHERE q.conta_id = c.id AND q.concluida_em IS NULL
                ORDER BY q.iniciada_em DESC NULLS LAST LIMIT 1) AS em_andamento
       FROM word_contas c
       LEFT JOIN word_progresso p ON p.conta_id = c.id
       WHERE ($1::text IS NULL OR c.turma = $1)
       GROUP BY c.id
       ORDER BY c.turma, c.nome`,
      [turma.trim() || null]
    );
    return linhas.map((l) => ({
      id: l.id,
      arroba: l.arroba,
      nome: l.nome,
      turma: l.turma,
      criadoEm: l.criado_em,
      ultimoAcesso: l.ultimo_acesso,
      concluidas: l.concluidas,
      estrelas: l.estrelas,
      perdido: l.perdido,
      ajudas: l.ajudas,
      emAndamento: l.em_andamento,
    }));
  }

  /** Por missão: quantos começaram, concluíram, estrelas e ajuda média, quantos se perderam */
  async estatisticas({ turma = '' } = {}) {
    const linhas = await this.db.many(
      `SELECT p.missao,
              COUNT(*)::int AS iniciaram,
              COUNT(p.concluida_em)::int AS concluiram,
              COALESCE(ROUND(AVG(p.estrelas) FILTER (WHERE p.concluida_em IS NOT NULL), 1), 0)::float AS estrelas,
              COALESCE(ROUND(AVG(p.dicas + p.mostre_me) FILTER (WHERE p.concluida_em IS NOT NULL), 1), 0)::float AS ajudas,
              COUNT(*) FILTER (WHERE p.perdido > 0)::int AS se_perderam,
              COALESCE(ROUND(AVG(p.tentativas), 1), 0)::float AS tentativas,
              ROUND(AVG(p.melhor_tempo_ms) FILTER (WHERE p.concluida_em IS NOT NULL))::int AS tempo_medio_ms
       FROM word_progresso p
       JOIN word_contas c ON c.id = p.conta_id
       WHERE ($1::text IS NULL OR c.turma = $1)
       GROUP BY p.missao`,
      [turma.trim() || null]
    );
    return linhas.map((l) => ({
      missao: l.missao,
      iniciaram: l.iniciaram,
      concluiram: l.concluiram,
      estrelas: l.estrelas,
      ajudas: l.ajudas,
      sePerderam: l.se_perderam,
      tentativas: l.tentativas,
      tempoMedioMs: l.tempo_medio_ms,
    }));
  }

  async detalhe(id) {
    const conta = await this.db.one('SELECT id, arroba, nome, turma, criado_em, ultimo_acesso FROM word_contas WHERE id = $1', [id]);
    if (!conta) throw HttpError.notFound('Aluno não encontrado.');
    const missoes = await this.db.many(
      `SELECT missao, tentativas, estrelas, melhor_tempo_ms, dicas, mostre_me, perdido, documento, iniciada_em, concluida_em
       FROM word_progresso WHERE conta_id = $1`,
      [id]
    );
    return {
      conta: { ...ContasWord.publica(conta), ultimoAcesso: conta.ultimo_acesso },
      missoes: missoes.map((m) => ({
        missao: m.missao,
        tentativas: m.tentativas,
        estrelas: m.estrelas,
        melhorTempoMs: m.melhor_tempo_ms,
        dicas: m.dicas,
        mostreMe: m.mostre_me,
        perdido: m.perdido,
        documento: m.documento,
        iniciadaEm: m.iniciada_em,
        concluidaEm: m.concluida_em,
      })),
    };
  }

  async editar(id, corpo = {}) {
    const atual = await this.db.one('SELECT arroba, nome, turma FROM word_contas WHERE id = $1', [id]);
    if (!atual) throw HttpError.notFound('Aluno não encontrado.');
    let arroba = atual.arroba;
    if (corpo.arroba !== undefined) {
      try {
        arroba = validarArroba(corpo.arroba);
      } catch (erro) {
        throw HttpError.badRequest(erro.message);
      }
    }
    const nome = corpo.nome !== undefined ? validarNomeAluno(corpo.nome) : atual.nome;
    const turma = corpo.turma !== undefined ? validarTurma(corpo.turma) : atual.turma;
    try {
      await this.db.query('UPDATE word_contas SET arroba = $2, nome = $3, turma = $4 WHERE id = $1', [id, arroba, nome, turma]);
    } catch (erro) {
      if (erro.code === '23505') throw HttpError.conflict('Já existe outro aluno com esse @.');
      throw erro;
    }
    return { id, arroba, nome, turma };
  }

  async zerar(id) {
    await this.db.query('DELETE FROM word_progresso WHERE conta_id = $1', [id]);
    return { ok: true };
  }

  async excluir(id) {
    await this.db.query('DELETE FROM word_contas WHERE id = $1', [id]);
    return { ok: true };
  }
}

module.exports = { ContasWord, limparDocumento };
