import { Component } from '../../../core/Component.js';
import { h } from '../../../core/dom.js';

/**
 * Entrada do aluno: código da sala (4 letras, aparece no telão) + nome.
 * props: { aviso?, tipo? ('erro' | 'sucesso'), codigo?, nome?, onEntrar({ codigo, nome }) → Promise }
 */
export class EntradaView extends Component {
  render() {
    this.codigo = h('input', {
      type: 'text',
      id: 'lab-codigo',
      class: 'campo-codigo',
      maxlength: 4,
      autocomplete: 'off',
      autocapitalize: 'characters',
      spellcheck: 'false',
      placeholder: 'ABCD',
      value: (this.props.codigo || '').toUpperCase(),
      'aria-describedby': 'lab-entrada-erro',
    });
    this.nome = h('input', {
      type: 'text',
      id: 'lab-nome',
      class: 'campo-nome',
      maxlength: 20,
      autocomplete: 'off',
      placeholder: 'Ex.: Ana Júlia',
      value: this.props.nome || '',
      'aria-describedby': 'lab-entrada-erro',
    });
    const aviso = this.props.aviso || '';
    this.erro = h('div', {
      class: `${this.props.tipo === 'sucesso' ? 'sucesso-msg' : 'erro-msg'}${aviso ? ' mostrar' : ''}`,
      id: 'lab-entrada-erro',
      role: 'alert',
      text: aviso,
    });
    this.botao = h('button', { type: 'submit', class: 'btn btn-primario btn-grande btn-bloco' }, 'Entrar no laboratório 🧪');

    this.ouvir(this.codigo, 'input', () => {
      // Só letras, sempre maiúsculas
      this.codigo.value = this.codigo.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
      this.limparErro();
      if (this.codigo.value.length === 4 && !this.nome.value) this.nome.focus();
    });
    this.ouvir(this.nome, 'input', () => this.limparErro());

    const form = h(
      'form',
      { class: 'entrada-card cartao', novalidate: true },
      h('div', { class: 'entrada-emoji', 'aria-hidden': 'true', text: '🧪' }),
      h('h1', { text: 'Laboratório de Experimentos' }),
      h('p', { class: 'entrada-texto', text: 'Aposte, experimente e registre o que acontece no computador. Quem descobrir mais ganha!' }),
      h('label', { for: 'lab-codigo', class: 'rotulo-grande', text: '🔑 Código da sala' }),
      this.codigo,
      h('label', { for: 'lab-nome', class: 'rotulo-grande', text: '🙋 Seu nome' }),
      this.nome,
      this.erro,
      this.botao
    );
    this.ouvir(form, 'submit', (e) => {
      e.preventDefault();
      this.enviar();
    });
    return h('section', { class: 'entrada' }, form);
  }

  aoMontar() {
    requestAnimationFrame(() => (this.codigo.value.length === 4 ? this.nome : this.codigo).focus());
  }

  limparErro() {
    if (this.erro.classList.contains('erro-msg')) this.erro.classList.remove('mostrar');
  }

  async enviar() {
    if (this.enviando) return;
    const codigo = this.codigo.value.trim().toUpperCase();
    const nome = this.nome.value.trim();
    if (codigo.length !== 4) return this.mostrarErro('O código da sala tem 4 letras. Olhe no telão!', this.codigo);
    if (nome.length < 2) return this.mostrarErro('Digite seu nome.', this.nome);

    this.enviando = true;
    this.botao.disabled = true;
    this.botao.textContent = 'Entrando...';
    try {
      await this.props.onEntrar({ codigo, nome });
    } catch (erro) {
      this.mostrarErro(erro.message, /nome/i.test(erro.message) ? this.nome : this.codigo);
    } finally {
      this.enviando = false;
      if (this.el) {
        this.botao.disabled = false;
        this.botao.textContent = 'Entrar no laboratório 🧪';
      }
    }
  }

  mostrarErro(mensagem, campo) {
    this.erro.className = 'erro-msg mostrar';
    this.erro.textContent = mensagem;
    if (campo) campo.focus();
  }
}
