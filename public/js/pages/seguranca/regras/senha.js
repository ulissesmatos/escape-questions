/**
 * Força da senha, explicada para o aluno (sem enviar nada para lugar
 * nenhum: a senha do jogo só existe na memória do navegador).
 *
 * Forte = 12 caracteres ou mais, com pelo menos 3 tipos (minúscula,
 * maiúscula, número, símbolo), sem sequência óbvia, sem o nome ou o @ do
 * aluno e fora da lista das senhas mais usadas. Uma frase-senha (16 ou mais,
 * com 3 palavras ou mais) também é forte, mesmo sem símbolo.
 */
const COMUNS = [
  '123456', '1234567', '12345678', '123456789', '1234567890', '654321', '111111', '000000', '123123', 'senha', 'senha123',
  'password', 'qwerty', 'abc123', 'iloveyou', 'admin', 'brasil', 'flamengo', 'corinthians', 'palmeiras', 'futebol',
  'minecraft', 'roblox', 'free fire', 'freefire', 'teamo', 'amor', 'familia', 'princesa', 'gatinho',
];
const SEQUENCIAS = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

const semAcento = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Tem 4 ou mais caracteres em sequência (1234, abcd, qwer) ou repetidos (aaaa)? */
function temSequencia(senha) {
  const s = semAcento(senha);
  for (let i = 0; i + 4 <= s.length; i++) {
    const pedaco = s.slice(i, i + 4);
    if (/^(.)\1{3}$/.test(pedaco)) return true;
    if (SEQUENCIAS.some((seq) => seq.includes(pedaco) || [...seq].reverse().join('').includes(pedaco))) return true;
  }
  return false;
}

export const NIVEIS = ['Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte'];

/**
 * avaliarSenha(senha, { nome, arroba }) →
 *   { pontos 0-4, nivel, forte, problemas: [texto], tipos: { minuscula, maiuscula, numero, simbolo } }
 */
export function avaliarSenha(senha, { nome = '', arroba = '' } = {}) {
  const texto = String(senha ?? '');
  const tipos = {
    minuscula: /[a-zà-ÿ]/.test(texto),
    maiuscula: /[A-ZÀ-Ý]/.test(texto),
    numero: /\d/.test(texto),
    simbolo: /[^\p{L}\p{N}]/u.test(texto),
  };
  const variedade = Object.values(tipos).filter(Boolean).length;
  const palavras = texto.split(/[\s\-_.]+/).filter((p) => p.length >= 3).length;
  const fraseSenha = texto.length >= 16 && palavras >= 3;
  const problemas = [];
  const limpa = semAcento(texto);
  const pessoais = [...semAcento(nome).split(/\s+/), ...semAcento(arroba).split(/[._]/)].filter((p) => p.length >= 3);

  if (!texto) return { pontos: 0, nivel: NIVEIS[0], forte: false, problemas: ['Digite uma senha.'], tipos, fraseSenha };
  if (COMUNS.includes(limpa) || COMUNS.some((c) => c.length >= 5 && limpa.replace(/\d+$/, '') === c)) problemas.push('Essa é uma das senhas mais usadas do mundo: é a primeira que um golpista tenta.');
  if (pessoais.some((p) => limpa.includes(p))) problemas.push('Não use o seu nome ou o seu @ na senha: são fáceis de adivinhar.');
  if (temSequencia(texto)) problemas.push('Evite sequências como 1234, abcd ou aaaa.');
  if (texto.length < 12 && !fraseSenha) problemas.push(`Use pelo menos 12 caracteres (agora tem ${texto.length}).`);
  if (variedade < 3 && !fraseSenha) {
    const faltam = [!tipos.maiuscula && 'letra maiúscula', !tipos.minuscula && 'letra minúscula', !tipos.numero && 'número', !tipos.simbolo && 'símbolo (! @ # -)'].filter(Boolean);
    problemas.push(`Misture mais tipos de caractere: falta ${faltam.slice(0, 2).join(' e ')}.`);
  }

  let pontos = Math.min(4, Math.floor(texto.length / 4)) * 0.5 + (variedade - 1) * 0.75 + (fraseSenha ? 2 : 0);
  if (problemas.length) pontos = Math.min(pontos, problemas.length > 1 ? 1 : 2);
  pontos = Math.max(0, Math.min(4, Math.round(pontos)));
  const forte = problemas.length === 0 && (texto.length >= 12 || fraseSenha);
  if (forte) pontos = Math.max(pontos, texto.length >= 16 ? 4 : 3);
  return { pontos, nivel: NIVEIS[pontos], forte, problemas, tipos, fraseSenha };
}
