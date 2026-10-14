import { h } from '../../../core/dom.js';

/**
 * Holofote do "Mostre-me": escurece a tela de leve, ilumina o lugar certo
 * com um anel pulsando e mostra um balão com a instrução. Não bloqueia
 * cliques (o aluno clica "através" dele) e acompanha o alvo se ele se mexer.
 */
export class Holofote {
  constructor() {
    this.furo = h('div', { class: 'holofote-furo' });
    this.texto = h('p', { class: 'holofote-texto' });
    this.balao = h('div', { class: 'holofote-balao' }, h('span', { class: 'holofote-selo', text: 'Mostre-me' }), this.texto);
    this.el = h('div', { class: 'holofote', hidden: true, 'aria-live': 'polite' }, this.furo, this.balao);
    document.body.append(this.el);
    this.obter = null;
  }

  /** obterRetangulo() → DOMRect do alvo (ou null: só o balão, no alto da tela) */
  mostrar({ obterRetangulo, texto }) {
    this.obter = obterRetangulo;
    if (this.texto.textContent !== texto) {
      this.texto.textContent = texto;
      this.balao.classList.remove('entrando');
      void this.balao.offsetWidth;
      this.balao.classList.add('entrando');
    }
    this.el.hidden = false;
    if (!this.quadro) this.animar();
  }

  esconder() {
    this.el.hidden = true;
    this.obter = null;
    cancelAnimationFrame(this.quadro);
    this.quadro = null;
    this.ultimo = null;
  }

  animar() {
    this.quadro = requestAnimationFrame(() => {
      this.quadro = null;
      if (!this.obter) return;
      this.posicionar(this.obter());
      this.animar();
    });
  }

  posicionar(r) {
    const chave = r ? `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}` : 'nada';
    if (chave === this.ultimo) return;
    this.ultimo = chave;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!r) {
      this.furo.hidden = true;
      this.el.classList.add('sem-alvo');
      Object.assign(this.balao.style, { left: `${Math.max(12, vw / 2 - 180)}px`, top: '70px' });
      this.balao.dataset.lado = 'nenhum';
      return;
    }
    this.el.classList.remove('sem-alvo');
    this.furo.hidden = false;
    const folga = 6;
    Object.assign(this.furo.style, {
      left: `${r.left - folga}px`,
      top: `${r.top - folga}px`,
      width: `${r.width + folga * 2}px`,
      height: `${r.height + folga * 2}px`,
    });
    const largura = Math.min(320, vw - 24);
    const altura = this.balao.offsetHeight || 80;
    let lado = 'baixo';
    let top = r.bottom + 16;
    if (top + altura > vh - 8) {
      lado = 'cima';
      top = r.top - altura - 16;
    }
    if (top < 8) {
      lado = 'lado';
      top = Math.min(vh - altura - 8, Math.max(8, r.top));
    }
    let left = lado === 'lado' ? (r.right + 16 + largura < vw ? r.right + 16 : r.left - largura - 16) : r.left + r.width / 2 - largura / 2;
    left = Math.max(12, Math.min(vw - largura - 12, left));
    Object.assign(this.balao.style, { left: `${left}px`, top: `${top}px`, width: `${largura}px` });
    this.balao.dataset.lado = lado;
    this.balao.style.setProperty('--seta-x', `${Math.max(16, Math.min(largura - 16, r.left + r.width / 2 - left))}px`);
  }

  destruir() {
    this.esconder();
    this.el.remove();
  }
}
