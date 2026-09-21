import { Component } from '../../core/Component.js';
import { h } from '../../core/dom.js';
import { QuestionViewFactory } from '../../questions/QuestionViewFactory.js';
import { AntiCopia } from '../../core/antiCopia.js';

/**
 * Cartão de uma pista: número, título e a view de resposta do tipo certo.
 * O enunciado não pode ser copiado e a resposta não pode ser colada: a ideia é
 * que o aluno leia e escreva (ver core/antiCopia.js).
 * props: { pista, numero, total, onMudar, onAviso }
 */
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
    this.antiCopia?.parar();
    this.antiCopia = new AntiCopia({ aoTentar: (mensagem) => this.emitir('Aviso', mensagem) });
    this.antiCopia.protegerTexto(el).protegerCampos(el);
    this.limpezas.push(() => this.antiCopia.parar());
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
