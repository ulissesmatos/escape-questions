import { Component } from '../core/Component.js';
import { h } from '../core/dom.js';

/**
 * Lista reordenável por arrastar (mouse e toque, via Pointer Events) e por
 * botões ↑ ↓ (teclado e acessibilidade). Base para outras interações de
 * arrastar — como a futura montagem de PC peça por peça.
 *
 * props: { itens: [{ id, texto }], rotuloInicio?, rotuloFim?, onMudar?(ids) }
 */
export class SortableList extends Component {
  render() {
    this.lista = h('ol', { class: 'ordenavel' });
    for (const item of this.props.itens) this.lista.appendChild(this.criarItem(item));
    this.atualizarBotoes();

    const { rotuloInicio, rotuloFim } = this.props;
    return h(
      'div',
      { class: 'ordenavel-wrap' },
      rotuloInicio && h('span', { class: 'ordenavel-rotulo', text: `▲ ${rotuloInicio}` }),
      this.lista,
      rotuloFim && h('span', { class: 'ordenavel-rotulo', text: `▼ ${rotuloFim}` })
    );
  }

  criarItem(item) {
    const alca = h('span', { class: 'ordenavel-alca', 'aria-hidden': 'true', text: '⠿' });
    const li = h(
      'li',
      { class: 'ordenavel-item', dataset: { id: item.id } },
      alca,
      h('span', { class: 'ordenavel-posicao', 'aria-hidden': 'true' }),
      h('span', { class: 'ordenavel-texto', text: item.texto }),
      h(
        'span',
        { class: 'ordenavel-botoes' },
        h('button', { type: 'button', class: 'ordenavel-mover', 'aria-label': `Subir ${item.texto}`, text: '↑', onClick: () => this.mover(li, -1) }),
        h('button', { type: 'button', class: 'ordenavel-mover', 'aria-label': `Descer ${item.texto}`, text: '↓', onClick: () => this.mover(li, 1) })
      )
    );
    this.ouvir(li, 'pointerdown', (e) => this.iniciarArraste(e, li));
    return li;
  }

  get ids() {
    return [...this.lista.children].map((li) => li.dataset.id);
  }

  mover(li, direcao) {
    const alvo = direcao < 0 ? li.previousElementSibling : li.nextElementSibling;
    if (!alvo) return;
    if (direcao < 0) this.lista.insertBefore(li, alvo);
    else this.lista.insertBefore(alvo, li);
    li.querySelector(direcao < 0 ? '.ordenavel-mover' : '.ordenavel-mover:last-child').focus();
    this.aoReordenar();
  }

  iniciarArraste(evento, li) {
    if (this.bloqueado || evento.button > 0 || evento.target.closest('button')) return;
    // No toque, só a alça arrasta — assim o resto do item ainda rola a página
    if (evento.pointerType !== 'mouse' && !evento.target.closest('.ordenavel-alca')) return;
    evento.preventDefault();
    li.setPointerCapture(evento.pointerId);

    const inicioY = evento.clientY;
    const retangulo = li.getBoundingClientRect();
    let deslocamentoBase = 0;
    li.classList.add('arrastando');

    const aoMover = (e) => {
      const dy = e.clientY - inicioY - deslocamentoBase;
      li.style.transform = `translateY(${dy}px)`;

      const centro = retangulo.top + retangulo.height / 2 + (e.clientY - inicioY);
      const anterior = li.previousElementSibling;
      const proximo = li.nextElementSibling;

      if (anterior && centro < anterior.getBoundingClientRect().top + anterior.offsetHeight / 2) {
        deslocamentoBase -= anterior.offsetHeight + this.espacamento();
        this.lista.insertBefore(li, anterior);
      } else if (proximo && centro > proximo.getBoundingClientRect().top + proximo.offsetHeight / 2) {
        deslocamentoBase += proximo.offsetHeight + this.espacamento();
        this.lista.insertBefore(proximo, li);
      }
    };

    const aoSoltar = () => {
      li.classList.remove('arrastando');
      li.style.transform = '';
      li.removeEventListener('pointermove', aoMover);
      li.removeEventListener('pointerup', aoSoltar);
      li.removeEventListener('pointercancel', aoSoltar);
      this.aoReordenar();
    };

    li.addEventListener('pointermove', aoMover);
    li.addEventListener('pointerup', aoSoltar);
    li.addEventListener('pointercancel', aoSoltar);
  }

  espacamento() {
    return parseFloat(getComputedStyle(this.lista).rowGap) || 0;
  }

  aoReordenar() {
    this.atualizarBotoes();
    this.emitir('Mudar', this.ids);
  }

  atualizarBotoes() {
    const itens = [...this.lista.children];
    itens.forEach((li, i) => {
      li.querySelector('.ordenavel-posicao').textContent = String(i + 1);
      const [subir, descer] = li.querySelectorAll('.ordenavel-mover');
      subir.disabled = this.bloqueado || i === 0;
      descer.disabled = this.bloqueado || i === itens.length - 1;
    });
  }

  bloquear(bloqueado = true) {
    this.bloqueado = bloqueado;
    this.el.classList.toggle('bloqueado', bloqueado);
    this.atualizarBotoes();
  }
}
