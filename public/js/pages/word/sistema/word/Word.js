import { h } from '../../../../core/dom.js';
import { Janela } from '../Janela.js';
import { icone } from '../icones.js';
import { dica } from '../Dica.js';
import { Dialogo } from '../Dialogo.js';
import { DialogoDeArquivo } from '../DialogoDeArquivo.js';
import { MenuDeContexto } from '../MenuDeContexto.js';
import { Documento, ESTILOS_DE_PARAGRAFO, estiloDoBloco } from './Documento.js';
import { Inspetor } from './Inspetor.js';
import { Faixa, FONTES, TAMANHOS, CORES_PADRAO } from './Faixa.js';
import { Backstage } from './Backstage.js';
import { CM } from './Paginas.js';
import { blocoDe, estiloCalculado } from './Formatacao.js';
import * as dlg from './dialogos.js';
import { comparavel } from '../../regras/objetivos.js';

/** Atalhos do Word em português (Ctrl+N é Negrito, Ctrl+B é Salvar...) */
const ATALHOS = {
  'Ctrl+N': 'negrito',
  'Ctrl+I': 'italico',
  'Ctrl+S': 'sublinhado',
  'Ctrl+B': 'salvar',
  'Ctrl+O': 'novo',
  'Ctrl+A': 'abrir',
  'Ctrl+T': 'selecionarTudo',
  'Ctrl+P': 'imprimir',
  'Ctrl+L': 'localizar',
  'Ctrl+U': 'substituir',
  'Ctrl+E': 'centralizar',
  'Ctrl+G': 'alinharDireita',
  'Ctrl+Q': 'alinharEsquerda',
  'Ctrl+J': 'justificar',
  'Ctrl+Z': 'desfazer',
  'Ctrl+R': 'refazer',
  'Ctrl+Y': 'refazer',
  'Ctrl+Enter': 'quebraPagina',
  'Ctrl+K': 'link',
  'Ctrl+D': 'fonteDialogo',
  'Ctrl+Shift+>': 'aumentarFonte',
  'Ctrl+Shift+<': 'diminuirFonte',
  'Ctrl+=': 'subscrito',
  'Ctrl+Shift++': 'sobrescrito',
  'Shift+F3': 'maiusculasCiclo',
  F7: 'ortografia',
  F12: 'salvarComo',
  'Ctrl+1': 'linhasSimples',
  'Ctrl+2': 'linhasDuplas',
  'Ctrl+5': 'linhasUmaEMeia',
  'Ctrl+Alt+1': 'estilo.titulo1',
  'Ctrl+Alt+2': 'estilo.titulo2',
  'Ctrl+Alt+3': 'estilo.titulo3',
  'Ctrl+Shift+N': 'estilo.normal',
  'Ctrl+W': 'fechar',
  'Ctrl+F4': 'fechar',
  'Ctrl+*': 'mostrarTudo',
  'Ctrl+Shift+*': 'mostrarTudo',
};

const MODELOS_DE_TEXTO = {
  bemvindo: '<p data-estilo="titulo">Bem-vindo ao Word</p><p>Este é um documento de exemplo. Clique em qualquer lugar e comece a digitar.</p><h1>Dicas rápidas</h1><ul><li>Selecione um texto para formatar.</li><li>Use a guia Inserir para colocar imagens e tabelas.</li><li>Salve com Ctrl + B.</li></ul>',
  carta: '<p style="text-align: right">Cidade, __ de ______ de ____.</p><p>Prezado(a) ________,</p><p>Escreva aqui o texto da sua carta.</p><p>Atenciosamente,</p><p>Seu nome</p>',
  relatorio: '<p data-estilo="titulo">Título do Relatório</p><p data-estilo="subtitulo">Nome do aluno · Turma</p><h1>Introdução</h1><p>Escreva aqui.</p><h1>Desenvolvimento</h1><p>Escreva aqui.</p><h1>Conclusão</h1><p>Escreva aqui.</p>',
};

function teclasDoEvento(e) {
  let tecla = e.key;
  if (e.code === 'Period' && e.shiftKey) tecla = '>';
  if (e.code === 'Comma' && e.shiftKey) tecla = '<';
  if (e.code === 'NumpadMultiply') tecla = '*';
  if (/^Digit\d$/.test(e.code) && (e.ctrlKey || e.altKey) && !e.shiftKey) tecla = e.code.slice(5);
  if (/^Key[A-Z]$/.test(e.code) && (e.ctrlKey || e.metaKey || e.altKey)) tecla = e.code.slice(3);
  if (tecla.length === 1) tecla = tecla.toUpperCase();
  return [(e.ctrlKey || e.metaKey) && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', tecla].filter(Boolean).join('+');
}

/**
 * Microsoft Word (visual do Word 2019, tema Colorido) no simulador.
 */
export class Word {
  constructor(sim) {
    this.sim = sim;
    this.arquivo = null;
    this.sujo = false;
    this.temDocumento = false;
    this.zoom = 1;
    this.painelAberto = false;
    this.regua = false;
    this.linhasDeGrade = false;
    this.mostrarTudo = false;
    this.pincel = null;
    this.editandoMargem = null;
    this.estadoFaixa = {};
    this.contadorDocumentos = 0;

    this.janela = new Janela(sim, { app: 'word', titulo: 'Word', icone: 'img:logo-word', largura: 1100, altura: 720, maximizada: true, classe: 'janela-word', minLargura: 560, minAltura: 360 });
    this.janela.aoTeclar = (e) => this.aoTeclar(e);
    this.janela.podeFechar = () => this.perguntarSeSalva();
    this.janela.aoRedimensionar = () => this.documento?.desenharCamadas();
    this.janela.aoReceberFoco = () => this.temDocumento && !this.backstage.aberto && this.documento.focar();
    this.comandos = this.definirComandos();
    this.montar();
    this.backstage.abrir('inicio');
  }

  // ======================= montagem =======================

  montar() {
    const j = this.janela;
    // barra de título azul do Word, com a Barra de Ferramentas de Acesso Rápido
    this.botaoDesfazer = h('button', { type: 'button', class: 'word-qat-botao', 'data-alvo': 'word.qat.desfazer', ...dica('Desfazer', 'Ctrl+Z', 'Desfaça a última ação.'), onClick: () => this.executar('desfazer', { origem: 'qat' }) }, icone('arrow_undo', { tamanho: 16 }));
    this.botaoRefazer = h('button', { type: 'button', class: 'word-qat-botao', ...dica('Refazer', 'Ctrl+R', 'Refaça a ação desfeita.'), onClick: () => this.executar('refazer', { origem: 'qat' }) }, icone('arrow_redo', { tamanho: 16 }));
    this.tituloDoc = h('span', { class: 'word-titulo-doc' });
    this.estadoSalvo = h('span', { class: 'word-titulo-estado' });
    j.barra.className = 'word-titulo';
    j.botoes.className = 'win-botoes win-botoes-escuro';
    j.barra.replaceChildren(
      h(
        'div',
        { class: 'word-qat', 'data-sem-arrastar': '' },
        h('button', { type: 'button', class: 'word-qat-botao', 'data-alvo': 'word.qat.salvar', ...dica('Salvar', 'Ctrl+B', 'Salve o documento.'), onClick: () => this.executar('salvar', { origem: 'qat' }) }, icone('save', { tamanho: 16 })),
        this.botaoDesfazer,
        this.botaoRefazer,
        h('button', { type: 'button', class: 'word-qat-botao word-qat-mais', ...dica('Personalizar Barra de Ferramentas de Acesso Rápido') }, icone('chevron_down', { tamanho: 10 }))
      ),
      h('div', { class: 'word-titulo-centro' }, this.tituloDoc, this.estadoSalvo),
      h('div', { class: 'word-titulo-conta', 'data-sem-arrastar': '' }, h('span', { text: `@${this.sim.conta.arroba}` }), h('span', { class: 'iniciar-avatar pequeno', text: (this.sim.conta.nome || this.sim.conta.arroba)[0].toUpperCase() })),
      h('button', { type: 'button', class: 'word-qat-botao', ...dica('Opções de Exibição da Faixa de Opções') }, icone('panel_left', { tamanho: 16 })),
      j.botoes
    );

    this.faixa = new Faixa(this);
    this.abas = h('div', { class: 'word-abas', role: 'tablist' });
    this.digame = h('input', { type: 'text', class: 'word-digame-campo', placeholder: 'Diga-me o que você deseja fazer', spellcheck: false, 'data-alvo': 'word.digame' });
    this.ligarDigame();

    // área do documento
    this.corpo = h('div', { class: 'doc-corpo', contenteditable: 'true', spellcheck: 'false', 'data-alvo': 'word.folha', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Documento' });
    this.camada = h('div', { class: 'word-camada' });
    this.folhas = h('div', { class: 'word-folhas' }, this.corpo, this.camada);
    this.envelope = h('div', { class: 'word-envelope' }, this.folhas);
    this.reguaEl = h('div', { class: 'word-regua', hidden: true });
    this.rolagem = h('div', { class: 'word-rolagem' }, this.reguaEl, this.envelope);
    this.navegacao = h('aside', { class: 'word-navegacao', hidden: true });
    this.painelDireito = h('aside', { class: 'word-painel-direito', hidden: true });
    this.status = h('div', { class: 'word-status' });
    this.backstage = new Backstage(this);

    this.documento = new Documento({
      corpo: this.corpo,
      folhas: this.folhas,
      camada: this.camada,
      aoMudar: () => this.aoMudar(),
      aoSelecionar: () => this.aoSelecionar(),
      emitir: (ev) => this.sim.emitir(ev),
      aoEditarMargem: (tipo) => this.entrarNaMargem(tipo),
    });
    this.inspetor = new Inspetor(this.documento);

    j.conteudo.append(
      h('div', { class: 'word-barra-abas' }, this.abas, h('div', { class: 'word-digame' }, icone('lightbulb', { tamanho: 16 }), this.digame), h('button', { type: 'button', class: 'word-compartilhar' }, icone('share', { tamanho: 14 }), 'Compartilhar')),
      this.faixa.el,
      h('div', { class: 'word-meio' }, this.navegacao, this.rolagem, this.painelDireito),
      this.status,
      this.backstage.el
    );
    this.desenharAbas();
    this.faixa.redesenhar();
    this.ligarDocumento();
    this.desenharStatus();
  }

  desenharAbas() {
    const contexto = { imagem: Boolean(this.documento?.imagemSelecionada), tabela: Boolean(this.documento?.celulaDoCursor()), margem: Boolean(this.editandoMargem) };
    const guias = this.faixa.guias(contexto);
    if (!guias.some((g) => g.id === this.faixa.guia)) this.faixa.guia = 'inicio';
    const assinatura = guias.map((g) => g.id).join() + this.faixa.guia;
    if (assinatura === this.assinaturaAbas) return;
    this.assinaturaAbas = assinatura;
    this.abas.replaceChildren(
      h('button', { type: 'button', class: 'word-aba word-aba-arquivo', role: 'tab', 'data-alvo': 'word.guia.arquivo', onClick: () => this.backstage.abrir(this.temDocumento ? 'info' : 'inicio') }, 'Arquivo'),
      ...guias.map((g) =>
        h(
          'button',
          {
            type: 'button',
            class: `word-aba${g.id === this.faixa.guia ? ' ativa' : ''}${g.contextual ? ` contextual contextual-${g.contextual}` : ''}`,
            role: 'tab',
            'data-alvo': `word.guia.${g.id}`,
            onClick: () => this.mostrarGuia(g.id),
          },
          g.rotulo
        )
      )
    );
  }

  /** Troca de guia. silencioso: troca automática (não foi o aluno que clicou) */
  mostrarGuia(guia, { silencioso = false } = {}) {
    this.faixa.mostrar(guia);
    this.assinaturaAbas = null;
    this.desenharAbas();
    if (!silencioso) this.sim.emitir({ tipo: 'guia', guia });
  }

  ligarDocumento() {
    this.rolagem.addEventListener(
      'wheel',
      (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        this.definirZoom(this.zoom + (e.deltaY < 0 ? 0.1 : -0.1));
      },
      { passive: false }
    );
    this.rolagem.addEventListener('scroll', () => this.esconderMiniBarra());
    this.rolagem.addEventListener('pointerdown', (e) => {
      // clicar no cinza fora da folha põe o cursor no fim do documento
      if (e.target === this.rolagem || e.target === this.envelope) {
        e.preventDefault();
        if (this.editandoMargem) return this.sairDaMargem();
        const ultimo = this.corpo.lastElementChild;
        if (ultimo) this.documento.colocarCursorNoFim(ultimo.matches('p, h1, h2, h3') ? ultimo : ultimo.querySelector('p, li') || ultimo);
      }
    });
    this.corpo.addEventListener('pointerup', () => setTimeout(() => this.depoisDoMouse(), 0));
    this.corpo.addEventListener('contextmenu', (e) => this.menuDeContexto(e));
    this.corpo.addEventListener('dblclick', () => {
      if (this.pincel) setTimeout(() => this.aplicarPincel(), 0);
    });
    this.corpo.addEventListener('keydown', () => this.esconderMiniBarra());
    this.corpo.addEventListener('focus', () => {
      if (this.editandoMargem) this.sairDaMargem();
    });
  }

  // ======================= documento: abrir, salvar, fechar =======================

  carregar(conteudo, { arquivo = null, nomeNovo = null } = {}) {
    this.temDocumento = true;
    this.arquivo = arquivo;
    this.nomeNovo = nomeNovo;
    this.sujo = false;
    this.documento.soltarImagem();
    this.documento.carregar(conteudo);
    this.backstage.el.hidden = true;
    this.fecharPaineis();
    this.ajustarZoomInicial();
    this.atualizarTitulo();
    this.mostrarGuia('inicio', { silencioso: true });
    this.aoSelecionar();
    this.desenharStatus();
    setTimeout(() => {
      this.documento.colocarCursorNoInicio(this.corpo.querySelector('p, h1, h2, h3, li') || this.corpo);
      this.rolagem.scrollTop = 0;
    }, 30);
  }

  async novoDocumento({ modelo = 'embranco' } = {}) {
    if (this.temDocumento && !(await this.perguntarSeSalva())) return;
    this.contadorDocumentos += 1;
    this.carregar({ html: MODELOS_DE_TEXTO[modelo] || '<p><br></p>' }, { nomeNovo: `Documento${this.contadorDocumentos}` });
    this.sim.emitir({ tipo: 'word', acao: 'novo', modelo });
  }

  async abrirArquivo(item) {
    if (this.temDocumento && this.arquivo && this.arquivo.pasta === item.pasta && this.arquivo.nome === item.nome && this.arquivo.tipo === item.tipo) {
      this.backstage.el.hidden = true;
      this.janela.focar();
      return;
    }
    if (this.temDocumento && !(await this.perguntarSeSalva())) return;
    const conteudo = item.tipo === 'txt' ? { html: (item.conteudo?.texto || '').split('\n').map((l) => `<p>${l.replace(/</g, '&lt;') || '<br>'}</p>`).join('') } : item.conteudo || {};
    this.carregar(conteudo, { arquivo: { pasta: item.pasta, nome: item.nome, tipo: item.tipo } });
    this.sim.emitir({ tipo: 'arquivo', acao: 'abrir', nome: item.nome, pasta: item.pasta, tipoItem: item.tipo, app: 'word' });
  }

  async abrirPeloDialogo() {
    const escolha = await new DialogoDeArquivo(this.sim, {
      modo: 'abrir',
      pasta: 'Documentos',
      tipos: [{ tipo: 'docx', tipos: ['docx', 'txt'], rotulo: 'Todos os Documentos do Word (*.docx; *.txt)' }],
    }).escolher();
    if (escolha) await this.abrirArquivo(escolha.item);
  }

  nomeAtual() {
    return this.arquivo ? this.arquivo.nome : this.nomeNovo || 'Documento1';
  }

  atualizarTitulo() {
    if (!this.temDocumento) {
      this.tituloDoc.textContent = 'Word';
      this.estadoSalvo.textContent = '';
      this.janela.definirTitulo('Word');
      return;
    }
    this.tituloDoc.textContent = `${this.nomeAtual()} - Word`;
    this.estadoSalvo.textContent = this.sujo ? '• Não salvo' : this.arquivo ? '• Salvo' : '';
    this.estadoSalvo.classList.toggle('nao-salvo', this.sujo);
    this.janela.definirTitulo(`${this.nomeAtual()} - Word`);
  }

  /** Salvar: se o documento ainda não tem nome, vai para "Salvar como" (como no Word) */
  async salvar() {
    if (!this.temDocumento) return false;
    if (!this.arquivo || this.arquivo.tipo !== 'docx') {
      this.backstage.abrir('salvarComo');
      return false;
    }
    return this.gravar(this.arquivo.pasta, this.arquivo.nome);
  }

  gravar(pasta, nome) {
    this.sim.fs.salvar(pasta, nome, 'docx', this.documento.conteudo());
    this.arquivo = { pasta, nome, tipo: 'docx' };
    this.sujo = false;
    this.backstage.el.hidden = true;
    this.atualizarTitulo();
    this.sim.emitir({ tipo: 'arquivo', acao: 'salvar', nome, pasta, tipoItem: 'docx', app: 'word' });
    this.mostrarAviso('Documento salvo.');
    return true;
  }

  async salvarComo({ pasta } = {}) {
    const escolha = await new DialogoDeArquivo(this.sim, {
      modo: 'salvar',
      pasta: pasta || this.arquivo?.pasta || 'Documentos',
      nome: this.nomeAtual(),
      tipos: [
        { tipo: 'docx', rotulo: 'Documento do Word (*.docx)' },
        { tipo: 'pdf', rotulo: 'PDF (*.pdf)' },
        { tipo: 'txt', rotulo: 'Texto sem Formatação (*.txt)' },
      ],
    }).escolher();
    if (!escolha) return false;
    if (escolha.tipo === 'pdf') return this.gravarPdf(escolha.pasta, escolha.nome);
    if (escolha.tipo === 'txt') {
      this.sim.fs.salvar(escolha.pasta, escolha.nome, 'txt', { texto: this.inspetor.texto() });
      this.sim.emitir({ tipo: 'arquivo', acao: 'salvar', nome: escolha.nome, pasta: escolha.pasta, tipoItem: 'txt', app: 'word' });
      this.backstage.el.hidden = true;
      return true;
    }
    return this.gravar(escolha.pasta, escolha.nome);
  }

  async exportarPdf() {
    const escolha = await new DialogoDeArquivo(this.sim, {
      modo: 'salvar',
      titulo: 'Publicar como PDF ou XPS',
      pasta: this.arquivo?.pasta || 'Documentos',
      nome: this.nomeAtual(),
      botao: 'Publicar',
      tipos: [{ tipo: 'pdf', rotulo: 'PDF (*.pdf)' }],
    }).escolher();
    if (escolha) this.gravarPdf(escolha.pasta, escolha.nome);
  }

  gravarPdf(pasta, nome) {
    this.sim.fs.salvar(pasta, nome, 'pdf', this.documento.conteudo());
    this.backstage.el.hidden = true;
    this.sim.emitir({ tipo: 'arquivo', acao: 'exportar', nome, pasta, tipoItem: 'pdf', app: 'word' });
    this.mostrarAviso(`PDF criado: ${nome}.pdf`);
    return true;
  }

  /** "Deseja salvar as alterações?" Devolve false se o aluno cancelou */
  async perguntarSeSalva() {
    if (!this.temDocumento || !this.sujo) return true;
    const resposta = await Dialogo.mensagem(this.sim, {
      titulo: 'Microsoft Word',
      texto: `Deseja salvar as alterações em "${this.nomeAtual()}"?`,
      tipo: 'pergunta',
      botoes: ['Salvar', 'Não Salvar', 'Cancelar'],
      nome: 'salvarAlteracoes',
    });
    if (resposta === 'Salvar') {
      if (this.arquivo && this.arquivo.tipo === 'docx') return this.gravar(this.arquivo.pasta, this.arquivo.nome);
      return this.salvarComo();
    }
    return resposta === 'Não Salvar';
  }

  async fecharDocumento() {
    if (!(await this.perguntarSeSalva())) return;
    this.temDocumento = false;
    this.arquivo = null;
    this.sujo = false;
    this.corpo.innerHTML = '';
    this.fecharPaineis();
    this.atualizarTitulo();
    this.backstage.abrir('inicio');
    this.sim.emitir({ tipo: 'word', acao: 'fechar-documento' });
  }

  mostrarAviso(texto) {
    clearTimeout(this.tempoAviso);
    this.avisoStatus = texto;
    this.desenharStatus();
    this.tempoAviso = setTimeout(() => {
      this.avisoStatus = null;
      this.desenharStatus();
    }, 2500);
  }

  // ======================= mudanças e seleção =======================

  aoMudar() {
    if (!this.temDocumento) return;
    if (!this.sujo) {
      this.sujo = true;
      this.atualizarTitulo();
    }
    this.atualizarDesfazer();
    clearTimeout(this.tempoStatus);
    this.tempoStatus = setTimeout(() => {
      this.desenharStatus();
      if (this.painelAberto) this.desenharNavegacao({ manterBusca: true });
    }, 120);
  }

  atualizarDesfazer() {
    const hist = this.documento.historico;
    this.botaoDesfazer.disabled = !hist.podeDesfazer;
    this.botaoDesfazer.dataset.dica = hist.proximo ? `Desfazer ${hist.proximo}` : 'Desfazer';
    this.botaoRefazer.disabled = !hist.podeRefazer;
  }

  aoSelecionar() {
    if (!this.temDocumento) return;
    const d = this.documento;
    const r = d.intervalo();
    const bloco = r && blocoDe(r.startContainer.nodeType === 1 ? r.startContainer.childNodes[r.startOffset] || r.startContainer : r.startContainer, this.corpo);
    const img = d.imagemSelecionada;
    this.estadoFaixa = {
      estilo: d.estiloDaSelecao(),
      paragrafo: bloco ? this.inspetor.descreverBloco(bloco) : null,
      alinhamento: bloco ? this.inspetor.descreverBloco(bloco).alinhamento : 'left',
      lista: bloco?.tagName === 'LI' ? (bloco.parentElement.tagName === 'OL' ? 'numerada' : 'marcadores') : null,
      estiloParagrafo: estiloDoBloco(bloco),
      espacoAntes: bloco ? Math.round((parseFloat(getComputedStyle(bloco).marginTop) || 0) * 0.75) : 0,
      espacoDepois: bloco ? Math.round((parseFloat(getComputedStyle(bloco).marginBottom) || 0) * 0.75) : 8,
      imagem: img ? { larguraCm: img.offsetWidth / CM, alturaCm: img.offsetHeight / CM } : null,
    };
    if (this.estadoFaixa.paragrafo) this.estadoFaixa.paragrafo.espacoAntes = this.estadoFaixa.espacoAntes;
    const abasAntes = this.assinaturaAbas;
    this.desenharAbas();
    if (abasAntes !== this.assinaturaAbas) {
      // imagem selecionada abre a guia Formato da Imagem, como no Word
      if (img && this.faixa.guia !== 'formatoImagem' && !this.imagemAnterior) this.mostrarGuia('formatoImagem', { silencioso: true });
      else this.faixa.redesenhar();
    }
    this.imagemAnterior = img;
    this.faixa.atualizar(this.estadoFaixa);
    this.atualizarDesfazer();
    clearTimeout(this.tempoStatusSel);
    this.tempoStatusSel = setTimeout(() => this.desenharStatus(), 150);
  }

  depoisDoMouse() {
    if (this.pincel) return this.aplicarPincel();
    const r = this.documento.intervalo();
    if (r && !r.collapsed && r.toString().trim()) this.mostrarMiniBarra();
  }

  // ======================= comandos =======================

  /**
   * Executa um comando (da faixa, atalho, menu, mini barra, "Diga-me") e
   * avisa a missão: { tipo: 'comando', comando, origem, selecao, vazio, paragrafo }.
   */
  async executar(id, { origem = 'faixa', args = {} } = {}) {
    let cmd = this.comandos[id];
    if (!cmd && id.startsWith('estilo.')) cmd = { rotulo: ESTILOS_DE_PARAGRAFO[id.slice(7)]?.nome, fazer: () => this.documento.aplicarEstiloDeParagrafo(id.slice(7)) };
    if (!cmd) return;
    if (cmd.precisaDoc !== false && !this.temDocumento) return;
    if (this.editandoMargem && cmd.margem) return this.comandoNaMargem(cmd.margem);
    MenuDeContexto.fechar();
    this.esconderMiniBarra();
    const selecao = this.temDocumento ? this.documento.textoSelecionado() : '';
    const paragrafo = this.temDocumento ? this.documento.textoDoParagrafo() : '';
    const resultado = (await cmd.fazer(args || {}, origem)) || {};
    this.sim.emitir({
      tipo: 'comando',
      comando: id,
      origem,
      selecao: resultado.selecao ?? selecao,
      vazio: resultado.vazio ?? !selecao.trim(),
      paragrafo: resultado.paragrafo ?? paragrafo,
      ...(resultado.extra || {}),
    });
    if (this.temDocumento) {
      this.aoSelecionar();
      if (cmd.focar !== false && !this.backstage.aberto && !this.editandoMargem && !this.sim.camadaDialogos.childElementCount) this.documento.focar();
    }
  }

  /** Formatação dentro do cabeçalho/rodapé (texto simples: usa o editor do navegador) */
  comandoNaMargem(acao) {
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(acao, false, null);
  }

  indisponivel(nome) {
    return Dialogo.mensagem(this.sim, { titulo: 'Microsoft Word', texto: `"${nome}" não faz parte do simulador da Operação Word. Use as outras ferramentas da faixa.`, nome: 'indisponivel' }).then(() => ({ vazio: true }));
  }

  definirComandos() {
    const d = () => this.documento;
    const stub = (rotulo) => ({ rotulo, fazer: () => this.indisponivel(rotulo), focar: false });
    const proximoTamanho = (atual, direcao) => {
      const t = atual || 11;
      if (direcao > 0) return TAMANHOS.find((x) => x > t) || t + 10;
      return [...TAMANHOS].reverse().find((x) => x < t) || Math.max(1, t - 1);
    };
    return {
      // Área de Transferência
      colar: { rotulo: 'Colar', sinonimos: 'colar ctrl v', fazer: () => this.colar() },
      colarSomenteTexto: { rotulo: 'Colar Somente Texto', fazer: () => this.colar({ somenteTexto: true }) },
      recortar: { rotulo: 'Recortar', fazer: () => (d().focar(), document.execCommand('cut'), {}) },
      copiar: { rotulo: 'Copiar', fazer: () => (d().focar(), document.execCommand('copy'), {}) },
      pincel: { rotulo: 'Pincel de Formatação', sinonimos: 'copiar formatação', fazer: () => this.pegarPincel() },
      // Fonte
      negrito: { rotulo: 'Negrito', sinonimos: 'negrito bold destacar forte', margem: 'bold', fazer: () => d().alternar('negrito', 'Negrito') },
      italico: { rotulo: 'Itálico', sinonimos: 'italico inclinado', margem: 'italic', fazer: () => d().alternar('italico', 'Itálico') },
      sublinhado: { rotulo: 'Sublinhado', sinonimos: 'sublinhar linha embaixo', margem: 'underline', fazer: () => d().alternar('sublinhado', 'Sublinhado') },
      tachado: { rotulo: 'Tachado', sinonimos: 'riscado', fazer: () => d().alternar('tachado', 'Tachado') },
      subscrito: { rotulo: 'Subscrito', fazer: () => d().formatar((e) => ({ script: e.script === 'sub' ? null : 'sub' }), 'Subscrito') },
      sobrescrito: { rotulo: 'Sobrescrito', sinonimos: 'expoente', fazer: () => d().formatar((e) => ({ script: e.script === 'super' ? null : 'super' }), 'Sobrescrito') },
      fonte: { rotulo: 'Fonte', sinonimos: 'tipo de letra', fazer: ({ nome }) => nome && d().formatar(() => ({ fonte: nome }), 'Fonte') },
      tamanho: { rotulo: 'Tamanho da Fonte', sinonimos: 'tamanho letra grande pequena', fazer: ({ pt }) => pt && d().formatar(() => ({ tamanho: pt }), 'Tamanho da Fonte') },
      aumentarFonte: { rotulo: 'Aumentar Fonte', sinonimos: 'aumentar letra maior', fazer: () => d().formatar((e) => ({ tamanho: proximoTamanho(e.tamanho, 1) }), 'Aumentar Fonte') },
      diminuirFonte: { rotulo: 'Diminuir Fonte', sinonimos: 'diminuir letra menor', fazer: () => d().formatar((e) => ({ tamanho: proximoTamanho(e.tamanho, -1) }), 'Diminuir Fonte') },
      cor: { rotulo: 'Cor da Fonte', sinonimos: 'cor letra pintar vermelho azul', fazer: ({ cor }) => d().formatar(() => ({ cor: cor || null }), 'Cor da Fonte') },
      realce: { rotulo: 'Cor do Realce do Texto', sinonimos: 'realce marca texto marcador amarelo', fazer: ({ cor }) => d().formatar(() => ({ realce: cor || null }), 'Realce') },
      maiusculas: { rotulo: 'Maiúsculas e Minúsculas', sinonimos: 'maiusculas minusculas caixa alta', fazer: ({ modo = 'frase' }) => d().trocarCaixa(modo) },
      maiusculasCiclo: { rotulo: 'Alternar Maiúsculas e Minúsculas', fazer: () => d().trocarCaixa('ciclo') },
      limparFormatacao: { rotulo: 'Limpar Toda a Formatação', sinonimos: 'limpar formatação borracha', fazer: () => d().limparFormatacao() },
      fonteDialogo: { rotulo: 'Fonte...', focar: false, fazer: () => this.abrirDialogoFonte() },
      // Parágrafo
      alinharEsquerda: { rotulo: 'Alinhar à Esquerda', fazer: () => d().alinhar('left') },
      centralizar: { rotulo: 'Centralizar', sinonimos: 'centro meio', fazer: () => d().alinhar('center') },
      alinharDireita: { rotulo: 'Alinhar à Direita', fazer: () => d().alinhar('right') },
      justificar: { rotulo: 'Justificar', sinonimos: 'justificado margens', fazer: () => d().alinhar('justify') },
      marcadores: { rotulo: 'Marcadores', sinonimos: 'lista bolinha marcadores', fazer: ({ marcador }) => d().lista('marcadores', { marcador }) },
      numeracao: { rotulo: 'Numeração', sinonimos: 'lista numerada números', fazer: ({ numeracao }) => d().lista('numerada', { numeracao }) },
      diminuirRecuo: { rotulo: 'Diminuir Recuo', fazer: () => d().mudarRecuo(-1.25) },
      aumentarRecuo: { rotulo: 'Aumentar Recuo', sinonimos: 'recuo afastar', fazer: () => d().mudarRecuo(1.25) },
      recuos: { rotulo: 'Recuo', fazer: (args) => d().recuos(args) },
      espacamento: { rotulo: 'Espaçamento', fazer: (args) => d().espacamento(args) },
      entreLinhas: { rotulo: 'Espaçamento de Linha', sinonimos: 'espaçamento entre linhas 1,5', fazer: ({ valor }) => d().entreLinhas(valor) },
      linhasSimples: { rotulo: 'Espaçamento Simples', fazer: () => d().entreLinhas(1) },
      linhasDuplas: { rotulo: 'Espaçamento Duplo', fazer: () => d().entreLinhas(2) },
      linhasUmaEMeia: { rotulo: 'Espaçamento 1,5', fazer: () => d().entreLinhas(1.5) },
      paragrafoDialogo: { rotulo: 'Parágrafo...', sinonimos: 'recuo primeira linha espaçamento', focar: false, fazer: () => this.abrirDialogoParagrafo() },
      mostrarTudo: { rotulo: 'Mostrar Tudo', sinonimos: 'marcas de paragrafo', fazer: () => this.alternarMostrarTudo() },
      // Edição
      localizar: { rotulo: 'Localizar', sinonimos: 'procurar buscar pesquisar', focar: false, fazer: () => this.abrirNavegacao({ buscar: true }) },
      substituir: { rotulo: 'Substituir', sinonimos: 'trocar substituir tudo', focar: false, fazer: () => dlg.dialogoSubstituir(this).then(() => ({})) },
      selecionarTudo: { rotulo: 'Selecionar Tudo', sinonimos: 'selecionar tudo', fazer: () => this.selecionarTudo() },
      // Inserir
      folhaDeRosto: stub('Folha de Rosto'),
      paginaEmBranco: { rotulo: 'Página em Branco', fazer: () => d().inserirPaginaEmBranco() },
      quebraPagina: { rotulo: 'Quebra de Página', sinonimos: 'nova pagina quebra', fazer: () => d().inserirQuebraDePagina() },
      inserirTabela: { rotulo: 'Tabela', sinonimos: 'tabela inserir tabela', fazer: ({ colunas, linhas }) => (d().inserirTabela(colunas, linhas), { extra: { colunas, linhas } }) },
      inserirTabelaDialogo: { rotulo: 'Inserir Tabela...', focar: false, fazer: async () => {
        const r = await dlg.dialogoInserirTabela(this);
        if (r) this.executar('inserirTabela', { args: r, origem: 'dialogo' });
      } },
      inserirImagemDialogo: { rotulo: 'Imagens', sinonimos: 'imagem foto figura inserir imagem', focar: false, fazer: () => this.inserirImagemDoComputador() },
      imagensOnline: { rotulo: 'Imagens Online', fazer: () => Dialogo.mensagem(this.sim, { titulo: 'Imagens Online', texto: 'Sem conexão com a Internet. No simulador, use Imagens › Este Dispositivo.', tipo: 'aviso', nome: 'semInternet' }) },
      formas: stub('Formas'),
      icones: stub('Ícones'),
      link: { rotulo: 'Link', sinonimos: 'hiperlink endereço site', focar: false, fazer: async () => {
        const r = await dlg.dialogoLink(this);
        if (r) {
          this.documento.focar();
          return this.documento.inserirLink(r.texto, r.url);
        }
        return { vazio: true };
      } },
      editarMargem: { rotulo: 'Cabeçalho', sinonimos: 'cabeçalho rodapé', focar: false, fazer: ({ tipo }) => this.entrarNaMargem(tipo) },
      removerMargem: { rotulo: 'Remover Cabeçalho', fazer: ({ tipo }) => d().definirConfig({ [tipo]: '' }, `Remover ${tipo}`) },
      numeroPagina: { rotulo: 'Número de Página', sinonimos: 'numero pagina numerar', fazer: (args) => d().definirConfig({ numeroPagina: args && args.posicao ? args : null }, 'Número de Página') },
      caixaDeTexto: stub('Caixa de Texto'),
      wordArt: stub('WordArt'),
      dataHora: { rotulo: 'Data e Hora', sinonimos: 'data hoje hora', focar: false, fazer: async () => {
        const v = await dlg.dialogoDataHora(this);
        if (v) {
          this.documento.focar();
          this.documento.inserirTexto(v, 'Data e Hora');
        }
      } },
      simbolo: { rotulo: 'Símbolo', sinonimos: 'simbolo copyright euro', fazer: ({ simbolo }) => simbolo && d().inserirTexto(simbolo, 'Símbolo') },
      // Design e Layout
      temas: stub('Temas'),
      corPagina: { rotulo: 'Cor da Página', fazer: ({ cor }) => d().definirConfig({ layout: { corPagina: cor } }, 'Cor da Página') },
      margens: { rotulo: 'Margens', sinonimos: 'margem estreita', fazer: ({ valor }) => d().definirConfig({ layout: { margens: valor } }, 'Margens') },
      orientacao: { rotulo: 'Orientação', sinonimos: 'paisagem retrato deitada', fazer: ({ valor }) => (d().definirConfig({ layout: { orientacao: valor } }, 'Orientação'), this.caberFolha(), {}) },
      tamanhoPagina: { rotulo: 'Tamanho', fazer: ({ valor }) => (d().definirConfig({ layout: { tamanho: valor } }, 'Tamanho'), this.caberFolha(), {}) },
      colunas: { rotulo: 'Colunas', sinonimos: 'colunas jornal', fazer: ({ valor }) => d().definirConfig({ layout: { colunas: valor } }, 'Colunas') },
      // Referências
      inserirSumario: { rotulo: 'Sumário', sinonimos: 'sumario indice', fazer: () => (d().inserirSumario(), {}) },
      atualizarSumario: { rotulo: 'Atualizar Sumário', fazer: () => (d().atualizarSumarios() ? {} : Dialogo.mensagem(this.sim, { texto: 'Este documento ainda não tem sumário. Use Referências › Sumário.', nome: 'semSumario' }).then(() => ({ vazio: true }))) },
      removerSumario: { rotulo: 'Remover Sumário', fazer: () => d().removerSumario() },
      adicionarTexto: stub('Adicionar Texto'),
      notaRodape: stub('Nota de Rodapé'),
      // Revisão
      ortografia: { rotulo: 'Ortografia e Gramática', sinonimos: 'ortografia corrigir erros', focar: false, fazer: () => this.abrirOrtografia() },
      contarPalavras: { rotulo: 'Contar Palavras', sinonimos: 'contar palavras quantas', focar: false, fazer: () => dlg.dialogoContarPalavras(this).then(() => ({})) },
      comentario: stub('Novo Comentário'),
      // Exibir
      modoLeitura: stub('Modo de Leitura'),
      layoutImpressao: { rotulo: 'Layout de Impressão', fazer: () => ({}) },
      regua: { rotulo: 'Régua', fazer: ({ ligar }) => this.alternarRegua(ligar) },
      linhasDeGrade: { rotulo: 'Linhas de Grade', fazer: ({ ligar }) => ((this.linhasDeGrade = Boolean(ligar)), this.folhas.classList.toggle('com-grade', this.linhasDeGrade), {}) },
      painelNavegacao: { rotulo: 'Painel de Navegação', sinonimos: 'navegação títulos mapa', focar: false, fazer: ({ ligar = !this.painelAberto }) => (ligar ? this.abrirNavegacao() : this.fecharNavegacao()) },
      zoom100: { rotulo: '100%', fazer: () => this.definirZoom(1) },
      umaPagina: { rotulo: 'Uma Página', fazer: () => this.definirZoom((this.rolagem.clientHeight - 40) / this.documento.paginas.m.altura) },
      larguraPagina: { rotulo: 'Largura da Página', fazer: () => this.definirZoom((this.rolagem.clientWidth - 60) / this.documento.paginas.m.largura) },
      zoomDialogo: { rotulo: 'Zoom', focar: false, fazer: async () => {
        const z = await dlg.dialogoZoom(this);
        if (z) this.definirZoom(z);
      } },
      // Imagem e tabela
      quebraTexto: stub('Quebra de Texto Automática'),
      tamanhoImagem: { rotulo: 'Tamanho da Imagem', fazer: (args) => this.tamanhoDaImagem(args) },
      linhaAcima: { rotulo: 'Inserir Linhas Acima', fazer: () => d().operarTabela('linhaAcima') },
      linhaAbaixo: { rotulo: 'Inserir Linhas Abaixo', sinonimos: 'linha tabela', fazer: () => d().operarTabela('linhaAbaixo') },
      colunaEsquerda: { rotulo: 'Inserir Colunas à Esquerda', fazer: () => d().operarTabela('colunaEsquerda') },
      colunaDireita: { rotulo: 'Inserir Colunas à Direita', fazer: () => d().operarTabela('colunaDireita') },
      excluirLinha: { rotulo: 'Excluir Linhas', fazer: () => d().operarTabela('excluirLinha') },
      excluirColuna: { rotulo: 'Excluir Colunas', fazer: () => d().operarTabela('excluirColuna') },
      excluirTabela: { rotulo: 'Excluir Tabela', fazer: () => d().operarTabela('excluirTabela') },
      fecharCabecalho: { rotulo: 'Fechar Cabeçalho e Rodapé', fazer: () => this.sairDaMargem() },
      // Arquivo
      salvar: { rotulo: 'Salvar', sinonimos: 'salvar gravar', focar: false, fazer: () => this.salvar().then(() => ({})) },
      salvarComo: { rotulo: 'Salvar como', focar: false, fazer: () => this.salvarComo().then(() => ({})) },
      novo: { rotulo: 'Novo Documento', precisaDoc: false, focar: false, fazer: () => this.novoDocumento() },
      abrir: { rotulo: 'Abrir', precisaDoc: false, focar: false, fazer: () => this.backstage.abrir('abrir') },
      imprimir: { rotulo: 'Imprimir', sinonimos: 'imprimir impressora', focar: false, fazer: () => this.backstage.abrir('imprimir') },
      imprimirAgora: { rotulo: 'Imprimir', focar: false, fazer: () => Dialogo.mensagem(this.sim, { titulo: 'Imprimir', texto: 'Documento enviado para a impressora "Microsoft Print to PDF". (No simulador nada sai no papel!)', nome: 'impresso' }).then(() => ({})) },
      exportarPdf: { rotulo: 'Exportar para PDF', sinonimos: 'pdf exportar', focar: false, fazer: () => this.exportarPdf() },
      fechar: { rotulo: 'Fechar Documento', focar: false, fazer: () => this.fecharDocumento() },
      desfazer: { rotulo: 'Desfazer', fazer: () => (d().desfazer(), {}) },
      refazer: { rotulo: 'Refazer', fazer: () => (d().refazer(), {}) },
    };
  }

  // ======================= comandos com janelas e painéis =======================

  async colar({ somenteTexto = false } = {}) {
    const guardado = this.sim.areaDeTransferencia;
    this.documento.focar();
    if (guardado) {
      this.documento.colarConteudo({ html: guardado.html, texto: guardado.texto, somenteTexto });
      return {};
    }
    try {
      const texto = await navigator.clipboard.readText();
      if (texto) this.documento.colarConteudo({ texto, somenteTexto: true });
    } catch {
      await Dialogo.mensagem(this.sim, { texto: 'A Área de Transferência está vazia. Primeiro copie alguma coisa (Ctrl + C).', nome: 'transferenciaVazia' });
    }
    return {};
  }

  selecionarTudo() {
    const r = document.createRange();
    r.selectNodeContents(this.corpo);
    this.documento.selecionarIntervalo(r);
    return { selecao: r.toString() };
  }

  async abrirDialogoParagrafo() {
    const v = await dlg.dialogoParagrafo(this);
    if (!v) return { vazio: true };
    this.documento.focar();
    return this.documento.paragrafo('Parágrafo', (b) => {
      b.style.textAlign = v.alinhamento === 'left' ? '' : v.alinhamento;
      b.style.marginLeft = v.esquerda ? `${v.esquerda}cm` : '';
      b.style.textIndent = v.primeiraLinha ? `${v.primeiraLinha}cm` : '';
      b.style.marginTop = v.antes ? `${v.antes}pt` : '';
      b.style.marginBottom = `${v.depois}pt`;
      b.dataset.entreLinhas = String(v.entreLinhas);
      b.style.lineHeight = String(Math.round(v.entreLinhas * 1.22 * 100) / 100);
    });
  }

  async abrirDialogoFonte() {
    const v = await dlg.dialogoFonte(this);
    if (!v) return { vazio: true };
    this.documento.focar();
    return this.documento.formatar(() => v, 'Fonte');
  }

  async inserirImagemDoComputador() {
    const escolha = await new DialogoDeArquivo(this.sim, {
      modo: 'abrir',
      titulo: 'Inserir Imagem',
      pasta: 'Imagens',
      botao: 'Inserir',
      nomeEvento: 'inserirImagem',
      tipos: [{ tipo: 'imagem', rotulo: 'Todas as Imagens (*.png;*.jpg;*.gif)' }],
    }).escolher();
    if (!escolha) return { vazio: true };
    this.documento.focar();
    const c = escolha.item.conteudo;
    this.documento.inserirImagem({ src: c.src, nome: escolha.item.nome, larguraPx: c.larguraPx, alturaPx: c.alturaPx });
    this.sim.emitir({ tipo: 'comando', comando: 'inserirImagem', origem: 'dialogo', nome: escolha.item.nome });
    return {};
  }

  tamanhoDaImagem({ larguraCm, alturaCm }) {
    const img = this.documento.imagemSelecionada;
    if (!img) return { vazio: true };
    const proporcao = img.offsetHeight / img.offsetWidth || Number(img.dataset.proporcao) || 0.66;
    const larguraPx = larguraCm ? larguraCm * CM : (alturaCm * CM) / proporcao;
    this.documento.redimensionarImagem(img, larguraPx);
    this.documento.selecionarImagem(img);
    return { extra: { larguraCm: img.offsetWidth / CM } };
  }

  pegarPincel() {
    const r = this.documento.intervalo();
    if (!r) return { vazio: true };
    let no = r.startContainer;
    if (no.nodeType === 1) no = no.childNodes[r.startOffset] || no;
    const e = estiloCalculado(no.nodeType === 3 ? no : no.firstChild || no, this.corpo);
    this.pincel = {
      negrito: e.negrito,
      italico: e.italico,
      sublinhado: e.sublinhado,
      tachado: e.tachado,
      fonte: e.fonte,
      tamanho: e.tamanho,
      cor: e.cor ? `rgb(${e.cor.join(',')})` : null,
      realce: e.realce ? `rgb(${e.realce.join(',')})` : null,
    };
    this.corpo.classList.add('cursor-pincel');
    this.faixa.atualizar(this.estadoFaixa);
    return {};
  }

  aplicarPincel() {
    const r = this.documento.intervalo();
    if (!this.pincel || !r || r.collapsed) return;
    const estilo = this.pincel;
    this.pincel = null;
    this.corpo.classList.remove('cursor-pincel');
    const resultado = this.documento.formatar(() => estilo, 'Pincel de Formatação');
    this.sim.emitir({ tipo: 'comando', comando: 'pincelAplicado', origem: 'pincel', selecao: resultado.selecao || '', vazio: false });
    this.aoSelecionar();
  }

  alternarMostrarTudo() {
    this.mostrarTudo = !this.mostrarTudo;
    this.corpo.classList.toggle('mostrar-tudo', this.mostrarTudo);
    this.documento.paginar();
    return {};
  }

  alternarRegua(ligar = !this.regua) {
    this.regua = Boolean(ligar);
    this.reguaEl.hidden = !this.regua;
    this.desenharRegua();
    return {};
  }

  desenharRegua() {
    if (!this.regua || !this.documento.paginas.m) return;
    const m = this.documento.paginas.m;
    const cmPx = CM * this.zoom;
    const marcas = [];
    for (let i = 0; i <= Math.floor(m.largura / CM); i++) marcas.push(h('span', { class: 'regua-marca', style: { left: `${i * cmPx}px` }, text: i && i % 1 === 0 ? String(Math.abs(i - Math.round(m.esquerda / CM))) : '' }));
    const recuo = this.estadoFaixa.paragrafo?.recuoPrimeiraLinhaCm || 0;
    this.reguaEl.replaceChildren(
      h(
        'div',
        { class: 'regua-folha', style: { width: `${m.largura * this.zoom}px` } },
        h('span', { class: 'regua-margem', style: { left: 0, width: `${m.esquerda * this.zoom}px` } }),
        h('span', { class: 'regua-margem', style: { right: 0, width: `${m.direita * this.zoom}px` } }),
        ...marcas,
        h('span', { class: 'regua-recuo', title: 'Recuo da Primeira Linha', style: { left: `${(m.esquerda + recuo * CM) * this.zoom}px` } })
      )
    );
  }

  // ---------------- Painel de Navegação ----------------

  abrirNavegacao({ buscar = false } = {}) {
    this.painelAberto = true;
    this.navegacao.hidden = false;
    this.desenharNavegacao();
    if (buscar) setTimeout(() => this.campoBusca?.focus(), 30);
    this.documento.desenharCamadas();
    return {};
  }

  fecharNavegacao() {
    this.painelAberto = false;
    this.navegacao.hidden = true;
    this.documento.destacarBusca([]);
    return {};
  }

  desenharNavegacao({ manterBusca = false } = {}) {
    const termo = manterBusca && this.campoBusca ? this.campoBusca.value : this.campoBusca?.value || '';
    this.campoBusca = h('input', { type: 'text', class: 'nav-busca-campo', placeholder: 'Pesquisar no documento', spellcheck: false, value: termo, 'data-alvo': 'word.navegacao.busca' });
    this.resultadoBusca = h('p', { class: 'nav-resultado' });
    const lista = h('div', { class: 'nav-lista' });
    const buscar = () => {
      const t = this.campoBusca.value;
      const achados = this.documento.localizar(t);
      this.documento.destacarBusca(achados);
      this.resultadoBusca.textContent = t ? (achados.length ? `${achados.length} ${achados.length === 1 ? 'resultado' : 'resultados'}` : 'Nenhum resultado encontrado') : '';
      this.desenharTitulosNaNavegacao(lista, t ? achados : null);
      this.sim.emitir({ tipo: 'busca', termo: t, resultados: achados.length });
    };
    this.campoBusca.addEventListener('input', buscar);
    this.campoBusca.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        this.documento.localizarProxima(this.campoBusca.value);
      }
      if (e.key === 'Escape') this.fecharNavegacao();
    });
    this.navegacao.replaceChildren(
      h('div', { class: 'nav-topo' }, h('strong', { text: 'Navegação' }), h('button', { type: 'button', class: 'nav-fechar', 'aria-label': 'Fechar', onClick: () => this.executar('painelNavegacao', { args: { ligar: false } }) }, icone('dismiss', { tamanho: 14 }))),
      h('div', { class: 'nav-busca' }, this.campoBusca, icone('search', { tamanho: 14 })),
      this.resultadoBusca,
      h('div', { class: 'nav-abas' }, h('span', { class: 'ativa', text: 'Títulos' }), h('span', { text: 'Páginas' }), h('span', { text: 'Resultados' })),
      lista
    );
    if (termo) buscar();
    else this.desenharTitulosNaNavegacao(lista, null);
  }

  desenharTitulosNaNavegacao(lista, achados) {
    if (achados) {
      lista.replaceChildren(
        ...achados.slice(0, 30).map((r) => {
          const bloco = blocoDe(r.startContainer, this.corpo);
          const texto = bloco ? bloco.textContent : r.toString();
          return h('button', { type: 'button', class: 'nav-achado', text: texto.length > 90 ? `${texto.slice(0, 90)}...` : texto, onClick: () => this.documento.selecionarIntervalo(r) });
        })
      );
      return;
    }
    const titulos = this.documento.titulos();
    lista.replaceChildren(
      ...(titulos.length
        ? titulos.map((t) => h('button', { type: 'button', class: `nav-titulo nivel-${t.nivel}`, text: t.texto, onClick: () => (t.el.scrollIntoView({ block: 'start', behavior: 'smooth' }), this.documento.colocarCursorNoInicio(t.el)) }))
        : [h('p', { class: 'nav-vazio', text: 'Crie um mapa interativo do documento. Para começar, aplique os estilos de Título (Título 1, Título 2) aos títulos do documento.' })])
    );
  }

  // ---------------- Ortografia ----------------

  abrirOrtografia() {
    const erros = this.documento.erros();
    if (!erros.length) {
      this.painelDireito.hidden = true;
      return Dialogo.mensagem(this.sim, { titulo: 'Microsoft Word', texto: 'A verificação ortográfica e gramatical está concluída. Não encontramos erros.', nome: 'ortografiaOk' }).then(() => ({}));
    }
    const erro = erros[0];
    this.documento.selecionarIntervalo(erro.intervalo());
    erro.intervalo().startContainer.parentElement?.scrollIntoView({ block: 'center' });
    const lista = h('select', { class: 'orto-sugestoes', size: Math.max(2, erro.sugestoes.length), 'data-alvo': 'word.ortografia.sugestoes' }, erro.sugestoes.map((s, i) => h('option', { value: s, text: s, selected: i === 0 })));
    const proximo = () => setTimeout(() => this.abrirOrtografia(), 50);
    const botao = (rotulo, acao, alvo) => h('button', { type: 'button', class: 'orto-botao', text: rotulo, 'data-alvo': alvo, onClick: () => (acao(), proximo()) });
    this.painelDireito.hidden = false;
    this.painelDireito.replaceChildren(
      h('div', { class: 'nav-topo' }, h('strong', { text: 'Ortografia' }), h('button', { type: 'button', class: 'nav-fechar', 'aria-label': 'Fechar', onClick: () => (this.painelDireito.hidden = true) }, icone('dismiss', { tamanho: 14 }))),
      h('p', { class: 'orto-palavra', text: erro.palavra }),
      h('p', { class: 'orto-explica', text: 'Não está no dicionário.' }),
      h('div', { class: 'orto-acoes' }, botao('Ignorar uma vez', () => this.documento.ignorar(erro.palavra)), botao('Ignorar Tudo', () => this.documento.ignorar(erro.palavra)), botao('Adicionar', () => this.documento.ignorar(erro.palavra))),
      lista,
      h(
        'div',
        { class: 'orto-acoes' },
        botao('Alterar', () => this.corrigirErro(erro, lista.value), 'word.ortografia.alterar'),
        botao('Alterar Todas', () => {
          for (const e of this.documento.erros().filter((x) => x.palavra.toLowerCase() === erro.palavra.toLowerCase()).reverse()) this.corrigirErro(e, lista.value);
        })
      )
    );
    return { extra: { palavra: erro.palavra } };
  }

  corrigirErro(erro, sugestao) {
    this.documento.corrigir(erro, sugestao);
    this.sim.emitir({ tipo: 'comando', comando: 'corrigir', origem: 'ortografia', palavra: erro.palavra, sugestao });
  }

  // ---------------- Cabeçalho e rodapé ----------------

  entrarNaMargem(tipo) {
    if (!this.temDocumento) return {};
    if (this.editandoMargem) this.sairDaMargem({ silencioso: true });
    this.documento.historico.registrar(this.documento.foto(), { descricao: tipo === 'cabecalho' ? 'Cabeçalho' : 'Rodapé' });
    this.editandoMargem = tipo;
    this.corpo.contentEditable = 'false';
    this.folhas.classList.add('editando-margem');
    const alvo = this.documento.paginas.ligarEdicaoDaMargem(tipo, (html) => {
      this.documento.config[tipo] = html;
      this.documento.paginas.espelhar(tipo, html);
      this.aoMudar();
      this.sim.emitir({ tipo: 'digitar', app: 'word', onde: tipo });
    });
    this.mostrarGuia('cabecalhoRodape', { silencioso: true });
    if (alvo) {
      alvo.focus();
      const r = document.createRange();
      r.selectNodeContents(alvo);
      r.collapse(false);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(r);
      alvo.scrollIntoView({ block: 'nearest' });
    }
    return {};
  }

  sairDaMargem({ silencioso = false } = {}) {
    if (!this.editandoMargem) return {};
    this.editandoMargem = null;
    this.corpo.contentEditable = 'true';
    this.folhas.classList.remove('editando-margem');
    this.documento.paginas.desligarEdicaoDaMargem();
    this.assinaturaAbas = null;
    if (!silencioso) {
      this.mostrarGuia('inicio', { silencioso: true });
      this.documento.focar();
    }
    return {};
  }

  fecharPaineis() {
    this.painelDireito.hidden = true;
    if (this.editandoMargem) this.sairDaMargem({ silencioso: true });
    if (this.pincel) {
      this.pincel = null;
      this.corpo.classList.remove('cursor-pincel');
    }
  }

  // ======================= zoom e barra de status =======================

  definirZoom(valor) {
    this.zoom = Math.round(Math.max(0.1, Math.min(5, valor)) * 100) / 100;
    this.folhas.style.transform = `scale(${this.zoom})`;
    const m = this.documento.paginas.m;
    if (m) {
      this.envelope.style.width = `${m.largura * this.zoom}px`;
      this.envelope.style.height = `${(this.folhas.offsetHeight || m.altura) * this.zoom}px`;
    }
    this.documento.definirEscala(this.zoom);
    this.desenharStatus();
    this.desenharRegua();
    this.sim.emitir({ tipo: 'zoom', valor: this.zoom });
    return {};
  }

  /** Se a folha ficou maior que a janela (ex.: Paisagem), diminui o zoom para caber */
  caberFolha() {
    const m = this.documento.paginas.m;
    const disponivel = this.rolagem.clientWidth - 48;
    if (disponivel > 0 && m.largura * this.zoom > disponivel) this.definirZoom(Math.max(0.4, Math.floor((disponivel / m.largura) * 20) / 20));
    else this.definirZoom(this.zoom);
  }

  ajustarZoomInicial() {
    const m = this.documento.paginas.m;
    const disponivel = this.rolagem.clientWidth - 48;
    if (disponivel <= 0) {
      requestAnimationFrame(() => this.rolagem.clientWidth > 0 && this.ajustarZoomInicial());
      return;
    }
    const ideal = disponivel > 0 && m.largura > disponivel ? Math.max(0.5, Math.floor((disponivel / m.largura) * 20) / 20) : 1;
    this.definirZoom(ideal);
  }

  /** Página do cursor */
  paginaAtual() {
    const r = this.documento.intervalo();
    return r ? this.documento.paginas.paginaDe(r.startContainer) : 1;
  }

  desenharStatus() {
    if (!this.temDocumento) {
      this.status.replaceChildren();
      return;
    }
    const d = this.documento;
    if (d.paginas.m) {
      this.envelope.style.height = `${this.folhas.offsetHeight * this.zoom}px`;
      this.envelope.style.width = `${d.paginas.m.largura * this.zoom}px`;
    }
    const palavras = this.inspetor.contarPalavras();
    const temErros = d.erros().length > 0;
    const slider = h('input', { type: 'range', min: 10, max: 300, value: Math.round(this.zoom * 100), class: 'status-zoom', 'aria-label': 'Zoom' });
    slider.addEventListener('input', () => this.definirZoom(Number(slider.value) / 100));
    this.status.replaceChildren(
      h('span', { class: 'status-item', 'data-alvo': 'word.status.paginas', text: `Página ${Math.min(this.paginaAtual(), d.paginas.total)} de ${d.paginas.total}` }),
      h('button', { type: 'button', class: 'status-item', 'data-alvo': 'word.status.palavras', ...dica('Contar Palavras', '', 'Clique para ver quantas palavras, caracteres e parágrafos o documento tem.'), onClick: () => this.executar('contarPalavras', { origem: 'status' }) }, `${palavras.toLocaleString('pt-BR')} ${palavras === 1 ? 'palavra' : 'palavras'}`),
      h('button', { type: 'button', class: `status-item status-orto${temErros ? ' com-erros' : ''}`, ...dica(temErros ? 'Erros de revisão de texto encontrados. Clique para corrigir.' : 'Nenhum erro'), onClick: () => this.executar('ortografia', { origem: 'status' }) }, icone('text_proofing_tools', { tamanho: 14 })),
      h('span', { class: 'status-item', text: 'Português (Brasil)' }),
      this.avisoStatus ? h('span', { class: 'status-item status-aviso', text: this.avisoStatus }) : '',
      h('span', { class: 'status-espaco' }),
      h('span', { class: 'status-modos' }, icone('eye', { tamanho: 14 }), h('span', { class: 'ativo' }, icone('document', { tamanho: 14 })), icone('desktop', { tamanho: 14 })),
      h('button', { type: 'button', class: 'status-mais', 'aria-label': 'Reduzir', onClick: () => this.definirZoom(this.zoom - 0.1) }, '−'),
      slider,
      h('button', { type: 'button', class: 'status-mais', 'aria-label': 'Ampliar', onClick: () => this.definirZoom(this.zoom + 0.1) }, '+'),
      h('button', { type: 'button', class: 'status-item status-zoom-valor', text: `${Math.round(this.zoom * 100)}%`, onClick: () => this.executar('zoomDialogo', { origem: 'status' }) })
    );
  }

  // ======================= mini barra e botão direito =======================

  criarMiniBarra({ fixa = false } = {}) {
    // no Word em português, Negrito é "N" e Sublinhado é "S"
    const letra = { negrito: ' faixa-letra-n', sublinhado: ' faixa-letra-s' };
    const botao = (id, ico, nome, args) =>
      h('button', { type: 'button', class: `mini-botao${letra[id] || ''}${this.estadoFaixa.estilo?.[id] ? ' ativo' : ''}`, ...dica(nome), onMousedown: (e) => e.preventDefault(), onClick: () => this.executar(id, { origem: 'minibarra', args }) }, icone(ico, { tamanho: 16 }));
    const fonte = h('select', { class: 'mini-fonte', 'aria-label': 'Fonte' }, FONTES.map((f) => h('option', { value: f, text: f, selected: f === this.estadoFaixa.estilo?.fonte })));
    const tamanho = h('select', { class: 'mini-tamanho', 'aria-label': 'Tamanho' }, TAMANHOS.map((t) => h('option', { value: t, text: String(t).replace('.', ','), selected: t === this.estadoFaixa.estilo?.tamanho })));
    if (!FONTES.includes(this.estadoFaixa.estilo?.fonte)) fonte.prepend(h('option', { text: this.estadoFaixa.estilo?.fonte || '', selected: true }));
    fonte.addEventListener('change', () => this.executar('fonte', { origem: 'minibarra', args: { nome: fonte.value } }));
    tamanho.addEventListener('change', () => this.executar('tamanho', { origem: 'minibarra', args: { pt: Number(tamanho.value) } }));
    const el = h(
      'div',
      { class: `word-minibarra${fixa ? ' fixa' : ''}`, 'data-menu': '' },
      h('div', { class: 'mini-linha' }, fonte, tamanho, botao('aumentarFonte', 'text_font_size', 'Aumentar Fonte'), botao('diminuirFonte', 'text_font', 'Diminuir Fonte'), botao('pincel', 'paint_brush', 'Pincel de Formatação')),
      h(
        'div',
        { class: 'mini-linha' },
        botao('negrito', 'text_bold', 'Negrito (Ctrl+N)'),
        botao('italico', 'text_italic', 'Itálico (Ctrl+I)'),
        botao('sublinhado', 'text_underline', 'Sublinhado (Ctrl+S)'),
        botao('realce', 'highlight', 'Cor do Realce', { cor: this.faixa.ultimoRealce.cor }),
        botao('cor', 'text_color', 'Cor da Fonte', { cor: this.faixa.ultimaCor.cor }),
        botao('marcadores', 'text_bullet_list_ltr', 'Marcadores'),
        botao('numeracao', 'text_number_list_ltr', 'Numeração')
      )
    );
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    return el;
  }

  mostrarMiniBarra() {
    this.esconderMiniBarra();
    const r = this.documento.intervalo();
    if (!r) return;
    const ret = r.getBoundingClientRect();
    const barra = this.criarMiniBarra();
    this.sim.el.append(barra);
    const caixa = barra.getBoundingClientRect();
    Object.assign(barra.style, { left: `${Math.max(8, Math.min(window.innerWidth - caixa.width - 8, ret.left))}px`, top: `${Math.max(8, ret.top - caixa.height - 10)}px` });
    this.miniBarra = barra;
    this.fecharMiniNoMouse = (e) => {
      if (!barra.isConnected) return;
      const c = barra.getBoundingClientRect();
      const longe = e.clientX < c.left - 120 || e.clientX > c.right + 120 || e.clientY < c.top - 90 || e.clientY > c.bottom + 120;
      barra.classList.toggle('apagada', longe);
    };
    document.addEventListener('pointermove', this.fecharMiniNoMouse);
    this.fecharMiniNoClique = (e) => {
      if (!barra.contains(e.target)) this.esconderMiniBarra();
    };
    setTimeout(() => document.addEventListener('pointerdown', this.fecharMiniNoClique, true), 0);
  }

  esconderMiniBarra() {
    if (!this.miniBarra) return;
    this.miniBarra.remove();
    this.miniBarra = null;
    document.removeEventListener('pointermove', this.fecharMiniNoMouse);
    document.removeEventListener('pointerdown', this.fecharMiniNoClique, true);
  }

  menuDeContexto(e) {
    e.preventDefault();
    this.esconderMiniBarra();
    const d = this.documento;
    let r = d.intervalo();
    const img = e.target.closest?.('img');
    // botão direito fora da seleção move o cursor para lá (como no Word)
    if (!img && (!r || r.collapsed || !Array.from(r.getClientRects()).some((c) => e.clientX >= c.left && e.clientX <= c.right && e.clientY >= c.top && e.clientY <= c.bottom))) {
      const p = document.caretRangeFromPoint?.(e.clientX, e.clientY);
      if (p && this.corpo.contains(p.startContainer)) {
        d.selecionarIntervalo(p);
        r = p;
      }
    }
    const erro = d.erroNoPonto(e.clientX, e.clientY);
    const temSelecao = r && !r.collapsed;
    const naTabela = Boolean(d.celulaDoCursor());
    const itens = [];
    if (erro) {
      itens.push(
        ...erro.sugestoes.map((s, i) => ({ rotulo: s, negrito: true, alvo: `contexto.sugestao.${i}`, acao: () => this.corrigirErro(erro, s) })),
        { rotulo: 'Ignorar Tudo', acao: () => (d.ignorar(erro.palavra), this.desenharStatus()) },
        { rotulo: 'Adicionar ao Dicionário', acao: () => (d.ignorar(erro.palavra), this.desenharStatus()) },
        { separador: true }
      );
    }
    itens.push(
      { rotulo: 'Recortar', icone: 'cut', atalho: 'Ctrl+X', desabilitado: !temSelecao, alvo: 'contexto.recortar', acao: () => this.executar('recortar', { origem: 'contexto' }) },
      { rotulo: 'Copiar', icone: 'copy', atalho: 'Ctrl+C', desabilitado: !temSelecao, alvo: 'contexto.copiar', acao: () => this.executar('copiar', { origem: 'contexto' }) },
      { rotulo: 'Opções de Colagem:', titulo: true },
      { rotulo: 'Colar (Manter Formatação Original)', icone: 'clipboard_paste', alvo: 'contexto.colar', desabilitado: !this.sim.areaDeTransferencia, acao: () => this.executar('colar', { origem: 'contexto' }) },
      { rotulo: 'Colar (Manter Somente Texto)', icone: 'text_t', desabilitado: !this.sim.areaDeTransferencia, acao: () => this.executar('colarSomenteTexto', { origem: 'contexto' }) },
      { separador: true }
    );
    if (img) {
      itens.push({ rotulo: 'Tamanho e Posição...', icone: 'resize_image', acao: () => this.mostrarGuia('formatoImagem') }, { rotulo: 'Quebra de Texto Automática', icone: 'text_wrap', submenu: [{ rotulo: 'Alinhado com o Texto', marcado: true, acao: () => {} }] }, { separador: true });
    }
    if (naTabela) {
      itens.push(
        {
          rotulo: 'Inserir',
          icone: 'table_add',
          alvo: 'contexto.inserir',
          submenu: [
            { rotulo: 'Inserir Colunas à Esquerda', icone: 'table_insert_column', acao: () => this.executar('colunaEsquerda', { origem: 'contexto' }) },
            { rotulo: 'Inserir Colunas à Direita', icone: 'table_insert_column', acao: () => this.executar('colunaDireita', { origem: 'contexto' }) },
            { rotulo: 'Inserir Linhas Acima', icone: 'table_insert_row', acao: () => this.executar('linhaAcima', { origem: 'contexto' }) },
            { rotulo: 'Inserir Linhas Abaixo', icone: 'table_insert_row', alvo: 'contexto.inserirLinhaAbaixo', acao: () => this.executar('linhaAbaixo', { origem: 'contexto' }) },
          ],
        },
        {
          rotulo: 'Excluir Células',
          icone: 'table_delete_row',
          submenu: [
            { rotulo: 'Excluir Linha Inteira', acao: () => this.executar('excluirLinha', { origem: 'contexto' }) },
            { rotulo: 'Excluir Coluna Inteira', acao: () => this.executar('excluirColuna', { origem: 'contexto' }) },
          ],
        },
        { rotulo: 'Excluir Tabela', icone: 'delete', acao: () => this.executar('excluirTabela', { origem: 'contexto' }) },
        { separador: true }
      );
    }
    itens.push(
      { rotulo: 'Fonte...', icone: 'text_font', atalho: 'Ctrl+D', acao: () => this.executar('fonteDialogo', { origem: 'contexto' }) },
      { rotulo: 'Parágrafo...', icone: 'text_paragraph', alvo: 'contexto.paragrafo', acao: () => this.executar('paragrafoDialogo', { origem: 'contexto' }) },
      { separador: true },
      { rotulo: 'Link', icone: 'link', atalho: 'Ctrl+K', acao: () => this.executar('link', { origem: 'contexto' }) },
      { rotulo: 'Novo Comentário', icone: 'comment', desabilitado: true }
    );
    MenuDeContexto.abrir({ x: e.clientX, y: e.clientY, itens, tema: 'office', topo: this.criarMiniBarra({ fixa: true }), raiz: this.sim.el, largura: 250 });
    this.sim.emitir({ tipo: 'menu', menu: 'contexto-word', erro: Boolean(erro) });
  }

  // ======================= "Diga-me o que você deseja fazer" =======================

  ligarDigame() {
    this.digame.addEventListener('input', () => this.mostrarSugestoesDigame());
    this.digame.addEventListener('focus', () => this.digame.value && this.mostrarSugestoesDigame());
    this.digame.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        this.digame.value = '';
        MenuDeContexto.fechar();
        this.documento.focar();
      }
      if (e.key === 'Enter') document.querySelector('.menu-digame .menu-item')?.click();
    });
  }

  mostrarSugestoesDigame() {
    const termo = comparavel(this.digame.value);
    if (termo.length < 2) return MenuDeContexto.fechar();
    const achados = Object.entries(this.comandos)
      .filter(([id, c]) => c.rotulo && !['recuos', 'espacamento', 'tamanhoImagem', 'imprimirAgora', 'editarMargem'].includes(id))
      .map(([id, c]) => ({ id, c, texto: comparavel(`${c.rotulo} ${c.sinonimos || ''}`) }))
      .filter((x) => termo.split(' ').every((p) => x.texto.includes(p)))
      .slice(0, 7);
    const itens = achados.length
      ? achados.map(({ id, c }) => ({
          rotulo: c.rotulo,
          alvo: `word.digame.${id}`,
          acao: () => {
            this.digame.value = '';
            this.executar(id, { origem: 'digame', args: id === 'cor' ? { cor: CORES_PADRAO[1].cor } : id === 'realce' ? { cor: '#FFFF00' } : {} });
          },
        }))
      : [{ rotulo: `Nenhum comando para "${this.digame.value}"`, desabilitado: true }];
    MenuDeContexto.abrir({ ancora: this.digame, itens: [{ titulo: true, rotulo: 'Ações' }, ...itens], tema: 'office', raiz: this.sim.el, classe: 'menu-digame', largura: 280 });
    this.digame.focus();
    this.sim.emitir({ tipo: 'digame', termo: this.digame.value, achados: achados.length });
  }

  // ======================= teclado =======================

  aoTeclar(e) {
    if (e.target.closest?.('.word-faixa input, .word-digame, .nav-busca, .menu-ctx')) return false;
    const teclas = teclasDoEvento(e);
    if (e.key === 'Escape') {
      if (this.backstage.aberto && this.temDocumento) return (this.backstage.fechar(), e.preventDefault(), true);
      if (this.editandoMargem) return (this.sairDaMargem(), e.preventDefault(), true);
      if (this.pincel) return (this.pincel = null), this.corpo.classList.remove('cursor-pincel'), true;
      return false;
    }
    if (this.editandoMargem && /^Ctrl\+[NIS]$/.test(teclas)) {
      e.preventDefault();
      this.comandoNaMargem({ 'Ctrl+N': 'bold', 'Ctrl+I': 'italic', 'Ctrl+S': 'underline' }[teclas]);
      return true;
    }
    const id = ATALHOS[teclas];
    if (!id) return false;
    if (!this.temDocumento && !['novo', 'abrir'].includes(id)) return false;
    e.preventDefault();
    const selecao = this.temDocumento ? this.documento.textoSelecionado() : '';
    this.sim.emitir({ tipo: 'atalho', teclas, comando: id, selecao, app: 'word' });
    this.executar(id, { origem: 'atalho' });
    return true;
  }

  // ======================= leitura para a missão =======================

  estado() {
    const texto = (html) => {
      const div = document.createElement('div');
      div.innerHTML = html || '';
      return div.textContent;
    };
    const cfg = this.documento.config;
    return {
      tela: this.temDocumento ? 'documento' : 'inicio',
      arquivo: this.arquivo,
      sujo: this.sujo,
      doc: this.inspetor,
      layout: { ...cfg.layout },
      cabecalho: texto(cfg.cabecalho),
      rodape: texto(cfg.rodape),
      numeroPagina: cfg.numeroPagina,
      painelNavegacao: this.painelAberto,
      selecao: this.temDocumento ? this.documento.textoSelecionado() : '',
      backstage: this.backstage.aberto ? this.backstage.pagina : null,
      guia: this.faixa.guia,
    };
  }

  /** HTML do documento para a área do professor (entrega da missão) */
  documentoParaEntrega() {
    if (!this.temDocumento) return null;
    return JSON.stringify(this.documento.conteudo());
  }

  destruir() {
    this.documento.destruir();
    this.esconderMiniBarra();
  }
}
