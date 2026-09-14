const QuestionType = require('./QuestionType');

/**
 * Múltipla escolha com banco de alternativas: o professor cadastra várias
 * respostas certas e várias erradas, e cada aluno recebe uma combinação
 * sorteada (1 certa + N erradas) em ordem embaralhada. Assim a posição da
 * resposta muda a cada vez e dois alunos raramente veem a mesma tela.
 *
 * conteudo: { corretas: string[], incorretas: string[], quantidade?: number }
 */
class MultipleChoiceType extends QuestionType {
  static tipo = 'multipla_escolha';
  static rotulo = 'Múltipla escolha';
  static descricao = 'Escolher 1 alternativa. Sorteia 1 certa + erradas e embaralha.';

  validarConteudo(conteudo) {
    const corretas = QuestionType.listaDeTextos(conteudo.corretas);
    const incorretas = QuestionType.listaDeTextos(conteudo.incorretas);
    if (corretas.length < 1) return 'Cadastre ao menos 1 alternativa correta.';
    if (incorretas.length < 1) return 'Cadastre ao menos 1 alternativa errada.';
    const repetida = corretas.find((c) => incorretas.includes(c));
    if (repetida) return `A alternativa "${repetida}" está como certa e errada ao mesmo tempo.`;
    return null;
  }

  quantidadeDeOpcoes(conteudo) {
    const incorretas = QuestionType.listaDeTextos(conteudo.incorretas);
    const pedida = Number(conteudo.quantidade) || 4;
    return Math.max(2, Math.min(pedida, incorretas.length + 1, 6));
  }

  montar(questao, rng) {
    const conteudo = questao.conteudo || {};
    const correta = rng.pick(QuestionType.listaDeTextos(conteudo.corretas));
    const erradas = rng.sample(QuestionType.listaDeTextos(conteudo.incorretas), this.quantidadeDeOpcoes(conteudo) - 1);
    const textos = rng.shuffle([correta, ...erradas]);
    const ids = rng.tokens(textos.length);
    const opcoes = textos.map((texto, i) => ({ id: ids[i], texto }));

    return {
      publico: { opcoes },
      gabarito: { opcaoCorreta: opcoes.find((o) => o.texto === correta).id },
    };
  }

  corrigir(gabarito, resposta) {
    return Boolean(resposta) && resposta.opcao === gabarito.opcaoCorreta;
  }

  textosParaLer(publico) {
    return (publico.opcoes || []).map((o) => o.texto);
  }

  tempoInteracaoMs() {
    return 350;
  }

  descreverResposta(publico, resposta) {
    const opcao = (publico.opcoes || []).find((o) => o.id === resposta?.opcao);
    return opcao ? opcao.texto : '(sem resposta)';
  }

  descreverGabarito(publico, gabarito) {
    const opcao = (publico.opcoes || []).find((o) => o.id === gabarito?.opcaoCorreta);
    return opcao ? opcao.texto : '';
  }
}

module.exports = MultipleChoiceType;
