const crypto = require('crypto');
const Random = require('../../shared/Random');
const { validarNome, chaveNome } = require('./nomes');
const { tarefaParaAluno, descreverTema, LETRAS } = require('./tarefas');

/**
 * Uma sala do Laboratório de Experimentos: alunos, fase da partida,
 * cronômetro, respostas e pontuação.
 *
 * Cada tarefa tem duas etapas para o aluno: primeiro ele vê só a instrução e
 * faz a ação no computador; depois de um tempo mínimo, aparecem as opções de
 * "o que aconteceu?" e ele responde uma vez. A resposta certa só vai para o
 * navegador depois disso.
 *
 * Só regras, sem rede nem banco: o serviço chama os métodos e depois avisa os
 * navegadores. Todo método que muda algo recebe `agora` (ms), o que deixa os
 * testes controlarem o relógio.
 *
 * Fases:
 *   espera → (rodadas) tarefa ⇄ parcial → final
 *   espera → (livre)   livre            → final
 */

const PONTOS = Object.freeze({ acerto: 10, participacao: 2, velocidade: [5, 3, 1] });
const LIMITES = Object.freeze({ alunos: 60 });
const MODOS = ['rodadas', 'livre'];

// Aluno que caiu há pouco (recarregou a página) ainda conta como presente,
// para a rodada não terminar sozinha enquanto ele volta
const TOLERANCIA_QUEDA_MS = 20 * 1000;
// Folga na trava de tempo mínimo (relógios e rede não são exatos)
const FOLGA_TEMPO_MINIMO_MS = 1500;

/** Erro de regra, com mensagem para mostrar na tela */
class ErroSala extends Error {}

const novoId = (bytes) => crypto.randomBytes(bytes).toString('base64url');

class Sala {
  constructor({ codigo, modo = 'rodadas', duracaoSeg = 240, tarefas, categoria = 'escolhidas', agora = Date.now() }) {
    if (!MODOS.includes(modo)) throw new ErroSala('Modo de jogo inválido.');
    if (!Array.isArray(tarefas) || !tarefas.length) throw new ErroSala('A sala precisa de pelo menos uma tarefa.');
    this.codigo = codigo;
    this.modo = modo;
    this.duracaoSeg = Math.min(30 * 60, Math.max(30, Math.round(duracaoSeg)));
    this.tarefas = tarefas;
    this.categoria = categoria; // tema sorteado, "misturado" ou "escolhidas" (o professor marcou à mão)
    this.partida = 1;
    // Perguntas que esta sala já viu (em ordem), para a próxima partida não repetir
    this.usadas = tarefas.map((t) => t.id);
    this.criadaEm = agora;
    this.atualizadaEm = agora;

    this.fase = 'espera';
    this.indice = -1; // rodadas: tarefa liberada agora
    this.iniciadaEm = null;
    this.liberadaEm = null; // rodadas: quando a tarefa atual foi liberada
    this.fimEm = null; // cronômetro correndo: quando acaba
    this.restanteMs = null; // cronômetro parado (pausa): quanto falta
    this.pausada = false;
    this.pausas = []; // [{ inicio, fim }]: o tempo pausado não conta no tempo dos alunos

    this.alunos = new Map(); // id → { id, token, nome, entrouEm, respostas, conexoes, desconectouEm }
  }

  // ---------------------------------------------------------------- alunos

  entrar(nome, agora = Date.now()) {
    if (this.fase === 'final') throw new ErroSala('Essa partida já terminou.');
    if (this.alunos.size >= LIMITES.alunos) throw new ErroSala('A sala está cheia.');
    const limpo = this.validarNomeLivre(nome);
    const aluno = { id: novoId(6), token: novoId(18), nome: limpo, entrouEm: agora, respostas: {}, conexoes: 0, desconectouEm: null };
    this.alunos.set(aluno.id, aluno);
    return aluno;
  }

  /** Acha o aluno pelo token guardado no navegador (reconexão) */
  porToken(token) {
    if (typeof token !== 'string' || !token) return null;
    for (const aluno of this.alunos.values()) {
      if (aluno.token.length === token.length && crypto.timingSafeEqual(Buffer.from(aluno.token), Buffer.from(token))) return aluno;
    }
    return null;
  }

  aluno(alunoId) {
    const aluno = this.alunos.get(alunoId);
    if (!aluno) throw new ErroSala('Você não está mais nesta sala.');
    return aluno;
  }

  renomear(alunoId, nome) {
    const aluno = this.aluno(alunoId);
    aluno.nome = this.validarNomeLivre(nome, alunoId);
    return aluno;
  }

  expulsar(alunoId) {
    this.aluno(alunoId);
    this.alunos.delete(alunoId);
  }

  validarNomeLivre(nome, ignorarId = null) {
    let limpo;
    try {
      limpo = validarNome(nome);
    } catch (erro) {
      throw new ErroSala(erro.message);
    }
    const chave = chaveNome(limpo);
    for (const outro of this.alunos.values()) {
      if (outro.id !== ignorarId && chaveNome(outro.nome) === chave) {
        throw new ErroSala('Já tem alguém com esse nome na sala. Coloque também a inicial do sobrenome.');
      }
    }
    return limpo;
  }

  presente(aluno, agora) {
    return aluno.conexoes > 0 || (aluno.desconectouEm !== null && agora - aluno.desconectouEm < TOLERANCIA_QUEDA_MS);
  }

  // ---------------------------------------------------------------- controle do professor

  iniciar(agora = Date.now()) {
    if (this.fase !== 'espera') throw new ErroSala('A partida já começou.');
    this.iniciadaEm = agora;
    if (this.modo === 'rodadas') this.liberarTarefa(0, agora);
    else this.fase = 'livre';
  }

  /** Rodadas: libera a próxima tarefa (ou termina, se era a última) */
  proxima(agora = Date.now()) {
    if (this.modo !== 'rodadas') throw new ErroSala('No modo livre todas as tarefas já estão liberadas.');
    if (this.fase === 'espera') return this.iniciar(agora);
    if (this.fase === 'final') throw new ErroSala('A partida já terminou.');
    if (this.fase === 'tarefa') this.encerrarTarefa(agora);
    if (this.indice + 1 >= this.tarefas.length) return this.finalizar(agora);
    return this.liberarTarefa(this.indice + 1, agora);
  }

  liberarTarefa(indice, agora) {
    this.encerrarPausa(agora);
    this.fase = 'tarefa';
    this.indice = indice;
    this.liberadaEm = agora;
    this.fimEm = agora + this.duracaoSeg * 1000;
    this.restanteMs = null;
  }

  /** Rodadas: fecha a tarefa atual e mostra o ranking parcial */
  encerrarTarefa(agora = Date.now()) {
    if (this.fase !== 'tarefa') throw new ErroSala('Não há tarefa em andamento.');
    this.encerrarPausa(agora);
    this.fase = 'parcial';
    this.fimEm = null;
    this.restanteMs = null;
  }

  maisTempo(segundos, agora = Date.now()) {
    if (this.fase !== 'tarefa') throw new ErroSala('Não há cronômetro correndo.');
    const extra = Math.max(-this.duracaoSeg, Math.min(600, Math.round(Number(segundos) || 0))) * 1000;
    if (this.pausada) this.restanteMs = Math.max(5000, this.restanteMs + extra);
    else this.fimEm = Math.max(agora + 5000, this.fimEm + extra);
  }

  pausar(agora = Date.now()) {
    if (this.pausada) return;
    if (this.fase !== 'tarefa' && this.fase !== 'livre') throw new ErroSala('Só dá para pausar com a partida em andamento.');
    this.pausada = true;
    this.pausas.push({ inicio: agora, fim: null });
    if (this.fimEm !== null) {
      this.restanteMs = Math.max(0, this.fimEm - agora);
      this.fimEm = null;
    }
  }

  retomar(agora = Date.now()) {
    if (!this.pausada) return;
    this.encerrarPausa(agora);
  }

  encerrarPausa(agora) {
    if (!this.pausada) return;
    this.pausada = false;
    const ultima = this.pausas[this.pausas.length - 1];
    if (ultima && ultima.fim === null) ultima.fim = agora;
    if (this.restanteMs !== null) {
      this.fimEm = agora + this.restanteMs;
      this.restanteMs = null;
    }
  }

  finalizar(agora = Date.now()) {
    if (this.fase === 'final') return;
    this.encerrarPausa(agora);
    this.fase = 'final';
    this.fimEm = null;
    this.restanteMs = null;
    this.finalizadaEm = agora;
  }

  /**
   * Começa outra partida na mesma sala, com novas perguntas: os alunos
   * continuam conectados e os pontos voltam a zero.
   * `recomecou`: as perguntas do tema tinham acabado e a lista recomeçou.
   */
  novaPartida(tarefas, { recomecou = false } = {}) {
    if (this.fase !== 'final') throw new ErroSala('Termine a partida atual antes de começar outra.');
    if (!tarefas.length) throw new ErroSala('Não há perguntas para a nova partida.');
    const ids = tarefas.map((t) => t.id);
    this.usadas = recomecou ? ids : [...this.usadas, ...ids];
    this.tarefas = tarefas;
    this.partida += 1;
    this.fase = 'espera';
    this.indice = -1;
    this.iniciadaEm = this.liberadaEm = this.fimEm = this.restanteMs = this.finalizadaEm = null;
    this.pausada = false;
    this.pausas = [];
    for (const aluno of this.alunos.values()) aluno.respostas = {};
  }

  /** Chamado a cada segundo: acabou o tempo da rodada? */
  verificarTempo(agora = Date.now()) {
    if (this.fase === 'tarefa' && !this.pausada && this.fimEm !== null && agora >= this.fimEm) {
      this.encerrarTarefa(agora);
      return true;
    }
    return false;
  }

  /** Rodadas: todos os alunos presentes já responderam a tarefa atual? */
  todosConcluiram(agora = Date.now()) {
    if (this.modo !== 'rodadas' || this.fase !== 'tarefa') return false;
    const tarefa = this.tarefas[this.indice];
    const presentes = [...this.alunos.values()].filter((a) => this.presente(a, agora));
    return presentes.length > 0 && presentes.every((a) => a.respostas[tarefa.id]?.resposta);
  }

  // ---------------------------------------------------------------- ações do aluno

  tarefa(tarefaId) {
    const indice = this.tarefas.findIndex((t) => t.id === tarefaId);
    if (indice < 0) throw new ErroSala('Tarefa não encontrada.');
    return { tarefa: this.tarefas[indice], indice };
  }

  estaAberta(indice) {
    if (this.pausada) return false;
    if (this.modo === 'rodadas') return this.fase === 'tarefa' && indice === this.indice;
    return this.fase === 'livre';
  }

  exigirAberta(indice) {
    if (this.pausada) throw new ErroSala('A partida está pausada. Aguarde o professor.');
    if (!this.estaAberta(indice)) throw new ErroSala(this.fase === 'final' ? 'A partida já terminou.' : 'Essa tarefa não está liberada agora.');
  }

  resposta(aluno, tarefaId) {
    if (!aluno.respostas[tarefaId]) aluno.respostas[tarefaId] = {};
    return aluno.respostas[tarefaId];
  }

  /** De quando conta o tempo do aluno nessa tarefa (null: ainda não abriu, no modo livre) */
  inicioDaTarefa(aluno, resposta) {
    if (this.modo === 'rodadas') return Math.max(this.liberadaEm, aluno.entrouEm);
    return resposta?.abertaEm ?? null;
  }

  /** Quanto falta (ms) para o aluno poder responder: tempo para fazer a ação */
  faltaEsperar(aluno, tarefa, agora) {
    const minimo = (tarefa.tempoMinimo || 0) * 1000;
    const inicio = this.inicioDaTarefa(aluno, aluno.respostas[tarefa.id]);
    if (inicio === null) return minimo;
    return Math.max(0, minimo - this.tempoAtivo(inicio, agora));
  }

  /** Modo livre: o aluno abriu a tarefa (começa a contar o tempo dele) */
  abrir(alunoId, tarefaId, agora = Date.now()) {
    const aluno = this.aluno(alunoId);
    const { indice } = this.tarefa(tarefaId);
    if (this.modo !== 'livre' || !this.estaAberta(indice)) return false;
    const resposta = this.resposta(aluno, tarefaId);
    if (resposta.abertaEm != null) return false;
    resposta.abertaEm = agora;
    return true;
  }

  /** Resposta única de "o que aconteceu?". Só aqui a resposta certa é revelada. */
  responder(alunoId, tarefaId, letra, agora = Date.now()) {
    const aluno = this.aluno(alunoId);
    const { tarefa, indice } = this.tarefa(tarefaId);
    this.exigirAberta(indice);
    const resposta = this.resposta(aluno, tarefaId);
    if (resposta.resposta) throw new ErroSala('Você já respondeu essa tarefa.');
    const posicao = LETRAS.indexOf(String(letra));
    if (posicao < 0 || posicao >= tarefa.opcoes.length) throw new ErroSala('Escolha uma das opções.');

    // Trava contra chute: precisa ter passado o tempo de fazer a ação
    if (this.modo === 'livre' && resposta.abertaEm == null) resposta.abertaEm = agora;
    const falta = this.faltaEsperar(aluno, tarefa, agora);
    if (falta > FOLGA_TEMPO_MINIMO_MS) throw new ErroSala(`Faça o experimento primeiro! Faltam ${Math.ceil(falta / 1000)} segundos.`);

    const acertou = LETRAS[posicao] === tarefa.correta;
    // Bônus de velocidade só entre quem acertou (contado antes de gravar esta resposta)
    resposta.ordem = acertou ? this.acertaram(tarefaId) : null;
    resposta.resposta = LETRAS[posicao];
    resposta.respondidaEm = agora;
    resposta.acertou = acertou;
    resposta.tempoMs = this.tempoAtivo(this.inicioDaTarefa(aluno, resposta), agora);
    return this.revelacao(tarefa, resposta);
  }

  // ---------------------------------------------------------------- pontos e ranking

  /** Tempo entre início e fim descontando as pausas */
  tempoAtivo(inicio, fim) {
    let pausado = 0;
    for (const p of this.pausas) {
      const a = Math.max(inicio, p.inicio);
      const b = Math.min(fim, p.fim ?? fim);
      if (b > a) pausado += b - a;
    }
    return Math.max(0, fim - inicio - pausado);
  }

  contar(tarefaId, condicao) {
    let total = 0;
    for (const aluno of this.alunos.values()) {
      const r = aluno.respostas[tarefaId];
      if (r?.resposta && condicao(r)) total++;
    }
    return total;
  }

  responderam(tarefaId) {
    return this.contar(tarefaId, () => true);
  }

  acertaram(tarefaId) {
    return this.contar(tarefaId, (r) => r.acertou);
  }

  static pontosDaResposta(resposta) {
    if (!resposta?.resposta) return null;
    const pontos = {
      acerto: resposta.acertou ? PONTOS.acerto : 0,
      participacao: resposta.acertou ? 0 : PONTOS.participacao,
      velocidade: resposta.acertou ? PONTOS.velocidade[resposta.ordem] || 0 : 0,
    };
    pontos.total = pontos.acerto + pontos.participacao + pontos.velocidade;
    return pontos;
  }

  resumo(aluno) {
    const r = { pontos: 0, acertos: 0, respondidas: 0, tempoTotalMs: 0 };
    for (const tarefa of this.tarefas) {
      const resposta = aluno.respostas[tarefa.id];
      const pontos = Sala.pontosDaResposta(resposta);
      if (!pontos) continue;
      r.pontos += pontos.total;
      r.respondidas += 1;
      r.tempoTotalMs += resposta.tempoMs || 0;
      if (resposta.acertou) r.acertos += 1;
    }
    return r;
  }

  /** Mais pontos; empate: mais acertos, depois menos tempo total */
  ranking(agora = Date.now()) {
    const linhas = [...this.alunos.values()].map((a) => ({
      id: a.id,
      nome: a.nome,
      conectado: this.presente(a, agora),
      ...this.resumo(a),
    }));
    linhas.sort(
      (a, b) =>
        b.pontos - a.pontos ||
        b.acertos - a.acertos ||
        a.tempoTotalMs - b.tempoTotalMs ||
        a.nome.localeCompare(b.nome, 'pt-BR')
    );
    linhas.forEach((linha, i) => {
      linha.posicao = i + 1;
    });
    return linhas;
  }

  // ---------------------------------------------------------------- o que cada tela recebe

  revelacao(tarefa, resposta) {
    return {
      correta: tarefa.correta,
      textoCorreta: tarefa.opcoes[LETRAS.indexOf(tarefa.correta)],
      acertou: resposta?.resposta ? resposta.resposta === tarefa.correta : null,
      explicacao: tarefa.explicacao,
      pontos: Sala.pontosDaResposta(resposta),
    };
  }

  /** A resposta certa só aparece depois de responder (ou quando a tarefa fechou para todos) */
  podeRevelar(indice, resposta) {
    if (resposta?.resposta || this.fase === 'final') return true;
    return this.modo === 'rodadas' && (indice < this.indice || (indice === this.indice && this.fase === 'parcial'));
  }

  /** Ordem das opções para este aluno: embaralhada, mas sempre a mesma (recarregar não muda) */
  ordemDasOpcoes(alunoId, tarefa) {
    const semente = crypto.createHash('sha256').update(`${alunoId}:${tarefa.id}`).digest().readUInt32BE(0);
    return new Random(semente).shuffle(tarefa.opcoes.map((_, i) => i));
  }

  tarefasLiberadas() {
    if (this.fase === 'espera') return [];
    if (this.modo === 'rodadas') return this.tarefas.slice(0, this.indice + 1);
    return this.tarefas;
  }

  resumoPublico(agora) {
    const atual = this.modo === 'rodadas' && this.indice >= 0 ? this.tarefas[this.indice] : null;
    const alunos = [...this.alunos.values()];
    return {
      codigo: this.codigo,
      modo: this.modo,
      categoria: this.categoria,
      tema: descreverTema(this.categoria),
      partida: this.partida,
      fase: this.fase,
      pausada: this.pausada,
      indice: this.indice,
      totalTarefas: this.tarefas.length,
      duracaoSeg: this.duracaoSeg,
      fimEm: this.fimEm,
      restanteMs: this.restanteMs,
      iniciadaEm: this.iniciadaEm,
      totalAlunos: alunos.length,
      conectados: alunos.filter((a) => this.presente(a, agora)).length,
      responderam: atual ? this.responderam(atual.id) : null,
    };
  }

  static rankingPublico(ranking) {
    return ranking.map(({ id, nome, pontos, acertos, respondidas, posicao }) => ({ id, nome, pontos, acertos, respondidas, posicao }));
  }

  visaoAluno(alunoId, agora = Date.now(), ranking = this.ranking(agora)) {
    const aluno = this.aluno(alunoId);
    const meu = ranking.find((r) => r.id === alunoId);
    const mostrarRanking = this.fase === 'parcial' || this.fase === 'final';
    return {
      agora,
      sala: this.resumoPublico(agora),
      eu: { id: aluno.id, nome: aluno.nome, pontos: meu.pontos, posicao: meu.posicao, acertos: meu.acertos, respondidas: meu.respondidas },
      tarefas: this.tarefasLiberadas().map((tarefa, indice) => {
        const resposta = aluno.respostas[tarefa.id];
        const comecou = this.inicioDaTarefa(aluno, resposta) !== null;
        return {
          ...tarefaParaAluno(tarefa, { ordem: this.ordemDasOpcoes(alunoId, tarefa) }),
          numero: indice + 1,
          aberta: this.estaAberta(indice),
          // Quando (no relógio do servidor) o aluno pode responder; null = ainda não abriu
          liberaEm: comecou ? agora + this.faltaEsperar(aluno, tarefa, agora) : null,
          minha: { resposta: resposta?.resposta || null },
          revelacao: this.podeRevelar(indice, resposta) ? this.revelacao(tarefa, resposta) : null,
        };
      }),
      ranking: mostrarRanking ? Sala.rankingPublico(ranking) : null,
    };
  }

  visaoTelao(agora = Date.now(), ranking = this.ranking(agora)) {
    const atual = this.modo === 'rodadas' && this.indice >= 0 ? this.tarefas[this.indice] : null;
    return {
      agora,
      sala: this.resumoPublico(agora),
      // Sem as opções: no telão aparece só o que fazer
      tarefa: atual ? { ...tarefaParaAluno(atual, { comOpcoes: false }), numero: this.indice + 1 } : null,
      progresso: this.modo === 'livre' ? this.tarefas.map((t) => ({ titulo: t.titulo, responderam: this.responderam(t.id) })) : null,
      ranking: Sala.rankingPublico(ranking),
    };
  }

  visaoProfessor(agora = Date.now(), ranking = this.ranking(agora)) {
    const porId = new Map(ranking.map((r) => [r.id, r]));
    return {
      agora,
      sala: { ...this.resumoPublico(agora), criadaEm: this.criadaEm },
      tarefas: this.tarefas,
      alunos: [...this.alunos.values()].map((a) => ({
        id: a.id,
        nome: a.nome,
        entrouEm: a.entrouEm,
        conectado: porId.get(a.id).conectado,
        posicao: porId.get(a.id).posicao,
        respostas: Object.fromEntries(
          Object.entries(a.respostas).map(([tarefaId, r]) => [tarefaId, { ...r, pontos: Sala.pontosDaResposta(r) }])
        ),
      })),
      ranking,
    };
  }

  resumoParaLista(agora = Date.now()) {
    const { fase, modo, tema, partida, totalAlunos, conectados, indice, totalTarefas } = this.resumoPublico(agora);
    return { codigo: this.codigo, fase, modo, tema, partida, totalAlunos, conectados, indice, totalTarefas, criadaEm: this.criadaEm };
  }

  // ---------------------------------------------------------------- salvar e restaurar

  paraJSON() {
    const { alunos, ...resto } = this;
    return {
      ...resto,
      alunos: [...alunos.values()].map(({ conexoes, desconectouEm, ...aluno }) => aluno), // eslint-disable-line no-unused-vars
    };
  }

  static deJSON(dados) {
    // Salas salvas por versões antigas não têm categoria/partida/usadas: o construtor preenche
    const sala = new Sala({ codigo: dados.codigo, modo: dados.modo, duracaoSeg: dados.duracaoSeg, tarefas: dados.tarefas, categoria: dados.categoria, agora: dados.criadaEm });
    // Campos de versões antigas (aposta, registro, destaques) são ignorados
    const { alunos = [], destaques, destaquesVisiveis, ...resto } = dados; // eslint-disable-line no-unused-vars
    Object.assign(sala, resto);
    // Quem estava na sala volta como "caiu agora": tem a tolerância para reconectar
    const agora = Date.now();
    sala.alunos = new Map(alunos.map((a) => [a.id, { ...a, conexoes: 0, desconectouEm: agora }]));
    return sala;
  }
}

module.exports = { Sala, ErroSala, PONTOS, LIMITES, MODOS };
