/**
 * Proteção contra "chute": detecta quem sai clicando sem ler, sem atrapalhar
 * quem lê e responde (mesmo que erre).
 *
 * Três camadas, todas calculadas no servidor (o relógio do navegador não
 * conta, então não dá para burlar):
 *
 * 1. Tempo mínimo de leitura — estimado pelo tamanho do texto da pergunta e
 *    das opções, mais o tempo físico de interagir (arrastar, digitar...).
 *    Errar antes disso é "rápido demais". Acertar antes disso só é aceito
 *    se o aluno não tem chutes recentes (benefício da dúvida para quem lê
 *    rápido); caso contrário a resposta não vale e nada é desbloqueado.
 *
 * 2. Pergunta queimada — cada desafio aceita uma única resposta. Errou?
 *    Vem outra pergunta (ou outra versão). Não dá para testar as 4 opções.
 *
 * 3. Pausa por padrão de chute — várias respostas rápidas e erradas em
 *    pouco tempo geram uma pausa curta (crescente se repetir). Erros com
 *    tempo normal de leitura nunca geram pausa.
 */
class GuessGuard {
  constructor(opcoes = {}) {
    this.opcoes = {
      msPorPalavra: 90, // ~660 palavras/min: bem acima da leitura de um aluno atento (~250)
      leituraMinimaMs: 1000,
      janelaHistoricoLimpo: 5,
      leituraMaximaMs: 9000,
      janelaTentativas: 6,
      janelaMinutos: 3,
      limiteChutes: 3,
      fatorChute: 1.6, // até 1,6x o tempo mínimo ainda conta como "apressada"
      pausaBaseSegundos: 20,
      pausaMaximaSegundos: 120,
      ...opcoes,
    };
  }

  /** Tempo mínimo plausível (ms) para ler e responder uma instância de pergunta */
  tempoMinimo({ palavras = 0, interacaoMs = 0 }) {
    const o = this.opcoes;
    const leitura = Math.min(o.leituraMaximaMs, Math.max(o.leituraMinimaMs, palavras * o.msPorPalavra));
    return Math.round(leitura + interacaoMs);
  }

  rapidoDemais(tempoMs, tempoMinimoMs) {
    return tempoMs < tempoMinimoMs;
  }

  /**
   * Um acerto rápido demais vale se as últimas tentativas do aluno não
   * parecem chute (quem lê rápido e sabe a matéria não é punido).
   * @param {Array} anteriores tentativas anteriores, a mais nova primeiro
   */
  aceitaAcertoRapido(anteriores) {
    return !anteriores.slice(0, this.opcoes.janelaHistoricoLimpo).some((t) => this.pareceChute(t));
  }

  /**
   * Classifica a tentativa: 'correta' | 'errada' | 'rapido_demais'.
   * `suspeita` indica acerto rápido aceito pelo benefício da dúvida.
   */
  classificar({ correta, tempoMs, tempoMinimoMs, anteriores }) {
    if (!this.rapidoDemais(tempoMs, tempoMinimoMs)) {
      return { resultado: correta ? 'correta' : 'errada', suspeita: false };
    }
    if (correta && this.aceitaAcertoRapido(anteriores)) return { resultado: 'correta', suspeita: true };
    return { resultado: 'rapido_demais', suspeita: true };
  }

  /**
   * Decide se o aluno precisa de uma pausa, olhando as tentativas recentes
   * (a mais nova primeiro, incluindo a que acabou de acontecer).
   *
   * @param {Array<{resultado:string, tempoMs:number, tempoMinimoMs:number, criadoEm:Date}>} recentes
   * @param {number} pausasAnteriores quantas pausas o aluno já recebeu
   * @returns {{pausar:boolean, segundos:number}}
   */
  avaliarPausa(recentes, pausasAnteriores = 0, agora = Date.now()) {
    const o = this.opcoes;
    const limiteTempo = agora - o.janelaMinutos * 60 * 1000;
    const janela = recentes
      .filter((t) => new Date(t.criadoEm).getTime() >= limiteTempo)
      .slice(0, o.janelaTentativas);

    const chutes = janela.filter((t) => this.pareceChute(t)).length;
    const ultima = janela[0];
    if (!ultima || !this.pareceChute(ultima) || chutes < o.limiteChutes) {
      return { pausar: false, segundos: 0 };
    }

    const segundos = Math.min(o.pausaMaximaSegundos, o.pausaBaseSegundos * 2 ** Math.min(pausasAnteriores, 4));
    return { pausar: true, segundos };
  }

  /** Errou (ou foi rápido demais) respondendo muito depressa */
  pareceChute({ resultado, tempoMs, tempoMinimoMs }) {
    if (resultado === 'correta') return false;
    if (resultado === 'rapido_demais') return true;
    return Number.isFinite(tempoMs) && Number.isFinite(tempoMinimoMs) && tempoMs < tempoMinimoMs * this.opcoes.fatorChute;
  }
}

module.exports = GuessGuard;
