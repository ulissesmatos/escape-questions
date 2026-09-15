import { peca as buscarPeca } from './catalogo.js';

/**
 * Cada lugar onde uma peça pode ser colocada é um Encaixe. As subclasses
 * definem as regras do mundo real: o que precisa estar montado antes, o que
 * é incompatível (recusa ou dano) e se existe um skill check.
 *
 * Contrato:
 *  - pendencia(m)        → null | { mensagem, alvo } — o que falta montar antes
 *                          (alvo: { categoria } da bandeja ou { botao } da bancada)
 *  - requisito(m)        → só a mensagem da pendência
 *  - aceitaPeca(peca)    → a peça serviria aqui (usado para explicar pendências)
 *  - verificar(m, peca)  → null | { status: 'recusado' | 'dano', mensagem, ... }
 *  - skill(m, peca)      → null | nome do skill check
 *  - aplicar(m, peca, resultadoSkill) → { status, mensagem }
 *  - bloqueioRemocao(m)  → mensagem se não pode remover agora
 *  - aoRemover(m)        → efeitos colaterais da remoção
 */
export class Encaixe {
  constructor(id, { categorias, rotulo, vista }) {
    this.id = id;
    this.categorias = categorias;
    this.rotulo = rotulo;
    this.vista = vista; // 'placa' (na placa-mãe) ou 'gabinete'
  }

  aceitaCategoria(peca) {
    return this.categorias.includes(peca.categoria);
  }

  aceitaPeca(peca) {
    return this.aceitaCategoria(peca);
  }

  /** O encaixe existe na montagem atual? (ex: slot de RAM 3 só em placas com 4 slots) */
  existe(m) { // eslint-disable-line no-unused-vars
    return true;
  }

  pendencia(m) { // eslint-disable-line no-unused-vars
    return null;
  }

  requisito(m) {
    const pendencia = this.pendencia(m);
    return pendencia ? pendencia.mensagem : null;
  }

  verificar(m, peca) { // eslint-disable-line no-unused-vars
    return null;
  }

  skill(m, peca) { // eslint-disable-line no-unused-vars
    return null;
  }

  aplicar(m, peca) {
    m.estado.pecas[this.id] = peca.id;
    return { status: 'ok', mensagem: `${peca.nome} instalada.` };
  }

  bloqueioRemocao(m) { // eslint-disable-line no-unused-vars
    return null;
  }

  aoRemover(m) {} // eslint-disable-line no-unused-vars
}

const recusa = (mensagem, tipo) => ({ status: 'recusado', mensagem, tipo });
const falta = (mensagem, alvo = null) => ({ mensagem, alvo });
const faltaPlacaMae = () => falta('Coloque a placa-mãe na bancada primeiro.', { categoria: 'placa_mae' });
const faltaGabinete = () => falta('Coloque um gabinete na bancada primeiro.', { categoria: 'gabinete' });

export class EncaixePlacaMae extends Encaixe {
  constructor() {
    super('placa', { categorias: ['placa_mae'], rotulo: 'Placa-mãe', vista: 'placa' });
  }

  bloqueioRemocao(m) {
    if (m.estado.placaNoGabinete) return 'Tire a placa-mãe do gabinete antes.';
    if (m.algumInstalado(['cpu', 'ram-0', 'ram-1', 'ram-2', 'ram-3', 'm2-0', 'm2-1'])) {
      return 'Remova processador, memórias e SSD M.2 da placa antes de trocá-la.';
    }
    return null;
  }

  aoRemover(m) {
    if (m.estado.placaDanificada) {
      m.estado.prejuizo += buscarPeca(m.estado.pecas.placa).preco;
      m.estado.placaDanificada = false;
    }
  }
}

export class EncaixeProcessador extends Encaixe {
  constructor() {
    super('cpu', { categorias: ['cpu'], rotulo: 'Socket do processador', vista: 'placa' });
  }

  pendencia(m) {
    if (!m.estado.pecas.placa) return faltaPlacaMae();
    if (m.estado.placaDanificada) return falta('Os pinos do socket estão tortos. Arraste a placa-mãe estragada para a bandeja e pegue outra.');
    return null;
  }

  verificar(m, peca) {
    const placa = m.placa();
    if (placa.socket !== peca.socket) {
      return {
        status: 'dano',
        tipo: 'pinos_tortos',
        mensagem: `Não encaixa! O processador é ${peca.socket} e o socket da placa é ${placa.socket}. Ao forçar, os pinos entortaram.`,
      };
    }
    return null;
  }

  skill() {
    return 'alinhar_cpu';
  }

  aplicar(m, peca, resultado = {}) {
    if (resultado.alinhado === false) {
      m.danificarPlaca('pinos_tortos', 'O processador foi colocado virado (a seta dourada não estava alinhada) e os pinos entortaram.');
      return { status: 'dano', tipo: 'pinos_tortos', mensagem: 'Seta desalinhada: os pinos entortaram!' };
    }
    return super.aplicar(m, peca);
  }

  bloqueioRemocao(m) {
    return m.estado.pecas.cooler ? 'Tire o cooler antes de remover o processador.' : null;
  }

  aoRemover(m) {
    m.estado.pasta = 'nenhuma';
  }
}

/** A pasta térmica é aplicada sobre o processador (é uma ferramenta, não uma compra). */
export class EncaixePasta extends Encaixe {
  constructor() {
    super('pasta', { categorias: ['ferramenta'], rotulo: 'Pasta térmica', vista: 'placa' });
  }

  pendencia(m) {
    if (!m.estado.pecas.cpu) return falta('A pasta térmica vai em cima do processador. Instale o processador primeiro.', { categoria: 'cpu' });
    if (m.estado.pecas.cooler) return falta('O cooler já está no lugar. Para passar pasta, tire o cooler.');
    return null;
  }

  skill() {
    return 'pasta';
  }

  aplicar(m, peca, { quantidade = 0 } = {}) {
    let pasta = 'ideal';
    if (quantidade < 0.2) pasta = 'pouca';
    else if (quantidade > 0.6) pasta = 'demais';
    m.estado.pasta = pasta;
    const mensagens = {
      ideal: 'Pasta na medida certa (um "grão de ervilha").',
      pouca: 'Pouca pasta: talvez não cubra o processador todo.',
      demais: 'Pasta demais: vai escorrer pelas bordas.',
    };
    return { status: 'ok', mensagem: mensagens[pasta], pasta };
  }
}

export class EncaixeCooler extends Encaixe {
  constructor() {
    super('cooler', { categorias: ['cooler'], rotulo: 'Cooler', vista: 'placa' });
  }

  pendencia(m) {
    return m.estado.pecas.cpu ? null : falta('O cooler vai em cima do processador. Instale o processador primeiro.', { categoria: 'cpu' });
  }

  skill() {
    return 'parafusos';
  }

  aplicar(m, peca, { emX = true } = {}) {
    super.aplicar(m, peca);
    m.estado.parafusosEmX = emX;
    return {
      status: 'ok',
      mensagem: emX ? 'Cooler bem preso.' : 'Parafusos apertados fora de ordem: a pressão ficou desigual.',
    };
  }

  aoRemover(m) {
    // Ao tirar o cooler, a pasta velha precisa ser limpa e reaplicada
    m.estado.pasta = 'nenhuma';
    m.estado.parafusosEmX = true;
  }
}

export class EncaixeMemoria extends Encaixe {
  constructor(indice) {
    super(`ram-${indice}`, { categorias: ['ram'], rotulo: `Slot de memória ${indice + 1}`, vista: 'placa' });
    this.indice = indice;
  }

  existe(m) {
    const placa = m.placa();
    return Boolean(placa) && this.indice < placa.slotsRam;
  }

  pendencia(m) {
    return m.estado.pecas.placa ? null : faltaPlacaMae();
  }

  verificar(m, peca) {
    const placa = m.placa();
    if (placa.tipoRam !== peca.tipoRam) {
      return recusa(`Não encaixa: a placa usa ${placa.tipoRam} e o pente é ${peca.tipoRam}. O entalhe fica em outra posição.`, 'ram_incompativel');
    }
    return null;
  }
}

export class EncaixeM2 extends Encaixe {
  constructor(indice) {
    super(`m2-${indice}`, { categorias: ['armazenamento'], rotulo: `Slot M.2 ${indice + 1}`, vista: 'placa' });
    this.indice = indice;
  }

  existe(m) {
    const placa = m.placa();
    return Boolean(placa) && this.indice < placa.slotsM2;
  }

  aceitaPeca(peca) {
    return super.aceitaPeca(peca) && peca.interface === 'nvme';
  }

  pendencia(m) {
    return m.estado.pecas.placa ? null : faltaPlacaMae();
  }

  verificar(m, peca) {
    if (peca.interface !== 'nvme') {
      return recusa(`${peca.nome} não é M.2: ele vai na baia SATA do gabinete.`, 'interface_errada');
    }
    return null;
  }
}

export class EncaixeGabinete extends Encaixe {
  constructor() {
    super('gabinete', { categorias: ['gabinete'], rotulo: 'Gabinete', vista: 'gabinete' });
  }

  bloqueioRemocao(m) {
    if (m.estado.placaNoGabinete || m.algumInstalado(['fonte', 'sata-0', 'sata-1'])) {
      return 'Esvazie o gabinete antes de trocá-lo.';
    }
    return null;
  }
}

export class EncaixePlacaDeVideo extends Encaixe {
  constructor() {
    super('gpu', { categorias: ['gpu'], rotulo: 'Slot PCI Express', vista: 'gabinete' });
  }

  pendencia(m) {
    if (m.estado.placaNoGabinete) return null;
    if (!m.estado.pecas.gabinete) {
      return falta('A placa de vídeo é instalada com a placa-mãe dentro do gabinete. Escolha um gabinete primeiro!', { categoria: 'gabinete' });
    }
    if (!m.estado.pecas.placa) return falta('A placa de vídeo encaixa na placa-mãe. Coloque a placa-mãe primeiro.', { categoria: 'placa_mae' });
    return falta('Coloque a placa-mãe dentro do gabinete antes da placa de vídeo.', { botao: 'placa-gabinete' });
  }

  verificar(m, peca) {
    const gabinete = m.gabinete();
    if (peca.comprimento > gabinete.gpuMax) {
      return recusa(`Não cabe: a placa tem ${peca.comprimento} mm e o gabinete aceita até ${gabinete.gpuMax} mm.`, 'nao_cabe');
    }
    return null;
  }

  aoRemover(m) {
    m.estado.cabos.gpu = false;
  }
}

export class EncaixeFonte extends Encaixe {
  constructor() {
    super('fonte', { categorias: ['fonte'], rotulo: 'Baia da fonte', vista: 'gabinete' });
  }

  pendencia(m) {
    return m.estado.pecas.gabinete ? null : faltaGabinete();
  }

  aoRemover(m) {
    m.desconectarCabos();
  }
}

export class EncaixeSata extends Encaixe {
  constructor(indice) {
    super(`sata-${indice}`, { categorias: ['armazenamento'], rotulo: `Baia SATA ${indice + 1}`, vista: 'gabinete' });
  }

  aceitaPeca(peca) {
    return super.aceitaPeca(peca) && peca.interface === 'sata';
  }

  pendencia(m) {
    return m.estado.pecas.gabinete ? null : faltaGabinete();
  }

  verificar(m, peca) {
    if (peca.interface !== 'sata') {
      return recusa(`${peca.nome} é M.2: ele encaixa direto na placa-mãe, não na baia SATA.`, 'interface_errada');
    }
    return null;
  }

  aoRemover(m) {
    if (!m.algumInstalado(['sata-0', 'sata-1'])) m.estado.cabos.sata = false;
  }
}

export function criarEncaixes() {
  return [
    new EncaixePlacaMae(),
    new EncaixeProcessador(),
    new EncaixePasta(),
    new EncaixeCooler(),
    ...[0, 1, 2, 3].map((i) => new EncaixeMemoria(i)),
    ...[0, 1].map((i) => new EncaixeM2(i)),
    new EncaixeGabinete(),
    new EncaixePlacaDeVideo(),
    new EncaixeFonte(),
    ...[0, 1].map((i) => new EncaixeSata(i)),
  ];
}
