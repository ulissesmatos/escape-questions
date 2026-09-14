const Random = require('../../shared/Random');

const TIPOS_ESCAPE = ['digito', 'multipla_escolha', 'verdadeiro_falso'];

/**
 * Regras do Escape Room: pistas públicas (sem gabarito) e correção do envio.
 * O aluno não vê a nota — só o professor, no admin.
 */
class EscapeRoomService {
  constructor(db) {
    this.db = db;
  }

  async opcoesPorPergunta(ids, tx = this.db) {
    if (!ids.length) return new Map();
    const linhas = await tx.many(
      `SELECT id, question_id, texto, correta, ordem FROM question_options
       WHERE question_id = ANY($1::int[]) ORDER BY question_id, ordem, id`,
      [ids]
    );
    const mapa = new Map();
    for (const o of linhas) {
      if (!mapa.has(o.question_id)) mapa.set(o.question_id, []);
      mapa.get(o.question_id).push(o);
    }
    return mapa;
  }

  /** Pistas ativas para o aluno. Múltipla escolha vem embaralhada a cada carregamento. */
  async pistasPublicas() {
    const perguntas = await this.db.many(
      `SELECT id, tipo, titulo, enunciado, pergunta FROM questions WHERE ativa = TRUE ORDER BY ordem, id`
    );
    const opcoes = await this.opcoesPorPergunta(perguntas.map((p) => p.id));
    const rng = new Random();

    return perguntas.map((p) => {
      if (p.tipo === 'digito') return { ...p };
      const lista = (opcoes.get(p.id) || []).map((o) => ({ id: String(o.id), texto: o.texto }));
      return { ...p, opcoes: p.tipo === 'multipla_escolha' ? rng.shuffle(lista) : lista };
    });
  }

  async corrigirEnvio({ participantes, turma }, respostas = {}) {
    const perguntas = await this.db.many(
      `SELECT id, tipo, titulo, resposta_digito FROM questions WHERE ativa = TRUE ORDER BY ordem, id`
    );
    const opcoes = await this.opcoesPorPergunta(perguntas.map((p) => p.id));

    const detalhes = perguntas.map((p) => {
      const resposta = respostas[p.id] || {};
      if (p.tipo === 'digito') {
        const digito = String(resposta.digito ?? '').trim();
        return {
          id: p.id,
          titulo: p.titulo,
          tipo: p.tipo,
          respostaTexto: String(resposta.texto ?? '').trim().slice(0, 300),
          respostaDigito: digito || null,
          correta: /^\d$/.test(digito) && Number(digito) === p.resposta_digito,
        };
      }
      const escolhida = (opcoes.get(p.id) || []).find((o) => String(o.id) === String(resposta.opcao ?? resposta.opcaoId));
      return {
        id: p.id,
        titulo: p.titulo,
        tipo: p.tipo,
        opcaoId: escolhida ? escolhida.id : null,
        opcaoTexto: escolhida ? escolhida.texto : null,
        correta: Boolean(escolhida && escolhida.correta),
      };
    });

    const acertos = detalhes.filter((d) => d.correta).length;
    const total = perguntas.length;
    await this.db.query(
      `INSERT INTO submissions (participantes, turma, respostas, acertos, total, completo)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [participantes, turma, JSON.stringify(detalhes), acertos, total, total > 0 && acertos === total]
    );
    return { ok: true };
  }
}

module.exports = { EscapeRoomService, TIPOS_ESCAPE };
