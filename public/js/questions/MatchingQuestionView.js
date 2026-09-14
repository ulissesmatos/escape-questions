import { h } from '../core/dom.js';
import { QuestionView } from './QuestionView.js';

const CORES = 6;

/**
 * Ligar pares: toque num item da esquerda e depois no da direita.
 * Tocar num item já ligado desfaz o par. Resposta: { pares: { idEsquerda: idDireita } }
 */
export class MatchingQuestionView extends QuestionView {
  get instrucao() {
    return 'Toque em um item de cada coluna para ligar';
  }

  renderResposta() {
    this.pares = new Map(); // idEsquerda → idDireita
    this.selecionado = null; // { lado, id }

    this.colunaA = h('div', { class: 'ligar-coluna', role: 'group', 'aria-label': 'Coluna A' });
    this.colunaB = h('div', { class: 'ligar-coluna', role: 'group', 'aria-label': 'Coluna B' });
    this.desenhar();

    return h(
      'div',
      { class: 'resposta-ligar' },
      h('div', { class: 'ligar-colunas' }, this.colunaA, this.colunaB),
      h('p', { class: 'ligar-status', 'aria-live': 'polite' })
    );
  }

  aoTocar(lado, id) {
    if (this.bloqueada) return;

    // Tocar num item já ligado desfaz o par
    const parExistente = lado === 'a' ? this.pares.has(id) : [...this.pares.values()].includes(id);
    if (parExistente && !this.selecionado) {
      if (lado === 'a') this.pares.delete(id);
      else for (const [a, b] of this.pares) if (b === id) this.pares.delete(a);
      this.desenhar();
      this.mudou();
      return;
    }

    if (!this.selecionado || this.selecionado.lado === lado) {
      this.selecionado = this.selecionado && this.selecionado.id === id ? null : { lado, id };
      this.desenhar();
      return;
    }

    const idA = lado === 'a' ? id : this.selecionado.id;
    const idB = lado === 'b' ? id : this.selecionado.id;
    this.pares.delete(idA);
    for (const [a, b] of this.pares) if (b === idB) this.pares.delete(a);
    this.pares.set(idA, idB);
    this.selecionado = null;
    this.desenhar();
    this.mudou();
  }

  corDoPar(idA) {
    const ordem = [...this.pares.keys()].indexOf(idA);
    return ordem < 0 ? null : (ordem % CORES) + 1;
  }

  desenhar() {
    const { esquerda, direita } = this.props.questao;
    const idAPorB = new Map([...this.pares].map(([a, b]) => [b, a]));

    const botao = (lado, item, cor) => {
      const selecionado = this.selecionado && this.selecionado.lado === lado && this.selecionado.id === item.id;
      return h(
        'button',
        {
          type: 'button',
          class: `ligar-item${cor ? ` ligado cor-${cor}` : ''}${selecionado ? ' selecionado' : ''}`,
          dataset: { id: item.id, lado },
          'aria-pressed': selecionado ? 'true' : 'false',
          disabled: this.bloqueada,
          onClick: () => this.aoTocar(lado, item.id),
        },
        h('span', { class: 'ligar-marcador', 'aria-hidden': 'true', text: cor ? String(cor) : '' }),
        h('span', { text: item.texto })
      );
    };

    this.colunaA.replaceChildren(...esquerda.map((item) => botao('a', item, this.corDoPar(item.id))));
    this.colunaB.replaceChildren(
      ...direita.map((item) => botao('b', item, idAPorB.has(item.id) ? this.corDoPar(idAPorB.get(item.id)) : null))
    );

    const status = this.el ? this.el.querySelector('.ligar-status') : null;
    if (status) status.textContent = `${this.pares.size} de ${esquerda.length} pares ligados`;
  }

  aoMontar() {
    this.desenhar();
  }

  obterResposta() {
    const { esquerda } = this.props.questao;
    if (this.pares.size !== esquerda.length) return null;
    return { pares: Object.fromEntries(this.pares) };
  }

  bloquear(bloqueado = true) {
    this.bloqueada = bloqueado;
    this.zona.classList.toggle('bloqueada', bloqueado);
    this.desenhar();
  }

  marcarErro() {
    super.marcarErro();
    this.pares.clear();
    this.desenhar();
  }
}
