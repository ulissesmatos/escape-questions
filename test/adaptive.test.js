const test = require('node:test');
const assert = require('node:assert/strict');

const AdaptiveEngine = require('../src/modules/hardware/AdaptiveEngine');
const GuessGuard = require('../src/modules/hardware/GuessGuard');
const Random = require('../src/shared/Random');

const motor = new AdaptiveEngine();
const guarda = new GuessGuard();

function simular(perfil, tentativas) {
  let estado = { habilidade: AdaptiveEngine.INICIAL, sequenciaAcertos: 0, sequenciaErros: 0, ...perfil };
  for (const t of tentativas) estado = { ...estado, ...motor.atualizar(estado, t) };
  return estado;
}

test('acertos rápidos em sequência sobem a dificuldade', () => {
  const tentativa = { correta: true, dificuldade: 2, tempoMs: 5000, tempoMinimoMs: 3000 };
  const final = simular({}, Array(5).fill(tentativa));
  assert.ok(final.habilidade >= 4, `habilidade ficou em ${final.habilidade}`);
});

test('acertar devagar também sobe, mas menos que acertar rápido', () => {
  const rapido = simular({}, Array(3).fill({ correta: true, dificuldade: 2, tempoMs: 4000, tempoMinimoMs: 3000 }));
  const devagar = simular({}, Array(3).fill({ correta: true, dificuldade: 2, tempoMs: 60000, tempoMinimoMs: 3000 }));
  assert.ok(devagar.habilidade > AdaptiveEngine.INICIAL);
  assert.ok(rapido.habilidade > devagar.habilidade);
});

test('erros seguidos baixam a dificuldade até o mínimo', () => {
  // A cada rodada a pergunta vem na dificuldade que o motor escolheria
  let estado = { habilidade: 4, sequenciaAcertos: 0, sequenciaErros: 0 };
  for (let i = 0; i < 8; i++) {
    const dificuldade = motor.dificuldadeAlvo(estado.habilidade);
    estado = { ...estado, ...motor.atualizar(estado, { correta: false, dificuldade, tempoMs: 30000, tempoMinimoMs: 3000 }) };
  }
  assert.equal(estado.habilidade, AdaptiveEngine.MIN);
});

test('errar pergunta fácil pesa mais que errar pergunta difícil', () => {
  const facil = motor.atualizar({ habilidade: 3 }, { correta: false, dificuldade: 1 });
  const dificil = motor.atualizar({ habilidade: 3 }, { correta: false, dificuldade: 5 });
  assert.ok(facil.delta < dificil.delta);
});

test('escolhe pergunta perto da habilidade e evita repetir a última', () => {
  const candidatas = [1, 2, 3, 4, 5].map((d) => ({ id: d, dificuldade: d }));
  const rng = new Random(1);
  assert.equal(motor.escolherQuestao(candidatas, { habilidade: 4.2, rng }).dificuldade, 4);
  const semRepetir = motor.escolherQuestao(candidatas, { habilidade: 4.2, ultimaQuestaoId: 4, rng });
  assert.notEqual(semRepetir.id, 4);
});

test('acerto rápido demais vale para quem não chutou antes, mas não para quem vem chutando', () => {
  const agora = new Date();
  const base = { correta: true, tempoMs: 800, tempoMinimoMs: 3000 };
  const leitor = [{ resultado: 'correta', tempoMs: 4000, tempoMinimoMs: 3000, criadoEm: agora }];
  const chutador = [{ resultado: 'errada', tempoMs: 700, tempoMinimoMs: 3000, criadoEm: agora }];

  assert.deepEqual(guarda.classificar({ ...base, anteriores: leitor }), { resultado: 'correta', suspeita: true });
  assert.deepEqual(guarda.classificar({ ...base, anteriores: chutador }), { resultado: 'rapido_demais', suspeita: true });
  assert.equal(guarda.classificar({ ...base, correta: false, anteriores: leitor }).resultado, 'rapido_demais');
  assert.deepEqual(guarda.classificar({ ...base, tempoMs: 5000, anteriores: chutador }), { resultado: 'correta', suspeita: false });
});

test('acerto suspeito quase não sobe a habilidade', () => {
  const normal = motor.atualizar({ habilidade: 2 }, { correta: true, dificuldade: 2, tempoMs: 5000, tempoMinimoMs: 3000 });
  const suspeito = motor.atualizar({ habilidade: 2 }, { correta: true, dificuldade: 2, tempoMs: 800, tempoMinimoMs: 3000, suspeita: true });
  assert.ok(suspeito.delta < normal.delta);
  assert.ok(suspeito.delta <= 0.05);
});

test('tempo mínimo cresce com o texto e respeita os limites', () => {
  assert.equal(guarda.tempoMinimo({ palavras: 1, interacaoMs: 0 }), 1000);
  assert.ok(guarda.tempoMinimo({ palavras: 40, interacaoMs: 0 }) > guarda.tempoMinimo({ palavras: 15, interacaoMs: 0 }));
  assert.equal(guarda.tempoMinimo({ palavras: 1000, interacaoMs: 0 }), 9000);
});

test('pausa só acontece com vários erros rápidos, nunca com erros de quem lê', () => {
  const agora = Date.now();
  const chute = { resultado: 'errada', tempoMs: 900, tempoMinimoMs: 3000, criadoEm: new Date(agora) };
  const lendo = { resultado: 'errada', tempoMs: 20000, tempoMinimoMs: 3000, criadoEm: new Date(agora) };

  assert.equal(guarda.avaliarPausa([chute, chute], 0, agora).pausar, false);
  assert.equal(guarda.avaliarPausa([chute, chute, chute], 0, agora).pausar, true);
  assert.equal(guarda.avaliarPausa([lendo, lendo, lendo, lendo, lendo], 0, agora).pausar, false);
  assert.equal(guarda.avaliarPausa([lendo, chute, chute, chute], 0, agora).pausar, false, 'última resposta foi com calma');
});

test('pausa aumenta a cada reincidência, até o máximo', () => {
  const agora = Date.now();
  const chutes = Array(3).fill({ resultado: 'rapido_demais', tempoMs: 500, tempoMinimoMs: 3000, criadoEm: new Date(agora) });
  const primeira = guarda.avaliarPausa(chutes, 0, agora).segundos;
  const segunda = guarda.avaliarPausa(chutes, 1, agora).segundos;
  assert.ok(segunda > primeira);
  assert.equal(guarda.avaliarPausa(chutes, 10, agora).segundos, 120);
});

test('chutes antigos (fora da janela de tempo) não contam', () => {
  const agora = Date.now();
  const antigo = { resultado: 'errada', tempoMs: 500, tempoMinimoMs: 3000, criadoEm: new Date(agora - 10 * 60 * 1000) };
  const recente = { ...antigo, criadoEm: new Date(agora) };
  assert.equal(guarda.avaliarPausa([recente, antigo, antigo, antigo], 0, agora).pausar, false);
});
