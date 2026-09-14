import { ChoiceQuestionView } from './ChoiceQuestionView.js';
import { TrueFalseQuestionView } from './TrueFalseQuestionView.js';
import { TextQuestionView } from './TextQuestionView.js';
import { SliderQuestionView } from './SliderQuestionView.js';
import { OrderingQuestionView } from './OrderingQuestionView.js';
import { AnagramQuestionView } from './AnagramQuestionView.js';
import { MatchingQuestionView } from './MatchingQuestionView.js';
import { DigitQuestionView } from './DigitQuestionView.js';

/**
 * Cria a view certa para cada tipo de pergunta. Para um tipo novo: crie a
 * classe (estendendo QuestionView) e registre aqui.
 */
export class QuestionViewFactory {
  static tipos = new Map([
    ['multipla_escolha', ChoiceQuestionView],
    ['verdadeiro_falso', TrueFalseQuestionView],
    ['texto', TextQuestionView],
    ['numero', SliderQuestionView],
    ['ordenar', OrderingQuestionView],
    ['anagrama', AnagramQuestionView],
    ['associar', MatchingQuestionView],
    ['digito', DigitQuestionView],
  ]);

  static registrar(tipo, Classe) {
    QuestionViewFactory.tipos.set(tipo, Classe);
  }

  /** @returns {import('./QuestionView.js').QuestionView} */
  static criar(questao, props = {}) {
    const Classe = QuestionViewFactory.tipos.get(questao.tipo);
    if (!Classe) throw new Error(`Tipo de pergunta sem visualização: ${questao.tipo}`);
    return new Classe({ ...props, questao });
  }
}
