import { Component } from '../core/Component.js';
import { h } from '../core/dom.js';

/**
 * Base de todas as formas de responder uma pergunta no navegador.
 * Espelha as classes de src/questions no servidor: cada tipo sabe desenhar
 * a área de resposta e montar o objeto de resposta que o servidor corrige.
 *
 * props: { questao, mostrarContexto?=true, onMudar?(view), onEnviar?() }
 */
export class QuestionView extends Component {
  /** Texto do cabeçalho da área de resposta */
  get instrucao() {
    return 'Sua resposta';
  }

  render() {
    const { questao, mostrarContexto = true } = this.props;
    this.zona = h(
      'div',
      { class: 'zona-resposta' },
      h('span', { class: 'zona-resposta-titulo', text: `✏️ ${this.instrucao}` }),
      this.renderResposta()
    );

    return h(
      'div',
      { class: `questao questao-${questao.tipo}` },
      mostrarContexto && questao.enunciado && secao('secao-contexto', '🔎 Pesquise', questao.enunciado),
      questao.pergunta && secao('secao-pergunta', '❓ Sua missão', questao.pergunta),
      this.renderExtra(),
      this.zona
    );
  }

  /** Conteúdo entre a pergunta e a área de resposta (ex: afirmação do V/F) */
  renderExtra() {
    return null;
  }

  /** @abstract @returns {HTMLElement} */
  renderResposta() {
    throw new Error(`${this.constructor.name}.renderResposta() não implementado`);
  }

  /** @abstract Objeto enviado ao servidor, ou null se ainda não respondeu */
  obterResposta() {
    throw new Error(`${this.constructor.name}.obterResposta() não implementado`);
  }

  estaRespondida() {
    return this.obterResposta() !== null;
  }

  mudou() {
    this.emitir('Mudar', this);
  }

  bloquear(bloqueado = true) {
    this.bloqueada = bloqueado;
    this.zona.classList.toggle('bloqueada', bloqueado);
    for (const campo of this.zona.querySelectorAll('input, button, select, textarea')) campo.disabled = bloqueado;
  }

  marcarErro() {
    this.zona.classList.remove('tremer');
    void this.zona.offsetWidth; // reinicia a animação
    this.zona.classList.add('tremer');
  }

  focar() {
    const alvo = this.zona.querySelector('input:not([disabled]), button:not([disabled]), textarea');
    if (alvo) alvo.focus({ preventScroll: true });
  }
}

export function secao(classe, titulo, texto) {
  return h('div', { class: `secao ${classe}` }, h('span', { class: 'secao-titulo', text: titulo }), h('p', { text: texto }));
}
