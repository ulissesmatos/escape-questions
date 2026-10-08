const { EventEmitter } = require('events');
const Random = require('../../shared/Random');
const { Sala, ErroSala, MODOS } = require('./Sala');
const { nomeOfensivo } = require('./nomes');
const { HORAS_GUARDADAS } = require('./repositorios');

// Sem I e O (confundem com 1 e 0 no quadro)
const LETRAS_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const INTERVALO_SALVAR_MS = 2000;

/**
 * Guarda as salas abertas em memória, roda o relógio (fim das rodadas) e
 * salva as salas alteradas no repositório a cada 2 segundos.
 *
 * Eventos:
 *   'mudou'   (sala)    algo mudou: as telas daquela sala devem ser atualizadas
 *   'fechada' (codigo)  o professor fechou a sala (ou ela expirou)
 */
class LaboratorioService extends EventEmitter {
  constructor({ catalogo, repositorio, relogio = () => Date.now(), random = new Random() }) {
    super();
    this.catalogo = catalogo;
    this.repositorio = repositorio;
    this.relogio = relogio;
    this.random = random;
    this.salas = new Map();
    this.sujas = new Set();
    this.ultimoSalvamento = 0;
  }

  /** Lê as tarefas editadas e as salas que estavam abertas antes de reiniciar */
  async carregar() {
    await this.catalogo.carregar();
    for (const dados of await this.repositorio.carregarSalas()) {
      try {
        const sala = Sala.deJSON(dados);
        this.salas.set(sala.codigo, sala);
      } catch (erro) {
        console.warn(`[laboratorio] sala ${dados && dados.codigo} ignorada:`, erro.message);
      }
    }
    if (this.salas.size) console.log(`[laboratorio] ${this.salas.size} sala(s) recuperada(s).`);
  }

  iniciarRelogio() {
    this.timer = setInterval(() => this.tick().catch((e) => console.error('[laboratorio] relógio:', e)), 1000);
    this.timer.unref();
  }

  async parar() {
    clearInterval(this.timer);
    await this.salvarPendentes();
  }

  async tick() {
    const agora = this.relogio();
    for (const sala of this.salas.values()) {
      if (sala.verificarTempo(agora)) this.mudou(sala);
      if (agora - sala.atualizadaEm > HORAS_GUARDADAS * 60 * 60 * 1000) await this.fecharSala(sala.codigo);
    }
    if (agora - this.ultimoSalvamento >= INTERVALO_SALVAR_MS) await this.salvarPendentes();
  }

  async salvarPendentes() {
    this.ultimoSalvamento = this.relogio();
    const codigos = [...this.sujas];
    this.sujas.clear();
    for (const codigo of codigos) {
      const sala = this.salas.get(codigo);
      if (!sala) continue;
      try {
        await this.repositorio.salvarSala(codigo, sala.paraJSON());
      } catch (erro) {
        this.sujas.add(codigo); // tenta de novo no próximo ciclo
        console.error(`[laboratorio] não foi possível salvar a sala ${codigo}:`, erro.message);
      }
    }
  }

  mudou(sala) {
    sala.atualizadaEm = this.relogio();
    this.sujas.add(sala.codigo);
    this.emit('mudou', sala);
  }

  // ---------------------------------------------------------------- salas

  gerarCodigo() {
    for (let tentativa = 0; tentativa < 1000; tentativa++) {
      let codigo = '';
      for (let i = 0; i < 4; i++) codigo += LETRAS_CODIGO[this.random.int(0, LETRAS_CODIGO.length - 1)];
      if (!this.salas.has(codigo) && !nomeOfensivo(codigo)) return codigo;
    }
    throw new ErroSala('Não foi possível gerar um código livre. Feche salas antigas.');
  }

  criarSala({ modo = 'rodadas', duracaoMin = 4, tarefaIds = null } = {}) {
    if (!MODOS.includes(modo)) throw new ErroSala('Escolha o modo: rodadas ou livre.');
    const todas = this.catalogo.atuais;
    const escolhidas = Array.isArray(tarefaIds) && tarefaIds.length ? todas.filter((t) => tarefaIds.includes(t.id)) : todas;
    if (!escolhidas.length) throw new ErroSala('Escolha pelo menos uma tarefa.');
    const duracao = Number(duracaoMin);
    const sala = new Sala({
      codigo: this.gerarCodigo(),
      modo,
      duracaoSeg: (Number.isFinite(duracao) && duracao > 0 ? duracao : 4) * 60,
      tarefas: JSON.parse(JSON.stringify(escolhidas)), // cópia: editar o catálogo não muda a partida
      agora: this.relogio(),
    });
    this.salas.set(sala.codigo, sala);
    this.mudou(sala);
    return sala;
  }

  sala(codigo) {
    const sala = this.salas.get(String(codigo || '').trim().toUpperCase());
    if (!sala) throw new ErroSala('Sala não encontrada. Confira o código no telão.');
    return sala;
  }

  /**
   * Executa uma mudança na sala e avisa as telas. Depois de cada ação, se no
   * modo rodadas todos os alunos presentes já responderam, a rodada fecha.
   */
  alterar(codigo, mudanca) {
    const sala = this.sala(codigo);
    const agora = this.relogio();
    const resultado = mudanca(sala, agora);
    if (sala.todosConcluiram(agora)) sala.encerrarTarefa(agora);
    this.mudou(sala);
    return resultado;
  }

  async fecharSala(codigo) {
    if (!this.salas.delete(codigo)) return;
    this.sujas.delete(codigo);
    this.emit('fechada', codigo);
    try {
      await this.repositorio.removerSala(codigo);
    } catch (erro) {
      console.error(`[laboratorio] não foi possível apagar a sala ${codigo}:`, erro.message);
    }
  }

  listarSalas() {
    const agora = this.relogio();
    return [...this.salas.values()].sort((a, b) => b.criadaEm - a.criadaEm).map((s) => s.resumoParaLista(agora));
  }

  // ---------------------------------------------------------------- conexões dos alunos

  conectar(sala, aluno) {
    aluno.conexoes += 1;
    aluno.desconectouEm = null;
    this.mudou(sala);
  }

  desconectar(codigo, alunoId) {
    const sala = this.salas.get(codigo);
    const aluno = sala && sala.alunos.get(alunoId);
    if (!aluno) return;
    aluno.conexoes = Math.max(0, aluno.conexoes - 1);
    if (aluno.conexoes === 0) aluno.desconectouEm = this.relogio();
    this.mudou(sala);
  }
}

module.exports = { LaboratorioService, ErroSala };
