const QuestionType = require('./QuestionType');

/**
 * Ligar pares (coluna A ↔ coluna B). Sorteia alguns pares do banco e
 * embaralha as duas colunas. Só conta como certa se todos os pares baterem.
 *
 * conteudo: { pares: [{ a: string, b: string }], quantidade?: number }
 */
class MatchingType extends QuestionType {
  static tipo = 'associar';
  static rotulo = 'Ligar pares';
  static descricao = 'O aluno liga cada item da esquerda ao da direita.';

  paresValidos(conteudo) {
    return (Array.isArray(conteudo.pares) ? conteudo.pares : [])
      .map((p) => ({ a: String(p?.a ?? '').trim(), b: String(p?.b ?? '').trim() }))
      .filter((p) => p.a && p.b);
  }

  validarConteudo(conteudo) {
    const pares = this.paresValidos(conteudo);
    if (pares.length < 2) return 'Cadastre ao menos 2 pares.';
    if (new Set(pares.map((p) => p.a)).size !== pares.length) return 'Os itens da coluna A não podem se repetir.';
    if (new Set(pares.map((p) => p.b)).size !== pares.length) return 'Os itens da coluna B não podem se repetir.';
    return null;
  }

  montar(questao, rng) {
    const conteudo = questao.conteudo || {};
    const todos = this.paresValidos(conteudo);
    const quantidade = Math.max(2, Math.min(Number(conteudo.quantidade) || 4, todos.length));
    const pares = rng.sample(todos, quantidade);

    const idsA = rng.tokens(pares.length);
    const idsB = rng.tokens(pares.length);
    const esquerda = pares.map((p, i) => ({ id: idsA[i], texto: p.a }));
    const direita = pares.map((p, i) => ({ id: idsB[i], texto: p.b }));
    const gabarito = Object.fromEntries(pares.map((_, i) => [idsA[i], idsB[i]]));

    return {
      publico: { esquerda: rng.shuffle(esquerda), direita: rng.shuffle(direita) },
      gabarito: { pares: gabarito },
    };
  }

  corrigir(gabarito, resposta) {
    const enviados = resposta?.pares && typeof resposta.pares === 'object' ? resposta.pares : {};
    const esperados = Object.entries(gabarito.pares);
    return esperados.every(([a, b]) => enviados[a] === b) && Object.keys(enviados).length === esperados.length;
  }

  textosParaLer(publico) {
    return [...(publico.esquerda || []), ...(publico.direita || [])].map((i) => i.texto);
  }

  tempoInteracaoMs(publico) {
    return 700 * (publico.esquerda || []).length;
  }

  descreverPares(publico, pares) {
    const textoA = Object.fromEntries((publico.esquerda || []).map((i) => [i.id, i.texto]));
    const textoB = Object.fromEntries((publico.direita || []).map((i) => [i.id, i.texto]));
    return Object.entries(pares || {})
      .map(([a, b]) => `${textoA[a] || '?'} ↔ ${textoB[b] || '?'}`)
      .join('; ');
  }

  descreverResposta(publico, resposta) {
    return this.descreverPares(publico, resposta?.pares) || '(sem resposta)';
  }

  descreverGabarito(publico, gabarito) {
    return this.descreverPares(publico, gabarito.pares);
  }
}

module.exports = MatchingType;
