import { h } from '../../core/dom.js';
import { Sessao } from './app/Sessao.js';
import { TelaEntrada } from './app/TelaEntrada.js';
import { TelaBase } from './app/TelaBase.js';
import { TelaMissao } from './app/TelaMissao.js';

/**
 * Operação Word: entrada com o @ → base com as missões → missão no
 * computador simulado.
 *
 * As missões rodam em tela cheia com o teclado "travado" (Keyboard Lock do
 * Chrome/Edge): assim Ctrl+N, Ctrl+T e Ctrl+W viram Negrito, Selecionar Tudo
 * e Fechar do Word, em vez de abrir janelas e abas do navegador.
 *
 * ?tudo libera todas as missões (para o professor conhecer).
 * ?teste expõe o app em window.operacaoWord (testes de navegador).
 */
class OperacaoWord {
  constructor(raiz) {
    this.raiz = raiz;
    this.sessao = new Sessao();
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
    this.trocar(new TelaEntrada({ sessao: this.sessao, aoEntrar: () => this.mostrarBase() }), 'entrada');
  }

  mostrarBase() {
    this.sairDaTelaCheia();
    this.trocar(
      new TelaBase({
        sessao: this.sessao,
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

const raiz = document.getElementById('operacao-word');
const app = new OperacaoWord(raiz);
app.iniciar().catch((erro) => {
  console.error(erro);
  raiz.replaceChildren(h('p', { class: 'carregando', text: 'Não foi possível abrir a Operação Word. Recarregue a página.' }));
});
if (new URLSearchParams(location.search).has('teste')) window.operacaoWord = app;
