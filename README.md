# Escape Room Digital

Site para os alunos responderem as perguntas de um escape room. As perguntas
ficam no banco (não no código) e o professor gerencia tudo pela área
`/admin.html`: criar, editar, ativar/desativar e excluir perguntas de três
tipos — dígito (pesquisa + resposta numérica, como as pistas originais),
múltipla escolha e verdadeiro/falso. As respostas dos alunos são corrigidas
automaticamente e salvas em um banco PostgreSQL, junto com o nome do aluno (ou
do grupo) e a turma.

## Estrutura

- `server.js` — backend Express: API pública das perguntas (`/api/questions`,
  sem gabarito), correção e salvamento das respostas (`/api/submit`), e API
  de administração (`/api/admin/*`) para o CRUD de perguntas e consulta das
  respostas. Cria as tabelas automaticamente se não existirem e semeia as 10
  perguntas originais na primeira execução (só se o banco estiver vazio).
- `public/index.html` + `public/script.js` — formulário do aluno, que busca as
  perguntas ativas em `/api/questions` e monta o formulário dinamicamente
  (campo de texto + dígito, ou múltipla escolha / verdadeiro-falso, conforme
  o tipo de cada pergunta).
- `public/admin.html` — área do professor: uma aba para gerenciar as
  perguntas (criar/editar/excluir/ativar) e outra para ver as respostas
  salvas.
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

- Alunos: http://localhost:3000
- Professor (ver respostas salvas): http://localhost:3000/admin.html

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
- A área do professor é protegida só por uma senha simples (`ADMIN_PASSWORD`),
  suficiente para uso em sala de aula — não é um sistema de login robusto.
