const MultipleChoiceType = require('./MultipleChoiceType');
const TrueFalseType = require('./TrueFalseType');
const TextAnswerType = require('./TextAnswerType');
const NumericSliderType = require('./NumericSliderType');
const OrderingType = require('./OrderingType');
const AnagramType = require('./AnagramType');
const MatchingType = require('./MatchingType');
const HttpError = require('../http/HttpError');

/**
 * Registro dos tipos de pergunta. Para criar um tipo novo basta estender
 * QuestionType e adicioná-lo aqui — o resto do sistema (desafios, correção,
 * admin) usa só a interface comum.
 */
class QuestionTypeRegistry {
  constructor(classes) {
    this.tipos = new Map(classes.map((Classe) => [Classe.tipo, new Classe()]));
  }

  has(tipo) {
    return this.tipos.has(tipo);
  }

  get(tipo) {
    const instancia = this.tipos.get(tipo);
    if (!instancia) throw HttpError.badRequest(`Tipo de pergunta desconhecido: ${tipo}`);
    return instancia;
  }

  listar() {
    return [...this.tipos.values()].map((t) => t.constructor.info());
  }
}

const registroPadrao = new QuestionTypeRegistry([
  MultipleChoiceType,
  TrueFalseType,
  TextAnswerType,
  NumericSliderType,
  OrderingType,
  AnagramType,
  MatchingType,
]);

module.exports = { QuestionTypeRegistry, registroPadrao };
