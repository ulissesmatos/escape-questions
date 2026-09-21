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

## Como rodar

```
cp .env.example .env        # ajuste ADMIN_PASSWORD
docker compose up -d        # PostgreSQL local na porta 5433
npm install
npm start                   # http://localhost:3000
npm test                    # testes automatizados
npm run empacotar           # gera a versão da Oficina para baixar
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
public/
  css/                        → base, components, questions + um arquivo por página
  js/core/                    → Component, dom (h), ApiClient, ScreenFlow,
                                HashRouter, SafeStorage, Money
  js/components/              → SiteHeader, IdentityForm, Modal, SortableList, ui
  js/questions/               → views de pergunta (espelham src/questions)
  js/pages/escape|hardware|pcbuild/
  js/admin/                   → AdminApp, sessão, seções/abas, editores de pergunta
  fonts/                      → DotGothic16 (fonte do jogo; licença OFL junto)
tools/empacotar-oficina.js    → gera a versão da Oficina para baixar (arquivo único)
test/                         → node:test (tipos de pergunta, motor adaptativo, detector de chute, regras da Oficina)
docs/oficina-sprites.md       → como gerar a arte do jogo no ChatGPT (+ gabaritos em docs/oficina-gabaritos)
docs/oficina-expansao.md      → proposta do loop de gameplay e das próximas fases do jogo
```

## Oficina de PCs (jogo)

O jogo é dividido em duas camadas:

- **Regras** (`public/js/pages/oficina/regras/`), em JavaScript puro, sem
  Phaser, testadas com `node:test`:
  - `catalogo.js`: peças e atributos (socket, DDR4/DDR5, TDP, watts, formato,
    comprimento, preço).
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

## Deploy no Coolify

1. **Banco:** + New Resource → Database → PostgreSQL. Copie a connection
   string interna.
2. **Aplicação:** + New Resource → Application, apontando para este
   repositório, com Build Pack `Dockerfile` e porta `3000`.
3. **Variáveis:** `DATABASE_URL` (do passo 1) e `ADMIN_PASSWORD` (senha forte).
   `SESSION_SECRET` é opcional.
4. **Deploy.** O servidor cria e atualiza as tabelas sozinho.

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
