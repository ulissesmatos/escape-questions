import { h } from '../core/dom.js';
import { QuestionView } from './QuestionView.js';

let contador = 0;

/** Formato do Escape Room: a palavra descoberta + um dígito de 0 a 9. Resposta: { texto, digito } */
export class DigitQuestionView extends QuestionView {
  get instrucao() {
    return 'Sua resposta';
  }

  renderResposta() {
    const id = ++contador;
    this.campoTexto = h('input', {
      type: 'text',
      id: `digito-texto-${id}`,
      placeholder: 'Palavra ou resposta',
      autocomplete: 'off',
      maxlength: 120,
    });
    this.campoDigito = h('input', {
      type: 'text',
      id: `digito-numero-${id}`,
      class: 'campo-digito-input',
      inputmode: 'numeric',
      maxlength: 1,
      autocomplete: 'off',
      'aria-describedby': `digito-ajuda-${id}`,
    });

    this.ouvir(this.campoTexto, 'input', () => this.mudou());
    this.ouvir(this.campoDigito, 'focus', () => this.campoDigito.select());
    this.ouvir(this.campoDigito, 'input', () => {
      // Só um algarismo; se digitar por cima, fica o último
      this.campoDigito.value = this.campoDigito.value.replace(/\D/g, '').slice(-1);
      this.campoDigito.classList.toggle('preenchido', this.campoDigito.value !== '');
      this.mudou();
    });

    return h(
      'div',
      { class: 'resposta-campos' },
      h('div', { class: 'campo-texto' }, h('label', { for: this.campoTexto.id, text: 'O que você descobriu?' }), this.campoTexto),
      h(
        'div',
        { class: 'campo-digito' },
        h('label', { for: this.campoDigito.id, text: 'Número' }),
        this.campoDigito,
        h('span', { class: 'campo-digito-ajuda', id: `digito-ajuda-${id}`, text: 'De 0 a 9' })
      )
    );
  }

  obterResposta() {
    const texto = this.campoTexto.value.trim();
    const digito = this.campoDigito.value;
    return texto && /^\d$/.test(digito) ? { texto, digito } : null;
  }
}
