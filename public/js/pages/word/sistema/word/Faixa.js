import { h } from '../../../../core/dom.js';
import { icone } from '../icones.js';
import { dica } from '../Dica.js';
import { MenuDeContexto } from '../MenuDeContexto.js';
import { ESTILOS_DE_PARAGRAFO } from './Documento.js';
import { MARGENS } from './Paginas.js';

export const FONTES = ['Arial', 'Arial Black', 'Calibri', 'Calibri Light', 'Cambria', 'Comic Sans MS', 'Courier New', 'Georgia', 'Impact', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'];
export const TAMANHOS = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

/** Cores padrão do Office (a linha de baixo da paleta) */
export const CORES_PADRAO = [
  { id: 'vermelho-escuro', nome: 'Vermelho Escuro', cor: '#C00000' },
  { id: 'vermelho', nome: 'Vermelho', cor: '#FF0000' },
  { id: 'laranja', nome: 'Laranja', cor: '#FFC000' },
  { id: 'amarelo', nome: 'Amarelo', cor: '#FFFF00' },
  { id: 'verde-claro', nome: 'Verde Claro', cor: '#92D050' },
  { id: 'verde', nome: 'Verde', cor: '#00B050' },
  { id: 'azul-claro', nome: 'Azul Claro', cor: '#00B0F0' },
  { id: 'azul', nome: 'Azul', cor: '#0070C0' },
  { id: 'azul-escuro', nome: 'Azul Escuro', cor: '#002060' },
  { id: 'roxo', nome: 'Roxo', cor: '#7030A0' },
];

// Cores do tema Office (primeira linha) e variações mais claras/escuras
const TEMA = ['#FFFFFF', '#000000', '#E7E6E6', '#44546A', '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'];

export const REALCES = [
  { id: 'amarelo', nome: 'Amarelo', cor: '#FFFF00' },
  { id: 'verde-brilhante', nome: 'Verde Brilhante', cor: '#00FF00' },
  { id: 'turquesa', nome: 'Turquesa', cor: '#00FFFF' },
  { id: 'rosa', nome: 'Rosa', cor: '#FF00FF' },
  { id: 'azul', nome: 'Azul', cor: '#0000FF' },
  { id: 'vermelho', nome: 'Vermelho', cor: '#FF0000' },
  { id: 'azul-escuro', nome: 'Azul Escuro', cor: '#000080' },
  { id: 'azul-petroleo', nome: 'Azul-petróleo', cor: '#008080' },
  { id: 'verde', nome: 'Verde', cor: '#008000' },
  { id: 'violeta', nome: 'Violeta', cor: '#800080' },
  { id: 'vermelho-escuro', nome: 'Vermelho Escuro', cor: '#800000' },
  { id: 'amarelo-escuro', nome: 'Amarelo Escuro', cor: '#808000' },
  { id: 'cinza-50', nome: 'Cinza 50%', cor: '#808080' },
  { id: 'cinza-25', nome: 'Cinza 25%', cor: '#C0C0C0' },
  { id: 'preto', nome: 'Preto', cor: '#000000' },
];

const SIMBOLOS = ['©', '®', '™', '€', '£', '¥', '±', '≠', '≤', '≥', '÷', '×', '∞', 'µ', 'α', 'β', 'Ω', 'π', '°', '✓', '→', '←', '↑', '↓', '☺', '♥', '★', '§'];

function clarear(hex, fator) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(fator > 0 ? v + (255 - v) * fator : v * (1 + fator)));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Faixa de Opções do Word 2019 em português. Lê o estado do Word para
 * acender os botões (negrito ligado, alinhamento atual...) e chama
 * word.executar(id, { args }) para tudo.
 */
export class Faixa {
  constructor(word) {
    this.word = word;
    this.guia = 'inicio';
    this.alternaveis = []; // { el, ativo: (estado) => bool }
    this.el = h('div', { class: 'word-faixa', role: 'toolbar' });
    this.ultimaCor = CORES_PADRAO[1];
    this.ultimoRealce = REALCES[0];
  }

  // ---------------- definição das guias ----------------

  guias(contexto) {
    const guias = [
      { id: 'inicio', rotulo: 'Página Inicial' },
      { id: 'inserir', rotulo: 'Inserir' },
      { id: 'design', rotulo: 'Design' },
      { id: 'layout', rotulo: 'Layout' },
      { id: 'referencias', rotulo: 'Referências' },
      { id: 'revisao', rotulo: 'Revisão' },
      { id: 'exibir', rotulo: 'Exibir' },
    ];
    if (contexto.imagem) guias.push({ id: 'formatoImagem', rotulo: 'Formato da Imagem', contextual: 'imagem' });
    if (contexto.tabela) guias.push({ id: 'layoutTabela', rotulo: 'Layout', contextual: 'tabela' });
    if (contexto.margem) guias.push({ id: 'cabecalhoRodape', rotulo: 'Cabeçalho e Rodapé', contextual: 'margem' });
    return guias;
  }

  grupos(guia) {
    const w = this.word;
    switch (guia) {
      case 'inicio':
        return [
          {
            rotulo: 'Área de Transferência',
            itens: [
              this.grande('colar', 'Colar', 'img:clipboard-32-color', ['Colar', 'Ctrl+V', 'Cole o conteúdo da Área de Transferência.'], { menu: () => this.menuColar() }),
              this.linhas([[this.pequeno('recortar', 'cut', ['Recortar', 'Ctrl+X', 'Remova a seleção e coloque na Área de Transferência.'], { texto: 'Recortar' })], [this.pequeno('copiar', 'copy', ['Copiar', 'Ctrl+C', 'Coloque uma cópia da seleção na Área de Transferência.'], { texto: 'Copiar' })], [this.pequeno('pincel', 'paint_brush', ['Pincel de Formatação', '', 'Copie a formatação de um lugar e aplique em outro. Clique no texto formatado, clique aqui e depois selecione onde aplicar.'], { texto: 'Pincel de Formatação', ativo: () => Boolean(w.pincel) })]]),
            ],
          },
          {
            rotulo: 'Fonte',
            lancador: () => w.executar('fonteDialogo'),
            itens: [
              this.linhas([
                [this.comboFonte(), this.comboTamanho(), this.pequeno('aumentarFonte', 'text_font_size', ['Aumentar Fonte', 'Ctrl+Shift+>', 'Deixe o texto um pouco maior.']), this.pequeno('diminuirFonte', 'text_font', ['Diminuir Fonte', 'Ctrl+Shift+<', 'Deixe o texto um pouco menor.']), this.pequeno('maiusculas', 'text_change_case', ['Maiúsculas e Minúsculas', 'Shift+F3', 'Mude o texto selecionado para MAIÚSCULAS, minúsculas ou outros usos comuns.'], { menu: () => this.menuMaiusculas() }), this.pequeno('limparFormatacao', 'text_clear_formatting', ['Limpar Toda a Formatação', '', 'Remova toda a formatação da seleção, deixando apenas o texto normal.'])],
                [
                  this.pequeno('negrito', 'text_bold', ['Negrito', 'Ctrl+N', 'Aplique negrito ao texto.'], { ativo: (e) => e.estilo?.negrito, classe: 'faixa-letra-n' }),
                  this.pequeno('italico', 'text_italic', ['Itálico', 'Ctrl+I', 'Aplique itálico ao texto.'], { ativo: (e) => e.estilo?.italico }),
                  this.pequeno('sublinhado', 'text_underline', ['Sublinhado', 'Ctrl+S', 'Sublinhe o texto.'], { ativo: (e) => e.estilo?.sublinhado, classe: 'faixa-letra-s' }),
                  this.pequeno('tachado', 'text_strikethrough', ['Tachado', '', 'Risque o texto com uma linha.'], { ativo: (e) => e.estilo?.tachado }),
                  this.pequeno('subscrito', 'text_subscript', ['Subscrito', 'Ctrl+=', 'Digite letras muito pequenas embaixo da linha de texto (H₂O).'], { ativo: (e) => e.estilo?.script === 'sub' }),
                  this.pequeno('sobrescrito', 'text_superscript', ['Sobrescrito', 'Ctrl+Shift++', 'Digite letras muito pequenas acima da linha de texto (x²).'], { ativo: (e) => e.estilo?.script === 'super' }),
                  this.dividido('realce', 'highlight', ['Cor do Realce do Texto', '', 'Destaque o texto como se fosse com uma caneta marca-texto.'], () => this.menuRealce(), () => this.ultimoRealce.cor),
                  this.dividido('cor', 'text_color', ['Cor da Fonte', '', 'Mude a cor do texto.'], () => this.menuCor(), () => this.ultimaCor.cor),
                ],
              ]),
            ],
          },
          {
            rotulo: 'Parágrafo',
            lancador: () => w.executar('paragrafoDialogo'),
            alvoLancador: 'word.faixa.inicio.paragrafoDialogo',
            itens: [
              this.linhas([
                [
                  this.dividido('marcadores', 'text_bullet_list_ltr', ['Marcadores', '', 'Crie uma lista com marcadores.'], () => this.menuMarcadores(), null, { ativo: (e) => e.lista === 'marcadores' }),
                  this.dividido('numeracao', 'text_number_list_ltr', ['Numeração', '', 'Crie uma lista numerada.'], () => this.menuNumeracao(), null, { ativo: (e) => e.lista === 'numerada' }),
                  this.pequeno('diminuirRecuo', 'text_indent_decrease_ltr', ['Diminuir Recuo', '', 'Aproxime o parágrafo da margem.']),
                  this.pequeno('aumentarRecuo', 'text_indent_increase_ltr', ['Aumentar Recuo', '', 'Afaste o parágrafo da margem.']),
                  this.pequeno('mostrarTudo', 'text_paragraph', ['Mostrar Tudo', 'Ctrl+*', 'Mostre as marcas de parágrafo e outros símbolos de formatação ocultos.'], { ativo: () => w.mostrarTudo }),
                ],
                [
                  this.pequeno('alinharEsquerda', 'text_align_left', ['Alinhar à Esquerda', 'Ctrl+Q', 'Alinhe o conteúdo à margem esquerda.'], { ativo: (e) => e.alinhamento === 'left' }),
                  this.pequeno('centralizar', 'text_align_center', ['Centralizar', 'Ctrl+E', 'Centralize o conteúdo na página.'], { ativo: (e) => e.alinhamento === 'center' }),
                  this.pequeno('alinharDireita', 'text_align_right', ['Alinhar à Direita', 'Ctrl+G', 'Alinhe o conteúdo à margem direita.'], { ativo: (e) => e.alinhamento === 'right' }),
                  this.pequeno('justificar', 'text_align_justify', ['Justificar', 'Ctrl+J', 'Distribua o texto entre as margens esquerda e direita.'], { ativo: (e) => e.alinhamento === 'justify' }),
                  this.pequeno('entreLinhas', 'text_line_spacing', ['Espaçamento de Linha e Parágrafo', '', 'Escolha o espaço entre as linhas do texto.'], { menu: () => this.menuEntreLinhas() }),
                ],
              ]),
            ],
          },
          { rotulo: 'Estilos', itens: [this.galeriaEstilos()] },
          {
            rotulo: 'Edição',
            itens: [
              this.linhas([
                [this.pequeno('localizar', 'search', ['Localizar', 'Ctrl+L', 'Encontre texto no documento.'], { texto: 'Localizar' })],
                [this.pequeno('substituir', 'arrow_swap', ['Substituir', 'Ctrl+U', 'Procure um texto e troque por outro.'], { texto: 'Substituir' })],
                [this.pequeno('selecionar', 'select_all_on', ['Selecionar', '', 'Selecione texto ou objetos no documento.'], { texto: 'Selecionar', menu: () => [{ rotulo: 'Selecionar Tudo', atalho: 'Ctrl+T', icone: 'select_all_on', acao: () => w.executar('selecionarTudo') }] })],
              ]),
            ],
          },
        ];
      case 'inserir':
        return [
          { rotulo: 'Páginas', itens: [this.linhas([[this.pequeno('folhaDeRosto', 'document_one_page', ['Folha de Rosto', '', 'Uma primeira página pronta (não disponível no simulador).'], { texto: 'Folha de Rosto' })], [this.pequeno('paginaEmBranco', 'document_add', ['Página em Branco', '', 'Insira uma página nova onde está o cursor.'], { texto: 'Página em Branco' })], [this.pequeno('quebraPagina', 'document_page_break', ['Quebra de Página', 'Ctrl+Enter', 'Termine a página aqui e continue na próxima.'], { texto: 'Quebra de Página' })]])] },
          { rotulo: 'Tabelas', itens: [this.grande('tabela', 'Tabela', 'img:table-32-color', ['Adicionar uma Tabela', '', 'Passe o mouse pelos quadradinhos para escolher o tamanho da tabela.'], { menu: () => this.menuTabela(), soMenu: true })] },
          {
            rotulo: 'Ilustrações',
            itens: [
              this.grande('imagens', 'Imagens', 'img:image-32-color', ['Inserir Imagens', '', 'Insira imagens do computador.'], { menu: () => this.menuImagens(), soMenu: true }),
              this.linhas([[this.pequeno('formas', 'shapes', ['Formas', '', 'Formas prontas (não disponível no simulador).'], { texto: 'Formas' })], [this.pequeno('icones', 'emoji', ['Ícones', '', 'Ícones prontos (não disponível no simulador).'], { texto: 'Ícones' })]]),
            ],
          },
          { rotulo: 'Links', itens: [this.grande('link', 'Link', 'img:link-32-color', ['Adicionar um Link', 'Ctrl+K', 'Crie um link para uma página da web.'])] },
          {
            rotulo: 'Cabeçalho e Rodapé',
            itens: [
              this.linhas([
                [this.pequeno('cabecalho', 'document_header', ['Cabeçalho', '', 'O cabeçalho aparece no alto de todas as páginas.'], { texto: 'Cabeçalho', menu: () => this.menuMargem('cabecalho') })],
                [this.pequeno('rodape', 'document_footer', ['Rodapé', '', 'O rodapé aparece embaixo de todas as páginas.'], { texto: 'Rodapé', menu: () => this.menuMargem('rodape') })],
                [this.pequeno('numeroPagina', 'document_page_number', ['Número de Página', '', 'Numere as páginas do documento.'], { texto: 'Número de Página', menu: () => this.menuNumeroPagina() })],
              ]),
            ],
          },
          {
            rotulo: 'Texto',
            itens: [this.linhas([[this.pequeno('caixaDeTexto', 'textbox', ['Caixa de Texto', '', 'Não disponível no simulador.'], { texto: 'Caixa de Texto' })], [this.pequeno('wordArt', 'text_effects', ['WordArt', '', 'Não disponível no simulador.'], { texto: 'WordArt' })], [this.pequeno('dataHora', 'calendar_ltr', ['Data e Hora', '', 'Insira a data ou a hora de hoje.'], { texto: 'Data e Hora' })]])],
          },
          { rotulo: 'Símbolos', itens: [this.grande('simbolo', 'Símbolo', 'math_symbols', ['Símbolo', '', 'Insira símbolos que não estão no teclado: ©, €, Ω, ✓...'], { menu: () => this.menuSimbolos(), soMenu: true })] },
        ];
      case 'design':
        return [
          { rotulo: 'Formatação do Documento', itens: [this.grande('temas', 'Temas', 'color_fill', ['Temas', '', 'Não disponível no simulador.'])] },
          { rotulo: 'Plano de Fundo da Página', itens: [this.grande('corPagina', 'Cor da Página', 'color_fill', ['Cor da Página', '', 'Escolha uma cor para o fundo das páginas.'], { menu: () => this.menuCorPagina(), soMenu: true })] },
        ];
      case 'layout':
        return [
          {
            rotulo: 'Configurar Página',
            itens: [
              this.grande('margens', 'Margens', 'document_margins', ['Ajustar Margens', '', 'Escolha o espaço em branco em volta do texto.'], { menu: () => this.menuMargens(), soMenu: true }),
              this.grande('orientacao', 'Orientação', 'orientation', ['Orientação da Página', '', 'Deixe a página em pé (Retrato) ou deitada (Paisagem).'], { menu: () => this.menuOrientacao(), soMenu: true }),
              this.grande('tamanhoPagina', 'Tamanho', 'document', ['Tamanho da Página', '', 'Escolha o tamanho do papel.'], { menu: () => this.menuTamanho(), soMenu: true }),
              this.grande('colunas', 'Colunas', 'text_column_two', ['Adicionar ou Remover Colunas', '', 'Divida o texto em duas ou mais colunas.'], { menu: () => this.menuColunas(), soMenu: true }),
              this.linhas([[this.pequeno('quebras', 'document_page_break', ['Quebras', '', 'Adicione quebras de página.'], { texto: 'Quebras', menu: () => [{ rotulo: 'Página', dica: 'Termine a página aqui.', icone: 'document_page_break', acao: () => w.executar('quebraPagina', { origem: 'faixa' }) }] })]]),
            ],
          },
          {
            rotulo: 'Parágrafo',
            lancador: () => w.executar('paragrafoDialogo'),
            itens: [
              this.linhas([
                [h('span', { class: 'faixa-campo-titulo', text: 'Recuar' })],
                [this.campo('recuoEsquerda', 'Esquerda:', (e) => e.paragrafo?.recuoEsquerdoCm ?? 0, 'cm', (v) => w.executar('recuos', { args: { esquerda: v } }))],
                [this.campo('recuoPrimeira', '1ª linha:', (e) => e.paragrafo?.recuoPrimeiraLinhaCm ?? 0, 'cm', (v) => w.executar('recuos', { args: { primeiraLinha: v } }))],
              ]),
              this.linhas([
                [h('span', { class: 'faixa-campo-titulo', text: 'Espaçamento' })],
                [this.campo('espacoAntes', 'Antes:', (e) => e.espacoAntes ?? 0, 'pt', (v) => w.executar('espacamento', { args: { antes: v } }), 6)],
                [this.campo('espacoDepois', 'Depois:', (e) => e.espacoDepois ?? 8, 'pt', (v) => w.executar('espacamento', { args: { depois: v } }), 6)],
              ]),
            ],
          },
        ];
      case 'referencias':
        return [
          {
            rotulo: 'Sumário',
            itens: [
              this.grande('sumario', 'Sumário', 'document_bullet_list', ['Sumário', '', 'Monte um índice com os títulos (Título 1, Título 2) e as páginas.'], { menu: () => this.menuSumario(), soMenu: true }),
              this.linhas([[this.pequeno('adicionarTexto', 'add', ['Adicionar Texto', '', 'Não disponível no simulador.'], { texto: 'Adicionar Texto' })], [this.pequeno('atualizarSumario', 'arrow_clockwise', ['Atualizar Sumário', '', 'Atualize o sumário para mostrar os títulos e páginas como estão agora.'], { texto: 'Atualizar Sumário' })]]),
            ],
          },
          { rotulo: 'Notas de Rodapé', itens: [this.grande('notaRodape', 'Inserir Nota de Rodapé', 'document_footer', ['Nota de Rodapé', '', 'Não disponível no simulador.'])] },
        ];
      case 'revisao':
        return [
          {
            rotulo: 'Revisão de Texto',
            itens: [
              this.grande('ortografia', 'Ortografia e Gramática', 'text_proofing_tools', ['Ortografia e Gramática', 'F7', 'Procure palavras escritas erradas no documento.']),
              this.linhas([[this.pequeno('contarPalavras', 'text_word_count', ['Contar Palavras', '', 'Saiba quantas palavras, caracteres e parágrafos o documento tem.'], { texto: 'Contar Palavras' })]]),
            ],
          },
          { rotulo: 'Comentários', itens: [this.grande('comentario', 'Novo Comentário', 'comment', ['Novo Comentário', '', 'Não disponível no simulador.'])] },
        ];
      case 'exibir':
        return [
          { rotulo: 'Modos de Exibição', itens: [this.grande('modoLeitura', 'Modo de Leitura', 'eye', ['Modo de Leitura', '', 'Não disponível no simulador.']), this.grande('layoutImpressao', 'Layout de Impressão', 'document', ['Layout de Impressão', '', 'Veja o documento como ele vai sair impresso.'], { ativo: () => true })] },
          {
            rotulo: 'Mostrar',
            itens: [
              this.linhas([
                [this.caixa('regua', 'Régua', () => w.regua)],
                [this.caixa('linhasDeGrade', 'Linhas de Grade', () => w.linhasDeGrade)],
                [this.caixa('painelNavegacao', 'Painel de Navegação', () => w.painelAberto)],
              ]),
            ],
          },
          {
            rotulo: 'Zoom',
            itens: [
              this.grande('zoomDialogo', 'Zoom', 'zoom_in', ['Zoom', '', 'Aproxime ou afaste o documento.']),
              this.grande('zoom100', '100%', 'document_one_page', ['100%', '', 'Volte o zoom para 100%.']),
              this.linhas([[this.pequeno('umaPagina', 'document_one_page', ['Uma Página', '', 'Veja uma página inteira.'], { texto: 'Uma Página' })], [this.pequeno('larguraPagina', 'arrow_maximize', ['Largura da Página', '', 'A página ocupa a largura da janela.'], { texto: 'Largura da Página' })]]),
            ],
          },
        ];
      case 'formatoImagem':
        return [
          { rotulo: 'Organizar', itens: [this.grande('quebraTexto', 'Quebrar Texto', 'text_wrap', ['Quebrar Texto', '', 'No simulador as imagens ficam "Alinhadas com o Texto".'])] },
          {
            rotulo: 'Tamanho',
            itens: [
              this.linhas([
                [this.campo('alturaImagem', 'Altura:', (e) => e.imagem?.alturaCm ?? 0, 'cm', (v) => w.executar('tamanhoImagem', { args: { alturaCm: v } }), 0.5)],
                [this.campo('larguraImagem', 'Largura:', (e) => e.imagem?.larguraCm ?? 0, 'cm', (v) => w.executar('tamanhoImagem', { args: { larguraCm: v } }), 0.5)],
              ]),
            ],
          },
        ];
      case 'layoutTabela':
        return [
          { rotulo: 'Linhas e Colunas', itens: [this.grande('excluirTabelaMenu', 'Excluir', 'delete', ['Excluir', '', 'Exclua linhas, colunas ou a tabela.'], { menu: () => this.menuExcluirTabela(), soMenu: true }), this.grande('linhaAcima', 'Inserir Acima', 'table_insert_row', ['Inserir Acima', '', 'Adicione uma linha acima.']), this.linhas([[this.pequeno('linhaAbaixo', 'table_insert_row', ['Inserir Abaixo', '', 'Adicione uma linha abaixo.'], { texto: 'Inserir Abaixo' })], [this.pequeno('colunaEsquerda', 'table_insert_column', ['Inserir à Esquerda', '', 'Adicione uma coluna à esquerda.'], { texto: 'Inserir à Esquerda' })], [this.pequeno('colunaDireita', 'table_insert_column', ['Inserir à Direita', '', 'Adicione uma coluna à direita.'], { texto: 'Inserir à Direita' })]])] },
        ];
      case 'cabecalhoRodape':
        return [
          { rotulo: 'Cabeçalho e Rodapé', itens: [this.linhas([[this.pequeno('cabecalho', 'document_header', ['Cabeçalho', '', ''], { texto: 'Cabeçalho', menu: () => this.menuMargem('cabecalho') })], [this.pequeno('rodape', 'document_footer', ['Rodapé', '', ''], { texto: 'Rodapé', menu: () => this.menuMargem('rodape') })], [this.pequeno('numeroPagina', 'document_page_number', ['Número de Página', '', ''], { texto: 'Número de Página', menu: () => this.menuNumeroPagina() })]])] },
          { rotulo: 'Fechar', itens: [this.grande('fecharCabecalho', 'Fechar Cabeçalho e Rodapé', 'dismiss', ['Fechar Cabeçalho e Rodapé', 'Esc', 'Volte a editar o texto do documento.'])] },
        ];
      default:
        return [];
    }
  }

  // ---------------- controles ----------------

  alvo(id) {
    return `word.faixa.${this.guiaDesenhada}.${id}`;
  }

  registrarAtivo(el, ativo) {
    if (ativo) this.alternaveis.push({ el, ativo });
  }

  grande(id, rotulo, ico, [nome, atalho, texto], { menu, soMenu = false, ativo } = {}) {
    const el = h(
      'button',
      { type: 'button', class: `faixa-grande${menu ? ' com-menu' : ''}`, 'data-alvo': this.alvo(id), ...dica(nome, atalho, texto) },
      h('span', { class: 'faixa-grande-icone' }, icone(ico, { tamanho: 32 })),
      h('span', { class: 'faixa-grande-rotulo' }, rotulo, menu && icone('chevron_down', { tamanho: 10 }))
    );
    el.addEventListener('click', (e) => {
      if (menu && (soMenu || e.target.closest('.faixa-grande-rotulo'))) this.abrirMenu(el, menu, id);
      else this.word.executar(id);
    });
    this.registrarAtivo(el, ativo);
    return el;
  }

  pequeno(id, ico, [nome, atalho, texto], { texto: rotulo, menu, ativo, classe = '' } = {}) {
    const el = h(
      'button',
      { type: 'button', class: `faixa-pequeno ${classe}${rotulo ? ' com-texto' : ''}`, 'data-alvo': this.alvo(id), ...dica(nome, atalho, texto) },
      icone(ico, { tamanho: 16 }),
      rotulo && h('span', { text: rotulo }),
      menu && icone('chevron_down', { tamanho: 10 })
    );
    el.addEventListener('click', () => (menu ? this.abrirMenu(el, menu, id) : this.word.executar(id)));
    this.registrarAtivo(el, ativo);
    return el;
  }

  /** Botão com seta ao lado (Realce, Cor da Fonte, Marcadores, Numeração) */
  dividido(id, ico, [nome, atalho, texto], menu, corAtual, { ativo } = {}) {
    const barra = corAtual ? h('span', { class: 'faixa-barra-cor' }) : null;
    const principal = h(
      'button',
      { type: 'button', class: 'faixa-pequeno faixa-dividido-principal', 'data-alvo': this.alvo(id), ...dica(nome, atalho, texto), onClick: () => this.word.executar(id, { args: corAtual ? { cor: corAtual() } : undefined }) },
      h('span', { class: 'faixa-icone-cor' }, icone(ico, { tamanho: 16 }), barra)
    );
    if (barra) barra.style.background = corAtual();
    const seta = h('button', { type: 'button', class: 'faixa-pequeno faixa-dividido-seta', 'data-alvo': this.alvo(`${id}Seta`), 'aria-label': `${nome}: mais opções` }, icone('chevron_down', { tamanho: 10 }));
    seta.addEventListener('click', () => this.abrirMenu(seta, menu, `${id}Seta`));
    this.registrarAtivo(principal, ativo);
    return h('span', { class: 'faixa-dividido' }, principal, seta);
  }

  linhas(linhas) {
    return h('div', { class: 'faixa-linhas' }, linhas.map((linha) => h('div', { class: 'faixa-linha' }, linha)));
  }

  caixa(id, rotulo, marcado) {
    const entrada = h('input', { type: 'checkbox', checked: Boolean(marcado()) });
    const el = h('label', { class: 'faixa-caixa', 'data-alvo': this.alvo(id), ...dica(rotulo) }, entrada, h('span', { text: rotulo }));
    entrada.addEventListener('change', () => this.word.executar(id, { args: { ligar: entrada.checked } }));
    this.alternaveis.push({ el: entrada, marcado });
    return el;
  }

  /** Campo numérico com setinhas (Recuar, Espaçamento, Altura/Largura da imagem) */
  campo(id, rotulo, valor, unidade, aoMudar, passo = 0.1) {
    const entrada = h('input', { type: 'text', class: 'faixa-campo-valor', 'data-alvo': this.alvo(id), spellcheck: false });
    const formatar = (v) => `${String(Math.round(v * 100) / 100).replace('.', ',')} ${unidade}`;
    const ler = () => parseFloat(entrada.value.replace(',', '.')) || 0;
    const mudar = (v) => aoMudar(Math.max(0, Math.round(v * 100) / 100));
    entrada.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        mudar(ler());
      }
    });
    entrada.addEventListener('change', () => mudar(ler()));
    const setas = h(
      'span',
      { class: 'faixa-campo-setas' },
      h('button', { type: 'button', 'aria-label': 'Aumentar', onClick: () => mudar(ler() + passo) }, icone('chevron_up', { tamanho: 8 })),
      h('button', { type: 'button', 'aria-label': 'Diminuir', onClick: () => mudar(ler() - passo) }, icone('chevron_down', { tamanho: 8 }))
    );
    this.alternaveis.push({ campo: entrada, valor: (e) => formatar(valor(e)) });
    return h('label', { class: 'faixa-campo' }, h('span', { text: rotulo }), entrada, setas);
  }

  comboFonte() {
    const entrada = h('input', { type: 'text', class: 'faixa-combo-texto', spellcheck: false, 'aria-label': 'Fonte' });
    const botao = h('button', { type: 'button', class: 'faixa-combo-seta', 'aria-label': 'Escolher fonte', 'data-alvo': this.alvo('fonte') }, icone('chevron_down', { tamanho: 10 }));
    const el = h('div', { class: 'faixa-combo faixa-combo-fonte', ...dica('Fonte', 'Ctrl+Shift+F', 'Escolha uma fonte nova para o texto.') }, entrada, botao);
    entrada.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        const nome = FONTES.find((f) => f.toLowerCase() === entrada.value.trim().toLowerCase()) || entrada.value.trim();
        if (nome) this.word.executar('fonte', { args: { nome } });
      }
    });
    entrada.addEventListener('focus', () => entrada.select());
    entrada.addEventListener('click', () => botao.click());
    const abrir = () =>
      this.abrirMenu(
        el,
        () => [
          { titulo: true, rotulo: 'Fontes do Tema' },
          { rotulo: 'Calibri Light', dica: 'Títulos', estilo: { fontFamily: '"Calibri Light", Carlito, sans-serif' }, alvo: 'word.menu.fonte.Calibri Light', acao: () => this.word.executar('fonte', { args: { nome: 'Calibri Light' } }) },
          { rotulo: 'Calibri', dica: 'Corpo', estilo: { fontFamily: 'Calibri, Carlito, sans-serif' }, alvo: 'word.menu.fonte.Calibri', acao: () => this.word.executar('fonte', { args: { nome: 'Calibri' } }) },
          { titulo: true, rotulo: 'Todas as Fontes' },
          ...FONTES.map((nome) => ({ rotulo: nome, estilo: { fontFamily: `"${nome}"`, fontSize: '15px' }, alvo: `word.menu.fonte.${nome}`, acao: () => this.word.executar('fonte', { args: { nome } }) })),
        ],
        'fonte',
        { classe: 'menu-fontes' }
      );
    botao.addEventListener('click', abrir);
    this.alternaveis.push({ campo: entrada, valor: (e) => e.estilo?.fonte || '' });
    return el;
  }

  comboTamanho() {
    const entrada = h('input', { type: 'text', class: 'faixa-combo-texto', spellcheck: false, 'aria-label': 'Tamanho da Fonte' });
    const botao = h('button', { type: 'button', class: 'faixa-combo-seta', 'aria-label': 'Escolher tamanho', 'data-alvo': this.alvo('tamanho') }, icone('chevron_down', { tamanho: 10 }));
    const el = h('div', { class: 'faixa-combo faixa-combo-tamanho', ...dica('Tamanho da Fonte', 'Ctrl+Shift+P', 'Mude o tamanho do texto.') }, entrada, botao);
    entrada.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        const pt = parseFloat(entrada.value.replace(',', '.'));
        if (pt >= 1 && pt <= 1638) this.word.executar('tamanho', { args: { pt } });
      }
    });
    entrada.addEventListener('focus', () => entrada.select());
    botao.addEventListener('click', () =>
      this.abrirMenu(el, () => TAMANHOS.map((pt) => ({ rotulo: String(pt).replace('.', ','), alvo: `word.menu.tamanho.${pt}`, acao: () => this.word.executar('tamanho', { args: { pt } }) })), 'tamanho', { classe: 'menu-tamanhos' })
    );
    this.alternaveis.push({ campo: entrada, valor: (e) => (e.estilo?.tamanho ? String(e.estilo.tamanho).replace('.', ',') : '') });
    return el;
  }

  galeriaEstilos() {
    const ids = ['normal', 'sem-espaco', 'titulo1', 'titulo2', 'titulo', 'subtitulo', 'citacao'];
    const lista = h(
      'div',
      { class: 'faixa-galeria-itens' },
      ids.map((id) => {
        const el = h(
          'button',
          { type: 'button', class: `faixa-estilo estilo-${id}`, 'data-alvo': this.alvo(`estilo.${id}`), ...dica(ESTILOS_DE_PARAGRAFO[id].nome, id === 'titulo1' ? 'Ctrl+Alt+1' : id === 'titulo2' ? 'Ctrl+Alt+2' : '', `Aplique o estilo ${ESTILOS_DE_PARAGRAFO[id].nome} ao parágrafo.`) },
          h('span', { class: 'faixa-estilo-amostra', text: 'AaBbCcDd' }),
          h('span', { class: 'faixa-estilo-nome', text: ESTILOS_DE_PARAGRAFO[id].nome })
        );
        el.addEventListener('click', () => this.word.executar(`estilo.${id}`));
        this.registrarAtivo(el, (e) => e.estiloParagrafo === id);
        return el;
      })
    );
    return h('div', { class: 'faixa-galeria' }, lista, h('div', { class: 'faixa-galeria-setas' }, h('button', { type: 'button', 'aria-label': 'Mais estilos', onClick: () => (lista.scrollLeft += 120) }, icone('chevron_down', { tamanho: 10 }))));
  }

  // ---------------- menus ----------------

  abrirMenu(ancora, itens, id, extra = {}) {
    MenuDeContexto.abrir({ ancora, itens: itens(), tema: 'office', raiz: this.word.sim.el, ...extra });
    this.word.sim.emitir({ tipo: 'menu', menu: `word.${id}` });
  }

  menuColar() {
    return [
      { titulo: true, rotulo: 'Opções de Colagem:' },
      { rotulo: 'Manter Formatação Original', icone: 'clipboard_paste', acao: () => this.word.executar('colar') },
      { rotulo: 'Manter Somente Texto', icone: 'text_t', acao: () => this.word.executar('colarSomenteTexto') },
    ];
  }

  menuMaiusculas() {
    const item = (modo, rotulo) => ({ rotulo, alvo: `word.menu.maiusculas.${modo}`, acao: () => this.word.executar('maiusculas', { args: { modo } }) });
    return [item('frase', 'Primeira letra da frase em maiúscula.'), item('minusculas', 'minúscula'), item('maiusculas', 'MAIÚSCULAS'), item('palavras', 'Colocar Cada Palavra em Maiúscula'), item('alternar', 'aLTERNAR mAIÚSC./mINÚSC.')];
  }

  grade(cores, aoEscolher, prefixo, colunas = 10) {
    return h(
      'div',
      { class: 'menu-grade-cores', style: { gridTemplateColumns: `repeat(${colunas}, 1fr)` } },
      cores.map((c) =>
        h('button', {
          type: 'button',
          class: 'menu-cor',
          style: { background: c.cor },
          'data-alvo': c.id ? `word.menu.${prefixo}.${c.id}` : null,
          ...dica(c.nome),
          onClick: () => {
            MenuDeContexto.fechar();
            aoEscolher(c);
          },
        })
      )
    );
  }

  menuRealce() {
    const escolher = (c) => {
      this.ultimoRealce = c;
      this.word.executar('realce', { args: { cor: c.cor } });
      this.redesenhar();
    };
    return [{ conteudo: this.grade(REALCES, escolher, 'realce', 5) }, { separador: true }, { rotulo: 'Nenhuma Cor', alvo: 'word.menu.realce.nenhuma', acao: () => this.word.executar('realce', { args: { cor: null } }) }];
  }

  menuCor() {
    const escolher = (c) => {
      this.ultimaCor = c;
      this.word.executar('cor', { args: { cor: c.cor } });
      this.redesenhar();
    };
    const tema = [];
    for (const fator of [0, 0.8, 0.6, 0.4, -0.25, -0.5]) {
      for (const base of TEMA) tema.push({ cor: fator === 0 ? base : clarear(base, base === '#FFFFFF' ? -Math.abs(fator) / 2 : fator), nome: 'Cor do Tema' });
    }
    return [
      { rotulo: 'Automático', icone: 'text_color', alvo: 'word.menu.cor.automatico', acao: () => this.word.executar('cor', { args: { cor: null } }) },
      { titulo: true, rotulo: 'Cores do Tema' },
      { conteudo: this.grade(tema, escolher, 'cor') },
      { titulo: true, rotulo: 'Cores Padrão' },
      { conteudo: this.grade(CORES_PADRAO, escolher, 'cor') },
    ];
  }

  menuMarcadores() {
    const tipos = [
      { id: 'disco', simbolo: '●' },
      { id: 'circulo', simbolo: '○' },
      { id: 'quadrado', simbolo: '■' },
      { id: 'losango', simbolo: '❖' },
      { id: 'seta', simbolo: '➢' },
      { id: 'check', simbolo: '✓' },
    ];
    return [
      { titulo: true, rotulo: 'Biblioteca de Marcadores' },
      {
        conteudo: h(
          'div',
          { class: 'menu-biblioteca' },
          tipos.map((t) =>
            h('button', { type: 'button', class: 'menu-biblioteca-item', 'data-alvo': `word.menu.marcadores.${t.id}`, text: t.simbolo, onClick: () => (MenuDeContexto.fechar(), this.word.executar('marcadores', { args: { marcador: t.id } })) })
          )
        ),
      },
    ];
  }

  menuNumeracao() {
    const tipos = [
      { id: '1.', amostra: '1.\n2.\n3.' },
      { id: '1)', amostra: '1)\n2)\n3)' },
      { id: 'I.', amostra: 'I.\nII.\nIII.' },
      { id: 'A.', amostra: 'A.\nB.\nC.' },
      { id: 'a)', amostra: 'a)\nb)\nc)' },
    ];
    return [
      { titulo: true, rotulo: 'Biblioteca de Numeração' },
      {
        conteudo: h(
          'div',
          { class: 'menu-biblioteca' },
          tipos.map((t) =>
            h('button', { type: 'button', class: 'menu-biblioteca-item numeracao', 'data-alvo': `word.menu.numeracao.${t.id}`, text: t.amostra, onClick: () => (MenuDeContexto.fechar(), this.word.executar('numeracao', { args: { numeracao: t.id } })) })
          )
        ),
      },
    ];
  }

  menuEntreLinhas() {
    const atual = this.word.estadoFaixa?.paragrafo?.entreLinhas;
    return [
      ...[1, 1.15, 1.5, 2, 2.5, 3].map((v) => {
        const rotulo = v.toFixed(v === 1.15 ? 2 : 1).replace('.', ',');
        return { rotulo, marcado: Math.abs((atual || 0) - v) < 0.01, alvo: `word.menu.entreLinhas.${rotulo}`, acao: () => this.word.executar('entreLinhas', { args: { valor: v } }) };
      }),
      { separador: true },
      { rotulo: 'Opções de Espaçamento de Linha...', acao: () => this.word.executar('paragrafoDialogo') },
    ];
  }

  menuTabela() {
    const colunas = 10;
    const linhas = 8;
    const titulo = h('div', { class: 'menu-tabela-titulo', text: 'Inserir Tabela' });
    const grade = h('div', { class: 'menu-tabela-grade', style: { gridTemplateColumns: `repeat(${colunas}, 1fr)` } });
    const celulas = [];
    for (let l = 1; l <= linhas; l++) {
      for (let c = 1; c <= colunas; c++) {
        const cel = h('button', { type: 'button', class: 'menu-tabela-celula', 'data-alvo': `word.menu.tabela.${c}x${l}`, 'aria-label': `Tabela ${c}x${l}` });
        cel.addEventListener('pointerenter', () => {
          titulo.textContent = `Tabela ${c}x${l}`;
          for (const x of celulas) x.el.classList.toggle('marcada', x.c <= c && x.l <= l);
        });
        cel.addEventListener('click', () => {
          MenuDeContexto.fechar();
          this.word.executar('inserirTabela', { args: { colunas: c, linhas: l } });
        });
        celulas.push({ el: cel, c, l });
        grade.append(cel);
      }
    }
    return [{ conteudo: h('div', { class: 'menu-tabela' }, titulo, grade) }, { separador: true }, { rotulo: 'Inserir Tabela...', icone: 'table_add', acao: () => this.word.executar('inserirTabelaDialogo') }];
  }

  menuImagens() {
    return [
      { titulo: true, rotulo: 'Inserir Imagem De' },
      { rotulo: 'Este Dispositivo...', icone: 'desktop', alvo: 'word.menu.imagens.dispositivo', acao: () => this.word.executar('inserirImagemDialogo') },
      { rotulo: 'Imagens Online...', icone: 'image', acao: () => this.word.executar('imagensOnline') },
    ];
  }

  menuMargem(tipo) {
    const nome = tipo === 'cabecalho' ? 'Cabeçalho' : 'Rodapé';
    return [
      { titulo: true, rotulo: 'Interno' },
      { rotulo: 'Em branco', icone: tipo === 'cabecalho' ? 'document_header' : 'document_footer', alvo: `word.menu.${tipo}.embranco`, acao: () => this.word.executar('editarMargem', { args: { tipo, novo: true } }) },
      { rotulo: 'Em branco (Três Colunas)', icone: tipo === 'cabecalho' ? 'document_header' : 'document_footer', acao: () => this.word.executar('editarMargem', { args: { tipo, novo: true } }) },
      { separador: true },
      { rotulo: `Editar ${nome}`, icone: 'rename', alvo: `word.menu.${tipo}.editar`, acao: () => this.word.executar('editarMargem', { args: { tipo } }) },
      { rotulo: `Remover ${nome}`, icone: 'delete', acao: () => this.word.executar('removerMargem', { args: { tipo } }) },
    ];
  }

  menuNumeroPagina() {
    const opcoes = (posicao) =>
      ['esquerda', 'centro', 'direita'].map((alinhamento, i) => ({
        rotulo: `Número Simples ${i + 1} (${alinhamento})`,
        icone: 'document_page_number',
        alvo: posicao === 'fim' ? `word.menu.numeroPagina.${alinhamento}` : `word.menu.numeroPagina.inicio.${alinhamento}`,
        acao: () => this.word.executar('numeroPagina', { args: { posicao, alinhamento } }),
      }));
    return [
      { rotulo: 'Início da Página', icone: 'document_header', alvo: 'word.menu.numeroPagina.inicio', submenu: opcoes('inicio') },
      { rotulo: 'Fim da Página', icone: 'document_footer', alvo: 'word.menu.numeroPagina.fim', submenu: opcoes('fim') },
      { separador: true },
      { rotulo: 'Remover Números de Página', icone: 'delete', acao: () => this.word.executar('numeroPagina', { args: null }) },
    ];
  }

  menuSimbolos() {
    return [
      {
        conteudo: h(
          'div',
          { class: 'menu-simbolos' },
          SIMBOLOS.map((s) => h('button', { type: 'button', class: 'menu-simbolo', text: s, onClick: () => (MenuDeContexto.fechar(), this.word.executar('simbolo', { args: { simbolo: s } })) }))
        ),
      },
      { separador: true },
      { rotulo: 'Mais Símbolos...', icone: 'math_symbols', desabilitado: true },
    ];
  }

  menuCorPagina() {
    const cores = [{ nome: 'Sem Cor', cor: '#FFFFFF' }, ...['#FFF2CC', '#E2EFDA', '#DDEBF7', '#FCE4D6', '#EDEDED', '#D9E1F2', '#FFE699', '#C6E0B4', '#BDD7EE'].map((cor) => ({ nome: 'Cor da página', cor }))];
    return [{ conteudo: this.grade(cores, (c) => this.word.executar('corPagina', { args: { cor: c.cor === '#FFFFFF' ? null : c.cor } }), 'corPagina', 5) }];
  }

  menuMargens() {
    const atual = this.word.documento?.config.layout.margens;
    return Object.entries(MARGENS).map(([id, m]) => ({
      rotulo: `${m.nome}  —  Sup: ${String(m.topo).replace('.', ',')} cm  Esq: ${String(m.esquerda).replace('.', ',')} cm`,
      icone: 'document_margins',
      marcado: atual === id,
      alvo: `word.menu.margens.${id}`,
      acao: () => this.word.executar('margens', { args: { valor: id } }),
    }));
  }

  menuOrientacao() {
    const atual = this.word.documento?.config.layout.orientacao;
    return [
      { rotulo: 'Retrato', icone: 'document', marcado: atual === 'retrato', alvo: 'word.menu.orientacao.retrato', acao: () => this.word.executar('orientacao', { args: { valor: 'retrato' } }) },
      { rotulo: 'Paisagem', icone: 'document_landscape', marcado: atual === 'paisagem', alvo: 'word.menu.orientacao.paisagem', acao: () => this.word.executar('orientacao', { args: { valor: 'paisagem' } }) },
    ];
  }

  menuTamanho() {
    const atual = this.word.documento?.config.layout.tamanho;
    return [
      ['A4', 'A4 — 21 cm x 29,7 cm'],
      ['Carta', 'Carta — 21,59 cm x 27,94 cm'],
      ['Oficio', 'Ofício — 21,59 cm x 35,56 cm'],
    ].map(([id, rotulo]) => ({ rotulo, icone: 'document', marcado: atual === id, acao: () => this.word.executar('tamanhoPagina', { args: { valor: id } }) }));
  }

  menuColunas() {
    const atual = this.word.documento?.config.layout.colunas;
    return [
      ['1', 'Uma'],
      ['2', 'Duas'],
      ['3', 'Três'],
    ].map(([n, rotulo]) => ({ rotulo, icone: 'text_column_two', marcado: atual === Number(n), alvo: `word.menu.colunas.${n}`, acao: () => this.word.executar('colunas', { args: { valor: Number(n) } }) }));
  }

  menuSumario() {
    return [
      { titulo: true, rotulo: 'Interno' },
      { rotulo: 'Sumário Automático 1', icone: 'document_bullet_list', alvo: 'word.menu.sumario.auto1', acao: () => this.word.executar('inserirSumario') },
      { rotulo: 'Sumário Automático 2', icone: 'document_bullet_list', alvo: 'word.menu.sumario.auto2', acao: () => this.word.executar('inserirSumario') },
      { separador: true },
      { rotulo: 'Remover Sumário', icone: 'delete', acao: () => this.word.executar('removerSumario') },
    ];
  }

  menuExcluirTabela() {
    return [
      { rotulo: 'Excluir Linhas', icone: 'table_delete_row', acao: () => this.word.executar('excluirLinha') },
      { rotulo: 'Excluir Colunas', icone: 'delete', acao: () => this.word.executar('excluirColuna') },
      { rotulo: 'Excluir Tabela', icone: 'delete', acao: () => this.word.executar('excluirTabela') },
    ];
  }

  // ---------------- desenho ----------------

  mostrar(guia) {
    this.guia = guia;
    this.redesenhar();
  }

  redesenhar() {
    this.alternaveis = [];
    this.guiaDesenhada = this.guia;
    const grupos = this.grupos(this.guia);
    this.el.replaceChildren(
      ...grupos.map((g) =>
        h(
          'div',
          { class: 'faixa-grupo' },
          h('div', { class: 'faixa-grupo-itens' }, g.itens),
          h(
            'div',
            { class: 'faixa-grupo-rotulo' },
            h('span', { text: g.rotulo }),
            g.lancador &&
              h('button', { type: 'button', class: 'faixa-lancador', 'data-alvo': g.alvoLancador || this.alvo(`${g.rotulo}Dialogo`), ...dica(`Configurações de ${g.rotulo}`, g.rotulo === 'Fonte' ? 'Ctrl+D' : '', `Abra a janela ${g.rotulo} com mais opções.`), onClick: g.lancador }, icone('arrow_maximize', { tamanho: 10 }))
          )
        )
      )
    );
    this.atualizar(this.word.estadoFaixa || {});
  }

  /** Acende os botões conforme a seleção */
  atualizar(estado) {
    for (const a of this.alternaveis) {
      if (a.campo) {
        if (document.activeElement !== a.campo) a.campo.value = a.valor(estado);
      } else if (a.marcado) a.el.checked = Boolean(a.marcado(estado));
      else a.el.classList.toggle('ativo', Boolean(a.ativo(estado)));
    }
  }
}
