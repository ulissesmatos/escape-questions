require('dotenv').config();

const config = Object.freeze({
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  adminPassword: process.env.ADMIN_PASSWORD || 'admin',
  // Segredo usado para assinar o token de sessão do professor. Se não for
  // definido, é derivado da senha — trocar a senha invalida as sessões.
  sessionSecret: process.env.SESSION_SECRET || '',
  sessionHours: Number(process.env.ADMIN_SESSION_HOURS) || 12,
  // PIN do painel do Laboratório de Experimentos (se vazio, usa a senha do admin)
  professorPin: process.env.PROFESSOR_PIN || process.env.ADMIN_PASSWORD || 'admin',
  isProduction: process.env.NODE_ENV === 'production',
});

if (!process.env.ADMIN_PASSWORD) {
  console.warn('[aviso] ADMIN_PASSWORD não definido — usando a senha padrão "admin". Defina no .env.');
}

if (!process.env.PROFESSOR_PIN) {
  console.warn('[aviso] PROFESSOR_PIN não definido: o painel do Laboratório usa a mesma senha do admin.');
}

module.exports = config;
