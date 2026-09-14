const { contarPalavras } = require('../shared/texto');

/**
 * Classe base de todos os tipos de pergunta do Mapa de Hardware.
 *
 * Cada tipo concreto (múltipla escolha, slider, ordenar...) sabe:
 *  - validar o conteúdo cadastrado pelo professor      → validarConteudo()
 *  - gerar uma instância jogável, sorteando variantes
 *    e embaralhando o que for preciso                    → montar()
 *  - corrigir a resposta do aluno                        → corrigir()
 *  - descrever respostas em texto para o professor      → descreverResposta()
 *
 * O gabarito nunca sai do servidor: `instanciar()` separa o que vai para o
 * navegador (`publico`) do que fica guardado no desafio (`gabarito`).
 */
class QuestionType {
  /** Identificador gravado no banco (ex: "multipla_escolha") */
  static tipo = 'base';
  /** Nome amigável para o professor */
  static rotulo = 'Pergunta';
  static descricao = '';

  get tipo() {
    return this.constructor.tipo;
  }

  /**
   * Valida uma questão vinda do admin. Retorna uma mensagem de erro ou null.
   * Também valida cada variante (se houver) mesclada com o conteúdo base.
   */
  validar(questao) {
    if (!questao || typeof questao !== 'object') return 'Pergunta inválida.';
    const conteudo = questao.conteudo || {};
    const variantes = Array.isArray(conteudo.variantes) ? conteudo.variantes : [];

    if (!variantes.length && !String(questao.pergunta || '').trim()) {
      return 'Escreva o texto da pergunta.';
    }

    const erroBase = variantes.length ? null : this.validarConteudo(conteudo, questao);
    if (erroBase) return erroBase;

    for (let i = 0; i < variantes.length; i++) {
      const mesclada = this.aplicarVariante(questao, variantes[i]);
      if (!String(mesclada.pergunta || '').trim()) return `Variante ${i + 1}: escreva o texto da pergunta.`;
      const erro = this.validarConteudo(mesclada.conteudo, mesclada);
      if (erro) return `Variante ${i + 1}: ${erro}`;
    }
    return null;
  }

  /** @abstract */
  validarConteudo(conteudo, questao) { // eslint-disable-line no-unused-vars
    return null;
  }

  /** Mescla uma variante sobre a questão base (pergunta/enunciado + campos do conteúdo) */
  aplicarVariante(questao, variante) {
    if (!variante) return questao;
    const { pergunta, enunciado, ...restoConteudo } = variante;
    const { variantes, ...conteudoBase } = questao.conteudo || {}; // eslint-disable-line no-unused-vars
    return {
      ...questao,
      pergunta: pergunta ?? questao.pergunta,
      enunciado: enunciado ?? questao.enunciado,
      conteudo: { ...conteudoBase, ...restoConteudo },
    };
  }

  /**
   * Gera uma instância jogável da questão.
   * @returns {{ publico: object, gabarito: object, palavras: number, interacaoMs: number }}
   */
  instanciar(questao, rng) {
    const variantes = questao.conteudo?.variantes;
    const base = Array.isArray(variantes) && variantes.length
      ? this.aplicarVariante(questao, rng.pick(variantes))
      : questao;

    const { publico, gabarito } = this.montar(base, rng);
    const publicoCompleto = {
      tipo: this.tipo,
      enunciado: base.enunciado || '',
      pergunta: base.pergunta || '',
      ...publico,
    };

    return {
      publico: publicoCompleto,
      gabarito,
      palavras: contarPalavras(publicoCompleto.pergunta, this.textosParaLer(publicoCompleto)),
      interacaoMs: this.tempoInteracaoMs(publicoCompleto),
    };
  }

  /** @abstract @returns {{ publico: object, gabarito: object }} */
  montar(questao, rng) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name}.montar() não implementado`);
  }

  /** @abstract @returns {boolean} */
  corrigir(gabarito, resposta) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name}.corrigir() não implementado`);
  }

  /** Textos (além da pergunta) que o aluno precisa ler antes de responder */
  textosParaLer(publico) { // eslint-disable-line no-unused-vars
    return [];
  }

  /** Tempo mínimo "físico" para interagir com a resposta (arrastar, digitar...) */
  tempoInteracaoMs(publico) { // eslint-disable-line no-unused-vars
    return 300;
  }

  /** Resposta do aluno em texto legível (para o professor) */
  descreverResposta(publico, resposta) {
    return JSON.stringify(resposta ?? null);
  }

  /** Gabarito em texto legível (para o professor) */
  descreverGabarito(publico, gabarito) {
    return JSON.stringify(gabarito ?? null);
  }

  /** Metadados para o admin montar o formulário certo */
  static info() {
    return { tipo: this.tipo, rotulo: this.rotulo, descricao: this.descricao };
  }
}

// Helpers compartilhados pelos tipos concretos
QuestionType.listaDeTextos = function listaDeTextos(valor) {
  return Array.isArray(valor) ? valor.map((v) => String(v ?? '').trim()).filter(Boolean) : [];
};

module.exports = QuestionType;
