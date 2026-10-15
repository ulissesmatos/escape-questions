/**
 * Conteúdo das páginas públicas, as que buscadores e assistentes de IA leem.
 * É a fonte única: daqui saem o HTML, o Markdown, o JSON-LD, o sitemap e o
 * llms.txt. Os números (fases, missões, perguntas) vêm do README e do código;
 * ao mudar uma atividade, ajuste o texto aqui e a data em `atualizadoEm`.
 *
 * Cada página abre com um `resumo` que se explica sozinho (é o trecho que um
 * assistente consegue citar) e traz uma `ficha` de fatos.
 */

const NIVEL = '6º ao 9º ano do Ensino Fundamental';
const REQUISITOS = 'Computador com navegador (Chrome ou Edge) e internet, sem instalação';

/** Eixos do Complemento à BNCC – Computação (Parecer CNE/CEB nº 2/2022) */
const EIXOS = Object.freeze({
  pensamento: 'Pensamento Computacional',
  mundo: 'Mundo Digital',
  cultura: 'Cultura Digital',
});

const SITE = Object.freeze({
  nome: 'Atividades da Turma',
  idioma: 'pt-BR',
  nivel: NIVEL,
  editora: Object.freeze({ nome: 'Nuveasy', url: 'https://nuveasy.com' }),
  /** Data em que o conteúdo foi revisado pela última vez (AAAA-MM-DD) */
  atualizadoEm: '2026-10-14',
});

/**
 * `arquivo`: a página do jogo em public/. A atividade só entra no sitemap e
 * nas listas se o arquivo existir (a Operação Word, por exemplo, só aparece
 * depois que a branch dela for publicada).
 */
const ATIVIDADES = [
  {
    slug: 'escape-room',
    cta: 'Começar a investigação',
    nome: 'Escape Room',
    nomeCurto: 'Escape Room',
    icone: '🔎',
    etiqueta: 'Investigação',
    arquivo: 'escape-room.html',
    jogo: '/escape-room.html',
    rotas: ['/escape-room', '/escape-room.html'],
    cores: { cor: '#5046e5', clara: '#eeedfd', escura: '#3f36c9' },
    eixos: [EIXOS.cultura],
    titulo: 'Escape Room de informática: pistas de pesquisa na internet',
    descricao:
      'Atividade gratuita em que a turma pesquisa na internet para resolver pistas de informática. A correção é feita pelo servidor e só o professor vê a nota.',
    resumo:
      'O Escape Room é uma investigação em que os alunos pesquisam na internet para resolver pistas sobre o mundo digital, como navegadores, Wi-Fi, senhas e redes sociais. Cada pista pede uma palavra e um dígito, uma alternativa ou verdadeiro/falso, e o servidor corrige o envio.',
    ficha: [
      ['Para quem', NIVEL],
      ['Formato', 'Pistas de pesquisa na internet; os participantes informam nomes e turma'],
      ['Tipos de pista', 'Palavra mais dígito, múltipla escolha e verdadeiro ou falso'],
      ['Envio', 'Único: depois de enviar, não dá para refazer'],
      ['O aluno vê a nota?', 'Não, só o professor vê o resultado'],
      ['Precisa de', REQUISITOS],
      ['Custo', 'Gratuito'],
    ],
    aprende: [
      'Pesquisar na internet para encontrar uma informação específica',
      'Conhecer termos do dia a dia digital: navegador, Bluetooth, hashtag, senha, nuvem, Wi-Fi',
      'Ler uma pergunta com atenção e responder só o que foi pedido',
    ],
    passos: [
      'Os participantes informam os nomes e a turma.',
      'Cada pista é resolvida com uma pesquisa na internet.',
      'A turma envia as respostas uma única vez.',
      'O servidor corrige, e o professor vê o resultado no painel.',
    ],
    professor: [
      'A correção é feita no servidor, e o aluno não vê a nota, só o professor.',
      'As respostas ficam agrupadas por turma, com o detalhe de cada pista e exportação em CSV.',
      'As pistas ficam no banco de dados e podem ser editadas no painel do professor.',
    ],
    faq: [
      ['Os alunos precisam de e-mail ou senha?', 'Não. Eles só informam os nomes dos participantes e a turma.'],
      ['Dá para refazer depois de enviar?', 'Não. O envio é único e corrigido no servidor.'],
    ],
  },
  {
    slug: 'mapa-de-hardware',
    cta: 'Explorar o mapa',
    nome: 'Mapa de Hardware',
    nomeCurto: 'Hardware',
    icone: '🗺️',
    etiqueta: 'Quiz adaptativo',
    arquivo: 'hardware.html',
    jogo: '/hardware.html',
    rotas: ['/hardware', '/hardware.html'],
    cores: { cor: '#0d9488', clara: '#e6f7f5', escura: '#0b7a70' },
    eixos: [EIXOS.mundo],
    titulo: 'Mapa de Hardware: quiz adaptativo das peças do computador',
    descricao:
      'Quiz gratuito em que o aluno descobre as peças do computador em 3 níveis. A dificuldade sobe para quem acerta e desce para quem erra, com proteção contra chute.',
    resumo:
      'O Mapa de Hardware é um quiz em que o aluno descobre as peças do computador em 3 níveis. A dificuldade das perguntas se ajusta ao desempenho: sobe para quem acerta rápido e em sequência e desce para quem erra.',
    ficha: [
      ['Para quem', NIVEL],
      ['Formato', 'Quiz adaptativo em 3 níveis, com o aluno descobrindo as peças do computador'],
      ['Tipos de pergunta', 'Múltipla escolha, verdadeiro ou falso, resposta escrita, número, colocar em ordem, palavra embaralhada e ligar pares'],
      ['Banco de perguntas', '130 perguntas iniciais (5 por peça), editáveis pelo professor'],
      ['Contra chute', 'O servidor mede o tempo de leitura e queima a pergunta depois da primeira resposta'],
      ['Precisa de', REQUISITOS],
      ['Custo', 'Gratuito'],
    ],
    aprende: [
      'Reconhecer as peças do computador e a função de cada uma',
      'Entender como as peças se conectam',
      'Resolver contas simples de informática, como converter GB em MB',
    ],
    passos: [
      'O aluno informa o nome e a turma.',
      'Escolhe uma peça do mapa e responde às perguntas dela.',
      'Quem acerta rápido e em sequência recebe perguntas mais difíceis; quem erra recebe mais fáceis.',
      'Cada pergunta aceita uma única resposta, então não dá para testar as alternativas uma a uma.',
    ],
    professor: [
      'O painel mostra o progresso por nível, a taxa de acerto, as respostas dadas no chute e o histórico de cada tentativa.',
      'O banco de perguntas é editável, com estatística de acerto por pergunta.',
      'O mapa das peças tem editor visual, e dá para zerar o progresso de um aluno.',
    ],
    faq: [
      ['O que significa "adaptativo"?', 'A dificuldade da próxima pergunta depende do desempenho do aluno: acertos rápidos e em sequência sobem o nível, e erros descem.'],
      ['O aluno consegue chutar até acertar?', 'Não. Cada pergunta aceita uma única resposta, o gabarito nunca vai para o navegador e o servidor percebe respostas rápidas demais.'],
    ],
  },
  {
    slug: 'monte-o-pc-ideal',
    cta: 'Montar um PC',
    nome: 'Monte o PC Ideal',
    nomeCurto: 'Monte o PC',
    icone: '🛒',
    etiqueta: 'Pesquisa e orçamento',
    arquivo: 'monta-pc.html',
    jogo: '/monta-pc.html',
    rotas: ['/monta-pc', '/monta-pc.html'],
    cores: { cor: '#ea580c', clara: '#fff1e8', escura: '#c2410c' },
    eixos: [EIXOS.mundo],
    titulo: 'Monte o PC Ideal: pesquise peças e monte dentro do orçamento',
    descricao:
      'Atividade gratuita em que o aluno escolhe um cliente, pesquisa peças reais em lojas e monta o computador dentro do orçamento, justificando a compatibilidade.',
    resumo:
      'No Monte o PC Ideal, o aluno escolhe um cliente, pesquisa peças reais em lojas e monta a proposta de um computador dentro do orçamento, justificando a compatibilidade das peças. Não há gabarito: o professor revisa cada proposta e dá o retorno.',
    ficha: [
      ['Para quem', NIVEL],
      ['Formato', 'Proposta de computador para um cliente, com peças reais pesquisadas em lojas'],
      ['Clientes', 'Quem joga, quem cria vídeos, quem trabalha em casa, quem produz música e um laboratório de inclusão da escola'],
      ['Correção', 'Sem gabarito: o professor revisa e escreve o retorno'],
      ['Precisa de', REQUISITOS],
      ['Custo', 'Gratuito'],
    ],
    aprende: [
      'Relacionar o uso do computador com as peças necessárias',
      'Pesquisar preço e especificação de peças reais',
      'Respeitar um orçamento e justificar as escolhas',
      'Conferir se as peças são compatíveis entre si',
    ],
    passos: [
      'O aluno informa o nome e a turma e escolhe um cliente.',
      'Pesquisa peças reais em lojas e anota o que escolheu.',
      'Monta a proposta dentro do orçamento e justifica a compatibilidade.',
      'O professor revisa a proposta e escreve o retorno.',
    ],
    professor: [
      'As propostas podem ser filtradas por turma, missão e situação, com retorno por escrito, marcação de revisada e exportação em CSV.',
      'As missões (cliente, necessidade e orçamento) são cadastradas no painel.',
    ],
    faq: [
      ['Existe resposta certa?', 'Não há gabarito. O que vale é a justificativa: o professor avalia se as peças atendem o cliente, cabem no orçamento e são compatíveis.'],
      ['Os preços são reais?', 'O aluno pesquisa as peças e os preços em lojas de verdade; a atividade não traz uma lista de preços pronta.'],
    ],
  },
  {
    slug: 'oficina-de-pcs',
    cta: 'Jogar agora',
    nome: 'Oficina de PCs',
    nomeCurto: 'Oficina',
    icone: '🔧',
    etiqueta: 'Jogo',
    arquivo: 'oficina.html',
    jogo: '/oficina.html',
    rotas: ['/oficina', '/oficina.html'],
    cores: { cor: '#b45309', clara: '#fff4e0', escura: '#92400e' },
    eixos: [EIXOS.mundo],
    titulo: 'Oficina de PCs: jogo de montar computadores peça por peça',
    descricao:
      'Jogo gratuito em pixel art: o aluno atende clientes e monta o PC na bancada, encaixando peças, passando pasta térmica e testando. Tem versão para baixar e usar offline.',
    resumo:
      'A Oficina de PCs é um jogo em pixel art em que o aluno atende clientes e monta o computador na bancada: encaixa o processador, passa pasta térmica, parafusa o cooler e liga os cabos. Peça incompatível tem consequência, e o PC é testado ao final.',
    ficha: [
      ['Para quem', NIVEL],
      ['Formato', 'Jogo 2D em pixel art, com tutorial guiado e pedidos de clientes'],
      ['Peças', 'Placas-mãe, processadores e memórias de modelos reais (AMD AM4 e AM5, Intel LGA1700 e LGA1851)'],
      ['Desafios', 'Encaixe do processador, dose da pasta térmica, parafusos do cooler e cabos'],
      ['Pontuação', 'Estrelas e moedas por pedido'],
      ['Offline', 'Versão em arquivo único e aplicativo para Windows, sem internet e sem instalar nada'],
      ['Precisa de', REQUISITOS],
      ['Custo', 'Gratuito'],
    ],
    aprende: [
      'Quais peças formam um computador e em que ordem se monta',
      'Compatibilidade: socket do processador, tipo de memória (DDR4 ou DDR5), tamanho da placa e potência da fonte',
      'Por que o processador precisa de pasta térmica e de um cooler',
      'O que acontece ao ligar: o BIOS reconhece as peças e o sistema inicia (mais rápido com SSD)',
    ],
    passos: [
      'O primeiro pedido é um tutorial guiado; os seguintes são livres.',
      'O aluno arrasta as peças para a placa e o gabinete e faz cada encaixe.',
      'Fecha a tampa e liga o PC: BIOS, sistema e teste de estresse.',
      'Recebe estrelas e moedas conforme o cliente foi atendido.',
    ],
    professor: [
      'O progresso do jogo fica salvo no navegador do aluno.',
      'Há versões para baixar que rodam sem internet: um arquivo único (qualquer sistema) e um aplicativo para Windows.',
    ],
    faq: [
      ['Precisa de internet?', 'Para jogar pelo site, sim. A versão para baixar, em arquivo único ou aplicativo do Windows, roda sem internet.'],
      ['O que acontece se o aluno escolher uma peça incompatível?', 'Há consequência: socket errado ou processador torto entorta os pinos, sem pasta térmica o PC superaquece e fonte fraca desliga no teste.'],
    ],
  },
  {
    slug: 'robo-na-horta',
    cta: 'Jogar agora',
    nome: 'Robô na Horta',
    nomeCurto: 'Horta',
    icone: '🤖',
    etiqueta: 'Jogo de lógica',
    arquivo: 'horta.html',
    jogo: '/horta.html',
    rotas: ['/horta', '/horta.html'],
    cores: { cor: '#15803d', clara: '#e8f8ee', escura: '#166534' },
    eixos: [EIXOS.pensamento],
    titulo: 'Robô na Horta: jogo de lógica com blocos para o 6º ao 9º ano',
    descricao:
      'Jogo gratuito de lógica com blocos de montar: o aluno monta o plano do robô para colher, plantar e regar. 23 fases em 5 mundos, direto no navegador.',
    resumo:
      'O Robô na Horta é um jogo de lógica com blocos de montar, sem falar em programação. O aluno monta o plano do robô (andar, virar, colher, plantar, regar, repetir, "se" e "repita até") e vê o robô executar o plano na horta. São 23 fases em 5 mundos.',
    ficha: [
      ['Para quem', NIVEL],
      ['Formato', 'Jogo de blocos de montar, com pixel art e 23 fases em 5 mundos'],
      ['Conceitos', 'Sequência, repetição (inclusive um Repita dentro de outro), condição e generalização'],
      ['Desafio extra', 'A partir do mundo 4 a horta é sorteada e o mesmo plano precisa funcionar em 3 hortas'],
      ['Progresso', 'Salvo no navegador do aluno, sem cadastro'],
      ['Computadores antigos', 'Feito para rodar bem em máquinas modestas: sem WebGL e sem imagens'],
      ['Precisa de', REQUISITOS],
      ['Custo', 'Gratuito'],
    ],
    aprende: [
      'Montar uma sequência de passos para resolver um problema',
      'Usar repetição para não escrever o mesmo passo várias vezes',
      'Decidir com "se" e "repita até", olhando o que o robô sente na horta',
      'Criar um plano que funcione em situações diferentes, e não só em um caminho decorado',
    ],
    passos: [
      'O aluno encaixa blocos para montar o plano do robô.',
      'Aperta para executar: o robô cumpre o plano, um passo de cada vez.',
      'Se o robô erra, ele mostra o motivo, por exemplo "Essa planta ainda está verde!".',
      'Completar a fase, usar poucos blocos e pegar as moedas rendem até 3 estrelas.',
    ],
    professor: [
      'O Repita dentro do Repita é ensinado aos poucos, a partir do mundo 3.',
      'O painel mostra a resposta de cada fase concluída com 3 estrelas.',
      'O professor pode ligar a "memória do Bip", que limita a quantidade de blocos e obriga o uso do Repita.',
      'Com ?tudo no endereço, todas as fases ficam liberadas para o professor conhecer o jogo.',
    ],
    faq: [
      ['É preciso saber programar?', 'Não. O jogo não fala em programação: o aluno só monta o plano do robô encaixando blocos.'],
      ['Funciona em computador antigo?', 'Foi feito para isso: usa Canvas 2D, sem WebGL e sem imagens, e a animação se mantém fluida mesmo sem placa de vídeo.'],
      ['Decorar o caminho resolve?', 'Nos mundos finais, não: a horta é sorteada e o mesmo plano precisa funcionar em 3 hortas diferentes.'],
    ],
  },
  {
    slug: 'operacao-word',
    cta: 'Começar as missões',
    nome: 'Operação Word',
    nomeCurto: 'Operação Word',
    icone: '📝',
    etiqueta: 'Missões',
    arquivo: 'word.html',
    jogo: '/word.html',
    rotas: ['/word', '/word.html'],
    cores: { cor: '#2b579a', clara: '#e8eef8', escura: '#1e3f73' },
    eixos: [EIXOS.cultura],
    titulo: 'Operação Word: aprenda Word com 20 missões de agente secreto',
    descricao:
      'Simulador gratuito de Windows 11 e Word em português, com 20 missões de agente secreto do básico ao intermediário. O aluno entra só com o @, sem senha.',
    resumo:
      'A Operação Word é um computador simulado (Windows 11 e Word 2019 em português) com 20 missões de agente secreto, do básico ao intermediário. O aluno cria um @, entra só com ele e aprende formatação, parágrafo, tabela, sumário e mais, com ajuda na medida certa.',
    ficha: [
      ['Para quem', NIVEL],
      ['Formato', 'Simulador de Windows 11 e Word 2019 em português, com missões e história'],
      ['Missões', '20 missões em 5 capítulos: Recruta, Disfarce, Organização, Provas e Missão final'],
      ['Entrada', 'O aluno cria um @ (nome, turma e @) e volta só com ele, sem senha'],
      ['Ajuda', 'Dica, "Mostre-me" (acende o lugar exato na tela) e detector de quando o aluno se perde'],
      ['Pontuação', 'De 1 a 3 estrelas por missão, conforme a ajuda usada'],
      ['Precisa de', 'Computador com Chrome ou Edge e internet, sem instalação'],
      ['Custo', 'Gratuito'],
    ],
    aprende: [
      'Formatar fonte: negrito, itálico, sublinhado, cor, realce e Pincel de Formatação',
      'Formatar parágrafo: alinhamento, listas, recuo, espaçamento e estilos',
      'Inserir imagem, tabela, quebra de página, cabeçalho, rodapé, número de página e sumário automático',
      'Localizar e substituir, corrigir a ortografia, contar palavras e ajustar margens, orientação e colunas',
      'Salvar o documento e exportar em PDF',
      'Atalhos do Word em português, como Ctrl+N para negrito e Ctrl+B para salvar',
    ],
    passos: [
      'O aluno cria o @ e entra na Central, que conta a história e guia as missões.',
      'Cada missão começa com um briefing do que será aprendido e onde fica o comando.',
      'No computador simulado, o aluno cumpre os objetivos usando o Windows e o Word como no real.',
      'Se se perder, recebe a dica; depois o "Mostre-me" acende na tela o próximo passo.',
      'Termina com estrelas e o resumo do que aprendeu; o Manual do Agente reúne tudo.',
    ],
    professor: [
      'O painel mostra cada @ com nome e turma, missões concluídas, estrelas, ajudas usadas e vezes que se perdeu.',
      'Dá para ver o documento que o aluno entregou, do jeito que ele formatou.',
      'A lista de alunos pode ser exportada em CSV, e o professor pode liberar todas as missões de uma vez.',
    ],
    faq: [
      ['O aluno precisa ter o Word instalado?', 'Não. O Windows e o Word são simulados no navegador, em português, e as missões não dependem de nenhum programa instalado.'],
      ['Precisa de senha?', 'Não. O aluno cria um @ e usa só ele para voltar de onde parou, em qualquer computador.'],
      ['O que o aluno faz se não souber o próximo passo?', 'Pede a dica ou usa o "Mostre-me", que escurece a tela e acende o lugar exato onde clicar.'],
    ],
  },
  {
    slug: 'laboratorio-de-experimentos',
    cta: 'Entrar no laboratório',
    nome: 'Laboratório de Experimentos',
    nomeCurto: 'Laboratório',
    icone: '🧪',
    etiqueta: 'Ao vivo',
    arquivo: 'laboratorio.html',
    jogo: '/laboratorio',
    rotas: ['/laboratorio', '/laboratorio.html'],
    cores: { cor: '#db2777', clara: '#fdf2f8', escura: '#be185d' },
    eixos: [EIXOS.cultura],
    titulo: 'Laboratório de Experimentos: competição de informática ao vivo',
    descricao:
      'Competição gratuita em tempo real: a turma entra numa sala com código, faz o experimento no computador, responde o que aconteceu e acompanha o ranking no telão.',
    resumo:
      'O Laboratório de Experimentos é uma competição em tempo real: os alunos entram numa sala com um código de 4 letras, fazem a ação no computador (um atalho de teclado, por exemplo) e depois respondem o que aconteceu, sem precisar escrever. O ranking aparece no telão.',
    ficha: [
      ['Para quem', NIVEL],
      ['Formato', 'Competição ao vivo; o professor cria a sala e a turma entra com o código'],
      ['Perguntas', '55 perguntas em 6 temas: Windows, Arquivos e pastas, Teclado e texto, Word, Navegador e Pesquisa na internet'],
      ['Modos', 'Rodadas (uma tarefa por vez, com cronômetro) e Livre (cada um no seu ritmo)'],
      ['Pontos', 'Acertou +10; bônus de velocidade para os 3 primeiros que acertam; errou +2 pela participação'],
      ['Entrada do aluno', 'Código da sala e nome, sem senha'],
      ['Precisa de', REQUISITOS + '; um projetor ou TV para o telão'],
      ['Custo', 'Gratuito'],
    ],
    aprende: [
      'Atalhos de teclado e comandos do Windows',
      'Organizar arquivos e pastas',
      'Digitar e formatar texto, inclusive no Word',
      'Usar o navegador e pesquisar na internet',
    ],
    passos: [
      'O professor cria a sala, escolhe o tema e a quantidade de perguntas, e projeta o telão.',
      'Os alunos entram com o código da sala e o nome.',
      'Em cada tarefa, aparece só a instrução: o aluno faz no computador e aperta "Já fiz".',
      'Só então aparecem as opções do que aconteceu, embaralhadas para cada aluno.',
      'Vêm o resultado, a explicação e os pontos; no fim, o ranking no telão.',
    ],
    professor: [
      'As perguntas são de observação, algo que só quem fez a tarefa vê na tela, então não dá para acertar sem fazer.',
      'O painel tem PIN próprio, mostra as respostas ao vivo e permite pausar, dar mais tempo e exportar em CSV.',
      'Se a página recarregar ou a internet cair, o aluno volta para a mesma sala com os mesmos pontos.',
      'As tarefas podem ser editadas no painel ou no arquivo tasks.json.',
    ],
    faq: [
      ['O aluno precisa escrever alguma coisa?', 'Não. Ele faz a ação no computador e depois escolhe uma opção do que aconteceu.'],
      ['Dá para jogar uma nova partida com perguntas diferentes?', 'Sim. "Nova partida com perguntas novas" mantém os alunos na sala, zera os pontos e sorteia perguntas que a sala ainda não viu.'],
    ],
  },
];

/** Página "Como usar", também o destino do cabeçalho Link rel="service-doc" */
const COMO_USAR = {
  slug: 'como-usar',
  caminho: '/como-usar',
  titulo: 'Como usar as atividades de informática em sala de aula',
  descricao:
    'Guia rápido para aplicar as atividades gratuitas de informática com o 6º ao 9º ano: o que cada uma ensina, o que precisa e como o aluno entra.',
  resumo:
    'As atividades rodam no navegador, são gratuitas e não exigem instalação. O professor escolhe uma, passa o endereço para a turma e cada aluno abre no próprio computador; o aluno entra com nome e turma, com um @ ou com o código de uma sala, conforme a atividade.',
  preparo: [
    'Computadores com Chrome ou Edge e acesso à internet. A Oficina de PCs também tem versão para baixar que roda sem internet.',
    'Para a Operação Word, prefira Chrome ou Edge: ao começar uma missão o site entra em tela cheia e trava o teclado para que Ctrl+N e Ctrl+T não abram janela ou aba do navegador.',
    'Para o Laboratório de Experimentos, um projetor ou TV para o telão com o ranking.',
  ],
  sugestoes: [
    'Combine uma atividade por aula e deixe os minutos finais para a turma contar o que descobriu.',
    'No Escape Room e no Monte o PC Ideal, deixe a turma pesquisar em duplas: a conversa sobre a resposta faz parte do aprendizado.',
    'Na Operação Word, comece pela missão guiada e deixe a turma usar a Central: o "Mostre-me" ajuda quem se perde sem parar a aula.',
    'Use o Laboratório de Experimentos como fechamento: um tema, 10 perguntas e o ranking no telão.',
  ],
  faq: [
    ['As atividades são gratuitas?', 'Sim. O uso é gratuito e não exige instalação.'],
    ['Os alunos precisam de e-mail?', 'Não. Dependendo da atividade, o aluno informa nome e turma, cria um @ (Operação Word) ou usa o código da sala (Laboratório de Experimentos). O Robô na Horta e a Oficina de PCs não pedem nada.'],
    ['Para qual ano servem?', `As atividades foram pensadas para o ${NIVEL}.`],
    ['Funciona em computador antigo?', 'O Robô na Horta foi feito para rodar em máquinas modestas, sem placa de vídeo. As demais usam apenas o navegador.'],
    ['Existe relação com a BNCC?', 'As atividades dialogam com os eixos do Complemento à BNCC – Computação: Pensamento Computacional (Robô na Horta), Mundo Digital (hardware, Monte o PC e Oficina) e Cultura Digital (Escape Room, Operação Word e Laboratório).'],
  ],
};

const HOME = {
  titulo: 'Atividades de informática para o 6º ao 9º ano',
  descricao:
    'Jogos e atividades gratuitas de informática para o 6º ao 9º ano: montar PC, lógica com blocos, Word, escape room e laboratório ao vivo. Direto no navegador.',
  faq: [
    ['O que é o Atividades da Turma?', 'É um conjunto de atividades gratuitas de informática para o 6º ao 9º ano, em formato de jogo, que rodam direto no navegador.'],
    ['Precisa instalar alguma coisa?', 'Não. Basta um computador com Chrome ou Edge e internet; a Oficina de PCs também tem versão offline para baixar.'],
    ['Os alunos precisam criar conta?', 'Não há conta com e-mail ou senha. Conforme a atividade, o aluno informa nome e turma, cria um @ ou usa o código de uma sala.'],
  ],
};

module.exports = { SITE, EIXOS, ATIVIDADES, COMO_USAR, HOME, NIVEL };
