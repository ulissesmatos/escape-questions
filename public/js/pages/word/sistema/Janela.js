import { h } from '../../../core/dom.js';
import { icone } from './icones.js';

const ALTURA_BARRA_TAREFAS = 48;

/**
 * Janela do Windows 11: arrastar pela barra de título, dois cliques para
 * maximizar, minimizar para a barra de tarefas, redimensionar pelas bordas.
 *
 * opcoes: { app, titulo, icone, largura, altura, maximizada, classe,
 *           barra (elemento próprio, como a barra azul do Word) }
 * Quem herda define this.conteudo e pode sobrescrever podeFechar() (async).
 */
export class Janela {
  constructor(sim, opcoes) {
    this.sim = sim;
    this.app = opcoes.app;
    this.opcoes = opcoes;
    this.minimizada = false;
    this.maximizada = false;
    this.fechada = false;

    this.tituloTexto = h('span', { class: 'win-titulo-texto', text: opcoes.titulo || '' });
    this.botoes = Janela.botoesDeJanela(this, opcoes.temaBotoes);
    this.barra =
      opcoes.barra ||
      h(
        'div',
        { class: 'win-titulo', 'data-arrastar': '' },
        h('span', { class: 'win-titulo-icone' }, icone(opcoes.icone, { tamanho: 16 })),
        this.tituloTexto,
        this.botoes
      );
    this.conteudo = h('div', { class: 'win-conteudo' });
    this.el = h(
      'section',
      { class: `win-janela ${opcoes.classe || ''}`, 'data-app': this.app, role: 'dialog', 'aria-label': opcoes.titulo || '' },
      this.barra,
      this.conteudo,
      ['e', 's', 'se', 'w', 'sw'].map((lado) => h('div', { class: `win-redim win-redim-${lado}`, 'data-lado': lado }))
    );

    this.ligarArrastar();
    this.ligarRedimensionar();
    this.el.addEventListener('pointerdown', () => this.focar(), true);
  }

  /** Botões minimizar / maximizar / fechar (tema 'claro' ou 'escuro' para barras coloridas) */
  static botoesDeJanela(janela, tema = 'claro') {
    const botao = (nome, rotulo, acao, classe = '') =>
      h('button', { type: 'button', class: `win-botao ${classe}`, title: rotulo, 'aria-label': rotulo, onClick: (e) => (e.stopPropagation(), acao()) }, icone(nome, { tamanho: 16 }));
    janela.botaoMaximizar = botao('maximize', 'Maximizar', () => janela.alternarMaximizar());
    return h(
      'div',
      { class: `win-botoes win-botoes-${tema}` },
      botao('subtract', 'Minimizar', () => janela.minimizar()),
      janela.botaoMaximizar,
      botao('dismiss', 'Fechar', () => janela.fechar(), 'win-botao-fechar')
    );
  }

  /** Coloca a janela na tela (posição em cascata) */
  abrir() {
    const area = this.sim.areaDeTrabalhoUtil();
    const { largura = 760, altura = 520 } = this.opcoes;
    const deslocamento = (this.sim.janelas.length % 6) * 28;
    this.posicao = {
      x: Math.max(0, Math.min(area.largura - largura, Math.round((area.largura - largura) / 2) - 80 + deslocamento)),
      y: Math.max(0, Math.min(area.altura - altura, 40 + deslocamento)),
      largura: Math.min(largura, area.largura),
      altura: Math.min(altura, area.altura),
    };
    this.aplicarPosicao();
    this.sim.camadaJanelas.append(this.el);
    if (this.opcoes.maximizada || area.largura < largura + 40) this.maximizar({ silencioso: true });
    this.el.classList.add('win-abrindo');
    setTimeout(() => this.el.classList.remove('win-abrindo'), 200);
    this.focar();
  }

  aplicarPosicao() {
    Object.assign(this.el.style, {
      left: `${this.posicao.x}px`,
      top: `${this.posicao.y}px`,
      width: `${this.posicao.largura}px`,
      height: `${this.posicao.altura}px`,
    });
  }

  definirTitulo(titulo) {
    this.tituloTexto.textContent = titulo;
    this.el.setAttribute('aria-label', titulo);
    this.sim.barra?.atualizar();
  }

  get ativa() {
    return this.sim.janelaAtiva === this;
  }

  focar() {
    if (this.fechada) return;
    if (this.minimizada) this.restaurar();
    this.sim.focarJanela(this);
  }

  minimizar() {
    this.minimizada = true;
    this.el.classList.add('win-minimizada');
    this.sim.janelaMinimizada(this);
    this.sim.emitir({ tipo: 'app', acao: 'minimizar', app: this.app });
  }

  restaurar() {
    this.minimizada = false;
    this.el.classList.remove('win-minimizada');
  }

  maximizar({ silencioso = false } = {}) {
    this.maximizada = true;
    this.el.classList.add('win-maximizada');
    this.botaoMaximizar.replaceChildren(icone('square_multiple', { tamanho: 14 }));
    this.botaoMaximizar.title = 'Restaurar Tamanho';
    this.aoRedimensionar();
    if (!silencioso) this.sim.emitir({ tipo: 'app', acao: 'maximizar', app: this.app });
  }

  restaurarTamanho() {
    this.maximizada = false;
    this.el.classList.remove('win-maximizada');
    this.botaoMaximizar.replaceChildren(icone('maximize', { tamanho: 16 }));
    this.botaoMaximizar.title = 'Maximizar';
    this.aplicarPosicao();
    this.aoRedimensionar();
  }

  alternarMaximizar() {
    if (this.maximizada) this.restaurarTamanho();
    else this.maximizar();
  }

  /** Para quem herda: perguntar "Deseja salvar?" etc. Devolve false para cancelar. */
  async podeFechar() {
    return true;
  }

  async fechar() {
    if (!(await this.podeFechar())) return;
    this.fechada = true;
    this.el.classList.add('win-fechando');
    setTimeout(() => this.el.remove(), 120);
    this.aoFechar();
    this.sim.janelaFechada(this);
    this.sim.emitir({ tipo: 'app', acao: 'fechar', app: this.app });
  }

  aoFechar() {}

  aoRedimensionar() {}

  /** Teclas quando a janela está ativa; devolve true se tratou */
  aoTeclar() {
    return false;
  }

  ligarArrastar() {
    this.el.addEventListener('pointerdown', (e) => {
      const alca = e.target.closest('[data-arrastar]');
      if (!alca || e.button !== 0 || e.target.closest('button, input, select, a, [data-sem-arrastar]')) return;
      const inicio = { x: e.clientX, y: e.clientY };
      let base = { ...this.posicao };
      let moveu = false;
      const mover = (ev) => {
        const dx = ev.clientX - inicio.x;
        const dy = ev.clientY - inicio.y;
        if (!moveu && Math.hypot(dx, dy) < 4) return;
        if (!moveu && this.maximizada) {
          // Como no Windows: arrastar uma janela maximizada restaura o tamanho sob o mouse
          const tela = this.sim.tela.getBoundingClientRect();
          this.posicao.x = Math.round(ev.clientX - tela.left - this.posicao.largura / 2);
          this.posicao.y = 0;
          base = { ...this.posicao };
          inicio.x = ev.clientX;
          inicio.y = ev.clientY;
          this.restaurarTamanho();
        }
        moveu = true;
        const area = this.sim.areaDeTrabalhoUtil();
        this.posicao.x = Math.round(Math.min(area.largura - 60, Math.max(60 - this.posicao.largura, base.x + ev.clientX - inicio.x)));
        this.posicao.y = Math.round(Math.min(area.altura - 32, Math.max(0, base.y + ev.clientY - inicio.y)));
        this.aplicarPosicao();
      };
      const soltar = () => {
        document.removeEventListener('pointermove', mover);
        document.removeEventListener('pointerup', soltar);
        this.el.classList.remove('win-arrastando');
      };
      this.el.classList.add('win-arrastando');
      document.addEventListener('pointermove', mover);
      document.addEventListener('pointerup', soltar);
    });
    this.barra.addEventListener('dblclick', (e) => {
      if (e.target.closest('button, input, [data-sem-arrastar]') || !e.target.closest('[data-arrastar]')) return;
      this.alternarMaximizar();
    });
  }

  ligarRedimensionar() {
    for (const alca of this.el.querySelectorAll('.win-redim')) {
      alca.addEventListener('pointerdown', (e) => {
        if (this.maximizada) return;
        e.preventDefault();
        e.stopPropagation();
        const lado = alca.dataset.lado;
        const inicio = { x: e.clientX, y: e.clientY, ...this.posicao };
        const minL = this.opcoes.minLargura || 360;
        const minA = this.opcoes.minAltura || 220;
        const mover = (ev) => {
          const dx = ev.clientX - inicio.x;
          const dy = ev.clientY - inicio.y;
          if (lado.includes('e')) this.posicao.largura = Math.max(minL, inicio.largura + dx);
          if (lado.includes('s')) this.posicao.altura = Math.max(minA, inicio.altura + dy);
          if (lado.includes('w')) {
            const largura = Math.max(minL, inicio.largura - dx);
            this.posicao.x = inicio.x + inicio.largura - largura;
            this.posicao.largura = largura;
          }
          this.aplicarPosicao();
          this.aoRedimensionar();
        };
        const soltar = () => {
          document.removeEventListener('pointermove', mover);
          document.removeEventListener('pointerup', soltar);
        };
        document.addEventListener('pointermove', mover);
        document.addEventListener('pointerup', soltar);
      });
    }
  }
}

export { ALTURA_BARRA_TAREFAS };
