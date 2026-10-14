/**
 * O "@" do aluno: é o login da Operação Word (sem senha).
 * Mesmas regras de src/modules/word/arroba.js (o servidor confere de novo e
 * também barra palavrões); aqui servem para responder enquanto o aluno digita.
 */
const RESERVADOS = new Set(['admin', 'administrador', 'professor', 'professora', 'prof', 'central', 'sistema', 'suporte', 'root', 'moderador', 'kaos', 'drkaos']);

export function normalizarArroba(texto) {
  return String(texto ?? '')
    .trim()
    .replace(/^@+/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

/** Mensagem do problema, ou '' se o @ está no formato certo */
export function problemaDoArroba(texto) {
  const arroba = normalizarArroba(texto);
  if (arroba.length < 3) return 'O @ precisa ter pelo menos 3 letras.';
  if (arroba.length > 20) return 'Use um @ menor (até 20 letras).';
  if (!/^[a-z0-9._]+$/.test(arroba)) return 'Use só letras, números, ponto ou _ no @.';
  if (!/^[a-z]/.test(arroba)) return 'O @ precisa começar com uma letra.';
  if (arroba.endsWith('.')) return 'O @ não pode terminar com ponto.';
  if (/[._]{2}/.test(arroba)) return 'Não use dois símbolos seguidos (.. ou __).';
  if (RESERVADOS.has(arroba.replace(/[._]/g, ''))) return 'Esse @ é reservado. Escolha outro.';
  return '';
}

const limpar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

/** Ideias de @ a partir do nome e da turma: "Ana Júlia Souza", "7º B" → ana.souza, anajulia7b... */
export function sugerirArrobas(nome, turma = '') {
  const partes = limpar(nome).filter((p) => /^[a-z]/.test(p) && !['da', 'de', 'do', 'das', 'dos', 'e'].includes(p));
  if (!partes.length) return [];
  const [primeiro] = partes;
  const ultimo = partes.length > 1 ? partes[partes.length - 1] : '';
  const turmaCurta = limpar(turma).join('').replace(/ano|serie/g, '').slice(0, 4);
  const ideias = [
    ultimo && `${primeiro}.${ultimo}`,
    partes.length > 1 && partes.slice(0, 2).join(''),
    turmaCurta && `${primeiro}${turmaCurta}`,
    ultimo && `${primeiro}_${ultimo.slice(0, 1)}`,
    `agente.${primeiro}`,
    `${primeiro}${String(new Date().getFullYear()).slice(2)}`,
  ];
  return [...new Set(ideias.filter(Boolean).map(normalizarArroba))].filter((a) => !problemaDoArroba(a)).slice(0, 4);
}
