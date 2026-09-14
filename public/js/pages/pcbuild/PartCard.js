import { Component } from '../../core/Component.js';
import { h } from '../../core/dom.js';
import { paraCentavos, formatarNumero, ligarCampoDinheiro } from '../../core/Money.js';

let contador = 0;

/**
 * Cartão de uma peça da proposta (nome, preço e link).
 * props: { categoria, extra?, valores?, onMudar?, onRemover? }
 */
export class PartCard extends Component {
  render() {
    const { categoria, extra = false, valores = {} } = this.props;
    const id = ++contador;

    this.nome = h('input', { type: 'text', id: `peca-nome-${id}`, placeholder: 'Copie aqui o nome da peça que você achou', autocomplete: 'off', maxlength: 300, value: valores.nome || '' });
    this.preco = h('input', { type: 'text', id: `peca-preco-${id}`, placeholder: '0,00', value: valores.preco || '' });
    this.link = h('input', { type: 'url', id: `peca-link-${id}`, placeholder: 'https://...', autocomplete: 'off', maxlength: 1000, value: valores.link || '' });

    if (this.preco.value) {
      const centavos = paraCentavos(this.preco.value);
      if (centavos !== null) this.preco.value = formatarNumero(centavos);
    }

    ligarCampoDinheiro(this.preco, () => this.mudou());
    for (const campo of [this.nome, this.link]) {
      this.ouvir(campo, 'input', () => {
        campo.classList.remove('campo-invalido');
        this.mudou();
      });
    }

    this.status = h('span', { class: 'peca-status' });
    const titulo = extra ? categoria.rotulo : categoria.nome;

    const el = h(
      'div',
      { class: `peca${extra ? ' peca-extra' : ''}` },
      h(
        'div',
        { class: 'peca-cabecalho' },
        h('span', { class: 'peca-icone', 'aria-hidden': 'true', text: categoria.icone }),
        h('div', { class: 'peca-titulo' }, h('strong', { text: titulo }), h('span', { class: 'peca-dica', text: categoria.dica })),
        extra
          ? h('button', { type: 'button', class: 'btn-remover-peca', 'aria-label': `Remover ${titulo}`, text: 'Remover', onClick: () => this.emitir('Remover', this) })
          : this.status
      ),
      h(
        'div',
        { class: 'peca-campos' },
        h('div', { class: 'peca-campo-nome' }, h('label', { for: this.nome.id, text: 'Nome da peça' }), this.nome),
        h('div', { class: 'peca-campo-link' }, h('label', { for: this.link.id }, 'Link da loja ', h('span', { class: 'rotulo-opcional', text: '(opcional)' })), this.link),
        h('div', { class: 'peca-campo-preco' }, h('label', { for: this.preco.id, text: 'Preço' }), h('div', { class: 'campo-dinheiro' }, this.preco))
      )
    );
    return el;
  }

  aoMontar() {
    this.atualizarEstado();
  }

  mudou() {
    this.el.classList.remove('com-erro');
    this.atualizarEstado();
    this.emitir('Mudar', this);
  }

  /** Valores digitados (brutos) + preço convertido */
  ler() {
    const nome = this.nome.value.trim();
    const precoTexto = this.preco.value.trim();
    const link = this.link.value.trim();
    const precoCentavos = precoTexto ? paraCentavos(precoTexto) : null;
    return {
      categoria: this.props.categoria,
      nome,
      precoTexto,
      precoCentavos,
      link,
      vazia: !nome && !precoTexto && !link,
      pronta: Boolean(nome) && precoCentavos !== null,
    };
  }

  paraRascunho() {
    const { nome, precoTexto, link } = this.ler();
    return { id: this.props.categoria.id, nome, preco: precoTexto, link };
  }

  atualizarEstado() {
    const { pronta } = this.ler();
    this.el.classList.toggle('pronta', pronta);
    if (!this.el.classList.contains('com-erro')) this.status.textContent = pronta ? '✓ Pronta' : 'Falta preencher';
  }

  /**
   * Marca campos faltando. Extras totalmente vazios são ignorados.
   * @returns {boolean} se a peça está válida para envio
   */
  validar() {
    const dados = this.ler();
    if (this.props.extra && dados.vazia) return true;

    const faltaNome = !dados.nome;
    const precoInvalido = dados.precoCentavos === null;
    this.nome.classList.toggle('campo-invalido', faltaNome);
    this.preco.classList.toggle('campo-invalido', precoInvalido);
    this.el.classList.toggle('com-erro', faltaNome || precoInvalido);

    if (faltaNome || precoInvalido) {
      this.status.textContent = faltaNome && precoInvalido ? 'Falta nome e preço' : faltaNome ? 'Falta o nome' : dados.precoTexto ? 'Preço inválido' : 'Falta o preço';
      return false;
    }
    return true;
  }

  focarPrimeiroErro() {
    const campo = this.el.querySelector('.campo-invalido') || this.nome;
    this.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    campo.focus({ preventScroll: true });
  }
}
