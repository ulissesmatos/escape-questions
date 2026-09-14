import { h } from '../core/dom.js';
import { QuestionView } from './QuestionView.js';

/** Número escolhido num slider, com botões − / + e campo para ajuste fino. Resposta: { valor } */
export class SliderQuestionView extends QuestionView {
  get instrucao() {
    return 'Arraste até o valor certo';
  }

  renderResposta() {
    const { min, max, passo, unidade, inicial } = this.props.questao;
    const casas = (String(passo).split('.')[1] || '').length;
    this.formatar = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

    this.slider = h('input', { type: 'range', min, max, step: passo, value: inicial, 'aria-label': 'Valor' });
    this.numero = h('input', {
      type: 'number',
      class: 'slider-numero',
      min,
      max,
      step: passo,
      value: inicial,
      inputmode: 'decimal',
      'aria-label': 'Digite o valor',
    });
    this.visor = h('output', { class: 'slider-visor' });

    this.ouvir(this.slider, 'input', () => this.definir(this.slider.value, { deSlider: true }));
    this.ouvir(this.numero, 'change', () => this.definir(this.numero.value));
    this.ouvir(this.numero, 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.definir(this.numero.value);
        this.emitir('Enviar');
      }
    });

    const botao = (texto, direcao, rotulo) =>
      h('button', {
        type: 'button',
        class: 'slider-passo',
        'aria-label': rotulo,
        text: texto,
        onClick: () => this.definir(Number(this.slider.value) + direcao * passo),
      });

    const el = h(
      'div',
      { class: 'resposta-slider' },
      h('div', { class: 'slider-visor-wrap' }, this.visor, unidade && h('span', { class: 'slider-unidade', text: unidade })),
      h('div', { class: 'slider-linha' }, botao('−', -1, 'Diminuir'), this.slider, botao('+', 1, 'Aumentar')),
      h(
        'div',
        { class: 'slider-limites' },
        h('span', { text: this.formatar(min) }),
        h('label', { class: 'slider-fino' }, 'Valor exato: ', this.numero),
        h('span', { text: this.formatar(max) })
      )
    );
    this.valor = Number(inicial);
    this.atualizarVisor();
    return el;
  }

  definir(valor, { deSlider = false } = {}) {
    const { min, max, passo } = this.props.questao;
    let n = Number(valor);
    if (!Number.isFinite(n)) n = this.valor;
    n = Math.min(max, Math.max(min, Math.round((n - min) / passo) * passo + min));
    this.valor = Math.round(n * 1e6) / 1e6;
    if (!deSlider) this.slider.value = this.valor;
    this.numero.value = this.valor;
    this.atualizarVisor();
    this.mudou();
  }

  atualizarVisor() {
    this.visor.textContent = this.formatar(this.valor);
    const { min, max } = this.props.questao;
    this.slider.style.setProperty('--preenchido', `${((this.valor - min) / (max - min)) * 100}%`);
  }

  obterResposta() {
    return { valor: this.valor };
  }
}
