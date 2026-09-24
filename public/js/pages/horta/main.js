import { h, substituirFilhos } from '../../core/dom.js';
import { FASES } from './regras/fases.js';
import { Progresso } from './jogo/Progresso.js';
import { TelaFase } from './jogo/TelaFase.js';
import { TelaMapa } from './jogo/TelaMapa.js';
import { sons } from './jogo/sons.js';

/**
 * O jogo tem tela própria (sem o menu do site): uma barra de cima com Sair,
 * estrelas, som e tela cheia, e o resto da tela para a fase.
 * Troca entre o mapa de fases e uma fase pelo endereço (#fase-2-3), assim o
 * botão Voltar do navegador também funciona.
 * ?tudo libera todas as fases (para o professor conhecer o jogo).
 */
class JogoHorta {
  constructor(raiz) {
    const parametros = new URLSearchParams(location.search);
    this.progresso = new Progresso({ liberarTudo: parametros.has('tudo') });
    this.tela = null;

    this.centro = h('div', { class: 'topo-centro' });
    this.total = h('span', { class: 'topo-estrelas', title: 'Estrelas conquistadas' });
    this.botaoSom = h('button', { type: 'button', class: 'botao-topo', onClick: () => this.alternarSom() });
    const podeTelaCheia = !!document.documentElement.requestFullscreen;
    this.conteudo = h('main', { class: 'jogo-conteudo' });

    substituirFilhos(
      raiz,
      h(
        'header',
        { class: 'jogo-topo' },
        h('a', { href: 'index.html', class: 'botao-topo botao-sair', title: 'Voltar para as atividades' }, '⟵ Sair'),
        h('div', { class: 'topo-marca' }, h('span', { class: 'topo-logo', 'aria-hidden': 'true', text: '🤖' }), h('span', { class: 'topo-nome', text: 'Robô na Horta' })),
        this.centro,
        h(
          'div',
          { class: 'topo-direita' },
          this.total,
          this.botaoSom,
          podeTelaCheia &&
            h('button', {
              type: 'button',
              class: 'botao-topo',
              title: 'Tela cheia',
              'aria-label': 'Tela cheia',
              text: '⛶',
              onClick: () => this.alternarTelaCheia(),
            })
        )
      ),
      this.conteudo
    );

    window.addEventListener('hashchange', () => this.abrir());
    if (!location.hash && this.progresso.total() === 0) history.replaceState(null, '', `#fase-${FASES[0].id}`);
    this.atualizarSom();
    this.abrir();
  }

  atualizarTotal() {
    this.total.textContent = `★ ${this.progresso.total()} / ${FASES.length * 3}`;
  }

  atualizarSom() {
    this.botaoSom.textContent = sons.ligado ? '🔊' : '🔇';
    this.botaoSom.title = sons.ligado ? 'Desligar o som' : 'Ligar o som';
  }

  alternarSom() {
    sons.alternar();
    this.atualizarSom();
    sons.tocar('clique');
  }

  alternarTelaCheia() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  abrir() {
    if (this.tela) this.tela.destruir();
    substituirFilhos(this.centro);
    const id = location.hash.startsWith('#fase-') ? location.hash.slice(6) : null;
    const indice = FASES.findIndex((f) => f.id === id);
    const comum = {
      alvo: this.conteudo,
      topo: this.centro,
      progresso: this.progresso,
      aoAbrirFase: (i) => (location.hash = `fase-${FASES[i].id}`),
      aoGanharEstrelas: () => this.atualizarTotal(),
    };
    if (indice >= 0 && this.progresso.liberada(indice)) {
      this.tela = new TelaFase({ ...comum, indice, aoVoltar: () => (location.hash = 'fases') });
    } else {
      this.tela = new TelaMapa(comum);
    }
    document.body.dataset.tela = this.tela instanceof TelaFase ? 'fase' : 'mapa';
    this.tela.montar();
    this.atualizarTotal();
    this.conteudo.scrollTop = 0;
  }
}

const jogo = new JogoHorta(document.getElementById('horta'));
// ?teste expõe o jogo para testes automatizados de navegador
if (new URLSearchParams(location.search).has('teste')) window.jogoHorta = jogo;
