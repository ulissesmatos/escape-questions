// Missões iniciais do Monte o PC Ideal — só para popular um banco vazio.
// Cada persona tem uma necessidade diferente (não só jogos) de propósito.
const MISSOES_INICIAIS = [
  {
    emoji: '🎮',
    personaNome: 'Enzo quer jogar',
    personaDescricao: 'Enzo, 14 anos, quer um PC pra jogar com os amigos depois da escola. A família não pode gastar muito.',
    necessidade: 'Precisa rodar jogos leves e moderados sem travar. Vai precisar de uma placa de vídeo, mesmo que simples.',
    orcamentoCentavos: 250000,
  },
  {
    emoji: '🎬',
    personaNome: 'Marina cria conteúdo',
    personaDescricao: 'Marina tem um canal de vídeos e edita tudo em casa — cortes, efeitos e exportação em alta qualidade.',
    necessidade: 'Precisa de um processador rápido e bastante memória RAM pra não travar editando vídeo. Placa de vídeo ajuda, mas não é o mais importante.',
    orcamentoCentavos: 320000,
  },
  {
    emoji: '🏠',
    personaNome: 'Professor Ricardo, home office',
    personaDescricao: 'Ricardo dá aula online, usa planilhas, PDF e videochamada o dia todo. Não joga nem edita vídeo.',
    necessidade: 'Não precisa de placa de vídeo dedicada nem de peças caras — o importante é não gastar dinheiro à toa em algo que ele não vai usar.',
    orcamentoCentavos: 150000,
  },
  {
    emoji: '🎵',
    personaNome: 'Beatriz produz música',
    personaDescricao: 'Beatriz grava e mixa músicas em casa, com vários instrumentos e faixas de áudio abertos ao mesmo tempo.',
    necessidade: 'Precisa de processador rápido e bastante armazenamento pra guardar os projetos e as gravações.',
    orcamentoCentavos: 280000,
  },
  {
    emoji: '♿',
    personaNome: 'Laboratório de inclusão da escola',
    personaDescricao: 'A escola quer montar um PC pro laboratório de inclusão, usado com leitor de tela e outros softwares de acessibilidade.',
    necessidade: 'Precisa rodar os softwares de acessibilidade sem travar, com um orçamento bem enxuto — é dinheiro público.',
    orcamentoCentavos: 200000,
  },
];

async function semearMonteOPc(db) {
  const { total } = await db.one('SELECT COUNT(*)::int AS total FROM pc_missoes');
  if (total > 0) return;
  await db.transaction(async (tx) => {
    for (const [i, m] of MISSOES_INICIAIS.entries()) {
      await tx.query(
        `INSERT INTO pc_missoes (emoji, persona_nome, persona_descricao, necessidade, orcamento_centavos, ordem)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [m.emoji, m.personaNome, m.personaDescricao, m.necessidade, m.orcamentoCentavos, i]
      );
    }
  });
}

module.exports = { semearMonteOPc };
