const QuestionType = require('./QuestionType');
const { normalizar, distanciaEdicao } = require('../shared/texto');

/**
 * Resposta escrita curta. Aceita várias grafias ("RAM", "memória ram"),
 * ignora acentos/maiúsculas e tolera pequenos erros de digitação em
 * palavras maiores (sem aceitar respostas diferentes).
 *
 * conteudo: { respostas: string[], tolerancia?: number, dica?: string }
 */
class TextAnswerType extends QuestionType {
  static tipo = 'texto';
  static rotulo = 'Resposta escrita';
  static descricao = 'O aluno digita a resposta. Aceita variações de grafia.';

  validarConteudo(conteudo) {
    const respostas = QuestionType.listaDeTextos(conteudo.respostas);
    if (respostas.length < 1) return 'Cadastre ao menos 1 resposta aceita.';
    if (respostas.some((r) => !normalizar(r))) return 'Toda resposta aceita precisa ter letras ou números.';
    return null;
  }

  montar(questao) {
    const conteudo = questao.conteudo || {};
    const respostas = QuestionType.listaDeTextos(conteudo.respostas).map(normalizar);
    const maior = Math.max(...respostas.map((r) => r.length));
    return {
      publico: {
        dica: String(conteudo.dica || '').trim(),
        maxCaracteres: Math.max(20, Math.min(80, maior * 3)),
      },
      gabarito: {
        respostas,
        tolerancia: Number.isInteger(conteudo.tolerancia) ? conteudo.tolerancia : null,
        exemplo: QuestionType.listaDeTextos(conteudo.respostas)[0],
      },
    };
  }

  toleranciaPara(resposta, gabarito) {
    if (gabarito.tolerancia !== null && gabarito.tolerancia !== undefined) return gabarito.tolerancia;
    if (resposta.length >= 10) return 2;
    if (resposta.length >= 5) return 1;
    return 0;
  }

  corrigir(gabarito, resposta) {
    const texto = normalizar(resposta?.texto);
    if (!texto) return false;
    return gabarito.respostas.some((aceita) => {
      if (aceita === texto) return true;
      return distanciaEdicao(aceita, texto) <= this.toleranciaPara(aceita, gabarito);
    });
  }

  tempoInteracaoMs(publico) {
    return 900;
  }

  descreverResposta(publico, resposta) {
    return String(resposta?.texto ?? '').trim() || '(em branco)';
  }

  descreverGabarito(publico, gabarito) {
    return gabarito?.exemplo || '';
  }
}

module.exports = TextAnswerType;
