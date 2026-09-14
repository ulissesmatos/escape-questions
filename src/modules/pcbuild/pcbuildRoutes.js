const express = require('express');
const { rota, validar } = require('../../http/routing');
const { MissaoResource, PropostaResource } = require('./admin/recursos');

function pcbuildRoutes(servico) {
  const r = express.Router();
  r.get('/missoes', rota(async (req, res) => res.json(await servico.missoesAtivas())));
  r.post('/propostas', rota(async (req, res) => {
    res.status(201).json(await servico.enviarProposta(validar.identidade(req.body), req.body));
  }));
  return r;
}

function adminPcbuildRoutes(db) {
  const r = express.Router();
  r.use('/missoes', new MissaoResource(db).router());
  r.use('/propostas', new PropostaResource(db).router());
  return r;
}

module.exports = { pcbuildRoutes, adminPcbuildRoutes };
