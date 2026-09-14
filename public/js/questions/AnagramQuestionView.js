import { h } from '../core/dom.js';
import { QuestionView } from './QuestionView.js';

/**
 * Palavra embaralhada: toque nas letras (ou digite no teclado) para montar a
 * palavra; toque numa letra montada para devolvê-la. Resposta: { palavra }
 */
export class AnagramQuestionView extends QuestionView {
  get instrucao() {
    return 'Toque nas letras para montar a palavra';
  }

  renderResposta() {
    const { letras, dica } = this.props.questao;
    this.pecas = letras.map((letra, i) => ({ id: i, letra, usada: false }));
    this.montadas = []; // ids das peças, na ordem escolhida

    this.slots = h('div', { class: 'anagrama-slots', 'aria-live': 'polite' });
    this.banco = h('div', { class: 'anagrama-banco' });

    const el = h(
      'div',
      { class: 'resposta-anagrama', tabindex: '-1' },
      this.slots,
      this.banco,
      h(
        'div',
        { class: 'anagrama-acoes' },
        dica && h('span', { class: 'resposta-dica', text: `Dica: ${dica}` }),
        h('button', { type: 'button', class: 'btn-mini', text: '⌫ Apagar', onClick: () => this.apagarUltima() }),
        h('button', { type: 'button', class: 'btn-mini', text: 'Limpar', onClick: () => this.limpar() })
      )
    );

    // Digitar no teclado físico também funciona
    this.ouvir(el, 'keydown', (e) => this.aoTeclar(e));
    this.desenhar();
    return el;
  }

  aoTeclar(e) {
    if (this.bloqueada) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      this.apagarUltima();
    } else if (e.key === 'Enter' && this.estaRespondida()) {
      e.preventDefault();
      this.emitir('Enviar');
    } else if (e.key.length === 1) {
      const alvo = normalizar(e.key);
      const peca = this.pecas.find((p) => !p.usada && normalizar(p.letra) === alvo);
      if (peca) {
        e.preventDefault();
        this.usar(peca);
      }
    }
  }

  usar(peca) {
    if (this.bloqueada || peca.usada) return;
    peca.usada = true;
    this.montadas.push(peca.id);
    this.desenhar();
    this.mudou();
  }

  devolver(indice) {
    if (this.bloqueada) return;
    const [id] = this.montadas.splice(indice, 1);
    this.pecas[id].usada = false;
    this.desenhar();
    this.mudou();
  }

  apagarUltima() {
    if (this.montadas.length) this.devolver(this.montadas.length - 1);
  }

  limpar() {
    if (this.bloqueada) return;
    this.montadas = [];
    this.pecas.forEach((p) => (p.usada = false));
    this.desenhar();
    this.mudou();
  }

  desenhar() {
    this.slots.replaceChildren(
      ...this.pecas.map((_, i) => {
        const id = this.montadas[i];
        if (id === undefined) return h('span', { class: 'anagrama-slot vazio', 'aria-hidden': 'true' });
        return h('button', {
          type: 'button',
          class: 'anagrama-slot',
          text: this.pecas[id].letra,
          'aria-label': `Remover ${this.pecas[id].letra}`,
          disabled: this.bloqueada,
          onClick: () => this.devolver(i),
        });
      })
    );
    this.banco.replaceChildren(
      ...this.pecas.map((peca) =>
        h('button', {
          type: 'button',
          class: 'anagrama-letra',
          text: peca.letra,
          disabled: peca.usada || this.bloqueada,
          onClick: () => this.usar(peca),
        })
      )
    );
  }

  obterResposta() {
    if (this.montadas.length !== this.pecas.length) return null;
    return { palavra: this.montadas.map((id) => this.pecas[id].letra).join('') };
  }

  bloquear(bloqueado = true) {
    this.bloqueada = bloqueado;
    this.zona.classList.toggle('bloqueada', bloqueado);
    this.desenhar();
  }

  marcarErro() {
    super.marcarErro();
    this.limpar();
  }

  focar() {
    const primeira = this.banco.querySelector('button:not([disabled])');
    if (primeira) primeira.focus({ preventScroll: true });
  }
}

function normalizar(letra) {
  return letra.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}
