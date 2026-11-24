const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const { ContasWord } = require('../src/modules/word/ContasWord');
const { WordConfig } = require('../src/modules/word/wordRoutes');

const importar = (arquivo) => import(pathToFileURL(path.join(__dirname, '..', 'public/js/pages/seguranca', arquivo)).href);

// ---------------- senha ----------------

test('senha forte: comprimento, variedade, sem nome, sem sequência e fora das mais usadas', async () => {
  const { avaliarSenha } = await importar('regras/senha.js');
  const ctx = { nome: 'Ana Júlia Souza', arroba: 'ana.souza' };
  for (const fraca of ['123456', 'senha123', 'Maria2012', 'futebol123', 'abcd1234XY!', 'AnaJulia2024!!', 'Souza#2024abc', 'Aa1!']) {
    assert.equal(avaliarSenha(fraca, ctx).forte, false, fraca);
  }
  for (const forte of ['Gato-Azul-Pula-Nuvem7', 'Tr3m#Verde!Lua', 'pato voa sobre a lua']) {
    const r = avaliarSenha(forte, ctx);
    assert.equal(r.forte, true, `${forte}: ${r.problemas.join(' | ')}`);
    assert.ok(r.pontos >= 3);
  }
  assert.match(avaliarSenha('anasouza!X9z#Q', ctx).problemas.join(' '), /nome/);
  assert.match(avaliarSenha('123456', ctx).problemas.join(' '), /mais usadas/);
  assert.equal(avaliarSenha('', ctx).nivel, 'Muito fraca');
});

// ---------------- endereços ----------------

test('endereços: o nome verdadeiro do site é o que vem antes do .com / .com.br', async () => {
  const { dominioDe, hostDe, normalizarUrl, pareceEndereco, caminhoDe } = await importar('regras/enderecos.js');
  assert.equal(dominioDe('bancopatria.atualiza-cadastro.com/login'), 'atualiza-cadastro.com');
  assert.equal(dominioDe('https://www.megaloja.com.br/ofertas'), 'megaloja.com.br');
  assert.equal(dominioDe('conta.postal.com.br'), 'postal.com.br');
  assert.equal(dominioDe('secretaria.horizonte.edu.br'), 'horizonte.edu.br');
  assert.equal(hostDe('HTTPS://WWW.Conecta.com.br/amigos'), 'conecta.com.br');
  assert.equal(normalizarUrl(' https://www.site.com/ '), 'site.com');
  assert.equal(caminhoDe('conecta.com.br/editar'), 'editar');
  assert.ok(pareceEndereco('megaloja.com.br'));
  assert.ok(!pareceEndereco('jogos grátis'));
});

test('privacidade: acha endereço, telefone e escola na bio, e deixa os gostos', async () => {
  const { dadosPessoais } = await importar('regras/privacidade.js');
  const tipos = (t) => dadosPessoais(t).map((d) => d.tipo).sort();
  assert.deepEqual(tipos('Moro na Rua das Flores, 123 | 7º B da Escola Horizonte | Zap (11) 98765-4321'), ['endereco', 'escola', 'telefone']);
  assert.deepEqual(tipos('Amo desenhar e jogar vôlei 🏐'), []);
  assert.deepEqual(tipos('Estudo no colégio Central'), ['escola']);
});

// ---------------- sites ----------------

test('internet de mentira: todo site falso tem "Não seguro" e explica o golpe; os favoritos existem', async () => {
  const { SITES, siteDoHost, FAVORITOS_PADRAO } = await importar('sites/index.js');
  const hosts = new Set();
  for (const site of Object.values(SITES)) {
    for (const host of site.hosts) {
      assert.ok(!hosts.has(host), `host repetido: ${host}`);
      hosts.add(host);
      assert.equal(siteDoHost(host), site);
    }
    if (site.falso) {
      assert.equal(site.seguro, false, `${site.id}: falso precisa ser "Não seguro"`);
      assert.ok(site.alerta, `${site.id}: falso precisa de alerta`);
    }
  }
  for (const f of FAVORITOS_PADRAO) assert.ok(siteDoHost(f.url.split('/')[0]), f.url);
});

// ---------------- missões ----------------

test('missões: ids únicos, conceitos existentes e objetivos com dica e caminho do Mostre-me', async () => {
  const { MISSOES, CAPITULOS, missaoPorId } = await importar('regras/missoes.js');
  const { CONCEITOS } = await importar('regras/conceitos.js');
  const { Mundo } = await importar('regras/Mundo.js');
  const { siteDoHost } = await importar('sites/index.js');
  assert.equal(MISSOES.length, 13);
  assert.equal(new Set(MISSOES.map((m) => m.id)).size, MISSOES.length);
  assert.equal(MISSOES.filter((m) => m.tutorial).length, 1);
  for (const m of MISSOES) {
    assert.ok(CAPITULOS.some((c) => c.numero === m.capitulo), m.id);
    assert.ok(m.historia && m.conclusao, `${m.id}: história e conclusão`);
    for (const c of m.conceitos) assert.ok(CONCEITOS[c], `${m.id}: conceito ${c}`);
    const contexto = { arroba: 'teste', nome: 'Teste' };
    const mundo = new Mundo(m.mundo(contexto), contexto);
    const objetivos = m.objetivos(contexto);
    assert.ok(objetivos.length >= 3, `${m.id}: pelo menos 3 objetivos`);
    for (const o of objetivos) {
      assert.ok(o.texto, `${m.id}: objetivo sem texto`);
      assert.equal(typeof o.verificar, 'function', `${m.id}: ${o.texto}`);
      assert.ok(o.dica, `${m.id}: "${o.texto}" sem dica`);
      if (o.pergunta) {
        assert.ok(o.pergunta.opcoes.filter((op) => o.conferir(op)).length === 1, `${m.id}: "${o.texto}" precisa de uma única resposta certa`);
      } else {
        assert.ok(o.caminho.length, `${m.id}: "${o.texto}" sem caminho do Mostre-me`);
      }
      for (const p of o.caminho) {
        assert.ok(p.texto, `${m.id}: passo sem texto em "${o.texto}"`);
        assert.ok(p.alvo || p.alvos?.length, `${m.id}: passo sem alvo em "${o.texto}"`);
        if (p.site) assert.ok(siteDoHost(p.site), `${m.id}: site ${p.site} não existe`);
        if (p.email) assert.ok(mundo.email(p.email), `${m.id}: e-mail ${p.email} não existe`);
      }
      if (o.conceito) assert.ok(CONCEITOS[o.conceito], `${m.id}: conceito ${o.conceito}`);
    }
    // no começo nenhum objetivo está cumprido (o mundo começa "sujo")
    const estado = { mundo, marcos: new Set(), respostas: {}, apps: { abertos: [], ativo: null }, fs: { itens: m.arquivos } };
    for (const o of objetivos.filter((x) => !x.aposAnteriores)) assert.equal(Boolean(o.verificar(estado)), false, `${m.id}: "${o.texto}" já começa cumprido`);
    // links dos e-mails apontam para sites que existem (ou que são propositalmente golpe)
    for (const e of mundo.emails) for (const link of Object.values(e.links || {})) assert.ok(link.url, `${m.id}: link sem url`);
    for (const r of m.roteiro || []) assert.ok(r.quando.objetivo < objetivos.length, `${m.id}: roteiro`);
    assert.equal(missaoPorId(m.id), m);
  }
});

test('estrelas: ajuda e deslizes de segurança tiram estrela; a guiada vale 3', async () => {
  const { calcularEstrelas, missoesLiberadas, MISSOES } = await importar('regras/missoes.js');
  assert.equal(calcularEstrelas({}), 3);
  assert.equal(calcularEstrelas({ dicas: 1 }), 3);
  assert.equal(calcularEstrelas({ deslizes: 1 }), 2);
  assert.equal(calcularEstrelas({ deslizes: 3 }), 1);
  assert.equal(calcularEstrelas({ deslizes: 5, tutorial: true }), 3);
  assert.deepEqual([...missoesLiberadas([])], [MISSOES[0].id]);
  assert.equal(missoesLiberadas([], { liberarTudo: true }).size, MISSOES.length);
});

test('mundo: código das duas etapas chega no celular e cada missão começa do zero', async () => {
  const { Mundo } = await importar('regras/Mundo.js');
  const dados = { emails: [{ id: 'a', de: { nome: 'X', endereco: 'x@y.com' }, assunto: 'Oi', corpo: [] }] };
  const mundo = new Mundo(dados, { arroba: 'ana', nome: 'Ana' });
  let avisos = 0;
  mundo.aoMudar(() => avisos++);
  const codigo = mundo.enviarCodigo();
  assert.match(codigo, /^\d{6}$/);
  assert.match(mundo.conversa('postal-codigo').mensagens[0].texto, new RegExp(codigo));
  assert.ok(avisos > 0);
  mundo.email('a').denunciado = true;
  assert.equal(dados.emails[0].denunciado, undefined, 'o mundo copia os dados da missão');
  assert.equal(mundo.conta.email, 'ana@postal.com.br');
  assert.equal(mundo.senhaForte, false);
});

// ---------------- servidor ----------------

test('Operação Anzol usa as mesmas contas (@) e o mesmo token da Word, com progresso em tabela própria', async () => {
  const consultas = [];
  const db = { query: async (sql) => (consultas.push(sql), { rows: [] }), one: async (sql) => (consultas.push(sql), null), many: async (sql) => (consultas.push(sql), []) };
  const word = new ContasWord({ db, segredo: 's' });
  const anzol = new ContasWord({ db, segredo: 's', tabela: 'seguranca_progresso' });
  assert.equal(anzol.lerToken(word.token(7)), 7, 'o token da Word vale na Anzol');
  await anzol.iniciar(7, 'senha-forte');
  await anzol.progresso(7);
  await anzol.zerar(7);
  assert.ok(consultas.every((sql) => !sql.includes('word_progresso')), 'a Anzol não mexe no progresso da Word');
  assert.ok(consultas.some((sql) => sql.includes('seguranca_progresso')));
  assert.throws(() => new ContasWord({ db, segredo: 's', tabela: 'usuarios; DROP TABLE x' }), /desconhecida/);
});

test('configuração da Operação Anzol fica numa linha própria', async () => {
  const salvo = [];
  const db = { one: async () => null, query: async (sql, params) => salvo.push(params) };
  const config = new WordConfig(db, 'seguranca');
  await config.salvar({ liberarTudo: true });
  assert.equal(salvo[0][0], 'seguranca');
  assert.deepEqual(JSON.parse(salvo[0][1]), { liberarTudo: true, semMostreMe: false });
});
