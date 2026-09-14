/**
 * Acesso a dados do Mapa de Hardware (lado do aluno). Só SQL — as regras do
 * jogo ficam no HardwareGameService.
 *
 * Métodos que recebem `tx` rodam dentro de uma transação aberta pelo serviço.
 */
class HardwareRepository {
  constructor(db) {
    this.db = db;
  }

  // ---------------- Estrutura do mapa ----------------

  async niveisComProgresso({ participantes, turma }) {
    return this.db.many(
      `SELECT n.id, n.nome, n.descricao, n.ordem,
              COUNT(DISTINCT c.id)::int AS total,
              COUNT(DISTINCT a.component_id)::int AS descobertos
       FROM hw_niveis n
       LEFT JOIN hw_components c ON c.nivel_id = n.id AND c.ativo = TRUE
       LEFT JOIN hw_answers a ON a.component_id = c.id AND a.correta = TRUE
                              AND a.participantes = $1 AND a.turma = $2
       WHERE n.ativo = TRUE
       GROUP BY n.id
       ORDER BY n.ordem, n.id`,
      [participantes, turma]
    );
  }

  async componentesDoNivel(nivelId) {
    return this.db.many(
      `SELECT id, nome, icone, imagem, pos_x, pos_y, inicial, nivel_id
       FROM hw_components WHERE ativo = TRUE AND nivel_id = $1 ORDER BY id`,
      [nivelId]
    );
  }

  async conexoesEntre(ids) {
    if (!ids.length) return [];
    return this.db.many(
      `SELECT de_id, para_id FROM hw_connections
       WHERE de_id = ANY($1::int[]) AND para_id = ANY($1::int[])`,
      [ids]
    );
  }

  async componente(id) {
    return this.db.one(
      `SELECT id, nome, icone, imagem, inicial, nivel_id FROM hw_components WHERE id = $1 AND ativo = TRUE`,
      [id]
    );
  }

  async vizinhos(componentId) {
    const linhas = await this.db.many(
      `SELECT CASE WHEN de_id = $1 THEN para_id ELSE de_id END AS id
       FROM hw_connections WHERE de_id = $1 OR para_id = $1`,
      [componentId]
    );
    return linhas.map((l) => l.id);
  }

  async idsDescobertos({ participantes, turma }, componentIds = null) {
    const linhas = await this.db.many(
      `SELECT DISTINCT component_id FROM hw_answers
       WHERE participantes = $1 AND turma = $2 AND correta = TRUE AND component_id IS NOT NULL
         AND ($3::int[] IS NULL OR component_id = ANY($3::int[]))`,
      [participantes, turma, componentIds]
    );
    return new Set(linhas.map((l) => l.component_id));
  }

  // ---------------- Questões ----------------

  async questoesAtivas(componentId) {
    return this.db.many(
      `SELECT id, component_id, tipo, dificuldade, enunciado, pergunta, conteudo, explicacao
       FROM hw_questoes WHERE component_id = $1 AND ativa = TRUE`,
      [componentId]
    );
  }

  async historicoNoComponente(perfilId, componentId) {
    return this.db.many(
      `SELECT d.questao_id,
              COUNT(*)::int AS vezes,
              BOOL_OR(a.resultado IS DISTINCT FROM 'correta' AND a.id IS NOT NULL) AS errou,
              MAX(d.emitido_em) AS ultima_vez
       FROM hw_desafios d
       LEFT JOIN hw_answers a ON a.desafio_id = d.id
       WHERE d.perfil_id = $1 AND d.component_id = $2 AND d.questao_id IS NOT NULL
       GROUP BY d.questao_id`,
      [perfilId, componentId]
    );
  }

  async ultimoDesafio(perfilId, componentId) {
    return this.db.one(
      `SELECT id, questao_id, respondido_em FROM hw_desafios
       WHERE perfil_id = $1 AND component_id = $2
       ORDER BY emitido_em DESC LIMIT 1`,
      [perfilId, componentId]
    );
  }

  async questaoExplicacao(questaoId) {
    const linha = await this.db.one(`SELECT explicacao FROM hw_questoes WHERE id = $1`, [questaoId]);
    return linha ? linha.explicacao : '';
  }

  // ---------------- Perfil adaptativo ----------------

  async perfil({ participantes, turma }, tx = this.db, { bloquear = false } = {}) {
    await tx.query(
      `INSERT INTO hw_perfis (participantes, turma) VALUES ($1, $2)
       ON CONFLICT (participantes, turma) DO NOTHING`,
      [participantes, turma]
    );
    const linha = await tx.one(
      `SELECT *, GREATEST(0, EXTRACT(EPOCH FROM (pausa_ate - now())) * 1000)::int AS pausa_restante_ms
       FROM hw_perfis WHERE participantes = $1 AND turma = $2 ${bloquear ? 'FOR UPDATE' : ''}`,
      [participantes, turma]
    );
    return HardwareRepository.perfilParaObjeto(linha);
  }

  static perfilParaObjeto(linha) {
    return {
      id: linha.id,
      habilidade: Number(linha.habilidade),
      sequenciaAcertos: linha.sequencia_acertos,
      sequenciaErros: linha.sequencia_erros,
      pausas: linha.pausas,
      pausaRestanteMs: Number(linha.pausa_restante_ms) || 0,
    };
  }

  async salvarPerfil(tx, perfil, { pausaSegundos = 0 } = {}) {
    await tx.query(
      `UPDATE hw_perfis
       SET habilidade = $1, sequencia_acertos = $2, sequencia_erros = $3, pausas = $4,
           pausa_ate = CASE WHEN $5::int > 0 THEN now() + ($5::int * INTERVAL '1 second') ELSE pausa_ate END,
           atualizado_em = now()
       WHERE id = $6`,
      [perfil.habilidade, perfil.sequenciaAcertos, perfil.sequenciaErros, perfil.pausas, pausaSegundos, perfil.id]
    );
  }

  // ---------------- Desafios ----------------

  async criarDesafio(dados) {
    await this.db.query(
      `INSERT INTO hw_desafios (id, perfil_id, component_id, questao_id, dificuldade, publico, gabarito, tempo_minimo_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        dados.id,
        dados.perfilId,
        dados.componentId,
        dados.questaoId,
        dados.dificuldade,
        JSON.stringify(dados.publico),
        JSON.stringify(dados.gabarito),
        dados.tempoMinimoMs,
      ]
    );
  }

  /** Busca e trava o desafio para responder; calcula o tempo pelo relógio do banco */
  async desafioParaResponder(tx, desafioId) {
    return tx.one(
      `SELECT d.*, c.nome AS componente_nome, q.tipo AS questao_tipo,
              (EXTRACT(EPOCH FROM (now() - d.emitido_em)) * 1000)::int AS tempo_ms
       FROM hw_desafios d
       JOIN hw_components c ON c.id = d.component_id
       LEFT JOIN hw_questoes q ON q.id = d.questao_id
       WHERE d.id = $1
       FOR UPDATE OF d`,
      [desafioId]
    );
  }

  async marcarRespondido(tx, desafioId) {
    await tx.query(`UPDATE hw_desafios SET respondido_em = now() WHERE id = $1`, [desafioId]);
  }

  async limparDesafiosAntigos() {
    await this.db.query(`DELETE FROM hw_desafios WHERE emitido_em < now() - INTERVAL '2 days' AND respondido_em IS NULL`);
  }

  // ---------------- Tentativas ----------------

  async registrarTentativa(tx, t) {
    await tx.query(
      `INSERT INTO hw_answers
         (participantes, turma, component_id, componente_nome, opcao_texto, correta, questao_id, desafio_id,
          tipo, dificuldade, resultado, tempo_ms, tempo_minimo_ms, pergunta_texto, resposta_certa_texto,
          habilidade_antes, habilidade_depois)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        t.participantes,
        t.turma,
        t.componentId,
        t.componenteNome,
        t.respostaTexto,
        t.resultado === 'correta',
        t.questaoId,
        t.desafioId,
        t.tipo,
        t.dificuldade,
        t.resultado,
        t.tempoMs,
        t.tempoMinimoMs,
        t.perguntaTexto,
        t.respostaCertaTexto,
        t.habilidadeAntes,
        t.habilidadeDepois,
      ]
    );
  }

  async tentativasRecentes(tx, { participantes, turma }, limite = 10) {
    const linhas = await tx.many(
      `SELECT resultado, correta, tempo_ms, tempo_minimo_ms, criado_em
       FROM hw_answers
       WHERE participantes = $1 AND turma = $2 AND resultado IS NOT NULL
       ORDER BY criado_em DESC, id DESC LIMIT $3`,
      [participantes, turma, limite]
    );
    return linhas.map((l) => ({
      resultado: l.resultado,
      tempoMs: l.tempo_ms,
      tempoMinimoMs: l.tempo_minimo_ms,
      criadoEm: l.criado_em,
    }));
  }
}

module.exports = HardwareRepository;
