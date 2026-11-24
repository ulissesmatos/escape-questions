import { iniciarAplicativo } from './app/Aplicativo.js';
import { CURRICULO_WORD } from './app/curriculoWord.js';

/**
 * Operação Word: entrada com o @ → base com as missões → missão no
 * computador simulado (app/Aplicativo.js).
 *
 * ?tudo libera todas as missões (para o professor conhecer).
 * ?teste expõe o app em window.operacaoWord (testes de navegador).
 */
iniciarAplicativo(document.getElementById('operacao-word'), CURRICULO_WORD, {
  nomeGlobal: 'operacaoWord',
  erro: 'Não foi possível abrir a Operação Word. Recarregue a página.',
});
