// Executa o plano do robô passo a passo. É um gerador: cada `next()` faz uma
// coisa (uma ação ou uma pergunta) e devolve o que aconteceu, para a tela
// animar no ritmo dela. O valor final (done) diz se a horta ficou pronta.

/** Bateria do robô: evita que um "Repita até" que nunca termina trave o jogo */
export const BATERIA = 400;

class Parada {
  constructor(resultado) {
    this.resultado = resultado;
  }
}

/**
 * Eventos:
 *   { tipo: 'acao', bloco, acao, resultado }   resultado = Horta.agir()
 *   { tipo: 'pergunta', bloco, condicao, valor }
 *   { tipo: 'volta', bloco, volta, total }     início de cada volta do Repita
 * Resultado final: { ok, motivo?, mensagem?, bloco? }
 */
export function* executar(plano, horta, { bateria = BATERIA } = {}) {
  let gasto = 0;
  const gastar = (bloco) => {
    gasto += 1;
    if (gasto > bateria) {
      throw new Parada({
        ok: false,
        motivo: 'bateria',
        bloco: bloco.id,
        mensagem: 'A bateria do robô acabou! Ele ficou repetindo sem parar. Confira quando o "Repita" termina.',
      });
    }
  };

  function* rodar(lista) {
    for (const bloco of lista) {
      gastar(bloco);
      switch (bloco.tipo) {
        case 'repita':
          for (let volta = 1; volta <= bloco.vezes; volta++) {
            yield { tipo: 'volta', bloco: bloco.id, volta, total: bloco.vezes };
            yield* rodar(bloco.corpo);
            if (volta < bloco.vezes) gastar(bloco);
          }
          break;
        case 'repitaAte':
          for (;;) {
            const valor = horta.sensor(bloco.condicao);
            yield { tipo: 'pergunta', bloco: bloco.id, condicao: bloco.condicao, valor };
            if (valor) break;
            yield* rodar(bloco.corpo);
            gastar(bloco);
          }
          break;
        case 'se':
        case 'seSenao': {
          const valor = horta.sensor(bloco.condicao);
          yield { tipo: 'pergunta', bloco: bloco.id, condicao: bloco.condicao, valor };
          if (valor) yield* rodar(bloco.corpo);
          else if (bloco.senao) yield* rodar(bloco.senao);
          break;
        }
        default: {
          const resultado = horta.agir(bloco.tipo);
          yield { tipo: 'acao', bloco: bloco.id, acao: bloco.tipo, resultado };
          if (!resultado.ok) throw new Parada({ ok: false, motivo: 'erro', bloco: bloco.id, mensagem: resultado.erro });
        }
      }
    }
  }

  try {
    yield* rodar(plano);
  } catch (erro) {
    if (erro instanceof Parada) return erro.resultado;
    throw erro;
  }
  if (horta.concluida()) return { ok: true };
  return { ok: false, motivo: 'incompleto', mensagem: horta.descreverFalta() };
}

/** Roda até o fim, sem animação (testes e conferência rápida) */
export function executarTudo(plano, horta, opcoes) {
  const execucao = executar(plano, horta, opcoes);
  let passo = execucao.next();
  while (!passo.done) passo = execucao.next();
  return passo.value;
}
