import { h } from '../../../core/dom.js';
import { icone } from './icones.js';

/**
 * Caixa de diálogo do Windows/Office dentro do computador simulado: trava o
 * resto da tela até fechar, arrasta pela barra, Enter confirma e Esc cancela.
 *
 * opcoes: { nome (para eventos e alvos do Mostre-me), titulo, largura,
 *           classe, botoes: [{ rotulo, primario, valor, alvo, antes }] }
 * abrir() devolve uma Promise com o valor do botão (ou null se cancelou).
 * "antes(dialogo)" pode devolver false para não fechar (ex.: nome inválido).
 */
export class Dialogo {
  constructor(sim, opcoes) {
    this.sim = sim;
    this.opcoes = opcoes;
    this.nome = opcoes.nome || 'dialogo';
    this.corpo = h('div', { class: 'dlg-corpo' });
    this.rodape = h('div', { class: 'dlg-rodape' });
  }

  abrir() {
    const { titulo = '', largura = 420, classe = '' } = this.opcoes;
    this.barra = h(
      'div',
      { class: 'dlg-titulo' },
      h('span', { class: 'dlg-titulo-texto', text: titulo }),
      h('button', { type: 'button', class: 'win-botao win-botao-fechar', 'aria-label': 'Fechar', onClick: () => this.fechar(null) }, icone('dismiss', { tamanho: 16 }))
    );
    this.montarBotoes();
    this.caixa = h('div', { class: `dlg ${classe}`, role: 'dialog', 'aria-label': titulo, 'data-dialogo': this.nome }, this.barra, this.corpo, this.rodape);
    this.caixa.style.width = `${largura}px`;
    this.fundo = h('div', { class: 'dlg-fundo' }, this.caixa);
    this.sim.camadaDialogos.append(this.fundo);
    this.ligarArrastar();
    this.caixa.addEventListener('keydown', (e) => this.aoTeclar(e));
    this.fundo.addEventListener('pointerdown', (e) => {
      if (e.target === this.fundo) this.piscar();
    });
    this.sim.emitir({ tipo: 'dialogo', nome: this.nome, acao: 'abrir' });
    this.aoAbrir();
    const primeiro = this.caixa.querySelector('[autofocus], input, select, textarea, .dlg-rodape .dlg-primario');
    setTimeout(() => primeiro?.focus(), 30);
    return new Promise((resolver) => {
      this.resolver = resolver;
    });
  }

  aoAbrir() {}

  montarBotoes() {
    const botoes = this.opcoes.botoes || [];
    this.rodape.replaceChildren(
      ...botoes.map((b) =>
        h('button', {
          type: 'button',
          class: `dlg-botao${b.primario ? ' dlg-primario' : ''}`,
          text: b.rotulo,
          'data-alvo': b.alvo || null,
          onClick: () => this.clicar(b),
        })
      )
    );
    this.rodape.hidden = botoes.length === 0;
  }

  async clicar(botao) {
    if (botao.antes && (await botao.antes(this)) === false) return;
    this.fechar(botao.valor !== undefined ? botao.valor : botao.rotulo);
  }

  aoTeclar(e) {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      this.fechar(null);
    } else if (e.key === 'Enter' && !e.target.matches('textarea, button, select')) {
      const primario = (this.opcoes.botoes || []).find((b) => b.primario);
      if (primario) {
        e.preventDefault();
        this.clicar(primario);
      }
    }
  }

  piscar() {
    this.caixa.classList.remove('dlg-piscar');
    void this.caixa.offsetWidth;
    this.caixa.classList.add('dlg-piscar');
  }

  fechar(valor) {
    if (!this.fundo) return;
    this.fundo.remove();
    this.fundo = null;
    this.sim.emitir({ tipo: 'dialogo', nome: this.nome, acao: valor === null ? 'cancelar' : 'fechar' });
    this.aoFechar(valor);
    this.resolver?.(valor);
    this.sim.devolverFoco();
  }

  aoFechar() {}

  ligarArrastar() {
    this.barra.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      const r = this.caixa.getBoundingClientRect();
      const tela = this.sim.tela.getBoundingClientRect();
      const inicio = { x: e.clientX, y: e.clientY, l: r.left - tela.left, t: r.top - tela.top };
      this.caixa.classList.add('dlg-solto');
      Object.assign(this.caixa.style, { left: `${inicio.l}px`, top: `${inicio.t}px` });
      const mover = (ev) => {
        this.caixa.style.left = `${inicio.l + ev.clientX - inicio.x}px`;
        this.caixa.style.top = `${Math.max(0, inicio.t + ev.clientY - inicio.y)}px`;
      };
      const soltar = () => {
        document.removeEventListener('pointermove', mover);
        document.removeEventListener('pointerup', soltar);
      };
      document.addEventListener('pointermove', mover);
      document.addEventListener('pointerup', soltar);
    });
  }

  /**
   * Caixa de mensagem simples. tipo: 'info' | 'aviso' | 'pergunta' | 'erro'.
   * Devolve o rótulo do botão clicado (ou null).
   */
  static mensagem(sim, { titulo = 'Microsoft Word', texto, tipo = 'info', botoes = ['OK'], nome = 'mensagem' }) {
    const ICONES = { info: 'img:lightbulb-24-color', aviso: 'img:warning-24-color', pergunta: 'img:question-circle-24-color', erro: 'img:warning-24-color' };
    const dlg = new Dialogo(sim, {
      nome,
      titulo,
      largura: 400,
      classe: 'dlg-mensagem',
      botoes: botoes.map((rotulo, i) => ({ rotulo, primario: i === 0, alvo: `dialogo.${nome}.${i}` })),
    });
    dlg.corpo.append(h('div', { class: 'dlg-msg' }, icone(ICONES[tipo], { tamanho: 32 }), h('p', { text: texto })));
    return dlg.abrir();
  }
}
