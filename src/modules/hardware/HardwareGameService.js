const crypto = require('crypto');
const HttpError = require('../../http/HttpError');
const Random = require('../../shared/Random');
const AdaptiveEngine = require('./AdaptiveEngine');

/**
 * Regras do jogo do Mapa de Hardware para o aluno:
 *  - quais níveis e peças estão liberados;
 *  - sorteio de um desafio adaptado ao nível do aluno;
 *  - correção, atualização da habilidade e proteção contra chute.
 *
 * Tudo que importa (tempo, gabarito, desbloqueio) é decidido aqui no
 * servidor — o navegador só mostra e envia respostas.
 */
class HardwareGameService {
  constructor({ db, repo, tipos, motor = new AdaptiveEngine(), guarda, criarRng = () => new Random() }) {
    this.db = db;
    this.repo = repo;
    this.tipos = tipos;
    this.motor = motor;
    this.guarda = guarda;
    this.criarRng = criarRng;
  }

  // ---------------- Níveis e mapa ----------------

  async niveis(identidade) {
    const linhas = await this.repo.niveisComProgresso(identidade);
    let anteriorCompleto = true;
    return linhas.map((n) => {
      const desbloqueado = anteriorCompleto;
      const completo = n.total > 0 && n.descobertos >= n.total;
      anteriorCompleto = desbloqueado && (completo || n.total === 0);
      return {
        id: n.id,
        nome: n.nome,
        descricao: n.descricao,
        ordem: n.ordem,
        total: n.total,
        descobertos: n.descobertos,
        completo,
        desbloqueado,
      };
    });
  }

  async mapa(identidade, nivelId) {
    const niveis = await this.niveis(identidade);
    const nivel = niveis.find((n) => n.id === nivelId);
    if (!nivel) throw HttpError.notFound('Nível não encontrado.');
    if (!nivel.desbloqueado) throw HttpError.badRequest('Complete o nível anterior para liberar este.');

    const componentes = await this.repo.componentesDoNivel(nivelId);
    const ids = componentes.map((c) => c.id);
    const [conexoes, descobertos, perfil] = await Promise.all([
      this.repo.conexoesEntre(ids),
      this.repo.idsDescobertos(identidade, ids),
      this.repo.perfil(identidade),
    ]);

    const indice = niveis.findIndex((n) => n.id === nivelId);
    return {
      nivel,
      proximoNivel: niveis[indice + 1] ? { id: niveis[indice + 1].id, nome: niveis[indice + 1].nome } : null,
      componentes: componentes.map((c) => ({
        id: c.id,
        nome: c.nome,
        icone: c.icone,
        imagem: c.imagem,
        posX: c.pos_x,
        posY: c.pos_y,
        inicial: c.inicial,
      })),
      conexoes: conexoes.map((cx) => ({ deId: cx.de_id, paraId: cx.para_id })),
      descobertos: [...descobertos],
      perfil: this.resumoPerfil(perfil),
    };
  }

  resumoPerfil(perfil) {
    const dificuldade = this.motor.dificuldadeAlvo(perfil.habilidade);
    return {
      habilidade: perfil.habilidade,
      dificuldade,
      rotulo: AdaptiveEngine.rotulo(dificuldade),
      sequenciaAcertos: perfil.sequenciaAcertos,
      pausaRestanteMs: perfil.pausaRestanteMs,
    };
  }

  // ---------------- Desafio ----------------

  async novoDesafio(identidade, componentId) {
    const perfil = await this.repo.perfil(identidade);
    if (perfil.pausaRestanteMs > 0) {
      throw HttpError.tooManyRequests('Pausa rápida: leia com calma antes de responder.', {
        pausaRestanteMs: perfil.pausaRestanteMs,
      });
    }

    const componente = await this.repo.componente(componentId);
    if (!componente) throw HttpError.notFound('Peça não encontrada.');
    const jaDescoberto = await this.garantirLiberado(identidade, componente);

    const questoes = await this.repo.questoesAtivas(componentId);
    if (!questoes.length) throw HttpError.notFound('Essa peça ainda não tem perguntas cadastradas. Avise o professor.');

    const [historicoLinhas, ultimo] = await Promise.all([
      this.repo.historicoNoComponente(perfil.id, componentId),
      this.repo.ultimoDesafio(perfil.id, componentId),
    ]);
    const historico = new Map(
      historicoLinhas.map((h) => [h.questao_id, { vezes: h.vezes, errou: h.errou, ultimaVez: h.ultima_vez }])
    );

    const rng = this.criarRng();
    const questao = this.motor.escolherQuestao(questoes, {
      habilidade: perfil.habilidade,
      historico,
      ultimaQuestaoId: ultimo ? ultimo.questao_id : null,
      rng,
    });

    const tipo = this.tipos.get(questao.tipo);
    const instancia = tipo.instanciar(questao, rng);
    const tempoMinimoMs = this.guarda.tempoMinimo(instancia);
    const desafioId = crypto.randomUUID();

    await this.repo.criarDesafio({
      id: desafioId,
      perfilId: perfil.id,
      componentId,
      questaoId: questao.id,
      dificuldade: questao.dificuldade,
      publico: instancia.publico,
      gabarito: instancia.gabarito,
      tempoMinimoMs,
    });

    // Limpeza oportunista de desafios abandonados (barata e sem job agendado)
    if (rng.next() < 0.02) this.repo.limparDesafiosAntigos().catch(() => {});

    return {
      desafioId,
      questao: instancia.publico,
      dificuldade: questao.dificuldade,
      rotulo: AdaptiveEngine.rotulo(questao.dificuldade),
      jaDescoberto,
      perfil: this.resumoPerfil(perfil),
    };
  }

  /** Confere se o nível e a peça estão liberados para o aluno. Retorna se ela já foi descoberta. */
  async garantirLiberado(identidade, componente) {
    const niveis = await this.niveis(identidade);
    const nivel = niveis.find((n) => n.id === componente.nivel_id);
    if (!nivel || !nivel.desbloqueado) throw HttpError.badRequest('Esse nível ainda está bloqueado.');

    const vizinhos = await this.repo.vizinhos(componente.id);
    const descobertos = await this.repo.idsDescobertos(identidade, [componente.id, ...vizinhos]);
    const jaDescoberto = descobertos.has(componente.id);
    const liberado = componente.inicial || jaDescoberto || vizinhos.some((id) => descobertos.has(id));
    if (!liberado) throw HttpError.badRequest('Essa peça ainda está bloqueada. Descubra uma peça vizinha primeiro.');
    return jaDescoberto;
  }

  // ---------------- Resposta ----------------

  async responder(identidade, desafioId, resposta) {
    const resultado = await this.db.transaction(async (tx) => {
      const desafio = await this.repo.desafioParaResponder(tx, desafioId);
      if (!desafio) throw HttpError.notFound('Pergunta expirada. Abra a peça de novo.');

      const perfil = await this.repo.perfil(identidade, tx, { bloquear: true });
      if (desafio.perfil_id !== perfil.id) throw HttpError.notFound('Pergunta expirada. Abra a peça de novo.');
      if (desafio.respondido_em) {
        throw HttpError.conflict('Essa pergunta já foi respondida. Peça uma nova.');
      }

      const tipo = this.tipos.get(desafio.publico.tipo);
      const tempoMs = desafio.tempo_ms;
      const anteriores = await this.repo.tentativasRecentes(tx, identidade, this.guarda.opcoes.janelaTentativas);
      const { resultado: situacao, suspeita } = this.guarda.classificar({
        correta: tipo.corrigir(desafio.gabarito, resposta),
        tempoMs,
        tempoMinimoMs: desafio.tempo_minimo_ms,
        anteriores,
      });

      // "Rápido demais" não mexe na habilidade (pode ser só pressa), mas quebra a sequência
      const atualizado = situacao === 'rapido_demais'
        ? { habilidade: perfil.habilidade, sequenciaAcertos: 0, sequenciaErros: perfil.sequenciaErros, delta: 0 }
        : this.motor.atualizar(perfil, {
            correta: situacao === 'correta',
            dificuldade: desafio.dificuldade,
            tempoMs,
            tempoMinimoMs: desafio.tempo_minimo_ms,
            suspeita,
          });

      await this.repo.registrarTentativa(tx, {
        ...identidade,
        componentId: desafio.component_id,
        componenteNome: desafio.componente_nome,
        questaoId: desafio.questao_id,
        desafioId,
        tipo: desafio.publico.tipo,
        dificuldade: desafio.dificuldade,
        resultado: situacao,
        tempoMs,
        tempoMinimoMs: desafio.tempo_minimo_ms,
        perguntaTexto: [desafio.publico.pergunta, desafio.publico.afirmacao].filter(Boolean).join(' — '),
        respostaTexto: tipo.descreverResposta(desafio.publico, resposta).slice(0, 500),
        respostaCertaTexto: tipo.descreverGabarito(desafio.publico, desafio.gabarito).slice(0, 500),
        habilidadeAntes: perfil.habilidade,
        habilidadeDepois: atualizado.habilidade,
      });
      await this.repo.marcarRespondido(tx, desafioId);

      const recentes = await this.repo.tentativasRecentes(tx, identidade, this.guarda.opcoes.janelaTentativas);
      const pausa = this.guarda.avaliarPausa(recentes, perfil.pausas);

      const novoPerfil = {
        ...perfil,
        habilidade: atualizado.habilidade,
        sequenciaAcertos: atualizado.sequenciaAcertos,
        sequenciaErros: atualizado.sequenciaErros,
        pausas: perfil.pausas + (pausa.pausar ? 1 : 0),
      };
      await this.repo.salvarPerfil(tx, novoPerfil, { pausaSegundos: pausa.segundos });

      return { desafio, situacao, atualizado, novoPerfil, pausa };
    });

    return this.montarRetornoResposta(identidade, resultado);
  }

  async montarRetornoResposta(identidade, { desafio, situacao, atualizado, novoPerfil, pausa }) {
    const retorno = {
      resultado: situacao,
      habilidade: atualizado.habilidade,
      delta: atualizado.delta,
      sequenciaAcertos: atualizado.sequenciaAcertos,
      perfil: this.resumoPerfil({ ...novoPerfil, pausaRestanteMs: pausa.segundos * 1000 }),
      pausaSegundos: pausa.segundos,
    };

    if (situacao === 'correta') {
      retorno.explicacao = desafio.questao_id ? await this.repo.questaoExplicacao(desafio.questao_id) : '';
      const componente = await this.repo.componente(desafio.component_id);
      if (componente) {
        const niveis = await this.niveis(identidade);
        const nivel = niveis.find((n) => n.id === componente.nivel_id);
        retorno.nivelCompleto = Boolean(nivel && nivel.completo);
      }
    }
    return retorno;
  }
}

module.exports = HardwareGameService;
