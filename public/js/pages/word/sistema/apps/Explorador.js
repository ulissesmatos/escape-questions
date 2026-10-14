import { h } from '../../../../core/dom.js';
import { Janela } from '../Janela.js';
import { icone, iconeDoArquivo } from '../icones.js';
import { dica } from '../Dica.js';
import { MenuDeContexto } from '../MenuDeContexto.js';
import { LIXEIRA, PASTAS_RAIZ, SistemaDeArquivos, TIPOS } from '../../regras/SistemaDeArquivos.js';
import { colarArquivo, excluirItem, guardarArquivo, menuDoFundo, menuDoItem, moverItem, renomearNoLugar, restaurarItem, tamanhoDoItem } from '../acoesDeArquivo.js';

const INICIO = 'Início';
const ICONE_PASTA = { 'Área de Trabalho': 'desktop', Documentos: 'document', Imagens: 'image', Downloads: 'arrow_download', [LIXEIRA]: 'bin_recycle', [INICIO]: 'home' };
const ICONE_COR = { 'Área de Trabalho': 'img:computador', Documentos: 'img:document-48-color', Imagens: 'img:image-48-color', Downloads: 'img:pasta' };

/**
 * Explorador de Arquivos do Windows 11.
 * Abre no "Início" (Acesso rápido + Recentes), como no Windows de verdade.
 */
export class Explorador {
  constructor(sim) {
    this.sim = sim;
    this.pasta = INICIO;
    this.voltarPilha = [];
    this.avancarPilha = [];
    this.selecionado = null;
    this.exibicao = 'detalhes';
    this.janela = new Janela(sim, { app: 'explorador', titulo: INICIO, icone: 'img:pasta', largura: 860, altura: 540, classe: 'janela-explorador' });
    this.janela.aoTeclar = (e) => this.aoTeclar(e);
    this.montar();
    this.desligar = sim.fs.aoMudar(() => this.desenhar());
  }

  montar() {
    this.caminho = h('div', { class: 'exp-caminho' });
    this.botaoVoltar = this.botaoNav('arrow_left', 'Voltar', () => this.voltar());
    this.botaoAvancar = this.botaoNav('arrow_right', 'Avançar', () => this.avancar());
    this.comandos = h('div', { class: 'exp-comandos' });
    this.navegacao = h('nav', { class: 'exp-nav' });
    this.lista = h('div', { class: 'exp-lista', tabindex: 0, 'data-alvo': 'explorador.lista' });
    this.status = h('div', { class: 'exp-status' });
    this.lista.addEventListener('pointerdown', (e) => {
      if (e.target === this.lista || e.target.classList.contains('exp-vazio')) this.selecionar(null);
    });
    this.lista.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.exp-item')) return;
      e.preventDefault();
      this.menuDoFundo(e);
    });
    this.lista.addEventListener('click', (e) => {
      if (e.target === this.lista) this.sim.emitir({ tipo: 'clique-vazio' });
    });
    this.ligarSoltar(this.lista, () => (this.pasta === INICIO ? null : this.pasta));

    this.janela.conteudo.append(
      h(
        'div',
        { class: 'exp-endereco' },
        this.botaoVoltar,
        this.botaoAvancar,
        this.botaoNav('arrow_up', 'Subir para a pasta acima', () => this.acima()),
        this.botaoNav('arrow_clockwise', 'Atualizar', () => this.desenhar()),
        this.caminho,
        h('div', { class: 'exp-pesquisa' }, icone('search', { tamanho: 14 }), h('input', { type: 'text', placeholder: 'Pesquisar', spellcheck: false, onInput: (e) => this.filtrar(e.target.value) }))
      ),
      this.comandos,
      h('div', { class: 'exp-meio' }, this.navegacao, this.lista),
      this.status
    );
    this.desenhar();
  }

  botaoNav(nome, rotulo, acao) {
    return h('button', { type: 'button', class: 'exp-nav-botao', ...dica(rotulo), onClick: acao }, icone(nome, { tamanho: 16 }));
  }

  abrirArquivo() {}

  /** Vai para uma pasta (guardando o histórico do Voltar) */
  ir(pasta, { historico = true } = {}) {
    if (pasta !== INICIO && !this.sim.fs.pastaExiste(pasta)) pasta = INICIO;
    if (historico && pasta !== this.pasta) {
      this.voltarPilha.push(this.pasta);
      this.avancarPilha = [];
    }
    this.pasta = pasta;
    this.selecionado = null;
    this.filtro = '';
    this.janela.definirTitulo(pasta.split('/').pop());
    this.desenhar();
    this.sim.emitir({ tipo: 'navegar', onde: 'explorador', pasta });
  }

  voltar() {
    if (!this.voltarPilha.length) return;
    this.avancarPilha.push(this.pasta);
    this.ir(this.voltarPilha.pop(), { historico: false });
  }

  avancar() {
    if (!this.avancarPilha.length) return;
    this.voltarPilha.push(this.pasta);
    this.ir(this.avancarPilha.pop(), { historico: false });
  }

  acima() {
    if (this.pasta.includes('/')) this.ir(this.pasta.split('/').slice(0, -1).join('/'));
    else if (this.pasta !== INICIO) this.ir(INICIO);
  }

  filtrar(texto) {
    this.filtro = texto.toLowerCase();
    this.desenharLista();
  }

  desenhar() {
    if (this.janela.fechada) return;
    if (this.pasta !== INICIO && !this.sim.fs.pastaExiste(this.pasta)) this.pasta = INICIO;
    this.botaoVoltar.disabled = !this.voltarPilha.length;
    this.botaoAvancar.disabled = !this.avancarPilha.length;
    this.desenharCaminho();
    this.desenharComandos();
    this.desenharNavegacao();
    this.desenharLista();
  }

  desenharCaminho() {
    const partes = this.pasta === INICIO ? [INICIO] : this.pasta === LIXEIRA ? [LIXEIRA] : ['Este Computador', ...this.pasta.split('/')];
    this.caminho.replaceChildren(
      icone(ICONE_PASTA[partes[partes.length === 1 ? 0 : 1]] || 'folder', { tamanho: 16 }),
      ...partes.flatMap((parte, i) => [
        h('span', { class: 'exp-caminho-sep' }, icone('chevron_right', { tamanho: 10 })),
        h('button', {
          type: 'button',
          class: 'exp-caminho-parte',
          text: parte,
          onClick: () => {
            if (parte === 'Este Computador') this.ir(INICIO);
            else if (partes[0] === 'Este Computador') this.ir(partes.slice(1, i + 1).join('/'));
          },
        }),
      ])
    );
  }

  desenharComandos() {
    const item = this.itemSelecionado();
    const naLixeira = this.pasta === LIXEIRA;
    const naInicio = this.pasta === INICIO;
    const botao = (nome, rotulo, acao, { alvo, desabilitado = false, texto = false } = {}) =>
      h(
        'button',
        { type: 'button', class: `exp-comando${texto ? ' com-texto' : ''}`, disabled: desabilitado, 'data-alvo': alvo || null, ...dica(rotulo), onClick: acao },
        icone(nome, { tamanho: 18 }),
        texto && h('span', { text: rotulo })
      );
    if (naLixeira) {
      this.comandos.replaceChildren(
        botao('delete', 'Esvaziar Lixeira', () => this.esvaziar(), { texto: true, desabilitado: !this.sim.fs.listar(LIXEIRA).length }),
        h('span', { class: 'exp-divisor' }),
        botao('arrow_reset', 'Restaurar os itens selecionados', () => item && restaurarItem(this.sim, item), { alvo: 'explorador.restaurar', texto: true, desabilitado: !item }),
        botao('arrow_counterclockwise', 'Restaurar todos os itens', () => this.sim.fs.listar(LIXEIRA).forEach((i) => restaurarItem(this.sim, i)), { texto: true, desabilitado: !this.sim.fs.listar(LIXEIRA).length })
      );
      return;
    }
    this.comandos.replaceChildren(
      h(
        'button',
        { type: 'button', class: 'exp-comando exp-novo', disabled: naInicio, 'data-alvo': 'explorador.novo', onClick: (e) => this.menuNovo(e.currentTarget) },
        icone('add', { tamanho: 18 }),
        h('span', { text: 'Novo' }),
        icone('chevron_down', { tamanho: 12 })
      ),
      h('span', { class: 'exp-divisor' }),
      botao('cut', 'Recortar (Ctrl+X)', () => item && guardarArquivo(this.sim, item, 'recortar'), { alvo: 'explorador.recortar', desabilitado: !item }),
      botao('copy', 'Copiar (Ctrl+C)', () => item && guardarArquivo(this.sim, item, 'copiar'), { alvo: 'explorador.copiar', desabilitado: !item }),
      botao('clipboard_paste', 'Colar (Ctrl+V)', () => colarArquivo(this.sim, this.pasta), { alvo: 'explorador.colar', desabilitado: naInicio || !this.sim.arquivoNaTransferencia }),
      botao('rename', 'Renomear (F2)', () => item && this.renomear(item), { alvo: 'explorador.renomear', desabilitado: !item }),
      botao('share', 'Compartilhar', () => {}, { desabilitado: true }),
      botao('delete', 'Excluir (Delete)', () => item && excluirItem(this.sim, item), { alvo: 'explorador.excluir', desabilitado: !item }),
      h('span', { class: 'exp-divisor' }),
      h(
        'button',
        { type: 'button', class: 'exp-comando com-texto', onClick: (e) => this.menuExibir(e.currentTarget) },
        icone(this.exibicao === 'detalhes' ? 'list' : 'grid', { tamanho: 18 }),
        h('span', { text: 'Exibir' }),
        icone('chevron_down', { tamanho: 12 })
      )
    );
  }

  desenharNavegacao() {
    const itemNav = (pasta, rotulo = pasta, nivel = 0) => {
      const el = h(
        'button',
        {
          type: 'button',
          class: `exp-nav-item${this.pasta === pasta ? ' ativo' : ''}`,
          style: { paddingLeft: `${10 + nivel * 16}px` },
          'data-alvo': `explorador.nav.${pasta}`,
          onClick: () => this.ir(pasta),
        },
        icone(ICONE_PASTA[pasta] || 'folder', { tamanho: 16 }),
        h('span', { text: rotulo })
      );
      if (pasta !== INICIO) this.ligarSoltar(el, () => pasta);
      return el;
    };
    // Subpastas aparecem embaixo da pasta aberta
    const subpastas = (pasta, nivel) =>
      this.pasta === pasta || this.pasta.startsWith(`${pasta}/`)
        ? this.sim.fs.subpastas(pasta).flatMap((sub) => [itemNav(sub, sub.split('/').pop(), nivel), ...subpastas(sub, nivel + 1)])
        : [];
    this.navegacao.replaceChildren(
      itemNav(INICIO),
      h('div', { class: 'exp-nav-separador' }),
      ...PASTAS_RAIZ.flatMap((p) => [itemNav(p), ...subpastas(p, 1)]),
      h('div', { class: 'exp-nav-separador' }),
      h('div', { class: 'exp-nav-grupo' }, icone('desktop', { tamanho: 16 }), 'Este Computador')
    );
  }

  itensDaPasta() {
    if (this.pasta === INICIO) return [];
    return this.sim.fs.listar(this.pasta).filter((i) => !this.filtro || i.nome.toLowerCase().includes(this.filtro));
  }

  itemSelecionado() {
    return this.selecionado ? this.sim.fs.porId(this.selecionado) : null;
  }

  desenharLista() {
    if (this.pasta === INICIO) return this.desenharInicio();
    const itens = this.itensDaPasta();
    this.lista.className = `exp-lista exp-${this.exibicao}`;
    const naLixeira = this.pasta === LIXEIRA;
    const cabecalho =
      this.exibicao === 'detalhes' &&
      h(
        'div',
        { class: 'exp-linha exp-cabecalho' },
        h('span', { text: 'Nome' }),
        h('span', { text: naLixeira ? 'Local original' : 'Data de modificação' }),
        h('span', { text: 'Tipo' }),
        h('span', { text: 'Tamanho' })
      );
    this.lista.replaceChildren(
      ...[cabecalho].filter(Boolean),
      ...(itens.length ? itens.map((item) => this.criarItem(item)) : [h('p', { class: 'exp-vazio', text: naLixeira ? 'A Lixeira está vazia.' : 'Esta pasta está vazia.' })])
    );
    const sel = this.itemSelecionado();
    this.status.textContent = `${itens.length} ${itens.length === 1 ? 'item' : 'itens'}${sel ? ` | 1 item selecionado` : ''}`;
  }

  /** Início: Acesso rápido (pastas) e arquivos recentes */
  desenharInicio() {
    this.lista.className = 'exp-lista exp-inicio';
    const recentes = this.sim.fs.itens
      .filter((i) => i.pasta !== LIXEIRA && i.tipo !== 'pasta' && i.tipo !== 'imagem')
      .sort((a, b) => b.modificado - a.modificado)
      .slice(0, 8);
    this.lista.replaceChildren(
      h('h3', { class: 'exp-inicio-titulo', text: 'Acesso rápido' }),
      h(
        'div',
        { class: 'exp-acesso' },
        PASTAS_RAIZ.map((p) =>
          h(
            'button',
            { type: 'button', class: 'exp-acesso-item', 'data-alvo': `explorador.acesso.${p}`, onDblclick: () => this.ir(p), onClick: (e) => e.currentTarget.classList.add('selecionado') },
            h('span', { class: 'exp-acesso-icone' }, icone('img:pasta', { tamanho: 40 }), ICONE_COR[p] && icone(ICONE_COR[p], { tamanho: 18, classe: 'exp-acesso-selo' })),
            h('span', {}, h('strong', { text: p }), h('small', { text: 'Este Computador' }))
          )
        )
      ),
      h('h3', { class: 'exp-inicio-titulo', text: 'Recentes' }),
      ...(recentes.length ? recentes.map((item) => this.criarItem(item, { recente: true })) : [h('p', { class: 'exp-vazio', text: 'Os arquivos que você abrir aparecerão aqui.' })])
    );
    this.status.textContent = `${PASTAS_RAIZ.length + recentes.length} itens`;
  }

  criarItem(item, { recente = false } = {}) {
    const rotulo = h('span', { class: 'exp-rotulo', text: item.nome });
    const detalhes = this.exibicao === 'detalhes' || recente;
    const segunda = this.pasta === LIXEIRA ? item.origem || '' : recente ? item.pasta : new Date(item.modificado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const el = h(
      'div',
      {
        class: `exp-item ${detalhes ? 'exp-linha' : 'exp-bloco'}${this.selecionado === item.id ? ' selecionado' : ''}`,
        role: 'option',
        tabindex: -1,
        'data-alvo': `explorador.item.${item.nome}`,
        draggable: this.pasta !== LIXEIRA,
      },
      h('span', { class: 'exp-nome' }, iconeDoArquivo(item, detalhes ? 18 : 48), rotulo),
      detalhes && h('span', { class: 'exp-sec', text: segunda }),
      detalhes && h('span', { class: 'exp-sec', text: TIPOS[item.tipo].descricao }),
      detalhes && h('span', { class: 'exp-sec exp-tamanho', text: tamanhoDoItem(item) })
    );
    el.addEventListener('pointerdown', (e) => {
      if (e.button <= 2) this.selecionar(item.id);
    });
    el.addEventListener('dblclick', () => this.abrirItem(item));
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.selecionar(item.id);
      MenuDeContexto.abrir({
        x: e.clientX,
        y: e.clientY,
        raiz: this.sim.el,
        itens: menuDoItem(this.sim, item, { abrir: () => this.abrirItem(item), renomear: () => this.renomear(item) }),
      });
      this.sim.emitir({ tipo: 'menu', menu: 'contexto-item', nome: item.nome });
    });
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/x-arquivo', String(item.id));
      e.dataTransfer.effectAllowed = 'move';
    });
    if (item.tipo === 'pasta') this.ligarSoltar(el, () => SistemaDeArquivos.caminhoDaPasta(item));
    return el;
  }

  /** Aceita arquivos arrastados (de outra linha, da Área de Trabalho...) */
  ligarSoltar(el, destino) {
    el.addEventListener('dragover', (e) => {
      if (!e.dataTransfer.types.includes('text/x-arquivo') || !destino()) return;
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('soltar');
    });
    el.addEventListener('dragleave', () => el.classList.remove('soltar'));
    el.addEventListener('drop', (e) => {
      const pasta = destino();
      el.classList.remove('soltar');
      if (!pasta) return;
      e.preventDefault();
      e.stopPropagation();
      const item = this.sim.fs.porId(Number(e.dataTransfer.getData('text/x-arquivo')));
      if (item && item.pasta !== pasta && !(item.tipo === 'pasta' && SistemaDeArquivos.caminhoDaPasta(item) === pasta)) moverItem(this.sim, item, pasta);
    });
  }

  selecionar(id) {
    this.selecionado = id;
    for (const el of this.lista.querySelectorAll('.exp-item')) el.classList.toggle('selecionado', el.dataset.alvo === `explorador.item.${this.itemSelecionado()?.nome}`);
    this.desenharComandos();
    const sel = this.itemSelecionado();
    if (this.pasta !== INICIO) this.status.textContent = `${this.itensDaPasta().length} itens${sel ? ' | 1 item selecionado' : ''}`;
  }

  abrirItem(item) {
    if (item.pasta === LIXEIRA) return this.sim.emitir({ tipo: 'abrir-na-lixeira', nome: item.nome });
    if (item.tipo === 'pasta') return this.ir(SistemaDeArquivos.caminhoDaPasta(item));
    this.sim.abrirArquivo(item, { via: 'explorador' });
  }

  renomear(item) {
    this.desenharLista();
    const rotulo = this.lista.querySelector(`[data-alvo="${CSS.escape(`explorador.item.${item.nome}`)}"] .exp-rotulo`);
    if (rotulo) renomearNoLugar(this.sim, item, rotulo, () => this.desenhar());
  }

  menuNovo(botao) {
    const itens = menuDoFundo(this.sim, this.pasta, { aoNovo: (item) => this.renomear(item) }).find((i) => i.rotulo === 'Novo').submenu;
    MenuDeContexto.abrir({ ancora: botao, raiz: this.sim.el, itens: itens.map((i) => (i.alvo === 'contexto.novo.pasta' ? { ...i, alvo: 'explorador.novo.pasta' } : i)) });
    this.sim.emitir({ tipo: 'menu', menu: 'explorador.novo' });
  }

  menuExibir(botao) {
    MenuDeContexto.abrir({
      ancora: botao,
      raiz: this.sim.el,
      itens: [
        { rotulo: 'Ícones grandes', icone: 'grid', marcado: this.exibicao === 'icones', acao: () => ((this.exibicao = 'icones'), this.desenhar()) },
        { rotulo: 'Detalhes', icone: 'list', marcado: this.exibicao === 'detalhes', acao: () => ((this.exibicao = 'detalhes'), this.desenhar()) },
      ],
    });
  }

  menuDoFundo(e) {
    if (this.pasta === INICIO) return;
    this.selecionar(null);
    const exibir = {
      rotulo: 'Exibir',
      icone: 'grid',
      submenu: [
        { rotulo: 'Ícones grandes', marcado: this.exibicao === 'icones', acao: () => ((this.exibicao = 'icones'), this.desenhar()) },
        { rotulo: 'Detalhes', marcado: this.exibicao === 'detalhes', acao: () => ((this.exibicao = 'detalhes'), this.desenhar()) },
      ],
    };
    const itens =
      this.pasta === LIXEIRA
        ? [exibir, { separador: true }, { rotulo: 'Esvaziar Lixeira', icone: 'delete', acao: () => this.esvaziar() }]
        : menuDoFundo(this.sim, this.pasta, { aoNovo: (item) => this.renomear(item), extras: [exibir, { rotulo: 'Atualizar', icone: 'arrow_clockwise', acao: () => this.desenhar() }, { separador: true }] });
    MenuDeContexto.abrir({ x: e.clientX, y: e.clientY, raiz: this.sim.el, itens });
    this.sim.emitir({ tipo: 'menu', menu: 'contexto-pasta' });
  }

  esvaziar() {
    this.sim.fs.esvaziarLixeira();
    this.sim.emitir({ tipo: 'arquivo', acao: 'esvaziar-lixeira', nome: LIXEIRA, pasta: LIXEIRA });
  }

  aoTeclar(e) {
    if (e.target.closest?.('input, textarea')) return false;
    const item = this.itemSelecionado();
    const ctrl = e.ctrlKey || e.metaKey;
    const tecla = e.key.toLowerCase();
    if (e.key === 'F2' && item) this.renomear(item);
    else if (e.key === 'Delete' && item) excluirItem(this.sim, item);
    else if (e.key === 'Enter' && item) this.abrirItem(item);
    else if (e.key === 'Backspace') this.voltar();
    else if (ctrl && e.shiftKey && tecla === 'n' && this.pasta !== INICIO && this.pasta !== LIXEIRA) {
      const nova = this.sim.fs.criarPasta(this.pasta);
      this.sim.emitir({ tipo: 'arquivo', acao: 'criar-pasta', nome: nova.nome, pasta: this.pasta, tipoItem: 'pasta' });
      this.renomear(nova);
    } else if (ctrl && tecla === 'c' && item) guardarArquivo(this.sim, item, 'copiar');
    else if (ctrl && tecla === 'x' && item) guardarArquivo(this.sim, item, 'recortar');
    else if (ctrl && tecla === 'v' && this.pasta !== INICIO) colarArquivo(this.sim, this.pasta);
    else if (['arrowdown', 'arrowup'].includes(tecla)) {
      const itens = this.itensDaPasta();
      if (!itens.length) return false;
      const i = itens.findIndex((x) => x.id === this.selecionado);
      const proximo = itens[Math.max(0, Math.min(itens.length - 1, i + (tecla === 'arrowdown' ? 1 : -1)))];
      this.selecionar(proximo.id);
    } else return false;
    e.preventDefault();
    return true;
  }

  estado() {
    return { pasta: this.pasta };
  }

  destruir() {
    this.desligar();
  }
}
