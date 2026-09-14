/**
 * localStorage/sessionStorage que nunca quebra a página (aba anônima,
 * armazenamento bloqueado, cota cheia...). Valores são salvos como JSON.
 */
export class SafeStorage {
  constructor(tipo = 'local', prefixo = '') {
    this.prefixo = prefixo;
    try {
      this.area = tipo === 'session' ? window.sessionStorage : window.localStorage;
      const teste = '__teste__';
      this.area.setItem(teste, teste);
      this.area.removeItem(teste);
    } catch {
      this.area = null;
    }
  }

  ler(chave, padrao = null) {
    if (!this.area) return padrao;
    try {
      const bruto = this.area.getItem(this.prefixo + chave);
      return bruto === null ? padrao : JSON.parse(bruto);
    } catch {
      return padrao;
    }
  }

  salvar(chave, valor) {
    if (!this.area) return;
    try {
      this.area.setItem(this.prefixo + chave, JSON.stringify(valor));
    } catch {
      // cota cheia ou bloqueado: segue sem salvar
    }
  }

  remover(chave) {
    if (!this.area) return;
    try {
      this.area.removeItem(this.prefixo + chave);
    } catch {
      // nada a fazer
    }
  }
}

export const armazenamentoLocal = new SafeStorage('local');
