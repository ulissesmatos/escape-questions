const express = require('express');
const { rota, validar } = require('../../http/routing');
const { PistaResource, EnvioResource } = require('./admin/recursos');

function escapeRoutes(servico) {
  const r = express.Router();

  r.get('/pistas', rota(async (req, res) => res.json(await servico.pistasPublicas())));

  r.post('/envios', rota(async (req, res) => {
    const identidade = validar.identidade(req.body);
    const respostas = req.body.respostas && typeof req.body.respostas === 'object' ? req.body.respostas : {};
    res.status(201).json(await servico.corrigirEnvio(identidade, respostas));
  }));

  return r;
}

function adminEscapeRoutes(db) {
  const r = express.Router();
  r.use('/pistas', new PistaResource(db).router());
  r.use('/envios', new EnvioResource(db).router());
  return r;
}

module.exports = { escapeRoutes, adminEscapeRoutes };
