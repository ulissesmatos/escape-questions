const TableResource = require('../../../http/TableResource');
const HttpError = require('../../../http/HttpError');

class MissaoResource extends TableResource {
  constructor(db) {
    super(db, {
      tabela: 'pc_missoes',
      nome: 'Missão',
      ordenacao: 'ordem, id',
      campos: {
        emoji: { coluna: 'emoji', tipo: 'textoOpcional', padrao: '💻', max: 16 },
        personaNome: { coluna: 'persona_nome', tipo: 'texto', mensagem: 'Informe o nome da persona.', max: 160 },
        personaDescricao: { coluna: 'persona_descricao', tipo: 'textoOpcional', max: 1000 },
        necessidade: { coluna: 'necessidade', tipo: 'textoOpcional', max: 1000 },
        orcamentoCentavos: { coluna: 'orcamento_centavos', tipo: 'inteiro' },
        ordem: { coluna: 'ordem', tipo: 'inteiro' },
        ativa: { coluna: 'ativa', tipo: 'booleano' },
      },
      colunasExtras: [
        { chave: 'totalPropostas', coluna: 'total_propostas' },
        { chave: 'pendentes', coluna: 'pendentes' },
      ],
    });
  }

  async validar(valores) {
    if (!(valores.orcamento_centavos > 0)) throw HttpError.badRequest('Informe um orçamento maior que zero.');
    return valores;
  }

  consultaListagem() {
    return {
      sql: `SELECT m.*,
              (SELECT COUNT(*)::int FROM pc_submissoes s WHERE s.missao_id = m.id) AS total_propostas,
              (SELECT COUNT(*)::int FROM pc_submissoes s WHERE s.missao_id = m.id AND NOT s.revisado) AS pendentes
            FROM pc_missoes m ORDER BY m.ordem, m.id`,
      params: [],
    };
  }
}

/** Propostas dos alunos: o professor só lê, dá feedback, marca como revisada ou exclui. */
class PropostaResource extends TableResource {
  constructor(db) {
    super(db, {
      tabela: 'pc_submissoes',
      nome: 'Proposta',
      campos: {
        feedbackProfessor: { coluna: 'feedback_professor', tipo: 'textoOpcional', max: 3000 },
        revisado: { coluna: 'revisado', tipo: 'booleano', padrao: false },
      },
    });
  }

  get acoes() {
    return ['listar', 'atualizar', 'excluir'];
  }

  consultaListagem({ missaoId, turma, status } = {}) {
    return {
      sql: `SELECT s.*, m.persona_nome, m.emoji, m.orcamento_centavos
            FROM pc_submissoes s JOIN pc_missoes m ON m.id = s.missao_id
            WHERE ($1::int IS NULL OR s.missao_id = $1)
              AND ($2::text IS NULL OR s.turma = $2)
              AND ($3::text IS NULL OR ($3 = 'pendentes' AND NOT s.revisado) OR ($3 = 'revisadas' AND s.revisado))
            ORDER BY s.criado_em DESC`,
      params: [Number(missaoId) || null, String(turma || '').trim() || null, status || null],
    };
  }

  async listar(filtros) {
    const { sql, params } = this.consultaListagem(filtros);
    const propostas = await this.db.many(sql, params);
    const ids = propostas.map((p) => p.id);
    const itens = ids.length
      ? await this.db.many(
          `SELECT submissao_id, categoria, nome_peca, preco_centavos, link
           FROM pc_submissao_itens WHERE submissao_id = ANY($1::int[]) ORDER BY submissao_id, ordem, id`,
          [ids]
        )
      : [];

    return propostas.map((s) => ({
      id: s.id,
      missaoId: s.missao_id,
      missaoNome: s.persona_nome,
      missaoEmoji: s.emoji,
      orcamentoCentavos: s.orcamento_centavos,
      participantes: s.participantes,
      turma: s.turma,
      justificativa: s.justificativa,
      totalCentavos: s.total_centavos,
      dentroOrcamento: s.dentro_orcamento,
      feedbackProfessor: s.feedback_professor,
      revisado: s.revisado,
      criadoEm: s.criado_em,
      itens: itens
        .filter((i) => i.submissao_id === s.id)
        .map((i) => ({ categoria: i.categoria, nomePeca: i.nome_peca, precoCentavos: i.preco_centavos, link: i.link })),
    }));
  }

  paraApi(linha) {
    return linha && { id: linha.id, feedbackProfessor: linha.feedback_professor, revisado: linha.revisado };
  }
}

module.exports = { MissaoResource, PropostaResource };
