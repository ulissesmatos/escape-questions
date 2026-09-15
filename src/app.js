const express = require('express');
const path = require('path');

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

const adminRoutes = require('./modules/admin/adminRoutes');
const { oficinaRoutes } = require('./modules/oficina/oficinaRoutes');

/**
 * Monta a aplicação: dependências são criadas aqui uma única vez e injetadas
 * nos serviços/rotas (fica fácil trocar peças em testes).
 */
function criarApp({ db, auth, tipos = registroPadrao, oficina = {} }) {
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
  app.use('/api/admin', adminRoutes({ db, auth, tipos }));

  app.use('/api/oficina', oficinaRoutes({ podeEditarZonas: !config.isProduction, ...oficina }));

  app.use('/api', (req, res, next) => next(HttpError.notFound('Rota não encontrada.')));

  // Phaser vem do node_modules (versão fixada no package.json), sem cópia no repositório
  const pastaPhaser = path.join(path.dirname(require.resolve('phaser/package.json')), 'dist');
  app.use('/vendor/phaser', express.static(pastaPhaser, { maxAge: '7d' }));

  app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));
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
  const app = criarApp({ db, auth });

  const servidor = app.listen(config.port, () => {
    console.log(`Servidor rodando em http://localhost:${config.port}`);
  });

  const encerrar = async () => {
    servidor.close();
    await db.close();
    process.exit(0);
  };
  process.on('SIGTERM', encerrar);
  process.on('SIGINT', encerrar);
  return servidor;
}

module.exports = { criarApp, iniciar };
