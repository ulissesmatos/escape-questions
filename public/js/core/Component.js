/**
 * Base de todos os componentes de interface.
 *
 * - `render()` devolve o elemento raiz (implementado pelas subclasses)
 * - `montar(alvo?)` cria o elemento, chama `aoMontar()` e anexa ao alvo
 * - `atualizar(props)` mescla props e redesenha (troca o elemento raiz)
 * - `ouvir(alvo, evento, fn)` registra listeners que são removidos no `destruir()`
 * - `emitir('Evento', dados)` chama `props.onEvento(dados)` se existir
 */
export class Component {
  constructor(props = {}) {
    this.props = props;
    this.el = null;
    this.limpezas = [];
  }

  /** @abstract @returns {HTMLElement} */
  render() {
    throw new Error(`${this.constructor.name}.render() não implementado`);
  }

  /** Chamado depois que o elemento é criado (antes de ir para a página) */
  aoMontar() {}

  montar(alvo = null) {
    this.el = this.render();
    this.aoMontar();
    if (alvo) alvo.appendChild(this.el);
    return this.el;
  }

  atualizar(novasProps = {}) {
    Object.assign(this.props, novasProps);
    if (!this.el) return;
    const antigo = this.el;
    this.el = this.render();
    this.aoMontar();
    antigo.replaceWith(this.el);
  }

  ouvir(alvo, evento, fn, opcoes) {
    alvo.addEventListener(evento, fn, opcoes);
    this.limpezas.push(() => alvo.removeEventListener(evento, fn, opcoes));
  }

  /** setTimeout/setInterval que são cancelados automaticamente no destruir() */
  agendar(fn, ms, { repetir = false } = {}) {
    const id = repetir ? setInterval(fn, ms) : setTimeout(fn, ms);
    this.limpezas.push(() => (repetir ? clearInterval(id) : clearTimeout(id)));
    return id;
  }

  emitir(evento, dados) {
    const handler = this.props[`on${evento}`];
    if (typeof handler === 'function') return handler(dados);
    return undefined;
  }

  destruir() {
    this.limpezas.splice(0).forEach((limpar) => limpar());
    if (this.el) this.el.remove();
    this.el = null;
  }
}
