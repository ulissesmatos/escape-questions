const crypto = require('crypto');

/**
 * Gerador de números aleatórios com semente (mulberry32). Com a mesma semente
 * gera sempre a mesma sequência — útil em testes; em produção a semente vem
 * de crypto, então cada desafio sai embaralhado de um jeito diferente.
 */
class Random {
  constructor(semente = crypto.randomInt(0, 2 ** 32)) {
    this.estado = semente >>> 0;
  }

  /** Número em [0, 1) */
  next() {
    this.estado = (this.estado + 0x6d2b79f5) >>> 0;
    let t = this.estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Inteiro em [min, max] */
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick(lista) {
    return lista[Math.floor(this.next() * lista.length)];
  }

  /** Nova lista embaralhada (Fisher–Yates); não altera a original */
  shuffle(lista) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  /** `quantidade` elementos distintos sorteados da lista */
  sample(lista, quantidade) {
    return this.shuffle(lista).slice(0, Math.max(0, quantidade));
  }

  /** Identificador curto e opaco (não revela posição nem ordem) */
  token(tamanho = 6) {
    const alfabeto = 'abcdefghijkmnpqrstuvwxyz23456789';
    let saida = '';
    for (let i = 0; i < tamanho; i++) saida += alfabeto[Math.floor(this.next() * alfabeto.length)];
    return saida;
  }

  /** Lista de tokens únicos */
  tokens(quantidade, tamanho = 6) {
    const usados = new Set();
    while (usados.size < quantidade) usados.add(this.token(tamanho));
    return [...usados];
  }
}

module.exports = Random;
