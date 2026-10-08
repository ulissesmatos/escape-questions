const { ErroSala } = require('./Sala');

// Junta mudanças seguidas (30 alunos enviando quase juntos) em um envio só
const ESPERA_TRANSMISSAO_MS = 120;

/**
 * Tempo real do Laboratório via Socket.IO.
 *
 * Cada tela entra em uma "room":
 *   aluno:<id>      o(s) navegador(es) de um aluno
 *   sala:<codigo>   todos os alunos da sala (avisos gerais)
 *   prof:<codigo>   painel do professor com essa sala aberta
 *   telao:<codigo>  telão projetado
 *   professores     painéis logados (lista de salas)
 *
 * Toda mudança gera um retrato completo e personalizado para cada tela
 * ('estado'). O aluno recebe só o que pode ver: a resposta certa de uma
 * tarefa só vai no retrato dele depois que ele responder.
 *
 * Pedidos usam o callback do Socket.IO (ack): resposta { ok: true, ... } ou { erro }.
 */
function ligarLaboratorio(io, { servico, auth }) {
  const agendadas = new Map();

  servico.on('mudou', (sala) => agendarTransmissao(sala.codigo));
  servico.on('fechada', (codigo) => {
    io.to(`sala:${codigo}`).to(`telao:${codigo}`).to(`prof:${codigo}`).emit('sala-fechada');
    io.in(`sala:${codigo}`).disconnectSockets(true);
    transmitirLista();
  });

  function agendarTransmissao(codigo) {
    if (agendadas.has(codigo)) return;
    agendadas.set(
      codigo,
      setTimeout(() => {
        agendadas.delete(codigo);
        transmitir(codigo);
      }, ESPERA_TRANSMISSAO_MS)
    );
  }

  function transmitir(codigo) {
    const sala = servico.salas.get(codigo);
    if (!sala) return;
    const agora = servico.relogio();
    const ranking = sala.ranking(agora);
    for (const aluno of sala.alunos.values()) {
      if (aluno.conexoes > 0) io.to(`aluno:${aluno.id}`).emit('estado', sala.visaoAluno(aluno.id, agora, ranking));
    }
    io.to(`prof:${codigo}`).emit('estado', sala.visaoProfessor(agora, ranking));
    io.to(`telao:${codigo}`).emit('estado', sala.visaoTelao(agora, ranking));
    transmitirLista();
  }

  function transmitirLista() {
    io.to('professores').emit('salas', servico.listarSalas());
  }

  io.on('connection', (socket) => {
    /** Registra um pedido: valida o formato, trata erros de regra e responde no ack */
    function pedido(evento, tratar) {
      socket.on(evento, (dados, ack) => {
        const responder = typeof ack === 'function' ? ack : () => {};
        try {
          const resultado = tratar(dados && typeof dados === 'object' ? dados : {});
          responder({ ok: true, ...resultado });
        } catch (erro) {
          if (!(erro instanceof ErroSala)) console.error(`[laboratorio] ${evento}:`, erro);
          responder({ erro: erro instanceof ErroSala ? erro.message : 'Algo deu errado. Tente de novo.' });
        }
      });
    }

    // ------------------------------------------------------------ aluno

    function vincularAluno(sala, aluno) {
      desvincularAluno();
      socket.data.aluno = { codigo: sala.codigo, id: aluno.id };
      socket.join([`aluno:${aluno.id}`, `sala:${sala.codigo}`]);
      servico.conectar(sala, aluno);
      return { token: aluno.token, codigo: sala.codigo, estado: sala.visaoAluno(aluno.id, servico.relogio()) };
    }

    function desvincularAluno() {
      const atual = socket.data.aluno;
      if (!atual) return;
      socket.leave(`aluno:${atual.id}`);
      socket.leave(`sala:${atual.codigo}`);
      socket.data.aluno = null;
      servico.desconectar(atual.codigo, atual.id);
    }

    function alunoAtual() {
      if (!socket.data.aluno) throw new ErroSala('Entre na sala de novo.');
      return socket.data.aluno;
    }

    pedido('aluno:entrar', ({ codigo, nome }) => {
      const sala = servico.sala(codigo);
      const aluno = sala.entrar(nome, servico.relogio());
      return vincularAluno(sala, aluno);
    });

    pedido('aluno:retomar', ({ codigo, token }) => {
      const sala = servico.sala(codigo);
      const aluno = sala.porToken(token);
      if (!aluno) throw new ErroSala('Sua sessão nesta sala acabou. Entre de novo com seu nome.');
      return vincularAluno(sala, aluno);
    });

    pedido('aluno:abrir', ({ tarefaId }) => {
      const { codigo, id } = alunoAtual();
      const sala = servico.sala(codigo);
      if (sala.abrir(id, String(tarefaId), servico.relogio())) servico.mudou(sala);
      return {};
    });

    pedido('aluno:responder', ({ tarefaId, letra }) => {
      const { codigo, id } = alunoAtual();
      const revelacao = servico.alterar(codigo, (sala, agora) => sala.responder(id, String(tarefaId), letra, agora));
      return { revelacao };
    });

    // ------------------------------------------------------------ telão (sem controles)

    pedido('telao:assistir', ({ codigo }) => {
      const sala = servico.sala(codigo);
      socket.join(`telao:${sala.codigo}`);
      return { estado: sala.visaoTelao(servico.relogio()) };
    });

    // ------------------------------------------------------------ professor

    function exigirProfessor() {
      const sessao = socket.data.professor;
      if (!sessao || sessao.exp < Date.now()) throw new ErroSala('Sessão do professor expirada. Entre de novo com o PIN.');
    }

    pedido('prof:entrar', ({ token }) => {
      const sessao = auth.verificar(token);
      if (!sessao) throw new ErroSala('Sessão do professor expirada. Entre de novo com o PIN.');
      socket.data.professor = sessao;
      socket.join('professores');
      return { salas: servico.listarSalas(), tarefas: servico.catalogo.atuais.map(({ id, titulo }) => ({ id, titulo })) };
    });

    pedido('prof:criar', ({ modo, duracaoMin, tarefaIds }) => {
      exigirProfessor();
      const sala = servico.criarSala({ modo, duracaoMin, tarefaIds });
      return { codigo: sala.codigo };
    });

    pedido('prof:abrir', ({ codigo }) => {
      exigirProfessor();
      const sala = servico.sala(codigo);
      for (const room of socket.rooms) if (room.startsWith('prof:')) socket.leave(room);
      socket.join(`prof:${sala.codigo}`);
      return { estado: sala.visaoProfessor(servico.relogio()) };
    });

    pedido('prof:fechar', ({ codigo }) => {
      exigirProfessor();
      servico.fecharSala(servico.sala(codigo).codigo);
      return {};
    });

    // Ações de controle da partida: { codigo, acao, ...parâmetros }
    const ACOES = {
      iniciar: (sala, agora) => sala.iniciar(agora),
      proxima: (sala, agora) => sala.proxima(agora),
      encerrarTarefa: (sala, agora) => sala.encerrarTarefa(agora),
      maisTempo: (sala, agora, d) => sala.maisTempo(d.segundos, agora),
      pausar: (sala, agora) => sala.pausar(agora),
      retomar: (sala, agora) => sala.retomar(agora),
      finalizar: (sala, agora) => sala.finalizar(agora),
      renomear: (sala, agora, d) => sala.renomear(String(d.alunoId), d.nome),
      expulsar: (sala, agora, d) => {
        sala.expulsar(String(d.alunoId));
        io.to(`aluno:${d.alunoId}`).emit('expulso');
        io.in(`aluno:${d.alunoId}`).disconnectSockets(true);
      },
    };

    pedido('prof:acao', (dados) => {
      exigirProfessor();
      const acao = ACOES[dados.acao];
      if (!acao) throw new ErroSala('Ação desconhecida.');
      servico.alterar(dados.codigo, (sala, agora) => acao(sala, agora, dados));
      return {};
    });

    socket.on('disconnect', () => desvincularAluno());
  });
}

module.exports = { ligarLaboratorio };
