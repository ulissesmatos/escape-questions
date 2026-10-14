import { h } from '../../../core/dom.js';

/**
 * Dicas de tela do Office: ao parar o mouse num botão aparece o nome, o
 * atalho e uma frase explicando ("Negrito (Ctrl+N) — Aplique negrito ao
 * texto."). Funciona em qualquer elemento com data-dica (e, opcionalmente,
 * data-dica-atalho e data-dica-texto) dentro da raiz.
 */
export class Dica {
  constructor(raiz) {
    this.raiz = raiz;
    this.el = h('div', { class: 'dica-tela', role: 'tooltip', hidden: true });
    raiz.append(this.el);
    raiz.addEventListener('pointerover', (e) => this.entrar(e));
    raiz.addEventListener('pointerout', (e) => this.sair(e));
    raiz.addEventListener('pointerdown', () => this.esconder(), true);
  }

  entrar(e) {
    const alvo = e.target.closest('[data-dica]');
    if (!alvo || alvo === this.alvo) return;
    this.esconder();
    this.alvo = alvo;
    this.tempo = setTimeout(() => this.mostrar(alvo), 550);
  }

  sair(e) {
    if (this.alvo && !this.alvo.contains(e.relatedTarget)) this.esconder();
  }

  mostrar(alvo) {
    if (!alvo.isConnected) return;
    const { dica, dicaAtalho, dicaTexto } = alvo.dataset;
    this.el.replaceChildren(...[h('strong', { text: dicaAtalho ? `${dica} (${dicaAtalho})` : dica }), dicaTexto && h('p', { text: dicaTexto })].filter(Boolean));
    this.el.classList.toggle('dica-simples', !dicaTexto);
    this.el.hidden = false;
    const r = alvo.getBoundingClientRect();
    const raiz = this.raiz.getBoundingClientRect();
    const caixa = this.el.getBoundingClientRect();
    let x = r.left - raiz.left;
    let y = r.bottom - raiz.top + 6;
    if (x + caixa.width > raiz.width - 4) x = raiz.width - caixa.width - 4;
    if (y + caixa.height > raiz.height - 4) y = r.top - raiz.top - caixa.height - 6;
    Object.assign(this.el.style, { left: `${Math.max(4, x)}px`, top: `${Math.max(4, y)}px` });
  }

  esconder() {
    clearTimeout(this.tempo);
    this.alvo = null;
    this.el.hidden = true;
  }
}

/** Atributos de dica para h(): ...dica('Negrito', 'Ctrl+N', 'Aplique negrito ao texto.') */
export function dica(nome, atalho = '', texto = '') {
  return { 'data-dica': nome, 'data-dica-atalho': atalho || null, 'data-dica-texto': texto || null, 'aria-label': nome };
}
