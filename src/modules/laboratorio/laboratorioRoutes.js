const express = require('express');
const { rota } = require('../../http/routing');
const HttpError = require('../../http/HttpError');

/**
 * Rotas HTTP do Laboratório (o jogo em si corre pelo Socket.IO):
 *   POST /login            { senha: PIN do professor } → token de sessão
 *   GET  /tarefas          tarefas atuais (com respostas), para o editor
 *   PUT  /tarefas          salva a lista editada no painel
 *   DELETE /tarefas        volta para o tasks.json
 */
function laboratorioRoutes({ servico, auth }) {
  const router = express.Router();
  const exigir = auth.exigirSessao();

  router.post('/login', (req, res, next) => {
    try {
      res.json(auth.login(req.body && req.body.senha, req.ip));
    } catch (err) {
      next(err);
    }
  });

  const enviarTarefas = (res) =>
    res.json({ tarefas: servico.catalogo.atuais, personalizadas: servico.catalogo.personalizadas });

  router.get('/tarefas', exigir, (req, res) => enviarTarefas(res));

  router.put('/tarefas', exigir, rota(async (req, res) => {
    try {
      await servico.catalogo.salvar(req.body && req.body.tarefas);
    } catch (erro) {
      if (erro instanceof HttpError) throw erro;
      if (erro.code) throw erro; // erro do banco: vira 500
      throw HttpError.badRequest(erro.message);
    }
    enviarTarefas(res);
  }));

  router.delete('/tarefas', exigir, rota(async (req, res) => {
    await servico.catalogo.restaurarPadrao();
    enviarTarefas(res);
  }));

  return router;
}

module.exports = { laboratorioRoutes };
