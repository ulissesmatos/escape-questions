const express = require('express');
const HttpError = require('./HttpError');
const { rota, validar } = require('./routing');

/**
 * Recurso CRUD genérico sobre uma tabela. Cada campo declara a coluna, o
 * tipo e se é obrigatório; a classe cuida de converter API ↔ banco, validar
 * e gerar o SQL. Subclasses sobrescrevem os ganchos (validar, depoisDeSalvar,
 * consultaListagem...) quando precisam de regras específicas.
 *
 * Tipos de campo: texto | textoOpcional | inteiro | numero | booleano | idOpcional | json
 */
class TableResource {
  constructor(db, { tabela, nome, campos, ordenacao = 'id', colunasExtras = [], temAtualizadoEm = false }) {
    this.db = db;
    this.tabela = tabela;
    this.nome = nome;
    this.campos = campos;
    this.ordenacao = ordenacao;
    this.colunasExtras = colunasExtras;
    this.temAtualizadoEm = temAtualizadoEm;
  }

  /** Converte o corpo da requisição em { coluna: valor } já validado */
  deApi(body = {}) {
    const valores = {};
    for (const [chave, def] of Object.entries(this.campos)) {
      if (def.somenteLeitura) continue;
      valores[def.coluna] = this.converterCampo(body[chave], def, chave);
    }
    return valores;
  }

  converterCampo(valor, def, chave) {
    switch (def.tipo) {
      case 'texto':
        return validar.texto(valor, def.mensagem || `Informe ${chave}.`, { max: def.max || 2000 });
      case 'textoOpcional':
        return validar.textoOpcional(valor, { max: def.max || 5000 }) || def.padrao || '';
      case 'inteiro':
        return validar.inteiro(valor, def.padrao ?? 0);
      case 'numero':
        return validar.numero(valor, def.padrao ?? 0);
      case 'booleano':
        return validar.booleano(valor, def.padrao ?? true);
      case 'idOpcional': {
        const n = Number(valor);
        return Number.isInteger(n) && n > 0 ? n : null;
      }
      case 'json':
        return JSON.stringify(valor && typeof valor === 'object' ? valor : def.padrao ?? {});
      default:
        throw new Error(`Tipo de campo desconhecido: ${def.tipo}`);
    }
  }

  /** Converte uma linha do banco para o formato da API (camelCase) */
  paraApi(linha) {
    if (!linha) return null;
    const saida = { id: linha.id };
    for (const [chave, def] of Object.entries(this.campos)) saida[chave] = linha[def.coluna];
    for (const extra of this.colunasExtras) saida[extra.chave] = linha[extra.coluna];
    return saida;
  }

  /** Gancho: validações que dependem de mais de um campo. Lança HttpError. */
  async validar(valores, { id } = {}) { // eslint-disable-line no-unused-vars
    return valores;
  }

  consultaListagem() {
    return { sql: `SELECT * FROM ${this.tabela} ORDER BY ${this.ordenacao}`, params: [] };
  }

  async listar(filtros = {}) {
    const { sql, params } = this.consultaListagem(filtros);
    const linhas = await this.db.many(sql, params);
    return linhas.map((l) => this.paraApi(l));
  }

  async buscar(id) {
    const linha = await this.db.one(`SELECT * FROM ${this.tabela} WHERE id = $1`, [id]);
    if (!linha) throw HttpError.notFound(`${this.nome} não encontrado(a).`);
    return this.paraApi(linha);
  }

  async criar(body) {
    const valores = await this.validar(this.deApi(body));
    const colunas = Object.keys(valores);
    const linha = await this.db.one(
      `INSERT INTO ${this.tabela} (${colunas.join(', ')})
       VALUES (${colunas.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      Object.values(valores)
    );
    return this.paraApi(linha);
  }

  async atualizar(id, body) {
    const valores = await this.validar(this.deApi(body), { id });
    const colunas = Object.keys(valores);
    const sets = colunas.map((c, i) => `${c} = $${i + 1}`);
    if (this.temAtualizadoEm) sets.push('atualizado_em = now()');
    const linha = await this.db.one(
      `UPDATE ${this.tabela} SET ${sets.join(', ')} WHERE id = $${colunas.length + 1} RETURNING *`,
      [...Object.values(valores), id]
    );
    if (!linha) throw HttpError.notFound(`${this.nome} não encontrado(a).`);
    return this.paraApi(linha);
  }

  async excluir(id) {
    const { rowCount } = await this.db.query(`DELETE FROM ${this.tabela} WHERE id = $1`, [id]);
    if (!rowCount) throw HttpError.notFound(`${this.nome} não encontrado(a).`);
    return { ok: true };
  }

  /** Ações REST expostas pelo router — subclasses podem restringir */
  get acoes() {
    return ['listar', 'buscar', 'criar', 'atualizar', 'excluir'];
  }

  /** Router Express com as rotas REST das ações permitidas */
  router() {
    const r = express.Router();
    const permitidas = new Set(this.acoes);
    if (permitidas.has('listar')) r.get('/', rota(async (req, res) => res.json(await this.listar(req.query))));
    if (permitidas.has('buscar')) r.get('/:id', rota(async (req, res) => res.json(await this.buscar(validar.id(req.params.id)))));
    if (permitidas.has('criar')) r.post('/', rota(async (req, res) => res.status(201).json(await this.criar(req.body))));
    if (permitidas.has('atualizar')) {
      r.put('/:id', rota(async (req, res) => res.json(await this.atualizar(validar.id(req.params.id), req.body))));
    }
    if (permitidas.has('excluir')) r.delete('/:id', rota(async (req, res) => res.json(await this.excluir(validar.id(req.params.id)))));
    return r;
  }
}

module.exports = TableResource;
