/** Números gerais e atividade recente para a tela inicial do professor. */
class AdminDashboardService {
  constructor(db) {
    this.db = db;
  }

  async turmas() {
    const linhas = await this.db.many(
      `SELECT turma FROM (
         SELECT turma FROM submissions
         UNION SELECT turma FROM hw_answers
         UNION SELECT turma FROM pc_submissoes
       ) t ORDER BY turma`
    );
    return linhas.map((l) => l.turma);
  }

  async resumo({ turma = '' } = {}) {
    const t = turma.trim() || null;
    const [escape, hardware, pc, recentes] = await Promise.all([
      this.db.one(
        `SELECT COUNT(*)::int AS envios,
                COUNT(*) FILTER (WHERE criado_em >= date_trunc('day', now()))::int AS hoje,
                COUNT(DISTINCT (participantes, turma))::int AS alunos,
                COALESCE(ROUND(AVG(acertos::numeric / NULLIF(total, 0)) * 100), 0)::int AS media_acertos
         FROM submissions WHERE ($1::text IS NULL OR turma = $1)`,
        [t]
      ),
      this.db.one(
        `SELECT COUNT(DISTINCT (participantes, turma))::int AS alunos,
                COUNT(*) FILTER (WHERE criado_em >= date_trunc('day', now()))::int AS tentativas_hoje,
                COUNT(*) FILTER (WHERE resultado = 'rapido_demais')::int AS rapidas,
                COUNT(*) FILTER (WHERE correta)::int AS acertos,
                COUNT(*)::int AS tentativas
         FROM hw_answers WHERE ($1::text IS NULL OR turma = $1)`,
        [t]
      ),
      this.db.one(
        `SELECT COUNT(*)::int AS propostas,
                COUNT(*) FILTER (WHERE NOT revisado)::int AS pendentes
         FROM pc_submissoes WHERE ($1::text IS NULL OR turma = $1)`,
        [t]
      ),
      this.db.many(
        `(SELECT 'escape' AS atividade, participantes, turma, criado_em,
                 acertos || ' de ' || total || ' pistas certas' AS descricao
          FROM submissions WHERE ($1::text IS NULL OR turma = $1)
          ORDER BY criado_em DESC LIMIT 8)
         UNION ALL
         (SELECT 'hardware', participantes, turma, criado_em, 'Descobriu: ' || componente_nome
          FROM hw_answers WHERE correta AND ($1::text IS NULL OR turma = $1)
          ORDER BY criado_em DESC LIMIT 8)
         UNION ALL
         (SELECT 'pc', s.participantes, s.turma, s.criado_em, 'Proposta para ' || m.persona_nome
          FROM pc_submissoes s JOIN pc_missoes m ON m.id = s.missao_id
          WHERE ($1::text IS NULL OR s.turma = $1)
          ORDER BY s.criado_em DESC LIMIT 8)
         ORDER BY criado_em DESC LIMIT 12`,
        [t]
      ),
    ]);

    return {
      escape: { envios: escape.envios, hoje: escape.hoje, alunos: escape.alunos, mediaAcertos: escape.media_acertos },
      hardware: {
        alunos: hardware.alunos,
        tentativasHoje: hardware.tentativas_hoje,
        rapidas: hardware.rapidas,
        taxaAcerto: hardware.tentativas ? Math.round((hardware.acertos / hardware.tentativas) * 100) : 0,
      },
      pc: { propostas: pc.propostas, pendentes: pc.pendentes },
      recentes: recentes.map((r) => ({
        atividade: r.atividade,
        participantes: r.participantes,
        turma: r.turma,
        descricao: r.descricao,
        criadoEm: r.criado_em,
      })),
    };
  }
}

module.exports = AdminDashboardService;
