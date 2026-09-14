const MultipleChoiceType = require('./MultipleChoiceType');

/**
 * Verdadeiro ou falso com banco de afirmações. Sorteia primeiro o "lado"
 * (verdadeira ou falsa, 50/50 quando existem os dois) e depois a afirmação —
 * assim a resposta certa não é sempre "Verdadeiro".
 *
 * Herda de MultipleChoiceType: as duas opções (Verdadeiro/Falso) são
 * alternativas com id opaco, então correção e descrição são as mesmas.
 *
 * conteudo: { afirmacoes: [{ texto: string, verdadeira: boolean }] }
 */
class TrueFalseType extends MultipleChoiceType {
  static tipo = 'verdadeiro_falso';
  static rotulo = 'Verdadeiro ou falso';
  static descricao = 'Banco de afirmações verdadeiras e falsas; sorteia uma.';

  afirmacoesValidas(conteudo) {
    return (Array.isArray(conteudo.afirmacoes) ? conteudo.afirmacoes : [])
      .map((a) => ({ texto: String(a?.texto ?? '').trim(), verdadeira: Boolean(a?.verdadeira) }))
      .filter((a) => a.texto);
  }

  validarConteudo(conteudo) {
    if (this.afirmacoesValidas(conteudo).length < 1) return 'Cadastre ao menos 1 afirmação.';
    return null;
  }

  montar(questao, rng) {
    const afirmacoes = this.afirmacoesValidas(questao.conteudo || {});
    const verdadeiras = afirmacoes.filter((a) => a.verdadeira);
    const falsas = afirmacoes.filter((a) => !a.verdadeira);
    const grupo = verdadeiras.length && falsas.length ? (rng.next() < 0.5 ? verdadeiras : falsas) : afirmacoes;
    const afirmacao = rng.pick(grupo);

    const [idV, idF] = rng.tokens(2);
    return {
      publico: {
        afirmacao: afirmacao.texto,
        opcoes: [
          { id: idV, texto: 'Verdadeiro' },
          { id: idF, texto: 'Falso' },
        ],
      },
      gabarito: { opcaoCorreta: afirmacao.verdadeira ? idV : idF },
    };
  }

  textosParaLer(publico) {
    return [publico.afirmacao];
  }
}

module.exports = TrueFalseType;
