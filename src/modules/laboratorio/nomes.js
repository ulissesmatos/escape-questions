const { normalizar } = require('../../shared/texto');

/**
 * Validação do nome que o aluno digita ao entrar na sala.
 *
 * O filtro de palavrões é propositalmente simples (uma lista de raízes): ele
 * barra o caso comum de "nome engraçadinho" sem pretender ser perfeito. O
 * professor ainda pode renomear ou expulsar pelo painel.
 */

// Palavras curtas ou que aparecem dentro de nomes comuns só valem como palavra
// inteira (para não barrar "Lucas" por causa de "cu", nem "Caputo" ou
// "Dickson"); as raízes longas valem também dentro de outra palavra.
const PALAVRAS_INTEIRAS = [
  'cu', 'cus', 'pau', 'paus', 'rola', 'pinto', 'xota', 'teta', 'tetas', 'bct', 'pqp', 'vsf', 'tnc', 'fdp', 'krl',
  'crl', 'porra', 'cacete', 'bosta', 'merda', 'gay', 'viado', 'veado', 'anus', 'puta', 'puto', 'putas', 'putos',
  'nazi', 'nazista', 'shit', 'dick', 'macaco', 'macaca', 'burro', 'burra', 'lixo',
];
const RAIZES = [
  'arrombad', 'babac', 'boquet', 'bucet', 'caralh', 'corno', 'cuzao', 'desgracad', 'escrot', 'fodas', 'foder',
  'fodid', 'fuder', 'fudid', 'idiota', 'imbecil', 'otari', 'piroc', 'porno', 'punhet', 'putinh', 'putona',
  'retardad', 'safad', 'sexo', 'tesao', 'trouxa', 'vadia', 'vagabund', 'xoxot', 'hitler', 'estupr', 'fuck',
  'bitch', 'pussy', 'nigg',
];

// Compara sem letras repetidas: "porrrra" e "porra" viram "pora"
const semRepeticao = (texto) => texto.replace(/(.)\1+/g, '$1');
const INTEIRAS = new Set(PALAVRAS_INTEIRAS.map(semRepeticao));
const RAIZES_LIMPAS = RAIZES.map(semRepeticao);

// Troca números e símbolos usados para disfarçar letras ("p0rr4")
const DISFARCES = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i' };

function desfazerDisfarces(texto) {
  return String(texto).replace(/[0134578@$!]/g, (c) => DISFARCES[c]);
}

/** true se o nome contém palavrão (mesmo com letras repetidas ou disfarçadas) */
function nomeOfensivo(nome) {
  const palavras = semRepeticao(normalizar(desfazerDisfarces(nome))).split(' ').filter(Boolean);
  if (palavras.some((p) => INTEIRAS.has(p))) return true;
  const junto = palavras.join('');
  return RAIZES_LIMPAS.some((raiz) => junto.includes(raiz));
}

/** Chave para comparar nomes repetidos ("Ana  Júlia" = "ana julia") */
function chaveNome(nome) {
  return normalizar(nome).replace(/\s+/g, ' ');
}

/** Devolve o nome limpo ou lança Error com a mensagem para o aluno */
function validarNome(nome) {
  const limpo = String(nome ?? '').replace(/\s+/g, ' ').trim();
  if (limpo.length < 2) throw new Error('Digite seu nome (pelo menos 2 letras).');
  if (limpo.length > 20) throw new Error('Use um nome menor (até 20 letras).');
  if (!/^[\p{L}\p{N} .'-]+$/u.test(limpo)) throw new Error('Use só letras e números no nome.');
  if (!/\p{L}/u.test(limpo)) throw new Error('O nome precisa ter letras.');
  if (nomeOfensivo(limpo)) throw new Error('Esse nome não é permitido. Use seu nome de verdade.');
  return limpo;
}

module.exports = { validarNome, nomeOfensivo, chaveNome };
