import { h } from '../../../core/dom.js';
import { icone, iconeDoArquivo } from './icones.js';
import { MenuDeContexto } from './MenuDeContexto.js';
import { LIXEIRA } from '../regras/SistemaDeArquivos.js';
import { excluirItem, menuDoFundo, menuDoItem, moverItem, renomearNoLugar, colarArquivo, guardarArquivo } from './acoesDeArquivo.js';

const PASTA = 'Área de Trabalho';

/**
 * Área de Trabalho: a Lixeira e os arquivos da pasta "Área de Trabalho".
 * Um clique seleciona, dois cliques abrem, botão direito mostra o menu,
 * F2 renomeia, Delete exclui, e dá para arrastar para a Lixeira ou para
 * uma pasta.
 */
export class AreaDeTrabalho {
  constructor(sim) {
    this.sim = sim;
    this.selecionado = null;
    this.el = h('div', { class: 'area-trabalho' });
    this.el.addEventListener('pointerdown', (e) => {
      if (e.target === this.el) {
        this.selecionar(null);
        this.sim.menuIniciar.fechar();
      }
    });
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.sim.emitir({ tipo: 'clique-vazio' });
    });
    this.el.addEventListener('contextmenu', (e) => {
      if (e.target !== this.el) return;
      e.preventDefault();
      this.selecionar(null);
      MenuDeContexto.abrir({
        x: e.clientX,
        y: e.clientY,
        raiz: this.sim.el,
        itens: [
          {
            rotulo: 'Exibir',
            icone: 'grid',
            submenu: ['Ícones grandes', 'Ícones médios', 'Ícones pequenos'].map((rotulo) => ({ rotulo, marcado: rotulo === 'Ícones médios', acao: () => {} })),
          },
          { rotulo: 'Classificar por', icone: 'arrow_sort', submenu: ['Nome', 'Tamanho', 'Tipo de item', 'Data de modificação'].map((rotulo) => ({ rotulo, acao: () => this.desenhar() })) },
          { rotulo: 'Atualizar', icone: 'arrow_clockwise', acao: () => this.desenhar() },
          { separador: true },
          ...menuDoFundo(sim, PASTA, { aoNovo: (item) => this.renomear(item) }),
        ],
      });
      this.sim.emitir({ tipo: 'menu', menu: 'contexto-area' });
    });
    this.desenhar();
  }

  desenhar() {
    const lixeira = { id: 'lixeira', nome: 'Lixeira', tipo: 'lixeira' };
    const itens = [lixeira, ...this.sim.fs.listar(PASTA)];
    this.el.replaceChildren(...itens.map((item) => this.criarIcone(item)));
  }

  criarIcone(item) {
    const ehLixeira = item.tipo === 'lixeira';
    const cheia = ehLixeira && this.sim.fs.listar(LIXEIRA).length > 0;
    const rotulo = h('span', { class: 'area-rotulo', text: item.nome });
    const el = h(
      'button',
      {
        type: 'button',
        class: `area-icone${this.selecionado === item.id ? ' selecionado' : ''}`,
        'data-alvo': `area.icone.${item.nome}`,
        draggable: !ehLixeira,
        title: ehLixeira ? (cheia ? 'Lixeira (com itens)' : 'Lixeira (vazia)') : null,
      },
      ehLixeira ? h('span', { class: `icone-lixeira${cheia ? ' cheia' : ''}` }, icone('img:lixeira', { tamanho: 44 })) : iconeDoArquivo(item, 44),
      rotulo
    );
    el.addEventListener('click', () => this.selecionar(item.id));
    el.addEventListener('dblclick', () => this.abrir(item));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.abrir(item);
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.selecionar(item.id);
      const itens = ehLixeira
        ? [
            { rotulo: 'Abrir', icone: 'open', negrito: true, alvo: 'contexto.abrir', acao: () => this.abrir(item) },
            { rotulo: 'Esvaziar Lixeira', icone: 'delete', desabilitado: !cheia, acao: () => this.esvaziar() },
          ]
        : menuDoItem(this.sim, item, { abrir: () => this.abrir(item), renomear: () => this.renomear(item) });
      MenuDeContexto.abrir({ x: e.clientX, y: e.clientY, itens, raiz: this.sim.el });
      this.sim.emitir({ tipo: 'menu', menu: 'contexto-item', nome: item.nome });
    });

    if (!ehLixeira) {
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/x-arquivo', String(item.id));
        e.dataTransfer.effectAllowed = 'move';
      });
    }
    if (ehLixeira || item.tipo === 'pasta') {
      const destino = ehLixeira ? LIXEIRA : `${PASTA}/${item.nome}`;
      el.addEventListener('dragover', (e) => {
        if (e.dataTransfer.types.includes('text/x-arquivo')) {
          e.preventDefault();
          el.classList.add('soltar');
        }
      });
      el.addEventListener('dragleave', () => el.classList.remove('soltar'));
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('soltar');
        const arrastado = this.sim.fs.porId(Number(e.dataTransfer.getData('text/x-arquivo')));
        if (arrastado && arrastado !== item) moverItem(this.sim, arrastado, destino);
      });
    }
    return el;
  }

  selecionar(id) {
    this.selecionado = id;
    for (const el of this.el.querySelectorAll('.area-icone')) el.classList.toggle('selecionado', el.dataset.alvo === `area.icone.${this.itemPorId(id)?.nome}`);
  }

  itemPorId(id) {
    if (id === 'lixeira') return { id, nome: 'Lixeira', tipo: 'lixeira' };
    return id ? this.sim.fs.porId(id) : null;
  }

  abrir(item) {
    if (item.tipo === 'lixeira') {
      const explorador = this.sim.abrirApp('explorador', { via: 'area' });
      explorador?.ir(LIXEIRA);
      return;
    }
    this.sim.abrirArquivo(item, { via: 'area' });
  }

  renomear(item) {
    this.desenhar();
    const el = this.el.querySelector(`[data-alvo="${CSS.escape(`area.icone.${item.nome}`)}"] .area-rotulo`);
    if (el) renomearNoLugar(this.sim, item, el, () => this.desenhar());
  }

  esvaziar() {
    this.sim.fs.esvaziarLixeira();
    this.sim.emitir({ tipo: 'arquivo', acao: 'esvaziar-lixeira', nome: 'Lixeira', pasta: LIXEIRA });
  }

  /** Teclas quando nenhuma janela está ativa */
  aoTeclar(e) {
    const item = this.itemPorId(this.selecionado);
    if (!item || item.tipo === 'lixeira') return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.key === 'F2') {
      e.preventDefault();
      this.renomear(item);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      excluirItem(this.sim, item);
    } else if (ctrl && e.key.toLowerCase() === 'c') guardarArquivo(this.sim, item, 'copiar');
    else if (ctrl && e.key.toLowerCase() === 'x') guardarArquivo(this.sim, item, 'recortar');
    else if (ctrl && e.key.toLowerCase() === 'v') colarArquivo(this.sim, PASTA);
  }
}
