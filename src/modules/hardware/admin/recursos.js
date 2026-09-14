const express = require('express');
const TableResource = require('../../../http/TableResource');
const HttpError = require('../../../http/HttpError');
const Random = require('../../../shared/Random');
const { rota, validar } = require('../../../http/routing');

class NivelResource extends TableResource {
  constructor(db) {
    super(db, {
      tabela: 'hw_niveis',
      nome: 'Nível',
      ordenacao: 'ordem, id',
      campos: {
        nome: { coluna: 'nome', tipo: 'texto', mensagem: 'Informe o nome do nível.', max: 120 },
        descricao: { coluna: 'descricao', tipo: 'textoOpcional', max: 500 },
        ordem: { coluna: 'ordem', tipo: 'inteiro' },
        ativo: { coluna: 'ativo', tipo: 'booleano' },
      },
      colunasExtras: [{ chave: 'totalComponentes', coluna: 'total_componentes' }],
    });
  }

  consultaListagem() {
    return {
      sql: `SELECT n.*, (SELECT COUNT(*)::int FROM hw_components c WHERE c.nivel_id = n.id) AS total_componentes
            FROM hw_niveis n ORDER BY n.ordem, n.id`,
      params: [],
    };
  }
}

class ComponenteResource extends TableResource {
  constructor(db) {
    super(db, {
      tabela: 'hw_components',
      nome: 'Componente',
      temAtualizadoEm: true,
      campos: {
        nome: { coluna: 'nome', tipo: 'texto', mensagem: 'Informe o nome do componente.', max: 120 },
        icone: { coluna: 'icone', tipo: 'textoOpcional', padrao: '🔧', max: 16 },
        imagem: { coluna: 'imagem', tipo: 'textoOpcional', max: 500 },
        nivelId: { coluna: 'nivel_id', tipo: 'idOpcional' },
        posX: { coluna: 'pos_x', tipo: 'numero', padrao: 50 },
        posY: { coluna: 'pos_y', tipo: 'numero', padrao: 50 },
        inicial: { coluna: 'inicial', tipo: 'booleano', padrao: false },
        ativo: { coluna: 'ativo', tipo: 'booleano' },
      },
      colunasExtras: [{ chave: 'totalQuestoes', coluna: 'total_questoes' }],
    });
  }

  async validar(valores) {
    valores.pos_x = Math.min(100, Math.max(0, valores.pos_x));
    valores.pos_y = Math.min(100, Math.max(0, valores.pos_y));
    return valores;
  }

  consultaListagem() {
    return {
      sql: `SELECT c.*, (SELECT COUNT(*)::int FROM hw_questoes q WHERE q.component_id = c.id) AS total_questoes
            FROM hw_components c ORDER BY c.nivel_id NULLS LAST, c.id`,
      params: [],
    };
  }

  async moverPara(id, posX, posY) {
    const limitar = (v) => Math.min(100, Math.max(0, Math.round(Number(v) * 10) / 10));
    if (!Number.isFinite(Number(posX)) || !Number.isFinite(Number(posY))) throw HttpError.badRequest('Posição inválida.');
    const linha = await this.db.one(
      `UPDATE hw_components SET pos_x = $1, pos_y = $2, atualizado_em = now() WHERE id = $3 RETURNING *`,
      [limitar(posX), limitar(posY), id]
    );
    if (!linha) throw HttpError.notFound('Componente não encontrado.');
    return this.paraApi(linha);
  }

  router() {
    const r = super.router();
    r.patch('/:id/posicao', rota(async (req, res) => {
      res.json(await this.moverPara(validar.id(req.params.id), req.body.posX, req.body.posY));
    }));
    return r;
  }
}

class ConexaoResource extends TableResource {
  constructor(db) {
    super(db, {
      tabela: 'hw_connections',
      nome: 'Conexão',
      campos: {
        deId: { coluna: 'de_id', tipo: 'idOpcional' },
        paraId: { coluna: 'para_id', tipo: 'idOpcional' },
      },
    });
  }

  get acoes() {
    return ['listar', 'criar', 'excluir'];
  }

  consultaListagem() {
    return { sql: `SELECT * FROM hw_connections ORDER BY id`, params: [] };
  }

  async validar(valores, { id } = {}) {
    if (!valores.de_id || !valores.para_id || valores.de_id === valores.para_id) {
      throw HttpError.badRequest('Selecione dois componentes diferentes.');
    }
    const repetida = await this.db.one(
      `SELECT id FROM hw_connections
       WHERE ((de_id = $1 AND para_id = $2) OR (de_id = $2 AND para_id = $1)) AND ($3::int IS NULL OR id <> $3)`,
      [valores.de_id, valores.para_id, id || null]
    );
    if (repetida) throw HttpError.badRequest('Essa conexão já existe.');
    return valores;
  }
}

class QuestaoResource extends TableResource {
  constructor(db, tipos) {
    super(db, {
      tabela: 'hw_questoes',
      nome: 'Questão',
      temAtualizadoEm: true,
      campos: {
        componentId: { coluna: 'component_id', tipo: 'idOpcional' },
        tipo: { coluna: 'tipo', tipo: 'texto', mensagem: 'Escolha o tipo da questão.', max: 40 },
        dificuldade: { coluna: 'dificuldade', tipo: 'inteiro', padrao: 2 },
        enunciado: { coluna: 'enunciado', tipo: 'textoOpcional', max: 1000 },
        pergunta: { coluna: 'pergunta', tipo: 'textoOpcional', max: 1000 },
        conteudo: { coluna: 'conteudo', tipo: 'json', padrao: {} },
        explicacao: { coluna: 'explicacao', tipo: 'textoOpcional', max: 1000 },
        ativa: { coluna: 'ativa', tipo: 'booleano' },
      },
    });
    this.tipos = tipos;
  }

  async validar(valores) {
    if (!valores.component_id) throw HttpError.badRequest('Escolha o componente da questão.');
    valores.dificuldade = Math.min(5, Math.max(1, valores.dificuldade));
    const erro = this.tipos.get(valores.tipo).validar({
      pergunta: valores.pergunta,
      conteudo: JSON.parse(valores.conteudo),
    });
    if (erro) throw HttpError.badRequest(erro);
    return valores;
  }

  consultaListagem({ componentId } = {}) {
    const id = Number(componentId) || null;
    return {
      sql: `SELECT q.*,
              (SELECT COUNT(*)::int FROM hw_answers a WHERE a.questao_id = q.id) AS vezes_respondida,
              (SELECT COUNT(*)::int FROM hw_answers a WHERE a.questao_id = q.id AND a.resultado = 'correta') AS vezes_certa
            FROM hw_questoes q
            WHERE ($1::int IS NULL OR q.component_id = $1)
            ORDER BY q.component_id, q.dificuldade, q.id`,
      params: [id],
    };
  }

  paraApi(linha) {
    const api = super.paraApi(linha);
    if (api && linha.vezes_respondida !== undefined) {
      api.estatisticas = { respondida: linha.vezes_respondida, certas: linha.vezes_certa };
    }
    return api;
  }

  /** Gera uma instância de teste para o professor ver como o aluno recebe a questão */
  previa(body) {
    const tipo = this.tipos.get(body.tipo);
    const questao = { pergunta: body.pergunta || '', enunciado: body.enunciado || '', conteudo: body.conteudo || {} };
    const erro = tipo.validar(questao);
    if (erro) throw HttpError.badRequest(erro);
    const { publico, gabarito } = tipo.instanciar(questao, new Random());
    return { questao: publico, respostaCerta: tipo.descreverGabarito(publico, gabarito) };
  }

  router() {
    const r = express.Router();
    r.get('/tipos', (req, res) => res.json(this.tipos.listar()));
    r.post('/previa', rota(async (req, res) => res.json(this.previa(req.body))));
    r.use('/', super.router());
    return r;
  }
}

module.exports = { NivelResource, ComponenteResource, ConexaoResource, QuestaoResource };
