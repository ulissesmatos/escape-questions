const test = require('node:test');
const assert = require('node:assert/strict');

const { Sala, ErroSala } = require('../src/modules/laboratorio/Sala');
const { validarTarefas } = require('../src/modules/laboratorio/tarefas');
const { nomeOfensivo, validarNome } = require('../src/modules/laboratorio/nomes');
const { LaboratorioService } = require('../src/modules/laboratorio/LaboratorioService');
const { CatalogoDeTarefas } = require('../src/modules/laboratorio/tarefas');
const { RepositorioEmMemoria } = require('../src/modules/laboratorio/repositorios');
const PADRAO = require('../src/modules/laboratorio/tasks.json');

const TAREFAS = validarTarefas(PADRAO);
const REGISTRO = 'As janelas sumiram e apareceu a área de trabalho.';

function novaSala(opcoes = {}) {
  return new Sala({ codigo: 'TEST', tarefas: TAREFAS, agora: 0, ...opcoes });
}

/** Aluno conectado (conta como presente para fechar a rodada) */
function entrar(sala, nome, agora = 0) {
  const aluno = sala.entrar(nome, agora);
  aluno.conexoes = 1;
  return aluno;
}

test('tasks.json tem as 10 tarefas válidas e todas com resposta correta', () => {
  assert.equal(TAREFAS.length, 10);
  for (const t of TAREFAS) assert.ok(t.opcoes[['a', 'b', 'c', 'd'].indexOf(t.correta)]);
});

test('o aluno nunca recebe a resposta certa antes de registrar', () => {
  const sala = novaSala();
  const ana = entrar(sala, 'Ana');
  sala.iniciar(0);
  const tarefa = TAREFAS[0];

  const antes = JSON.stringify(sala.visaoAluno(ana.id, 1000));
  assert.ok(!antes.includes(tarefa.explicacao), 'explicação vazou');
  assert.ok(!antes.includes('"correta"'), 'campo correta vazou');

  sala.apostar(ana.id, tarefa.id, 'a', 2000);
  const depoisDaAposta = sala.visaoAluno(ana.id, 2000);
  assert.equal(depoisDaAposta.tarefas[0].revelacao, null, 'apostar não revela');

  const revelacao = sala.registrar(ana.id, tarefa.id, REGISTRO, 3000);
  assert.equal(revelacao.correta, 'b');
  assert.equal(revelacao.acertou, false);
  assert.equal(sala.visaoAluno(ana.id, 3000).tarefas[0].revelacao.correta, 'b');
});

test('aposta trava e não pode mudar; registro exige 15 letras', () => {
  const sala = novaSala();
  const ana = entrar(sala, 'Ana');
  sala.iniciar(0);
  const id = TAREFAS[0].id;
  assert.throws(() => sala.registrar(ana.id, id, REGISTRO, 10), /aposta/);
  sala.apostar(ana.id, id, 'b', 10);
  assert.throws(() => sala.apostar(ana.id, id, 'c', 20), /travada/);
  assert.throws(() => sala.registrar(ana.id, id, 'curto demais', 30), /15/);
  assert.throws(() => sala.registrar(ana.id, id, '              x', 30), /15/, 'espaços não contam');
  sala.registrar(ana.id, id, REGISTRO, 40);
  assert.throws(() => sala.registrar(ana.id, id, REGISTRO, 50), /já registrou/);
});

test('pontuação: aposta, conclusão, velocidade e explicação aprovada', () => {
  const sala = novaSala({ modo: 'livre' });
  const alunos = ['Ana', 'Bia', 'Caio', 'Duda'].map((n) => entrar(sala, n));
  sala.iniciar(0);
  const id = TAREFAS[0].id;
  alunos.forEach((a, i) => {
    sala.apostar(a.id, id, i === 3 ? 'a' : 'b', 100);
    sala.registrar(a.id, id, REGISTRO, 1000 * (i + 1));
  });
  const pontos = alunos.map((a) => sala.resumo(a).pontos);
  // 10 aposta + 10 conclusão + 5/3/1/0 de velocidade; a Duda errou a aposta
  assert.deepEqual(pontos, [25, 23, 21, 10]);

  sala.explicar(alunos[3].id, id, 'Porque o atalho minimiza tudo.', 5000);
  assert.equal(sala.resumo(alunos[3]).pontos, 10, 'explicação pendente não vale ponto');
  sala.avaliarExplicacao(alunos[3].id, id, true);
  assert.equal(sala.resumo(alunos[3]).pontos, 15);
  sala.avaliarExplicacao(alunos[3].id, id, false);
  assert.equal(sala.resumo(alunos[3]).pontos, 10, 'professor pode voltar atrás');
});

test('desempate: empatados em pontos, ganha quem acertou mais apostas e depois quem foi mais rápido', () => {
  const sala = novaSala({ modo: 'livre' });
  sala.iniciar(0);
  const t = TAREFAS[0];
  const [eva, f1, f2, ana, caio] = ['Eva', 'Fabi', 'Gui', 'Ana', 'Caio'].map((n) => entrar(sala, n));
  // [aluno, aposta, terminou em (ms)]: todos abrem a tarefa no instante 0
  for (const [aluno, letra, fim] of [[eva, 'a', 1000], [f1, 'b', 2000], [f2, 'b', 3000], [ana, 'b', 5000], [caio, 'b', 9000]]) {
    sala.abrir(aluno.id, t.id, 0);
    sala.apostar(aluno.id, t.id, letra, 0);
    sala.registrar(aluno.id, t.id, REGISTRO, fim);
  }
  sala.explicar(eva.id, t.id, 'Porque o Windows esconde as janelas.', 9500);
  sala.avaliarExplicacao(eva.id, t.id, true);

  const ranking = sala.ranking(10000);
  // Eva: 0 aposta + 10 + 5 (1ª) + 5 explicação = 20 | Ana e Caio: 10 + 10 + 0 = 20
  assert.deepEqual(ranking.map((r) => [r.nome, r.pontos]), [['Fabi', 23], ['Gui', 21], ['Ana', 20], ['Caio', 20], ['Eva', 20]]);
  assert.equal(ranking.find((r) => r.nome === 'Ana').tempoTotalMs, 5000);
});

test('desempate com mesmos pontos: apostas certas e depois tempo', () => {
  const sala = novaSala({ modo: 'livre' });
  sala.iniciar(0);
  const [a, b, c] = ['Ana', 'Bia', 'Caio'].map((n) => entrar(sala, n));
  // Pontos montados à mão para isolar o critério de desempate
  sala.resumo = (aluno) => ({
    [a.id]: { pontos: 50, apostasCertas: 2, concluidas: 3, tempoTotalMs: 90000 },
    [b.id]: { pontos: 50, apostasCertas: 3, concluidas: 3, tempoTotalMs: 99000 },
    [c.id]: { pontos: 50, apostasCertas: 2, concluidas: 3, tempoTotalMs: 60000 },
  })[aluno.id];
  assert.deepEqual(sala.ranking(0).map((r) => r.nome), ['Bia', 'Caio', 'Ana']);
});

test('rodadas: cronômetro fecha a tarefa, pausa congela e o tempo pausado não conta', () => {
  const sala = novaSala({ duracaoSeg: 60 });
  const ana = entrar(sala, 'Ana');
  entrar(sala, 'Bia');
  sala.iniciar(0);
  assert.equal(sala.fase, 'tarefa');
  const id = TAREFAS[0].id;

  sala.pausar(10000);
  assert.throws(() => sala.apostar(ana.id, id, 'b', 15000), /pausada/);
  assert.equal(sala.verificarTempo(500000), false, 'pausado não acaba');
  sala.retomar(40000); // ficou 30 s pausado → o fim passa de 60 s para 90 s

  sala.apostar(ana.id, id, 'b', 41000);
  sala.registrar(ana.id, id, REGISTRO, 50000);
  assert.equal(ana.respostas[id].tempoMs, 20000, '50 s menos 30 s pausados');

  assert.equal(sala.verificarTempo(89000), false);
  assert.equal(sala.verificarTempo(90000), true);
  assert.equal(sala.fase, 'parcial');
  assert.throws(() => sala.apostar(ana.id, TAREFAS[1].id, 'a', 91000), /não está liberada/);

  sala.proxima(100000);
  assert.equal(sala.indice, 1);
  assert.equal(sala.fase, 'tarefa');
});

test('rodadas: termina sozinha quando todos os presentes registram; quem caiu há pouco ainda conta', () => {
  const sala = novaSala();
  const ana = entrar(sala, 'Ana');
  const bia = entrar(sala, 'Bia');
  const caio = sala.entrar('Caio', 0); // nunca conectou: não segura a rodada
  caio.desconectouEm = -60000;
  sala.iniciar(0);
  const id = TAREFAS[0].id;
  for (const a of [ana, bia]) sala.apostar(a.id, id, 'b', 100);
  sala.registrar(ana.id, id, REGISTRO, 1000);

  bia.conexoes = 0;
  bia.desconectouEm = 1500; // recarregou a página
  assert.equal(sala.todosConcluiram(2000), false, 'Bia caiu há 0,5 s: ainda conta como presente');
  assert.equal(sala.todosConcluiram(60000), true, 'depois da tolerância, não segura mais a rodada');
});

test('aluno atrasado recebe a tarefa atual; aluno não vê tarefas futuras', () => {
  const sala = novaSala();
  entrar(sala, 'Ana');
  sala.iniciar(0);
  sala.proxima(1000);
  sala.proxima(2000); // tarefa 3 liberada
  const atrasado = entrar(sala, 'Zeca', 2500);
  const visao = sala.visaoAluno(atrasado.id, 2500);
  assert.equal(visao.tarefas.length, 3);
  assert.equal(visao.tarefas[2].aberta, true);
  assert.equal(visao.tarefas[0].aberta, false);
  assert.ok(visao.tarefas[0].revelacao, 'tarefas já fechadas mostram a resposta');
  assert.equal(visao.tarefas[2].revelacao, null);
});

test('nomes: repetidos (sem acento e maiúsculas) e ofensivos são bloqueados', () => {
  const sala = novaSala();
  sala.entrar('Ana Júlia');
  assert.throws(() => sala.entrar('ana   julia'), ErroSala);
  assert.throws(() => sala.entrar('P0rr4'), /não é permitido/);
  assert.throws(() => sala.entrar('a'), /2 letras/);
  for (const ok of ['Lucas', 'Caputo', 'Dickson', 'Nazira', 'Cauã', 'João Pedro', 'Maria Eduarda', 'Computador']) {
    assert.equal(nomeOfensivo(ok), false, `${ok} foi bloqueado`);
    assert.ok(validarNome(ok));
  }
  for (const ruim of ['cu', 'Burro', 'vai tnc', 'caralhoooo', 'idiota123', 'Arrombado']) {
    assert.equal(nomeOfensivo(ruim), true, `${ruim} passou`);
  }
});

test('reconexão pelo token mantém os pontos; renomear não deixa nome repetido', () => {
  const sala = novaSala({ modo: 'livre' });
  const ana = entrar(sala, 'Ana');
  entrar(sala, 'Bia');
  sala.iniciar(0);
  const id = TAREFAS[0].id;
  sala.apostar(ana.id, id, 'b', 10);
  sala.registrar(ana.id, id, REGISTRO, 20);

  const restaurada = Sala.deJSON(JSON.parse(JSON.stringify(sala.paraJSON())));
  const deNovo = restaurada.porToken(ana.token);
  assert.equal(deNovo.id, ana.id);
  assert.equal(restaurada.resumo(deNovo).pontos, 25);
  assert.equal(restaurada.porToken('token-falso'), null);
  assert.throws(() => restaurada.renomear(ana.id, 'BIA'), /Já tem alguém/);
});

test('destaques: no máximo 3 e só registros enviados', () => {
  const sala = novaSala({ modo: 'livre' });
  sala.iniciar(0);
  const id = TAREFAS[0].id;
  const alunos = ['Ana', 'Bia', 'Caio', 'Duda'].map((n) => {
    const a = entrar(sala, n);
    sala.apostar(a.id, id, 'b', 1);
    sala.registrar(a.id, id, REGISTRO, 2);
    return a;
  });
  assert.throws(() => sala.mostrarDestaques(true), /Marque/);
  alunos.slice(0, 3).forEach((a) => sala.alternarDestaque(a.id, id));
  assert.throws(() => sala.alternarDestaque(alunos[3].id, id), /no máximo 3/);
  sala.mostrarDestaques(true);
  assert.equal(sala.visaoTelao(3).destaques.length, 3);
  sala.expulsar(alunos[0].id);
  assert.equal(sala.visaoTelao(3).destaques.length, 2, 'expulso sai dos destaques');
});

test('serviço: código de 4 letras, salva no repositório e recupera depois de reiniciar', async () => {
  let agora = 1000;
  const repositorio = new RepositorioEmMemoria();
  const servico = new LaboratorioService({ catalogo: new CatalogoDeTarefas({ repositorio }), repositorio, relogio: () => agora });
  await servico.carregar();
  const sala = servico.criarSala({ modo: 'rodadas', duracaoMin: 1, tarefaIds: [TAREFAS[0].id, TAREFAS[1].id] });
  assert.match(sala.codigo, /^[A-HJ-NP-Z]{4}$/);
  assert.equal(sala.tarefas.length, 2);
  servico.alterar(sala.codigo, (s, t) => s.entrar('Ana', t));
  servico.alterar(sala.codigo, (s, t) => s.iniciar(t));

  agora += 61000;
  await servico.tick(); // acabou o tempo → parcial, e salva
  assert.equal(sala.fase, 'parcial');

  const outro = new LaboratorioService({ catalogo: new CatalogoDeTarefas({ repositorio }), repositorio, relogio: () => agora });
  await outro.carregar();
  const recuperada = outro.sala(sala.codigo.toLowerCase());
  assert.equal(recuperada.fase, 'parcial');
  assert.equal(recuperada.alunos.size, 1);

  await outro.fecharSala(sala.codigo);
  assert.equal((await repositorio.carregarSalas()).length, 0);
});

test('editor de tarefas: valida e avisa o professor do que falta', () => {
  assert.throws(() => validarTarefas([]), /pelo menos uma/);
  const base = { titulo: 'X', instrucao: 'Faça', opcoes: ['a', 'b', 'c'], correta: 'b', explicacao: 'Porque sim.' };
  assert.throws(() => validarTarefas([{ ...base, correta: 'd' }]), /Tarefa 1: marque/);
  assert.throws(() => validarTarefas([{ ...base, opcoes: ['só uma'] }]), /2 a 4/);
  const [t1, t2] = validarTarefas([base, base]);
  assert.notEqual(t1.id, t2.id, 'ids repetidos são corrigidos');
  assert.equal(t1.pergunta, 'O que vai acontecer?');
});
