/**
 * Percebe quando o aluno está perdido no objetivo atual e decide o tamanho
 * da ajuda. Não sabe nada de tela: recebe as ações do aluno (já marcadas como
 * "útil" ou não) e a passagem do tempo, e devolve uma intervenção:
 *
 *   nível 1 → oferecer ajuda ("Quer uma pista?")
 *   nível 2 → mostrar a pista em texto e oferecer o "Mostre-me"
 *   nível 3 → apontar na tela onde clicar (Mostre-me automático)
 *
 * Uma ação é útil quando o aluno avança: concluiu um objetivo, deu um passo
 * do caminho (abriu a guia certa, o menu certo...) ou fez algo que o objetivo
 * espera. Ações sem avanço (clicar em outros botões, abrir e fechar menus,
 * trocar de guia sem usar nada, cancelar janelas) vão somando.
 *
 * Além da contagem, há dois padrões: trocar de guia várias vezes seguidas
 * sem usar nada ("procurando o botão") e repetir o mesmo comando que não
 * ajuda.
 */
export const LIMITES = Object.freeze({
  acoes: [5, 9, 14], // ações sem avanço para chegar aos níveis 1, 2 e 3
  tempo: [70_000, 140_000, 220_000], // tempo sem avanço (com alguma ação no meio)
  parado: [50_000, 110_000], // sem fazer nada: nível 1 e 2 (talvez esteja lendo)
  intervalo: 15_000, // tempo mínimo entre duas intervenções automáticas
  guias: 4, // trocas de guia seguidas sem usar nenhum comando
  repetido: 3, // mesmo comando inútil seguido
});

export class DetectorDePerdido {
  constructor({ limites = LIMITES, agora = Date.now() } = {}) {
    this.limites = limites;
    this.vezesPerdido = 0;
    this.reiniciar(agora);
  }

  /** Objetivo novo: zera tudo, menos o total de vezes que o aluno se perdeu na missão */
  reiniciar(agora) {
    this.nivel = 0;
    this.semAvanco = 0;
    this.ultimoAvanco = agora;
    this.ultimaAcao = agora;
    this.ultimaIntervencao = -Infinity;
    this.guiasSeguidas = 0;
    this.avisouGuias = false;
    this.ultimoComando = null;
    this.repeticoes = 0;
  }

  /** O aluno avançou: volta ao zero (a ajuda já dada continua valendo) */
  avancou(agora) {
    this.nivel = 0;
    this.semAvanco = 0;
    this.ultimoAvanco = agora;
    this.ultimaAcao = agora;
    this.guiasSeguidas = 0;
    this.avisouGuias = false;
    this.repeticoes = 0;
    this.ultimoComando = null;
  }

  /**
   * O aluno pediu ajuda: conta como intervenção (não oferecer de novo logo em
   * seguida). Pedir ajuda não conta como "se perder".
   */
  ajudaPedida(nivel, agora) {
    this.nivel = Math.max(this.nivel, nivel);
    this.ultimaIntervencao = agora;
  }

  /**
   * acao: { util: boolean, tipo: 'comando'|'guia'|'menu'|'dialogo'|..., chave?: string }
   * Devolve uma intervenção ou null.
   */
  acao(acao, agora) {
    this.ultimaAcao = agora;
    if (acao.util) {
      this.avancou(agora);
      return null;
    }
    this.semAvanco += 1;

    if (acao.tipo === 'guia') this.guiasSeguidas += 1;
    else if (acao.tipo === 'comando') this.guiasSeguidas = 0;

    if (acao.tipo === 'comando' && acao.chave) {
      this.repeticoes = acao.chave === this.ultimoComando ? this.repeticoes + 1 : 1;
      this.ultimoComando = acao.chave;
    }

    if (this.guiasSeguidas >= this.limites.guias && !this.avisouGuias && this.podeIntervir(agora)) {
      this.avisouGuias = true;
      return this.intervir(Math.max(this.nivel, 1), 'guias', agora);
    }
    if (this.repeticoes >= this.limites.repetido && this.podeIntervir(agora)) {
      this.repeticoes = 0;
      return this.intervir(Math.max(this.nivel, 1), 'repetido', agora, { chave: acao.chave });
    }
    return this.avaliar(agora);
  }

  /** Passagem do tempo (chamar a cada segundo, mais ou menos) */
  tick(agora) {
    return this.avaliar(agora);
  }

  podeIntervir(agora) {
    return agora - this.ultimaIntervencao >= this.limites.intervalo;
  }

  avaliar(agora) {
    const { acoes, tempo, parado } = this.limites;
    const semAvancoMs = agora - this.ultimoAvanco;
    const paradoMs = agora - this.ultimaAcao;
    let alvo = 0;
    let motivo = null;
    for (let n = 3; n >= 1; n--) {
      if (this.semAvanco >= acoes[n - 1]) {
        alvo = n;
        motivo = 'acoes';
        break;
      }
      if (this.semAvanco > 0 && semAvancoMs >= tempo[n - 1]) {
        alvo = n;
        motivo = 'tempo';
        break;
      }
    }
    // Parado sem mexer em nada: no máximo oferece a pista (pode estar lendo)
    for (let n = parado.length; n >= 1 && alvo < n; n--) {
      if (paradoMs >= parado[n - 1] && semAvancoMs >= parado[n - 1]) {
        alvo = n;
        motivo = 'parado';
        break;
      }
    }
    if (alvo <= this.nivel || !this.podeIntervir(agora)) return null;
    return this.intervir(alvo, motivo, agora);
  }

  intervir(nivel, motivo, agora, extra = {}) {
    if (nivel >= 2 && this.nivel < 2) this.vezesPerdido += 1;
    this.nivel = nivel;
    this.ultimaIntervencao = agora;
    return { nivel, motivo, ...extra };
  }
}
