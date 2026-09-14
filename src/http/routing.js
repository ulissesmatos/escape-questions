const HttpError = require('./HttpError');

/** Envolve um handler async para que erros cheguem ao errorHandler do Express. */
function rota(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof HttpError) {
    return res.status(err.status).json({ erro: err.message, ...err.extras });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido.' });
  }
  console.error(`[erro] ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ erro: 'Erro interno no servidor. Tente novamente.' });
}

/** Helpers de validação de entrada — lançam HttpError 400 com mensagem amigável. */
const validar = {
  texto(valor, mensagem, { max = 2000 } = {}) {
    if (typeof valor !== 'string' || !valor.trim()) throw HttpError.badRequest(mensagem);
    return valor.trim().slice(0, max);
  },

  textoOpcional(valor, { max = 5000 } = {}) {
    return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
  },

  id(valor, mensagem = 'ID inválido.') {
    const n = Number(valor);
    if (!Number.isInteger(n) || n <= 0) throw HttpError.badRequest(mensagem);
    return n;
  },

  inteiro(valor, padrao = 0) {
    const n = Number(valor);
    return Number.isFinite(n) ? Math.round(n) : padrao;
  },

  numero(valor, padrao = 0) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : padrao;
  },

  booleano(valor, padrao = true) {
    return typeof valor === 'boolean' ? valor : padrao;
  },

  /** Nome do aluno/grupo + turma, usados como identidade nas atividades. */
  identidade(body = {}) {
    return {
      participantes: validar.texto(body.participantes, 'Informe o nome do aluno ou os nomes do grupo.', { max: 200 }),
      turma: validar.texto(body.turma, 'Informe a turma.', { max: 60 }),
    };
  },
};

module.exports = { rota, errorHandler, validar };
