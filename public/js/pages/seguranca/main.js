import { iniciarAplicativo } from '../word/app/Aplicativo.js';
import { CURRICULO_ANZOL } from './curriculo.js';

/**
 * Operação Anzol: segurança na internet no mesmo computador simulado da
 * Operação Word (entrada com o @ → base com as missões → missão).
 *
 * ?tudo libera todas as missões (para o professor conhecer).
 * ?teste expõe o app em window.operacaoAnzol (testes de navegador).
 */
iniciarAplicativo(document.getElementById('operacao-word'), CURRICULO_ANZOL, {
  nomeGlobal: 'operacaoAnzol',
  erro: 'Não foi possível abrir a Operação Anzol. Recarregue a página.',
});
