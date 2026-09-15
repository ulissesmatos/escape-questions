const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const modulo = (arquivo) => import(pathToFileURL(path.join(__dirname, '..', 'public/js/pages/oficina', arquivo)).href);

test('faixas de música compilam com todas as trilhas no mesmo tamanho', async () => {
  const { compilarFaixa } = await modulo('jogo/audio/Musica.js');
  const { FAIXAS } = await modulo('jogo/audio/faixas.js');
  const { frequenciaDaNota } = await modulo('jogo/audio/Sintetizador.js');
  assert.ok(Math.abs(frequenciaDaNota('A4') - 440) < 1e-9);
  assert.ok(Math.abs(frequenciaDaNota('C5') - 523.2511) < 0.001);
  for (const [nome, faixa] of Object.entries(FAIXAS)) {
    const { passos, eventos } = compilarFaixa(faixa);
    assert.equal(passos, faixa.compassos * 8, nome);
    for (const passo of eventos) for (const nota of passo) if (nota.onda !== 'ruido') frequenciaDaNota(typeof nota.freq === 'string' ? nota.freq : 'A4');
  }
  assert.throws(() => compilarFaixa({ bpm: 100, compassos: 1, trilhas: [{ nome: 'curta', som: {}, notas: 'C4 .' }] }), /passos/);
});

test('todos os efeitos sonoros usam notas válidas', async () => {
  const { EFEITOS } = await modulo('jogo/audio/efeitos.js');
  const { frequenciaDaNota } = await modulo('jogo/audio/Sintetizador.js');
  for (const sons of Object.values(EFEITOS)) {
    for (const som of sons) {
      for (const valor of [som.freq, som.ate]) if (typeof valor === 'string') frequenciaDaNota(valor);
    }
  }
});
