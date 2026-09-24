const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const modulo = (arquivo) => import(pathToFileURL(path.join(__dirname, '..', 'public/js/pages/horta/regras', arquivo)).href);

// Planos escritos de forma curta: 'andar' ou ['repita', 3, [...]] etc.
function plano(lista) {
  return lista.map((item) => {
    if (typeof item === 'string') return { tipo: item };
    const [tipo, ...resto] = item;
    if (tipo === 'repita') return { tipo, vezes: resto[0], corpo: plano(resto[1]) };
    if (tipo === 'repitaAte' || tipo === 'se') return { tipo, condicao: resto[0], corpo: plano(resto[1]) };
    if (tipo === 'seSenao') return { tipo, condicao: resto[0], corpo: plano(resto[1]), senao: plano(resto[2]) };
    throw new Error(tipo);
  });
}

// Uma solução de referência por fase (fica só aqui, fora do jogo)
const SOLUCOES = {
  '1-1': ['andar', 'andar', 'andar', 'andar', 'colher'],
  '1-2': ['andar', 'andar', 'direita', 'andar', 'andar', 'colher'],
  '1-3': ['andar', 'andar', 'colher', 'direita', 'andar', 'andar', 'esquerda', 'andar', 'andar', 'colher'],
  '1-4': ['andar', 'plantar', 'andar', 'andar', 'plantar', 'andar', 'direita', 'andar', 'plantar'],
  '1-5': ['andar', 'regar', 'andar', 'andar', 'colher', 'direita', 'andar', 'regar', 'andar', 'colher'],
  '2-1': [['repita', 6, ['andar', 'colher']]],
  '2-2': [['repita', 4, ['colher', 'andar', 'andar', 'andar', 'andar', 'direita']]],
  '2-3': [['repita', 4, ['colher', ['repita', 6, ['andar']], 'direita']]],
  '2-4': [['repita', 4, ['andar', 'esquerda', 'andar', 'direita', 'colher']]],
  '2-5': [['repita', 4, ['andar', 'esquerda', ['repita', 3, ['andar', 'colher']], 'direita', 'direita', ['repita', 3, ['andar']], 'esquerda']]],
  '3-1': [['repita', 6, ['andar', ['se', 'madura', ['colher']]]]],
  '3-2': [['repita', 6, ['andar', ['seSenao', 'sede', ['regar'], ['colher']]]]],
  '3-3': [['repita', 6, ['andar', ['se', 'vazia', ['plantar']], ['se', 'madura', ['colher']]]]],
  '3-4': [['repita', 4, ['andar', 'esquerda', ['repita', 3, ['andar', ['se', 'madura', ['colher']]]], 'direita', 'direita', ['repita', 3, ['andar']], 'esquerda']]],
  '4-1': [['repitaAte', 'bloqueio', ['andar', 'colher']]],
  '4-2': [['repitaAte', 'bloqueio', ['andar', ['se', 'madura', ['colher']]]]],
  '4-3': [['repitaAte', 'celeiro', [['seSenao', 'bloqueio', ['direita'], ['andar']]]]],
  '4-4': [['repitaAte', 'celeiro', [['se', 'madura', ['colher']], ['seSenao', 'bloqueio', ['direita'], ['andar']]]]],
};

test('toda fase tem solução que funciona em várias hortas sorteadas, dentro da meta e pegando as moedas', async () => {
  const { FASES, montarHortas, calcularEstrelas } = await modulo('fases.js');
  const { executarTudo } = await modulo('Interpretador.js');
  const { contarBlocos, copiarPlano } = await modulo('blocos.js');

  for (const fase of FASES) {
    const solucao = copiarPlano(plano(SOLUCOES[fase.id]), fase.blocos);
    assert.equal(contarBlocos(solucao), contarBlocos(plano(SOLUCOES[fase.id])), `${fase.id}: usa bloco não liberado`);
    for (const bloco of JSON.stringify(solucao).match(/"condicao":"(\w+)"/g) || []) {
      const cond = bloco.split(':')[1].replace(/"/g, '');
      assert.ok(fase.condicoes.includes(cond), `${fase.id}: condição ${cond} não liberada`);
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
