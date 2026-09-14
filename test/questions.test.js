const test = require('node:test');
const assert = require('node:assert/strict');

const Random = require('../src/shared/Random');
const { registroPadrao } = require('../src/questions/QuestionTypeRegistry');
const { BANCO_DE_QUESTOES } = require('../src/modules/hardware/seed/bancoDeQuestoes');
const { COMPONENTES } = require('../src/modules/hardware/seed/mapa');

/** Monta a resposta certa a partir do gabarito — usado para testar a correção */
function respostaCerta(publico, gabarito) {
  switch (publico.tipo) {
    case 'multipla_escolha':
    case 'verdadeiro_falso':
      return { opcao: gabarito.opcaoCorreta };
    case 'texto':
      return { texto: gabarito.exemplo };
    case 'numero':
      return { valor: gabarito.resposta };
    case 'ordenar':
      return { ordem: gabarito.ordem };
    case 'anagrama':
      return { palavra: gabarito.exibicao };
    case 'associar':
      return { pares: gabarito.pares };
    default:
      throw new Error(`tipo sem resposta de teste: ${publico.tipo}`);
  }
}

const todas = Object.entries(BANCO_DE_QUESTOES).flatMap(([componente, lista]) =>
  lista.map((questao, i) => ({ componente, indice: i + 1, questao }))
);

test('todo componente do mapa tem perguntas de dificuldade 1 a 5', () => {
  for (const { nome } of COMPONENTES) {
    const lista = BANCO_DE_QUESTOES[nome];
    assert.ok(lista, `sem banco de perguntas para "${nome}"`);
    const dificuldades = new Set(lista.map((q) => q.dificuldade));
    for (let d = 1; d <= 5; d++) assert.ok(dificuldades.has(d), `"${nome}" sem pergunta de dificuldade ${d}`);
  }
});

test('todas as perguntas do banco são válidas', () => {
  for (const { componente, indice, questao } of todas) {
    const tipo = registroPadrao.get(questao.tipo);
    assert.equal(tipo.validar(questao), null, `${componente} #${indice}`);
    assert.ok(questao.explicacao, `${componente} #${indice} sem explicação`);
  }
});

test('instâncias corrigem a resposta certa como correta e uma vazia como errada', () => {
  const rng = new Random(42);
  for (const { componente, indice, questao } of todas) {
    const tipo = registroPadrao.get(questao.tipo);
    for (let rodada = 0; rodada < 15; rodada++) {
      const { publico, gabarito, palavras } = tipo.instanciar(questao, rng);
      const rotulo = `${componente} #${indice} (rodada ${rodada})`;

      assert.ok(publico.pergunta, `${rotulo}: sem texto de pergunta`);
      assert.ok(palavras > 0, `${rotulo}: sem palavras para ler`);
      assert.equal(tipo.corrigir(gabarito, respostaCerta(publico, gabarito)), true, `${rotulo}: resposta certa recusada`);
      assert.equal(tipo.corrigir(gabarito, {}), false, `${rotulo}: resposta vazia aceita`);

      // O gabarito não pode vazar no que vai para o navegador
      const json = JSON.stringify(publico);
      if (gabarito.opcaoCorreta) assert.ok(!json.includes('correta'), `${rotulo}: vazou gabarito`);
    }
  }
});

test('múltipla escolha muda a posição da resposta certa entre instâncias', () => {
  const questao = BANCO_DE_QUESTOES['Placa de vídeo (GPU)'][0];
  const tipo = registroPadrao.get(questao.tipo);
  const rng = new Random(7);
  const posicoes = new Set();
  for (let i = 0; i < 40; i++) {
    const { publico, gabarito } = tipo.instanciar(questao, rng);
    posicoes.add(publico.opcoes.findIndex((o) => o.id === gabarito.opcaoCorreta));
  }
  assert.ok(posicoes.size >= 3, `a resposta certa apareceu só nas posições ${[...posicoes]}`);
});

test('verdadeiro/falso alterna entre respostas verdadeiras e falsas', () => {
  const questao = BANCO_DE_QUESTOES['Memória RAM'][0];
  const tipo = registroPadrao.get(questao.tipo);
  const rng = new Random(3);
  const respostas = new Set();
  for (let i = 0; i < 30; i++) {
    const { publico, gabarito } = tipo.instanciar(questao, rng);
    respostas.add(publico.opcoes.find((o) => o.id === gabarito.opcaoCorreta).texto);
  }
  assert.deepEqual([...respostas].sort(), ['Falso', 'Verdadeiro']);
});

test('resposta escrita tolera acento, maiúscula e pequeno erro de digitação', () => {
  const tipo = registroPadrao.get('texto');
  const { gabarito } = tipo.instanciar({ pergunta: 'x', conteudo: { respostas: ['Engelbart'] } }, new Random(1));
  assert.equal(tipo.corrigir(gabarito, { texto: 'engelbart' }), true);
  assert.equal(tipo.corrigir(gabarito, { texto: 'Engelbar' }), true);
  assert.equal(tipo.corrigir(gabarito, { texto: 'Einstein' }), false);

  const curto = tipo.instanciar({ pergunta: 'x', conteudo: { respostas: ['DNS'] } }, new Random(1)).gabarito;
  assert.equal(tipo.corrigir(curto, { texto: 'dns' }), true);
  assert.equal(tipo.corrigir(curto, { texto: 'DNA' }), false, 'palavras curtas não têm tolerância');
});

test('slider não começa na resposta certa', () => {
  const tipo = registroPadrao.get('numero');
  const questao = { pergunta: 'x', conteudo: { min: 0, max: 16, passo: 1, resposta: 4 } };
  const rng = new Random(9);
  for (let i = 0; i < 50; i++) {
    const { publico } = tipo.instanciar(questao, rng);
    assert.notEqual(publico.inicial, 4);
  }
});

test('ordenar e anagrama nunca começam já resolvidos', () => {
  const rng = new Random(5);
  const ordenar = registroPadrao.get('ordenar');
  const anagrama = registroPadrao.get('anagrama');
  for (let i = 0; i < 50; i++) {
    const o = ordenar.instanciar({ pergunta: 'x', conteudo: { itens: ['A', 'B', 'C'] } }, rng);
    assert.notDeepEqual(o.publico.itens.map((it) => it.id), o.gabarito.ordem);
    const a = anagrama.instanciar({ pergunta: 'x', conteudo: { palavra: 'RAM' } }, rng);
    assert.notEqual(a.publico.letras.join(''), 'RAM');
  }
});
