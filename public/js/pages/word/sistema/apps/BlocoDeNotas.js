import { h } from '../../../../core/dom.js';
import { Janela } from '../Janela.js';
import { MenuDeContexto } from '../MenuDeContexto.js';
import { Dialogo } from '../Dialogo.js';
import { DialogoDeArquivo } from '../DialogoDeArquivo.js';

/**
 * Bloco de Notas do Windows 11. Os atalhos são os do Windows (Ctrl+A, Ctrl+C,
 * Ctrl+V, Ctrl+S). Copiar daqui alimenta a área de transferência do
 * simulador, que o Word usa no Colar.
 */
export class BlocoDeNotas {
  constructor(sim) {
    this.sim = sim;
    this.arquivo = null;
    this.sujo = false;
    this.janela = new Janela(sim, { app: 'bloco', titulo: 'Sem título - Bloco de Notas', icone: 'img:logo-bloco-de-notas', largura: 640, altura: 420, classe: 'janela-bloco' });
    this.janela.aoTeclar = (e) => this.aoTeclar(e);
    this.janela.podeFechar = () => this.perguntarSeSalva();
    this.janela.aoReceberFoco = () => this.texto.focus();

    this.texto = h('textarea', { class: 'bloco-texto', spellcheck: false, 'data-alvo': 'bloco.texto', wrap: 'off' });
    this.posicao = h('span', { text: 'Ln 1, Col 1' });
    const menu = (rotulo, id, itens) =>
      h('button', {
        type: 'button',
        class: 'bloco-menu',
        text: rotulo,
        'data-alvo': `bloco.menu.${id}`,
        onClick: (e) => {
          MenuDeContexto.abrir({ ancora: e.currentTarget, raiz: sim.el, itens: itens(), largura: 220 });
          sim.emitir({ tipo: 'menu', menu: `bloco.${id}` });
        },
      });
    this.janela.conteudo.append(
      h(
        'div',
        { class: 'bloco-barra' },
        menu('Arquivo', 'arquivo', () => [
          { rotulo: 'Novo', atalho: 'Ctrl+N', acao: () => this.novo() },
          { rotulo: 'Abrir', atalho: 'Ctrl+O', acao: () => this.abrirPeloDialogo() },
          { rotulo: 'Salvar', atalho: 'Ctrl+S', alvo: 'bloco.arquivo.salvar', acao: () => this.salvar() },
          { rotulo: 'Salvar como', atalho: 'Ctrl+Shift+S', acao: () => this.salvar({ como: true }) },
          { separador: true },
          { rotulo: 'Fechar', acao: () => this.janela.fechar() },
        ]),
        menu('Editar', 'editar', () => this.itensEditar()),
        menu('Exibir', 'exibir', () => [
          { rotulo: 'Quebra automática de linha', marcado: this.texto.wrap === 'soft', acao: () => (this.texto.wrap = this.texto.wrap === 'soft' ? 'off' : 'soft') },
          { rotulo: 'Barra de status', marcado: true, acao: () => {} },
        ])
      ),
      this.texto,
      h('div', { class: 'bloco-status' }, this.posicao, h('span', { text: '100%' }), h('span', { text: 'Windows (CRLF)' }), h('span', { text: 'UTF-8' }))
    );

    this.texto.addEventListener('input', () => {
      this.marcarSujo();
      this.sim.emitir({ tipo: 'digitar', app: 'bloco' });
    });
    for (const ev of ['keyup', 'click', 'select']) this.texto.addEventListener(ev, () => this.atualizarPosicao());
    this.texto.addEventListener('copy', () => this.copiou('copiar'));
    this.texto.addEventListener('cut', () => {
      this.copiou('recortar');
      setTimeout(() => this.marcarSujo());
    });
    this.texto.addEventListener('paste', () => setTimeout(() => this.sim.emitir({ tipo: 'colar', app: 'bloco' })));
    this.texto.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      MenuDeContexto.abrir({ x: e.clientX, y: e.clientY, raiz: sim.el, itens: this.itensEditar(), largura: 220 });
    });
  }

  itensEditar() {
    const temSelecao = this.texto.selectionStart !== this.texto.selectionEnd;
    return [
      { rotulo: 'Desfazer', icone: 'arrow_undo', atalho: 'Ctrl+Z', acao: () => (this.texto.focus(), document.execCommand('undo')) },
      { separador: true },
      { rotulo: 'Recortar', icone: 'cut', atalho: 'Ctrl+X', desabilitado: !temSelecao, alvo: 'bloco.editar.recortar', acao: () => this.recortarPeloMenu() },
      { rotulo: 'Copiar', icone: 'copy', atalho: 'Ctrl+C', desabilitado: !temSelecao, alvo: 'bloco.editar.copiar', acao: () => this.copiarPeloMenu() },
      { rotulo: 'Colar', icone: 'clipboard_paste', atalho: 'Ctrl+V', desabilitado: !this.sim.areaDeTransferencia, alvo: 'bloco.editar.colar', acao: () => this.colarPeloMenu() },
      { rotulo: 'Excluir', icone: 'delete', atalho: 'Del', desabilitado: !temSelecao, acao: () => this.substituirSelecao('') },
      { separador: true },
      { rotulo: 'Selecionar tudo', icone: 'select_all_on', atalho: 'Ctrl+A', alvo: 'bloco.editar.selecionarTudo', acao: () => this.selecionarTudo() },
      { rotulo: 'Hora/data', atalho: 'F5', acao: () => this.substituirSelecao(new Date().toLocaleString('pt-BR')) },
    ];
  }

  selecao() {
    return this.texto.value.slice(this.texto.selectionStart, this.texto.selectionEnd);
  }

  temSelecaoCompleta() {
    return this.texto.value.length > 0 && this.texto.selectionStart === 0 && this.texto.selectionEnd === this.texto.value.length;
  }

  selecionarTudo() {
    this.texto.focus();
    this.texto.select();
    this.sim.emitir({ tipo: 'selecionar-tudo', app: 'bloco' });
  }

  copiou(modo) {
    const texto = this.selecao();
    if (!texto) return;
    this.sim.areaDeTransferencia = { texto, html: null, app: 'bloco' };
    this.sim.emitir({ tipo: 'copiar', app: 'bloco', texto, modo });
  }

  copiarPeloMenu() {
    this.copiou('copiar');
    navigator.clipboard?.writeText(this.selecao()).catch(() => {});
    this.texto.focus();
  }

  recortarPeloMenu() {
    this.copiarPeloMenu();
    this.substituirSelecao('');
  }

  colarPeloMenu() {
    const guardado = this.sim.areaDeTransferencia;
    if (!guardado) return;
    this.substituirSelecao(guardado.texto);
    this.sim.emitir({ tipo: 'colar', app: 'bloco' });
  }

  substituirSelecao(texto) {
    this.texto.focus();
    this.texto.setRangeText(texto, this.texto.selectionStart, this.texto.selectionEnd, 'end');
    this.marcarSujo();
  }

  atualizarPosicao() {
    const antes = this.texto.value.slice(0, this.texto.selectionStart).split('\n');
    this.posicao.textContent = `Ln ${antes.length}, Col ${antes[antes.length - 1].length + 1}`;
  }

  marcarSujo() {
    this.sujo = true;
    this.atualizarTitulo();
  }

  atualizarTitulo() {
    const nome = this.arquivo ? this.arquivo.nome : 'Sem título';
    this.janela.definirTitulo(`${this.sujo ? '*' : ''}${nome} - Bloco de Notas`);
  }

  async abrirArquivo(item) {
    if (!(await this.perguntarSeSalva())) return;
    this.arquivo = { pasta: item.pasta, nome: item.nome };
    this.texto.value = item.tipo === 'txt' ? item.conteudo?.texto || '' : textoPuro(item.conteudo?.html || '');
    this.sujo = false;
    this.atualizarTitulo();
    this.texto.focus();
    this.texto.setSelectionRange(0, 0);
    this.sim.emitir({ tipo: 'arquivo', acao: 'abrir', nome: item.nome, pasta: item.pasta, tipoItem: item.tipo, app: 'bloco' });
  }

  async abrirPeloDialogo() {
    const escolha = await new DialogoDeArquivo(this.sim, { modo: 'abrir', tipos: [{ tipo: 'txt', rotulo: 'Documentos de texto (*.txt)' }] }).escolher();
    if (escolha) await this.abrirArquivo(escolha.item);
  }

  async novo() {
    if (!(await this.perguntarSeSalva())) return;
    this.arquivo = null;
    this.texto.value = '';
    this.sujo = false;
    this.atualizarTitulo();
  }

  async salvar({ como = false } = {}) {
    let destino = this.arquivo;
    if (!destino || como) {
      destino = await new DialogoDeArquivo(this.sim, { modo: 'salvar', nome: this.arquivo?.nome || '*.txt', tipos: [{ tipo: 'txt', rotulo: 'Documentos de texto (*.txt)' }] }).escolher();
      if (!destino) return false;
    }
    this.sim.fs.salvar(destino.pasta, destino.nome, 'txt', { texto: this.texto.value });
    this.arquivo = { pasta: destino.pasta, nome: destino.nome };
    this.sujo = false;
    this.atualizarTitulo();
    this.sim.emitir({ tipo: 'arquivo', acao: 'salvar', nome: destino.nome, pasta: destino.pasta, tipoItem: 'txt', app: 'bloco' });
    return true;
  }

  async perguntarSeSalva() {
    if (!this.sujo) return true;
    const resposta = await Dialogo.mensagem(this.sim, {
      titulo: 'Bloco de Notas',
      texto: `Deseja salvar as alterações em ${this.arquivo ? this.arquivo.nome : 'Sem título'}?`,
      tipo: 'pergunta',
      botoes: ['Salvar', 'Não salvar', 'Cancelar'],
      nome: 'salvarBloco',
    });
    if (resposta === 'Salvar') return this.salvar();
    return resposta === 'Não salvar';
  }

  aoTeclar(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return false;
    const tecla = e.key.toLowerCase();
    if (tecla === 's') {
      e.preventDefault();
      this.salvar({ como: e.shiftKey });
      return true;
    }
    if (tecla === 'a') {
      e.preventDefault();
      this.selecionarTudo();
      return true;
    }
    if (tecla === 'o') {
      e.preventDefault();
      this.abrirPeloDialogo();
      return true;
    }
    return false;
  }

  estado() {
    return { arquivo: this.arquivo, texto: this.texto.value, sujo: this.sujo };
  }
}

function textoPuro(html) {
  const div = document.createElement('div');
  div.innerHTML = html.replace(/<\/(p|h\d|li|div)>/gi, '\n');
  return div.textContent.trim();
}
