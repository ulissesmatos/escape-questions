import { SafeStorage } from '../core/SafeStorage.js';
import { ApiClient } from '../core/ApiClient.js';

/**
 * Sessão do professor: guarda só o token (nunca a senha), na sessionStorage
 * — fechar a aba encerra a sessão.
 */
export class AdminSession {
  constructor({ aoExpirar }) {
    this.armazenamento = new SafeStorage('session', 'admin:');
    this.aoExpirar = aoExpirar;
    this.api = new ApiClient({
      base: '/api/admin',
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
