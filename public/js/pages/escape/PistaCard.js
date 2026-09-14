import { Component } from '../../core/Component.js';
import { h } from '../../core/dom.js';
import { QuestionViewFactory } from '../../questions/QuestionViewFactory.js';

/** Cartão de uma pista: número, título e a view de resposta do tipo certo. props: { pista, numero, total, onMudar } */
export class PistaCard extends Component {
  render() {
    const { pista, numero, total } = this.props;
    this.view = QuestionViewFactory.criar(pista, { onMudar: () => this.aoMudar() });
    this.limpezas.push(() => this.view.destruir());

    const el = h(
      'article',
      { class: 'pergunta-card', style: { animationDelay: `${Math.min(numero * 0.05, 0.4)}s` } },
      h(
        'div',
        { class: 'pergunta-cabecalho' },
        h('span', { class: 'pista-numero', 'aria-hidden': 'true', text: String(numero) }),
        h('div', { class: 'pergunta-cabecalho-texto' }, h('span', { class: 'pista-rotulo', text: `Pista ${numero} de ${total}` }), h('h2', { text: pista.titulo }))
      ),
      this.view.montar()
    );
    return el;
  }

  aoMudar() {
    const respondida = this.respondida;
    this.el.classList.toggle('respondida', respondida);
    if (respondida) this.el.classList.remove('pendente');
    this.emitir('Mudar');
  }

  get respondida() {
    return this.view.estaRespondida();
  }

  obterResposta() {
    return this.view.obterResposta();
  }

  marcarPendente() {
    this.el.classList.add('pendente');
  }
}
