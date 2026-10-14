import { h } from '../../../../core/dom.js';
import { icone, iconeDoArquivo } from '../icones.js';
import { LIXEIRA, PASTAS_RAIZ } from '../../regras/SistemaDeArquivos.js';

const MODELOS = [
  { id: 'embranco', nome: 'Documento em branco' },
  { id: 'bemvindo', nome: 'Bem-vindo ao Word', icone: 'img:lightbulb-24-color' },
  { id: 'carta', nome: 'Carta simples', icone: 'document_text' },
  { id: 'relatorio', nome: 'Relatório escolar', icone: 'document_bullet_list' },
];

function saudacao() {
  const hora = new Date().getHours();
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
}

/**
 * Menu Arquivo do Word (o "Backstage") e a tela inicial que aparece quando
 * o Word abre sem documento: Página Inicial, Novo, Abrir, Informações,
 * Salvar, Salvar como, Imprimir, Exportar e Fechar.
 */
export class Backstage {
  constructor(word) {
    this.word = word;
    this.pagina = 'inicio';
    this.nav = h('nav', { class: 'bs-nav' });
    this.conteudo = h('div', { class: 'bs-conteudo' });
    this.el = h('div', { class: 'word-backstage', hidden: true }, this.nav, this.conteudo);
  }

  get aberto() {
    return !this.el.hidden;
  }

  abrir(pagina = 'inicio') {
    this.pagina = pagina;
    this.el.hidden = false;
    this.desenhar();
    this.word.sim.emitir({ tipo: 'menu', menu: 'arquivo', pagina });
  }

  fechar() {
    if (!this.word.temDocumento) return;
    this.el.hidden = true;
    this.word.documento.focar();
  }

  desenhar() {
    const temDoc = this.word.temDocumento;
    const item = (id, rotulo, ico, { desabilitado = false } = {}) =>
      h(
        'button',
        { type: 'button', class: `bs-nav-item${this.pagina === id ? ' ativo' : ''}`, disabled: desabilitado, 'data-alvo': `word.arquivo.${id}`, onClick: () => this.ir(id) },
        ico && icone(ico, { tamanho: 18 }),
        h('span', { text: rotulo })
      );
    this.nav.replaceChildren(
      temDoc ? h('button', { type: 'button', class: 'bs-voltar', 'aria-label': 'Voltar', 'data-alvo': 'word.arquivo.voltar', onClick: () => this.fechar() }, icone('arrow_left', { tamanho: 20 })) : '',
      item('inicio', 'Página Inicial', 'home'),
      item('novo', 'Novo', 'document_add'),
      item('abrir', 'Abrir', 'folder_open'),
      h('div', { class: 'bs-nav-sep' }),
      item('info', 'Informações', null, { desabilitado: !temDoc }),
      item('salvar', 'Salvar', null, { desabilitado: !temDoc }),
      item('salvarComo', 'Salvar como', null, { desabilitado: !temDoc }),
      item('imprimir', 'Imprimir', null, { desabilitado: !temDoc }),
      item('compartilhar', 'Compartilhar', null, { desabilitado: true }),
      item('exportar', 'Exportar', null, { desabilitado: !temDoc }),
      item('fechar', 'Fechar', null, { desabilitado: !temDoc }),
      h('div', { class: 'bs-nav-fim' }, item('conta', 'Conta'), item('opcoes', 'Opções'))
    );
    const paginas = {
      inicio: () => this.paginaInicio(),
      novo: () => this.paginaNovo(),
      abrir: () => this.paginaAbrir(),
      info: () => this.paginaInfo(),
      salvarComo: () => this.paginaSalvarComo(),
      imprimir: () => this.paginaImprimir(),
      exportar: () => this.paginaExportar(),
      conta: () => this.paginaConta(),
      opcoes: () => [h('h1', { text: 'Opções do Word' }), h('p', { class: 'bs-texto', text: 'As opções não podem ser mudadas no simulador.' })],
    };
    this.conteudo.replaceChildren(...[(paginas[this.pagina] || paginas.inicio)()].flat().filter(Boolean));
  }

  ir(id) {
    if (id === 'salvar') {
      this.word.executar('salvar', { origem: 'arquivo' });
      return;
    }
    if (id === 'fechar') {
      this.word.fecharDocumento();
      return;
    }
    this.pagina = id;
    this.desenhar();
    this.word.sim.emitir({ tipo: 'menu', menu: 'arquivo', pagina: id });
  }

  modelos() {
    return h(
      'div',
      { class: 'bs-modelos' },
      MODELOS.map((m) =>
        h(
          'button',
          {
            type: 'button',
            class: `bs-modelo${m.id === 'embranco' ? ' embranco' : ''}`,
            'data-alvo': m.id === 'embranco' ? 'word.inicio.embranco' : null,
            onClick: () => this.word.novoDocumento({ modelo: m.id }),
          },
          h('span', { class: 'bs-modelo-folha' }, m.icone && icone(m.icone, { tamanho: 36 })),
          h('span', { text: m.nome })
        )
      )
    );
  }

  recentes() {
    const itens = this.word.sim.fs.itens
      .filter((i) => i.tipo === 'docx' && i.pasta !== LIXEIRA)
      .sort((a, b) => b.modificado - a.modificado)
      .slice(0, 8);
    if (!itens.length) return h('p', { class: 'bs-texto', text: 'Você ainda não abriu nenhum documento.' });
    return h(
      'div',
      { class: 'bs-recentes' },
      h('div', { class: 'bs-recente bs-recente-cabecalho' }, h('span', { text: 'Nome' }), h('span', { text: 'Data de modificação' })),
      itens.map((i) =>
        h(
          'button',
          { type: 'button', class: 'bs-recente', 'data-alvo': `word.recente.${i.nome}`, onClick: () => this.word.abrirArquivo(i) },
          h('span', { class: 'bs-recente-nome' }, iconeDoArquivo(i, 28), h('span', {}, h('strong', { text: i.nome }), h('small', { text: `${i.pasta.replace(/\//g, ' » ')}` }))),
          h('span', { text: new Date(i.modificado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) })
        )
      )
    );
  }

  paginaInicio() {
    return [h('h1', { text: saudacao() }), h('h2', { class: 'bs-secao', text: 'Novo' }), this.modelos(), h('h2', { class: 'bs-secao', text: 'Recentes' }), this.recentes()];
  }

  paginaNovo() {
    return [h('h1', { text: 'Novo' }), this.modelos()];
  }

  paginaAbrir() {
    return [
      h('h1', { text: 'Abrir' }),
      h(
        'div',
        { class: 'bs-colunas' },
        h(
          'div',
          { class: 'bs-locais' },
          h('button', { type: 'button', class: 'bs-local ativo' }, icone('clock', { tamanho: 22 }), 'Recentes'),
          h('button', { type: 'button', class: 'bs-local', onClick: () => this.word.abrirPeloDialogo() }, icone('desktop', { tamanho: 22 }), 'Este PC'),
          h('button', { type: 'button', class: 'bs-local', 'data-alvo': 'word.abrir.procurar', onClick: () => this.word.abrirPeloDialogo() }, icone('folder_open', { tamanho: 22 }), 'Procurar')
        ),
        h('div', { class: 'bs-direita' }, this.recentes())
      ),
    ];
  }

  paginaInfo() {
    const d = this.word;
    return [
      h('h1', { text: 'Informações' }),
      h('p', { class: 'bs-doc-nome', text: d.arquivo ? d.arquivo.nome : 'Documento1' }),
      h('p', { class: 'bs-texto', text: d.arquivo ? `${d.arquivo.pasta.replace(/\//g, ' » ')}` : 'Este documento ainda não foi salvo.' }),
      h(
        'table',
        { class: 'bs-propriedades' },
        [
          ['Páginas', d.documento.paginas.total],
          ['Palavras', d.inspetor.contarPalavras()],
          ['Autor', `@${d.sim.conta.arroba}`],
          ['Situação', d.sujo ? 'Há alterações não salvas' : 'Salvo'],
        ].map(([r, v]) => h('tr', {}, h('td', { text: r }), h('td', { text: String(v) })))
      ),
    ];
  }

  paginaSalvarComo() {
    return [
      h('h1', { text: 'Salvar como' }),
      h(
        'div',
        { class: 'bs-colunas' },
        h(
          'div',
          { class: 'bs-locais' },
          h('button', { type: 'button', class: 'bs-local' }, icone('clock', { tamanho: 22 }), 'Recentes'),
          h('button', { type: 'button', class: 'bs-local ativo' }, icone('desktop', { tamanho: 22 }), 'Este PC'),
          h('button', { type: 'button', class: 'bs-local', 'data-alvo': 'word.salvarComo.procurar', onClick: () => this.word.salvarComo() }, icone('folder_open', { tamanho: 22 }), 'Procurar')
        ),
        h(
          'div',
          { class: 'bs-direita' },
          h('p', { class: 'bs-texto', text: 'Escolha uma pasta (ou clique em Procurar):' }),
          h(
            'div',
            { class: 'bs-pastas' },
            PASTAS_RAIZ.map((p) => h('button', { type: 'button', class: 'bs-pasta', 'data-alvo': `word.salvarComo.pasta.${p}`, onClick: () => this.word.salvarComo({ pasta: p }) }, icone('img:pasta', { tamanho: 28 }), h('span', {}, h('strong', { text: p }), h('small', { text: 'Este PC' }))))
          )
        )
      ),
    ];
  }

  paginaImprimir() {
    const previa = h('div', { class: `bs-previa${this.word.documento.config.layout.orientacao === 'paisagem' ? ' paisagem' : ''}` });
    const folha = h('div', { class: 'bs-previa-folha doc-corpo' });
    folha.innerHTML = this.word.documento.serializar();
    folha.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
    previa.append(folha);
    return [
      h('h1', { text: 'Imprimir' }),
      h(
        'div',
        { class: 'bs-colunas' },
        h(
          'div',
          { class: 'bs-imprimir' },
          h('button', { type: 'button', class: 'bs-botao-imprimir', 'data-alvo': 'word.imprimir.ok', onClick: () => this.word.executar('imprimirAgora') }, icone('print', { tamanho: 32 }), 'Imprimir'),
          h('label', { class: 'bs-campo' }, 'Cópias: ', h('input', { type: 'number', value: 1, min: 1, max: 99 })),
          h('p', { class: 'bs-rotulo', text: 'Impressora' }),
          h('div', { class: 'bs-opcao' }, icone('print', { tamanho: 20 }), h('span', {}, h('strong', { text: 'Microsoft Print to PDF' }), h('small', { text: 'Pronta' }))),
          h('p', { class: 'bs-rotulo', text: 'Configurações' }),
          h('div', { class: 'bs-opcao' }, h('span', {}, h('strong', { text: 'Imprimir Todas as Páginas' }), h('small', { text: 'O documento inteiro' }))),
          h('div', { class: 'bs-opcao' }, h('span', {}, h('strong', { text: this.word.documento.config.layout.orientacao === 'paisagem' ? 'Orientação Paisagem' : 'Orientação Retrato' }))),
          h('div', { class: 'bs-opcao' }, h('span', {}, h('strong', { text: 'A4' }), h('small', { text: '21 cm x 29,7 cm' })))
        ),
        h('div', { class: 'bs-direita bs-previa-area' }, previa, h('p', { class: 'bs-texto', text: `1 de ${this.word.documento.paginas.total}` }))
      ),
    ];
  }

  paginaExportar() {
    return [
      h('h1', { text: 'Exportar' }),
      h(
        'div',
        { class: 'bs-colunas' },
        h('div', { class: 'bs-locais' }, h('button', { type: 'button', class: 'bs-local ativo' }, icone('document_pdf', { tamanho: 22 }), 'Criar Documento PDF/XPS')),
        h(
          'div',
          { class: 'bs-direita' },
          h('h2', { class: 'bs-secao', text: 'Criar um Documento PDF/XPS' }),
          h('ul', { class: 'bs-lista' }, h('li', { text: 'Mantém o layout, a formatação, as fontes e as imagens' }), h('li', { text: 'O conteúdo não pode ser alterado facilmente' }), h('li', { text: 'Abre igual em qualquer computador' })),
          h('button', { type: 'button', class: 'bs-botao-grande', 'data-alvo': 'word.exportar.pdf', onClick: () => this.word.exportarPdf() }, icone('document_pdf', { tamanho: 32 }), 'Criar PDF/XPS')
        )
      ),
    ];
  }

  paginaConta() {
    const conta = this.word.sim.conta;
    return [
      h('h1', { text: 'Conta' }),
      h('div', { class: 'bs-conta' }, h('span', { class: 'iniciar-avatar grande', text: (conta.nome || conta.arroba)[0].toUpperCase() }), h('div', {}, h('strong', { text: conta.nome || '' }), h('p', { text: `@${conta.arroba}` }))),
      h('p', { class: 'bs-texto', text: 'Informações do Produto: Microsoft Word (simulador da Operação Word).' }),
    ];
  }
}
