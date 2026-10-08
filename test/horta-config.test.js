const test = require('node:test');
const assert = require('node:assert/strict');

const { criarApp } = require('../src/app');
const { AdminAuth } = require('../src/auth/AdminAuth');

/** Banco de mentira só com a tabela de configurações */
function bancoFalso() {
  const linhas = new Map();
  return {
    async one(sql, [chave]) {
      return linhas.has(chave) ? { valor: JSON.parse(linhas.get(chave)) } : null;
    },
    async query(sql, [chave, valor]) {
      linhas.set(chave, valor);
      return { rowCount: 1 };
    },
  };
}

test('memória do Robô na Horta: começa desligada, o professor liga e o jogo lê', async (t) => {
  const auth = new AdminAuth({ senha: 'senha-teste' });
  const app = criarApp({ db: bancoFalso(), auth });
  const servidor = await new Promise((ok) => {
    const s = app.listen(0, () => ok(s));
  });
  t.after(() => servidor.close());
  const url = `http://localhost:${servidor.address().port}/api`;
  const json = { 'Content-Type': 'application/json' };

  assert.deepEqual(await (await fetch(`${url}/horta/config`)).json(), { memoria: false });

  const semLogin = await fetch(`${url}/admin/horta/config`, { method: 'PUT', headers: json, body: JSON.stringify({ memoria: true }) });
  assert.equal(semLogin.status, 401);

  const { token } = auth.login('senha-teste', '127.0.0.1');
  const ligada = await fetch(`${url}/admin/horta/config`, {
    method: 'PUT',
    headers: { ...json, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ memoria: true, outraCoisa: 'ignorada' }),
  });
  assert.deepEqual(await ligada.json(), { memoria: true });
  assert.deepEqual(await (await fetch(`${url}/horta/config`)).json(), { memoria: true }, 'o jogo vê a mudança');

  const valorInvalido = await fetch(`${url}/admin/horta/config`, {
    method: 'PUT',
    headers: { ...json, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ memoria: 'sim' }),
  });
  assert.deepEqual(await valorInvalido.json(), { memoria: true }, 'valor que não é sim/não não muda nada');
});

test('fases que falam da memória têm uma fala para quando ela está desligada', async () => {
  const path = require('path');
  const { pathToFileURL } = require('url');
  const { FASES } = await import(pathToFileURL(path.join(__dirname, '..', 'public/js/pages/horta/regras/fases.js')).href);
  for (const fase of FASES.filter((f) => /mem[oó]ria/i.test(f.fala))) {
    assert.ok(fase.falaSemMemoria, `${fase.id}: falta falaSemMemoria`);
    assert.doesNotMatch(fase.falaSemMemoria, /mem[oó]ria/i, fase.id);
  }
});
