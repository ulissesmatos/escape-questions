const fs = require('fs');
const path = require('path');
const { ATIVIDADES, SITE, NIVEL } = require('./conteudo');
const { Site, PaginaAtividade, PaginaComoUsar, PaginaInicio, CascaDoJogo } = require('./paginas');

/**
 * Robôs de assistentes de IA que buscam ou leem uma página a pedido de quem
 * está perguntando. Ficam liberados de forma explícita (ser citado é o ponto).
 * Os robôs de treinamento (GPTBot, ClaudeBot, Google-Extended...) não são
 * citados: ficam sob a regra geral, sem convite nem bloqueio.
 */
const ROBOS_DE_IA = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User'];

/**
 * Tudo o que é público e indexável: a página inicial, o "Como usar" e uma
 * página por atividade. Também gera robots.txt, sitemap.xml e llms.txt a
 * partir da mesma lista, então as três nunca ficam fora de sincronia.
 *
 * Uma atividade só entra se o arquivo do jogo existir em `pastaPublica`.
 */
class Catalogo {
  constructor({ url, pastaPublica, existe = (arquivo) => fs.existsSync(path.join(pastaPublica, arquivo)) }) {
    this.site = new Site({ url });
    const contexto = { site: this.site, atividades: [] };
    contexto.atividades = ATIVIDADES.filter((a) => existe(a.arquivo)).map((a) => ({ ...a, caminho: `/atividades/${a.slug}` }));

    this.inicio = new PaginaInicio(contexto);
    this.comoUsar = new PaginaComoUsar(contexto);
    this.atividades = contexto.atividades.map((dados) => new PaginaAtividade(contexto, dados));
    this.paginas = [this.inicio, this.comoUsar, ...this.atividades];
    this.cascas = this.atividades.map((pagina) => new CascaDoJogo(contexto, pagina.dados, pagina));
  }

  pagina(caminho) {
    return this.paginas.find((p) => p.caminho === caminho) || null;
  }

  robots() {
    const regras = ['Allow: /', 'Disallow: /api/'];
    const grupos = [
      ['User-agent: *', 'Content-Signal: search=yes, ai-input=yes', ...regras],
      ...ROBOS_DE_IA.map((robo) => [`User-agent: ${robo}`, ...regras]),
    ];
    return `${grupos.map((g) => g.join('\n')).join('\n\n')}\n\nSitemap: ${this.site.absoluta('/sitemap.xml')}\n`;
  }

  sitemap() {
    const itens = this.paginas
      .map((p) => `  <url>\n    <loc>${p.url}</loc>\n    <lastmod>${this.site.atualizadoEm}</lastmod>\n  </url>`)
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${itens}\n</urlset>\n`;
  }

  /** Formato de https://llmstxt.org: um índice em Markdown para assistentes de IA */
  llmsTxt() {
    return [
      `# ${SITE.nome}`,
      `> Atividades gratuitas de informática para o ${NIVEL}, em formato de jogo, que rodam direto no navegador, sem instalação. Uma iniciativa ${SITE.editora.nome}.`,
      'Cada atividade tem uma página com o resumo, a ficha (para quem, formato, o que precisa), o que o aluno aprende e perguntas frequentes. As páginas abaixo estão em Markdown.',
      '## Atividades',
      this.atividades.map((p) => p.linhaLlms()).join('\n'),
      '## Para professores',
      this.comoUsar.linhaLlms(),
      '## Sobre',
      `- [${SITE.editora.nome}](${SITE.editora.url}): empresa por trás do site`,
    ].join('\n\n') + '\n';
  }
}

module.exports = { Catalogo, ROBOS_DE_IA };
