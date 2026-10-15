const { escapar, paraHtml, paraMarkdown } = require('./blocos');
const { SITE, COMO_USAR, HOME, NIVEL } = require('./conteudo');

const FONTE = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400..800&display=swap';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "2026-10-14" → "14 de outubro de 2026" */
function dataPorExtenso(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}

/** JSON dentro de <script>: "<" vira < para o texto nunca fechar a tag */
function jsonSeguro(objeto) {
  return JSON.stringify(objeto).replace(/</g, '\\u003c');
}

function rgba(hex, alfa) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}

/** Open Graph e Twitter: é o que o WhatsApp e as redes usam para o cartão do link */
function metaSociais(site, { titulo, descricao, url, imagem, tipo }) {
  return [
    `<meta property="og:type" content="${tipo}" />`,
    `<meta property="og:site_name" content="${escapar(site.nome)}" />`,
    '<meta property="og:locale" content="pt_BR" />',
    `<meta property="og:title" content="${escapar(titulo)}" />`,
    `<meta property="og:description" content="${escapar(descricao)}" />`,
    `<meta property="og:url" content="${escapar(url)}" />`,
    `<meta property="og:image" content="${escapar(imagem)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${escapar(titulo)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
  ];
}

/** O endereço público do site e as peças da identidade usadas em todas as páginas */
class Site {
  constructor({ url, dados = SITE }) {
    this.url = url.replace(/\/+$/, '');
    this.nome = dados.nome;
    this.idioma = dados.idioma;
    this.editora = dados.editora;
    this.atualizadoEm = dados.atualizadoEm;
    this.imagemPadrao = '/images/og/site.png';
  }

  absoluta(caminho) {
    return `${this.url}${caminho}`;
  }

  get idOrganizacao() {
    return `${this.editora.url}/#organizacao`;
  }

  get idSite() {
    return `${this.url}/#site`;
  }

  /** Quem publica: a Nuveasy, com o endereço dela (liga as duas entidades) */
  organizacaoLd() {
    return { '@type': 'Organization', '@id': this.idOrganizacao, name: this.editora.nome, url: this.editora.url };
  }

  siteLd() {
    return {
      '@type': 'WebSite',
      '@id': this.idSite,
      name: this.nome,
      url: this.absoluta('/'),
      inLanguage: this.idioma,
      publisher: { '@id': this.idOrganizacao },
    };
  }
}

/**
 * Uma página pública indexável. A subclasse diz o que tem de próprio: o
 * caminho, o título, os blocos de conteúdo e o JSON-LD. Daqui saem o HTML
 * completo e a versão em Markdown.
 *
 * `contexto` = { site, atividades } (as atividades do catálogo, na ordem do hub).
 */
class Pagina {
  constructor(contexto) {
    this.contexto = contexto;
    this.site = contexto.site;
  }

  // ---- o que cada página define ----
  get caminho() { throw new Error('caminho não definido'); }
  get titulo() { throw new Error('titulo não definido'); }
  get descricao() { throw new Error('descricao não definido'); }
  get resumo() { return this.descricao; }
  get icone() { return '🎓'; }
  get etiqueta() { return ''; }
  get cores() { return null; }
  get imagem() { return this.site.imagemPadrao; }
  get tipoOg() { return 'article'; }
  get slugAtivo() { return null; }
  get slug() { return this.caminho.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'inicio'; }
  get acao() { return null; } // { texto, href }
  blocos() { return []; }
  /** Blocos do Markdown (por padrão, os mesmos do HTML) */
  blocosMarkdown() { return this.blocos(); }
  jsonLd() { return { '@context': 'https://schema.org', '@graph': [this.site.organizacaoLd(), this.site.siteLd()] }; }
  /** Caminho de migalhas: [{ nome, caminho }] (a página atual é a última) */
  trilha() { return [{ nome: 'Início', caminho: '/' }, { nome: this.titulo, caminho: this.caminho }]; }

  // ---- derivados ----
  get url() { return this.site.absoluta(this.caminho); }
  get caminhoMarkdown() { return this.caminho === '/' ? '/index.md' : `${this.caminho}.md`; }

  /** O <title>: título + nome do site, se couber numa linha de resultado de busca */
  tituloCompleto() {
    const completo = `${this.titulo} | ${this.site.nome}`;
    return completo.length <= 70 ? completo : this.titulo;
  }

  trilhaLd() {
    return {
      '@type': 'BreadcrumbList',
      itemListElement: this.trilha().map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.nome, item: this.site.absoluta(t.caminho) })),
    };
  }

  faqLd(itens) {
    return {
      '@type': 'FAQPage',
      mainEntity: itens.map(([pergunta, resposta]) => ({
        '@type': 'Question',
        name: pergunta,
        acceptedAnswer: { '@type': 'Answer', text: resposta },
      })),
    };
  }

  /** <meta>, canonical, Open Graph, alternativa em Markdown e JSON-LD */
  metaTags() {
    const imagem = this.site.absoluta(this.imagem);
    const t = this.tituloCompleto();
    return [
      `<meta name="description" content="${escapar(this.descricao)}" />`,
      `<link rel="canonical" href="${escapar(this.url)}" />`,
      '<meta name="robots" content="index, follow, max-image-preview:large" />',
      `<link rel="alternate" type="text/markdown" href="${escapar(this.site.absoluta(this.caminhoMarkdown))}" />`,
      ...metaSociais(this.site, { titulo: t, descricao: this.descricao, url: this.url, imagem, tipo: this.tipoOg }),
      `<script type="application/ld+json">${jsonSeguro(this.jsonLd())}</script>`,
    ].join('\n  ');
  }

  // ---- HTML ----
  navegacao(slugAtivo) {
    const links = this.contexto.atividades
      .map((a) => {
        const ativo = a.slug === slugAtivo;
        return `<a href="${a.caminho}"${ativo ? ' class="ativo" aria-current="page"' : ''}><span aria-hidden="true">${a.icone}</span>${escapar(a.nomeCurto)}</a>`;
      })
      .join('');
    return `<header class="site-topo">
    <nav class="site-nav" aria-label="Atividades">
      <a href="/" class="site-nav-marca"><span class="site-nav-logo" aria-hidden="true">🎓</span><span>Atividades<span class="site-nav-texto-longo"> da Turma</span></span></a>
      <div class="site-nav-links"><a href="/"><span aria-hidden="true">🏠</span>Início</a>${links}</div>
    </nav>
  </header>`;
  }

  rodape() {
    return `<footer>
      <a href="/">Início</a> · <a href="/como-usar">Como usar</a> · Uma iniciativa <a href="${escapar(this.site.editora.url)}">${escapar(this.site.editora.nome)}</a>
    </footer>`;
  }

  topo() {
    const acao = this.acao;
    return `<section class="pagina-topo">
      <span class="pagina-etiqueta"><span class="pagina-etiqueta-icone" aria-hidden="true">${this.icone}</span>${escapar(this.etiqueta || this.site.nome)}</span>
      <h1>${escapar(this.titulo)}</h1>
      <p class="resumo-destaque">${escapar(this.resumo)}</p>
      ${acao ? `<p><a class="btn btn-primario" href="${escapar(acao.href)}">${escapar(acao.texto)}</a></p>` : ''}
    </section>`;
  }

  trilhaHtml() {
    const itens = this.trilha();
    return `<nav class="trilha" aria-label="Você está em">${itens
      .map((t, i) => (i === itens.length - 1 ? `<span aria-current="page">${escapar(t.nome)}</span>` : `<a href="${t.caminho}">${escapar(t.nome)}</a>`))
      .join(' › ')}</nav>`;
  }

  get estiloCores() {
    const c = this.cores;
    if (!c) return '';
    return ` style="--accent:${c.cor};--accent-dark:${c.escura};--accent-light:${c.clara};--accent-ring:${rgba(c.cor, 0.18)}"`;
  }

  html() {
    return `<!doctype html>
<html lang="${this.site.idioma}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapar(this.tituloCompleto())}</title>
  ${this.metaTags()}
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${this.icone}</text></svg>" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${FONTE}" />
  <link rel="stylesheet" href="/css/base.css" />
  <link rel="stylesheet" href="/css/components.css" />
  <link rel="stylesheet" href="/css/landing.css" />
</head>
<body class="pagina-conteudo" data-page="${escapar(this.slug)}"${this.estiloCores}>
  ${this.navegacao(this.slugAtivo)}
  <main class="container">
    ${this.trilhaHtml()}
    ${this.topo()}
    ${paraHtml(this.blocos())}
    ${this.rodape()}
  </main>
</body>
</html>
`;
  }

  // ---- Markdown ----
  markdown() {
    const acao = this.acao;
    const partes = [`# ${this.titulo}`, `> ${this.resumo}`];
    if (acao) partes.push(`[${acao.texto}](${acao.href.startsWith('/') ? this.site.absoluta(acao.href) : acao.href})`);
    partes.push(paraMarkdown(this.blocosMarkdown(), { absoluta: (c) => this.site.absoluta(c) }));
    partes.push(`Fonte: ${this.url}`);
    return `${partes.join('\n\n')}\n`;
  }

  /** Linha deste item no llms.txt */
  linhaLlms() {
    return `- [${this.titulo}](${this.site.absoluta(this.caminhoMarkdown)}): ${this.descricao}`;
  }
}

/** Uma atividade: /atividades/<slug> */
class PaginaAtividade extends Pagina {
  constructor(contexto, dados) {
    super(contexto);
    this.dados = dados;
  }

  get slugAtivo() { return this.dados.slug; }
  get caminho() { return this.dados.caminho; }
  get titulo() { return this.dados.titulo; }
  get descricao() { return this.dados.descricao; }
  get resumo() { return this.dados.resumo; }
  get icone() { return this.dados.icone; }
  get etiqueta() { return this.dados.etiqueta; }
  get cores() { return this.dados.cores; }
  get imagem() { return `/images/og/${this.dados.slug}.png`; }
  get acao() { return { texto: this.dados.cta, href: this.dados.jogo }; }

  trilha() {
    return [{ nome: 'Início', caminho: '/' }, { nome: this.dados.nome, caminho: this.caminho }];
  }

  blocos() {
    const d = this.dados;
    const outras = this.contexto.atividades.filter((a) => a.slug !== d.slug);
    return [
      { tipo: 'titulo', texto: 'Ficha da atividade' },
      { tipo: 'ficha', linhas: d.ficha },
      { tipo: 'titulo', texto: 'O que o aluno aprende' },
      { tipo: 'lista', itens: d.aprende },
      { tipo: 'paragrafo', texto: `Eixo do Complemento à BNCC – Computação: ${d.eixos.join(', ')}.` },
      { tipo: 'titulo', texto: 'Como funciona' },
      { tipo: 'passos', itens: d.passos },
      { tipo: 'titulo', texto: 'Para o professor' },
      { tipo: 'lista', itens: d.professor },
      { tipo: 'titulo', texto: 'Perguntas frequentes' },
      { tipo: 'perguntas', itens: d.faq },
      { tipo: 'titulo', texto: 'Outras atividades' },
      {
        tipo: 'cartoes',
        itens: outras.map((a) => ({ href: a.caminho, icone: a.icone, nome: a.nome, resumo: a.descricao, etiqueta: a.etiqueta, acao: 'Ver a atividade', cores: a.cores })),
      },
      { tipo: 'nota', texto: `Atualizado em ${dataPorExtenso(this.site.atualizadoEm)}. Uma iniciativa ${this.site.editora.nome}.` },
    ];
  }

  jsonLd() {
    const d = this.dados;
    return {
      '@context': 'https://schema.org',
      '@graph': [
        this.site.organizacaoLd(),
        this.site.siteLd(),
        {
          '@type': ['LearningResource', 'WebApplication'],
          '@id': `${this.url}#atividade`,
          name: d.nome,
          description: d.resumo,
          url: this.url,
          mainEntityOfPage: this.url,
          inLanguage: this.site.idioma,
          image: this.site.absoluta(this.imagem),
          isAccessibleForFree: true,
          applicationCategory: 'EducationalApplication',
          operatingSystem: 'Qualquer sistema com navegador (Chrome ou Edge)',
          educationalLevel: NIVEL,
          teaches: d.aprende,
          learningResourceType: d.etiqueta,
          audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
          educationalAlignment: d.eixos.map((eixo) => ({
            '@type': 'AlignmentObject',
            alignmentType: 'educationalSubject',
            educationalFramework: 'Complemento à BNCC – Computação',
            targetName: eixo,
          })),
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
          isPartOf: { '@id': this.site.idSite },
          publisher: { '@id': this.site.idOrganizacao },
          dateModified: this.site.atualizadoEm,
        },
        this.trilhaLd(),
        this.faqLd(d.faq),
      ],
    };
  }
}

/** /como-usar: guia para o professor e destino do cabeçalho Link rel="service-doc" */
class PaginaComoUsar extends Pagina {
  get caminho() { return COMO_USAR.caminho; }
  get titulo() { return COMO_USAR.titulo; }
  get descricao() { return COMO_USAR.descricao; }
  get resumo() { return COMO_USAR.resumo; }
  get icone() { return '📋'; }
  get etiqueta() { return 'Para professores'; }
  get acao() { return { texto: 'Ver as atividades', href: '/' }; }

  blocos() {
    return [
      { tipo: 'titulo', texto: 'Antes da aula' },
      { tipo: 'lista', itens: COMO_USAR.preparo },
      { tipo: 'titulo', texto: 'Qual atividade escolher' },
      {
        tipo: 'links',
        itens: this.contexto.atividades.map((a) => ({ texto: a.nome, href: a.caminho, detalhe: a.descricao })),
      },
      { tipo: 'titulo', texto: 'Sugestões de uso' },
      { tipo: 'lista', itens: COMO_USAR.sugestoes },
      { tipo: 'titulo', texto: 'Perguntas frequentes' },
      { tipo: 'perguntas', itens: COMO_USAR.faq },
      { tipo: 'nota', texto: `Atualizado em ${dataPorExtenso(this.site.atualizadoEm)}. Uma iniciativa ${this.site.editora.nome}.` },
    ];
  }

  jsonLd() {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        this.site.organizacaoLd(),
        this.site.siteLd(),
        {
          '@type': 'WebPage',
          '@id': `${this.url}#pagina`,
          name: this.titulo,
          description: this.descricao,
          url: this.url,
          inLanguage: this.site.idioma,
          isPartOf: { '@id': this.site.idSite },
          dateModified: this.site.atualizadoEm,
        },
        this.trilhaLd(),
        this.faqLd(COMO_USAR.faq),
      ],
    };
  }
}

/**
 * A página inicial já existe (public/index.html, o hub dos alunos). Ela não é
 * reescrita: o servidor troca o <title>, acrescenta os metadados na cabeça e
 * uma seção "Para professores" antes do rodapé.
 */
class PaginaInicio extends Pagina {
  get caminho() { return '/'; }
  get titulo() { return HOME.titulo; }
  get descricao() { return HOME.descricao; }
  get tipoOg() { return 'website'; }
  get resumo() {
    return `${this.site.nome} reúne ${this.contexto.atividades.length} atividades gratuitas de informática para alunos do ${NIVEL}. Rodam no navegador, sem instalação.`;
  }

  trilha() {
    return [{ nome: 'Início', caminho: '/' }];
  }

  blocos() {
    return [
      { tipo: 'subtitulo', texto: 'Atividades' },
      {
        tipo: 'links',
        itens: this.contexto.atividades.map((a) => ({ texto: a.nome, href: a.caminho, detalhe: a.descricao })),
      },
      { tipo: 'subtitulo', texto: 'Como usar em sala de aula' },
      { tipo: 'paragrafo', texto: COMO_USAR.resumo },
      { tipo: 'links', itens: [{ texto: COMO_USAR.titulo, href: COMO_USAR.caminho }] },
      { tipo: 'subtitulo', texto: 'Perguntas frequentes' },
      { tipo: 'perguntas', nivel: 4, itens: HOME.faq },
      { tipo: 'nota', texto: `Atualizado em ${dataPorExtenso(this.site.atualizadoEm)}. Uma iniciativa ${this.site.editora.nome}.` },
    ];
  }

  blocosMarkdown() {
    return this.blocos().map((b) => {
      if (b.tipo === 'subtitulo') return { ...b, tipo: 'titulo' };
      if (b.tipo === 'perguntas') return { ...b, nivel: 3 };
      return b;
    });
  }

  jsonLd() {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        this.site.organizacaoLd(),
        this.site.siteLd(),
        {
          '@type': 'CollectionPage',
          '@id': `${this.url}#pagina`,
          name: this.titulo,
          description: this.descricao,
          url: this.url,
          inLanguage: this.site.idioma,
          isPartOf: { '@id': this.site.idSite },
          dateModified: this.site.atualizadoEm,
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: this.contexto.atividades.map((a, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: a.nome,
              url: this.site.absoluta(a.caminho),
            })),
          },
        },
        this.faqLd(HOME.faq),
      ],
    };
  }

  /** Aplica o SEO sobre o index.html: título, metadados e a seção para professores */
  aplicarEm(documento) {
    const cabeca = `  <title>${escapar(this.tituloCompleto())}</title>\n  ${this.metaTags()}\n  <link rel="stylesheet" href="/css/landing.css" />`;
    let html = documento.replace(/<title>[\s\S]*?<\/title>/, '');
    html = html.replace('</head>', `${cabeca}\n</head>`);
    const secao = `<section class="secao-professor" aria-labelledby="para-professores">
      <h2 id="para-professores" class="titulo-grupo">Para professores</h2>
      <p class="resumo-destaque">${escapar(this.resumo)}</p>
      ${paraHtml(this.blocos())}
    </section>`;
    return html.includes('<footer>') ? html.replace('<footer>', `${secao}\n\n    <footer>`) : html.replace('</main>', `${secao}\n  </main>`);
  }
}

/**
 * Os jogos são só uma casca em JavaScript ("Carregando..."): quem entende o
 * conteúdo é a página da atividade. A casca fica fora do índice (noindex) e
 * ganha descrição e Open Graph, para o link colado no WhatsApp mostrar um
 * cartão com título, texto e imagem.
 */
class CascaDoJogo {
  constructor(contexto, dados, pagina) {
    this.site = contexto.site;
    this.dados = dados;
    this.pagina = pagina;
    this.rotas = dados.rotas;
    this.arquivo = dados.arquivo;
  }

  metaTags() {
    const d = this.dados;
    const titulo = `${d.nome} | ${this.site.nome}`;
    const meta = metaSociais(this.site, {
      titulo,
      descricao: d.descricao,
      url: this.site.absoluta(d.jogo),
      imagem: this.site.absoluta(this.pagina.imagem),
      tipo: 'website',
    });
    return ['<meta name="robots" content="noindex" />', `<meta name="description" content="${escapar(d.descricao)}" />`, ...meta].join('\n  ');
  }

  aplicarEm(documento) {
    return documento.replace('</head>', `  ${this.metaTags()}\n</head>`);
  }
}

module.exports = { Site, Pagina, PaginaAtividade, PaginaComoUsar, PaginaInicio, CascaDoJogo, dataPorExtenso };
