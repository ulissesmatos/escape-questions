import { h } from '../core/dom.js';
import { QuestionView } from './QuestionView.js';

let contador = 0;

/** Múltipla escolha: uma lista de alternativas (radio). Resposta: { opcao } */
export class ChoiceQuestionView extends QuestionView {
  get instrucao() {
    return 'Escolha uma alternativa';
  }

  get classeLista() {
    return 'opcoes-lista';
  }

  renderResposta() {
    const nome = `opcao-${++contador}`;
    const letras = 'ABCDEF';
    return h(
      'div',
      { class: this.classeLista, role: 'radiogroup' },
      (this.props.questao.opcoes || []).map((opcao, i) => {
        const radio = h('input', { type: 'radio', name: nome, value: opcao.id });
        this.ouvir(radio, 'change', () => {
          this.zona.querySelectorAll('.opcao-errada').forEach((o) => o.classList.remove('opcao-errada'));
          this.mudou();
        });
        return h(
          'label',
          { class: 'opcao' },
          radio,
          this.mostrarLetras && h('span', { class: 'opcao-letra', 'aria-hidden': 'true', text: letras[i] }),
          h('span', { class: 'opcao-texto', text: opcao.texto })
        );
      })
    );
  }

  get mostrarLetras() {
    return true;
  }

  obterResposta() {
    const marcada = this.zona.querySelector('input[type="radio"]:checked');
    return marcada ? { opcao: marcada.value } : null;
  }

  marcarErro() {
    const marcada = this.zona.querySelector('input[type="radio"]:checked');
    if (marcada) {
      marcada.closest('.opcao').classList.add('opcao-errada');
      marcada.checked = false;
    }
    super.marcarErro();
  }
}
