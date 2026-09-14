const QuestionType = require('./QuestionType');

/**
 * Colocar itens na ordem certa (arrastando ou com setas).
 * Ex: "do mais rápido para o mais lento", "do menor para o maior".
 *
 * conteudo: { itens: string[] (já na ordem correta), rotuloInicio?, rotuloFim? }
 */
class OrderingType extends QuestionType {
  static tipo = 'ordenar';
  static rotulo = 'Colocar em ordem';
  static descricao = 'O aluno arrasta os itens até a ordem correta.';

  validarConteudo(conteudo) {
    const itens = QuestionType.listaDeTextos(conteudo.itens);
    if (itens.length < 3) return 'Cadastre ao menos 3 itens (na ordem correta).';
    if (new Set(itens).size !== itens.length) return 'Os itens não podem se repetir.';
    return null;
  }

  montar(questao, rng) {
    const conteudo = questao.conteudo || {};
    const itens = QuestionType.listaDeTextos(conteudo.itens);
    const ids = rng.tokens(itens.length);
    const corretos = itens.map((texto, i) => ({ id: ids[i], texto }));

    // Embaralha garantindo que não saia já na ordem certa
    let embaralhados = rng.shuffle(corretos);
    for (let t = 0; t < 10 && embaralhados.every((item, i) => item.id === corretos[i].id); t++) {
      embaralhados = rng.shuffle(corretos);
    }

    return {
      publico: {
        itens: embaralhados,
        rotuloInicio: String(conteudo.rotuloInicio || '').trim(),
        rotuloFim: String(conteudo.rotuloFim || '').trim(),
      },
      gabarito: { ordem: corretos.map((c) => c.id) },
    };
  }

  corrigir(gabarito, resposta) {
    const ordem = Array.isArray(resposta?.ordem) ? resposta.ordem : [];
    return ordem.length === gabarito.ordem.length && ordem.every((id, i) => id === gabarito.ordem[i]);
  }

  textosParaLer(publico) {
    return (publico.itens || []).map((i) => i.texto);
  }

  tempoInteracaoMs(publico) {
    return 400 * (publico.itens || []).length;
  }

  descreverResposta(publico, resposta) {
    const porId = Object.fromEntries((publico.itens || []).map((i) => [i.id, i.texto]));
    const ordem = Array.isArray(resposta?.ordem) ? resposta.ordem : [];
    return ordem.map((id) => porId[id] || '?').join(' → ') || '(sem resposta)';
  }

  descreverGabarito(publico, gabarito) {
    const porId = Object.fromEntries((publico.itens || []).map((i) => [i.id, i.texto]));
    return gabarito.ordem.map((id) => porId[id]).join(' → ');
  }
}

module.exports = OrderingType;
