const express = require('express');
const { rota, validar } = require('../../../http/routing');
const { NivelResource, ComponenteResource, ConexaoResource, QuestaoResource } = require('./recursos');
const HardwareProgressService = require('./HardwareProgressService');

function adminHardwareRoutes({ db, tipos }) {
  const r = express.Router();
  const progresso = new HardwareProgressService(db);

  r.use('/niveis', new NivelResource(db).router());
  r.use('/componentes', new ComponenteResource(db).router());
  r.use('/conexoes', new ConexaoResource(db).router());
  r.use('/questoes', new QuestaoResource(db, tipos).router());

  r.get('/alunos', rota(async (req, res) => {
    res.json(await progresso.alunos({ turma: String(req.query.turma || '') }));
  }));

  r.post('/alunos/detalhe', rota(async (req, res) => {
    res.json(await progresso.detalhe(validar.identidade(req.body)));
  }));

  r.post('/alunos/zerar', rota(async (req, res) => {
    res.json(await progresso.zerar(validar.identidade(req.body)));
  }));

  return r;
}

module.exports = adminHardwareRoutes;
