/**
 * Controla "telas" de uma página (identificação → lista → detalhe...)
 * usando o histórico do navegador, para que o botão voltar do navegador e
 * do celular funcione igual ao botão "Voltar" da página.
 */
export class ScreenFlow {
  /**
   * @param {{ telas: Record<string, HTMLElement>, aoMostrar?: (nome:string) => void, aoVoltarNoHistorico?: (estado:object) => void }} opcoes
   */
  constructor({ telas, aoMostrar = () => {}, aoVoltarNoHistorico = () => {} }) {
    this.telas = telas;
    this.aoMostrar = aoMostrar;
    this.atual = null;

    // Recarregar numa URL com #algo volta ao começo (o estado não sobrevive ao reload)
    if (location.hash) history.replaceState({}, '', location.pathname + location.search);

    window.addEventListener('popstate', (evento) => aoVoltarNoHistorico(evento.state || {}));
  }

  mostrar(nome) {
    for (const [chave, el] of Object.entries(this.telas)) el.hidden = chave !== nome;
    this.atual = nome;
    this.aoMostrar(nome);
  }

  /** Vai para uma tela criando uma entrada no histórico (ou substituindo a atual) */
  ir(nome, estado = {}, { substituir = false, hash = '' } = {}) {
    const profundidade = (history.state && history.state.profundidade) || 0;
    const novoEstado = { ...estado, tela: nome, profundidade: substituir ? profundidade : profundidade + 1 };
    const url = location.pathname + location.search + (hash ? `#${hash}` : '');
    if (substituir) history.replaceState(novoEstado, '', url);
    else history.pushState(novoEstado, '', url);
    this.mostrar(nome);
  }

  /** Substitui a entrada atual sem avançar no histórico */
  substituir(nome, estado = {}) {
    this.ir(nome, estado, { substituir: true });
  }

  /** Volta uma tela; se não houver para onde voltar no histórico, usa o fallback */
  voltar(fallback) {
    if (history.state && history.state.profundidade > 0) history.back();
    else fallback();
  }
}
