const crypto = require('crypto');
const HttpError = require('../http/HttpError');

/** Limita tentativas de login por IP para dificultar adivinhar a senha. */
class LoginRateLimiter {
  constructor({ maxFalhas = 5, janelaMs = 10 * 60 * 1000, bloqueioMs = 60 * 1000 } = {}) {
    this.maxFalhas = maxFalhas;
    this.janelaMs = janelaMs;
    this.bloqueioMs = bloqueioMs;
    this.registros = new Map();
  }

  restanteBloqueioMs(chave, agora = Date.now()) {
    const r = this.registros.get(chave);
    return r && r.bloqueadoAte > agora ? r.bloqueadoAte - agora : 0;
  }

  registrarFalha(chave, agora = Date.now()) {
    const r = this.registros.get(chave);
    const atual = r && agora - r.inicio < this.janelaMs ? r : { inicio: agora, falhas: 0, bloqueadoAte: 0 };
    atual.falhas += 1;
    if (atual.falhas >= this.maxFalhas) {
      atual.bloqueadoAte = agora + this.bloqueioMs;
      atual.falhas = 0;
      atual.inicio = agora;
    }
    this.registros.set(chave, atual);
    this.limparAntigos(agora);
  }

  limpar(chave) {
    this.registros.delete(chave);
  }

  limparAntigos(agora) {
    if (this.registros.size < 500) return;
    for (const [chave, r] of this.registros) {
      if (agora - r.inicio > this.janelaMs && r.bloqueadoAte < agora) this.registros.delete(chave);
    }
  }
}

/**
 * Sessão do professor com token assinado (HMAC-SHA256), sem estado no
 * servidor: `base64url(payload).base64url(assinatura)`.
 * A senha nunca trafega depois do login e nunca fica salva no navegador.
 */
class AdminAuth {
  constructor({ senha, segredo, horas = 12, limitador = new LoginRateLimiter() }) {
    this.senha = String(senha);
    this.segredo = segredo || crypto.createHash('sha256').update(`escape-admin:${this.senha}`).digest('hex');
    this.duracaoMs = horas * 60 * 60 * 1000;
    this.limitador = limitador;
  }

  static comparar(a, b) {
    const hashA = crypto.createHash('sha256').update(String(a)).digest();
    const hashB = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  }

  assinar(conteudo) {
    return crypto.createHmac('sha256', this.segredo).update(conteudo).digest('base64url');
  }

  login(senhaInformada, ip) {
    const bloqueio = this.limitador.restanteBloqueioMs(ip);
    if (bloqueio > 0) {
      throw HttpError.tooManyRequests(`Muitas tentativas. Tente de novo em ${Math.ceil(bloqueio / 1000)} segundos.`, {
        bloqueioMs: bloqueio,
      });
    }
    if (typeof senhaInformada !== 'string' || !AdminAuth.comparar(senhaInformada, this.senha)) {
      this.limitador.registrarFalha(ip);
      throw HttpError.unauthorized('Senha incorreta.');
    }
    this.limitador.limpar(ip);

    const expiraEm = Date.now() + this.duracaoMs;
    const payload = Buffer.from(JSON.stringify({ exp: expiraEm, iat: Date.now() })).toString('base64url');
    return { token: `${payload}.${this.assinar(payload)}`, expiraEm };
  }

  verificar(token) {
    if (typeof token !== 'string' || !token.includes('.')) return null;
    const [payload, assinatura] = token.split('.');
    const esperada = this.assinar(payload);
    if (!assinatura || assinatura.length !== esperada.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperada))) return null;

    try {
      const dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      return dados.exp > Date.now() ? dados : null;
    } catch {
      return null;
    }
  }

  /** Middleware Express: exige `Authorization: Bearer <token>` válido */
  exigirSessao() {
    return (req, res, next) => {
      const cabecalho = req.get('authorization') || '';
      const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : '';
      const sessao = this.verificar(token);
      if (!sessao) return next(HttpError.unauthorized('Sessão expirada. Entre novamente.'));
      req.sessaoAdmin = sessao;
      next();
    };
  }
}

module.exports = { AdminAuth, LoginRateLimiter };
