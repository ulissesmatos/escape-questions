const express = require('express');
const { rota } = require('../../http/routing');

/** GET /api/horta/config: o jogo lê as configurações ao abrir (sem login) */
function hortaRoutes(config) {
  const r = express.Router();
  r.get('/config', rota(async (req, res) => res.json(await config.ler())));
  return r;
}

/** /api/admin/horta/config: o professor lê e muda (exige a sessão do admin) */
function adminHortaRoutes(config) {
  const r = express.Router();
  r.get('/config', rota(async (req, res) => res.json(await config.ler())));
  r.put('/config', rota(async (req, res) => res.json(await config.salvar(req.body || {}))));
  return r;
}

module.exports = { hortaRoutes, adminHortaRoutes };
