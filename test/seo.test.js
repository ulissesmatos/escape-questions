const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { criarApp } = require('../src/app');
const { AdminAuth } = require('../src/auth/AdminAuth');
const { Catalogo, ROBOS_DE_IA } = require('../src/seo/Catalogo');
const { escapar } = require('../src/seo/blocos');
const { ATIVIDADES } = require('../src/seo/conteudo');

const PASTA_PUBLICA = path.join(__dirname, '..', 'public');
const SITE = 'https://exemplo.com.br';

function catalogo(opcoes = {}) {
  return new Catalogo({ url: SITE, pastaPublica: PASTA_PUBLICA, ...opcoes });
}

async function subirApp(t, siteUrl = SITE) {
  const app = criarApp({ db: {}, auth: new AdminAuth({ senha: 'senha-teste' }), siteUrl });
  const servidor = await new Promise((ok) => {
    const s = app.listen(0, () => ok(s));
  });
  t.after(() => servidor.close());
  const base = `http://localhost:${servidor.address().port}`;
  return (caminho, headers = {}) => fetch(base + caminho, { headers, redirect: 'manual' });
}

function jsonLd(html) {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'a página não tem JSON-LD');
  return JSON.parse(m[1]);
}

// ---------------------------------------------------------------- catálogo

test('catálogo: uma página por atividade cujo jogo existe, e só essas', () => {
  const todas = catalogo();
  const existentes = ATIVIDADES.filter((a) => fs.existsSync(path.join(PASTA_PUBLICA, a.arquivo)));
  assert.deepEqual(todas.atividades.map((p) => p.dados.slug), existentes.map((a) => a.slug));

  const so = catalogo({ existe: (arquivo) => arquivo === 'horta.html' });
  assert.deepEqual(so.atividades.map((p) => p.dados.slug), ['robo-na-horta']);
  assert.match(so.sitemap(), /atividades\/robo-na-horta/);
  assert.doesNotMatch(so.sitemap(), /operacao-word/);
});

test('catálogo: toda atividade cadastrada tem os campos que as páginas usam', () => {
  for (const a of ATIVIDADES) {
    for (const campo of ['slug', 'nome', 'nomeCurto', 'icone', 'etiqueta', 'arquivo', 'jogo', 'cta', 'titulo', 'descricao', 'resumo']) {
      assert.ok(a[campo], `${a.slug}: falta ${campo}`);
    }
    for (const campo of ['ficha', 'aprende', 'passos', 'professor', 'faq', 'eixos', 'rotas']) {
      assert.ok(Array.isArray(a[campo]) && a[campo].length > 0, `${a.slug}: falta ${campo}`);
    }
    assert.match(a.cores.cor, /^#[0-9a-f]{6}$/i, `${a.slug}: cor`);
    assert.ok(fs.existsSync(path.join(PASTA_PUBLICA, 'images', 'og', `${a.slug}.png`)), `${a.slug}: falta a imagem (npm run og)`);
  }
  assert.ok(fs.existsSync(path.join(PASTA_PUBLICA, 'images', 'og', 'site.png')), 'falta a imagem do site (npm run og)');
  assert.equal(new Set(ATIVIDADES.map((a) => a.slug)).size, ATIVIDADES.length, 'slugs repetidos');
});

test('páginas: título e descrição cabem no resultado de busca e o JSON-LD é válido', () => {
  const c = catalogo();
  for (const p of c.paginas) {
    assert.ok(p.tituloCompleto().length <= 70, `${p.caminho}: título com ${p.tituloCompleto().length} caracteres`);
    assert.ok(p.descricao.length >= 70 && p.descricao.length <= 170, `${p.caminho}: descrição com ${p.descricao.length} caracteres`);

    const html = p === c.inicio ? p.aplicarEm('<html><head><title>x</title></head><body><main><footer></footer></main></body></html>') : p.html();
    const ld = jsonLd(html);
    assert.equal(ld['@context'], 'https://schema.org');
    assert.ok(ld['@graph'].some((n) => n['@type'] === 'WebSite'), `${p.caminho}: sem WebSite`);
    assert.ok(html.includes(`<link rel="canonical" href="${p.url}" />`), `${p.caminho}: canonical`);
    assert.equal((html.match(/<title>/g) || []).length, 1, `${p.caminho}: <title> repetido`);
  }
});

test('páginas das atividades: um h1, ficha, perguntas e links que existem', () => {
  const c = catalogo();
  const conhecidos = new Set(['/', '/index.html', ...c.paginas.map((p) => p.caminho), ...c.atividades.map((p) => p.dados.jogo)]);
  for (const p of c.atividades) {
    const html = p.html();
    assert.equal((html.match(/<h1>/g) || []).length, 1, `${p.caminho}: h1`);
    assert.match(html, /<table class="ficha">/);
    assert.match(html, /Perguntas frequentes/);
    assert.ok(jsonLd(html)['@graph'].some((n) => n['@type'] === 'FAQPage'), `${p.caminho}: sem FAQPage`);
    for (const [, href] of html.matchAll(/href="(\/[^"#?]*)"/g)) {
      if (/^\/(css|js|images)\//.test(href)) continue;
      assert.ok(conhecidos.has(href), `${p.caminho}: link para ${href}, que não existe`);
    }
  }
});

test('Markdown: cada página sai com título, resumo e links absolutos', () => {
  const c = catalogo();
  for (const p of c.paginas) {
    const md = p.markdown();
    assert.ok(md.startsWith(`# ${p.titulo}\n`), `${p.caminho}: título`);
    assert.match(md, /^> /m);
    assert.doesNotMatch(md, /\]\(\//, `${p.caminho}: link relativo no Markdown`);
    assert.doesNotMatch(md, /<[a-z]+[ >]/i, `${p.caminho}: HTML no Markdown`);
  }
});

test('texto vindo do conteúdo é escapado (nada vira tag)', () => {
  assert.equal(escapar('<script>"a" & \'b\'</script>'), '&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/script&gt;');
});

// ---------------------------------------------------- robots, sitemap, llms

test('robots.txt: libera tudo menos /api, libera os robôs de IA e aponta o sitemap', () => {
  const robots = catalogo().robots();
  assert.match(robots, /^User-agent: \*\nContent-Signal: search=yes, ai-input=yes\nAllow: \/\nDisallow: \/api\//);
  for (const robo of ROBOS_DE_IA) assert.match(robots, new RegExp(`User-agent: ${robo}\\nAllow: /`));
  assert.match(robots, new RegExp(`Sitemap: ${SITE}/sitemap.xml\\n$`));
  assert.doesNotMatch(robots, /admin|laboratorio\/professor/, 'páginas com noindex não podem estar no robots (o robô precisa ler o noindex)');
});

test('sitemap.xml e llms.txt listam as mesmas páginas, no endereço do site', () => {
  const c = catalogo();
  const sitemap = c.sitemap();
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, c.paginas.map((p) => `${SITE}${p.caminho}`));

  const llms = c.llmsTxt();
  assert.ok(llms.startsWith('# '));
  for (const p of [...c.atividades, c.comoUsar]) assert.ok(llms.includes(`${SITE}${p.caminhoMarkdown}`), `llms.txt sem ${p.caminho}`);
});

// -------------------------------------------------------------------- HTTP

test('HTTP: a página inicial traz Link headers, canonical e a seção para professores', async (t) => {
  const get = await subirApp(t);
  const r = await get('/');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('vary'), 'Accept');

  const link = r.headers.get('link');
  assert.match(link, /<\/llms\.txt>; rel="describedby"/);
  assert.match(link, /<\/como-usar>; rel="service-doc"/);
  assert.match(link, /<\/index\.md>; rel="alternate"; type="text\/markdown"/);
  assert.doesNotMatch(link, /api-catalog/, 'não há API pública para catalogar');

  const html = await r.text();
  assert.match(html, new RegExp(`<link rel="canonical" href="${SITE}/" />`));
  assert.match(html, /id="para-professores"/);
  assert.match(html, /class="card-atividade card-cor-escape"/, 'o hub original continua lá');
  assert.equal((html.match(/<title>/g) || []).length, 1);
});

test('HTTP: Accept: text/markdown e o sufixo .md entregam Markdown', async (t) => {
  const get = await subirApp(t);

  const porCabecalho = await get('/atividades/robo-na-horta', { Accept: 'text/markdown' });
  assert.match(porCabecalho.headers.get('content-type'), /^text\/markdown/);
  assert.equal(porCabecalho.headers.get('vary'), 'Accept');
  assert.match(await porCabecalho.text(), /^# Robô na Horta/);

  const html = await get('/atividades/robo-na-horta', { Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' });
  assert.match(html.headers.get('content-type'), /^text\/html/);

  for (const caminho of ['/index.md', '/como-usar.md', '/atividades/escape-room.md']) {
    const r = await get(caminho);
    assert.equal(r.status, 200, caminho);
    assert.match(r.headers.get('content-type'), /^text\/markdown/, caminho);
  }
  assert.equal((await get('/atividades/nao-existe.md')).status, 404);
  assert.equal((await get('/atividades/nao-existe')).status, 404);
});

test('HTTP: robots, sitemap e llms.txt usam o SITE_URL configurado', async (t) => {
  const get = await subirApp(t, 'https://outro-dominio.com.br/');
  assert.match(await (await get('/robots.txt')).text(), /Sitemap: https:\/\/outro-dominio\.com\.br\/sitemap\.xml/);
  const sitemap = await get('/sitemap.xml');
  assert.match(sitemap.headers.get('content-type'), /xml/);
  assert.match(await sitemap.text(), /<loc>https:\/\/outro-dominio\.com\.br\/<\/loc>/);
  assert.match(await (await get('/llms.txt')).text(), /https:\/\/outro-dominio\.com\.br\/atividades\//);
});

test('HTTP: a casca do jogo fica fora do índice e ganha Open Graph, nos dois endereços', async (t) => {
  const get = await subirApp(t);
  for (const caminho of ['/horta.html', '/horta', '/escape-room', '/laboratorio?sala=ABCD']) {
    const html = await (await get(caminho)).text();
    assert.match(html, /<meta name="robots" content="noindex" \/>/, caminho);
    assert.match(html, /<meta property="og:image" content="https:\/\/exemplo\.com\.br\/images\/og\/[a-z-]+\.png" \/>/, caminho);
    assert.doesNotMatch(html, /rel="canonical"/, `${caminho}: noindex e canonical juntos confundem o Google`);
  }
});

test('HTTP: as áreas do professor continuam servidas como antes', async (t) => {
  const get = await subirApp(t);
  for (const caminho of ['/admin.html', '/laboratorio/professor', '/laboratorio/telao/ABCD']) {
    const r = await get(caminho);
    assert.equal(r.status, 200, caminho);
    assert.match(await r.text(), /noindex/, `${caminho}: continua com noindex`);
  }
});
