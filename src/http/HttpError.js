/** Erro com status HTTP — lançado pelas regras de negócio, tratado no errorHandler. */
class HttpError extends Error {
  constructor(status, mensagem, extras = {}) {
    super(mensagem);
    this.status = status;
    this.extras = extras;
  }

  static badRequest(mensagem, extras) {
    return new HttpError(400, mensagem, extras);
  }

  static unauthorized(mensagem = 'Não autorizado.') {
    return new HttpError(401, mensagem);
  }

  static notFound(mensagem = 'Não encontrado.') {
    return new HttpError(404, mensagem);
  }

  static conflict(mensagem, extras) {
    return new HttpError(409, mensagem, extras);
  }

  static tooManyRequests(mensagem, extras) {
    return new HttpError(429, mensagem, extras);
  }
}

module.exports = HttpError;
