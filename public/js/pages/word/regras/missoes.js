/**
 * As missões da Operação Word, em 5 capítulos que vão do básico (abrir o
 * Word, salvar) ao intermediário (estilos, sumário, quebra de página, PDF).
 *
 * Cada missão define:
 * - arquivos: como o computador simulado começa (pastas, documentos, Lixeira);
 * - abrir: documento que já começa aberto no Word (para focar no conceito
 *   novo, sem repetir "abra o arquivo" toda vez);
 * - objetivos(contexto): lista de objetivos (regras/objetivos.js); o
 *   contexto tem o @ do aluno;
 * - roteiro: acontecimentos da história (ex.: o vírus que apaga um parágrafo);
 * - tutorial: o Mostre-me fica ligado do começo ao fim (primeira missão).
 *
 * O id guarda o progresso no servidor: não mude o id de uma missão publicada.
 */
import * as o from './objetivos.js';

const img = (arquivo) => `/images/word/arquivos/${arquivo}`;
const docx = (html, extra = {}) => ({ html, ...extra });
const txt = (texto) => ({ texto });

/** Conta as palavras como a barra de status do Word */
export function contarPalavras(texto) {
  return String(texto ?? '')
    .split(/\s+/)
    .filter((p) => /[\p{L}\p{N}]/u.test(p)).length;
}

// Imagens da pasta Imagens (desenhos do jogo, em public/images/word/arquivos)
const IMAGENS = [
  { pasta: 'Imagens', nome: 'Satélite', tipo: 'imagem', conteudo: { src: img('satelite.svg'), larguraPx: 640, alturaPx: 420 } },
  { pasta: 'Imagens', nome: 'Mapa da base', tipo: 'imagem', conteudo: { src: img('mapa.svg'), larguraPx: 640, alturaPx: 440 } },
  { pasta: 'Imagens', nome: 'Base secreta', tipo: 'imagem', conteudo: { src: img('base.svg'), larguraPx: 640, alturaPx: 400 } },
];

const ARQUIVOS_BASE = [
  ...IMAGENS,
  { pasta: 'Documentos', nome: 'Lista de compras', tipo: 'txt', conteudo: txt('Pão\nLeite\nPilhas para a lanterna') },
  { pasta: 'Downloads', nome: 'Manual do rádio', tipo: 'pdf', conteudo: { html: '<p>Manual do rádio comunicador.</p>' } },
];

export const CAPITULOS = [
  { numero: 1, titulo: 'Recruta', descricao: 'Windows, abrir, salvar e organizar arquivos', icone: 'img:agente' },
  { numero: 2, titulo: 'Disfarce', descricao: 'Fonte: negrito, tamanho, cores e maiúsculas', icone: 'text_font' },
  { numero: 3, titulo: 'Organização', descricao: 'Parágrafo: alinhamento, listas, recuo e estilos', icone: 'text_align_justify' },
  { numero: 4, titulo: 'Provas', descricao: 'Inserir: imagens, tabelas, páginas e sumário', icone: 'image' },
  { numero: 5, titulo: 'Missão final', descricao: 'Revisão, layout e entrega em PDF', icone: 'img:trofeu' },
];

export const MISSOES = [
  // ======================= Capítulo 1: Recruta =======================
  {
    id: 'primeiro-acesso',
    capitulo: 1,
    titulo: 'Primeiro acesso',
    tutorial: true,
    historia: 'Bem-vindo à Central, agente @{arroba}! Todo agente começa criando a sua ficha no Word. Desta vez eu vou mostrando cada passo: é só seguir a luz.',
    conceitos: ['menu-iniciar', 'documento-em-branco', 'salvar-como'],
    arquivos: ARQUIVOS_BASE,
    objetivos: ({ arroba }) => [
      o.abrirWord(),
      o.documentoEmBranco(),
      o.digitar(`Agente ${arroba} pronto para a missão`, { conceito: 'editar-texto' }),
      o.salvarComo('Ficha do agente'),
    ],
    conclusao: 'Ficha salva! Agora o seu documento está guardado na pasta Documentos e você pode abrir de novo quando quiser.',
  },
  {
    id: 'mensagem-interceptada',
    capitulo: 1,
    titulo: 'Mensagem interceptada',
    historia: 'Interceptamos uma mensagem dos capangas do Dr. Kaos. Ela está na pasta Documentos. Mude o horário e o lugar do encontro para confundir os capangas!',
    conceitos: ['explorador', 'editar-texto', 'salvar'],
    arquivos: [
      ...ARQUIVOS_BASE,
      {
        pasta: 'Documentos',
        nome: 'Mensagem interceptada',
        tipo: 'docx',
        conteudo: docx(
          '<p><span style="font-weight:700">MENSAGEM INTERCEPTADA</span></p><p>Capangas, o encontro será às 15h na praça central.</p><p>Levem o mapa e o rádio. Ninguém pode se atrasar.</p>'
        ),
      },
    ],
    objetivos: () => [
      o.abrirArquivo('Mensagem interceptada'),
      o.trocarTexto('15h', '17h'),
      o.trocarTexto('praça', 'estação'),
      o.salvar('Mensagem interceptada'),
    ],
    conclusao: 'Perfeito! Como o arquivo já tinha nome, bastou Salvar (Ctrl + B). Salvar como é só para criar um arquivo novo.',
  },
  {
    id: 'coordenadas',
    capitulo: 1,
    titulo: 'Coordenadas secretas',
    historia: 'Um informante deixou as coordenadas do esconderijo num arquivo de texto na Área de Trabalho. Copie tudo para o Relatório de campo. Cuidado: o Dr. Kaos espalhou vírus por aí...',
    conceitos: ['copiar-colar', 'selecionar-tudo', 'desfazer'],
    arquivos: [
      ...ARQUIVOS_BASE,
      { pasta: 'Área de Trabalho', nome: 'Coordenadas', tipo: 'txt', conteudo: txt('Latitude: 23°33\'S\nLongitude: 46°38\'W\nPonto de encontro: Torre do relógio') },
      {
        pasta: 'Documentos',
        nome: 'Relatório de campo',
        tipo: 'docx',
        conteudo: docx(
          '<p><span style="font-weight:700">RELATÓRIO DE CAMPO</span></p><p>Coordenadas do esconderijo:</p><p>[COLE AQUI]</p><p>Agente responsável: @{arroba}. Missão em andamento.</p>'
        ),
      },
    ],
    objetivos: () => [
      o.abrirArquivo('Coordenadas', { tipo: 'txt', pasta: 'Área de Trabalho', texto: 'Abra o arquivo "Coordenadas" da Área de Trabalho', conceito: 'copiar-colar' }),
      o.copiarDoBloco('Torre do relógio'),
      o.abrirArquivo('Relatório de campo'),
      o.colarNoWord('Torre do relógio', { texto: 'Cole as coordenadas no lugar de [COLE AQUI]', semTexto: '[COLE AQUI]' }),
      o.desfazer('Agente responsável', { marco: 'desfazer:virus', espera: 'virus', texto: 'Recupere o parágrafo que o vírus apagou (Ctrl + Z)' }),
      o.salvar('Relatório de campo'),
    ],
    // Quando as coordenadas são coladas, o "vírus" apaga o último parágrafo (dá para desfazer)
    roteiro: [{ quando: { objetivo: 3 }, acao: 'virus', trecho: 'Agente responsável', fala: 'ALERTA! Um vírus do Dr. Kaos apagou o último parágrafo! Rápido: use Desfazer (Ctrl + Z).' }],
    conclusao: 'Vírus derrotado! Desfazer (Ctrl + Z) volta o que acabou de acontecer, e Refazer (Ctrl + R) avança de novo.',
  },
  {
    id: 'apagando-rastros',
    capitulo: 1,
    titulo: 'Apagando rastros',
    historia: 'Alguém mandou o Plano B para a Lixeira! Recupere, dê um nome melhor e guarde numa pasta só da operação. E apague o rascunho velho para não deixar pistas.',
    conceitos: ['lixeira', 'renomear', 'nova-pasta'],
    arquivos: [
      ...ARQUIVOS_BASE,
      { pasta: 'Lixeira', nome: 'Plano B', tipo: 'docx', conteudo: docx('<p>PLANO B</p><p>Se o plano A falhar, todos se encontram na biblioteca.</p>'), origem: 'Documentos' },
      { pasta: 'Lixeira', nome: 'Foto tremida', tipo: 'imagem', conteudo: IMAGENS[0].conteudo, origem: 'Imagens' },
      { pasta: 'Documentos', nome: 'Rascunho velho', tipo: 'txt', conteudo: txt('rascunho: não esquecer de comprar pilhas') },
    ],
    objetivos: () => [
      o.restaurar('Plano B'),
      o.renomear('Plano B', 'Plano final'),
      o.criarPasta('Operação Kaos'),
      o.moverPara('Plano final', 'Documentos/Operação Kaos'),
      o.excluir('Rascunho velho'),
    ],
    conclusao: 'Rastros apagados! Arquivo restaurado volta para a pasta de onde saiu, e pastas deixam tudo organizado como gavetas.',
  },

  // ======================= Capítulo 2: Disfarce =======================
  {
    id: 'palavras-chave',
    capitulo: 2,
    titulo: 'Palavras-chave',
    historia: 'O chefe lê os relatórios com pressa. Destaque as palavras-chave para ele achar tudo de relance.',
    conceitos: ['selecionar', 'negrito-italico-sublinhado'],
    arquivos: [
      ...ARQUIVOS_BASE,
      {
        pasta: 'Documentos',
        nome: 'Relatório do dia',
        tipo: 'docx',
        conteudo: docx(
          '<p>RELATÓRIO DO DIA</p><p>O código de acesso de hoje é ALFA-7. A entrega será feita no Setor Ômega, à meia-noite em ponto.</p><p>Não comente com ninguém.</p>'
        ),
      },
    ],
    abrir: { pasta: 'Documentos', nome: 'Relatório do dia' },
    objetivos: () => [
      o.formatarTrecho('ALFA-7', { negrito: true }),
      o.formatarTrecho('Setor Ômega', { italico: true }),
      o.formatarTrecho('meia-noite', { sublinhado: true }),
      o.salvar('Relatório do dia'),
    ],
    conclusao: 'Destaques no lugar! Lembre: no Word em português, Negrito é Ctrl + N, Itálico é Ctrl + I e Sublinhado é Ctrl + S.',
  },
  {
    id: 'cartaz',
    capitulo: 2,
    titulo: 'Cartaz de recrutamento',
    historia: 'A Central precisa de novos agentes! Deixe o cartaz chamativo: título grande e forte, frases fáceis de ler de longe.',
    conceitos: ['fonte-tamanho'],
    arquivos: [
      ...ARQUIVOS_BASE,
      {
        pasta: 'Documentos',
        nome: 'Cartaz',
        tipo: 'docx',
        conteudo: docx('<p>PROCURAM-SE AGENTES</p><p>Você é curioso, atento e bom de computador?</p><p>Procure a Central na sala de informática.</p>'),
      },
    ],
    abrir: { pasta: 'Documentos', nome: 'Cartaz' },
    objetivos: () => [
      o.formatarTrecho('PROCURAM-SE AGENTES', { fonte: 'Arial Black' }, { conceito: 'fonte-tamanho', texto: 'Mude a fonte do título para "Arial Black"', caminho: [o.passoTrecho('PROCURAM-SE AGENTES', 'Selecione o título inteiro: três cliques nele.'), o.passo('word.guia.inicio', 'Clique na guia Página Inicial.'), o.passo('word.faixa.inicio.fonte', 'Clique na seta da caixa de fonte (onde está escrito Calibri).'), o.passo('word.menu.fonte.Arial Black', 'Escolha Arial Black.')] }),
      o.formatarTrecho('PROCURAM-SE AGENTES', { tamanho: 28 }, { conceito: 'fonte-tamanho', texto: 'Deixe o título com tamanho 28', caminho: [o.passoTrecho('PROCURAM-SE AGENTES', 'Selecione o título inteiro: três cliques nele.'), o.passo('word.guia.inicio', 'Clique na guia Página Inicial.'), o.passo('word.faixa.inicio.tamanho', 'Clique na seta da caixa de tamanho (onde está o 11).'), o.passo('word.menu.tamanho.28', 'Escolha 28.')] }),
      o.formatarTrecho(['Você é curioso, atento e bom de computador?', 'Procure a Central na sala de informática.'], { tamanho: 14 }, {
        conceito: 'fonte-tamanho',
        texto: 'Deixe as duas frases de baixo com tamanho 14',
        caminho: [
          { trecho: 'Você é curioso', ate: 'sala de informática.', texto: 'Arraste o mouse do começo da segunda linha até o fim da última.' },
          o.passo('word.faixa.inicio.tamanho', 'Clique na seta da caixa de tamanho.'),
          o.passo('word.menu.tamanho.14', 'Escolha 14.'),
        ],
      }),
      o.salvar('Cartaz'),
    ],
    conclusao: 'Cartaz pronto! Fonte é o desenho da letra; tamanho é medido em pontos. Para selecionar várias linhas, arraste o mouse.',
  },
  {
    id: 'alerta-vermelho',
    capitulo: 2,
    titulo: 'Alerta vermelho',
    historia: 'O Dr. Kaos fugiu! O alerta precisa chamar atenção: palavras de perigo em vermelho e a data marcada com marca-texto.',
    conceitos: ['cor-realce', 'pincel'],
    arquivos: [
      ...ARQUIVOS_BASE,
      {
        pasta: 'Documentos',
        nome: 'Alerta',
        tipo: 'docx',
        conteudo: docx(
          '<p>ALERTA DA CENTRAL</p><p><span style="font-weight:700">PERIGO</span>: o Dr. Kaos escapou na sexta-feira.</p><p>CUIDADO: ele pode estar disfarçado de professor de informática.</p>'
        ),
      },
    ],
    abrir: { pasta: 'Documentos', nome: 'Alerta' },
    objetivos: () => [
      o.formatarTrecho('PERIGO', { cor: 'vermelho' }, {
        conceito: 'cor-realce',
        texto: 'Pinte a palavra "PERIGO" de vermelho',
        caminho: [o.passoTrecho('PERIGO'), o.passo('word.guia.inicio', 'Clique na guia Página Inicial.'), o.passo('word.faixa.inicio.corSeta', 'Clique na setinha ao lado do A colorido (Cor da Fonte).'), o.passo('word.menu.cor.vermelho', 'Escolha o vermelho.')],
      }),
      o.formatarTrecho('sexta-feira', { realce: 'amarelo' }, {
        conceito: 'cor-realce',
        texto: 'Marque "sexta-feira" com realce amarelo',
        caminho: [o.passoTrecho('sexta-feira'), o.passo('word.faixa.inicio.realceSeta', 'Clique na setinha ao lado do marca-texto (Cor do Realce).'), o.passo('word.menu.realce.amarelo', 'Escolha o amarelo.')],
      }),
      o.mesmoFormato('CUIDADO', 'PERIGO', { props: { negrito: true, cor: 'vermelho' } }),
      o.salvar('Alerta'),
    ],
    conclusao: 'Alerta dado! O Pincel copia a formatação inteira de uma vez: negrito, cor, tamanho... Bem mais rápido que repetir tudo.',
  },
  {
    id: 'mensagem-gritada',
    capitulo: 2,
    titulo: 'Mensagem gritada',
    historia: 'O informante escreveu tudo em MAIÚSCULAS (parece que está gritando!) e o último parágrafo virou uma bagunça de cores. Arrume sem digitar de novo.',
    conceitos: ['maiusculas', 'limpar-formatacao'],
    arquivos: [
      ...ARQUIVOS_BASE,
      {
        pasta: 'Documentos',
        nome: 'Recado do informante',
        tipo: 'docx',
        conteudo: docx(
          '<p>RECADO DO INFORMANTE</p><p>O PACOTE CHEGA AMANHÃ CEDO. NÃO SE ATRASE.</p><p><span style="font-family:\'Comic Sans MS\';color:#c00000">Encontre o agente</span><span style="font-size:16pt;color:#00b050"> perto da fonte </span><span style="font-family:Impact;color:#7030a0;background-color:#ffff00">da praça</span><span style="font-style:italic;color:#0070c0"> às oito horas.</span></p>'
        ),
      },
    ],
    abrir: { pasta: 'Documentos', nome: 'Recado do informante' },
    objetivos: () => [
      o.textoIgual('O PACOTE CHEGA AMANHÃ CEDO.', 'O pacote chega amanhã cedo. Não se atrase.', {
        texto: 'Mude "O PACOTE CHEGA..." para "Primeira letra da frase em maiúscula."',
        dica: 'Selecione a frase (três cliques), clique no botão Aa (Maiúsculas e Minúsculas) e escolha "Primeira letra da frase em maiúscula.". Ou aperte Shift + F3 algumas vezes.',
        caminho: [{ trecho: 'O PACOTE CHEGA AMANHÃ CEDO.', ate: 'NÃO SE ATRASE.', texto: 'Selecione o parágrafo inteiro: três cliques rápidos nele.' }, o.passo('word.guia.inicio', 'Clique na guia Página Inicial.'), o.passo('word.faixa.inicio.maiusculas', 'Clique no botão Aa.'), o.passo('word.menu.maiusculas.frase', 'Escolha "Primeira letra da frase em maiúscula.".')],
      }),
      o.semFormatacaoExtra('Encontre o agente'),
      o.salvar('Recado do informante'),
    ],
    conclusao: 'Recado limpo! O botão Aa (ou Shift + F3) muda maiúsculas e minúsculas, e Limpar Formatação tira de uma vez cores e fontes misturadas.',
  },

  // ======================= Capítulo 3: Organização =======================
  {
    id: 'comunicado',
    capitulo: 3,
    titulo: 'Comunicado oficial',
    historia: 'Comunicados oficiais da Central têm regras: título no centro, texto com as duas margens retinhas e assinatura à direita.',
    conceitos: ['alinhamento'],
    arquivos: [
      ...ARQUIVOS_BASE,
      {
        pasta: 'Documentos',
        nome: 'Comunicado',
        tipo: 'docx',
        conteudo: docx(
          '<p>COMUNICADO OFICIAL</p><p>A partir de hoje, todos os agentes devem trocar suas senhas toda semana e nunca contar para ninguém, nem para os melhores amigos. Quem encontrar um pendrive perdido não deve colocá-lo no computador, porque ele pode trazer vírus do Dr. Kaos. Na dúvida, procure a Central.</p><p>Central de Inteligência</p>'
        ),
      },
    ],
    abrir: { pasta: 'Documentos', nome: 'Comunicado' },
    objetivos: () => [
      o.alinhar('COMUNICADO OFICIAL', 'center', { rotulo: 'o título' }),
      o.alinhar('A partir de hoje', 'justify', { rotulo: 'o parágrafo do meio' }),
      o.alinhar('Central de Inteligência', 'right', { rotulo: 'a assinatura' }),
      o.salvar('Comunicado'),
    ],
    conclusao: 'Comunicado perfeito! Alinhamento vale para o parágrafo inteiro: basta o cursor estar nele.',
  },
  {
    id: 'kit-do-agente',
    capitulo: 3,
    titulo: 'Kit do agente',
    historia: 'Antes de cada missão, o agente confere o kit. Transforme as linhas soltas em listas: uma de equipamentos e outra com os passos, em ordem.',
    conceitos: ['listas'],
    arquivos: [
      ...ARQUIVOS_BASE,
      {
        pasta: 'Documentos',
        nome: 'Kit do agente',
        tipo: 'docx',
        conteudo: docx(
          '<p>KIT DO AGENTE</p><p>Equipamentos:</p><p>Lanterna</p><p>Rádio</p><p>Mapa</p><p>Antes de sair:</p><p>Confira as pilhas</p><p>Avise a Central</p><p>Apague as luzes</p>'
        ),
      },
    ],
    abrir: { pasta: 'Documentos', nome: 'Kit do agente' },
    objetivos: () => [
      o.lista(['Lanterna', 'Rádio', 'Mapa'], 'marcadores'),
      o.itemNaLista('Óculos escuros', 'marcadores', { depoisDe: 'Mapa' }),
      o.lista(['Confira as pilhas', 'Avise a Central', 'Apague as luzes'], 'numerada'),
      o.salvar('Kit do agente'),
    ],
    conclusao: 'Kit conferido! Marcadores são para coisas sem ordem; numeração, para passos que têm ordem.',
  },
  {
    id: 'relatorio-padrao',
    capitulo: 3,
    titulo: 'Relatório no padrão',
    historia: 'A diretoria só aceita relatórios no padrão: primeira linha de cada parágrafo recuada e espaço de 1,5 entre as linhas.',
    conceitos: ['recuo-espacamento'],
    arquivos: [
      ...ARQUIVOS_BASE,
      {
        pasta: 'Documentos',
        nome: 'Relatório semanal',
        tipo: 'docx',
        conteudo: docx(
          '<p>RELATÓRIO SEMANAL</p><p>Nesta semana a equipe acompanhou os passos do Dr. Kaos pela cidade. Ele foi visto duas vezes perto da biblioteca e uma vez no mercado.</p><p>Os agentes trocaram informações pelo rádio e ninguém foi descoberto. O mapa da base ficou pronto na quinta-feira.</p><p>Na próxima semana vamos seguir a pista do satélite e preparar a entrega das provas.</p>'
        ),
      },
    ],
    abrir: { pasta: 'Documentos', nome: 'Relatório semanal' },
    objetivos: () => {
      const corpo = ['Nesta semana a equipe', 'Os agentes trocaram', 'Na próxima semana'];
      return [o.recuoPrimeiraLinha(corpo, 1.25), o.entreLinhas(corpo, 1.5), o.salvar('Relatório semanal')];
    },
    conclusao: 'Relatório no padrão! A janela Parágrafo reúne recuos e espaçamentos. Esse é o padrão de muitos trabalhos escolares.',
  },
  {
    id: 'dossie-estilos',
    capitulo: 3,
    titulo: 'Dossiê organizado',
    historia: 'O dossiê do Dr. Kaos tem várias partes. Marque os títulos com o estilo Título 1: assim o Word entende a estrutura e monta o mapa do documento.',
    conceitos: ['estilos', 'painel-navegacao'],
    arquivos: [
      ...ARQUIVOS_BASE,
      {
        pasta: 'Documentos',
        nome: 'Dossiê do Dr. Kaos',
        tipo: 'docx',
        conteudo: docx(
          '<p>Quem é</p><p>Ex-professor de informática que quer apagar todos os documentos do mundo.</p><p>Onde se esconde</p><p>Numa base secreta embaixo da biblioteca, com entrada pela seção de dicionários.</p><p>Pontos fracos</p><p>Não sabe usar o Word e esquece de salvar os arquivos.</p>'
        ),
      },
    ],
    abrir: { pasta: 'Documentos', nome: 'Dossiê do Dr. Kaos' },
    objetivos: () => [o.estiloParagrafo(['Quem é', 'Onde se esconde', 'Pontos fracos'], 'titulo1'), o.painelNavegacao(), o.salvar('Dossiê do Dr. Kaos')],
    conclusao: 'Dossiê organizado! Com estilos de título, o Painel de Navegação mostra o "mapa" do documento e leva você a cada parte com um clique.',
  },

  // ======================= Capítulo 4: Provas =======================
  {
    id: 'foto-de-prova',
    capitulo: 4,
    titulo: 'Foto de prova',
    historia: 'Um satélite fotografou a base do Dr. Kaos. Coloque a foto no relatório de provas, num tamanho que caiba bem, centralizada.',
    conceitos: ['imagem'],
    arquivos: [
      ...ARQUIVOS_BASE,
      { pasta: 'Documentos', nome: 'Provas', tipo: 'docx', conteudo: docx('<p>PROVA FOTOGRÁFICA</p><p></p><p>Foto do satélite tirada às 3h da manhã sobre a base secreta.</p>') },
    ],
    abrir: { pasta: 'Documentos', nome: 'Provas' },
    objetivos: () => [o.inserirImagem('Satélite'), o.tamanhoDaImagem('Satélite', { maxCm: 8 }), o.imagemCentralizada('Satélite'), o.salvar('Provas')],
    conclusao: 'Prova anexada! Arrastar pelo canto muda o tamanho sem deformar a foto.',
  },
  {
    id: 'lista-de-suspeitos',
    capitulo: 4,
    titulo: 'Lista de suspeitos',
    historia: 'Temos três suspeitos de ajudar o Dr. Kaos. Monte uma tabela para organizar nome, codinome e cidade de cada um.',
    conceitos: ['tabela'],
    arquivos: [...ARQUIVOS_BASE, { pasta: 'Documentos', nome: 'Suspeitos', tipo: 'docx', conteudo: docx('<p>LISTA DE SUSPEITOS</p><p></p>') }],
    abrir: { pasta: 'Documentos', nome: 'Suspeitos' },
    objetivos: () => [
      o.inserirTabela(3, 4),
      o.cabecalhoDaTabela(['Nome', 'Codinome', 'Cidade']),
      o.linhasDaTabela(5, { texto: 'Acrescente mais uma linha no fim da tabela (5 linhas)' }),
      o.salvar('Suspeitos'),
    ],
    conclusao: 'Tabela pronta! Tab anda de célula em célula, e o botão direito tem tudo para inserir ou excluir linhas e colunas.',
  },
  {
    id: 'dossie-paginas',
    capitulo: 4,
    titulo: 'Dossiê em páginas',
    historia: 'O dossiê completo vai para a diretoria. Cada parte deve começar numa página nova, com "CONFIDENCIAL" no alto de todas e o número da página embaixo.',
    conceitos: ['quebra-pagina', 'cabecalho-rodape'],
    arquivos: [
      ...ARQUIVOS_BASE,
      {
        pasta: 'Documentos',
        nome: 'Dossiê completo',
        tipo: 'docx',
        conteudo: docx(
          '<h1>Parte 1: O vilão</h1><p>O Dr. Kaos era professor de informática até o dia em que perdeu um trabalho inteiro porque não salvou. Desde então, quer que todo mundo perca os seus.</p><h1>Parte 2: Os capangas</h1><p>São três capangas, todos com codinomes de teclas: Esc, Delete e Caps Lock.</p><h1>Parte 3: O plano</h1><p>Invadir os computadores da escola na semana de provas e trocar o Word por uma máquina de escrever.</p>'
        ),
      },
    ],
    abrir: { pasta: 'Documentos', nome: 'Dossiê completo' },
    objetivos: () => [o.comecaNovaPagina('Parte 2: Os capangas'), o.comecaNovaPagina('Parte 3: O plano'), o.cabecalho('CONFIDENCIAL'), o.numeroDePagina(), o.salvar('Dossiê completo')],
    conclusao: 'Dossiê montado! A quebra de página segura cada parte no lugar, e o cabeçalho e o rodapé se repetem sozinhos em todas as páginas.',
  },
  {
    id: 'sumario',
    capitulo: 4,
    titulo: 'Sumário do dossiê',
    historia: 'A diretoria pediu um sumário no começo do dossiê. Não precisa digitar: o Word monta sozinho com os títulos e as páginas.',
    conceitos: ['sumario'],
    arquivos: [
      ...ARQUIVOS_BASE,
      {
        pasta: 'Documentos',
        nome: 'Dossiê com sumário',
        tipo: 'docx',
        conteudo: docx(
          '<h1>O vilão</h1><p>Ex-professor de informática que quer apagar todos os documentos do mundo.</p><div class="doc-quebra" contenteditable="false"></div><h1>Os capangas</h1><p>Esc, Delete e Caps Lock.</p><div class="doc-quebra" contenteditable="false"></div><h1>Esconderijo</h1><p>Embaixo da biblioteca, entrada pela seção de dicionários.</p>',
          { numeroPagina: 'centro' }
        ),
      },
    ],
    abrir: { pasta: 'Documentos', nome: 'Dossiê com sumário' },
    objetivos: () => [
      o.inserirSumario(),
      o.trocarTexto('Esconderijo', 'Esconderijo secreto', { texto: 'Mude o título "Esconderijo" para "Esconderijo secreto"', conceito: 'sumario' }),
      o.sumarioAtualizado({ contendo: 'Esconderijo secreto' }),
      o.salvar('Dossiê com sumário'),
    ],
    conclusao: 'Sumário automático! Sempre que mudar um título ou o texto mudar de página, é só clicar em Atualizar Sumário.',
  },

  // ======================= Capítulo 5: Missão final =======================
  {
    id: 'codigo-trocado',
    capitulo: 5,
    titulo: 'Código trocado',
    historia: 'O Dr. Kaos descobriu o código KAOS-1. Troque por KAOS-9 no relatório inteiro, sem deixar nenhum para trás. E conte quantas vezes falamos do satélite.',
    conceitos: ['localizar-substituir'],
    arquivos: [
      ...ARQUIVOS_BASE,
      {
        pasta: 'Documentos',
        nome: 'Códigos',
        tipo: 'docx',
        conteudo: docx(
          '<p>RELATÓRIO DE CÓDIGOS</p><p>A porta norte abre com KAOS-1. O satélite confirmou que o cofre também usa KAOS-1.</p><p>No túnel, a senha é KAOS-1 seguida do nome do agente. O satélite viu dois guardas no túnel.</p><p>Atenção: o rádio só funciona depois de digitar KAOS-1. A antena aponta para o satélite.</p><p>Lembrete: KAOS-1 no portão e KAOS-1 no elevador. Fim da transmissão do satélite.</p>'
        ),
      },
    ],
    abrir: { pasta: 'Documentos', nome: 'Códigos' },
    objetivos: () => [
      o.substituirTudo('KAOS-1', 'KAOS-9', { minimo: 6 }),
      o.responder('satelite', 'Quantas vezes aparece a palavra "satélite"? (use Localizar: Ctrl + L)', 4, {
        conceito: 'localizar-substituir',
        dica: 'Clique em Localizar (Página Inicial, à direita) ou aperte Ctrl + L. Digite satélite na caixa de pesquisa: o painel mostra quantos resultados encontrou.',
        caminho: [o.passo('word.guia.inicio', 'Clique na guia Página Inicial.'), o.passo('word.faixa.inicio.localizar', 'Clique em Localizar.'), o.passoCampo('word.navegacao.busca', 'satélite', 'Digite satélite aqui e veja quantos resultados aparecem.')],
      }),
      o.salvar('Códigos'),
    ],
    conclusao: 'Código trocado em todo o documento de uma vez! Imagine fazer isso à mão num livro inteiro...',
  },
  {
    id: 'ortografia',
    capitulo: 5,
    titulo: 'Mensagem com erros',
    historia: 'Um agente novato escreveu a mensagem com pressa e cheia de erros. A Central não pode mandar assim! Corrija tudo e diga quantas palavras ela tem.',
    conceitos: ['ortografia', 'contar-palavras'],
    arquivos: [
      ...ARQUIVOS_BASE,
      {
        pasta: 'Documentos',
        nome: 'Mensagem do novato',
        tipo: 'docx',
        conteudo: docx(
          '<p>Esta é uma mençagem muito importante para a Central.</p><p>O código secretu foi trocado ontem e tanbém o lugar do encontro.</p><p>Vai ser inpossível entrar na base sem o agenti de plantão.</p>'
        ),
      },
    ],
    abrir: { pasta: 'Documentos', nome: 'Mensagem do novato' },
    objetivos: () => [
      o.semErrosDeOrtografia(['mensagem', 'secreto', 'também', 'impossível', 'agente']),
      o.responder('palavras', 'Quantas palavras tem a mensagem? (olhe na barra de baixo da janela do Word)', (e) => e.word?.doc?.contarPalavras(), {
        conceito: 'contar-palavras',
        dica: 'Olhe na parte de baixo da janela do Word, à esquerda: aparece "Página 1 de 1" e o número de palavras.',
        caminho: [o.passo('word.status.palavras', 'O número de palavras está aqui.')],
      }),
      o.salvar('Mensagem do novato'),
    ],
    conclusao: 'Mensagem corrigida! O sublinhado vermelho avisa a palavra que o Word não conhece; o botão direito mostra as sugestões.',
  },
  {
    id: 'mapa-da-operacao',
    capitulo: 5,
    titulo: 'Mapa da operação',
    historia: 'O plano de ataque vai ser impresso e pendurado na parede da Central: folha deitada, margens pequenas e texto em duas colunas, como num jornal.',
    conceitos: ['orientacao', 'colunas'],
    arquivos: [
      ...ARQUIVOS_BASE,
      {
        pasta: 'Documentos',
        nome: 'Plano de ataque',
        tipo: 'docx',
        conteudo: docx(
          '<p>PLANO DE ATAQUE</p><p>Equipe 1 entra pela porta norte às 17h, usando o código novo. Um agente fica no rádio o tempo todo.</p><p>Equipe 2 espera no túnel até o sinal da lanterna. Ninguém entra antes do sinal.</p><p>Equipe 3 cuida do satélite e avisa a Central se o Dr. Kaos tentar fugir pela biblioteca.</p><p>Quando o vilão for capturado, todos voltam para a Central para salvar o relatório final.</p>'
        ),
      },
    ],
    abrir: { pasta: 'Documentos', nome: 'Plano de ataque' },
    objetivos: () => [o.orientacao('paisagem'), o.margens('estreita'), o.colunas(2), o.salvar('Plano de ataque')],
    conclusao: 'Plano na parede! Orientação, margens e colunas ficam na guia Layout e mudam a página inteira.',
  },
  {
    id: 'relatorio-final',
    capitulo: 5,
    titulo: 'Relatório final',
    historia: 'O Dr. Kaos foi capturado! Falta o relatório final para a diretoria, entregue em PDF. Use tudo o que você aprendeu, agente @{arroba}.',
    conceitos: ['estilos', 'listas', 'imagem', 'cabecalho-rodape', 'pdf'],
    arquivos: [
      ...ARQUIVOS_BASE,
      {
        pasta: 'Documentos',
        nome: 'Relatório final',
        tipo: 'docx',
        conteudo: docx(
          '<p>Relatório Final da Operação</p><p>A operação terminou com sucesso. Estas foram as conquistas da equipe:</p><p>O Dr. Kaos foi capturado na biblioteca</p><p>Os capangas devolveram os documentos roubados</p><p>A escola voltou a usar o Word em paz</p><p>Foto da base, tirada no dia da captura:</p><p></p><p>Assinado: agente @{arroba}.</p>'
        ),
      },
    ],
    abrir: { pasta: 'Documentos', nome: 'Relatório final' },
    objetivos: () => [
      o.estiloParagrafo(['Relatório Final da Operação'], 'titulo', { texto: 'Aplique o estilo "Título" no título do relatório' }),
      o.lista(['O Dr. Kaos foi capturado', 'Os capangas devolveram', 'A escola voltou'], 'marcadores', { texto: 'Transforme as três conquistas numa lista com marcadores' }),
      o.inserirImagem('Base secreta', { texto: 'Insira a imagem "Base secreta" depois de "Foto da base"' }),
      o.numeroDePagina(),
      o.salvar('Relatório final'),
      o.exportarPdf('Relatório final'),
    ],
    conclusao: 'Operação concluída, agente! Você domina o Word: do primeiro "Salvar como" até o PDF final. A Central tem orgulho de você.',
  },
];

export function missaoPorId(id) {
  return MISSOES.find((m) => m.id === id) || null;
}

/** Troca {arroba} nos textos da missão */
export function personalizar(texto, { arroba = 'agente' } = {}) {
  return String(texto ?? '').replace(/\{arroba\}/g, arroba);
}

/**
 * Missões liberadas: a primeira sempre; as outras quando a anterior foi
 * concluída (ou todas, se o professor liberou).
 */
export function missoesLiberadas(concluidas, { liberarTudo = false } = {}) {
  const feitas = new Set(concluidas);
  const liberadas = new Set();
  MISSOES.forEach((m, i) => {
    if (liberarTudo || i === 0 || feitas.has(MISSOES[i - 1].id) || feitas.has(m.id)) liberadas.add(m.id);
  });
  return liberadas;
}

/**
 * Estrelas: 3 sem pedir ajuda (ou com uma dica só), 2 com pouca ajuda,
 * 1 com muita. Na missão tutorial, concluir já vale 3.
 */
export function calcularEstrelas({ dicas = 0, mostreMe = 0, tutorial = false }) {
  if (tutorial) return 3;
  const ajuda = dicas + mostreMe * 2;
  if (ajuda <= 1) return 3;
  if (ajuda <= 4) return 2;
  return 1;
}
