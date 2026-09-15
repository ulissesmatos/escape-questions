const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const express = require('express');

const { oficinaRoutes } = require('../src/modules/oficina/oficinaRoutes');
const { errorHandler } = require('../src/http/routing');

const modulo = (arquivo) => import(pathToFileURL(path.join(__dirname, '..', 'public/js/pages/oficina', arquivo)).href);

let zonas, manifesto, geometria, colocacao;

test.before(async () => {
  zonas = await modulo('jogo/sprites/zonas.js');
  manifesto = await modulo('jogo/sprites/manifesto.js');
  geometria = await modulo('editor/geometria.js');
  colocacao = await modulo('jogo/sprites/colocacao.js');
});

test('validarZonas aceita ajustes parciais e arredonda para 4 casas', () => {
  const { zonas: limpo } = zonas.validarZonas({ placas: { 'placa-atx': { socket: [0.123456, 0.2, 0.25, 0.2] } } });
  assert.deepEqual(limpo, { placas: { 'placa-atx': { socket: [0.1235, 0.2, 0.25, 0.2] } } });
});

test('validarZonas recusa imagem, zona ou quantidade de slots desconhecidas e retângulos fora da imagem', () => {
  const casos = [
    [{ placas: { 'placa-inventada': { socket: [0, 0, 0.1, 0.1] } } }, /Imagem desconhecida/],
    [{ placas: { 'placa-atx': { ventoinha: [0, 0, 0.1, 0.1] } } }, /zona desconhecida/],
    [{ placas: { 'placa-atx': { ram: [[0, 0, 0.1, 0.1]] } } }, /4 retângulos/],
    [{ gabinetes: { 'gabinete-mid': { fonte: [0.9, 0.9, 0.2, 0.2] } } }, /dentro da imagem/],
    [{ outros: {} }, /Grupo desconhecido/],
    [[], /objeto JSON/],
  ];
  for (const [dados, erro] of casos) assert.throws(() => zonas.validarZonas(dados), erro);
});

test('modo tolerante ignora o que não serve (zonas do editor antigo) e explica', () => {
  const antigo = {
    placas: { 'placa-atx': { socket: [0.3, 0.2, 0.2, 0.2], 'minha-zona': [0, 0, 1, 1] }, 'meu-sprite': { socket: [0, 0, 1, 1] } },
    gabinetes: {},
  };
  const { zonas: limpo, avisos } = zonas.validarZonas(antigo, { tolerante: true });
  assert.deepEqual(limpo, { placas: { 'placa-atx': { socket: [0.3, 0.2, 0.2, 0.2] } } });
  assert.equal(avisos.length, 2);
});

test('aplicarZonas sobrepõe o arquivo aos padrões, e a placa Intel é independente da AMD', () => {
  const socketAmdPadrao = structuredClone(manifesto.LAYOUT_PLACAS['placa-matx'].socket);
  zonas.aplicarZonas({ placas: { 'placa-matx-intel': { socket: [0.3, 0.3, 0.2, 0.2] } } });
  assert.deepEqual(manifesto.LAYOUT_PLACAS['placa-matx-intel'].socket, [0.3, 0.3, 0.2, 0.2]);
  assert.deepEqual(manifesto.LAYOUT_PLACAS['placa-matx'].socket, socketAmdPadrao);
  assert.equal(manifesto.LAYOUT_PLACAS['placa-matx-intel'].ram.length, 2, 'campos não enviados continuam padrão');

  zonas.aplicarZonas({});
  assert.deepEqual(manifesto.LAYOUT_PLACAS['placa-matx-intel'].socket, socketAmdPadrao, 'arquivo vazio volta tudo ao padrão');
});

test('só as diferenças do padrão vão para o arquivo, com um retângulo por linha', () => {
  const layouts = zonas.layoutsEmUso();
  assert.deepEqual(zonas.diferencasDoPadrao(layouts), {});
  layouts.gabinetes['gabinete-mini'].sata[1] = [0.7, 0.6, 0.2, 0.1];
  const diferencas = zonas.diferencasDoPadrao(layouts);
  assert.deepEqual(Object.keys(diferencas.gabinetes['gabinete-mini']), ['sata']);
  const texto = zonas.formatarZonas(diferencas);
  assert.match(texto, /\[0\.7, 0\.6, 0\.2, 0\.1\]/);
  assert.deepEqual(JSON.parse(texto), diferencas);
});

test('editor: pixels ↔ frações voltam aos mesmos pixels', () => {
  for (const tamanho of [{ largura: 240, altura: 300 }, { largura: 300, altura: 350 }, { largura: 270, altura: 320 }]) {
    for (let x = 0; x < tamanho.largura; x += 7) {
      const px = { x, y: Math.min(x, tamanho.altura - 10), w: 9, h: 10 };
      assert.deepEqual(geometria.paraPixels(geometria.paraFracao(px, tamanho), tamanho), px);
    }
  }
});

test('editor: arrastar move dentro da imagem e cantos redimensionam sem inverter', () => {
  const imagem = { largura: 100, altura: 100 };
  const inicio = { x: 10, y: 10, w: 20, h: 20 };
  assert.deepEqual(geometria.arrastarRetangulo(inicio, 'mover', 200, -50, imagem), { x: 80, y: 0, w: 20, h: 20 });
  assert.deepEqual(geometria.arrastarRetangulo(inicio, 'se', 5, 7, imagem), { x: 10, y: 10, w: 25, h: 27 });
  assert.deepEqual(geometria.arrastarRetangulo(inicio, 'nw', -4, 3, imagem), { x: 6, y: 13, w: 24, h: 17 });
  assert.deepEqual(geometria.arrastarRetangulo(inicio, 'ne', -100, 0, imagem), { x: 10, y: 10, w: geometria.TAMANHO_MINIMO, h: 20 });
  assert.deepEqual(geometria.arrastarRetangulo(inicio, 'sw', 0, 500, imagem), { x: 10, y: 10, w: 20, h: 90 });
});

test('colocação: peças seguem as regras da bancada', () => {
  const socket = colocacao.retangulo(100, 100, 50, 50);
  const cpu = colocacao.ARTE_NO_ENCAIXE.cpu('cpu-am4', socket);
  assert.ok(Math.abs(cpu.x + cpu.width / 2 - 125) < 1e-9 && Math.abs(cpu.y + cpu.height / 2 - 125) < 1e-9, 'processador centralizado no socket');
  const slot = colocacao.retangulo(20, 200, 150, 6);
  const gpu = colocacao.ARTE_NO_ENCAIXE.gpu('gpu-2', slot, 1);
  assert.equal(gpu.x, 14);
  assert.equal(gpu.y + gpu.height, 205, 'contatos da placa de vídeo sobre o slot');
  assert.deepEqual(colocacao.AREA_DE_SOLTAR.ram(colocacao.retangulo(0, 0, 10, 50)), colocacao.retangulo(-8, 0, 26, 50));
});

test('rota PUT /zonas grava o arquivo validado; em produção recusa', async (t) => {
  const pasta = await fs.mkdtemp(path.join(os.tmpdir(), 'oficina-zonas-'));
  t.after(() => fs.rm(pasta, { recursive: true, force: true }));
  await fs.writeFile(path.join(pasta, 'placa-atx.png'), '');

  const subir = (podeEditarZonas) => {
    const app = express();
    app.use(express.json());
    app.use('/api/oficina', oficinaRoutes({ pastaArte: pasta, podeEditarZonas }));
    app.use(errorHandler);
    return new Promise((resolver) => {
      const servidor = app.listen(0, () => resolver(servidor));
    });
  };
  const local = await subir(true);
  const producao = await subir(false);
  t.after(() => { local.close(); producao.close(); });
  const url = (servidor, caminho) => `http://127.0.0.1:${servidor.address().port}/api/oficina${caminho}`;
  const put = (servidor, corpo) => fetch(url(servidor, '/zonas'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });

  assert.deepEqual(await (await fetch(url(local, '/sprites'))).json(), ['placa-atx']);
  assert.deepEqual(await (await fetch(url(local, '/zonas/editor'))).json(), { podeSalvar: true });

  const ruim = await put(local, { placas: { 'placa-atx': { socket: [2, 0, 1, 1] } } });
  assert.equal(ruim.status, 400);

  const ok = await put(local, { placas: { 'placa-atx': { socket: [0.31, 0.16, 0.24, 0.19] } } });
  assert.equal(ok.status, 200);
  const gravado = await fs.readFile(path.join(pasta, 'zonas.json'), 'utf8');
  assert.deepEqual(JSON.parse(gravado), { placas: { 'placa-atx': { socket: [0.31, 0.16, 0.24, 0.19] } } });

  assert.equal((await put(producao, {})).status, 403);
});
