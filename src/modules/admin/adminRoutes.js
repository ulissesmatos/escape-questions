const express = require('express');
const { rota } = require('../../http/routing');
const AdminDashboardService = require('./AdminDashboardService');
const { adminEscapeRoutes } = require('../escape/escapeRoutes');
const { adminPcbuildRoutes } = require('../pcbuild/pcbuildRoutes');
const adminHardwareRoutes = require('../hardware/admin/adminHardwareRoutes');

function adminRoutes({ db, auth, tipos }) {
  const r = express.Router();
  const painel = new AdminDashboardService(db);

  r.post('/login', (req, res, next) => {
    try {
      res.json(auth.login(req.body && req.body.senha, req.ip));
    } catch (err) {
      next(err);
    }
  });

  // Tudo abaixo exige sessão válida
  r.use(auth.exigirSessao());

  r.get('/sessao', (req, res) => res.json({ ok: true, expiraEm: req.sessaoAdmin.exp }));
  r.get('/turmas', rota(async (req, res) => res.json(await painel.turmas())));
  r.get('/resumo', rota(async (req, res) => res.json(await painel.resumo({ turma: String(req.query.turma || '') }))));

  r.use('/escape', adminEscapeRoutes(db));
  r.use('/hardware', adminHardwareRoutes({ db, tipos }));
  r.use('/pcbuild', adminPcbuildRoutes(db));

  return r;
}

module.exports = adminRoutes;
