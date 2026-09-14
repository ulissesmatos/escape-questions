import { Component } from '../../core/Component.js';
import { h } from '../../core/dom.js';
import { estadoVazio } from '../../components/ui.js';

/**
 * Tabela genérica. Vira lista de cartões em telas estreitas (cada célula
 * mostra o título da coluna via data-rotulo).
 *
 * props: {
 *   colunas: [{ titulo, valor: (linha) => Node|string, classe? }],
 *   linhas, chave?: (linha) => string,
 *   vazio?: { icone, titulo, texto },
 *   onClicarLinha?: (linha) => void
 * }
 */
export class DataTable extends Component {
  render() {
    const { colunas, linhas, vazio, onClicarLinha } = this.props;
    if (!linhas.length) {
      return estadoVazio(vazio || { icone: '📭', titulo: 'Nada por aqui ainda' });
    }

    return h(
      'div',
      { class: 'tabela-wrap' },
      h(
        'table',
        { class: `tabela${onClicarLinha ? ' tabela-clicavel' : ''}` },
        h('thead', {}, h('tr', {}, colunas.map((c) => h('th', { class: c.classe || '', text: c.titulo })))),
        h(
          'tbody',
          {},
          linhas.map((linha) =>
            h(
              'tr',
              {
                tabindex: onClicarLinha ? '0' : null,
                onClick: onClicarLinha ? (e) => !e.target.closest('button, a, input, select') && onClicarLinha(linha) : null,
                onKeydown: onClicarLinha ? (e) => e.key === 'Enter' && e.target === e.currentTarget && onClicarLinha(linha) : null,
              },
              colunas.map((c) => h('td', { class: c.classe || '', 'data-rotulo': c.titulo }, c.valor(linha)))
            )
          )
        )
      )
    );
  }
}
