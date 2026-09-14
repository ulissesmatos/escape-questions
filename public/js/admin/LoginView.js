import { Component } from '../core/Component.js';
import { h } from '../core/dom.js';

/**
 * Tela de entrada do professor. A senha fica oculta (com botão de mostrar)
 * e é enviada uma única vez em troca de um token de sessão.
 * props: { sessao, aviso?, onEntrar() }
 */
export class LoginView extends Component {
  render() {
    this.senha = h('input', {
      type: 'password',
      id: 'senha-admin',
      autocomplete: 'current-password',
      required: true,
      placeholder: 'Digite a senha',
      'aria-describedby': 'erro-login',
    });
    this.botaoMostrar = h('button', {
      type: 'button',
      class: 'mostrar-senha',
      'aria-label': 'Mostrar senha',
      'aria-pressed': 'false',
      text: '👁️',
      onClick: () => this.alternarVisibilidade(),
    });
    this.erro = h('div', { class: `erro-msg${this.props.aviso ? ' mostrar' : ''}`, id: 'erro-login', role: 'alert', text: this.props.aviso || '' });
    this.botao = h('button', { type: 'submit', class: 'btn btn-escuro btn-grande btn-bloco', text: 'Entrar' });

    const form = h(
      'form',
      { class: 'login-card cartao', novalidate: true },
      h('span', { class: 'login-logo', 'aria-hidden': 'true', text: '🎓' }),
      h('h1', { text: 'Área do professor' }),
      h('p', { class: 'texto-suave', text: 'Acompanhe as turmas e gerencie as atividades.' }),
      h('label', { for: 'senha-admin', text: 'Senha' }),
      h('div', { class: 'campo-senha' }, this.senha, this.botaoMostrar),
      this.erro,
      this.botao,
      h('a', { href: 'index.html', class: 'login-voltar', text: '← Voltar ao site dos alunos' })
    );
    this.ouvir(form, 'submit', (e) => {
      e.preventDefault();
      this.entrar();
    });
    this.ouvir(this.senha, 'input', () => this.erro.classList.remove('mostrar'));
    return h('main', { class: 'login-tela' }, form);
  }

  aoMontar() {
    requestAnimationFrame(() => this.senha.focus());
  }

  alternarVisibilidade() {
    const mostrar = this.senha.type === 'password';
    this.senha.type = mostrar ? 'text' : 'password';
    this.botaoMostrar.setAttribute('aria-pressed', String(mostrar));
    this.botaoMostrar.setAttribute('aria-label', mostrar ? 'Esconder senha' : 'Mostrar senha');
    this.botaoMostrar.textContent = mostrar ? '🙈' : '👁️';
    this.senha.focus();
  }

  async entrar() {
    if (this.carregando) return;
    if (!this.senha.value) {
      this.mostrarErro('Digite a senha.');
      return;
    }
    this.carregando = true;
    this.botao.disabled = true;
    this.botao.textContent = 'Entrando...';
    try {
      await this.props.sessao.entrar(this.senha.value);
      this.senha.value = '';
      this.emitir('Entrar');
    } catch (err) {
      this.mostrarErro(err.message);
      this.senha.select();
    } finally {
      this.carregando = false;
      this.botao.disabled = false;
      this.botao.textContent = 'Entrar';
    }
  }

  mostrarErro(mensagem) {
    this.erro.textContent = mensagem;
    this.erro.classList.add('mostrar');
  }
}
