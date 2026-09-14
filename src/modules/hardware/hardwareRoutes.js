const express = require('express');
const { rota, validar } = require('../../http/routing');

/** Rotas do aluno no Mapa de Hardware. Nenhuma devolve gabarito. */
function hardwareRoutes(jogo) {
  const r = express.Router();

  r.post('/niveis', rota(async (req, res) => {
    res.json(await jogo.niveis(validar.identidade(req.body)));
  }));

  r.post('/mapa', rota(async (req, res) => {
    const identidade = validar.identidade(req.body);
    res.json(await jogo.mapa(identidade, validar.id(req.body.nivelId, 'Nível inválido.')));
  }));

  r.post('/desafios', rota(async (req, res) => {
    const identidade = validar.identidade(req.body);
    res.status(201).json(await jogo.novoDesafio(identidade, validar.id(req.body.componentId, 'Peça inválida.')));
  }));

  r.post('/desafios/:id/resposta', rota(async (req, res) => {
    const identidade = validar.identidade(req.body);
    const desafioId = validar.texto(req.params.id, 'Pergunta inválida.', { max: 64 });
    const resposta = req.body.resposta && typeof req.body.resposta === 'object' ? req.body.resposta : {};
    res.json(await jogo.responder(identidade, desafioId, resposta));
  }));

  return r;
}

module.exports = hardwareRoutes;
