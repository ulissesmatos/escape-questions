const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const modulo = (arquivo) => import(pathToFileURL(path.join(__dirname, '..', 'public/js/pages/horta/regras', arquivo)).href);

// Planos escritos de forma curta: 'andar' ou ['repita', 3, [...]] etc.
let planoCurto;
const plano = (lista) => planoCurto(lista);
test.before(async () => {
  ({ planoCurto } = await modulo('blocos.js'));
});

test('toda fase tem solução que funciona em várias hortas sorteadas, dentro da meta e pegando as moedas', async () => {
  const { FASES, montarHortas, calcularEstrelas } = await modulo('fases.js');
  const { executarTudo } = await modulo('Interpretador.js');
  const { contarBlocos, copiarPlano } = await modulo('blocos.js');

  for (const fase of FASES) {
    const solucao = copiarPlano(plano(fase.solucao), fase.blocos);
    assert.equal(contarBlocos(solucao), contarBlocos(plano(fase.solucao)), `${fase.id}: usa bloco não liberado`);
    if (fase.memoria) assert.ok(contarBlocos(solucao) <= fase.memoria, `${fase.id}: a solução não cabe na memória`);
    assert.ok(fase.meta <= (fase.memoria || Infinity), `${fase.id}: meta maior que a memória`);
    for (const bloco of JSON.stringify(solucao).match(/"condicao":"(\w+)"/g) || []) {
      const cond = bloco.split(':')[1].replace(/"/g, '');
      assert.ok((fase.condicoes || []).includes(cond), `${fase.id}: condição ${cond} não liberada`);
    }
    for (let semente = 1; semente <= (fase.gerar ? 40 : 1); semente++) {
      const hortas = montarHortas(fase, semente);
      assert.equal(hortas.length, fase.variantes || 1, `${fase.id}: variantes`);
      let pegas = 0;
      let total = 0;
      for (const horta of hortas) {
        total += horta.metas.moedas;
        const resultado = executarTudo(solucao, horta);
        assert.deepEqual(resultado, { ok: true }, `${fase.id} semente ${semente}: ${resultado.mensagem}`);
        pegas += horta.moedasPegas;
      }
      assert.equal(calcularEstrelas(fase, { blocos: contarBlocos(solucao), moedasPegas: pegas, moedasTotal: total }), 3, fase.id);
    }
  }
});

test('nas hortas sorteadas um caminho decorado não resolve', async () => {
  const { FASES, montarHortas } = await modulo('fases.js');
  const { executarTudo } = await modulo('Interpretador.js');
  const colherTudo = plano([['repita', 6, ['andar', 'colher']]]);
  const fase = FASES.find((f) => f.id === '3-1');
  const resultado = executarTudo(colherTudo, montarHortas(fase, 7)[0]);
  assert.equal(resultado.ok, false);
  assert.match(resultado.mensagem, /verde/);
});

test('robô bate na cerca e na pedra, e erros param o plano no bloco certo', async () => {
  const { Horta } = await modulo('Horta.js');
  const { executar, executarTudo } = await modulo('Interpretador.js');
  const horta = Horta.deMapa({ mapa: ['.p', '..'], robo: [0, 0, 'direita'] });
  const p = plano(['andar']);
  const resultado = executarTudo(p, horta);
  assert.equal(resultado.ok, false);
  assert.equal(resultado.bloco, p[0].id);
  assert.match(resultado.mensagem, /pedra/);

  const cerca = Horta.deMapa({ mapa: ['..'], robo: [0, 0, 'esquerda'] });
  assert.match(executarTudo(plano(['andar']), cerca).mensagem, /cerca/);

  // eventos saem um por vez, na ordem
  const h = Horta.deMapa({ mapa: ['.m'], robo: [0, 0, 'direita'] });
  const eventos = [...executar(plano(['andar', 'colher']), h)];
  assert.deepEqual(eventos.map((e) => e.acao), ['andar', 'colher']);
  assert.equal(h.concluida(), true);
});

test('Repita até sem saída gasta a bateria em vez de travar', async () => {
  const { Horta } = await modulo('Horta.js');
  const { executarTudo } = await modulo('Interpretador.js');
  const horta = Horta.deMapa({ mapa: ['...c'], robo: [0, 0, 'direita'] });
  const resultado = executarTudo(plano([['repitaAte', 'celeiro', ['direita']]]), horta);
  assert.equal(resultado.motivo, 'bateria');
  assert.equal(executarTudo(plano([['repitaAte', 'celeiro', []]]), Horta.deMapa({ mapa: ['.c'], robo: [0, 0] })).motivo, 'bateria');
});

test('plano incompleto diz o que faltou', async () => {
  const { Horta } = await modulo('Horta.js');
  const { executarTudo } = await modulo('Interpretador.js');
  const horta = Horta.deMapa({ mapa: ['.mts'], robo: [0, 0, 'direita'] });
  const resultado = executarTudo(plano(['andar', 'colher']), horta);
  assert.equal(resultado.motivo, 'incompleto');
  assert.equal(resultado.mensagem, 'As ordens acabaram, mas ainda faltou plantar em 1 terra e regar 1 planta.');
});

test('plano salvo é conferido: tipos inválidos e blocos não liberados somem, números ficam no limite', async () => {
  const { copiarPlano, planoParaSalvar, contarBlocos } = await modulo('blocos.js');
  const salvo = [{ tipo: 'repita', vezes: 999, corpo: [{ tipo: 'andar' }, { tipo: 'voar' }, { tipo: 'regar' }] }, { tipo: 'se', condicao: 'xyz' }];
  const copia = copiarPlano(salvo, ['repita', 'andar', 'se']);
  assert.equal(copia[0].vezes, 12);
  assert.equal(copia[0].corpo.length, 1);
  assert.equal(copia[1].condicao, 'madura');
  assert.equal(contarBlocos(copia), 3);
  assert.deepEqual(planoParaSalvar(copia), [
    { tipo: 'repita', vezes: 12, corpo: [{ tipo: 'andar' }] },
    { tipo: 'se', condicao: 'madura', corpo: [] },
  ]);
});

/** Plano "sem Repita": a solução com cada Repita desenrolado (o que o aluno faz sem usar o bloco) */
function desenrolar(lista) {
  return lista.flatMap((b) => (b.tipo === 'repita' ? Array.from({ length: b.vezes }, () => desenrolar(b.corpo)).flat() : [b]));
}

test('mundos 2 e 3: sem Repita (ou só com um Repita) o plano não cabe na memória do Bip', async () => {
  const { FASES } = await modulo('fases.js');
  const { contarBlocos } = await modulo('blocos.js');
  for (const fase of FASES.filter((f) => f.mundo === 2 || f.mundo === 3)) {
    assert.ok(fase.memoria, `${fase.id}: sem memória`);
    const semRepita = desenrolar(plano(fase.solucao));
    assert.ok(contarBlocos(semRepita) > fase.memoria, `${fase.id}: dá para fazer sem Repita`);
  }
  // No mundo 3, desenrolar só o Repita de dentro também estoura a memória
  const umRepitaSo = (lista) => lista.map((b) => (b.tipo === 'repita' ? { ...b, corpo: desenrolar(b.corpo) } : b));
  for (const fase of FASES.filter((f) => f.mundo === 3 && f.id !== 'uma-coluna')) {
    assert.ok(contarBlocos(umRepitaSo(plano(fase.solucao))) > fase.memoria, `${fase.id}: dá para fazer com um Repita só`);
  }
});

test('plano inicial usa só blocos da fase e não resolve sozinho', async () => {
  const { FASES, montarHortas, planoInicialDaFase } = await modulo('fases.js');
  const { executarTudo } = await modulo('Interpretador.js');
  const { copiarPlano, contarBlocos } = await modulo('blocos.js');
  const comPlano = FASES.filter((f) => f.planoInicial);
  assert.ok(comPlano.length >= 2);
  for (const fase of comPlano) {
    const inicial = planoInicialDaFase(fase);
    assert.equal(contarBlocos(copiarPlano(inicial, fase.blocos)), contarBlocos(inicial), fase.id);
    assert.notDeepEqual(executarTudo(inicial, montarHortas(fase, 1)[0]), { ok: true }, `${fase.id}: já vem resolvido`);
  }
});

test('números das fases seguem a ordem dos mundos; ids não se repetem', async () => {
  const { FASES } = await modulo('fases.js');
  assert.equal(new Set(FASES.map((f) => f.id)).size, FASES.length);
  assert.deepEqual(FASES.filter((f) => f.mundo === 3).map((f) => f.rotulo), ['3-1', '3-2', '3-3', '3-4', '3-5', '3-6']);
  // Fases antigas mantêm o id (o progresso salvo dos alunos continua valendo)
  for (const id of ['2-1', '2-2', '2-3', '2-4', '2-5', '3-4', '4-4']) assert.ok(FASES.some((f) => f.id === id), id);
});

test('detector de repetição sugere o Repita e o Repita dentro do Repita', async () => {
  const { acharRepeticao, sugestaoDeRepita } = await modulo('padroes.js');
  const { copiarPlano } = await modulo('blocos.js');

  const andando = copiarPlano(plano(['andar', 'andar', 'andar', 'andar', 'colher']));
  const r1 = acharRepeticao(andando);
  assert.equal(r1.vezes, 4);
  assert.equal(r1.ids.length, 4);
  assert.match(sugestaoDeRepita(r1), /4 blocos "Ande 1 casa" seguidos/);

  const pares = copiarPlano(plano(['andar', 'colher', 'andar', 'colher', 'andar', 'colher']));
  assert.deepEqual([acharRepeticao(pares).vezes, acharRepeticao(pares).pedaco.length], [3, 2]);

  // Dois lados do canteiro feitos com Repita, um depois do outro: sugere o Repita de fora
  const lados = copiarPlano(plano([
    'colher', ['repita', 4, ['andar']], 'direita',
    'colher', ['repita', 4, ['andar']], 'direita',
    'colher', ['repita', 4, ['andar']], 'direita',
  ]));
  const r3 = acharRepeticao(lados);
  assert.equal(r3.vezes, 3);
  assert.equal(r3.temRepita, true);
  assert.match(sugestaoDeRepita(r3), /Repita dentro de outro Repita/);

  // Dentro de um Repita também procura; e não reclama de repetição pequena
  assert.equal(acharRepeticao(copiarPlano(plano([['repita', 4, ['andar', 'andar', 'andar', 'colher']]]))).vezes, 3);
  assert.equal(acharRepeticao(copiarPlano(plano(['andar', 'andar', 'colher']))), null);
  assert.equal(acharRepeticao(copiarPlano(plano([['repita', 6, ['andar', 'colher']]]))), null);
});

test('esqueleto mostra só a forma da solução (Repita e Se), sem as ações', async () => {
  const { esqueleto } = await modulo('padroes.js');
  assert.deepEqual(esqueleto(plano([['repita', 4, ['colher', ['repita', 6, ['andar']], 'direita']]])), [
    { tipo: 'repita', vezes: 4, corpo: [{ tipo: 'repita', vezes: 6, corpo: [] }] },
  ]);
  assert.deepEqual(esqueleto(plano(['andar', 'colher'])), []);
});
