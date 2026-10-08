const crypto = require('crypto');
const { validarNome, chaveNome } = require('./nomes');
const { tarefaParaAluno, LETRAS } = require('./tarefas');

/**
 * Uma sala do Laboratório de Experimentos: alunos, fase da partida,
 * cronômetro, respostas e pontuação.
 *
 * Só regras, sem rede nem banco: o serviço chama os métodos e depois avisa os
 * navegadores. Todo método que muda algo recebe `agora` (ms), o que deixa os
 * testes controlarem o relógio.
 *
 * Fases:
 *   espera → (rodadas) tarefa ⇄ parcial → final
 *   espera → (livre)   livre            → final
 */

const PONTOS = Object.freeze({ aposta: 10, conclusao: 10, velocidade: [5, 3, 1], explicacao: 5 });
const LIMITES = Object.freeze({ registroMin: 15, registroMax: 1000, explicacaoMin: 10, explicacaoMax: 600, alunos: 60, destaques: 3 });
const MODOS = ['rodadas', 'livre'];

// Aluno que caiu há pouco (recarregou a página) ainda conta como presente,
// para a rodada não terminar sozinha enquanto ele volta
const TOLERANCIA_QUEDA_MS = 20 * 1000;

/** Erro de regra, com mensagem para mostrar na tela */
class ErroSala extends Error {}

const novoId = (bytes) => crypto.randomBytes(bytes).toString('base64url');

class Sala {
  constructor({ codigo, modo = 'rodadas', duracaoSeg = 240, tarefas, agora = Date.now() }) {
    if (!MODOS.includes(modo)) throw new ErroSala('Modo de jogo inválido.');
    if (!Array.isArray(tarefas) || !tarefas.length) throw new ErroSala('A sala precisa de pelo menos uma tarefa.');
    this.codigo = codigo;
    this.modo = modo;
    this.duracaoSeg = Math.min(30 * 60, Math.max(30, Math.round(duracaoSeg)));
    this.tarefas = tarefas;
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
    this.destaques = []; // [{ alunoId, tarefaId }] escolhidos pelo professor
    this.destaquesVisiveis = false;
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
    this.destaques = this.destaques.filter((d) => d.alunoId !== alunoId);
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
    this.destaquesVisiveis = false;
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

  /** Chamado a cada segundo: acabou o tempo da rodada? */
  verificarTempo(agora = Date.now()) {
    if (this.fase === 'tarefa' && !this.pausada && this.fimEm !== null && agora >= this.fimEm) {
      this.encerrarTarefa(agora);
      return true;
    }
    return false;
  }

  /** Rodadas: todos os alunos presentes já registraram a tarefa atual? */
  todosConcluiram(agora = Date.now()) {
    if (this.modo !== 'rodadas' || this.fase !== 'tarefa') return false;
    const tarefa = this.tarefas[this.indice];
    const presentes = [...this.alunos.values()].filter((a) => this.presente(a, agora));
    return presentes.length > 0 && presentes.every((a) => a.respostas[tarefa.id]?.registro);
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

  /** De quando conta o tempo do aluno nessa tarefa */
  inicioDaTarefa(aluno, resposta) {
    if (this.modo === 'rodadas') return Math.max(this.liberadaEm, aluno.entrouEm);
    return resposta.abertaEm ?? Math.max(this.iniciadaEm, aluno.entrouEm);
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

  apostar(alunoId, tarefaId, letra, agora = Date.now()) {
    const aluno = this.aluno(alunoId);
    const { tarefa, indice } = this.tarefa(tarefaId);
    this.exigirAberta(indice);
    const resposta = this.resposta(aluno, tarefaId);
    if (resposta.aposta) throw new ErroSala('Sua aposta já está travada.');
    const posicao = LETRAS.indexOf(String(letra));
    if (posicao < 0 || posicao >= tarefa.opcoes.length) throw new ErroSala('Escolha uma das opções.');
    if (this.modo === 'livre' && resposta.abertaEm == null) resposta.abertaEm = agora;
    resposta.aposta = LETRAS[posicao];
    resposta.apostaEm = agora;
  }

  /** Envia o registro: só aqui a resposta certa é revelada para o aluno */
  registrar(alunoId, tarefaId, texto, agora = Date.now()) {
    const aluno = this.aluno(alunoId);
    const { tarefa, indice } = this.tarefa(tarefaId);
    this.exigirAberta(indice);
    const resposta = this.resposta(aluno, tarefaId);
    if (!resposta.aposta) throw new ErroSala('Primeiro faça a sua aposta.');
    if (resposta.registro) throw new ErroSala('Você já registrou essa tarefa.');
    const limpo = String(texto ?? '').trim().slice(0, LIMITES.registroMax);
    if (limpo.length < LIMITES.registroMin) throw new ErroSala(`Escreva pelo menos ${LIMITES.registroMin} letras sobre o que aconteceu.`);

    resposta.ordem = this.concluiram(tarefaId);
    resposta.registro = limpo;
    resposta.registroEm = agora;
    resposta.acertou = resposta.aposta === tarefa.correta;
    resposta.tempoMs = this.tempoAtivo(this.inicioDaTarefa(aluno, resposta), agora);
    return this.revelacao(tarefa, resposta);
  }

  explicar(alunoId, tarefaId, texto, agora = Date.now()) {
    const aluno = this.aluno(alunoId);
    this.tarefa(tarefaId);
    const resposta = aluno.respostas[tarefaId];
    if (!resposta?.registro) throw new ErroSala('Registre o que aconteceu antes de explicar.');
    if (resposta.explicacao) throw new ErroSala('Você já enviou sua explicação.');
    const limpo = String(texto ?? '').trim().slice(0, LIMITES.explicacaoMax);
    if (limpo.length < LIMITES.explicacaoMin) throw new ErroSala(`Escreva pelo menos ${LIMITES.explicacaoMin} letras.`);
    resposta.explicacao = limpo;
    resposta.explicacaoEm = agora;
    resposta.explicacaoStatus = 'pendente';
  }

  /** Professor aprova (+5) ou recusa a explicação. Pode mudar de ideia depois. */
  avaliarExplicacao(alunoId, tarefaId, aprovada) {
    const resposta = this.aluno(alunoId).respostas[tarefaId];
    if (!resposta?.explicacao) throw new ErroSala('Esse aluno não enviou explicação para essa tarefa.');
    resposta.explicacaoStatus = aprovada ? 'aprovada' : 'recusada';
  }

  /** Marca/desmarca um registro para mostrar no telão (no máximo 3) */
  alternarDestaque(alunoId, tarefaId) {
    const existente = this.destaques.findIndex((d) => d.alunoId === alunoId && d.tarefaId === tarefaId);
    if (existente >= 0) {
      this.destaques.splice(existente, 1);
      return false;
    }
    if (!this.aluno(alunoId).respostas[tarefaId]?.registro) throw new ErroSala('Esse aluno ainda não registrou essa tarefa.');
    if (this.destaques.length >= LIMITES.destaques) throw new ErroSala(`Escolha no máximo ${LIMITES.destaques} respostas. Desmarque uma antes.`);
    this.destaques.push({ alunoId, tarefaId });
    return true;
  }

  mostrarDestaques(visiveis) {
    if (visiveis && !this.destaques.length) throw new ErroSala('Marque com a estrela até 3 registros para mostrar.');
    this.destaquesVisiveis = Boolean(visiveis);
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

  concluiram(tarefaId) {
    let total = 0;
    for (const aluno of this.alunos.values()) if (aluno.respostas[tarefaId]?.registro) total++;
    return total;
  }

  static pontosDaResposta(resposta) {
    if (!resposta?.registro) return null;
    const pontos = {
      aposta: resposta.acertou ? PONTOS.aposta : 0,
      conclusao: PONTOS.conclusao,
      velocidade: PONTOS.velocidade[resposta.ordem] || 0,
      explicacao: resposta.explicacaoStatus === 'aprovada' ? PONTOS.explicacao : 0,
    };
    pontos.total = pontos.aposta + pontos.conclusao + pontos.velocidade + pontos.explicacao;
    return pontos;
  }

  resumo(aluno) {
    const r = { pontos: 0, apostasCertas: 0, concluidas: 0, tempoTotalMs: 0 };
    for (const tarefa of this.tarefas) {
      const resposta = aluno.respostas[tarefa.id];
      const pontos = Sala.pontosDaResposta(resposta);
      if (!pontos) continue;
      r.pontos += pontos.total;
      r.concluidas += 1;
      r.tempoTotalMs += resposta.tempoMs || 0;
      if (resposta.acertou) r.apostasCertas += 1;
    }
    return r;
  }

  /** Mais pontos; empate: mais apostas certas, depois menos tempo total */
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
        b.apostasCertas - a.apostasCertas ||
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
      acertou: resposta?.aposta ? resposta.aposta === tarefa.correta : null,
      explicacao: tarefa.explicacao,
      pontos: Sala.pontosDaResposta(resposta),
    };
  }

  /** A resposta certa só aparece depois do registro (ou quando a tarefa fechou para todos) */
  podeRevelar(indice, resposta) {
    if (resposta?.registro || this.fase === 'final') return true;
    return this.modo === 'rodadas' && (indice < this.indice || (indice === this.indice && this.fase === 'parcial'));
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
      concluiram: atual ? this.concluiram(atual.id) : null,
    };
  }

  static rankingPublico(ranking) {
    return ranking.map(({ id, nome, pontos, apostasCertas, concluidas, posicao }) => ({ id, nome, pontos, apostasCertas, concluidas, posicao }));
  }

  visaoAluno(alunoId, agora = Date.now(), ranking = this.ranking(agora)) {
    const aluno = this.aluno(alunoId);
    const meu = ranking.find((r) => r.id === alunoId);
    const mostrarRanking = this.fase === 'parcial' || this.fase === 'final';
    return {
      agora,
      sala: this.resumoPublico(agora),
      eu: { id: aluno.id, nome: aluno.nome, pontos: meu.pontos, posicao: meu.posicao, apostasCertas: meu.apostasCertas, concluidas: meu.concluidas },
      tarefas: this.tarefasLiberadas().map((tarefa, indice) => {
        const resposta = aluno.respostas[tarefa.id];
        return {
          ...tarefaParaAluno(tarefa),
          numero: indice + 1,
          aberta: this.estaAberta(indice),
          minha: {
            aposta: resposta?.aposta || null,
            registro: resposta?.registro || null,
            explicacao: resposta?.explicacao || null,
            explicacaoStatus: resposta?.explicacaoStatus || null,
          },
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
      tarefa: atual ? { ...tarefaParaAluno(atual), numero: this.indice + 1 } : null,
      progresso: this.modo === 'livre' ? this.tarefas.map((t) => ({ titulo: t.titulo, concluiram: this.concluiram(t.id) })) : null,
      ranking: Sala.rankingPublico(ranking),
      destaques: this.destaquesVisiveis ? this.listarDestaques() : [],
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
      destaques: this.destaques,
      destaquesVisiveis: this.destaquesVisiveis,
    };
  }

  listarDestaques() {
    return this.destaques.map(({ alunoId, tarefaId }) => {
      const aluno = this.alunos.get(alunoId);
      const tarefa = this.tarefas.find((t) => t.id === tarefaId);
      return { nome: aluno.nome, tarefa: tarefa.titulo, registro: aluno.respostas[tarefaId].registro };
    });
  }

  resumoParaLista(agora = Date.now()) {
    const { fase, modo, totalAlunos, conectados, indice, totalTarefas } = this.resumoPublico(agora);
    return { codigo: this.codigo, fase, modo, totalAlunos, conectados, indice, totalTarefas, criadaEm: this.criadaEm };
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
    const sala = new Sala({ codigo: dados.codigo, modo: dados.modo, duracaoSeg: dados.duracaoSeg, tarefas: dados.tarefas, agora: dados.criadaEm });
    const { alunos = [], ...resto } = dados;
    Object.assign(sala, resto);
    // Quem estava na sala volta como "caiu agora": tem a tolerância para reconectar
    const agora = Date.now();
    sala.alunos = new Map(alunos.map((a) => [a.id, { ...a, conexoes: 0, desconectouEm: agora }]));
    return sala;
  }
}

module.exports = { Sala, ErroSala, PONTOS, LIMITES, MODOS };
