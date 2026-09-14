const QuestionType = require('./QuestionType');
const { normalizar } = require('../shared/texto');

/**
 * Palavra embaralhada: as letras aparecem fora de ordem e o aluno toca nelas
 * para montar a palavra. Rápido, mas exige saber o termo (não dá pra chutar).
 *
 * conteudo: { palavra: string, dica?: string }
 */
class AnagramType extends QuestionType {
  static tipo = 'anagrama';
  static rotulo = 'Palavra embaralhada';
  static descricao = 'Letras fora de ordem; o aluno monta a palavra.';

  letras(palavra) {
    return [...String(palavra || '').toUpperCase().replace(/[^A-ZÀ-Ý0-9]/g, '')];
  }

  validarConteudo(conteudo) {
    const letras = this.letras(conteudo.palavra);
    if (letras.length < 3) return 'A palavra precisa ter ao menos 3 letras.';
    if (letras.length > 14) return 'Use palavras de até 14 letras.';
    if (new Set(letras).size === 1) return 'A palavra precisa ter letras diferentes.';
    return null;
  }

  montar(questao, rng) {
    const conteudo = questao.conteudo || {};
    const letras = this.letras(conteudo.palavra);
    const palavra = letras.join('');

    let embaralhadas = rng.shuffle(letras);
    for (let t = 0; t < 10 && embaralhadas.join('') === palavra; t++) {
      embaralhadas = rng.shuffle(letras);
    }

    return {
      publico: { letras: embaralhadas, dica: String(conteudo.dica || '').trim() },
      gabarito: { palavra: normalizar(palavra), exibicao: palavra },
    };
  }

  corrigir(gabarito, resposta) {
    return normalizar(resposta?.palavra) === gabarito.palavra;
  }

  tempoInteracaoMs(publico) {
    return 250 * (publico.letras || []).length;
  }

  descreverResposta(publico, resposta) {
    return String(resposta?.palavra ?? '').toUpperCase() || '(em branco)';
  }

  descreverGabarito(publico, gabarito) {
    return gabarito.exibicao;
  }
}

module.exports = AnagramType;
