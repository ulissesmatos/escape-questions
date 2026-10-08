// Ajudas para quem está aprendendo o Repita, em JavaScript puro (testado com
// node:test):
// - acharRepeticao: percebe quando o aluno colocou o mesmo pedaço de plano
//   várias vezes seguidas e sugere um Repita (ou um Repita dentro de outro);
// - esqueleto: o "esqueleto" de uma solução, só com os blocos que guardam
//   outros (Repita, Se...), para a dica sem entregar a resposta.

import { BLOCOS, CONDICOES, copiarPlano, nomeCurto } from './blocos.js';
import { executar } from './Interpretador.js';

/** Texto que identifica um bloco e tudo o que está dentro dele (ignora o id) */
function assinatura(bloco) {
  const partes = [bloco.tipo, bloco.vezes ?? '', bloco.condicao ?? ''];
  if (bloco.corpo) partes.push(`[${bloco.corpo.map(assinatura).join(',')}]`);
  if (bloco.senao) partes.push(`[${bloco.senao.map(assinatura).join(',')}]`);
  return partes.join(':');
}

/** Nome de um bloco para a fala do robô ("Ande 1 casa", "Repita 6 vezes") */
export function nomeDoBloco(bloco) {
  if (bloco.tipo === 'repita') return `Repita ${bloco.vezes} vezes`;
  if (bloco.tipo === 'repitaAte') return `Repita até ${CONDICOES[bloco.condicao].ate}`;
  if (bloco.tipo === 'se' || bloco.tipo === 'seSenao') return `Se ${CONDICOES[bloco.condicao].se}`;
  return nomeCurto(bloco.tipo);
}

/**
 * Procura, em qualquer lista do plano, um pedaço de 1 a 8 blocos repetido
 * várias vezes seguidas. Um bloco sozinho só conta a partir de 3 vezes
 * ("Ande, Ande, Ande"); pedaços maiores contam a partir de 2.
 * Devolve a repetição que mais economiza blocos, ou null:
 *   { vezes, pedaco: [blocos], ids: [ids de todos os repetidos], temRepita }
 */
export function acharRepeticao(plano) {
  let melhor = null;
  const visitar = (lista) => {
    const sinais = lista.map(assinatura);
    for (let inicio = 0; inicio < lista.length; inicio++) {
      for (let tamanho = 1; tamanho <= 8 && inicio + tamanho * 2 <= lista.length; tamanho++) {
        let vezes = 1;
        while (
          inicio + (vezes + 1) * tamanho <= lista.length &&
          sinais.slice(inicio + vezes * tamanho, inicio + (vezes + 1) * tamanho).join('|') === sinais.slice(inicio, inicio + tamanho).join('|')
        ) {
          vezes += 1;
        }
        if (vezes < (tamanho === 1 ? 3 : 2)) continue;
        const economia = tamanho * vezes - (tamanho + 1);
        if (economia <= 0 || (melhor && economia <= melhor.economia)) continue;
        const pedaco = lista.slice(inicio, inicio + tamanho);
        melhor = {
          vezes,
          pedaco,
          ids: lista.slice(inicio, inicio + tamanho * vezes).map((b) => b.id),
          temRepita: pedaco.some((b) => b.tipo === 'repita'),
          economia,
        };
      }
    }
    for (const bloco of lista) {
      if (bloco.corpo) visitar(bloco.corpo);
      if (bloco.senao) visitar(bloco.senao);
    }
  };
  visitar(plano);
  return melhor;
}

/** Frase do robô sugerindo o Repita para a repetição encontrada */
export function sugestaoDeRepita({ vezes, pedaco, temRepita }) {
  if (pedaco.length === 1 && !temRepita) {
    return `Você colocou ${vezes} blocos "${nomeDoBloco(pedaco[0])}" seguidos. Que tal pôr um só dentro de um Repita ${vezes} vezes?`;
  }
  const nomes = pedaco.map(nomeDoBloco).join(', ');
  const final = temRepita ? ' Isso mesmo: dá para colocar um Repita dentro de outro Repita!' : '';
  return `Você colocou o mesmo pedaço (${nomes}) ${vezes} vezes seguidas. Coloque esse pedaço uma vez só, dentro de um Repita ${vezes} vezes.${final}`;
}

/**
 * Esqueleto de um plano: só os blocos que guardam outros (com o número de
 * vezes ou a pergunta), sem as ações. Mostra a forma da solução.
 */
export function esqueleto(plano) {
  const saida = [];
  for (const bloco of plano) {
    if (!BLOCOS[bloco.tipo].corpo) continue;
    const copia = { tipo: bloco.tipo };
    if (bloco.vezes) copia.vezes = bloco.vezes;
    if (bloco.condicao) copia.condicao = bloco.condicao;
    copia.corpo = esqueleto(bloco.corpo);
    if (bloco.senao) copia.senao = esqueleto(bloco.senao);
    saida.push(copia);
  }
  return saida;
}

/**
 * Caminho que um plano faz numa horta (sem mexer nela): segmentos de casa em
 * casa, com a volta do Repita de fora em `cor` (para pintar uma cor por volta).
 */
export function caminhoDoPlano(plano, horta) {
  const copia = horta.clonar();
  const comIds = copiarPlano(plano); // as voltas vêm com o id do bloco
  const deFora = new Set(comIds.map((b) => b.id));
  const segmentos = [];
  let cor = null;
  const execucao = executar(comIds, copia);
  for (let passo = execucao.next(); !passo.done; passo = execucao.next()) {
    const ev = passo.value;
    if (ev.tipo === 'volta' && deFora.has(ev.bloco)) cor = ev.volta - 1;
    if (ev.tipo === 'acao' && ev.acao === 'andar' && ev.resultado.ok) {
      segmentos.push({ de: ev.resultado.de, para: { x: copia.robo.x, y: copia.robo.y }, cor });
    }
  }
  return segmentos;
}
