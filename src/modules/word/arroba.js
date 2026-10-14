const { nomeOfensivo } = require('../laboratorio/nomes');

/**
 * O "@" do aluno na Operação Word: é o login dele (sem senha).
 *
 * Regras (as mesmas de public/js/pages/word/regras/arroba.js, que dá a
 * resposta na hora enquanto o aluno digita; um teste confere que as duas
 * concordam):
 * - minúsculo e sem acento ("@Ana.Júlia" vira "ana.julia");
 * - de 3 a 20 letras, números, ponto ou _;
 * - começa com letra e não termina com ponto;
 * - sem palavrão e sem nomes reservados.
 */
const RESERVADOS = new Set(['admin', 'administrador', 'professor', 'professora', 'prof', 'central', 'sistema', 'suporte', 'root', 'moderador', 'kaos', 'drkaos']);

function normalizarArroba(texto) {
  return String(texto ?? '')
    .trim()
    .replace(/^@+/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

/** Devolve o @ limpo (sem o símbolo) ou lança Error com a mensagem para o aluno */
function validarArroba(texto) {
  const arroba = normalizarArroba(texto);
  if (arroba.length < 3) throw new Error('O @ precisa ter pelo menos 3 letras.');
  if (arroba.length > 20) throw new Error('Use um @ menor (até 20 letras).');
  if (!/^[a-z0-9._]+$/.test(arroba)) throw new Error('Use só letras, números, ponto ou _ no @.');
  if (!/^[a-z]/.test(arroba)) throw new Error('O @ precisa começar com uma letra.');
  if (arroba.endsWith('.')) throw new Error('O @ não pode terminar com ponto.');
  if (/[._]{2}/.test(arroba)) throw new Error('Não use dois símbolos seguidos (.. ou __).');
  if (RESERVADOS.has(arroba.replace(/[._]/g, ''))) throw new Error('Esse @ é reservado. Escolha outro.');
  if (nomeOfensivo(arroba.replace(/[._]/g, ' '))) throw new Error('Esse @ não é permitido. Escolha outro.');
  return arroba;
}

module.exports = { validarArroba, normalizarArroba };
