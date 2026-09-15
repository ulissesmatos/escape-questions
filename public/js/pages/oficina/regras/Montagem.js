import { peca as buscarPeca } from './catalogo.js';
import { criarEncaixes } from './encaixes.js';

/**
 * Estado de um PC sendo montado na bancada e as ações possíveis. Não sabe
 * nada de tela: a cena do jogo chama os métodos e desenha o resultado.
 *
 * Fluxo de encaixe:
 *   tentar(encaixe, peca) → 'ok' | 'recusado' | 'dano' | 'skill'
 *   se 'skill': a cena roda o skill check e chama concluir(encaixe, peca, resultado)
 */
export class Montagem {
  constructor() {
    this.encaixes = new Map(criarEncaixes().map((e) => [e.id, e]));
    this.estado = {
      pecas: {}, // idEncaixe → idPeca
      placaNoGabinete: false,
      placaDanificada: false,
      pasta: 'nenhuma', // nenhuma | pouca | ideal | demais
      parafusosEmX: true,
      cabos: { placa: false, cpu: false, gpu: false, sata: false },
      tampaFechada: false,
      prejuizo: 0, // centavos em peças estragadas
      ocorrencias: [], // erros e danos, para o feedback final
    };
  }

  // ---------------- Consultas ----------------

  pecaNo(idEncaixe) {
    const id = this.estado.pecas[idEncaixe];
    return id ? buscarPeca(id) : null;
  }

  placa() {
    return this.pecaNo('placa');
  }

  processador() {
    return this.pecaNo('cpu');
  }

  cooler() {
    return this.pecaNo('cooler');
  }

  gabinete() {
    return this.pecaNo('gabinete');
  }

  placaDeVideo() {
    return this.pecaNo('gpu');
  }

  fonte() {
    return this.pecaNo('fonte');
  }

  memorias() {
    return [0, 1, 2, 3].map((i) => this.pecaNo(`ram-${i}`)).filter(Boolean);
  }

  armazenamentos() {
    return ['m2-0', 'm2-1', 'sata-0', 'sata-1'].map((id) => this.pecaNo(id)).filter(Boolean);
  }

  algumInstalado(ids) {
    return ids.some((id) => Boolean(this.estado.pecas[id]));
  }

  /** Peças instaladas (sem ferramentas), com o encaixe onde estão */
  instaladas() {
    return Object.entries(this.estado.pecas).map(([encaixe, id]) => ({ encaixe, peca: buscarPeca(id) }));
  }

  custoPecas() {
    return this.instaladas().reduce((soma, { peca }) => soma + peca.preco, 0);
  }

  encaixe(id) {
    const e = this.encaixes.get(id);
    if (!e) throw new Error(`Encaixe desconhecido: ${id}`);
    return e;
  }

  /** Encaixes livres que existem e aceitam a categoria da peça (para destacar na tela) */
  encaixesPara(idPeca) {
    const p = buscarPeca(idPeca);
    return [...this.encaixes.values()].filter((e) => e.aceitaCategoria(p) && e.existe(this) && !this.estado.pecas[e.id]);
  }

  /**
   * Por que a peça não tem onde encaixar agora? Devolve a primeira pendência
   * ({ mensagem, alvo }) dos encaixes onde ela serviria, ou null.
   */
  pendenciaPara(idPeca) {
    const p = buscarPeca(idPeca);
    for (const e of this.encaixes.values()) {
      const pendencia = e.aceitaPeca(p) ? e.pendencia(this) : null;
      if (pendencia) return pendencia;
    }
    return null;
  }

  // ---------------- Ações ----------------

  tentar(idEncaixe, idPeca) {
    const e = this.encaixe(idEncaixe);
    const p = buscarPeca(idPeca);

    if (this.estado.tampaFechada && e.vista === 'gabinete') return this.recusar('Abra a tampa do gabinete primeiro.', 'tampa_fechada');
    if (this.estado.tampaFechada && e.vista === 'placa' && this.estado.placaNoGabinete) {
      return this.recusar('Abra a tampa do gabinete primeiro.', 'tampa_fechada');
    }
    if (!e.aceitaCategoria(p)) return this.recusar(`${p.nome} não vai em ${e.rotulo.toLowerCase()}.`, 'lugar_errado');
    if (!e.existe(this)) return this.recusar(`Esta placa não tem ${e.rotulo.toLowerCase()}.`, 'lugar_errado');
    if (this.estado.pecas[e.id]) return this.recusar(`${e.rotulo} já está ocupado.`, 'ocupado');

    const requisito = e.requisito(this);
    if (requisito) return this.recusar(requisito, 'ordem');

    const problema = e.verificar(this, p);
    if (problema && problema.status === 'dano') {
      this.danificarPlaca(problema.tipo, problema.mensagem);
      return problema;
    }
    if (problema) return this.recusar(problema.mensagem, problema.tipo);

    const skill = e.skill(this, p);
    if (skill) return { status: 'skill', skill };
    return e.aplicar(this, p);
  }

  concluir(idEncaixe, idPeca, resultadoSkill = {}) {
    return this.encaixe(idEncaixe).aplicar(this, buscarPeca(idPeca), resultadoSkill);
  }

  remover(idEncaixe) {
    const e = this.encaixe(idEncaixe);
    const idPeca = this.estado.pecas[idEncaixe];
    if (!idPeca) return { status: 'recusado', mensagem: 'Não há peça aqui.' };
    if (this.estado.tampaFechada && (e.vista === 'gabinete' || this.estado.placaNoGabinete)) {
      return { status: 'recusado', mensagem: 'Abra a tampa do gabinete primeiro.' };
    }
    const bloqueio = e.bloqueioRemocao(this);
    if (bloqueio) return { status: 'recusado', mensagem: bloqueio };

    const estragada = idEncaixe === 'placa' && this.estado.placaDanificada;
    e.aoRemover(this);
    delete this.estado.pecas[idEncaixe];
    return { status: 'ok', idPeca, estragada, mensagem: estragada ? 'Placa danificada descartada (prejuízo).' : 'Peça removida.' };
  }

  danificarPlaca(tipo, mensagem) {
    this.estado.placaDanificada = true;
    this.registrar(tipo, mensagem, { dano: true });
  }

  registrar(tipo, mensagem, { dano = false } = {}) {
    this.estado.ocorrencias.push({ tipo, mensagem, dano });
  }

  recusar(mensagem, tipo) {
    return { status: 'recusado', mensagem, tipo };
  }

  colocarPlacaNoGabinete() {
    const placa = this.placa();
    const gabinete = this.gabinete();
    if (!placa) return this.recusar('Não há placa-mãe na bancada.', 'ordem');
    if (!gabinete) return this.recusar('Coloque um gabinete na bancada primeiro.', 'ordem');
    if (this.estado.placaNoGabinete) return this.recusar('A placa já está no gabinete.', 'ocupado');
    if (this.estado.tampaFechada) return this.recusar('Abra a tampa do gabinete primeiro.', 'tampa_fechada');
    if (!gabinete.formatos.includes(placa.formato)) {
      this.registrar('nao_cabe', `A placa ${placa.formato} não cabe no ${gabinete.nome}.`);
      return this.recusar(`Não cabe: a placa é ${placa.formato} e o ${gabinete.nome} aceita ${gabinete.formatos.join(', ')}.`, 'nao_cabe');
    }
    this.estado.placaNoGabinete = true;
    return { status: 'ok', mensagem: 'Placa-mãe parafusada no gabinete.' };
  }

  retirarPlacaDoGabinete() {
    if (!this.estado.placaNoGabinete) return this.recusar('A placa não está no gabinete.', 'ordem');
    if (this.estado.tampaFechada) return this.recusar('Abra a tampa do gabinete primeiro.', 'tampa_fechada');
    if (this.estado.pecas.gpu) return this.recusar('Tire a placa de vídeo antes.', 'ordem');
    this.estado.placaNoGabinete = false;
    this.estado.cabos.placa = false;
    this.estado.cabos.cpu = false;
    return { status: 'ok', mensagem: 'Placa-mãe de volta na bancada.' };
  }

  /** Cabos que existem para conectar agora (usado pelo skill check de cabos) */
  cabosDisponiveis() {
    const cabos = [];
    if (!this.fonte()) return cabos;
    if (this.estado.placaNoGabinete) cabos.push('placa', 'cpu');
    const gpu = this.placaDeVideo();
    if (gpu && gpu.cabosEnergia > 0) cabos.push('gpu');
    if (this.algumInstalado(['sata-0', 'sata-1'])) cabos.push('sata');
    return cabos;
  }

  conectarCabos(conectados = {}) {
    if (!this.fonte()) return this.recusar('Instale a fonte antes de ligar os cabos.', 'ordem');
    if (this.estado.tampaFechada) return this.recusar('Abra a tampa do gabinete primeiro.', 'tampa_fechada');
    const disponiveis = this.cabosDisponiveis();
    for (const cabo of disponiveis) {
      if (cabo in conectados) this.estado.cabos[cabo] = Boolean(conectados[cabo]);
    }
    return { status: 'ok', mensagem: 'Cabos conectados.' };
  }

  desconectarCabos() {
    this.estado.cabos = { placa: false, cpu: false, gpu: false, sata: false };
  }

  fecharTampa() {
    if (!this.gabinete()) return this.recusar('Não há gabinete para fechar.', 'ordem');
    this.estado.tampaFechada = true;
    return { status: 'ok', mensagem: 'Tampa fechada.' };
  }

  abrirTampa() {
    this.estado.tampaFechada = false;
    return { status: 'ok', mensagem: 'Tampa aberta.' };
  }

  /** Resumo usado pelos requisitos dos pedidos */
  ramTotalGb() {
    return this.memorias().reduce((s, p) => s + p.gb, 0);
  }

  armazenamentoTotalGb({ somenteSsd = false } = {}) {
    return this.armazenamentos()
      .filter((p) => !somenteSsd || p.ssd)
      .reduce((s, p) => s + p.gb, 0);
  }

  /** Dois pentes iguais em slots de dual channel */
  dualChannel() {
    const placa = this.placa();
    if (!placa) return false;
    const pares = placa.slotsRam === 4 ? ['ram-1', 'ram-3'] : ['ram-0', 'ram-1'];
    const [a, b] = pares.map((id) => this.estado.pecas[id]);
    return Boolean(a) && a === b;
  }
}
