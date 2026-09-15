const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const regras = (arquivo) => import(pathToFileURL(path.join(__dirname, '..', 'public/js/pages/oficina/regras', arquivo)).href);

let Montagem, SimuladorTeste, PEDIDOS, AvaliadorPedido;

test.before(async () => {
  ({ Montagem } = await regras('Montagem.js'));
  ({ SimuladorTeste } = await regras('SimuladorTeste.js'));
  ({ PEDIDOS, AvaliadorPedido } = await regras('pedidos.js'));
});

/** Monta um PC seguindo os passos certos (skill checks bem feitos, salvo opções) */
function montar(pecas, { pasta = 0.4, emX = true, alinhado = true, cabos = true, fechar = true } = {}) {
  const m = new Montagem();
  const colocar = (encaixe, id, resultado) => {
    const r = m.tentar(encaixe, id);
    if (r.status === 'skill') return m.concluir(encaixe, id, resultado);
    return r;
  };

  colocar('placa', pecas.placa);
  if (pecas.cpu) colocar('cpu', pecas.cpu, { alinhado });
  if (pecas.cpu && pasta !== null) colocar('pasta', 'pasta-termica', { quantidade: pasta });
  if (pecas.cooler) colocar('cooler', pecas.cooler, { emX });
  (pecas.ram || []).forEach(([slot, id]) => colocar(slot, id));
  (pecas.m2 || []).forEach((id, i) => colocar(`m2-${i}`, id));
  colocar('gabinete', pecas.gabinete);
  m.colocarPlacaNoGabinete();
  if (pecas.gpu) colocar('gpu', pecas.gpu);
  if (pecas.fonte) colocar('fonte', pecas.fonte);
  (pecas.sata || []).forEach((id, i) => colocar(`sata-${i}`, id));
  if (cabos) m.conectarCabos({ placa: true, cpu: true, gpu: true, sata: true });
  if (fechar) m.fecharTampa();
  return m;
}

const ESCRITORIO = {
  placa: 'pm-am4-matx',
  cpu: 'cpu-am4-6g',
  cooler: 'cooler-box',
  ram: [['ram-0', 'ram-ddr4-8'], ['ram-1', 'ram-ddr4-8']],
  m2: ['ssd-nvme-500'],
  gabinete: 'gab-mini',
  fonte: 'fonte-450',
};

const GAMER = {
  placa: 'pm-am5-atx',
  cpu: 'cpu-am5-6',
  cooler: 'cooler-torre',
  ram: [['ram-1', 'ram-ddr5-16'], ['ram-3', 'ram-ddr5-16']],
  m2: ['ssd-nvme-1tb'],
  gabinete: 'gab-mid',
  gpu: 'gpu-topo',
  fonte: 'fonte-850',
};

const EDITORA = {
  placa: 'pm-am5-atx',
  cpu: 'cpu-am5-8',
  cooler: 'cooler-torre',
  ram: [['ram-1', 'ram-ddr5-16'], ['ram-3', 'ram-ddr5-16']],
  m2: ['ssd-nvme-1tb'],
  sata: ['hd-2tb'],
  gabinete: 'gab-mid',
  gpu: 'gpu-media',
  fonte: 'fonte-650',
};

const pedido = (id) => PEDIDOS.find((p) => p.id === id);

test('montagens corretas passam no teste e ganham 3 estrelas', () => {
  const casos = [
    ['tutorial', ESCRITORIO],
    ['ricardo', ESCRITORIO],
    ['enzo', GAMER],
    ['marina', EDITORA],
  ];
  for (const [id, pecas] of casos) {
    const m = montar(pecas);
    const teste = SimuladorTeste.executar(m);
    assert.equal(teste.sucesso, true, `${id}: ${teste.explicacao}`);
    const avaliacao = AvaliadorPedido.avaliar(pedido(id), m, teste);
    assert.equal(avaliacao.estrelas, 3, `${id}: ${JSON.stringify([...avaliacao.requisitos, ...avaliacao.capricho].filter((r) => !r.ok))}`);
    assert.ok(avaliacao.moedas > 0);
  }
});

test('processador com socket diferente entorta os pinos e não encaixa', () => {
  const m = new Montagem();
  m.tentar('placa', 'pm-lga1700-matx');
  const r = m.tentar('cpu', 'cpu-am4-6g');
  assert.equal(r.status, 'dano');
  assert.equal(m.estado.placaDanificada, true);
  assert.equal(m.processador(), null);
  assert.equal(m.tentar('cpu', 'cpu-lga1700-6f').status, 'recusado', 'placa com pinos tortos não aceita mais processador');

  const remocao = m.remover('placa');
  assert.equal(remocao.estragada, true);
  assert.ok(m.estado.prejuizo > 0, 'placa estragada vira prejuízo');
});

test('processador desalinhado no skill check também entorta os pinos', () => {
  const m = new Montagem();
  m.tentar('placa', 'pm-am4-matx');
  assert.equal(m.tentar('cpu', 'cpu-am4-6g').status, 'skill');
  assert.equal(m.concluir('cpu', 'cpu-am4-6g', { alinhado: false }).status, 'dano');
  assert.equal(m.estado.placaDanificada, true);
});

test('memória do tipo errado não encaixa (sem estragar nada)', () => {
  const m = new Montagem();
  m.tentar('placa', 'pm-am5-atx');
  const r = m.tentar('ram-0', 'ram-ddr4-8');
  assert.equal(r.status, 'recusado');
  assert.match(r.mensagem, /DDR5/);
  assert.equal(m.estado.placaDanificada, false);
});

test('ordem de montagem: pasta e cooler só depois do processador; pasta antes do cooler', () => {
  const m = new Montagem();
  assert.equal(m.tentar('cpu', 'cpu-am5-6').status, 'recusado');
  m.tentar('placa', 'pm-am5-atx');
  assert.equal(m.tentar('cooler', 'cooler-box').status, 'recusado');
  m.concluir('cpu', 'cpu-am5-6', { alinhado: true });
  m.concluir('cooler', 'cooler-box', { emX: true });
  assert.equal(m.tentar('pasta', 'pasta-termica').status, 'recusado', 'com cooler no lugar não dá para passar pasta');
  assert.equal(m.remover('cpu').status, 'recusado', 'não tira processador com cooler em cima');
});

test('esquecer a pasta térmica superaquece no teste', () => {
  const m = montar(GAMER, { pasta: null });
  const teste = SimuladorTeste.executar(m);
  assert.equal(teste.sucesso, false);
  assert.equal(teste.motivo, 'superaquecimento');
  assert.match(teste.explicacao, /pasta/i);
});

test('cooler fraco para processador de 120 W superaquece ou esquenta demais', () => {
  const m = montar({ ...EDITORA, cooler: 'cooler-box' });
  const teste = SimuladorTeste.executar(m);
  assert.ok(!teste.sucesso || teste.temperatura >= 90, `temperatura ${teste.temperatura}`);
  assert.ok(AvaliadorPedido.avaliar(pedido('marina'), m, teste).estrelas < 2);
});

test('fonte fraca desliga no teste de estresse', () => {
  const teste = SimuladorTeste.executar(montar({ ...GAMER, fonte: 'fonte-650' }));
  assert.equal(teste.sucesso, false);
  assert.equal(teste.motivo, 'fonte_fraca');
});

test('processador sem vídeo integrado e sem placa de vídeo: monitor sem sinal', () => {
  const teste = SimuladorTeste.executar(montar({ ...ESCRITORIO, placa: 'pm-lga1700-matx', cpu: 'cpu-lga1700-6f' }));
  assert.equal(teste.motivo, 'sem_video');
});

test('esquecer cabos ou memória dá o erro certo', () => {
  assert.equal(SimuladorTeste.executar(montar(ESCRITORIO, { cabos: false })).motivo, 'sem_energia');
  assert.equal(SimuladorTeste.executar(montar({ ...ESCRITORIO, ram: [] })).motivo, 'sem_ram');
  assert.equal(SimuladorTeste.executar(montar({ ...ESCRITORIO, cooler: null })).motivo, 'sem_cooler');
});

test('placa ATX não cabe no gabinete mini e placa de vídeo grande não cabe', () => {
  const m = new Montagem();
  m.tentar('placa', 'pm-am5-atx');
  m.tentar('gabinete', 'gab-mini');
  assert.equal(m.colocarPlacaNoGabinete().status, 'recusado');

  const m2 = montar({ ...ESCRITORIO }, { fechar: false });
  assert.equal(m2.tentar('gpu', 'gpu-topo').status, 'recusado', '336 mm não cabe no mini (280 mm)');
});

test('pedidos: requisitos não atendidos limitam a 1 estrela', () => {
  const m = montar({ ...ESCRITORIO, gabinete: 'gab-mid', gpu: 'gpu-entrada' });
  const teste = SimuladorTeste.executar(m);
  assert.equal(teste.sucesso, true);
  const avaliacao = AvaliadorPedido.avaliar(pedido('ricardo'), m, teste);
  assert.equal(avaliacao.estrelas, 1);
  assert.ok(avaliacao.requisitos.some((r) => !r.ok && /placa de vídeo/i.test(r.texto)));
});

test('pasta demais ou parafusos fora de ordem tiram a terceira estrela', () => {
  for (const opcoes of [{ pasta: 0.9 }, { emX: false }]) {
    const m = montar(ESCRITORIO, opcoes);
    const avaliacao = AvaliadorPedido.avaliar(pedido('tutorial'), m, SimuladorTeste.executar(m));
    assert.equal(avaliacao.estrelas, 2, JSON.stringify(opcoes));
  }
});

test('pendências dizem o que falta e onde encontrar', () => {
  const m = new Montagem();
  const gpu = m.pendenciaPara('gpu-media');
  assert.match(gpu.mensagem, /gabinete primeiro/);
  assert.deepEqual(gpu.alvo, { categoria: 'gabinete' });
  assert.deepEqual(m.pendenciaPara('ram-ddr4-8').alvo, { categoria: 'placa_mae' });
  assert.deepEqual(m.pendenciaPara('ssd-nvme-500').alvo, { categoria: 'placa_mae' }, 'NVMe depende da placa-mãe');
  assert.deepEqual(m.pendenciaPara('hd-2tb').alvo, { categoria: 'gabinete' }, 'HD depende do gabinete');

  m.tentar('gabinete', 'gab-mid');
  assert.deepEqual(m.pendenciaPara('gpu-media').alvo, { categoria: 'placa_mae' });
  m.tentar('placa', 'pm-am5-atx');
  assert.deepEqual(m.pendenciaPara('gpu-media').alvo, { botao: 'placa-gabinete' });
  assert.deepEqual(m.pendenciaPara('cooler-torre').alvo, { categoria: 'cpu' });
  m.colocarPlacaNoGabinete();
  assert.equal(m.pendenciaPara('gpu-media'), null);
  assert.equal(m.pendenciaPara('ram-ddr5-16'), null);
});

test('placa com pinos tortos pede troca e volta a aceitar processador depois de descartada', () => {
  const m = new Montagem();
  m.tentar('placa', 'pm-am4-matx');
  assert.equal(m.tentar('cpu', 'cpu-am5-6').status, 'dano');
  assert.match(m.pendenciaPara('cpu-am4-6g').mensagem, /pinos/);
  assert.equal(m.remover('placa').estragada, true);
  assert.deepEqual(m.pendenciaPara('cpu-am4-6g').alvo, { categoria: 'placa_mae' });
  m.tentar('placa', 'pm-am4-matx');
  assert.equal(m.tentar('cpu', 'cpu-am4-6g').status, 'skill');
});

test('soltar o processador: centralizado encaixa, torto arrisca, virado entorta, longe nem toca', async () => {
  const { EncaixeProcessador } = await regras('encaixes.js');
  const soltar = (opcoes) => EncaixeProcessador.soltar(opcoes).resultado;
  assert.equal(soltar({ alinhado: true, desvio: 0.03, sorte: 0 }), 'encaixou');
  assert.equal(soltar({ alinhado: true, desvio: 0.3, sorte: 0.99 }), 'por_pouco');
  assert.equal(soltar({ alinhado: true, desvio: 0.3, sorte: 0.01 }), 'entortou');
  assert.equal(soltar({ alinhado: false, desvio: 0.01, sorte: 0.99 }), 'entortou', 'virado sempre entorta');
  assert.equal(soltar({ alinhado: false, desvio: 0.8, sorte: 0 }), 'fora', 'fora do socket volta para a mão');

  const riscos = [0.07, 0.2, 0.35, 0.5].map((desvio) => EncaixeProcessador.riscoDeEntortar({ alinhado: true, desvio }));
  assert.deepEqual([...riscos].sort((a, b) => a - b), riscos, 'quanto mais longe do centro, maior o risco');

  const m = new Montagem();
  m.tentar('placa', 'pm-am5-atx');
  assert.equal(m.tentar('cpu', 'cpu-am5-6').skill, 'encaixar_cpu');
  const r = m.concluir('cpu', 'cpu-am5-6', { alinhado: true, entortou: true });
  assert.equal(r.status, 'dano');
  assert.equal(m.estado.placaDanificada, true);
  assert.equal(m.processador(), null);
});

test('desempenho e tempo de inicialização mostram o peso de cada peça', () => {
  const escritorio = montar(ESCRITORIO);
  const gamer = montar(GAMER);
  assert.equal(SimuladorTeste.discoDoSistema(escritorio).nome, 'SSD NVMe');
  assert.ok(SimuladorTeste.desempenho(gamer).total > SimuladorTeste.desempenho(escritorio).total * 2);
  const video = (m) => SimuladorTeste.desempenho(m).partes.find((p) => p.nome === 'Vídeo').pontos;
  assert.ok(video(gamer) > video(escritorio), 'placa de vídeo dedicada vale mais que o vídeo integrado');

  const hd = montar({ ...ESCRITORIO, m2: [], gabinete: 'gab-mid', sata: ['hd-2tb'] });
  assert.equal(SimuladorTeste.discoDoSistema(hd).segundos, 42, 'HD demora muito mais para iniciar');
  const semCabo = montar({ ...ESCRITORIO, m2: [], gabinete: 'gab-mid', sata: ['hd-2tb'] }, { cabos: false });
  assert.equal(SimuladorTeste.discoDoSistema(semCabo), null, 'disco SATA sem cabo não é encontrado');
});
