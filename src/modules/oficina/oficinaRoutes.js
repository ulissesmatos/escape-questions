const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { pathToFileURL } = require('url');

const { rota } = require('../../http/routing');
const HttpError = require('../../http/HttpError');

const RAIZ = path.join(__dirname, '..', '..', '..');
const PASTA_ARTE_PADRAO = path.join(RAIZ, 'public', 'images', 'oficina');

// As regras das zonas são as mesmas do jogo (módulo ES em public/)
const MODULO_ZONAS = pathToFileURL(path.join(RAIZ, 'public', 'js', 'pages', 'oficina', 'jogo', 'sprites', 'zonas.js')).href;

/**
 * Oficina de PCs: lista da arte disponível e gravação das zonas calibradas no
 * editor visual. Gravar só é permitido fora de produção: o zonas.json vive no
 * repositório, junto dos PNGs (no servidor publicado ele seria perdido a cada
 * deploy).
 */
function oficinaRoutes({ pastaArte = PASTA_ARTE_PADRAO, podeEditarZonas = false } = {}) {
  const router = express.Router();

  router.get('/sprites', rota(async (req, res) => {
    const arquivos = await fs.readdir(pastaArte).catch(() => []);
    res.json(arquivos.filter((a) => a.endsWith('.png')).map((a) => a.replace(/\.png$/, '')));
  }));

  router.get('/zonas/editor', (req, res) => {
    res.json({ podeSalvar: podeEditarZonas });
  });

  router.put('/zonas', rota(async (req, res) => {
    if (!podeEditarZonas) {
      throw new HttpError(403, 'O editor de zonas só salva rodando localmente. Use "Copiar JSON" e salve em public/images/oficina/zonas.json.');
    }
    const { validarZonas, formatarZonas } = await import(MODULO_ZONAS);
    let zonas;
    try {
      ({ zonas } = validarZonas(req.body));
    } catch (erro) {
      throw HttpError.badRequest(erro.message);
    }
    await fs.writeFile(path.join(pastaArte, 'zonas.json'), formatarZonas(zonas));
    res.json({ ok: true, zonas });
  }));

  return router;
}

module.exports = { oficinaRoutes };
