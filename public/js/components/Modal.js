import { Component } from '../core/Component.js';
import { h } from '../core/dom.js';

/**
 * Janela modal genérica (vira "bottom sheet" no celular).
 * Fecha com Esc, clique fora ou botão ✕, trava a rolagem da página e
 * devolve o foco para quem abriu.
 *
 * Subclasses usam definirCabecalho/definirCorpo/definirRodape.
 * props: { classe?, rotuloFechar?, onFechar? }
 */
export class Modal extends Component {
  render() {
    this.cabecalho = h('div', { class: 'modal-cabecalho-conteudo' });
    this.corpo = h('div', { class: 'modal-corpo' });
    this.rodape = h('div', { class: 'modal-rodape' });
    this.botaoFechar = h('button', {
      type: 'button',
      class: 'modal-fechar',
      'aria-label': this.props.rotuloFechar || 'Fechar',
      text: '✕',
      onClick: () => this.fechar(),
    });

    this.cartao = h(
      'div',
      { class: `modal-card ${this.props.classe || ''}`, role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'modal-cabecalho' }, this.cabecalho, this.botaoFechar),
      this.corpo,
      this.rodape
    );

    const overlay = h('div', { class: 'modal-overlay', hidden: true }, this.cartao);
    this.ouvir(overlay, 'mousedown', (e) => {
      if (e.target === overlay) this.fechar();
    });
    this.ouvir(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.aberto) this.fechar();
    });
    return overlay;
  }

  get aberto() {
    return Boolean(this.el && !this.el.hidden);
  }

  abrir() {
    if (!this.el) this.montar(document.body);
    this.focoAnterior = document.activeElement;
    this.el.hidden = false;
    document.body.classList.add('modal-aberto');
    this.botaoFechar.focus({ preventScroll: true });
  }

  fechar({ restaurarFoco = true } = {}) {
    if (!this.aberto) return;
    this.el.hidden = true;
    document.body.classList.remove('modal-aberto');
    if (restaurarFoco && this.focoAnterior && document.contains(this.focoAnterior)) {
      this.focoAnterior.focus({ preventScroll: true });
    }
    this.emitir('Fechar');
  }

  definirCabecalho(...filhos) {
    this.cabecalho.replaceChildren(...filhos.filter(Boolean));
    const titulo = this.cabecalho.querySelector('h2');
    if (titulo) {
      titulo.id = titulo.id || `modal-titulo-${Math.random().toString(36).slice(2, 8)}`;
      this.cartao.setAttribute('aria-labelledby', titulo.id);
    }
  }

  definirCorpo(...filhos) {
    this.corpo.replaceChildren(...filhos.filter(Boolean));
    this.corpo.scrollTop = 0;
  }

  definirRodape(...filhos) {
    const lista = filhos.filter(Boolean);
    this.rodape.replaceChildren(...lista);
    this.rodape.hidden = lista.length === 0;
  }
}

/** Diálogo de confirmação baseado no Modal. Resolve true/false. */
export class ConfirmDialog extends Modal {
  static perguntar({ titulo, mensagem, textoConfirmar = 'Confirmar', perigoso = false }) {
    return new Promise((resolver) => {
      let respondido = false;
      const dialogo = new ConfirmDialog({
        classe: 'modal-pequeno',
        onFechar: () => {
          if (!respondido) resolver(false);
          setTimeout(() => dialogo.destruir(), 0);
        },
      });
      dialogo.montar(document.body);
      dialogo.definirCabecalho(h('h2', { text: titulo }));
      dialogo.definirCorpo(h('p', { class: 'confirmar-mensagem', text: mensagem }));
      dialogo.definirRodape(
        h('button', { type: 'button', class: 'btn btn-contorno', text: 'Cancelar', onClick: () => dialogo.fechar() }),
        h('button', {
          type: 'button',
          class: `btn ${perigoso ? 'btn-perigo' : 'btn-primario'}`,
          text: textoConfirmar,
          onClick: () => {
            respondido = true;
            resolver(true);
            dialogo.fechar();
          },
        })
      );
      dialogo.abrir();
    });
  }
}
