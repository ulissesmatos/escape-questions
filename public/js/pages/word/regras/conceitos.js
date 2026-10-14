/**
 * O que o aluno aprende. Cada missão apresenta alguns conceitos antes de
 * começar ("Conceito novo"), e todos ficam no Manual do Agente para revisar.
 *
 * Atalhos são os do Word em português: Ctrl+N é Negrito, Ctrl+B é Salvar,
 * Ctrl+S é Sublinhado e Ctrl+T seleciona tudo (no Bloco de Notas e no
 * Windows valem os atalhos em inglês: Ctrl+A, Ctrl+S...).
 *
 * icone: nome de um ícone Fluent (sistema/iconesFluent.js) ou "img:arquivo"
 * (public/images/word/icones/arquivo.svg).
 */
export const CONCEITOS = {
  // ---------- Windows ----------
  'menu-iniciar': {
    titulo: 'Menu Iniciar',
    icone: 'img:logo-windows',
    onde: 'Barra de tarefas, botão com o logotipo do Windows',
    texto: 'É por onde se abrem os programas. Clique no logotipo do Windows e escolha o programa na lista "Fixado".',
    atalho: 'Tecla Windows',
  },
  'documento-em-branco': {
    titulo: 'Documento em branco',
    icone: 'document_add',
    onde: 'Tela inicial do Word ou Arquivo › Novo',
    texto: 'Quando o Word abre, ele mostra a tela inicial. "Documento em branco" cria uma folha nova para você escrever.',
    atalho: 'Ctrl + O (novo)',
  },
  'salvar-como': {
    titulo: 'Salvar como',
    icone: 'save',
    onde: 'Arquivo › Salvar como',
    texto: 'Na primeira vez você escolhe a pasta e o nome do arquivo. Depois disso, é só "Salvar" que o Word guarda no mesmo arquivo.',
    atalho: 'F12',
  },
  salvar: {
    titulo: 'Salvar',
    icone: 'save',
    onde: 'Disquete no alto da janela ou Arquivo › Salvar',
    texto: 'Guarda as mudanças no mesmo arquivo. Enquanto houver mudança sem salvar, o título mostra que o arquivo não está salvo.',
    atalho: 'Ctrl + B',
  },
  explorador: {
    titulo: 'Explorador de Arquivos',
    icone: 'img:pasta',
    onde: 'Ícone de pasta amarela na barra de tarefas',
    texto: 'Mostra as pastas do computador (Documentos, Imagens, Downloads...). Dois cliques abrem um arquivo no programa certo.',
    atalho: 'Windows + E',
  },
  'editar-texto': {
    titulo: 'Corrigir o texto',
    icone: 'text_t',
    onde: 'Na folha do documento',
    texto: 'Clique onde quer mexer: o cursor (|) pisca ali. Backspace apaga a letra antes do cursor; Delete apaga a letra depois.',
    atalho: 'Backspace / Delete',
  },
  'copiar-colar': {
    titulo: 'Copiar e colar',
    icone: 'copy',
    onde: 'Botão direito › Copiar / Colar, ou Página Inicial › Área de Transferência',
    texto: 'Copiar guarda o que está selecionado; colar põe uma cópia onde está o cursor, até em outro programa.',
    atalho: 'Ctrl + C e Ctrl + V',
  },
  'selecionar-tudo': {
    titulo: 'Selecionar tudo',
    icone: 'select_all_on',
    onde: 'Página Inicial › Selecionar › Selecionar Tudo',
    texto: 'Seleciona o texto inteiro de uma vez. No Bloco de Notas é Ctrl + A; no Word em português é Ctrl + T (de Tudo).',
    atalho: 'Ctrl + T (Word) · Ctrl + A (Bloco de Notas)',
  },
  desfazer: {
    titulo: 'Desfazer',
    icone: 'arrow_undo',
    onde: 'Seta para trás no alto da janela',
    texto: 'Volta a última coisa que aconteceu: texto apagado, formatação, colagem... Pode apertar várias vezes.',
    atalho: 'Ctrl + Z (Refazer: Ctrl + R)',
  },
  lixeira: {
    titulo: 'Lixeira',
    icone: 'img:lixeira',
    onde: 'Ícone na Área de Trabalho',
    texto: 'O que você exclui vai para a Lixeira. Dá para restaurar: o arquivo volta para a pasta de onde saiu.',
    atalho: 'Delete (excluir)',
  },
  renomear: {
    titulo: 'Renomear',
    icone: 'rename',
    onde: 'Botão direito no arquivo › Renomear',
    texto: 'Troca o nome do arquivo. Nomes não podem ter \\ / : * ? " < > |',
    atalho: 'F2',
  },
  'nova-pasta': {
    titulo: 'Nova pasta',
    icone: 'folder_add',
    onde: 'Explorador › Novo › Pasta',
    texto: 'Pastas organizam os arquivos, como gavetas. Dá para mover arquivos arrastando ou com Recortar e Colar.',
    atalho: 'Ctrl + Shift + N',
  },
  // ---------- Fonte ----------
  selecionar: {
    titulo: 'Selecionar texto',
    icone: 'cursor_click',
    onde: 'Na folha do documento',
    texto: 'Para formatar, primeiro selecione. Dois cliques selecionam uma palavra; três cliques, o parágrafo; ou arraste o mouse.',
    atalho: 'Shift + setas',
  },
  'negrito-italico-sublinhado': {
    titulo: 'Negrito, Itálico e Sublinhado',
    icone: 'text_bold',
    onde: 'Página Inicial › Fonte (N, I, S)',
    texto: 'Destacam palavras. No Word em português o botão de negrito tem a letra N.',
    atalho: 'Ctrl + N · Ctrl + I · Ctrl + S',
  },
  'fonte-tamanho': {
    titulo: 'Fonte e tamanho',
    icone: 'text_font',
    onde: 'Página Inicial › Fonte',
    texto: 'A fonte é o desenho das letras (Arial, Calibri...). O tamanho é medido em pontos: 11 é o normal, 28 já é grande.',
    atalho: 'Ctrl + Shift + > (aumentar)',
  },
  'cor-realce': {
    titulo: 'Cor da fonte e realce',
    icone: 'text_color',
    onde: 'Página Inicial › Fonte (A colorido e marca-texto)',
    texto: 'A cor da fonte pinta as letras; o realce pinta o fundo, como uma caneta marca-texto. Use a setinha ao lado para escolher a cor.',
    atalho: '',
  },
  pincel: {
    titulo: 'Pincel de Formatação',
    icone: 'paint_brush',
    onde: 'Página Inicial › Área de Transferência',
    texto: 'Copia só a formatação: clique numa palavra formatada, clique no pincel e depois "pinte" a outra palavra.',
    atalho: '',
  },
  maiusculas: {
    titulo: 'Maiúsculas e minúsculas',
    icone: 'text_change_case',
    onde: 'Página Inicial › Fonte (Aa)',
    texto: 'Muda o texto selecionado para MAIÚSCULAS, minúsculas ou só a primeira letra da frase, sem digitar de novo.',
    atalho: 'Shift + F3',
  },
  'limpar-formatacao': {
    titulo: 'Limpar formatação',
    icone: 'text_clear_formatting',
    onde: 'Página Inicial › Fonte (A com borracha)',
    texto: 'Tira cores, tamanhos e fontes diferentes do texto selecionado, voltando ao estilo normal.',
    atalho: '',
  },
  // ---------- Parágrafo ----------
  alinhamento: {
    titulo: 'Alinhamento',
    icone: 'text_align_center',
    onde: 'Página Inicial › Parágrafo',
    texto: 'Esquerda, centro, direita ou justificado (as duas margens retas). Vale para o parágrafo onde está o cursor.',
    atalho: 'Ctrl + Q · Ctrl + E · Ctrl + G · Ctrl + J',
  },
  listas: {
    titulo: 'Marcadores e numeração',
    icone: 'text_bullet_list_ltr',
    onde: 'Página Inicial › Parágrafo',
    texto: 'Transformam linhas em lista. Enter cria o próximo item; Enter numa linha vazia termina a lista.',
    atalho: 'Digite "1. " para começar uma lista numerada',
  },
  'recuo-espacamento': {
    titulo: 'Recuo e espaçamento',
    icone: 'text_line_spacing',
    onde: 'Página Inicial › Parágrafo (setinha no canto) › Parágrafo',
    texto: 'O recuo da primeira linha afasta o começo do parágrafo; o espaçamento entre linhas deixa o texto mais "arejado".',
    atalho: 'Ctrl + 5 (1,5 linha)',
  },
  estilos: {
    titulo: 'Estilos de título',
    icone: 'text_header_1',
    onde: 'Página Inicial › Estilos',
    texto: 'Título 1 e Título 2 marcam os títulos do documento. O Word usa isso no Painel de Navegação e no Sumário.',
    atalho: 'Ctrl + Alt + 1 / 2',
  },
  'painel-navegacao': {
    titulo: 'Painel de Navegação',
    icone: 'panel_left',
    onde: 'Exibir › Painel de Navegação',
    texto: 'Mostra os títulos do documento num painel à esquerda e também procura palavras.',
    atalho: 'Ctrl + L (localizar)',
  },
  // ---------- Inserir ----------
  imagem: {
    titulo: 'Inserir imagem',
    icone: 'image',
    onde: 'Inserir › Imagens › Este Dispositivo',
    texto: 'Coloca uma foto do computador no documento. Clique nela e arraste um canto para mudar o tamanho sem deformar.',
    atalho: '',
  },
  tabela: {
    titulo: 'Tabela',
    icone: 'table',
    onde: 'Inserir › Tabela',
    texto: 'Passe o mouse pelos quadradinhos para escolher colunas × linhas. Tab vai para a próxima célula; Tab na última cria uma linha nova.',
    atalho: 'Tab',
  },
  'quebra-pagina': {
    titulo: 'Quebra de página',
    icone: 'document_page_break',
    onde: 'Inserir › Quebra de Página',
    texto: 'Começa uma página nova a partir do cursor, sem precisar apertar Enter várias vezes.',
    atalho: 'Ctrl + Enter',
  },
  'cabecalho-rodape': {
    titulo: 'Cabeçalho, rodapé e número de página',
    icone: 'document_header',
    onde: 'Inserir › Cabeçalho e Rodapé',
    texto: 'O que está no cabeçalho ou no rodapé se repete em todas as páginas. O número de página conta sozinho.',
    atalho: 'Dois cliques no alto da página',
  },
  sumario: {
    titulo: 'Sumário automático',
    icone: 'document_bullet_list',
    onde: 'Referências › Sumário',
    texto: 'Monta o índice com os títulos (Título 1 e 2) e as páginas. Mudou um título? Clique em Atualizar Sumário.',
    atalho: '',
  },
  // ---------- Revisão e layout ----------
  'localizar-substituir': {
    titulo: 'Localizar e Substituir',
    icone: 'arrow_swap',
    onde: 'Página Inicial › Edição',
    texto: 'Localizar mostra onde uma palavra aparece. Substituir troca por outra; "Substituir tudo" troca todas de uma vez.',
    atalho: 'Ctrl + L · Ctrl + U',
  },
  ortografia: {
    titulo: 'Ortografia',
    icone: 'text_proofing_tools',
    onde: 'Botão direito na palavra sublinhada ou Revisão › Ortografia',
    texto: 'O sublinhado vermelho ondulado marca palavras que o Word não conhece. Clique com o botão direito para ver sugestões.',
    atalho: 'F7',
  },
  'contar-palavras': {
    titulo: 'Contar palavras',
    icone: 'text_word_count',
    onde: 'Barra de status (embaixo) ou Revisão › Contar Palavras',
    texto: 'O Word mostra quantas palavras o documento tem na parte de baixo da janela.',
    atalho: '',
  },
  orientacao: {
    titulo: 'Orientação e margens',
    icone: 'document_landscape',
    onde: 'Layout › Orientação / Margens',
    texto: 'Retrato é a folha em pé; Paisagem, deitada. As margens são o espaço em branco em volta do texto.',
    atalho: '',
  },
  colunas: {
    titulo: 'Colunas',
    icone: 'text_column_two',
    onde: 'Layout › Colunas',
    texto: 'Divide o texto em colunas, como num jornal.',
    atalho: '',
  },
  pdf: {
    titulo: 'Salvar em PDF',
    icone: 'document_pdf',
    onde: 'Arquivo › Exportar › Criar PDF',
    texto: 'O PDF abre igual em qualquer computador e ninguém consegue mudar o texto sem querer. Bom para entregar trabalhos.',
    atalho: '',
  },
};

export function conceito(id) {
  const c = CONCEITOS[id];
  if (!c) throw new Error(`Conceito desconhecido: ${id}`);
  return { id, ...c };
}
