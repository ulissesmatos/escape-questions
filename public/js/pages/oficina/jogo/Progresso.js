import { PEDIDOS } from '../regras/pedidos.js';

const CHAVE = 'oficina:progresso';

/** Progresso do jogador salvo no navegador (moedas e melhores estrelas por pedido). */
export class Progresso {
  constructor(armazenamento = globalThis.localStorage) {
    this.armazenamento = armazenamento;
    this.dados = { moedas: 0, estrelas: {} };
    try {
      const salvo = JSON.parse(this.armazenamento.getItem(CHAVE));
      if (salvo && typeof salvo === 'object') {
        this.dados = { moedas: salvo.moedas || 0, estrelas: salvo.estrelas || {}, melhorMoedas: salvo.melhorMoedas || {} };
      }
    } catch {
      // sem armazenamento: começa do zero
    }
  }

  get moedas() {
    return this.dados.moedas;
  }

  estrelasDe(idPedido) {
    return this.dados.estrelas[idPedido] || 0;
  }

  /** Um pedido é liberado quando o anterior tem pelo menos 1 estrela */
  liberado(idPedido) {
    const indice = PEDIDOS.findIndex((p) => p.id === idPedido);
    return indice <= 0 || this.estrelasDe(PEDIDOS[indice - 1].id) > 0;
  }

  /**
   * Registra um pedido entregue. Repetir o mesmo pedido só rende a diferença
   * para o melhor resultado anterior (não dá para farmar moedas).
   * @returns {number} moedas realmente ganhas
   */
  registrar(idPedido, { estrelas, moedas }) {
    this.dados.melhorMoedas = this.dados.melhorMoedas || {};
    const ganho = Math.max(0, moedas - (this.dados.melhorMoedas[idPedido] || 0));
    this.dados.melhorMoedas[idPedido] = Math.max(moedas, this.dados.melhorMoedas[idPedido] || 0);
    this.dados.moedas += ganho;
    this.dados.estrelas[idPedido] = Math.max(this.estrelasDe(idPedido), estrelas);
    try {
      this.armazenamento.setItem(CHAVE, JSON.stringify(this.dados));
    } catch {
      // armazenamento bloqueado: mantém só na memória
    }
    return ganho;
  }

  proximoPedido(idAtual) {
    const indice = PEDIDOS.findIndex((p) => p.id === idAtual);
    return PEDIDOS[indice + 1] || null;
  }
}
