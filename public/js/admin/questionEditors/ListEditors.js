import { Component } from '../../core/Component.js';
import { h } from '../../core/dom.js';

/**
 * Lista editável de linhas (adicionar/remover/reordenar). Subclasses definem
 * como é cada linha: criarControles(valor) → { elementos, obter() }.
 *
 * props: { valores, rotulo, ajuda?, textoAdicionar, minimo?, reordenavel? }
 */
export class RowListEditor extends Component {
  render() {
    const { rotulo, ajuda, textoAdicionar = '+ Adicionar', valores = [] } = this.props;
    this.linhas = [];
    this.lista = h('div', { class: 'lista-editavel' });
    const inicial = valores.length ? valores : Array.from({ length: this.props.minimo || 1 }, () => this.valorVazio());
    inicial.forEach((v) => this.adicionar(v, { focar: false }));

    return h(
      'div',
      { class: 'campo-admin' },
      h('span', { class: 'rotulo-lista', text: rotulo }),
      ajuda && h('span', { class: 'campo-ajuda', text: ajuda }),
      this.lista,
      h('button', { type: 'button', class: 'btn-mini btn-adicionar', text: textoAdicionar, onClick: () => this.adicionar(this.valorVazio()) })
    );
  }

  valorVazio() {
    return '';
  }

  /** @abstract @returns {{ elementos: Node[], obter: () => any, focar: () => void }} */
  criarControles(valor) { // eslint-disable-line no-unused-vars
    throw new Error('criarControles() não implementado');
  }

  adicionar(valor, { focar = true } = {}) {
    const controles = this.criarControles(valor);
    const linha = { controles };
    const remover = h('button', {
      type: 'button',
      class: 'lista-remover',
      'aria-label': 'Remover',
      text: '✕',
      onClick: () => {
        this.linhas = this.linhas.filter((l) => l !== linha);
        linha.el.remove();
        this.atualizarNumeros();
      },
    });
    const botoesOrdem = this.props.reordenavel
      ? [
          h('button', { type: 'button', class: 'lista-mover', 'aria-label': 'Subir', text: '↑', onClick: () => this.mover(linha, -1) }),
          h('button', { type: 'button', class: 'lista-mover', 'aria-label': 'Descer', text: '↓', onClick: () => this.mover(linha, 1) }),
        ]
      : [];

    linha.numero = h('span', { class: 'lista-numero' });
    linha.el = h('div', { class: 'lista-linha' }, this.props.reordenavel && linha.numero, ...controles.elementos, ...botoesOrdem, remover);
    this.linhas.push(linha);
    this.lista.appendChild(linha.el);
    this.atualizarNumeros();
    if (focar) controles.focar();
  }

  mover(linha, direcao) {
    const i = this.linhas.indexOf(linha);
    const j = i + direcao;
    if (j < 0 || j >= this.linhas.length) return;
    [this.linhas[i], this.linhas[j]] = [this.linhas[j], this.linhas[i]];
    this.lista.replaceChildren(...this.linhas.map((l) => l.el));
    this.atualizarNumeros();
  }

  atualizarNumeros() {
    this.linhas.forEach((l, i) => (l.numero.textContent = `${i + 1}º`));
  }

  obter() {
    return this.linhas.map((l) => l.controles.obter()).filter((v) => !this.estaVazio(v));
  }

  estaVazio(valor) {
    return !String(valor ?? '').trim();
  }
}

/** Lista de textos simples */
export class TextListEditor extends RowListEditor {
  criarControles(valor) {
    const input = h('input', { type: 'text', value: valor || '', placeholder: this.props.placeholder || '', maxlength: 300 });
    return { elementos: [input], obter: () => input.value.trim(), focar: () => input.focus() };
  }
}

/** Lista de afirmações com seletor verdadeira/falsa */
export class StatementListEditor extends RowListEditor {
  valorVazio() {
    return { texto: '', verdadeira: true };
  }

  criarControles(valor) {
    const input = h('input', { type: 'text', value: valor.texto || '', placeholder: 'Escreva a afirmação', maxlength: 400 });
    const select = h(
      'select',
      { class: 'select-verdade', 'aria-label': 'Essa afirmação é' },
      h('option', { value: 'v', text: '✓ Verdadeira', selected: valor.verdadeira !== false }),
      h('option', { value: 'f', text: '✗ Falsa', selected: valor.verdadeira === false })
    );
    return {
      elementos: [input, select],
      obter: () => ({ texto: input.value.trim(), verdadeira: select.value === 'v' }),
      focar: () => input.focus(),
    };
  }

  estaVazio(valor) {
    return !valor.texto;
  }
}

/** Lista de pares A ↔ B */
export class PairListEditor extends RowListEditor {
  valorVazio() {
    return { a: '', b: '' };
  }

  criarControles(valor) {
    const a = h('input', { type: 'text', value: valor.a || '', placeholder: 'Coluna A (ex: Ctrl + C)', maxlength: 200 });
    const b = h('input', { type: 'text', value: valor.b || '', placeholder: 'Coluna B (ex: Copiar)', maxlength: 200 });
    return {
      elementos: [a, h('span', { class: 'lista-seta', 'aria-hidden': 'true', text: '↔' }), b],
      obter: () => ({ a: a.value.trim(), b: b.value.trim() }),
      focar: () => a.focus(),
    };
  }

  estaVazio(valor) {
    return !valor.a && !valor.b;
  }
}
