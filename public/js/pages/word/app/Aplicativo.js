import { h } from '../../../core/dom.js';
import { Sessao } from './Sessao.js';
import { TelaEntrada } from './TelaEntrada.js';
import { TelaBase } from './TelaBase.js';
import { TelaMissao } from './TelaMissao.js';

/**
 * Uma atividade de missões no computador simulado (Operação Word, Operação
 * Anzol...): entrada com o @ → base com as missões → missão no computador.
 *
 * As missões rodam em tela cheia com o teclado "travado" (Keyboard Lock do
 * Chrome/Edge): assim Ctrl+N, Ctrl+T e Ctrl+W viram Negrito, Selecionar Tudo
 * e Fechar do Word, em vez de abrir janelas e abas do navegador.
 *
 * ?tudo libera todas as missões (para o professor conhecer).
 */
export class Aplicativo {
  constructor(raiz, curriculo) {
    this.raiz = raiz;
    this.curriculo = curriculo;
    this.sessao = new Sessao({ api: curriculo.api, armazenamento: curriculo.armazenamento });
    this.tela = null;
  }

  async iniciar() {
    await this.sessao.carregarConfig();
    if (new URLSearchParams(location.search).has('tudo')) this.sessao.config.liberarTudo = true;
    if (await this.sessao.retomar()) this.mostrarBase();
    else this.mostrarEntrada();
  }

  trocar(tela, nome) {
    this.tela?.destruir?.();
    this.tela = tela;
    document.body.dataset.tela = nome;
    this.raiz.replaceChildren(tela.el);
  }

  mostrarEntrada() {
    this.trocar(new TelaEntrada({ sessao: this.sessao, curriculo: this.curriculo, aoEntrar: () => this.mostrarBase() }), 'entrada');
  }

  mostrarBase() {
    this.sairDaTelaCheia();
    this.trocar(
      new TelaBase({
        sessao: this.sessao,
        curriculo: this.curriculo,
        aoJogar: (missao) => this.jogar(missao),
        aoTreino: () => this.jogar(null),
        aoSair: () => {
          this.sessao.sair();
          this.mostrarEntrada();
        },
      }),
      'base'
    );
  }

  jogar(missao) {
    this.entrarEmTelaCheia();
    this.trocar(
      new TelaMissao({
        sessao: this.sessao,
        curriculo: this.curriculo,
        missao,
        aoSair: () => this.mostrarBase(),
        aoJogar: (proxima) => this.jogar(proxima),
        alternarTelaCheia: () => (document.fullscreenElement ? this.sairDaTelaCheia() : this.entrarEmTelaCheia()),
      }),
      'missao'
    );
  }

  async entrarEmTelaCheia() {
    if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      await navigator.keyboard?.lock?.();
    } catch {
      // sem tela cheia (bloqueada ou não suportada): o simulador funciona igual
    }
  }

  sairDaTelaCheia() {
    navigator.keyboard?.unlock?.();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
}

/** Liga a atividade na página. ?teste expõe o app em window[nomeGlobal] (testes de navegador). */
export function iniciarAplicativo(raiz, curriculo, { nomeGlobal, erro }) {
  const app = new Aplicativo(raiz, curriculo);
  app.iniciar().catch((falha) => {
    console.error(falha);
    raiz.replaceChildren(h('p', { class: 'carregando', text: erro }));
  });
  if (new URLSearchParams(location.search).has('teste')) window[nomeGlobal] = app;
  return app;
}
