import { Component } from '../core/Component.js';
import { h } from '../core/dom.js';
import { icone } from '../components/icones.js';

/**
 * Tela de entrada do professor. A senha fica oculta (com botão de mostrar)
 * e é enviada uma única vez em troca de um token de sessão.
 * props: { sessao, aviso?, onEntrar(), textos? } (textos troca título, rótulo etc.)
 */
const TEXTOS_PADRAO = {
  icone: '🎓',
  titulo: 'Área do professor',
  descricao: 'Acompanhe as turmas e gerencie as atividades.',
  rotulo: 'Senha',
  placeholder: 'Digite a senha',
  vazio: 'Digite a senha.',
  voltarHref: 'index.html',
};

export class LoginView extends Component {
  render() {
    const textos = { ...TEXTOS_PADRAO, ...this.props.textos };
    this.textos = textos;
    this.senha = h('input', {
      type: 'password',
      id: 'senha-admin',
      autocomplete: 'current-password',
      required: true,
      placeholder: textos.placeholder,
      'aria-describedby': 'erro-login',
    });
    this.botaoMostrar = h('button', {
      type: 'button',
      class: 'mostrar-senha',
      'aria-label': 'Mostrar senha',
      'aria-pressed': 'false',
      onClick: () => this.alternarVisibilidade(),
    }, icone('olho'));
    this.erro = h('div', { class: `erro-msg${this.props.aviso ? ' mostrar' : ''}`, id: 'erro-login', role: 'alert', text: this.props.aviso || '' });
    this.botao = h('button', { type: 'submit', class: 'btn btn-escuro btn-grande btn-bloco', text: 'Entrar' });

    const form = h(
      'form',
      { class: 'login-card cartao', novalidate: true },
      h('span', { class: 'login-logo', 'aria-hidden': 'true', text: textos.icone }),
      h('h1', { text: textos.titulo }),
      h('p', { class: 'texto-suave', text: textos.descricao }),
      h('label', { for: 'senha-admin', text: textos.rotulo }),
      h('div', { class: 'campo-senha' }, this.senha, this.botaoMostrar),
      this.erro,
      this.botao,
      h('a', { href: textos.voltarHref, class: 'login-voltar', text: '← Voltar ao site dos alunos' })
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
    this.botaoMostrar.replaceChildren(icone(mostrar ? 'olhoRiscado' : 'olho'));
    this.senha.focus();
  }

  async entrar() {
    if (this.carregando) return;
    if (!this.senha.value) {
      this.mostrarErro(this.textos.vazio);
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
