# Escape Room Digital

Site simples para os alunos responderem as 10 pistas do escape room. As respostas
são corrigidas automaticamente e salvas em um banco PostgreSQL, junto com o nome
do aluno (ou do grupo) e a turma.

## Estrutura

- `server.js` — backend Express: corrige as respostas contra o gabarito, cria a
  tabela automaticamente se não existir, e salva no Postgres.
- `public/index.html` — formulário do aluno com as 10 pistas.
- `public/admin.html` — área do professor para consultar as respostas salvas.
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

Isso cria o banco `escaperoom`. A tabela `submissions` é criada automaticamente
pelo próprio `server.js` na primeira vez que o servidor sobe (não depende de
rodar nenhum script `.sql` manualmente).

> Se você já tem um PostgreSQL rodando localmente (sem Docker), pode pular esse
> passo: só crie o banco manualmente e ajuste `DATABASE_URL` no `.env` — o
> servidor cria a tabela sozinho ao iniciar.

### 3. Instalar dependências e iniciar o servidor

```
npm install
npm start
```

### 4. Acessar

- Alunos: http://localhost:3000
- Professor (ver respostas salvas): http://localhost:3000/admin.html

## Gabarito

O gabarito fica só no `server.js` (array `PISTAS`), nunca é enviado ao navegador,
então os alunos não conseguem "ver" as respostas certas inspecionando a página.
Para trocar as pistas ou os dígitos corretos, edite esse array e o texto
correspondente em `public/index.html`.

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
`server.js` cria a tabela `submissions` sozinho na primeira inicialização —
não é preciso rodar nenhum script manual no banco.

Depois disso, qualquer push no repositório dispara um novo deploy automático
(se você ativar essa opção nas configurações da aplicação).

Acesse o domínio configurado para os alunos responderem, e `/admin.html` para
a área do professor.

## Observações

- Cada envio de formulário gera uma nova linha na tabela `submissions` (histórico
  de tentativas), com os detalhes de quais pistas foram acertadas.
- A área do professor é protegida só por uma senha simples (`ADMIN_PASSWORD`),
  suficiente para uso em sala de aula — não é um sistema de login robusto.
