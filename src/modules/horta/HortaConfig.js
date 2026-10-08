/**
 * Configurações do Robô na Horta que o professor muda no painel e que valem
 * para todos os alunos. Ficam numa linha da tabela `configuracoes`.
 *
 * memoria: liga a "memória do Bip" (limite de blocos nos mundos 2 e 3, que
 * obriga o uso do Repita). Desligada, o aluno conclui a fase de qualquer
 * jeito e o robô só sugere o Repita para ganhar a estrela da meta.
 */
const CHAVE = 'horta';
const PADRAO = Object.freeze({ memoria: false });

class HortaConfig {
  constructor(db) {
    this.db = db;
  }

  async ler() {
    const linha = await this.db.one('SELECT valor FROM configuracoes WHERE chave = $1', [CHAVE]);
    return { ...PADRAO, ...(linha && linha.valor) };
  }

  async salvar(dados = {}) {
    const atual = await this.ler();
    const novo = { ...atual, ...(typeof dados.memoria === 'boolean' && { memoria: dados.memoria }) };
    await this.db.query(
      `INSERT INTO configuracoes (chave, valor, atualizado_em) VALUES ($1, $2, now())
       ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now()`,
      [CHAVE, JSON.stringify(novo)]
    );
    return novo;
  }
}

module.exports = { HortaConfig, PADRAO };
