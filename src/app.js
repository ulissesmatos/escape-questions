const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Server: SocketServer } = require('socket.io');

const config = require('./config');
const Database = require('./db/Database');
const { garantirSchema } = require('./db/schema');
const { errorHandler } = require('./http/routing');
const HttpError = require('./http/HttpError');
const { AdminAuth } = require('./auth/AdminAuth');
const { registroPadrao } = require('./questions/QuestionTypeRegistry');

const { EscapeRoomService } = require('./modules/escape/EscapeRoomService');
const { escapeRoutes } = require('./modules/escape/escapeRoutes');
const { semearEscapeRoom } = require('./modules/escape/seed');

const HardwareRepository = require('./modules/hardware/HardwareRepository');
const HardwareGameService = require('./modules/hardware/HardwareGameService');
const HardwareSeeder = require('./modules/hardware/HardwareSeeder');
const AdaptiveEngine = require('./modules/hardware/AdaptiveEngine');
const GuessGuard = require('./modules/hardware/GuessGuard');
const hardwareRoutes = require('./modules/hardware/hardwareRoutes');

const PcBuildService = require('./modules/pcbuild/PcBuildService');
const { pcbuildRoutes } = require('./modules/pcbuild/pcbuildRoutes');
const { semearMonteOPc } = require('./modules/pcbuild/seed');

const { LaboratorioService } = require('./modules/laboratorio/LaboratorioService');
const { CatalogoDeTarefas } = require('./modules/laboratorio/tarefas');
const { RepositorioLaboratorio } = require('./modules/laboratorio/repositorios');
const { laboratorioRoutes } = require('./modules/laboratorio/laboratorioRoutes');
const { ligarLaboratorio } = require('./modules/laboratorio/laboratorioSocket');

const { HortaConfig } = require('./modules/horta/HortaConfig');
const { hortaRoutes } = require('./modules/horta/hortaRoutes');

const adminRoutes = require('./modules/admin/adminRoutes');
const { oficinaRoutes } = require('./modules/oficina/oficinaRoutes');

/**
 * Monta a aplicação: dependências são criadas aqui uma única vez e injetadas
 * nos serviços/rotas (fica fácil trocar peças em testes).
 */
function criarApp({ db, auth, laboratorio, tipos = registroPadrao, oficina = {} }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // atrás do proxy do Coolify, para req.ip ser o IP real

  app.use(express.json({ limit: '200kb' }));

  const jogoHardware = new HardwareGameService({
    db,
    repo: new HardwareRepository(db),
    tipos,
    motor: new AdaptiveEngine(),
    guarda: new GuessGuard(),
  });

  app.use('/api/escape', escapeRoutes(new EscapeRoomService(db)));
  app.use('/api/hardware', hardwareRoutes(jogoHardware));
  app.use('/api/pcbuild', pcbuildRoutes(new PcBuildService(db)));
  app.use('/api/horta', hortaRoutes(new HortaConfig(db)));
  app.use('/api/admin', adminRoutes({ db, auth, tipos }));

  app.use('/api/oficina', oficinaRoutes({ podeEditarZonas: !config.isProduction, ...oficina }));
  if (laboratorio) app.use('/api/laboratorio', laboratorioRoutes(laboratorio));

  app.use('/api', (req, res, next) => next(HttpError.notFound('Rota não encontrada.')));

  // Phaser vem do node_modules (versão fixada no package.json), sem cópia no repositório
  const pastaPhaser = path.join(path.dirname(require.resolve('phaser/package.json')), 'dist');
  app.use('/vendor/phaser', express.static(pastaPhaser, { maxAge: '7d' }));

  // Laboratório: /laboratorio (aluno), /laboratorio/professor e /laboratorio/telao/CODIGO
  const pastaPublica = path.join(__dirname, '..', 'public');
  app.get('/laboratorio/professor', (req, res) => res.sendFile(path.join(pastaPublica, 'laboratorio-professor.html')));
  app.get(['/laboratorio/telao', '/laboratorio/telao/:codigo'], (req, res) => res.sendFile(path.join(pastaPublica, 'laboratorio-telao.html')));

  app.use(express.static(pastaPublica, { extensions: ['html'] }));
  app.use(errorHandler);
  return app;
}

async function iniciar() {
  const db = new Database(config.databaseUrl);
  await garantirSchema(db);
  await semearEscapeRoom(db);
  await new HardwareSeeder(db, registroPadrao).executar();
  await semearMonteOPc(db);

  const auth = new AdminAuth({ senha: config.adminPassword, segredo: config.sessionSecret, horas: config.sessionHours });
  const laboratorio = await criarLaboratorio(new RepositorioLaboratorio(db));
  const app = criarApp({ db, auth, laboratorio });

  const servidor = app.listen(config.port, () => {
    console.log(`Servidor rodando em http://localhost:${config.port}`);
  });
  ligarTempoReal(servidor, laboratorio);

  const encerrar = async () => {
    servidor.close();
    await laboratorio.servico.parar();
    await db.close();
    process.exit(0);
  };
  process.on('SIGTERM', encerrar);
  process.on('SIGINT', encerrar);
  return servidor;
}

/**
 * Laboratório de Experimentos: serviço das salas + sessão do professor.
 * O PIN tem uma sessão própria (outro segredo), separada da área do admin.
 */
async function criarLaboratorio(repositorio, { pin = config.professorPin } = {}) {
  const segredo = crypto.createHash('sha256').update(`laboratorio:${config.sessionSecret || pin}`).digest('hex');
  const auth = new AdminAuth({ senha: pin, segredo, horas: config.sessionHours });
  const servico = new LaboratorioService({ catalogo: new CatalogoDeTarefas({ repositorio }), repositorio });
  await servico.carregar();
  servico.iniciarRelogio();
  return { servico, auth };
}

/** Liga o Socket.IO no mesmo servidor HTTP (mesma porta 3000) */
function ligarTempoReal(servidor, laboratorio) {
  const io = new SocketServer(servidor, {
    maxHttpBufferSize: 32 * 1024, // registros têm no máximo 1000 letras
    pingInterval: 10000,
    pingTimeout: 8000,
  });
  ligarLaboratorio(io, laboratorio);
  return io;
}

module.exports = { criarApp, iniciar, criarLaboratorio, ligarTempoReal };
