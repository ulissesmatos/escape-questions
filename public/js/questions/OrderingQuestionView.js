import { QuestionView } from './QuestionView.js';
import { SortableList } from '../components/SortableList.js';

/** Colocar em ordem arrastando (ou com ↑ ↓). Resposta: { ordem: ids } */
export class OrderingQuestionView extends QuestionView {
  get instrucao() {
    return 'Arraste para colocar na ordem';
  }

  renderResposta() {
    const { itens, rotuloInicio, rotuloFim } = this.props.questao;
    this.lista = new SortableList({ itens, rotuloInicio, rotuloFim, onMudar: () => this.mudou() });
    this.limpezas.push(() => this.lista.destruir());
    return this.lista.montar();
  }

  obterResposta() {
    return { ordem: this.lista.ids };
  }

  bloquear(bloqueado = true) {
    super.bloquear(bloqueado);
    this.lista.bloquear(bloqueado);
  }
}
