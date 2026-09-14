/**
 * Roteador simples por hash (#/secao/aba). Recarregar a página e usar o
 * botão voltar mantêm a tela certa.
 */
export class HashRouter {
  constructor({ padrao, aoMudar }) {
    this.padrao = padrao;
    this.aoMudar = aoMudar;
    this.ouvinte = () => this.aoMudar(this.atual());
  }

  iniciar() {
    window.addEventListener('hashchange', this.ouvinte);
    if (!location.hash) history.replaceState(null, '', `#${this.padrao}`);
    this.ouvinte();
  }

  parar() {
    window.removeEventListener('hashchange', this.ouvinte);
  }

  /** @returns {string[]} partes do caminho, ex: ['hardware', 'alunos'] */
  atual() {
    const caminho = decodeURIComponent(location.hash.replace(/^#\/?/, '')) || this.padrao.replace(/^\//, '');
    return caminho.split('/').filter(Boolean);
  }

  ir(caminho, { substituir = false } = {}) {
    const hash = `#${caminho.startsWith('/') ? caminho : `/${caminho}`}`;
    if (location.hash === hash) return;
    if (substituir) {
      history.replaceState(null, '', hash);
      this.ouvinte();
    } else {
      location.hash = hash;
    }
  }
}
