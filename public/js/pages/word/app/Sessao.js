import { ApiClient } from '../../../core/ApiClient.js';
import { SafeStorage } from '../../../core/SafeStorage.js';

/**
 * Conta do aluno na Operação Word: o @ é o login (sem senha). O token fica
 * no navegador para não precisar digitar o @ toda vez, e o progresso fica no
 * servidor (vale em qualquer computador da escola).
 *
 * Sem internet no meio da missão, a conclusão fica guardada no navegador e é
 * reenviada na próxima vez que der certo.
 */
export class Sessao {
  constructor() {
    this.local = new SafeStorage('local', 'operacaoWord:');
    this.token = this.local.ler('token');
    this.conta = null;
    this.progresso = new Map();
    this.config = { liberarTudo: false, semMostreMe: false };
    this.api = new ApiClient({ base: '/api/word', obterToken: () => this.token });
  }

  get ultimoArroba() {
    return this.local.ler('ultimoArroba');
  }

  aplicar({ conta, token, progresso = [] }) {
    this.conta = conta;
    if (token) {
      this.token = token;
      this.local.salvar('token', token);
    }
    this.local.salvar('ultimoArroba', conta.arroba);
    this.local.salvar('conta', conta);
    this.progresso = new Map(progresso.map((p) => [p.missao, p]));
    this.local.salvar(`progresso:${conta.arroba}`, progresso);
  }

  async carregarConfig() {
    try {
      this.config = { ...this.config, ...(await this.api.get('/config')) };
    } catch {
      // sem conexão: segue com o padrão
    }
    return this.config;
  }

  /** Volta para a conta salva no navegador. Devolve true se entrou. */
  async retomar() {
    if (!this.token) return false;
    try {
      this.aplicar(await this.api.get('/eu'));
      await this.enviarPendentes();
      return true;
    } catch (erro) {
      if (erro.status === 401) {
        this.sair();
        return false;
      }
      // sem internet: usa o que ficou guardado
      const conta = this.local.ler('conta');
      if (!conta) return false;
      this.conta = conta;
      this.progresso = new Map((this.local.ler(`progresso:${conta.arroba}`) || []).map((p) => [p.missao, p]));
      this.offline = true;
      return true;
    }
  }

  disponivel(arroba) {
    return this.api.get(`/arroba/${encodeURIComponent(arroba)}`);
  }

  async criar(dados) {
    this.aplicar(await this.api.post('/contas', dados));
  }

  async entrar(arroba) {
    this.aplicar(await this.api.post('/entrar', { arroba }));
    await this.enviarPendentes();
  }

  sair() {
    this.token = null;
    this.conta = null;
    this.progresso = new Map();
    this.local.remover('token');
    this.local.remover('conta');
  }

  concluidas() {
    return [...this.progresso.values()].filter((p) => p.concluida).map((p) => p.missao);
  }

  estrelas(missao) {
    return this.progresso.get(missao)?.estrelas || 0;
  }

  totalDeEstrelas() {
    return [...this.progresso.values()].reduce((soma, p) => soma + (p.concluida ? p.estrelas : 0), 0);
  }

  async iniciarMissao(missao) {
    try {
      await this.api.post(`/missoes/${missao}/inicio`);
    } catch {
      // registro de tentativa é só para o professor; não atrapalha a missão
    }
  }

  async concluirMissao(missao, dados) {
    const anterior = this.progresso.get(missao);
    const local = { missao, concluida: true, estrelas: Math.max(anterior?.estrelas || 0, dados.estrelas), melhorTempoMs: Math.min(anterior?.melhorTempoMs ?? Infinity, dados.tempoMs) };
    this.progresso.set(missao, local);
    this.local.salvar(`progresso:${this.conta.arroba}`, [...this.progresso.values()]);
    try {
      const salvo = await this.api.post(`/missoes/${missao}/conclusao`, dados);
      this.progresso.set(missao, salvo);
      return { salvo: true };
    } catch {
      const pendentes = this.local.ler('pendentes') || [];
      pendentes.push({ arroba: this.conta.arroba, missao, dados });
      this.local.salvar('pendentes', pendentes.slice(-30));
      return { salvo: false };
    }
  }

  async enviarPendentes() {
    const pendentes = (this.local.ler('pendentes') || []).filter((p) => p.arroba === this.conta?.arroba);
    if (!pendentes.length) return;
    const restantes = [];
    for (const p of pendentes) {
      try {
        const salvo = await this.api.post(`/missoes/${p.missao}/conclusao`, p.dados);
        this.progresso.set(p.missao, salvo);
      } catch {
        restantes.push(p);
      }
    }
    const outros = (this.local.ler('pendentes') || []).filter((p) => p.arroba !== this.conta?.arroba);
    this.local.salvar('pendentes', [...outros, ...restantes]);
  }
}
