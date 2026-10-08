const test = require('node:test');
const assert = require('node:assert/strict');
const { io: conectar } = require('socket.io-client');

const { criarApp, criarLaboratorio, ligarTempoReal } = require('../src/app');
const { AdminAuth } = require('../src/auth/AdminAuth');
const { RepositorioEmMemoria } = require('../src/modules/laboratorio/repositorios');
const PADRAO = require('../src/modules/laboratorio/tasks.json');

const PIN = '4321';
const ALUNOS = 30;
const REGISTRO = 'A tela mostrou a área de trabalho e as janelas sumiram.';

/** Servidor de verdade (HTTP + Socket.IO) numa porta livre, com as salas em memória */
async function subirServidor() {
  const laboratorio = await criarLaboratorio(new RepositorioEmMemoria(), { pin: PIN });
  const app = criarApp({ db: {}, auth: new AdminAuth({ senha: 'admin-teste' }), laboratorio });
  const servidor = await new Promise((ok) => {
    const s = app.listen(0, () => ok(s));
  });
  const io = ligarTempoReal(servidor, laboratorio);
  const url = `http://localhost:${servidor.address().port}`;
  const sockets = [];
  return {
    url,
    laboratorio,
    novoSocket() {
      const socket = conectar(url, { transports: ['websocket'], forceNew: true, reconnection: false });
      sockets.push(socket);
      return socket;
    },
    async fechar() {
      sockets.forEach((s) => s.disconnect());
      await laboratorio.servico.parar();
      await new Promise((ok) => io.close(ok));
    },
  };
}

async function pedir(socket, evento, dados = {}) {
  const resposta = await socket.timeout(5000).emitWithAck(evento, dados);
  if (resposta.erro) throw new Error(resposta.erro);
  return resposta;
}

/** Espera o próximo 'estado' que satisfaz a condição */
function esperarEstado(socket, condicao, ms = 5000) {
  return new Promise((ok, falha) => {
    const timer = setTimeout(() => falha(new Error('estado esperado não chegou')), ms);
    const ouvir = (estado) => {
      if (!condicao(estado)) return;
      clearTimeout(timer);
      socket.off('estado', ouvir);
      ok(estado);
    };
    socket.on('estado', ouvir);
  });
}

function esperarEvento(socket, evento, ms = 5000) {
  return new Promise((ok, falha) => {
    const timer = setTimeout(() => falha(new Error(`${evento} não chegou`)), ms);
    socket.once(evento, (dados) => {
      clearTimeout(timer);
      ok(dados);
    });
  });
}

test('partida completa com 30 alunos em tempo real', async (t) => {
  const srv = await subirServidor();
  t.after(() => srv.fechar());

  // Páginas e o cliente do Socket.IO são servidos
  for (const caminho of ['/laboratorio', '/laboratorio/professor', '/laboratorio/telao/ABCD', '/socket.io/socket.io.esm.min.js']) {
    const r = await fetch(srv.url + caminho);
    assert.equal(r.status, 200, caminho);
  }

  // Login do professor com PIN
  const errado = await fetch(`${srv.url}/api/laboratorio/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: '0000' }) });
  assert.equal(errado.status, 401);
  const { token } = await (await fetch(`${srv.url}/api/laboratorio/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: PIN }) })).json();

  const prof = srv.novoSocket();
  await assert.rejects(pedir(prof, 'prof:criar', {}), /PIN/, 'sem login não cria sala');
  await assert.rejects(pedir(prof, 'prof:entrar', { token: 'falso.token' }), /PIN/);
  const { tarefas } = await pedir(prof, 'prof:entrar', { token });
  assert.equal(tarefas.length, PADRAO.length);
  const { codigo } = await pedir(prof, 'prof:criar', { modo: 'rodadas', duracaoMin: 4 });
  await pedir(prof, 'prof:abrir', { codigo });

  const telao = srv.novoSocket();
  await pedir(telao, 'telao:assistir', { codigo: codigo.toLowerCase() });

  // 30 alunos entram ao mesmo tempo
  const alunos = Array.from({ length: ALUNOS }, () => srv.novoSocket());
  const entradas = await Promise.all(alunos.map((s, i) => pedir(s, 'aluno:entrar', { codigo, nome: `Aluno ${i + 1}` })));
  assert.equal(new Set(entradas.map((e) => e.token)).size, ALUNOS);
  await assert.rejects(pedir(srv.novoSocket(), 'aluno:entrar', { codigo, nome: 'aluno 1' }), /Já tem alguém/);
  await assert.rejects(pedir(srv.novoSocket(), 'aluno:entrar', { codigo: 'ZZZZ', nome: 'Bia' }), /não encontrada/);

  // Professor libera a 1ª tarefa: todos recebem, sem a resposta certa
  const recebidos = alunos.map((s) => esperarEstado(s, (e) => e.sala.fase === 'tarefa'));
  await pedir(prof, 'prof:acao', { codigo, acao: 'iniciar' });
  const estados = await Promise.all(recebidos);
  const tarefa = estados[0].tarefas[0];
  for (const e of estados) {
    const json = JSON.stringify(e);
    assert.ok(!json.includes(PADRAO[0].explicacao), 'explicação vazou antes do registro');
    assert.ok(!json.includes('"correta"'), 'resposta certa vazou antes do registro');
  }

  // Todos apostam e registram ao mesmo tempo; metade acerta
  const inicio = Date.now();
  const fimDaRodada = esperarEstado(telao, (e) => e.sala.fase === 'parcial');
  const revelacoes = await Promise.all(
    alunos.map(async (s, i) => {
      await pedir(s, 'aluno:apostar', { tarefaId: tarefa.id, letra: i % 2 ? 'b' : 'a' });
      return (await pedir(s, 'aluno:registrar', { tarefaId: tarefa.id, texto: REGISTRO })).revelacao;
    })
  );
  const estadoTelao = await fimDaRodada;
  const duracao = Date.now() - inicio;
  t.diagnostic(`30 apostas + 30 registros + fim automático da rodada em ${duracao} ms`);
  assert.ok(duracao < 3000, `lento demais: ${duracao} ms`);

  assert.ok(revelacoes.every((r) => r.correta === 'b'));
  assert.equal(revelacoes.filter((r) => r.acertou).length, ALUNOS / 2);
  // Bônus de velocidade só para os 3 primeiros
  assert.deepEqual(revelacoes.map((r) => r.pontos.velocidade).filter(Boolean).sort(), [1, 3, 5]);
  assert.equal(estadoTelao.ranking.length, ALUNOS);
  assert.equal(estadoTelao.sala.concluiram, ALUNOS);
  assert.ok(!JSON.stringify(estadoTelao).includes('"token"'), 'telão não recebe tokens');

  // Queda de conexão: volta com o token e mantém os pontos
  const pontosAntes = estadoTelao.ranking.find((r) => r.nome === 'Aluno 2').pontos;
  alunos[1].disconnect();
  const voltou = await pedir(srv.novoSocket(), 'aluno:retomar', { codigo, token: entradas[1].token });
  assert.equal(voltou.estado.eu.pontos, pontosAntes);
  assert.ok(voltou.estado.tarefas[0].revelacao, 'depois da rodada a resposta aparece');

  // Aluno atrasado recebe a tarefa atual
  await pedir(prof, 'prof:acao', { codigo, acao: 'proxima' });
  const atrasado = await pedir(srv.novoSocket(), 'aluno:entrar', { codigo, nome: 'Zeca' });
  assert.equal(atrasado.estado.tarefas.length, 2);
  assert.equal(atrasado.estado.tarefas[1].aberta, true);

  // Expulsar avisa o aluno
  const avisoExpulso = esperarEvento(alunos[2], 'expulso');
  await pedir(prof, 'prof:acao', { codigo, acao: 'expulsar', alunoId: entradas[2].estado.eu.id });
  await avisoExpulso;
  await assert.rejects(pedir(srv.novoSocket(), 'aluno:retomar', { codigo, token: entradas[2].token }), /sessão/);

  // Fechar a sala avisa todo mundo
  const avisoFechada = esperarEvento(alunos[3], 'sala-fechada');
  const telaoFechado = esperarEvento(telao, 'sala-fechada');
  await pedir(prof, 'prof:fechar', { codigo });
  await Promise.all([avisoFechada, telaoFechado]);
  assert.equal(srv.laboratorio.servico.salas.size, 0);
});

test('editor de tarefas exige o PIN e valida o conteúdo', async (t) => {
  const srv = await subirServidor();
  t.after(() => srv.fechar());
  const api = (metodo, caminho, corpo, token) =>
    fetch(`${srv.url}/api/laboratorio${caminho}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: corpo && JSON.stringify(corpo),
    });

  assert.equal((await api('GET', '/tarefas')).status, 401);
  const { token } = await (await api('POST', '/login', { senha: PIN })).json();

  const invalida = await api('PUT', '/tarefas', { tarefas: [{ titulo: 'Sem opções' }] }, token);
  assert.equal(invalida.status, 400);
  assert.match((await invalida.json()).erro, /Tarefa 1/);

  const nova = { titulo: 'Copiar', instrucao: 'Aperte [Ctrl] + [C]', opcoes: ['Copia', 'Apaga'], correta: 'a', explicacao: 'Copia o selecionado.' };
  const salva = await (await api('PUT', '/tarefas', { tarefas: [nova] }, token)).json();
  assert.equal(salva.personalizadas, true);
  assert.equal(srv.laboratorio.servico.criarSala().tarefas.length, 1, 'novas salas usam as tarefas editadas');

  const padrao = await (await api('DELETE', '/tarefas', undefined, token)).json();
  assert.equal(padrao.tarefas.length, PADRAO.length);
});
