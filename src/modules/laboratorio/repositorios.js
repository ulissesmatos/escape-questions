/**
 * Onde o Laboratório guarda as salas (para não perder a partida se o servidor
 * reiniciar) e as tarefas editadas no painel.
 *
 * Em produção é o PostgreSQL que o site já usa: um arquivo JSON dentro do
 * container seria apagado a cada deploy no Coolify. Nos testes, a versão em
 * memória faz o mesmo papel.
 */

// Salas paradas há mais tempo que isso não voltam depois de um reinício
const HORAS_GUARDADAS = 12;

class RepositorioLaboratorio {
  constructor(db) {
    this.db = db;
  }

  async carregarSalas() {
    const linhas = await this.db.many(
      `SELECT dados FROM lab_salas WHERE atualizado_em > now() - make_interval(hours => $1)`,
      [HORAS_GUARDADAS]
    );
    return linhas.map((l) => l.dados);
  }

  async salvarSala(codigo, dados) {
    await this.db.query(
      `INSERT INTO lab_salas (codigo, dados, atualizado_em) VALUES ($1, $2, now())
       ON CONFLICT (codigo) DO UPDATE SET dados = EXCLUDED.dados, atualizado_em = now()`,
      [codigo, JSON.stringify(dados)]
    );
  }

  async removerSala(codigo) {
    await this.db.query('DELETE FROM lab_salas WHERE codigo = $1', [codigo]);
  }

  async carregarTarefas() {
    const linha = await this.db.one(`SELECT valor FROM lab_config WHERE chave = 'tarefas'`);
    return linha ? linha.valor : null;
  }

  /** null apaga a versão editada (volta a valer o tasks.json) */
  async salvarTarefas(tarefas) {
    if (!tarefas) {
      await this.db.query(`DELETE FROM lab_config WHERE chave = 'tarefas'`);
      return;
    }
    await this.db.query(
      `INSERT INTO lab_config (chave, valor, atualizado_em) VALUES ('tarefas', $1, now())
       ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now()`,
      [JSON.stringify(tarefas)]
    );
  }
}

class RepositorioEmMemoria {
  constructor() {
    this.salas = new Map();
    this.tarefas = null;
  }

  async carregarSalas() {
    return [...this.salas.values()].map((d) => JSON.parse(d));
  }

  async salvarSala(codigo, dados) {
    this.salas.set(codigo, JSON.stringify(dados));
  }

  async removerSala(codigo) {
    this.salas.delete(codigo);
  }

  async carregarTarefas() {
    return this.tarefas;
  }

  async salvarTarefas(tarefas) {
    this.tarefas = tarefas;
  }
}

module.exports = { RepositorioLaboratorio, RepositorioEmMemoria, HORAS_GUARDADAS };
