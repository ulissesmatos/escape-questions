const { Pool } = require('pg');

/**
 * Pequena camada sobre o pool do `pg`: centraliza consultas e transações
 * para que repositórios não precisem repetir BEGIN/COMMIT/ROLLBACK.
 */
class Database {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString });
  }

  async query(sql, params = []) {
    return this.pool.query(sql, params);
  }

  async many(sql, params = []) {
    const { rows } = await this.pool.query(sql, params);
    return rows;
  }

  async one(sql, params = []) {
    const { rows } = await this.pool.query(sql, params);
    return rows[0] || null;
  }

  /**
   * Executa `trabalho(cliente)` dentro de uma transação. O cliente recebido
   * tem a mesma interface (query/many/one) da própria Database.
   */
  async transaction(trabalho) {
    const client = await this.pool.connect();
    const tx = {
      query: (sql, params = []) => client.query(sql, params),
      many: async (sql, params = []) => (await client.query(sql, params)).rows,
      one: async (sql, params = []) => (await client.query(sql, params)).rows[0] || null,
    };
    try {
      await client.query('BEGIN');
      const resultado = await trabalho(tx);
      await client.query('COMMIT');
      return resultado;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = Database;
