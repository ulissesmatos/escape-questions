const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');
const express = require('express');

const { validarArroba } = require('../src/modules/word/arroba');
const { ContasWord, limparDocumento } = require('../src/modules/word/ContasWord');
const { wordRoutes } = require('../src/modules/word/wordRoutes');

const importar = (arquivo) => import(pathToFileURL(path.join(__dirname, '..', 'public/js/pages/word', arquivo)).href);

// ---------------- @ do aluno ----------------

test('o @ tem as mesmas regras no navegador e no servidor', async () => {
  const { problemaDoArroba, normalizarArroba } = await importar('regras/arroba.js');
  const casos = ['ana.souza', '@Ana.Júlia', 'jo', 'a'.repeat(21), '7ano', 'ana..b', 'ana.', 'ana b', 'ana-b', 'professor', 'agente_007', 'Lucas', 'ÇÃO.ok'];
  for (const caso of casos) {
    let servidor = '';
    try {
      validarArroba(caso);
    } catch (erro) {
      servidor = erro.message;
    }
    assert.equal(problemaDoArroba(caso), servidor, `regras diferentes para "${caso}"`);
  }
  assert.equal(normalizarArroba('  @Ana.Júlia '), 'ana.julia');
  assert.equal(validarArroba('@Ana.Júlia'), 'ana.julia');
});

test('o servidor barra @ com palavrão, mesmo disfarçado', () => {
  for (const ruim of ['porra', 'p0rra.123', 'cu_de_ferro', 'fdp.ana']) assert.throws(() => validarArroba(ruim), /não é permitido/, ruim);
  for (const bom of ['lucas.cunha', 'ana.caputo', 'pedro.cururu']) assert.doesNotThrow(() => validarArroba(bom), bom);
});

test('sugestões de @ vêm do nome e da turma, todas válidas', async () => {
  const { sugerirArrobas, problemaDoArroba } = await importar('regras/arroba.js');
  const ideias = sugerirArrobas('Ana Júlia de Souza', '7º B');
  assert.ok(ideias.includes('ana.souza'));
  assert.ok(ideias.length >= 3 && ideias.length <= 4);
  for (const i of ideias) assert.equal(problemaDoArroba(i), '', i);
  assert.deepEqual(sugerirArrobas(''), []);
});

// ---------------- token e entrega ----------------

test('o token do aluno é assinado: trocar o id invalida', () => {
  const contas = new ContasWord({ db: null, segredo: 'segredo-teste' });
  const token = contas.token(42);
  assert.equal(contas.lerToken(token), 42);
  assert.equal(contas.lerToken(token.replace(/^42/, '43')), null);
  assert.equal(contas.lerToken('42.assinatura-falsa'), null);
  assert.equal(contas.lerToken(''), null);
  assert.equal(new ContasWord({ db: null, segredo: 'outro' }).lerToken(token), null);
});

test('o documento entregue perde scripts e eventos antes de ir para o banco', () => {
  const limpo = limparDocumento('<p onclick="roubar()">Oi</p><script>alert(1)</script><img src="x" onerror="x()"><a href="javascript:mal()">a</a>');
  assert.doesNotMatch(limpo, /script|onclick|onerror|javascript:/i);
  assert.match(limpo, /<p>Oi<\/p>/);
  assert.equal(limparDocumento(42), null);
});

test('rotas da Operação Word: criar, entrar e progresso com o token', async (t) => {
  const contas = new ContasWord({ db: null, segredo: 'rotas' });
  const registro = [];
  contas.criar = async (dados) => ({ conta: { id: 1, arroba: dados.arroba }, token: contas.token(1), progresso: [] });
  contas.entrar = async ({ arroba }) => ({ conta: { id: 1, arroba }, token: contas.token(1), progresso: [] });
  contas.disponivel = async (arroba) => ({ arroba, disponivel: true });
  contas.eu = async (id) => ({ conta: { id }, progresso: [] });
  contas.iniciar = async (id, missao) => (registro.push(['inicio', id, missao]), { ok: true });
  contas.concluir = async (id, missao, corpo) => (registro.push(['fim', id, missao, corpo.estrelas]), { missao, estrelas: corpo.estrelas });
  const config = { ler: async () => ({ liberarTudo: false }) };
  const app = express();
  app.use(express.json());
  app.use('/api/word', wordRoutes({ contas, config }));
  app.use((err, req, res, next) => res.status(err.status || 500).json({ erro: err.message })); // eslint-disable-line no-unused-vars
  const servidor = await new Promise((ok) => {
    const s = app.listen(0, () => ok(s));
  });
  t.after(() => servidor.close());
  const url = `http://localhost:${servidor.address().port}/api/word`;
  const json = { 'Content-Type': 'application/json' };

  assert.deepEqual(await (await fetch(`${url}/config`)).json(), { liberarTudo: false });
  const criado = await fetch(`${url}/contas`, { method: 'POST', headers: json, body: JSON.stringify({ arroba: 'ana', nome: 'Ana', turma: '7B' }) });
  assert.equal(criado.status, 201);
  const { token } = await criado.json();

  const semToken = await fetch(`${url}/missoes/primeiro-acesso/inicio`, { method: 'POST' });
  assert.equal(semToken.status, 401);
  const tokenFalso = await fetch(`${url}/eu`, { headers: { Authorization: 'Bearer 1.falso' } });
  assert.equal(tokenFalso.status, 401);

  const auth = { ...json, Authorization: `Bearer ${token}` };
  assert.equal((await fetch(`${url}/missoes/primeiro-acesso/inicio`, { method: 'POST', headers: auth })).status, 200);
  const fim = await fetch(`${url}/missoes/primeiro-acesso/conclusao`, { method: 'POST', headers: auth, body: JSON.stringify({ estrelas: 3 }) });
  assert.deepEqual(await fim.json(), { missao: 'primeiro-acesso', estrelas: 3 });
  assert.deepEqual(registro, [
    ['inicio', 1, 'primeiro-acesso'],
    ['fim', 1, 'primeiro-acesso', 3],
  ]);
});

// ---------------- sistema de arquivos ----------------

test('arquivos: nomes como no Windows, Lixeira e restaurar', async () => {
  const { SistemaDeArquivos, LIXEIRA, MENSAGEM_CARACTERES, separarExtensao } = await importar('regras/SistemaDeArquivos.js');
  const fs = new SistemaDeArquivos([
    { pasta: 'Documentos', nome: 'Plano', tipo: 'docx', conteudo: { html: '<p>x</p>' } },
    { pasta: 'Documentos', nome: 'Plano', tipo: 'txt', conteudo: { texto: 'x' } },
  ]);
  const plano = fs.obter('Documentos', 'plano', 'docx');
  assert.ok(plano, 'nomes iguais com tipos diferentes podem coexistir; busca ignora maiúsculas');
  assert.throws(() => fs.renomear(plano, 'Plano: final'), (e) => e.message === MENSAGEM_CARACTERES);
  assert.throws(() => fs.renomear(plano, 'CON'), /não é válido/);

  assert.equal(fs.criarPasta('Documentos').nome, 'Nova pasta');
  assert.equal(fs.criarPasta('Documentos').nome, 'Nova pasta (2)');

  fs.excluir(plano);
  assert.equal(plano.pasta, LIXEIRA);
  assert.equal(plano.origem, 'Documentos');
  fs.salvar('Documentos', 'Plano', 'docx', { html: '<p>novo</p>' });
  fs.restaurar(plano);
  assert.equal(plano.pasta, 'Documentos');
  assert.equal(plano.nome, 'Plano (2)', 'restaurar não sobrescreve o arquivo que já está lá');

  const pasta = fs.criarPasta('Documentos', 'Operação');
  fs.mover(fs.obter('Documentos', 'Plano', 'txt'), 'Documentos/Operação');
  assert.ok(fs.obter('Documentos/Operação', 'Plano', 'txt'));
  fs.renomear(pasta, 'Operação Kaos');
  assert.ok(fs.obter('Documentos/Operação Kaos', 'Plano', 'txt'), 'renomear a pasta leva o conteúdo junto');
  assert.throws(() => fs.mover(pasta, 'Documentos/Operação Kaos'), /subpasta/);

  assert.deepEqual(separarExtensao('Relatório.docx'), { base: 'Relatório', tipo: 'docx' });
  assert.deepEqual(separarExtensao('Relatório'), { base: 'Relatório', tipo: null });
});

// ---------------- detector de "perdido" ----------------

test('detector: ações sem avanço sobem a ajuda aos poucos, e avançar zera', async () => {
  const { DetectorDePerdido } = await importar('regras/Detector.js');
  const limites = { acoes: [3, 5, 7], tempo: [60_000, 120_000, 180_000], parado: [50_000, 100_000], intervalo: 0, guias: 4, repetido: 3 };
  const d = new DetectorDePerdido({ limites, agora: 0 });
  const acao = (t, extra = {}) => d.acao({ util: false, tipo: 'menu', ...extra }, t);
  assert.equal(acao(1), null);
  assert.equal(acao(2), null);
  assert.deepEqual(acao(3), { nivel: 1, motivo: 'acoes' });
  acao(4);
  assert.deepEqual(acao(5), { nivel: 2, motivo: 'acoes' });
  assert.equal(d.vezesPerdido, 1);
  d.acao({ util: true }, 6);
  assert.equal(d.nivel, 0);
  assert.equal(acao(7), null, 'depois de avançar a contagem recomeça');
});

test('detector: trocar de guia sem usar nada e repetir o mesmo comando', async () => {
  const { DetectorDePerdido } = await importar('regras/Detector.js');
  const limites = { acoes: [99, 99, 99], tempo: [1e9, 1e9, 1e9], parado: [1e9, 1e9], intervalo: 0, guias: 4, repetido: 3 };
  const d = new DetectorDePerdido({ limites, agora: 0 });
  for (let i = 1; i <= 3; i++) assert.equal(d.acao({ util: false, tipo: 'guia' }, i), null);
  assert.deepEqual(d.acao({ util: false, tipo: 'guia' }, 4), { nivel: 1, motivo: 'guias' });
  d.reiniciar(10);
  d.acao({ util: false, tipo: 'comando', chave: 'negrito' }, 11);
  d.acao({ util: false, tipo: 'comando', chave: 'negrito' }, 12);
  assert.deepEqual(d.acao({ util: false, tipo: 'comando', chave: 'negrito' }, 13), { nivel: 1, motivo: 'repetido', chave: 'negrito' });
});

test('detector: parado só oferece a pista; respeita o intervalo entre avisos', async () => {
  const { DetectorDePerdido, LIMITES } = await importar('regras/Detector.js');
  const d = new DetectorDePerdido({ agora: 0 });
  assert.equal(d.tick(LIMITES.parado[0] - 1), null);
  assert.deepEqual(d.tick(LIMITES.parado[0]), { nivel: 1, motivo: 'parado' });
  assert.equal(d.tick(LIMITES.parado[0] + 1000), null, 'não repete logo em seguida');
  d.ajudaPedida(2, LIMITES.parado[0] + 2000);
  assert.equal(d.nivel, 2);
  assert.equal(d.vezesPerdido, 0, 'pedir ajuda não conta como se perder');
});

// ---------------- missões ----------------

test('missões: 20, ids únicos, conceitos existentes e objetivos completos', async () => {
  const { MISSOES, CAPITULOS, missaoPorId } = await importar('regras/missoes.js');
  const { CONCEITOS } = await importar('regras/conceitos.js');
  assert.equal(MISSOES.length, 20);
  assert.equal(new Set(MISSOES.map((m) => m.id)).size, 20);
  for (const m of MISSOES) {
    assert.ok(CAPITULOS.some((c) => c.numero === m.capitulo), m.id);
    assert.ok(m.historia && m.conclusao, `${m.id}: história e conclusão`);
    for (const c of m.conceitos) assert.ok(CONCEITOS[c], `${m.id}: conceito ${c}`);
    if (m.abrir) assert.ok(m.arquivos.some((a) => a.pasta === m.abrir.pasta && a.nome === m.abrir.nome), `${m.id}: arquivo para abrir`);
    const objetivos = m.objetivos({ arroba: 'teste' });
    assert.ok(objetivos.length >= 3, `${m.id}: pelo menos 3 objetivos`);
    for (const o of objetivos) {
      assert.ok(o.texto, `${m.id}: objetivo sem texto`);
      assert.equal(typeof o.verificar, 'function', `${m.id}: ${o.texto}`);
      assert.ok(o.dica, `${m.id}: "${o.texto}" sem dica`);
      assert.ok(Array.isArray(o.caminho) && o.caminho.length, `${m.id}: "${o.texto}" sem caminho do Mostre-me`);
      for (const p of o.caminho) {
        assert.ok(p.texto, `${m.id}: passo sem texto em "${o.texto}"`);
        const temAlvo = p.alvo || p.alvos?.length || p.trecho !== undefined || p.inicioDoDocumento || p.imagem || p.tabela || p.tabelaLinha !== undefined || p.erro;
        assert.ok(temAlvo, `${m.id}: passo sem alvo em "${o.texto}"`);
      }
      if (o.conceito) assert.ok(CONCEITOS[o.conceito], `${m.id}: conceito ${o.conceito}`);
    }
    // a última ação de cada missão de documento é salvar (ou exportar)
    if (m.capitulo > 1) assert.ok(objetivos[objetivos.length - 1].aposAnteriores, `${m.id}: termina salvando`);
    for (const r of m.roteiro || []) assert.ok(r.quando.objetivo < objetivos.length, `${m.id}: roteiro`);
    assert.equal(missaoPorId(m.id), m);
  }
});

test('missões abrem em ordem (ou todas, se o professor liberar)', async () => {
  const { MISSOES, missoesLiberadas } = await importar('regras/missoes.js');
  assert.deepEqual([...missoesLiberadas([])], [MISSOES[0].id]);
  assert.deepEqual([...missoesLiberadas([MISSOES[0].id])], [MISSOES[0].id, MISSOES[1].id]);
  assert.equal(missoesLiberadas([], { liberarTudo: true }).size, 20);
});

test('estrelas: menos ajuda, mais estrelas; a missão guiada vale 3', async () => {
  const { calcularEstrelas } = await importar('regras/missoes.js');
  assert.equal(calcularEstrelas({ dicas: 0, mostreMe: 0 }), 3);
  assert.equal(calcularEstrelas({ dicas: 1, mostreMe: 0 }), 3);
  assert.equal(calcularEstrelas({ dicas: 1, mostreMe: 1 }), 2);
  assert.equal(calcularEstrelas({ dicas: 2, mostreMe: 2 }), 1);
  assert.equal(calcularEstrelas({ dicas: 5, mostreMe: 5, tutorial: true }), 3);
});

// ---------------- objetivos com um computador de mentira ----------------

/** Inspetor falso: só o texto e as contagens */
function inspetor(texto, estilos = {}) {
  const dobrar = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return {
    texto: () => texto,
    contarOcorrencias: (t) => dobrar(texto).split(dobrar(t)).length - 1,
    estilo: (t) => estilos[t] || null,
  };
}

function estado({ texto = '', arquivo = null, sujo = false, estilos, marcos = [] } = {}) {
  return { marcos: new Set(marcos), copias: [], respostas: {}, word: { tela: 'documento', doc: inspetor(texto, estilos), arquivo, sujo, layout: {} } };
}

test('trocar texto: vale também quando o novo contém o antigo', async () => {
  const o = await importar('regras/objetivos.js');
  const horario = o.trocarTexto('15h', '17h');
  assert.equal(horario.verificar(estado({ texto: 'às 17h na estação' })), true);
  assert.equal(horario.verificar(estado({ texto: 'às 17h ou 15h' })), false);
  const titulo = o.trocarTexto('Esconderijo', 'Esconderijo secreto');
  assert.equal(titulo.verificar(estado({ texto: 'Esconderijo' })), false);
  assert.equal(titulo.verificar(estado({ texto: 'Esconderijo secreto\nfica no esconderijo' })), false, 'sobrou um "esconderijo" solto');
  assert.equal(titulo.verificar(estado({ texto: 'Esconderijo secreto' })), true);
});

test('salvar como: confere pasta, nome e se não há mudança pendente; e explica o erro', async () => {
  const o = await importar('regras/objetivos.js');
  const obj = o.salvarComo('Ficha do agente');
  assert.equal(obj.verificar(estado({ arquivo: { pasta: 'Documentos', nome: 'Ficha do Agente' } })), true);
  assert.equal(obj.verificar(estado({ arquivo: { pasta: 'Documentos', nome: 'Ficha do Agente' }, sujo: true })), false);
  assert.equal(obj.verificar(estado({ arquivo: { pasta: 'Área de Trabalho', nome: 'Ficha do agente' } })), false);
  assert.match(obj.diagnosticar({ tipo: 'arquivo', acao: 'salvar', pasta: 'Área de Trabalho', nome: 'Ficha do agente' }), /pasta Documentos/);
  assert.match(obj.diagnosticar({ tipo: 'arquivo', acao: 'salvar', pasta: 'Documentos', nome: 'ficha' }), /nome pedido/);
});

test('formatar: confere o estilo e avisa quando a formatação foi para o lugar errado', async () => {
  const o = await importar('regras/objetivos.js');
  const obj = o.formatarTrecho('ALFA-7', { negrito: true });
  assert.equal(obj.verificar(estado({ estilos: { 'ALFA-7': { negrito: true } } })), true);
  assert.equal(obj.verificar(estado({ estilos: { 'ALFA-7': { negrito: false } } })), false);
  assert.match(obj.diagnosticar({ tipo: 'comando', comando: 'negrito', selecao: 'Setor Ômega', vazio: false }), /Setor Ômega.*ALFA-7/);
  assert.match(obj.diagnosticar({ tipo: 'comando', comando: 'negrito', selecao: '', vazio: true }), /Nada estava selecionado/);
  assert.equal(obj.diagnosticar({ tipo: 'comando', comando: 'negrito', selecao: 'ALFA-7', vazio: false }), null);
  const cor = o.formatarTrecho('PERIGO', { cor: 'vermelho' });
  assert.equal(cor.verificar(estado({ estilos: { PERIGO: { cor: [192, 0, 0] } } })), true);
  assert.equal(cor.verificar(estado({ estilos: { PERIGO: { cor: [0, 112, 192] } } })), false);
});

test('pergunta da Central: a resposta pode ser calculada na hora (contar palavras)', async () => {
  const o = await importar('regras/objetivos.js');
  const obj = o.responder('palavras', 'Quantas palavras?', (e) => e.total);
  const e = { ...estado(), total: 32 };
  assert.equal(obj.conferir('32', e), true);
  assert.equal(obj.conferir(' 31 ', e), false);
  assert.equal(obj.verificar({ ...e, respostas: { palavras: '32' } }), true);
});

// ---------------- Word: ortografia, =rand(), maiúsculas ----------------

test('ortografia marca erros comuns com sugestões, sem marcar palavras certas', async () => {
  const { errosNoTexto, textoRand } = await importar('regras/ortografia.js');
  const erros = errosNoTexto('Esta mençagem do computadorr chegou. Café, coffee e Agenti.');
  assert.deepEqual(erros.map((e) => e.palavra), ['mençagem', 'computadorr', 'Agenti']);
  assert.deepEqual(erros[2].sugestoes, ['Agente', 'Agentes'], 'mantém a maiúscula');
  assert.deepEqual(errosNoTexto('O agente secreto também viu a mensagem.'), []);
  const rand = textoRand();
  assert.equal(rand.length, 5);
  assert.ok(rand[0].startsWith('O vídeo fornece uma maneira poderosa'));
  assert.equal(textoRand(2, 1).length, 2);
});

test('maiúsculas e minúsculas como no Word', async () => {
  const { mudarCaixa } = await importar('sistema/word/Documento.js');
  assert.equal(mudarCaixa('O PACOTE CHEGA AMANHÃ CEDO. NÃO SE ATRASE.', 'frase'), 'O pacote chega amanhã cedo. Não se atrase.');
  assert.equal(mudarCaixa('ana júlia souza', 'palavras'), 'Ana Júlia Souza');
  assert.equal(mudarCaixa('Agente', 'alternar'), 'aGENTE');
  assert.equal(mudarCaixa('ação', 'maiusculas'), 'AÇÃO');
});

test('contar palavras como a barra de status do Word', async () => {
  const { contarPalavras } = await importar('regras/missoes.js');
  assert.equal(contarPalavras('Esta é uma mensagem — muito importante!'), 6);
  assert.equal(contarPalavras('  \n '), 0);
});
