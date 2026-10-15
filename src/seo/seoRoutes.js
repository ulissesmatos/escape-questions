const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { rota } = require('../http/routing');
const { COMO_USAR } = require('./conteudo');

/**
 * Rotas públicas para buscadores e assistentes de IA: robots.txt, sitemap.xml,
 * llms.txt, as páginas das atividades (HTML, ou Markdown quando o cliente pede
 * `Accept: text/markdown` ou termina o endereço em `.md`) e as cascas dos jogos.
 */
function seoRoutes({ catalogo, pastaPublica }) {
  const r = express.Router();

  const texto = (tipo, gerar) => (req, res) => {
    res.type(tipo).set('Cache-Control', 'public, max-age=3600').send(gerar());
  };
  r.get('/robots.txt', texto('text/plain; charset=utf-8', () => catalogo.robots()));
  r.get('/sitemap.xml', texto('application/xml; charset=utf-8', () => catalogo.sitemap()));
  r.get('/llms.txt', texto('text/plain; charset=utf-8', () => catalogo.llmsTxt()));

  /**
   * Descoberta por agentes (RFC 8288 / RFC 9727 §3): a página inicial aponta
   * para o que descreve o site. Só entra o que existe, e não há api-catalog:
   * as rotas /api são internas dos jogos, não uma API pública.
   */
  const linksDaInicio = [
    '</llms.txt>; rel="describedby"; type="text/plain"',
    `<${COMO_USAR.caminho}>; rel="service-doc"; type="text/html"`,
    `<${catalogo.inicio.caminhoMarkdown}>; rel="alternate"; type="text/markdown"`,
  ];

  const entregar = (pagina, montarHtml) =>
    rota(async (req, res) => {
      res.vary('Accept');
      res.set('Cache-Control', 'public, max-age=0');
      res.set('Link', pagina === catalogo.inicio ? linksDaInicio.join(', ') : `<${pagina.caminhoMarkdown}>; rel="alternate"; type="text/markdown"`);
      if (req.accepts(['html', 'text/markdown']) === 'text/markdown') {
        return res.type('text/markdown; charset=utf-8').send(pagina.markdown());
      }
      res.type('html').send(await montarHtml());
    });

  // A página inicial é o hub que já existe, com o SEO aplicado por cima
  r.get(
    ['/', '/index.html'],
    entregar(catalogo.inicio, async () => catalogo.inicio.aplicarEm(await fs.readFile(path.join(pastaPublica, 'index.html'), 'utf8')))
  );

  for (const pagina of catalogo.paginas.filter((p) => p !== catalogo.inicio)) {
    r.get(pagina.caminho, entregar(pagina, async () => pagina.html()));
  }

  // /atividades/robo-na-horta.md, /como-usar.md, /index.md
  r.get(/^\/(.+)\.md$/, (req, res, next) => {
    const alvo = req.params[0] === 'index' ? '/' : `/${req.params[0]}`;
    const pagina = catalogo.pagina(alvo);
    if (!pagina) return next();
    res.type('text/markdown; charset=utf-8').set('Cache-Control', 'public, max-age=0').send(pagina.markdown());
  });

  // Cascas dos jogos: o arquivo é o mesmo de public/, com noindex e Open Graph
  for (const casca of catalogo.cascas) {
    r.get(
      casca.rotas,
      rota(async (req, res) => {
        const documento = await fs.readFile(path.join(pastaPublica, casca.arquivo), 'utf8');
        res.set('Cache-Control', 'public, max-age=0').type('html').send(casca.aplicarEm(documento));
      })
    );
  }

  return r;
}

module.exports = { seoRoutes };
