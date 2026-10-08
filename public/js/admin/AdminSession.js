import { SafeStorage } from '../core/SafeStorage.js';
import { ApiClient } from '../core/ApiClient.js';

/**
 * Sessão do professor: guarda só o token (nunca a senha), na sessionStorage
 * — fechar a aba encerra a sessão.
 * `base` e `prefixo` permitem outra área com login próprio (ex.: o PIN do Laboratório).
 */
export class AdminSession {
  constructor({ aoExpirar, base = '/api/admin', prefixo = 'admin:' }) {
    this.armazenamento = new SafeStorage('session', prefixo);
    this.aoExpirar = aoExpirar;
    this.api = new ApiClient({
      base,
      obterToken: () => this.token,
      aoNaoAutorizado: () => this.expirar(),
    });
  }

  get token() {
    const sessao = this.armazenamento.ler('sessao');
    if (!sessao || sessao.expiraEm < Date.now()) return null;
    return sessao.token;
  }

  get ativa() {
    return Boolean(this.token);
  }

  async entrar(senha) {
    const sessao = await this.api.post('/login', { senha });
    this.armazenamento.salvar('sessao', sessao);
    return sessao;
  }

  sair() {
    this.armazenamento.remover('sessao');
  }

  expirar() {
    if (!this.armazenamento.ler('sessao')) return;
    this.sair();
    this.aoExpirar();
  }
}
