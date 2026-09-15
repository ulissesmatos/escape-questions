import { Component } from '../../../core/Component.js';
import { h, substituirFilhos } from '../../../core/dom.js';
import { arrastarRetangulo, mesmoRetangulo } from './geometria.js';

const CANTOS = ['nw', 'ne', 'sw', 'se'];

/**
 * A arte ampliada com as zonas por cima. Arrastar uma zona move; arrastar um
 * canto redimensiona. Tudo em pixels da imagem × zoom.
 *
 * props: { imagem, tamanho: { largura, altura }, zoom, zonas: [{ id, campo, nome, curto, px }],
 *          selecionada, previa: { pecas: [{ url, px }], areas: [{ px }] },
 *          onSelecionar(id | null), onArrastar({ id, px, primeiro }) }
 *
 * Durante o arraste o quadro se atualiza sozinho (sem redesenhar), para não
 * perder o ponteiro; quem usa chama posicionar()/selecionar()/mostrarPrevia().
 */
export class QuadroDeZonas extends Component {
  render() {
    const { imagem, tamanho, zoom, zonas, selecionada } = this.props;
    this.caixas = new Map();
    this.camadaPecas = h('div', { class: 'quadro-camada', 'aria-hidden': 'true' });
    this.camadaAreas = h('div', { class: 'quadro-camada', 'aria-hidden': 'true' });
    const el = h(
      'div',
      { class: 'quadro', style: { width: `${tamanho.largura * zoom}px`, height: `${tamanho.altura * zoom}px` } },
      h('img', { class: 'quadro-arte', src: imagem, alt: '', draggable: 'false' }),
      this.camadaPecas,
      this.camadaAreas,
      zonas.map((zona) => this.criarCaixa(zona, zona.id === selecionada))
    );
    this.mostrarPrevia(this.props.previa);
    return el;
  }

  aoMontar() {
    this.ouvir(this.el, 'pointerdown', (evento) => this.iniciarArraste(evento));
    this.ouvir(this.el, 'pointermove', (evento) => this.continuarArraste(evento));
    this.ouvir(this.el, 'pointerup', () => this.terminarArraste());
    this.ouvir(this.el, 'pointercancel', () => this.terminarArraste());
  }

  criarCaixa(zona, ativa) {
    const caixa = h(
      'div',
      { class: `quadro-zona${ativa ? ' ativa' : ''}`, dataset: { id: zona.id, campo: zona.campo }, title: zona.nome, style: this.estilo(zona.px) },
      h('span', { class: 'quadro-zona-rotulo', text: zona.curto }),
      CANTOS.map((canto) => h('span', { class: `quadro-alca quadro-alca-${canto}`, dataset: { canto } }))
    );
    this.caixas.set(zona.id, caixa);
    return caixa;
  }

  estilo({ x, y, w, h: altura }) {
    const { zoom } = this.props;
    return { left: `${x * zoom}px`, top: `${y * zoom}px`, width: `${w * zoom}px`, height: `${altura * zoom}px` };
  }

  // ---------------- Atualizações sem redesenhar ----------------

  posicionar(id, px) {
    const zona = this.props.zonas.find((z) => z.id === id);
    if (zona) zona.px = px;
    Object.assign(this.caixas.get(id).style, this.estilo(px));
  }

  selecionar(id) {
    this.props.selecionada = id;
    for (const [idCaixa, caixa] of this.caixas) caixa.classList.toggle('ativa', idCaixa === id);
  }

  mostrarPrevia({ pecas = [], areas = [] } = {}) {
    substituirFilhos(this.camadaPecas, pecas.map((p) => h('img', { src: p.url, alt: '', draggable: 'false', style: this.estilo(p.px) })));
    substituirFilhos(this.camadaAreas, areas.map((a) => h('div', { class: 'quadro-soltar', style: this.estilo(a.px) })));
  }

  // ---------------- Arrastar ----------------

  iniciarArraste(evento) {
    if (evento.button !== 0) return;
    const caixa = evento.target.closest('.quadro-zona');
    if (!caixa) {
      this.emitir('Selecionar', null);
      return;
    }
    evento.preventDefault();
    const { id } = caixa.dataset;
    const zona = this.props.zonas.find((z) => z.id === id);
    this.arraste = {
      id,
      modo: evento.target.dataset.canto || 'mover',
      origem: { x: evento.clientX, y: evento.clientY },
      inicio: { ...zona.px },
      mudou: false,
    };
    this.el.setPointerCapture(evento.pointerId);
    this.emitir('Selecionar', id);
  }

  continuarArraste(evento) {
    const a = this.arraste;
    if (!a) return;
    const { zoom, tamanho } = this.props;
    const dx = Math.round((evento.clientX - a.origem.x) / zoom);
    const dy = Math.round((evento.clientY - a.origem.y) / zoom);
    const px = arrastarRetangulo(a.inicio, a.modo, dx, dy, tamanho);
    const atual = this.props.zonas.find((z) => z.id === a.id).px;
    if (mesmoRetangulo(px, atual)) return;
    this.posicionar(a.id, px);
    this.emitir('Arrastar', { id: a.id, px, primeiro: !a.mudou });
    a.mudou = true;
  }

  terminarArraste() {
    this.arraste = null;
  }
}
