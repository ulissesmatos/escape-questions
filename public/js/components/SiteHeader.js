import { Component } from '../core/Component.js';
import { h } from '../core/dom.js';

const PAGINAS = [
  { pagina: 'hub', href: 'index.html', icone: '🏠', texto: 'Início' },
  { pagina: 'escape-room', href: 'escape-room.html', icone: '🔎', texto: 'Escape Room' },
  { pagina: 'hardware', href: 'hardware.html', icone: '🗺️', texto: 'Mapa de Hardware' },
  { pagina: 'monta-pc', href: 'monta-pc.html', icone: '🛒', texto: 'Monte o PC' },
];

/** Cabeçalho de navegação compartilhado. props: { paginaAtual } */
export class SiteHeader extends Component {
  render() {
    const { paginaAtual } = this.props;
    return h(
      'nav',
      { class: 'site-nav', 'aria-label': 'Atividades' },
      h(
        'a',
        { href: 'index.html', class: 'site-nav-marca' },
        h('span', { class: 'site-nav-logo', 'aria-hidden': 'true', text: '🎓' }),
        h('span', {}, 'Atividades', h('span', { class: 'site-nav-texto-longo', text: ' da Turma' }))
      ),
      h(
        'div',
        { class: 'site-nav-links' },
        PAGINAS.map((p) =>
          h(
            'a',
            {
              href: p.href,
              class: p.pagina === paginaAtual ? 'ativo' : '',
              'aria-current': p.pagina === paginaAtual ? 'page' : null,
            },
            h('span', { 'aria-hidden': 'true', text: p.icone }),
            p.texto
          )
        )
      )
    );
  }

  static montarNaPagina() {
    const alvo = document.getElementById('site-header');
    if (!alvo) return;
    alvo.classList.add('site-topo');
    new SiteHeader({ paginaAtual: document.body.dataset.page }).montar(alvo);
  }
}
