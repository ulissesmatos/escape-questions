const { NIVEIS, COMPONENTES, CONEXOES } = require('./seed/mapa');
const { BANCO_DE_QUESTOES } = require('./seed/bancoDeQuestoes');

/**
 * Popula o Mapa de Hardware sem nunca sobrescrever o que o professor já fez:
 *  - níveis e componentes só são criados em banco vazio (ou quando o nível
 *    acabou de ser criado, no caso de bancos bem antigos, sem níveis);
 *  - o banco de questões novo é inserido em cada componente que ainda não
 *    tem nenhuma questão no formato novo (hw_questoes).
 */
class HardwareSeeder {
  constructor(db, tipos, { log = console.log } = {}) {
    this.db = db;
    this.tipos = tipos;
    this.log = log;
  }

  async executar() {
    await this.db.transaction(async (tx) => {
      const niveisCriados = await this.garantirNiveis(tx);
      await this.garantirComponentes(tx, niveisCriados);
    });
    await this.garantirQuestoes();
  }

  /** @returns {Map<string, number>} chave do nível → id, só dos níveis criados agora */
  async garantirNiveis(tx) {
    const criados = new Map();
    const { total } = await tx.one(`SELECT COUNT(*)::int AS total FROM hw_niveis`);
    if (total > 0) return criados;

    for (const nivel of NIVEIS) {
      const { id } = await tx.one(
        `INSERT INTO hw_niveis (nome, descricao, ordem) VALUES ($1, $2, $3) RETURNING id`,
        [nivel.nome, nivel.descricao, nivel.ordem]
      );
      criados.set(nivel.chave, id);
    }

    // Bancos anteriores aos níveis: os componentes existentes eram do Nível 1
    await tx.query(`UPDATE hw_components SET nivel_id = $1 WHERE nivel_id IS NULL`, [criados.get(NIVEIS[0].chave)]);
    this.log(`[seed] ${criados.size} níveis do Mapa de Hardware criados`);
    return criados;
  }

  async garantirComponentes(tx, niveisCriados) {
    const { total } = await tx.one(`SELECT COUNT(*)::int AS total FROM hw_components`);
    const bancoVazio = total === 0;
    if (!bancoVazio && niveisCriados.size === 0) return;

    const idsNiveis = bancoVazio && niveisCriados.size === 0 ? await this.idsDosNiveisPorOrdem(tx) : niveisCriados;
    const existentes = new Map(
      (await tx.many(`SELECT id, nome FROM hw_components`)).map((c) => [c.nome, c.id])
    );
    const criadosAgora = new Set();

    for (const c of COMPONENTES) {
      const nivelId = idsNiveis.get(c.nivel);
      if (!nivelId || existentes.has(c.nome)) continue;
      const { id } = await tx.one(
        `INSERT INTO hw_components (nome, icone, imagem, pos_x, pos_y, inicial, nivel_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [c.nome, c.icone, c.imagem || '', c.posX, c.posY, Boolean(c.inicial), nivelId]
      );
      existentes.set(c.nome, id);
      criadosAgora.add(c.nome);
    }

    for (const [de, para] of CONEXOES) {
      if (!criadosAgora.has(de) && !criadosAgora.has(para)) continue;
      if (!existentes.has(de) || !existentes.has(para)) continue;
      await tx.query(`INSERT INTO hw_connections (de_id, para_id) VALUES ($1, $2)`, [existentes.get(de), existentes.get(para)]);
    }

    if (criadosAgora.size) this.log(`[seed] ${criadosAgora.size} componentes do Mapa de Hardware criados`);
  }

  /** Banco sem componentes mas com níveis cadastrados: associa pela ordem */
  async idsDosNiveisPorOrdem(tx) {
    const niveis = await tx.many(`SELECT id FROM hw_niveis ORDER BY ordem, id`);
    return new Map(NIVEIS.map((n, i) => [n.chave, niveis[i] && niveis[i].id]).filter(([, id]) => id));
  }

  async garantirQuestoes() {
    const componentes = await this.db.many(
      `SELECT c.id, c.nome FROM hw_components c
       WHERE NOT EXISTS (SELECT 1 FROM hw_questoes q WHERE q.component_id = c.id)`
    );

    let inseridas = 0;
    for (const componente of componentes) {
      const questoes = BANCO_DE_QUESTOES[componente.nome];
      if (!questoes) continue;

      await this.db.transaction(async (tx) => {
        for (const q of questoes) {
          const erro = this.tipos.get(q.tipo).validar(q);
          if (erro) throw new Error(`Questão inválida no banco (${componente.nome}): ${erro}`);
          await tx.query(
            `INSERT INTO hw_questoes (component_id, tipo, dificuldade, enunciado, pergunta, conteudo, explicacao)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [componente.id, q.tipo, q.dificuldade, q.enunciado, q.pergunta, JSON.stringify(q.conteudo), q.explicacao]
          );
          inseridas++;
        }
      });
    }
    if (inseridas) this.log(`[seed] ${inseridas} questões adaptativas inseridas no Mapa de Hardware`);
  }
}

module.exports = HardwareSeeder;
