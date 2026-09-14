import { Component } from '../core/Component.js';
import { h } from '../core/dom.js';
import { armazenamentoLocal } from '../core/SafeStorage.js';

/**
 * Formulário "Quem está jogando?" usado nas três atividades.
 * Lembra nome e turma no navegador (por atividade).
 *
 * props: { titulo, textoBotao?, chave, exemploTurma?, onEnviar?(identidade) }
 * Sem `textoBotao`, vira só um bloco de campos — use obterIdentidade().
 */
export class IdentityForm extends Component {
  render() {
    const { titulo, textoBotao, chave, exemploTurma = 'Ex: 7º Ano B' } = this.props;
    const salvo = armazenamentoLocal.ler(`identidade:${chave}`, {});

    this.campoNome = h('input', {
      type: 'text',
      id: `${chave}-participantes`,
      placeholder: 'Ex: Ana, Bruno e Carlos',
      autocomplete: 'off',
      maxlength: 200,
      value: salvo.participantes || '',
    });
    this.campoTurma = h('input', {
      type: 'text',
      id: `${chave}-turma`,
      placeholder: exemploTurma,
      autocomplete: 'off',
      maxlength: 60,
      value: salvo.turma || '',
    });
    this.erro = h('div', { class: 'erro-msg', role: 'alert' });

    for (const campo of [this.campoNome, this.campoTurma]) {
      this.ouvir(campo, 'input', () => {
        campo.classList.remove('campo-invalido');
        this.erro.classList.remove('mostrar');
        this.lembrar();
      });
    }

    const campos = h(
      'div',
      { class: 'identificacao-campos' },
      h('div', {}, h('label', { for: this.campoNome.id, text: 'Nome do aluno ou do grupo' }), this.campoNome),
      h('div', {}, h('label', { for: this.campoTurma.id, text: 'Turma' }), this.campoTurma),
      textoBotao && h('button', { type: 'submit', class: 'btn btn-primario', text: textoBotao })
    );

    // Com botão é um <form> próprio; sem botão vira um bloco dentro do formulário da página
    const raiz = h(
      textoBotao ? 'form' : 'div',
      { class: `identificacao${textoBotao ? ' identificacao-com-botao' : ''}`, novalidate: textoBotao ? true : null },
      h('h2', { class: 'identificacao-titulo', text: titulo }),
      campos,
      this.erro
    );

    if (textoBotao) {
      this.ouvir(raiz, 'submit', (evento) => {
        evento.preventDefault();
        const identidade = this.obterIdentidade({ marcarErros: true });
        if (identidade) this.emitir('Enviar', identidade);
      });
    }
    return raiz;
  }

  lembrar() {
    armazenamentoLocal.salvar(`identidade:${this.props.chave}`, {
      participantes: this.campoNome.value,
      turma: this.campoTurma.value,
    });
  }

  /** Devolve { participantes, turma } ou null (marcando os campos vazios) */
  obterIdentidade({ marcarErros = false } = {}) {
    const participantes = this.campoNome.value.trim();
    const turma = this.campoTurma.value.trim();
    if (participantes && turma) return { participantes, turma };

    if (marcarErros) {
      this.campoNome.classList.toggle('campo-invalido', !participantes);
      this.campoTurma.classList.toggle('campo-invalido', !turma);
      this.mostrarErro('Preencha o nome (ou do grupo) e a turma para começar.');
      (participantes ? this.campoTurma : this.campoNome).focus();
    }
    return null;
  }

  mostrarErro(mensagem) {
    this.erro.textContent = mensagem;
    this.erro.classList.add('mostrar');
  }

  focar() {
    (this.campoNome.value ? this.campoTurma : this.campoNome).focus();
  }
}
