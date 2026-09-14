import { Component } from '../../core/Component.js';
import { h } from '../../core/dom.js';

/** Grade de cartões dos níveis. props: { niveis, onEscolher(nivel) } */
export class LevelGrid extends Component {
  render() {
    return h('div', { class: 'grid-atividades' }, this.props.niveis.map((nivel, i) => this.cartao(nivel, i)));
  }

  cartao(nivel, indice) {
    const percentual = nivel.total > 0 ? Math.round((nivel.descobertos / nivel.total) * 100) : 0;

    if (!nivel.desbloqueado) {
      return h(
        'div',
        { class: 'card-atividade card-em-breve card-nivel', 'aria-disabled': 'true' },
        h('div', { class: 'card-topo' }, h('span', { class: 'card-icone', text: '🔒' }), h('span', { class: 'card-badge card-badge-bloqueado', text: 'Bloqueado' })),
        h('h2', { text: nivel.nome }),
        h('p', { text: nivel.descricao }),
        h('div', { class: 'card-rodape' }, h('span', { class: 'card-badge', text: 'Complete o nível anterior para liberar' }))
      );
    }

    const badge = nivel.completo
      ? h('span', { class: 'card-badge card-badge-sucesso', text: '✓ Completo' })
      : h('span', { class: 'card-badge card-badge-destaque', text: `${nivel.descobertos} de ${nivel.total} peças` });
    const acao = nivel.completo ? 'Revisar' : nivel.descobertos > 0 ? 'Continuar' : 'Começar';

    return h(
      'button',
      {
        type: 'button',
        class: `card-atividade card-nivel${nivel.completo ? ' completo' : ''}`,
        onClick: () => this.emitir('Escolher', nivel),
      },
      h('div', { class: 'card-topo' }, h('span', { class: 'card-icone', 'aria-hidden': 'true', text: String(indice + 1) }), badge),
      h('h2', { text: nivel.nome }),
      h('p', { text: nivel.descricao }),
      h('div', { class: 'card-nivel-barra', 'aria-hidden': 'true' }, h('span', { style: { width: `${percentual}%` } })),
      h('div', { class: 'card-rodape' }, h('span', { class: 'card-badge', text: `${percentual}%` }), h('span', { class: 'card-acao', text: acao }))
    );
  }
}
