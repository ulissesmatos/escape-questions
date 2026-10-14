import { h } from '../../../core/dom.js';
import { icone } from './icones.js';

/**
 * Menu suspenso: botão direito (estilo Windows 11 ou Office), menus da faixa
 * do Word, "Novo" do Explorador, menus do Bloco de Notas.
 *
 * Itens: { rotulo, icone, atalho, acao, desabilitado, negrito, marcado,
 *          submenu: [itens], separador: true, alvo, conteudo: elemento,
 *          titulo: true (cabeçalho cinza de seção) }
 * Só um menu fica aberto por vez (abrir outro fecha o anterior).
 */
let aberto = null;

export class MenuDeContexto {
  /**
   * opcoes: { itens, x, y, ancora (abre embaixo do elemento), tema, topo
   *           (elemento acima dos itens, ex.: mini barra), aoFechar, classe,
   *           raiz (onde pendurar), largura }
   */
  static abrir(opcoes) {
    MenuDeContexto.fechar();
    const menu = new MenuDeContexto(opcoes);
    aberto = menu;
    menu.mostrar();
    return menu;
  }

  static fechar() {
    if (aberto) aberto.fechar();
  }

  static get aberto() {
    return aberto;
  }

  constructor({ itens, x = 0, y = 0, ancora = null, tema = 'windows', topo = null, aoFechar = null, classe = '', raiz = document.body, largura = null, pai = null }) {
    Object.assign(this, { itens, x, y, ancora, tema, topo, aoFechar, classe, raiz, largura, pai });
    this.submenu = null;
    this.indice = -1;
  }

  mostrar() {
    this.lista = h('div', { class: 'menu-itens', role: 'menu' });
    this.botoes = [];
    for (const item of this.itens.filter(Boolean)) this.lista.append(this.criarItem(item));
    this.el = h('div', { class: `menu-ctx menu-${this.tema} ${this.classe}`, 'data-menu': '' }, this.topo, this.lista);
    if (this.largura) this.el.style.minWidth = `${this.largura}px`;
    this.raiz.append(this.el);
    this.posicionar();
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());

    if (!this.pai) {
      this.fora = (e) => {
        if (e.target.closest('[data-menu]') || (this.ancora && this.ancora.contains(e.target))) return;
        this.fechar();
      };
      this.teclas = (e) => this.aoTeclar(e);
      setTimeout(() => {
        document.addEventListener('pointerdown', this.fora, true);
        document.addEventListener('keydown', this.teclas, true);
        window.addEventListener('blur', this.fecharNaPerda);
      }, 0);
    }
  }

  fecharNaPerda = () => this.fechar();

  posicionar() {
    const tela = { largura: window.innerWidth, altura: window.innerHeight };
    const caixa = this.el.getBoundingClientRect();
    let { x, y } = this;
    if (this.ancora) {
      const r = this.ancora.getBoundingClientRect();
      if (this.pai) {
        x = r.right - 2;
        y = r.top - 4;
        if (x + caixa.width > tela.largura) x = r.left - caixa.width + 2;
      } else {
        x = r.left;
        y = r.bottom + 2;
        if (y + caixa.height > tela.altura && r.top - caixa.height > 0) y = r.top - caixa.height - 2;
      }
    }
    if (x + caixa.width > tela.largura - 4) x = Math.max(4, tela.largura - caixa.width - 4);
    if (y + caixa.height > tela.altura - 4) y = Math.max(4, tela.altura - caixa.height - 4);
    Object.assign(this.el.style, { left: `${Math.round(x)}px`, top: `${Math.round(y)}px` });
  }

  criarItem(item) {
    if (item.separador) return h('div', { class: 'menu-separador', role: 'separator' });
    if (item.titulo) return h('div', { class: 'menu-secao', text: item.rotulo });
    if (item.conteudo) return h('div', { class: 'menu-conteudo' }, item.conteudo);

    const botao = h(
      'button',
      {
        type: 'button',
        class: `menu-item${item.negrito ? ' menu-negrito' : ''}${item.marcado ? ' menu-marcado' : ''}`,
        role: 'menuitem',
        disabled: Boolean(item.desabilitado),
        'data-alvo': item.alvo || null,
        title: item.dica || null,
      },
      h('span', { class: 'menu-icone' }, item.marcado ? icone('checkmark', { tamanho: 16 }) : item.icone ? (typeof item.icone === 'string' ? icone(item.icone, { tamanho: 16 }) : item.icone) : null),
      h('span', { class: 'menu-rotulo', text: item.rotulo }),
      item.atalho && h('span', { class: 'menu-atalho', text: item.atalho }),
      item.submenu && h('span', { class: 'menu-seta' }, icone('chevron_right', { tamanho: 12 }))
    );
    if (item.estilo) Object.assign(botao.querySelector('.menu-rotulo').style, item.estilo);
    this.botoes.push({ botao, item });

    if (item.submenu) {
      let tempo;
      const abrirSub = () => {
        if (this.submenu?.ancora === botao) return;
        this.fecharSubmenu();
        this.submenu = new MenuDeContexto({ itens: item.submenu, ancora: botao, tema: this.tema, raiz: this.raiz, pai: this });
        this.submenu.mostrar();
        botao.classList.add('menu-sub-aberto');
      };
      botao.addEventListener('pointerenter', () => {
        clearTimeout(tempo);
        tempo = setTimeout(abrirSub, 180);
      });
      botao.addEventListener('pointerleave', () => clearTimeout(tempo));
      botao.addEventListener('click', abrirSub);
    } else {
      botao.addEventListener('pointerenter', () => {
        if (this.submenu) setTimeout(() => this.fecharSubmenu(), 250);
      });
      botao.addEventListener('click', () => {
        if (item.desabilitado) return;
        this.raizDoMenu().fechar();
        item.acao?.();
      });
    }
    return botao;
  }

  raizDoMenu() {
    return this.pai ? this.pai.raizDoMenu() : this;
  }

  fecharSubmenu() {
    if (!this.submenu) return;
    this.submenu.ancora.classList.remove('menu-sub-aberto');
    this.submenu.fechar();
    this.submenu = null;
  }

  aoTeclar(e) {
    const menu = this.submenu || this;
    const ativos = menu.botoes.filter((b) => !b.botao.disabled);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (this.submenu) this.fecharSubmenu();
      else this.fechar();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Enter', 'ArrowRight', 'ArrowLeft'].includes(e.key) || !ativos.length) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'ArrowLeft' && this.submenu) return this.fecharSubmenu();
    const atual = ativos.findIndex((b) => b.botao === document.activeElement);
    if (e.key === 'ArrowDown') ativos[(atual + 1) % ativos.length].botao.focus();
    else if (e.key === 'ArrowUp') ativos[(atual - 1 + ativos.length) % ativos.length].botao.focus();
    else if (atual >= 0) ativos[atual].botao.click();
  }

  fechar() {
    if (!this.el) return;
    this.fecharSubmenu();
    this.el.remove();
    this.el = null;
    if (!this.pai) {
      document.removeEventListener('pointerdown', this.fora, true);
      document.removeEventListener('keydown', this.teclas, true);
      window.removeEventListener('blur', this.fecharNaPerda);
      if (aberto === this) aberto = null;
      this.aoFechar?.();
    }
  }
}
