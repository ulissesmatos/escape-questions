# Escape Room Digital

Site com três atividades para os alunos, acessadas a partir de um hub inicial
(`/`). Todo o conteúdo fica no banco (não no código) e o professor gerencia
tudo pela área `/admin.html`.

- **Escape Room** (`/escape-room.html`): os alunos respondem perguntas de três tipos —
  dígito (pesquisa + resposta numérica, como as pistas originais), múltipla
  escolha e verdadeiro/falso. As respostas são corrigidas automaticamente e
  salvas junto com o nome do aluno (ou do grupo) e a turma.
- **Mapa de Hardware** (`/hardware.html`): os alunos exploram um mapa de
  componentes de computador conectados entre si (ex: Placa-mãe → CPU → RAM →
  ...), organizado em **3 níveis sequenciais** (Componentes Básicos →
  Periféricos → Redes e Internet) — um nível só é liberado depois que o
  anterior é 100% descoberto. Em cada nível, só o nó inicial começa visível;
  acertar a pergunta de um componente libera os vizinhos conectados a ele no
  mapa. Cada componente tem um **banco de perguntas** (não só uma fixa) — uma
  é sorteada a cada clique, para dificultar decorar a resposta.
- **Monte o PC Ideal** (`/monta-pc.html`): sem gabarito e sem perguntas de
  múltipla escolha — o aluno escolhe uma **missão** (uma persona fictícia com
  uma necessidade e um orçamento fixo, ex: "Enzo quer jogar, orçamento
  R$ 2.500"), **pesquisa peças reais** em sites de loja de informática de
  verdade, e monta uma proposta de computador dentro do orçamento,
  justificando por que as peças escolhidas são compatíveis entre si. A
  correção é por critério, feita pelo professor (atendeu a necessidade? é
  compatível? coube no orçamento?), não automática.

Tudo roda em um banco PostgreSQL.

## Estrutura

- `server.js` — backend Express: API pública das perguntas (`/api/questions`,
  sem gabarito), correção e salvamento das respostas (`/api/submit`), API do
  mapa de hardware (`/api/hardware/*`, também sem gabarito), API do Monte o
  PC Ideal (`/api/pcbuild/*`, sem gabarito — não tem "certo ou errado"
  automático), e API de administração (`/api/admin/*`) para o CRUD de
  perguntas/componentes/níveis/missões e consulta das respostas/propostas.
  Cria as tabelas automaticamente se não existirem, semeia as 10 perguntas
  originais, os componentes iniciais do mapa de hardware e as 5 missões
  iniciais do Monte o PC na primeira execução (só se as tabelas estiverem
  vazias), e migra o mapa de hardware para o formato com níveis/banco de
  perguntas automaticamente (`expandirMapaHardwareParaNiveis()`) na primeira
  vez que sobe depois dessa mudança — sem apagar nada de quem já tinha o mapa
  antigo.
- `public/index.html` — hub inicial com os cards das atividades disponíveis
  (e futuras).
- `public/escape-room.html` + `public/script.js` — formulário do aluno do
  escape room, que busca as perguntas ativas em `/api/questions` e monta o
  formulário dinamicamente (campo de texto + dígito, ou múltipla escolha /
  verdadeiro-falso, conforme o tipo de cada pergunta).
- `public/hardware.html` + `public/hardware.js` — mapa de hardware do aluno:
  busca o mapa em `/api/hardware/mapa`, calcula quais componentes estão
  desbloqueados (com base nas conexões e no progresso salvo) e mostra a
  pergunta de cada componente clicado em um modal.
- `public/monta-pc.html` + `public/monta-pc.js` — Monte o PC Ideal do aluno:
  busca as missões em `/api/pcbuild/missoes`, monta o formulário de proposta
  (6 peças obrigatórias + itens extras opcionais, cada um com nome, preço
  pesquisado e link), calcula o total em tempo real comparando com o
  orçamento da missão, e envia tudo (peças + justificativa de compatibilidade)
  em `/api/pcbuild/submissoes`.
- `public/admin.html` — área do professor: abas para gerenciar as perguntas
  do escape room, ver as respostas salvas, gerenciar o mapa de hardware
  (componentes, conexões entre eles e progresso dos alunos), e gerenciar o
  Monte o PC Ideal (missões e propostas enviadas pelos alunos).
- `public/css/base.css` + `public/js/site-header.js` — design system e
  cabeçalho de navegação compartilhados entre o hub, o escape room, o mapa de
  hardware e o Monte o PC Ideal.
- `docker-compose.yml` — sobe um PostgreSQL localmente.
- `Dockerfile` — build da aplicação para deploy (ex: Coolify).

## Como rodar

### 1. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e ajuste a senha do professor:

```
DATABASE_URL=postgres://escaperoom:escaperoom@localhost:5433/escaperoom
ADMIN_PASSWORD=troque-esta-senha
PORT=3000
```

> O Postgres do Docker usa a porta `5433` no host (em vez da padrão `5432`) para não
> conflitar com outro PostgreSQL que já esteja rodando na sua máquina. Se preferir,
> pode trocar para `5432` livremente, desde que não haja conflito.

### 2. Subir o banco de dados (PostgreSQL via Docker)

```
docker compose up -d
```

Isso cria o banco `escaperoom`. As tabelas (`questions`, `question_options`,
`submissions`) são criadas automaticamente pelo próprio `server.js` na
primeira vez que o servidor sobe, e as 10 perguntas originais são inseridas
automaticamente se a tabela `questions` estiver vazia — não depende de rodar
nenhum script `.sql` manualmente.

> Se você já tem um PostgreSQL rodando localmente (sem Docker), pode pular esse
> passo: só crie o banco manualmente e ajuste `DATABASE_URL` no `.env` — o
> servidor cria as tabelas e semeia as perguntas sozinho ao iniciar.

### 3. Instalar dependências e iniciar o servidor

```
npm install
npm start
```

### 4. Acessar

- Hub de atividades: http://localhost:3000
- Alunos (Escape Room): http://localhost:3000/escape-room.html
- Alunos (Mapa de Hardware): http://localhost:3000/hardware.html
- Alunos (Monte o PC Ideal): http://localhost:3000/monta-pc.html
- Professor (ver respostas salvas): http://localhost:3000/admin.html

## Gerenciando o Mapa de Hardware

Pela área do professor (`/admin.html`, aba "Hardware"):

- **Níveis**: nome, descrição, ordem (define a sequência) e se está ativo.
  Um nível só aparece desbloqueado para o aluno depois que ele descobre 100%
  dos componentes do nível anterior. Excluir um nível não apaga os
  componentes dele — eles só ficam "sem nível" até serem reatribuídos.
- **Componentes**: cada componente tem um nome, ícone (emoji, usado se não
  houver imagem), uma imagem opcional (caminho ou URL — os componentes
  iniciais usam fotos reais salvas em `public/images/hardware/`), um nível, e
  uma posição no mapa (`0` a `100`, tanto na horizontal quanto na vertical).
  Marcar um componente como **nó inicial** faz ele aparecer desbloqueado
  desde o começo para os alunos — normalmente só um componente por nível (o
  ponto de partida do mapa daquele nível) precisa disso.
- **Perguntas do componente**: cada componente tem uma lista de perguntas
  (múltipla escolha ou verdadeiro/falso, sempre com gabarito) em vez de uma
  única fixa — o aluno recebe uma sorteada a cada clique no componente, o que
  dificulta decorar a resposta certa. O enunciado de cada pergunta é só uma
  dica de "por onde pesquisar" — evite colocar a resposta nele, senão o aluno
  não precisa pesquisar de verdade.
- **Conexões**: ligam dois componentes entre si (o seletor mostra o nível de
  cada um, para evitar conectar componentes de níveis diferentes por engano).
  Quando um aluno acerta uma pergunta de um componente, todos os componentes
  conectados a ele são desbloqueados no mapa. Sem nenhum nó inicial ou sem
  conexões suficientes, um nível fica com componentes inacessíveis — vale
  conferir o mapa como aluno depois de editar.
- **Progresso dos alunos**: mostra cada tentativa de resposta (certa ou
  errada) registrada por aluno/grupo e turma.

Assim como as perguntas do escape room, o gabarito de cada pergunta nunca é
enviado ao navegador do aluno.

### Créditos das imagens

As fotos dos 11 componentes iniciais (`public/images/hardware/`) vêm do
Wikimedia Commons, sob licença Creative Commons (atribuição obrigatória
nas CC BY-SA e "Attribution") ou domínio público:

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

Se for trocar alguma imagem pelo admin, prefira fotos com licença livre
(Wikimedia Commons, Unsplash, Pexels) e mantenha o crédito em algum lugar
acessível caso a licença exija atribuição.

## Gerenciando o Monte o PC Ideal

Pela área do professor (`/admin.html`, aba "Monte o PC"):

- **Missões**: cada missão é uma persona fictícia (emoji, nome, descrição,
  necessidade e orçamento em reais). A necessidade é só uma dica de "pra que
  serve esse PC" — evite entregar a lista de peças pronta, senão o aluno não
  precisa pesquisar/julgar de verdade. As 5 missões iniciais cobrem
  necessidades bem diferentes de propósito (jogos, criação de conteúdo, home
  office, produção musical, acessibilidade), pra não restringir o interesse
  só a quem gosta de jogos.
- **Categorias de peça**: as 6 categorias obrigatórias (Placa-mãe,
  Processador, Memória RAM, Armazenamento, Fonte de Alimentação, Gabinete) e
  as opcionais (GPU, Cooler, Monitor, Teclado, Mouse, Outro) são fixas no
  código (`OBRIGATORIAS`/`OPCIONAIS` em `public/monta-pc.js`), pensadas pra
  bater com os nomes dos componentes do Mapa de Hardware — não precisam ser
  cadastradas no admin.
- **Propostas dos alunos**: cada proposta mostra o aluno/grupo, a turma, a
  missão escolhida, todas as peças com nome/preço/link pesquisados, o total
  gasto (com aviso se estourou o orçamento da missão) e a justificativa de
  compatibilidade escrita pelo aluno. O professor pode escrever um feedback e
  marcar a proposta como revisada — isso não afeta o aluno na hora (não tem
  tela de nota), é só um controle pro professor acompanhar quem já foi
  avaliado.
- É possível filtrar as propostas por missão no seletor no topo da lista.

Diferente do Escape Room e do Mapa de Hardware, aqui não existe gabarito
automático: a "correção" é sempre manual, por critério (atendeu a
necessidade? é compatível? coube no orçamento?), porque o aluno está
pesquisando peças reais e de preço variável — não tem resposta fixa possível.

## Gerenciando as perguntas

Tudo é feito pela área do professor (`/admin.html`, aba "Perguntas"), sem
precisar mexer em código:

- **Dígito**: o formato original — um texto de contexto/pesquisa, uma
  pergunta, e o dígito correto (0 a 9). O aluno escreve a palavra encontrada e
  o dígito.
- **Múltipla escolha**: 2 ou mais opções de texto, marcando qual é a correta.
- **Verdadeiro ou Falso**: igual à múltipla escolha, mas travado em 2 opções.

O gabarito (dígito correto ou opção correta) nunca é enviado ao navegador do
aluno — só existe no banco e é conferido no servidor no momento do envio.
Perguntas podem ser desativadas (ficam de fora do formulário dos alunos sem
precisar excluir) e reordenadas pelo campo "ordem".

## Deploy no Coolify

A forma mais simples é usar dois recursos separados no Coolify: um banco
PostgreSQL gerenciado por ele e uma Application para o site. Assim o Coolify
cuida de HTTPS, backups do banco e redeploy automático a cada push.

### 1. Colocar o projeto em um repositório Git

O Coolify faz deploy a partir de um repositório (GitHub, GitLab, Gitea, Bitbucket
ou até um Git genérico). Suba este projeto para um desses provedores antes de
continuar — o `.env` e `node_modules` já estão no `.gitignore`, então não vão
subir junto.

### 2. Criar o banco de dados

No painel do Coolify: **+ New Resource → Database → PostgreSQL**. Dê deploy nele.
Depois de rodando, copie a **connection string interna** (algo como
`postgres://usuario:senha@nome-do-servico:5432/banco`) — ela só funciona entre
serviços dentro do mesmo projeto/rede do Coolify, o que é o suficiente aqui.

### 3. Criar a aplicação

**+ New Resource → Application**, aponte para o repositório Git do passo 1.

- **Build Pack:** escolha `Dockerfile` (o projeto já tem um) — mais previsível que
  o Nixpacks automático, embora o Nixpacks também funcionasse aqui, já que é um
  app Node simples sem etapa de build.
- **Ports Exposes:** `3000` (é a porta que o `Dockerfile`/`server.js` usam por
  padrão).
- **Variáveis de ambiente**, na aba Environment Variables da aplicação:
  - `DATABASE_URL` = a connection string interna copiada no passo 2
  - `ADMIN_PASSWORD` = uma senha forte para a área do professor
  - (não precisa definir `PORT` — o padrão 3000 já bate com o Ports Exposes)
- Configure o domínio (subdomínio do Coolify ou domínio próprio) na aba Domains —
  o Coolify já emite HTTPS automaticamente via Let's Encrypt.

### 4. Deploy

Clique em **Deploy**. O Coolify builda a imagem, sobe o container, e o
`server.js` cria as tabelas e semeia as perguntas originais sozinho na
primeira inicialização — não é preciso rodar nenhum script manual no banco.

Depois disso, qualquer push no repositório dispara um novo deploy automático
(se você ativar essa opção nas configurações da aplicação).

Acesse o domínio configurado para os alunos responderem, e `/admin.html` para
a área do professor.

## Observações

- Cada envio de formulário gera uma nova linha na tabela `submissions`
  (histórico de tentativas), com um retrato de cada resposta no momento do
  envio — editar ou excluir uma pergunta depois não altera envios já salvos.
- Ao enviar, o aluno só vê uma confirmação de que as respostas foram
  registradas — não aparece pontuação nem quais perguntas acertou/errou, para
  evitar tentativa por chute.
- No Mapa de Hardware o comportamento é diferente de propósito: o aluno vê na
  hora se acertou ou errou cada componente, e pode tentar de novo sem limite
  — o objetivo ali é a descoberta progressiva, não uma prova.
- No Monte o PC Ideal o aluno também não vê "certo ou errado" ao enviar — só
  a confirmação de que a proposta foi registrada e se ficou dentro do
  orçamento. A avaliação de verdade (atendeu a necessidade, é compatível)
  acontece depois, pelo professor.
- A área do professor é protegida só por uma senha simples (`ADMIN_PASSWORD`),
  suficiente para uso em sala de aula — não é um sistema de login robusto.
