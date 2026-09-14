const TableResource = require('../../../http/TableResource');
const HttpError = require('../../../http/HttpError');
const { TIPOS_ESCAPE } = require('../EscapeRoomService');

/**
 * Pista do Escape Room. Diferente dos outros recursos, múltipla escolha e
 * V/F guardam as alternativas numa tabela filha — por isso criar/atualizar
 * são sobrescritos para gravar tudo numa transação.
 */
class PistaResource extends TableResource {
  constructor(db) {
    super(db, {
      tabela: 'questions',
      nome: 'Pista',
      ordenacao: 'ordem, id',
      temAtualizadoEm: true,
      campos: {
        tipo: { coluna: 'tipo', tipo: 'texto', mensagem: 'Escolha o tipo da pista.' },
        titulo: { coluna: 'titulo', tipo: 'texto', mensagem: 'Informe o título da pista.', max: 200 },
        enunciado: { coluna: 'enunciado', tipo: 'textoOpcional', max: 2000 },
        pergunta: { coluna: 'pergunta', tipo: 'textoOpcional', max: 1000 },
        respostaDigito: { coluna: 'resposta_digito', tipo: 'idOpcional' },
        ordem: { coluna: 'ordem', tipo: 'inteiro' },
        ativa: { coluna: 'ativa', tipo: 'booleano' },
      },
    });
  }

  deApi(body = {}) {
    const valores = super.deApi(body);
    // 0 é um dígito válido — idOpcional descartaria o zero
    const digito = Number(body.respostaDigito);
    valores.resposta_digito = Number.isInteger(digito) ? digito : null;
    return valores;
  }

  normalizarOpcoes(tipo, opcoes) {
    if (tipo === 'digito') return [];
    const lista = (Array.isArray(opcoes) ? opcoes : [])
      .map((o) => ({ texto: String(o?.texto ?? '').trim(), correta: Boolean(o?.correta) }))
      .filter((o) => o.texto);
    if (tipo === 'verdadeiro_falso' && lista.length !== 2) throw HttpError.badRequest('Verdadeiro/falso precisa de exatamente 2 opções.');
    if (lista.length < 2) throw HttpError.badRequest('Adicione ao menos 2 opções de resposta.');
    if (lista.filter((o) => o.correta).length !== 1) throw HttpError.badRequest('Marque exatamente 1 opção correta.');
    return lista;
  }

  async validar(valores) {
    if (!TIPOS_ESCAPE.includes(valores.tipo)) throw HttpError.badRequest('Tipo de pista inválido.');
    if (valores.tipo === 'digito') {
      if (!Number.isInteger(valores.resposta_digito) || valores.resposta_digito < 0 || valores.resposta_digito > 9) {
        throw HttpError.badRequest('Informe o dígito correto (0 a 9).');
      }
    } else {
      valores.resposta_digito = null;
    }
    return valores;
  }

  async listar() {
    const pistas = await super.listar();
    const opcoes = await this.db.many(
      `SELECT id, question_id, texto, correta FROM question_options ORDER BY question_id, ordem, id`
    );
    return pistas.map((p) => ({ ...p, opcoes: opcoes.filter((o) => o.question_id === p.id).map(({ id, texto, correta }) => ({ id, texto, correta })) }));
  }

  async salvar(id, body) {
    const valores = await this.validar(this.deApi(body), { id });
    const opcoes = this.normalizarOpcoes(valores.tipo, body.opcoes);

    return this.db.transaction(async (tx) => {
      const colunas = Object.keys(valores);
      let linha;
      if (id) {
        linha = await tx.one(
          `UPDATE questions SET ${colunas.map((c, i) => `${c} = $${i + 1}`).join(', ')}, atualizado_em = now()
           WHERE id = $${colunas.length + 1} RETURNING *`,
          [...Object.values(valores), id]
        );
        if (!linha) throw HttpError.notFound('Pista não encontrada.');
        await tx.query('DELETE FROM question_options WHERE question_id = $1', [id]);
      } else {
        linha = await tx.one(
          `INSERT INTO questions (${colunas.join(', ')}) VALUES (${colunas.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
          Object.values(valores)
        );
      }
      for (const [ordem, o] of opcoes.entries()) {
        await tx.query(
          `INSERT INTO question_options (question_id, texto, correta, ordem) VALUES ($1, $2, $3, $4)`,
          [linha.id, o.texto, o.correta, ordem]
        );
      }
      return { ...this.paraApi(linha), opcoes };
    });
  }

  criar(body) {
    return this.salvar(null, body);
  }

  atualizar(id, body) {
    return this.salvar(id, body);
  }
}

class EnvioResource extends TableResource {
  constructor(db) {
    super(db, {
      tabela: 'submissions',
      nome: 'Envio',
      campos: {
        participantes: { coluna: 'participantes', tipo: 'texto', somenteLeitura: true },
        turma: { coluna: 'turma', tipo: 'texto', somenteLeitura: true },
        respostas: { coluna: 'respostas', tipo: 'json', somenteLeitura: true },
        acertos: { coluna: 'acertos', tipo: 'inteiro', somenteLeitura: true },
        total: { coluna: 'total', tipo: 'inteiro', somenteLeitura: true },
        completo: { coluna: 'completo', tipo: 'booleano', somenteLeitura: true },
      },
      colunasExtras: [{ chave: 'criadoEm', coluna: 'criado_em' }],
    });
  }

  consultaListagem({ turma } = {}) {
    return {
      sql: `SELECT * FROM submissions WHERE ($1::text IS NULL OR turma = $1) ORDER BY criado_em DESC`,
      params: [String(turma || '').trim() || null],
    };
  }

  // Envios são só leitura (e exclusão); criar/editar pelo admin não faz sentido
  get acoes() {
    return ['listar', 'buscar', 'excluir'];
  }
}

module.exports = { PistaResource, EnvioResource };
