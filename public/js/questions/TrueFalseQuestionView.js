import { h } from '../core/dom.js';
import { ChoiceQuestionView } from './ChoiceQuestionView.js';

/**
 * Verdadeiro ou falso: mesma mecânica da múltipla escolha, com a afirmação
 * em destaque e as duas opções lado a lado.
 */
export class TrueFalseQuestionView extends ChoiceQuestionView {
  get instrucao() {
    return 'Verdadeiro ou falso?';
  }

  get classeLista() {
    return 'opcoes-lista opcoes-vf';
  }

  get mostrarLetras() {
    return false;
  }

  renderExtra() {
    const { afirmacao } = this.props.questao;
    return afirmacao ? h('blockquote', { class: 'afirmacao', text: `“${afirmacao}”` }) : null;
  }
}
