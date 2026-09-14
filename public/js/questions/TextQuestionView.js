import { h } from '../core/dom.js';
import { QuestionView } from './QuestionView.js';

/** Resposta escrita curta. Enter envia. Resposta: { texto } */
export class TextQuestionView extends QuestionView {
  get instrucao() {
    return 'Escreva a resposta';
  }

  renderResposta() {
    const { dica, maxCaracteres = 60 } = this.props.questao;
    this.campo = h('input', {
      type: 'text',
      class: 'campo-resposta-texto',
      placeholder: dica || 'Digite aqui',
      maxlength: maxCaracteres,
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      'aria-label': 'Sua resposta',
    });
    this.ouvir(this.campo, 'input', () => this.mudou());
    this.ouvir(this.campo, 'keydown', (e) => {
      if (e.key === 'Enter' && this.estaRespondida()) {
        e.preventDefault();
        this.emitir('Enviar');
      }
    });
    return h('div', { class: 'resposta-texto' }, this.campo, dica && h('span', { class: 'resposta-dica', text: `Dica: ${dica}` }));
  }

  obterResposta() {
    const texto = this.campo.value.trim();
    return texto ? { texto } : null;
  }

  marcarErro() {
    this.campo.select();
    super.marcarErro();
  }
}
