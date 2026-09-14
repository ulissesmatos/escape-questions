import { Component } from '../../core/Component.js';
import { h } from '../../core/dom.js';

/**
 * Mostra ao aluno o nível de desafio atual (1 a 5) e a sequência de acertos,
 * para ele perceber que as perguntas se adaptam ao desempenho.
 * props: { perfil: { dificuldade, rotulo, sequenciaAcertos } }
 */
export class SkillMeter extends Component {
  render() {
    this.pontos = h('span', { class: 'medidor-pontos', 'aria-hidden': 'true' });
    this.rotulo = h('strong');
    this.sequencia = h('span', { class: 'medidor-sequencia' });
    const el = h(
      'div',
      { class: 'medidor-desafio', title: 'As perguntas ficam mais difíceis quando você acerta e mais fáceis quando erra' },
      h('span', { class: 'medidor-rotulo' }, 'Desafio: ', this.rotulo),
      this.pontos,
      this.sequencia
    );
    this.definir(this.props.perfil);
    return el;
  }

  definir(perfil) {
    if (!perfil) return;
    this.pontos.replaceChildren(
      ...[1, 2, 3, 4, 5].map((n) => h('span', { class: `medidor-ponto${n <= perfil.dificuldade ? ' ativo' : ''}` }))
    );
    this.rotulo.textContent = perfil.rotulo;
    this.sequencia.textContent = perfil.sequenciaAcertos >= 2 ? `🔥 ${perfil.sequenciaAcertos} seguidas` : '';
  }
}
