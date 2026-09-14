import { h } from '../../core/dom.js';
import { Modal } from '../../components/Modal.js';
import { Toast } from '../../components/ui.js';

/**
 * Formulário em modal. Subclasses (ou quem instancia) informam:
 *  - montarCampos(): elementos do formulário
 *  - coletar(): objeto a salvar (pode lançar Error com mensagem)
 *  - salvar(dados): Promise
 *
 * props: { titulo, textoSalvar?, classe?, montarCampos, coletar, salvar, onSalvo? }
 */
export class FormDialog extends Modal {
  constructor(props) {
    super({ ...props, classe: `modal-form ${props.classe || ''}` });
  }

  abrirFormulario() {
    this.montar(document.body);
    this.erroGeral = h('div', { class: 'erro-msg', role: 'alert' });
    // O botão fica no rodapé do modal (fora do <form>), por isso o clique é tratado à parte
    this.botaoSalvar = h('button', { type: 'button', class: 'btn btn-primario', text: this.props.textoSalvar || 'Salvar' });

    const form = h('form', { class: 'form-admin', novalidate: true }, this.props.montarCampos(this), this.erroGeral);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.enviar();
    });
    this.botaoSalvar.addEventListener('click', (e) => {
      e.preventDefault();
      this.enviar();
    });

    this.definirCabecalho(h('h2', { text: this.props.titulo }));
    this.definirCorpo(form);
    this.definirRodape(h('button', { type: 'button', class: 'btn btn-contorno', text: 'Cancelar', onClick: () => this.fechar() }), this.botaoSalvar);
    this.abrir();
    const primeiro = form.querySelector('input:not([type=checkbox]), textarea, select');
    if (primeiro) primeiro.focus({ preventScroll: true });
  }

  fechar(opcoes) {
    super.fechar(opcoes);
    setTimeout(() => this.destruir(), 0);
  }

  mostrarErro(mensagem) {
    this.erroGeral.textContent = mensagem;
    this.erroGeral.classList.add('mostrar');
    this.erroGeral.scrollIntoView({ block: 'nearest' });
  }

  async enviar() {
    if (this.salvando) return;
    this.erroGeral.classList.remove('mostrar');

    let dados;
    try {
      dados = this.props.coletar(this);
    } catch (err) {
      return this.mostrarErro(err.message);
    }

    this.salvando = true;
    this.botaoSalvar.disabled = true;
    this.botaoSalvar.textContent = 'Salvando...';
    try {
      const resultado = await this.props.salvar(dados);
      Toast.sucesso('Salvo!');
      this.fechar();
      this.emitir('Salvo', resultado);
    } catch (err) {
      this.mostrarErro(err.message);
    } finally {
      this.salvando = false;
      if (this.botaoSalvar) {
        this.botaoSalvar.disabled = false;
        this.botaoSalvar.textContent = this.props.textoSalvar || 'Salvar';
      }
    }
  }
}
