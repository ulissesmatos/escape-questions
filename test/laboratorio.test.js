const test = require('node:test');
const assert = require('node:assert/strict');

const { Sala, ErroSala } = require('../src/modules/laboratorio/Sala');
const { validarTarefas, sortearTarefas, CatalogoDeTarefas, CATEGORIAS } = require('../src/modules/laboratorio/tarefas');
const Random = require('../src/shared/Random');
const { nomeOfensivo, validarNome } = require('../src/modules/laboratorio/nomes');
const { LaboratorioService } = require('../src/modules/laboratorio/LaboratorioService');
const { RepositorioEmMemoria } = require('../src/modules/laboratorio/repositorios');
const PADRAO = require('../src/modules/laboratorio/tasks.json');

const TAREFAS = validarTarefas(PADRAO);
const T1 = TAREFAS[0]; // tempo mínimo de 10 s, correta "a"
const ERRADA = 'b';
const DEPOIS = T1.tempoMinimo * 1000; // instante em que já dá para responder (tarefa liberada em 0)

function novaSala(opcoes = {}) {
  return new Sala({ codigo: 'TEST', tarefas: TAREFAS, agora: 0, ...opcoes });
}

/** Aluno conectado (conta como presente para fechar a rodada) */
function entrar(sala, nome, agora = 0) {
  const aluno = sala.entrar(nome, agora);
  aluno.conexoes = 1;
  return aluno;
}

test('tasks.json tem 50+ tarefas válidas, em todos os temas, com resposta certa e tempo mínimo', () => {
  assert.ok(TAREFAS.length >= 50, `só ${TAREFAS.length} tarefas`);
  for (const t of TAREFAS) {
    assert.ok(t.opcoes[['a', 'b', 'c', 'd'].indexOf(t.correta)]);
    assert.ok(t.tempoMinimo >= 10, `${t.id} sem tempo mínimo`);
    assert.equal(PADRAO.find((p) => p.id === t.id).categoria, t.categoria, `${t.id} com tema inválido`);
  }
  for (const c of CATEGORIAS) assert.ok(TAREFAS.filter((t) => t.categoria === c.id).length >= 8, `tema ${c.id} com poucas perguntas`);
});

test('sorteio: filtra o tema e o misturado alterna os temas', () => {
  const random = new Random(42);
  const word = sortearTarefas(TAREFAS, { categoria: 'word', quantidade: 5, random });
  assert.equal(word.tarefas.length, 5);
  assert.ok(word.tarefas.every((t) => t.categoria === 'word'));

  const misturado = sortearTarefas(TAREFAS, { categoria: 'misturado', quantidade: 10, random }).tarefas;
  assert.equal(new Set(misturado.map((t) => t.id)).size, 10);
  assert.equal(new Set(misturado.slice(0, CATEGORIAS.length).map((t) => t.categoria)).size, CATEGORIAS.length, 'as primeiras perguntas devem ser de temas diferentes');

  assert.equal(sortearTarefas(TAREFAS, { categoria: 'pesquisa', quantidade: 99, random }).tarefas.length, 8, 'não passa do que existe no tema');
});

test('sorteio: não repete o que a sala já viu e, quando acaba, recomeça pelas mais antigas', () => {
  const random = new Random(7);
  const pesquisa = TAREFAS.filter((t) => t.categoria === 'pesquisa').map((t) => t.id); // 8 perguntas
  const p1 = sortearTarefas(TAREFAS, { categoria: 'pesquisa', quantidade: 3, random });
  const p2 = sortearTarefas(TAREFAS, { categoria: 'pesquisa', quantidade: 3, evitar: p1.tarefas.map((t) => t.id), random });
  const vistas = [...p1.tarefas, ...p2.tarefas].map((t) => t.id);
  assert.equal(new Set(vistas).size, 6, 'segunda partida sem repetir');
  assert.equal(p2.recomecou, false);

  const p3 = sortearTarefas(TAREFAS, { categoria: 'pesquisa', quantidade: 3, evitar: vistas, random });
  assert.equal(p3.recomecou, true);
  const ids3 = p3.tarefas.map((t) => t.id);
  const sobravam = pesquisa.filter((id) => !vistas.includes(id));
  assert.ok(sobravam.every((id) => ids3.includes(id)), 'as 2 que faltavam entram');
  assert.ok(p1.tarefas.some((t) => ids3.includes(t.id)), 'completa com uma da 1ª partida');
  assert.ok(!p2.tarefas.some((t) => ids3.includes(t.id)), 'não repete a partida que acabou de terminar');
});

test('o aluno nunca recebe a resposta certa antes de responder', () => {
  const sala = novaSala();
  const ana = entrar(sala, 'Ana');
  sala.iniciar(0);

  const antes = JSON.stringify(sala.visaoAluno(ana.id, 1000));
  assert.ok(!antes.includes(T1.explicacao), 'explicação vazou');
  assert.ok(!antes.includes('"correta"'), 'campo correta vazou');

  const revelacao = sala.responder(ana.id, T1.id, ERRADA, DEPOIS);
  assert.equal(revelacao.correta, T1.correta);
  assert.equal(revelacao.acertou, false);
  assert.equal(sala.visaoAluno(ana.id, DEPOIS).tarefas[0].revelacao.correta, T1.correta);
});

test('opções embaralhadas por aluno, sempre na mesma ordem para o mesmo aluno', () => {
  const sala = novaSala();
  const alunos = ['Ana', 'Bia', 'Caio', 'Duda', 'Eva', 'Fabi'].map((n) => entrar(sala, n));
  sala.iniciar(0);
  const ordens = alunos.map((a) => sala.visaoAluno(a.id, 0).tarefas[0].opcoes.map((o) => o.letra).join(''));
  assert.ok(new Set(ordens).size > 1, 'todos receberam a mesma ordem');
  for (const ordem of ordens) assert.equal([...ordem].sort().join(''), 'abcd');
  assert.equal(sala.visaoAluno(alunos[0].id, 5000).tarefas[0].opcoes.map((o) => o.letra).join(''), ordens[0], 'recarregar não muda a ordem');
});

test('trava de tempo: só responde depois do tempo mínimo (sem contar a pausa), e uma vez só', () => {
  const sala = novaSala();
  const ana = entrar(sala, 'Ana');
  sala.iniciar(0);
  assert.equal(sala.visaoAluno(ana.id, 0).tarefas[0].liberaEm, DEPOIS);

  assert.throws(() => sala.responder(ana.id, T1.id, 'a', 3000), /Faça o experimento primeiro! Faltam 7 segundos/);

  sala.pausar(4000);
  sala.retomar(34000); // 30 s pausados não contam como tempo de experimento
  assert.throws(() => sala.responder(ana.id, T1.id, 'a', 35000), /Faltam 5 segundos/);
  assert.equal(sala.visaoAluno(ana.id, 35000).tarefas[0].liberaEm, 40000);

  sala.responder(ana.id, T1.id, 'a', 40000);
  assert.equal(ana.respostas[T1.id].tempoMs, 10000);
  assert.throws(() => sala.responder(ana.id, T1.id, 'b', 41000), /já respondeu/);
});

test('pontuação: +10 acerto, +2 quem erra, velocidade só entre quem acertou', () => {
  const sala = novaSala({ modo: 'livre' });
  sala.iniciar(0);
  const alunos = ['Ana', 'Bia', 'Caio', 'Duda', 'Eva'].map((n) => entrar(sala, n));
  alunos.forEach((a) => sala.abrir(a.id, T1.id, 0));
  // Ana erra primeiro (não ganha bônus); depois Bia, Caio, Duda e Eva acertam nessa ordem
  sala.responder(alunos[0].id, T1.id, ERRADA, DEPOIS);
  alunos.slice(1).forEach((a, i) => sala.responder(a.id, T1.id, 'a', DEPOIS + 1000 * (i + 1)));
  assert.deepEqual(alunos.map((a) => sala.resumo(a).pontos), [2, 15, 13, 11, 10]);
});

test('desempate: mais acertos, depois menor tempo total', () => {
  const sala = novaSala({ modo: 'livre' });
  sala.iniciar(0);
  const [a, b, c] = ['Ana', 'Bia', 'Caio'].map((n) => entrar(sala, n));
  // Pontos montados à mão para isolar o critério de desempate
  sala.resumo = (aluno) => ({
    [a.id]: { pontos: 24, acertos: 2, respondidas: 3, tempoTotalMs: 90000 },
    [b.id]: { pontos: 24, acertos: 3, respondidas: 3, tempoTotalMs: 99000 },
    [c.id]: { pontos: 24, acertos: 2, respondidas: 3, tempoTotalMs: 60000 },
  })[aluno.id];
  assert.deepEqual(sala.ranking(0).map((r) => r.nome), ['Bia', 'Caio', 'Ana']);
});

test('empate natural em pontos é decidido pelo tempo', () => {
  const sala = novaSala({ modo: 'livre' });
  sala.iniciar(0);
  const alunos = ['Fabi', 'Gui', 'Hugo', 'Ana', 'Caio'].map((n) => entrar(sala, n));
  alunos.forEach((a) => sala.abrir(a.id, T1.id, 0));
  // Os 3 primeiros levam o bônus; Ana e Caio acertam depois (10 cada), Ana mais rápida
  [15000, 16000, 17000, 20000, 30000].forEach((quando, i) => sala.responder(alunos[i].id, T1.id, 'a', quando));
  assert.deepEqual(sala.ranking(40000).map((r) => [r.nome, r.pontos]), [['Fabi', 15], ['Gui', 13], ['Hugo', 11], ['Ana', 10], ['Caio', 10]]);
});

test('rodadas: cronômetro fecha a tarefa e a próxima é liberada', () => {
  const sala = novaSala({ duracaoSeg: 60 });
  const ana = entrar(sala, 'Ana');
  entrar(sala, 'Bia');
  sala.iniciar(0);
  sala.pausar(10000);
  assert.equal(sala.verificarTempo(500000), false, 'pausado não acaba');
  sala.retomar(40000); // o fim passa de 60 s para 90 s
  assert.equal(sala.verificarTempo(89000), false);
  assert.equal(sala.verificarTempo(90000), true);
  assert.equal(sala.fase, 'parcial');
  assert.throws(() => sala.responder(ana.id, TAREFAS[1].id, 'a', 91000), /não está liberada/);
  sala.proxima(100000);
  assert.equal(sala.indice, 1);
  assert.equal(sala.fase, 'tarefa');
});

test('rodadas: termina sozinha quando todos os presentes respondem; quem caiu há pouco ainda conta', () => {
  const sala = novaSala();
  const ana = entrar(sala, 'Ana');
  const bia = entrar(sala, 'Bia');
  const caio = sala.entrar('Caio', 0); // nunca conectou: não segura a rodada
  caio.desconectouEm = -60000;
  sala.iniciar(0);
  sala.responder(ana.id, T1.id, 'a', DEPOIS);

  bia.conexoes = 0;
  bia.desconectouEm = DEPOIS + 500; // recarregou a página
  assert.equal(sala.todosConcluiram(DEPOIS + 1000), false, 'Bia caiu há 0,5 s: ainda conta como presente');
  assert.equal(sala.todosConcluiram(DEPOIS + 60000), true, 'depois da tolerância, não segura mais a rodada');
});

test('aluno atrasado recebe a tarefa atual e o tempo mínimo conta a partir da entrada dele', () => {
  const sala = novaSala();
  entrar(sala, 'Ana');
  sala.iniciar(0);
  sala.proxima(1000);
  sala.proxima(2000); // tarefa 3 liberada
  const atrasado = entrar(sala, 'Zeca', 5000);
  const visao = sala.visaoAluno(atrasado.id, 5000);
  assert.equal(visao.tarefas.length, 3, 'não vê tarefas futuras');
  assert.equal(visao.tarefas[2].aberta, true);
  assert.equal(visao.tarefas[0].aberta, false);
  assert.ok(visao.tarefas[0].revelacao, 'tarefas já fechadas mostram a resposta');
  assert.equal(visao.tarefas[2].revelacao, null);
  assert.equal(visao.tarefas[2].liberaEm, 5000 + TAREFAS[2].tempoMinimo * 1000);
});

test('modo livre: o tempo mínimo começa quando o aluno abre a tarefa', () => {
  const sala = novaSala({ modo: 'livre' });
  const ana = entrar(sala, 'Ana');
  sala.iniciar(0);
  assert.equal(sala.visaoAluno(ana.id, 0).tarefas[1].liberaEm, null);
  assert.throws(() => sala.responder(ana.id, TAREFAS[1].id, 'a', 50000), /Faça o experimento/, 'sem abrir, não pula a espera');
  // Tentar responder sem abrir já começa a contar
  sala.responder(ana.id, TAREFAS[1].id, 'a', 50000 + TAREFAS[1].tempoMinimo * 1000);
  sala.abrir(ana.id, TAREFAS[2].id, 100000);
  assert.equal(sala.visaoAluno(ana.id, 100000).tarefas[2].liberaEm, 100000 + TAREFAS[2].tempoMinimo * 1000);
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
  const sala = novaSala();
  const ana = entrar(sala, 'Ana');
  entrar(sala, 'Bia');
  sala.iniciar(0);
  sala.responder(ana.id, T1.id, 'a', DEPOIS);

  const restaurada = Sala.deJSON(JSON.parse(JSON.stringify(sala.paraJSON())));
  const deNovo = restaurada.porToken(ana.token);
  assert.equal(deNovo.id, ana.id);
  assert.equal(restaurada.resumo(deNovo).pontos, 15);
  assert.equal(restaurada.porToken('token-falso'), null);
  assert.throws(() => restaurada.renomear(ana.id, 'BIA'), /Já tem alguém/);
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

test('nova partida: mesmos alunos, pontos zerados, perguntas novas do mesmo tema', async () => {
  const repositorio = new RepositorioEmMemoria();
  const servico = new LaboratorioService({ catalogo: new CatalogoDeTarefas({ repositorio }), repositorio, random: new Random(3) });
  await servico.carregar();
  const sala = servico.criarSala({ modo: 'livre', categoria: 'word', quantidade: 4 });
  assert.equal(sala.categoria, 'word');
  assert.ok(sala.tarefas.every((t) => t.categoria === 'word'));
  const ana = entrar(sala, 'Ana');
  sala.iniciar(0);
  sala.abrir(ana.id, sala.tarefas[0].id, 0);
  sala.responder(ana.id, sala.tarefas[0].id, sala.tarefas[0].correta, 60000);
  assert.ok(sala.resumo(ana).pontos > 0);

  assert.throws(() => servico.novaPartida(sala.codigo), /Termine a partida/);
  sala.finalizar(70000);
  const primeira = sala.tarefas.map((t) => t.id);
  const { recomecou } = servico.novaPartida(sala.codigo);
  assert.equal(recomecou, false);
  assert.equal(sala.partida, 2);
  assert.equal(sala.fase, 'espera');
  assert.equal(sala.tarefas.length, 4);
  assert.ok(sala.tarefas.every((t) => t.categoria === 'word' && !primeira.includes(t.id)), 'perguntas novas, mesmo tema');
  assert.equal(sala.alunos.size, 1, 'os alunos continuam na sala');
  assert.equal(sala.resumo(ana).pontos, 0, 'pontos zerados');

  // 10 perguntas de Word: a 3ª partida de 4 precisa recomeçar a lista
  sala.finalizar(80000);
  assert.equal(servico.novaPartida(sala.codigo).recomecou, true);
});

test('editor de tarefas: valida e avisa o professor do que falta', () => {
  assert.throws(() => validarTarefas([]), /pelo menos uma/);
  const base = { titulo: 'X', instrucao: 'Faça', opcoes: ['a', 'b', 'c'], correta: 'b', explicacao: 'Porque sim.' };
  assert.throws(() => validarTarefas([{ ...base, correta: 'd' }]), /Tarefa 1: marque/);
  assert.throws(() => validarTarefas([{ ...base, opcoes: ['só uma'] }]), /2 a 4/);
  const [t1, t2] = validarTarefas([base, { ...base, tempoMinimo: 9999 }]);
  assert.notEqual(t1.id, t2.id, 'ids repetidos são corrigidos');
  assert.equal(t1.pergunta, 'O que aconteceu?');
  assert.equal(t1.tempoMinimo, 15, 'tempo mínimo padrão');
  assert.equal(t2.tempoMinimo, 300, 'tempo mínimo tem limite');
});
