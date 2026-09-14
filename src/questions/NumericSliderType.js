const QuestionType = require('./QuestionType');

/**
 * Resposta numérica escolhida num slider (com campo para ajuste fino). Ótimo
 * com variantes: "8 GB têm quantos MB?", "16 GB têm quantos MB?"...
 *
 * conteudo: { min, max, passo, unidade?, resposta, tolerancia? }
 */
class NumericSliderType extends QuestionType {
  static tipo = 'numero';
  static rotulo = 'Número (slider)';
  static descricao = 'O aluno arrasta um slider até o valor certo.';

  valores(conteudo) {
    return {
      min: Number(conteudo.min),
      max: Number(conteudo.max),
      passo: Number(conteudo.passo) || 1,
      resposta: Number(conteudo.resposta),
      tolerancia: Math.max(0, Number(conteudo.tolerancia) || 0),
      unidade: String(conteudo.unidade || '').trim(),
    };
  }

  validarConteudo(conteudo) {
    const v = this.valores(conteudo);
    if (![v.min, v.max, v.resposta].every(Number.isFinite)) return 'Preencha mínimo, máximo e resposta com números.';
    if (v.min >= v.max) return 'O mínimo precisa ser menor que o máximo.';
    if (v.passo <= 0) return 'O passo precisa ser maior que zero.';
    if (v.resposta < v.min || v.resposta > v.max) return 'A resposta precisa estar entre o mínimo e o máximo.';
    if ((v.max - v.min) / v.passo > 2000) return 'Intervalo grande demais para o passo escolhido (máx. 2000 posições).';
    return null;
  }

  montar(questao, rng) {
    const v = this.valores(questao.conteudo || {});
    const posicoes = Math.round((v.max - v.min) / v.passo);

    // Posição inicial sorteada, longe da resposta, para ninguém enviar sem mexer
    let inicial = v.min;
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      const candidato = v.min + rng.int(0, posicoes) * v.passo;
      if (Math.abs(candidato - v.resposta) > v.tolerancia + v.passo) {
        inicial = candidato;
        break;
      }
    }

    return {
      publico: { min: v.min, max: v.max, passo: v.passo, unidade: v.unidade, inicial: arredondar(inicial) },
      gabarito: { resposta: v.resposta, tolerancia: v.tolerancia },
    };
  }

  corrigir(gabarito, resposta) {
    const valor = Number(resposta?.valor);
    if (!Number.isFinite(valor)) return false;
    return Math.abs(valor - gabarito.resposta) <= gabarito.tolerancia + 1e-9;
  }

  tempoInteracaoMs() {
    return 800;
  }

  descreverResposta(publico, resposta) {
    const valor = Number(resposta?.valor);
    return Number.isFinite(valor) ? `${formatar(valor)} ${publico.unidade || ''}`.trim() : '(sem resposta)';
  }

  descreverGabarito(publico, gabarito) {
    return `${formatar(gabarito.resposta)} ${publico.unidade || ''}`.trim();
  }
}

function arredondar(n) {
  return Math.round(n * 1e6) / 1e6;
}

function formatar(n) {
  return arredondar(n).toLocaleString('pt-BR');
}

module.exports = NumericSliderType;
