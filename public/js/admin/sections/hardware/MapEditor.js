import { Component } from '../../../core/Component.js';
import { h, svg } from '../../../core/dom.js';

/**
 * Editor visual do mapa: arraste as peças para posicioná-las (mouse ou
 * toque). Um toque sem arrastar abre a edição da peça.
 *
 * props: { componentes, conexoes, onMover(componente, posX, posY), onClicar(componente) }
 */
export class MapEditor extends Component {
  render() {
    this.nos = new Map();
    this.linhas = svg('svg', { class: 'mapa-svg', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    this.camadaNos = h('div', { class: 'mapa-nos' });
    this.area = h('div', { class: 'mapa-area' }, this.linhas, this.camadaNos);

    for (const componente of this.props.componentes) {
      const no = h(
        'button',
        {
          type: 'button',
          class: `no no-editor${componente.inicial ? ' no-inicial' : ''}${componente.ativo ? '' : ' no-inativo'}`,
          title: `${componente.nome} — arraste para mover, clique para editar`,
        },
        h(
          'span',
          { class: 'no-bolha', 'aria-hidden': 'true' },
          componente.imagem ? h('img', { class: 'no-foto', src: componente.imagem, alt: '' }) : componente.icone,
          componente.inicial && h('span', { class: 'no-selo', text: '★' })
        ),
        h('span', { class: 'no-label', text: componente.nome })
      );
      this.posicionar(no, componente.posX, componente.posY);
      this.ouvir(no, 'pointerdown', (e) => this.iniciarArraste(e, no, componente));
      this.ouvir(no, 'keydown', (e) => this.moverPorTeclado(e, no, componente));
      this.nos.set(componente.id, { no, componente });
      this.camadaNos.appendChild(no);
    }
    this.desenharLinhas();
    return h('div', { class: 'mapa-wrap mapa-editor' }, this.area);
  }

  posicionar(no, x, y) {
    no.style.left = `${x}%`;
    no.style.top = `${y}%`;
  }

  desenharLinhas() {
    this.linhas.replaceChildren(
      ...this.props.conexoes
        .map((cx) => [this.nos.get(cx.deId), this.nos.get(cx.paraId)])
        .filter(([a, b]) => a && b)
        .map(([a, b]) => svg('line', { x1: a.componente.posX, y1: a.componente.posY, x2: b.componente.posX, y2: b.componente.posY, class: 'linha-ativa' }))
    );
  }

  iniciarArraste(evento, no, componente) {
    if (evento.button > 0) return;
    evento.preventDefault();
    no.setPointerCapture(evento.pointerId);
    const retangulo = this.area.getBoundingClientRect();
    const inicio = { x: evento.clientX, y: evento.clientY, posX: componente.posX, posY: componente.posY };
    let arrastou = false;

    const aoMover = (e) => {
      if (!arrastou && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) < 4) return;
      arrastou = true;
      no.classList.add('arrastando');
      componente.posX = limitar(inicio.posX + ((e.clientX - inicio.x) / retangulo.width) * 100);
      componente.posY = limitar(inicio.posY + ((e.clientY - inicio.y) / retangulo.height) * 100);
      this.posicionar(no, componente.posX, componente.posY);
      this.desenharLinhas();
    };

    const aoSoltar = () => {
      no.removeEventListener('pointermove', aoMover);
      no.removeEventListener('pointerup', aoSoltar);
      no.removeEventListener('pointercancel', aoSoltar);
      no.classList.remove('arrastando');
      if (arrastou) this.emitir('Mover', { componente, posX: componente.posX, posY: componente.posY });
      else this.emitir('Clicar', componente);
    };

    no.addEventListener('pointermove', aoMover);
    no.addEventListener('pointerup', aoSoltar);
    no.addEventListener('pointercancel', aoSoltar);
  }

  /** Setas movem 1% (Shift: 5%) — acessível sem mouse */
  moverPorTeclado(e, no, componente) {
    const passos = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!passos[e.key]) return;
    e.preventDefault();
    const fator = e.shiftKey ? 5 : 1;
    componente.posX = limitar(componente.posX + passos[e.key][0] * fator);
    componente.posY = limitar(componente.posY + passos[e.key][1] * fator);
    this.posicionar(no, componente.posX, componente.posY);
    this.desenharLinhas();
    clearTimeout(this.timerTeclado);
    this.timerTeclado = setTimeout(() => this.emitir('Mover', { componente, posX: componente.posX, posY: componente.posY }), 500);
  }
}

function limitar(v) {
  return Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;
}
