/**
 * Motor de dificuldade adaptativa do Mapa de Hardware.
 *
 * Cada aluno/grupo tem uma "habilidade" contínua entre 1 e 5. Ela sobe
 * quando o aluno acerta (mais se acertar rápido, em sequência, ou uma
 * pergunta acima do nível dele) e desce quando erra (mais se errar uma
 * pergunta fácil ou errar várias seguidas). A próxima pergunta é escolhida
 * perto dessa habilidade, evitando repetir as que o aluno já viu.
 *
 * É uma ideia parecida com o rating Elo do xadrez: o ganho depende da
 * diferença entre o nível do aluno e o da pergunta.
 */
class AdaptiveEngine {
  static MIN = 1;
  static MAX = 5;
  static INICIAL = 2;

  static ROTULOS = {
    1: 'Aquecimento',
    2: 'Fácil',
    3: 'Médio',
    4: 'Difícil',
    5: 'Desafio',
  };

  constructor(opcoes = {}) {
    this.opcoes = {
      ganhoBase: 0.3,
      perdaBase: 0.3,
      pesoDiferenca: 0.15,
      bonusRapido: 0.15,
      bonusSequencia: 0.1,
      penalidadeSequenciaErros: 0.15,
      ganhoMaximoSuspeito: 0.05,
      ...opcoes,
    };
  }

  static limitar(valor) {
    return Math.min(AdaptiveEngine.MAX, Math.max(AdaptiveEngine.MIN, valor));
  }

  static rotulo(dificuldade) {
    return AdaptiveEngine.ROTULOS[Math.round(dificuldade)] || '';
  }

  /** Dificuldade inteira que a próxima pergunta deve ter */
  dificuldadeAlvo(habilidade) {
    return Math.round(AdaptiveEngine.limitar(habilidade));
  }

  /**
   * Calcula o novo estado do perfil depois de uma tentativa.
   *
   * @param {{habilidade:number, sequenciaAcertos:number, sequenciaErros:number}} perfil
   * @param {{correta:boolean, dificuldade:number, tempoMs:number, tempoMinimoMs:number, suspeita:boolean}} tentativa
   */
  atualizar(perfil, tentativa) {
    const o = this.opcoes;
    const habilidade = AdaptiveEngine.limitar(Number(perfil.habilidade) || AdaptiveEngine.INICIAL);
    const diferenca = tentativa.dificuldade - habilidade; // > 0: pergunta acima do nível do aluno

    let sequenciaAcertos = perfil.sequenciaAcertos || 0;
    let sequenciaErros = perfil.sequenciaErros || 0;
    let delta;

    if (tentativa.correta) {
      sequenciaAcertos += 1;
      sequenciaErros = 0;

      delta = clamp(o.ganhoBase + o.pesoDiferenca * diferenca, 0.1, 0.6);
      if (this.foiRapida(tentativa)) delta += o.bonusRapido;
      if (sequenciaAcertos >= 3) delta += o.bonusSequencia * Math.min(sequenciaAcertos - 2, 3);
      if (tentativa.suspeita) delta = Math.min(delta, o.ganhoMaximoSuspeito);
    } else {
      sequenciaErros += 1;
      sequenciaAcertos = 0;

      delta = -clamp(o.perdaBase - o.pesoDiferenca * diferenca, 0.1, 0.6);
      if (sequenciaErros >= 2) delta -= o.penalidadeSequenciaErros;
    }

    const nova = AdaptiveEngine.limitar(habilidade + delta);
    return {
      habilidade: Math.round(nova * 100) / 100,
      sequenciaAcertos,
      sequenciaErros,
      delta: Math.round((nova - habilidade) * 100) / 100,
    };
  }

  /**
   * "Rápida" = respondeu com folga acima do tempo mínimo de leitura, mas bem
   * antes do que um aluno com dúvida levaria. Não conta se foi rápida demais
   * (isso é tratado como suspeita de chute pelo GuessGuard).
   */
  foiRapida({ tempoMs, tempoMinimoMs, suspeita }) {
    if (suspeita || !Number.isFinite(tempoMs) || !Number.isFinite(tempoMinimoMs)) return false;
    return tempoMs <= Math.max(tempoMinimoMs * 2.5, tempoMinimoMs + 4000);
  }

  /**
   * Escolhe a próxima pergunta de um componente.
   *
   * @param {Array<{id:number, dificuldade:number}>} candidatas
   * @param {{habilidade:number, historico:Map<number,{vezes:number, ultimaVez:number, errou:boolean}>, ultimaQuestaoId?:number, rng:import('../../shared/Random')}} contexto
   */
  escolherQuestao(candidatas, { habilidade, historico = new Map(), ultimaQuestaoId = null, rng }) {
    if (!candidatas.length) return null;
    const alvo = this.dificuldadeAlvo(habilidade);

    const pontuadas = candidatas.map((questao) => {
      const visto = historico.get(questao.id);
      let custo = Math.abs(questao.dificuldade - alvo) * 3;
      if (visto) {
        custo += visto.vezes * 2;
        if (visto.errou) custo += 3;
      }
      if (questao.id === ultimaQuestaoId && candidatas.length > 1) custo += 20;
      custo += rng.next() * 1.5; // desempate aleatório
      return { questao, custo };
    });

    pontuadas.sort((a, b) => a.custo - b.custo);
    return pontuadas[0].questao;
  }
}

function clamp(valor, min, max) {
  return Math.min(max, Math.max(min, valor));
}

module.exports = AdaptiveEngine;
