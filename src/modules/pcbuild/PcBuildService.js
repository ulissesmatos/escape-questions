const HttpError = require('../../http/HttpError');
const { validar } = require('../../http/routing');

const MAX_ITENS = 30;

/** Monte o PC Ideal — sem gabarito: o professor avalia as propostas por critério. */
class PcBuildService {
  constructor(db) {
    this.db = db;
  }

  async missoesAtivas() {
    const linhas = await this.db.many(
      `SELECT id, emoji, persona_nome, persona_descricao, necessidade, orcamento_centavos
       FROM pc_missoes WHERE ativa = TRUE ORDER BY ordem, id`
    );
    return linhas.map((m) => ({
      id: m.id,
      emoji: m.emoji,
      personaNome: m.persona_nome,
      personaDescricao: m.persona_descricao,
      necessidade: m.necessidade,
      orcamentoCentavos: m.orcamento_centavos,
    }));
  }

  normalizarItens(itens) {
    if (!Array.isArray(itens) || itens.length === 0) throw HttpError.badRequest('Adicione pelo menos uma peça na proposta.');
    if (itens.length > MAX_ITENS) throw HttpError.badRequest(`A proposta pode ter no máximo ${MAX_ITENS} peças.`);

    return itens.map((item) => {
      const preco = Math.round(Number(item?.precoCentavos));
      if (!Number.isFinite(preco) || preco < 0 || preco > 100_000_000) {
        throw HttpError.badRequest('Cada peça precisa de um preço válido.');
      }
      return {
        categoria: validar.texto(item?.categoria, 'Cada peça precisa de uma categoria.', { max: 80 }),
        nomePeca: validar.texto(item?.nomePeca, 'Cada peça precisa de um nome.', { max: 300 }),
        precoCentavos: preco,
        link: validar.textoOpcional(item?.link, { max: 1000 }),
      };
    });
  }

  async enviarProposta({ participantes, turma }, body) {
    const missaoId = validar.id(body.missaoId, 'Missão inválida.');
    const itens = this.normalizarItens(body.itens);
    const justificativa = validar.texto(body.justificativa, 'Explique por que as peças escolhidas são compatíveis entre si.', { max: 5000 });

    const missao = await this.db.one(`SELECT id, orcamento_centavos FROM pc_missoes WHERE id = $1 AND ativa = TRUE`, [missaoId]);
    if (!missao) throw HttpError.notFound('Missão não encontrada.');

    const totalCentavos = itens.reduce((soma, item) => soma + item.precoCentavos, 0);
    const dentroOrcamento = totalCentavos <= missao.orcamento_centavos;

    const id = await this.db.transaction(async (tx) => {
      const { id: submissaoId } = await tx.one(
        `INSERT INTO pc_submissoes (missao_id, participantes, turma, justificativa, total_centavos, dentro_orcamento)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [missaoId, participantes, turma, justificativa, totalCentavos, dentroOrcamento]
      );
      for (const [ordem, item] of itens.entries()) {
        await tx.query(
          `INSERT INTO pc_submissao_itens (submissao_id, categoria, nome_peca, preco_centavos, link, ordem)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [submissaoId, item.categoria, item.nomePeca, item.precoCentavos, item.link, ordem]
        );
      }
      return submissaoId;
    });

    return { id, totalCentavos, dentroOrcamento };
  }
}

module.exports = PcBuildService;
