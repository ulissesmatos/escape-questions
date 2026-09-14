import { h } from '../../core/dom.js';
import { paraCentavos, formatarNumero, ligarCampoDinheiro } from '../../core/Money.js';

let contador = 0;
const novoId = () => `campo-admin-${++contador}`;

/**
 * Campos de formulário do admin. Cada campo é um objeto com:
 *   el (elemento pronto), obter(), definir(valor), erro(mensagem|null)
 * Assim formulários são montados declarativamente e lidos de uma vez.
 */
class Campo {
  constructor({ rotulo, ajuda = '', obrigatorio = false, classe = '' }) {
    this.id = novoId();
    this.rotulo = rotulo;
    this.obrigatorio = obrigatorio;
    this.mensagem = h('span', { class: 'campo-erro', hidden: true });
    this.ajuda = ajuda;
    this.classe = classe;
  }

  envolver(controle) {
    return h(
      'div',
      { class: `campo-admin ${this.classe}` },
      this.rotulo && h('label', { for: this.id }, this.rotulo, this.obrigatorio && h('span', { class: 'obrigatorio', text: ' *' })),
      controle,
      this.ajuda && h('span', { class: 'campo-ajuda', text: this.ajuda }),
      this.mensagem
    );
  }

  erro(mensagem) {
    this.mensagem.hidden = !mensagem;
    this.mensagem.textContent = mensagem || '';
    this.controle && this.controle.classList.toggle('campo-invalido', Boolean(mensagem));
  }
}

export class CampoTexto extends Campo {
  constructor(opcoes) {
    super(opcoes);
    const { multilinha = false, linhas = 3, placeholder = '', max = 2000, tipo = 'text' } = opcoes;
    this.controle = multilinha
      ? h('textarea', { id: this.id, rows: linhas, placeholder, maxlength: max })
      : h('input', { type: tipo, id: this.id, placeholder, maxlength: max, autocomplete: 'off' });
    this.el = this.envolver(this.controle);
    this.controle.addEventListener('input', () => this.erro(null));
  }

  obter() {
    return this.controle.value.trim();
  }

  definir(valor) {
    this.controle.value = valor ?? '';
  }
}

export class CampoNumero extends Campo {
  constructor(opcoes) {
    super(opcoes);
    const { min, max, passo = 1 } = opcoes;
    this.controle = h('input', { type: 'number', id: this.id, min, max, step: passo, inputmode: 'decimal' });
    this.el = this.envolver(this.controle);
  }

  obter() {
    return this.controle.value === '' ? null : Number(this.controle.value);
  }

  definir(valor) {
    this.controle.value = valor ?? '';
  }
}

export class CampoMoeda extends Campo {
  constructor(opcoes) {
    super(opcoes);
    this.controle = h('input', { type: 'text', id: this.id, placeholder: '0,00' });
    ligarCampoDinheiro(this.controle);
    this.el = this.envolver(h('div', { class: 'campo-dinheiro' }, this.controle));
  }

  /** @returns {number|null} centavos */
  obter() {
    return paraCentavos(this.controle.value);
  }

  definir(centavos) {
    this.controle.value = centavos ? formatarNumero(centavos) : '';
  }
}

export class CampoSelect extends Campo {
  constructor(opcoes) {
    super(opcoes);
    this.controle = h('select', { id: this.id });
    this.definirOpcoes(opcoes.opcoes || []);
    this.el = this.envolver(this.controle);
  }

  /** @param {Array<{valor, rotulo, grupo?}>} opcoes */
  definirOpcoes(opcoes) {
    const grupos = new Map();
    const soltas = [];
    for (const o of opcoes) {
      const opcao = h('option', { value: String(o.valor ?? ''), text: o.rotulo });
      if (o.grupo) {
        if (!grupos.has(o.grupo)) grupos.set(o.grupo, h('optgroup', { label: o.grupo }));
        grupos.get(o.grupo).appendChild(opcao);
      } else {
        soltas.push(opcao);
      }
    }
    this.controle.replaceChildren(...soltas, ...grupos.values());
  }

  obter() {
    return this.controle.value;
  }

  definir(valor) {
    this.controle.value = valor === null || valor === undefined ? '' : String(valor);
  }

  aoMudar(fn) {
    this.controle.addEventListener('change', () => fn(this.obter()));
  }
}

export class CampoCheckbox extends Campo {
  constructor(opcoes) {
    super({ ...opcoes, rotulo: '' });
    this.controle = h('input', { type: 'checkbox', id: this.id });
    this.el = h(
      'label',
      { class: `campo-checkbox ${this.classe}`, for: this.id },
      this.controle,
      h('span', {}, h('strong', { text: opcoes.rotulo }), opcoes.ajuda && h('small', { text: opcoes.ajuda }))
    );
  }

  obter() {
    return this.controle.checked;
  }

  definir(valor) {
    this.controle.checked = Boolean(valor);
  }
}

/** Dificuldade de 1 a 5 com botões */
export class CampoDificuldade extends Campo {
  constructor(opcoes) {
    super(opcoes);
    this.valor = 2;
    const rotulos = ['Aquecimento', 'Fácil', 'Médio', 'Difícil', 'Desafio'];
    this.botoes = rotulos.map((r, i) =>
      h('button', { type: 'button', class: 'dificuldade-botao', title: r, 'aria-label': `${i + 1} — ${r}`, text: String(i + 1), onClick: () => this.definir(i + 1) })
    );
    this.legenda = h('span', { class: 'campo-ajuda' });
    this.rotulos = rotulos;
    this.controle = h('div', { class: 'dificuldade-escolha', role: 'radiogroup', id: this.id }, this.botoes, this.legenda);
    this.el = this.envolver(this.controle);
    this.definir(2);
  }

  obter() {
    return this.valor;
  }

  definir(valor) {
    this.valor = Math.min(5, Math.max(1, Number(valor) || 2));
    this.botoes.forEach((b, i) => b.classList.toggle('ativo', i + 1 <= this.valor));
    this.botoes.forEach((b, i) => b.setAttribute('aria-checked', String(i + 1 === this.valor)));
    this.legenda.textContent = this.rotulos[this.valor - 1];
  }
}

/** Grade de campos lado a lado */
export function linhaCampos(...campos) {
  return h('div', { class: 'linha-campos' }, campos.map((c) => (c.el ? c.el : c)));
}
