# Atividades da Turma

Site com atividades de informática para alunos do 6º ao 9º ano, acessadas a
partir de um hub inicial (`/`). Todo o conteúdo fica no banco (PostgreSQL) e o
professor gerencia tudo pela área `/admin.html`.

- **Escape Room** (`/escape-room.html`): pistas de pesquisa (palavra + dígito,
  múltipla escolha ou verdadeiro/falso). O envio é único e corrigido no
  servidor; o aluno não vê a nota, só o professor.
- **Mapa de Hardware** (`/hardware.html`): o aluno descobre as peças do
  computador em 3 níveis. Cada peça tem um banco de perguntas **adaptativo**:
  a dificuldade sobe para quem acerta rápido e em sequência e desce para quem
  erra. Há também proteção contra chute (detalhes abaixo).
- **Monte o PC Ideal** (`/monta-pc.html`): o aluno escolhe um cliente, pesquisa
  peças reais em lojas, monta a proposta dentro do orçamento e justifica a
  compatibilidade. Não há gabarito: o professor revisa e dá feedback.
- **Oficina de PCs** (`/oficina.html`): jogo 2D em pixel art feito com
  [Phaser 4](https://phaser.io). O aluno atende clientes e monta o PC na
  bancada arrastando as peças, com skill checks: encaixar o processador
  (levantar a alavanca, alinhar e descer no centro do socket), dosar a pasta
  térmica, parafusar o cooler em X e ligar os cabos. Depois fecha a tampa e liga
  o PC: o BIOS reconhece as peças, o sistema inicia (mais rápido com SSD) e roda
  um teste de estresse. Peça incompatível tem consequência: socket errado ou
  processador torto entortam os pinos, sem pasta o PC superaquece e fonte fraca
  desliga no teste. O primeiro pedido é um tutorial guiado; os seguintes são
  livres, com estrelas e moedas. Tem música, efeitos sonoros e tela cheia.
- **Robô na Horta** (`/horta.html`): lógica com blocos de montar, sem falar em
  programação. O aluno monta o "plano do robô" (andar, virar, colher, plantar,
  regar, repetir, "se", "repita até") e o robô executa na horta em pixel art.
  São 23 fases em 5 mundos; o mundo 3 ensina, aos poucos, o Repita dentro do
  Repita. A partir do mundo 4 a horta é sorteada e o mesmo plano precisa
  funcionar em 3 hortas, então decorar o caminho não resolve.
- **Operação Word** (`/word.html`): um computador simulado (Windows 11 + Word
  2019 em português) com 20 missões de agente secreto, do básico ao
  intermediário. O aluno cria um @ e entra só com ele (sem senha); a Central
  guia, percebe quando ele se perde e mostra onde clicar. Detalhes abaixo.
- **Laboratório de Experimentos** (`/laboratorio`): competição em tempo real
  (Socket.IO). Os alunos entram numa sala com um código de 4 letras, fazem a
  ação no computador (atalhos de teclado) e depois respondem o que aconteceu,
  sem precisar escrever nada. O professor controla pelo painel com PIN e
  projeta o ranking no telão. Detalhes abaixo.

## Como rodar

```
cp .env.example .env        # ajuste ADMIN_PASSWORD
docker compose up -d        # PostgreSQL local na porta 5433
npm install
npm start                   # http://localhost:3000
npm test                    # testes automatizados
npm run empacotar           # gera a versão da Oficina para baixar
npm run og                  # gera as imagens de compartilhamento (precisa do Chrome ou Edge)
```

As tabelas são criadas e populadas automaticamente na primeira execução
(pistas, níveis, peças, conexões, banco de perguntas e missões). Bancos já
existentes são atualizados sem perder dados: o progresso antigo dos alunos
continua valendo.

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão com o PostgreSQL |
| `ADMIN_PASSWORD` | Senha da área do professor |
| `PORT` | Porta HTTP (padrão 3000) |
| `SESSION_SECRET` | Opcional. Assina a sessão do professor (se vazio, é derivado da senha) |
| `ADMIN_SESSION_HOURS` | Opcional. Duração da sessão (padrão 12h) |
| `PROFESSOR_PIN` | PIN do painel do Laboratório (se vazio, usa o `ADMIN_PASSWORD`) |
| `SITE_URL` | Endereço público do site, sem barra no final (padrão `https://escape.nuveasy.com`). Vai para canonical, sitemap, Open Graph, llms.txt e JSON-LD |

## Arquitetura

Sem framework de front-end e sem etapa de build: o navegador carrega módulos
ES nativos, e o servidor é Express. O código é orientado a objetos, com uma
classe base para cada conceito e subclasses para as variações.

```
server.js                     → só inicia a aplicação (src/app.js)
src/
  app.js                      → monta dependências e rotas (injeção de dependência)
  config.js
  db/Database.js              → pool + transaction()
  db/schema.js                → criação/atualização idempotente das tabelas
  http/HttpError.js, routing.js
  http/TableResource.js       → CRUD genérico; recursos do admin herdam dele
  auth/AdminAuth.js           → login com token HMAC + limite de tentativas
  questions/                  → tipos de pergunta (servidor)
    QuestionType.js           → base: validar, instanciar (sorteio), corrigir
    MultipleChoiceType.js, TrueFalseType.js (herda de MultipleChoice),
    TextAnswerType.js, NumericSliderType.js, OrderingType.js,
    AnagramType.js, MatchingType.js, QuestionTypeRegistry.js
  modules/
    escape/                   → serviço, rotas, seed e recursos do admin
    hardware/                 → AdaptiveEngine, GuessGuard, HardwareGameService,
                                HardwareRepository, HardwareSeeder, seed/, admin/
    pcbuild/                  → serviço, rotas, seed e recursos do admin
    admin/                    → rotas do painel e resumo geral
  seo/                        → páginas públicas para buscadores e IAs (ver "SEO e GEO")
public/
  css/                        → base, components, questions + um arquivo por página
  js/core/                    → Component, dom (h), ApiClient, ScreenFlow,
                                HashRouter, SafeStorage, Money
  js/components/              → SiteHeader, IdentityForm, Modal, SortableList, ui
  js/questions/               → views de pergunta (espelham src/questions)
  js/pages/escape|hardware|pcbuild/
  js/admin/                   → AdminApp, sessão, seções/abas, editores de pergunta
  fonts/                      → DotGothic16 (fonte do jogo; licença OFL junto)
  modules/laboratorio/         → Laboratório: Sala (regras e pontos), LaboratorioService
                                (salas, relógio, salvamento), laboratorioSocket (tempo real),
                                rotas (PIN e editor), nomes.js (filtro), tasks.json
  js/pages/laboratorio/       → aluno/, professor/, telao/ + Conexao e comum (teclas, cronômetro, ranking)
tools/empacotar-oficina.js    → gera a versão da Oficina para baixar (arquivo único)
test/                         → node:test (tipos de pergunta, motor adaptativo, detector de chute, regras da Oficina,
                                do Robô na Horta, do Laboratório e da Operação Word, e uma partida real com 30 alunos via Socket.IO)
docs/oficina-sprites.md       → como gerar a arte do jogo no ChatGPT (+ gabaritos em docs/oficina-gabaritos)
docs/oficina-expansao.md      → proposta do loop de gameplay e das próximas fases do jogo
```

## Operação Word (simulador de Windows e Word)

O aluno aprende o Word num computador de mentira que se comporta como o de
verdade: Área de Trabalho, menu Iniciar, barra de tarefas, Explorador de
Arquivos, Lixeira, Bloco de Notas e o Word (faixa de opções, menu Arquivo,
botão direito, mini barra, caixas de diálogo, atalhos). Ao lado fica a
**Central**, com a história, os objetivos e a ajuda.

### Entrar com o @

- **Criar meu @:** nome, turma e o @ (3 a 20 letras, números, ponto ou _). O
  site confere na hora se está livre e sugere ideias a partir do nome
  (`@ana.souza`, `@ana7b`...). Palavrões e nomes reservados são barrados no
  servidor (mesmo filtro do Laboratório).
- **Já tenho meu @:** só digitar o @. Não há senha (decisão de projeto: o @
  basta para continuar de onde parou). O navegador lembra o último @.
- O progresso fica no servidor (`word_contas`, `word_progresso`) e vale em
  qualquer computador. Se a internet cair no meio da aula, a conclusão fica
  guardada no navegador e é reenviada depois.

### Missões (5 capítulos, 20 missões)

| Capítulo | Missões |
| --- | --- |
| 1. Recruta | Primeiro acesso (guiada) · Mensagem interceptada · Coordenadas secretas · Apagando rastros |
| 2. Disfarce (fonte) | Palavras-chave · Cartaz · Alerta vermelho (cor, realce, pincel) · Mensagem gritada (Aa, limpar formatação) |
| 3. Organização (parágrafo) | Comunicado (alinhamento) · Kit do agente (listas) · Relatório no padrão (recuo 1,25 cm, 1,5 linha) · Dossiê (estilos, Painel de Navegação) |
| 4. Provas (inserir) | Foto de prova · Lista de suspeitos (tabela) · Dossiê em páginas (quebra, cabeçalho, nº de página) · Sumário automático |
| 5. Missão final | Código trocado (substituir tudo, localizar) · Mensagem com erros (ortografia, contar palavras) · Mapa da operação (paisagem, margens, colunas) · Relatório final (PDF) |

Cada missão começa com um briefing ("Nesta missão você vai aprender", com
onde fica e o atalho) e termina com as estrelas e o resumo do que o aluno
aprendeu. Do capítulo 2 em diante o documento já abre sozinho, para o foco ser
o assunto novo. O **Manual do Agente** reúne tudo o que o aluno já aprendeu, e
o **Treino livre** é o computador sem objetivos.

**Estrelas:** 3 sem pedir ajuda (ou com uma dica), 2 com pouca ajuda, 1 com
muita. A primeira missão (guiada) sempre vale 3. A missão seguinte libera
quando a anterior é concluída; em `/admin.html` → Operação Word o professor
pode liberar todas.

### Ajuda na medida certa

- **Dica:** a pista em texto do objetivo atual.
- **Mostre-me:** escurece a tela de leve e acende o lugar exato, com um balão
  ("Clique na guia Inserir", "Selecione ALFA-7..."). Cada passo do caminho
  sabe quando já foi feito (cursor dentro da palavra, Pincel ligado, campo
  preenchido, arquivo recortado...), e o guia anda em ordem até o primeiro
  passo que falta. Ex.: Pincel de Formatação = 1º clique em PERIGO, 2º clique
  no Pincel, 3º "pinte" CUIDADO. Se o aluno bagunçou a tela, ele resolve antes
  o que estiver no caminho: abre o Word, traz a janela para frente, fecha o
  menu Arquivo ou a janela que está na frente, troca de guia, rola a faixa até
  o botão escondido, leva até a pasta onde o arquivo está.
  Na missão 1 ele fica ligado do começo ao fim.
- **Detector de "perdido"** (`regras/Detector.js`): conta as ações que não
  levam a lugar nenhum (abrir e fechar menus, trocar de guia, cancelar
  janelas, clicar em botões que não ajudam) e o tempo sem avançar. Com 5 ações
  ou ~1 minuto, oferece a pista; com 9, mostra a pista sozinho; com 14 (ou
  ~4 minutos), liga o Mostre-me. Também percebe padrões: trocar de guia várias
  vezes seguidas ("O que você precisa está na guia Página Inicial") e repetir
  o mesmo comando. Avançar (cumprir um objetivo ou dar um passo do caminho)
  zera a contagem. O professor vê quantas vezes cada aluno se perdeu.
- **Erros conhecidos**, explicados na hora: formatação aplicada na palavra
  errada ou sem nada selecionado, arquivo salvo com outro nome ou na pasta
  errada, "Quase! Confira letra por letra", Enter várias vezes em vez de
  quebra de página, copiar em vez de mover, digitar sem nenhum programa
  aberto, e as armadilhas dos atalhos em português (Ctrl+B salva, Ctrl+A abre,
  Ctrl+S sublinha).

### Atalhos e tela cheia

Os atalhos são os do Word em português: **Ctrl+N** negrito, **Ctrl+S**
sublinhado, **Ctrl+B** salvar, **Ctrl+T** selecionar tudo, Ctrl+E/G/Q/J
alinhamento, Ctrl+L localizar, Ctrl+U substituir, Ctrl+Enter quebra de página,
Shift+F3 maiúsculas, F7 ortografia, F12 salvar como (no Bloco de Notas e no
Explorador valem os do Windows: Ctrl+A, Ctrl+C, F2, Delete). Ao começar uma
missão o site entra em tela cheia e trava o teclado (Keyboard Lock do
Chrome/Edge), para Ctrl+N e Ctrl+T não abrirem janela ou aba do navegador.
Também funciona o que o Laboratório ensina: `=rand()`, `1. ` virando lista
numerada, Ctrl + roda do mouse para o zoom e a grade da tabela.

### Código

```
public/js/pages/word/
  main.js                 → entrada → base → missão (tela cheia)
  app/                    → Sessao (o @ e o progresso), TelaEntrada, TelaBase (missões,
                            briefing, Manual), TelaMissao (confere objetivos, roteiro, ajuda)
  regras/                 → sem tela, testadas com node:test
    missoes.js            → capítulos, missões, arquivos iniciais, estrelas
    objetivos.js          → fábricas de objetivo: verificar, dica, caminho do Mostre-me, diagnóstico
    conceitos.js          → o que se aprende (briefing e Manual do Agente)
    Detector.js           → detector de "perdido"
    SistemaDeArquivos.js  → pastas, Lixeira, renomear/mover/restaurar com as regras do Windows
    ortografia.js, arroba.js
  ajuda/                  → Central (painel), Guia (Mostre-me), Holofote
  sistema/                → o computador: Simulador, Janela, AreaDeTrabalho, BarraDeTarefas,
                            MenuIniciar, MenuDeContexto, Dialogo, DialogoDeArquivo, apps/
    word/                 → Word, Faixa (faixa de opções), Backstage (Arquivo), Documento
                            (motor de edição), Formatacao, Paginas, Historico, Inspetor, dialogos
src/modules/word/         → ContasWord (contas, progresso, área do professor), rotas, regras do @
```

O motor do Word guarda o texto em trechos "planos" (um `span` com o estilo
inteiro de cada pedaço): formatar corta a seleção, aplica a mudança e
reconstrói o parágrafo. Assim ligar e desligar negrito, cor etc. funciona em
qualquer mistura, e os objetivos leem o estilo como o aluno vê
(`Inspetor.js`). A página tem tamanho real (A4, margens do Word em português:
2,5 cm e 3 cm), com quebra automática e manual de página, cabeçalho, rodapé e
número de página.

**Nova missão:** adicione em `MISSOES` (`missoes.js`) com os arquivos do
computador, o documento que abre (opcional) e os objetivos (use as fábricas de
`objetivos.js`; cada uma já traz dica, caminho do Mostre-me e diagnósticos).
O teste confere que toda missão tem objetivos com dica e caminho e que os
conceitos existem. `?tudo` libera todas as missões para testar.

**Robô do Mostre-me** (`tools/robo-word/`): confere de verdade, no Chrome, que
todo caminho do Mostre-me leva até o fim. Em cada missão ele primeiro age como
um aluno que clica em tudo (troca de guia, deixa o menu Arquivo aberto, abre o
Iniciar, minimiza o Word, abre o Explorador ou o Edge por cima, seleciona
palavras ao acaso) e depois faz só o que o Mostre-me acende. Se o guia travar
num passo ou apontar para o nada, a missão falha e a foto da tela fica em
`<pasta temporária>/robo-word/fotos`. Rode depois de mudar uma missão:

```
npm start                          # em outro terminal
npm run robo:word                  # todas as missões (semente 7)
npm run robo:word -- cartaz 13     # uma missão, outra bagunça
```

Ele cria a conta `@robo.caos` no banco (pode apagar na área do professor).
`CHROME` aponta outro navegador (ex.: o Edge) e `ROBO_URL` outro endereço.

### Área do professor (Operação Word)

- **Alunos:** cada @ com nome e turma, missões concluídas, estrelas, ajudas,
  vezes que se perdeu e a missão em que está. No detalhe, cada missão com
  tentativas, melhor tempo, ajuda usada e **o documento que o aluno entregou**
  (do jeito que ele formatou). Dá para editar o @, o nome e a turma, zerar o
  progresso, excluir e exportar CSV. O interruptor "Liberar todas as missões"
  vale na hora para todos.
- **Missões:** o currículo por capítulo e, por missão, quantos começaram e
  concluíram, estrelas e ajuda em média, quantos se perderam e o tempo médio.

### Ícones

Os ícones são os reais, baixados por `node tools/baixar-icones-word.js` (o
resultado fica no git): os da faixa de opções e do Windows são os **Fluent UI
System Icons** e os **Fluent Emoji** da Microsoft (licença MIT); os logotipos
do Word, Windows, Bloco de Notas e Edge vêm do Wikimedia Commons (marcados
como domínio público; continuam sendo marcas da Microsoft e aparecem só para
o aluno reconhecer os programas). As fotos da pasta Imagens são desenhos do
próprio projeto (`public/images/word/arquivos`).

## Robô na Horta (jogo de blocos)

O jogo tem tela própria, sem o menu do site, ocupando a tela toda: uma barra
de madeira em cima (Sair, fases, estrelas, som e tela cheia) e, embaixo, a
horta, os blocos e o plano lado a lado. Em 1024×768 fica em duas colunas, e
no celular numa só.

Feito para rodar bem em computadores antigos: Canvas 2D sem WebGL, sem
biblioteca e sem imagens (a pixel art é desenhada por código). O chão só é
redesenhado quando uma casa muda, e com o jogo parado a tela se atualiza poucas
vezes por segundo. Com a CPU 6× mais lenta e sem placa de vídeo, a animação
fica em 60 fps.

- **Regras** (`public/js/pages/horta/regras/`), em JavaScript puro, testadas
  com `node:test`:
  - `Horta.js`: a grade, o robô, os sensores (planta madura, com sede, terra
    vazia, pedra na frente, celeiro) e as ações. Ação errada para o robô com uma
    mensagem para o aluno, por exemplo "Essa planta ainda está verde!".
  - `blocos.js`: catálogo dos blocos e das perguntas, com o texto que o aluno
    vê.
  - `Interpretador.js`: executa o plano como um gerador, um evento por vez, e
    a tela anima cada um. A "bateria" do robô impede que um "Repita até" sem
    fim trave o jogo.
  - `fases.js`: mundos, fases, geradores das hortas sorteadas e cálculo das
    estrelas (completar, usar no máximo a meta de blocos e pegar as moedas).
    Cada fase tem uma solução de referência (`solucao`), e pode ter
    `memoria` (limite de blocos, para obrigar o Repita; só vale quando o
    professor liga a memória no painel) e `planoInicial` (plano já começado). O número na tela ("3-2") vem da posição; o `id`
    guarda o progresso e não muda.
  - `padroes.js`: o detector de repetição (percebe o mesmo pedaço várias vezes
    seguidas e sugere um Repita, ou um Repita dentro de outro) e o esqueleto
    da solução usado na dica.
- **Jogo** (`public/js/pages/horta/jogo/`): `Desenho.js` (canvas),
  `EditorDeBlocos.js` (clicar para adicionar, arrastar para mover, soltar fora
  para jogar fora), `TelaFase.js`, `TelaMapa.js`, `sons.js` (usa o sintetizador
  da Oficina) e `Progresso.js`.
- **Ajudas para o Repita:** o bloco Repita mostra "volta 2 de 4" enquanto o
  robô roda (com Repita dentro de Repita, os dois contadores andam juntos); o
  caminho fica pintado com uma cor por volta do Repita de fora; o botão "Pôr
  tudo num Repita" embrulha o plano inteiro; e, depois de 2 tentativas
  erradas, o botão 💡 Dica mostra o caminho pintado na horta e depois a forma
  do plano (só os Repita).
- **Memória do Bip:** começa desligada (o aluno conclui a fase de qualquer
  jeito e o robô sugere o Repita para a estrela da meta). Em
  `/admin.html` → Robô na Horta, o professor liga ou desliga para todos; a
  escolha fica no banco (`configuracoes`) e o jogo lê em `GET /api/horta/config`.
  A área do professor também mostra a resposta de cada fase com 3 estrelas.
- **Progresso:** fica no navegador (estrelas e o último plano de cada fase).
  `horta.html?tudo` libera todas as fases para o professor conhecer o jogo.
- **Nova fase:** adicione em `FASES` (`fases.js`) com um mapa fixo ou um
  gerador e a `solucao` de referência. O teste confere se ela funciona em 40
  sorteios, cabe na memória, fica dentro da meta e pega as moedas; nos mundos 2
  e 3 confere também que sem Repita o plano não cabe na memória.

## Oficina de PCs (jogo)

O jogo é dividido em duas camadas:

- **Regras** (`public/js/pages/oficina/regras/`), em JavaScript puro, sem
  Phaser, testadas com `node:test`:
  - `catalogo.js`: peças e atributos (socket, DDR4/DDR5, TDP, watts, formato,
    comprimento, preço). Placas-mãe, processadores e memórias usam modelos
    reais: AMD AM4 e AM5, Intel LGA1700 (com placas DDR4 e DDR5) e LGA1851.
    Cada processador diz se tem vídeo integrado (o "G" da AMD e o "F" da
    Intel). A quantidade de slots segue o desenho da placa no jogo; um teste
    confere isso e se toda peça tem um par compatível.
  - `encaixes.js`: um `Encaixe` por lugar da montagem (socket, slots, baias).
    Cada subclasse define ordem, compatibilidade (recusa ou dano) e skill check.
  - `Montagem.js`: estado do PC na bancada e ações (encaixar, remover, cabos,
    tampa).
  - `SimuladorTeste.js`: o que acontece ao ligar (sem energia, bipes, sem vídeo,
    fonte fraca, temperatura).
  - `pedidos.js`: clientes e requisitos (classes `Requisito`) e a avaliação por
    estrelas.
- **Jogo** (`public/js/pages/oficina/jogo/`), em Phaser 4: cenas (carregamento,
  menu, oficina), vistas (placa-mãe e gabinete), bandeja, skill checks (encaixe
  do processador com alavanca, pasta, parafusos, cabos), tela de ligar o PC
  (BIOS, sistema, teste de estresse, desempenho), resultado e tutorial.
- **Som** (`jogo/audio/`): efeitos e músicas sintetizados na hora com Web Audio
  (sem arquivos). Efeitos em `efeitos.js`, músicas escritas como texto em
  `faixas.js`. Música e efeitos podem ser desligados no jogo, e a escolha fica
  salva. Tecla F ou o botão no topo ligam a tela cheia.

O Phaser é servido direto do `node_modules` em `/vendor/phaser` (versão fixada
no `package.json`), sem etapa de build. O progresso do jogo fica salvo no
navegador do aluno.

- **Arte:** peças sem imagem são desenhadas por código em pixel art. Para usar
  arte própria, siga `docs/oficina-sprites.md`.
- **Zonas de encaixe:** calibre sobre a arte no editor visual
  (`/oficina-zonas.html`, rodando localmente). Ele grava as diferenças em
  `public/images/oficina/zonas.json`, que o jogo aplica ao abrir. A geometria
  das peças montadas (`sprites/colocacao.js`) é a mesma no jogo e no editor.
- **Novo pedido:** adicione um item em `PEDIDOS` (`pedidos.js`) com fala,
  requisitos e recompensa.
- **Nova peça:** adicione em `PECAS` (`catalogo.js`) e, se usar um sprite novo,
  em `SPRITES` (`manifesto.js`).
- **Depuração:** `oficina.html?zonas=1` mostra as zonas de encaixe (ciano) e as
  áreas de soltar (rosa); `oficina.html?teste` expõe o jogo em
  `window.jogoOficina` para testes.

### Versões para baixar (rodam offline)

Duas formas de levar o jogo para o computador, ambas sem internet e sem instalar
nada. Na página da Oficina, cada botão só aparece se o arquivo existir; no
deploy, a primeira etapa do `Dockerfile` gera os dois.

```
npm run empacotar        → arquivo único .html (qualquer sistema)
npm run empacotar:exe    → aplicativo do Windows (.exe), em zip
```

| Saída | O que é |
| --- | --- |
| `dist/oficina-de-pcs.html` | O jogo inteiro (2,4 MB) num arquivo só: jogo, arte e fonte embutidos (esbuild). Abre com dois cliques no navegador. |
| `dist/windows/` | Aplicativo pronto para testar: `Oficina de PCs.exe` + `resources.neu` + LEIA-ME |
| `dist/oficina-de-pcs-windows.zip` | O mesmo aplicativo zipado (2,4 MB), para compartilhar |
| `public/downloads/` | Cópias que o site oferece como download |

O aplicativo do Windows usa o [Neutralino](https://neutralino.js.org): uma janela
nativa que mostra o jogo pelo WebView2 (o motor do Edge, que já vem no Windows 10
e 11). Por isso ele fica em ~5 MB e ~25 MB de memória, em vez dos ~150 MB de um
Electron. O progresso fica salvo no próprio computador.

### Como adicionar um tipo de pergunta novo

1. Servidor: crie uma classe que estende `QuestionType` (`validarConteudo`,
   `montar`, `corrigir`, `descreverResposta`) e registre em
   `QuestionTypeRegistry.js`.
2. Aluno: crie uma view que estende `QuestionView` (`renderResposta`,
   `obterResposta`) e registre em `QuestionViewFactory.js`.
3. Professor: crie um editor que estende `QuestionEditor` (`renderizarCampos`,
   `lerCampos`) em `QuestionEditors.js`.

O resto do sistema (desafios, correção, histórico, pré-visualização) já
funciona com o tipo novo.

## Mapa de Hardware: perguntas adaptativas

### Tipos de pergunta

| Tipo | Como o aluno responde | Variação a cada vez |
| --- | --- | --- |
| Múltipla escolha | Escolhe 1 alternativa | Sorteia 1 certa + erradas de um banco e embaralha |
| Verdadeiro ou falso | Julga uma afirmação | Sorteia entre afirmações verdadeiras e falsas (50/50) |
| Resposta escrita | Digita | Ignora acento e maiúsculas; tolera pequeno erro de digitação em palavras longas |
| Número (slider) | Arrasta até o valor | Posição inicial sorteada longe da resposta |
| Colocar em ordem | Arrasta os itens (ou usa ↑ ↓) | Ordem inicial embaralhada |
| Palavra embaralhada | Toca nas letras (ou digita) | Letras embaralhadas |
| Ligar pares | Toca num item de cada coluna | Sorteia alguns pares do banco e embaralha as colunas |

Qualquer tipo aceita **variações** (`conteudo.variantes`): versões da mesma
pergunta com respostas diferentes, por exemplo "8 GB têm quantos MB?" e
"16 GB têm quantos MB?". O banco inicial tem 130 perguntas (5 por peça, da
dificuldade 1 à 5).

### Dificuldade adaptativa (`AdaptiveEngine`)

Cada aluno/grupo tem uma habilidade entre 1 e 5, parecida com o rating Elo do
xadrez:

- **Acertou:** sobe. Sobe mais se a pergunta estava acima do nível dele, se
  respondeu rápido (mas depois do tempo mínimo de leitura) ou se tem 3 ou
  mais acertos seguidos.
- **Errou:** desce. Desce mais se a pergunta era fácil para o nível dele ou se
  errou várias seguidas.
- A próxima pergunta é escolhida perto da habilidade atual, evitando repetir
  as que o aluno já viu e a última que ele recebeu.

### Proteção contra chute (`GuessGuard`)

Tudo é medido no servidor, então não dá para burlar pelo navegador:

1. **Gabarito nunca vai para o navegador.** Cada pergunta sorteada vira um
   desafio com ids opacos; a posição da resposta muda para cada aluno.
2. **Pergunta queimada.** Cada desafio aceita uma única resposta. Errou, vem
   outra pergunta ou outra versão, então não dá para testar as 4 opções.
3. **Tempo mínimo de leitura**, estimado pelo tamanho do texto (~660
   palavras/min, bem acima da leitura atenta) mais o tempo de interagir.
   Errar antes disso conta como "rápido demais". Acertar antes disso vale para
   quem não tem chutes recentes (benefício da dúvida para quem lê rápido e
   sabe), mas quase não sobe a dificuldade.
4. **Pausa curta** (20s, dobrando até 2 min) só quando há 3 ou mais respostas
   rápidas erradas em 3 minutos. Erros com tempo normal de leitura nunca geram
   pausa.

Além disso, o servidor confere se o nível e a peça estão liberados antes de
entregar uma pergunta.

## Laboratório de Experimentos

| Endereço | Para quem |
| --- | --- |
| `/laboratorio` | Aluno: código da sala + nome (aceita `?sala=ABCD`) |
| `/laboratorio/professor` | Professor: PIN, criar sala, controlar a partida |
| `/laboratorio/telao/ABCD` | Telão para projetar (sem controles; tecla F = tela cheia) |

**Como funciona cada tarefa (sem escrever nada):**

1. **Faça:** aparece só a instrução, com as teclas em destaque. O botão "Já
   fiz" fica travado durante o tempo mínimo da tarefa (`tempoMinimo`), com
   contagem regressiva.
2. **Responda:** só agora aparecem as opções de "o que aconteceu?", numa ordem
   embaralhada para cada aluno (o vizinho não consegue soprar "é a B"). Uma
   resposta só.
3. **Resultado:** certo ou errado, a resposta certa, a explicação e os pontos.

As perguntas são de observação (algo que só quem fez vê na tela), para não dar
para acertar sem fazer. O servidor confere o tempo mínimo de novo ao receber a
resposta, e a resposta certa nunca vai para o navegador antes disso.

**Temas e sorteio:** são 55 perguntas em 6 temas (🪟 Windows, 📁 Arquivos e
pastas, ⌨️ Teclado e texto, 📝 Word, 🌐 Navegador, 🔎 Pesquisa na internet). Ao
criar a sala, o professor escolhe um tema ou 🎲 Misturado e quantas perguntas
sortear (padrão 10); no misturado os temas vêm alternados. Também dá para
escolher as perguntas a dedo. No fim da partida, "Nova partida com perguntas
novas" mantém os alunos na sala, zera os pontos e sorteia perguntas que a sala
ainda não viu. Quando o tema acaba, a lista recomeça pelas que saíram há mais
tempo.

**Modos:** *Rodadas* (o professor libera uma tarefa por vez, com cronômetro;
quando o tempo acaba ou todos os presentes respondem, aparece o ranking
parcial) ou *Livre* (todas liberadas, cada um no seu ritmo; o tempo mínimo
conta a partir de quando o aluno abre a tarefa).

**Pontos:** acertou +10; bônus de velocidade +5/+3/+1 para os 3 primeiros
**que acertarem**; errou +2 pela participação. Desempate: mais acertos, depois
menor tempo total (o tempo pausado não conta).

**Painel:** pausar/retomar, +1 minuto, encerrar a tarefa, respostas ao vivo
(quem respondeu, quem acertou e quantos escolheram cada opção), renomear ou
expulsar aluno, exportar CSV.

**Conexão:** o aluno recebe um token guardado no navegador; se a página
recarregar ou a internet cair, ele volta para a mesma sala com os mesmos pontos
(e não volta para a etapa "Faça" se já tinha passado dela). Quem entra
atrasado recebe a tarefa atual, com o tempo mínimo contando a partir da entrada. Nomes repetidos (ignorando acento e maiúsculas) e palavrões são
bloqueados (`src/modules/laboratorio/nomes.js`).

**Salas:** a partida roda em memória e é salva no PostgreSQL a cada 2 segundos
(tabela `lab_salas`), então um reinício ou deploy no meio da aula não perde
nada. Salas paradas há 12 horas são apagadas.

### Como editar as tarefas

- **Pelo painel** (botão "Tarefas"): editar, reordenar, criar e remover. Vale
  para as próximas salas (as abertas continuam como estavam) e fica salvo no
  banco. "Restaurar padrão" volta ao arquivo; "Baixar tasks.json" exporta.
- **No arquivo** `src/modules/laboratorio/tasks.json` (padrão do projeto):

```json
{
  "id": "desfazer",
  "categoria": "teclado",
  "titulo": "Desfazer",
  "instrucao": "No Bloco de Notas, escreva uma frase, apague tudo e aperte [Ctrl] + [Z].",
  "teclas": ["Ctrl + Z"],
  "tempoMinimo": 25,
  "pergunta": "Depois de apertar Ctrl + Z, o que apareceu no Bloco de Notas?",
  "opcoes": ["O texto que você apagou voltou", "Apareceu a letra Z", "Uma janela pedindo para salvar", "O Bloco de Notas fechou"],
  "correta": "a",
  "explicacao": "Ctrl + Z desfaz a última ação em quase todos os programas.",
  "notaProfessor": "opcional, só aparece no painel"
}
```

Teclas entre colchetes na instrução viram teclas desenhadas; `teclas` são os
atalhos mostrados em destaque; `categoria` é o tema (windows, arquivos,
teclado, word, navegador ou pesquisa); `tempoMinimo` são os segundos antes de poder
responder (padrão 15); `correta` é a letra da opção no arquivo (a, b, c ou d).
A ordem no arquivo não importa: cada aluno vê as opções embaralhadas.

## Área do professor (`/admin.html`)

- **Login:** senha oculta (com botão de mostrar), trocada por um token de
  sessão assinado. A senha não fica salva no navegador e o login é bloqueado
  por 1 minuto após 5 tentativas erradas.
- **Visão geral:** números por atividade, propostas aguardando revisão e
  atividade recente, com filtro por turma.
- **Escape Room:** respostas agrupadas por turma, com o detalhe de cada pista
  (certa ou errada, o que o aluno escreveu), exportação CSV e edição das
  pistas.
- **Mapa de Hardware:**
  - *Progresso dos alunos:* progresso por nível, desafio atual, taxa de
    acerto, respostas no chute e histórico completo de cada tentativa
    (pergunta, resposta, resposta certa, tempo). Dá para zerar o progresso de
    um aluno.
  - *Banco de perguntas:* questões por peça, cobertura de dificuldades,
    estatística de acerto, editor específico de cada tipo e pré-visualização
    exatamente como o aluno vê.
  - *Mapa e níveis:* editor visual (arraste as peças), peças, conexões e
    níveis, com avisos de peças inalcançáveis ou sem perguntas.
- **Monte o PC:** propostas filtráveis por turma, missão e situação, com
  feedback, "marcar como revisada" e CSV; cadastro das missões (orçamento
  aceita "2500", "2.500" ou "2.500,00").

## SEO e GEO (buscadores e assistentes de IA)

Os jogos são casquinhas em JavaScript ("Carregando..."): quem lê o site, seja o
Google ou um assistente de IA, não vê o que eles ensinam. Por isso há uma camada
de **páginas públicas em HTML**, geradas pelo servidor a partir de uma única
fonte de conteúdo, `src/seo/conteudo.js`.

| Endereço | O que é |
| --- | --- |
| `/` | O hub de sempre, com título, metadados, JSON-LD e a seção "Para professores" |
| `/atividades/<slug>` | Uma página por atividade: resumo, ficha, o que ensina, passos, FAQ |
| `/como-usar` | Guia para o professor (destino do `Link: rel="service-doc"`) |
| `/robots.txt`, `/sitemap.xml`, `/llms.txt` | Gerados da mesma lista de páginas |
| `<página>.md` ou `Accept: text/markdown` | A mesma página em Markdown, para agentes |
| `/horta.html`, `/horta`, ... | A casca do jogo, com `noindex` e Open Graph (o cartão do link no WhatsApp) |

- **Endereço do site:** a variável `SITE_URL`. Ao trocar de domínio, mude só ela;
  canonical, sitemap, llms.txt, Open Graph e JSON-LD acompanham.
- **Link headers:** a página inicial responde com `describedby` (llms.txt),
  `service-doc` (/como-usar) e `alternate` (Markdown). Não há `api-catalog`: as
  rotas `/api` são internas dos jogos, não uma API pública.
- **robots.txt:** libera tudo menos `/api/`, com `Content-Signal: search=yes,
  ai-input=yes` e os robôs de busca/leitura de IA liberados de forma explícita.
  `ai-train` fica sem sinal (neutro). As páginas com `noindex` não entram no
  robots de propósito: o robô precisa ler o `noindex`.
- **Nova atividade:** acrescente um item em `ATIVIDADES` (`conteudo.js`) e rode
  `npm run og`. Ela entra sozinha no sitemap, no llms.txt e na página inicial. Só
  aparece se o arquivo do jogo existir em `public/`.
- **Ao mudar o texto de uma atividade**, atualize também `atualizadoEm`.
- **Imagens de compartilhamento:** `npm run og` gera `public/images/og/*.png`
  (1200x630, fundo chapado para ficar leve; o WhatsApp só mostra prévia de
  imagem pequena).
- Os testes (`test/seo.test.js`) conferem tamanho de título e descrição,
  JSON-LD, links internos, Markdown, robots/sitemap e os cabeçalhos.

## Deploy no Coolify

1. **Banco:** + New Resource → Database → PostgreSQL. Copie a connection
   string interna.
2. **Aplicação:** + New Resource → Application, apontando para este
   repositório, com Build Pack `Dockerfile` e porta `3000`.
3. **Variáveis:** `DATABASE_URL` (do passo 1), `ADMIN_PASSWORD` (senha forte)
   e `PROFESSOR_PIN` (PIN do Laboratório). `SESSION_SECRET` é opcional.
   `SITE_URL` só precisa ser definida se o endereço público mudar.
4. **Deploy.** O servidor cria e atualiza as tabelas sozinho.

O tempo real usa WebSocket na mesma porta 3000; o proxy do Coolify já repassa
sem configuração extra (se o WebSocket for bloqueado, o Socket.IO cai para
long polling sozinho). Mantenha **uma réplica** da aplicação: as salas ficam
na memória do processo.

## Créditos das imagens

As fotos dos 11 componentes iniciais (`public/images/hardware/`) vêm do
Wikimedia Commons, sob licença Creative Commons ou domínio público:

| Componente | Arquivo original | Autor | Licença |
| --- | --- | --- | --- |
| Placa-mãe | [Computer-motherboard.jpg](https://commons.wikimedia.org/wiki/File:Computer-motherboard.jpg) | Marcin Wieclaw (pcsite.co.uk) | CC BY-SA 4.0 |
| Processador (CPU) | [Cpu-processor.jpg](https://commons.wikimedia.org/wiki/File:Cpu-processor.jpg) | Fx Mehdi | CC BY-SA 4.0 |
| Cooler | [AMD_Wraith_Spire_cooler.jpg](https://commons.wikimedia.org/wiki/File:AMD_Wraith_Spire_cooler.jpg) | Ilya Plekhanov | CC BY-SA 4.0 |
| Memória RAM | [RAM_Module_(SDRAM-DDR4).jpg](<https://commons.wikimedia.org/wiki/File:RAM_Module_(SDRAM-DDR4).jpg>) | ElooKoN | CC BY-SA 4.0 |
| Armazenamento (HD/SSD) | [Super_Talent_2.5in_SATA_SSD_SAM64GM25S.jpg](https://commons.wikimedia.org/wiki/File:Super_Talent_2.5in_SATA_SSD_SAM64GM25S.jpg) | Qurren | CC BY-SA 3.0 |
| Placa de vídeo (GPU) | [ATI_Radeon_HD_4890_Graphics_Card.jpg](https://commons.wikimedia.org/wiki/File:ATI_Radeon_HD_4890_Graphics_Card.jpg) | Advanced Micro Devices, Inc. (AMD) | Attribution |
| Monitor | [Computer_monitor.jpg](https://commons.wikimedia.org/wiki/File:Computer_monitor.jpg) | Zzubnik | Domínio público |
| Fonte de Alimentação | [ATX_Computer_power_supply_unit.jpg](https://commons.wikimedia.org/wiki/File:ATX_Computer_power_supply_unit.jpg) | Dmitry Makeev | CC BY-SA 4.0 |
| Gabinete | [Computer_case_-_Full_Tower.jpg](<https://commons.wikimedia.org/wiki/File:Computer_case_-_Full_Tower.jpg>) | Dmitry Makeev | CC BY-SA 4.0 |
| Teclado | [Standard_white_computer_keyboard.jpg](https://commons.wikimedia.org/wiki/File:Standard_white_computer_keyboard.jpg) | Autor desconhecido | Domínio público |
| Mouse | [Red_aopen_computer_optical_mouse.jpg](https://commons.wikimedia.org/wiki/File:Red_aopen_computer_optical_mouse.jpg) | Leon Brooks | Domínio público |
