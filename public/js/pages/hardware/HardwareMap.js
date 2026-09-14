import { Component } from '../../core/Component.js';
import { h, svg } from '../../core/dom.js';

/**
 * Mapa de peças conectadas. Calcula o estado de cada peça (bloqueada,
 * liberada ou descoberta) e anima as que acabaram de ser liberadas.
 *
 * props: { componentes, conexoes, descobertos: Set<number>, onEscolher(componente, estado) }
 */
export class HardwareMap extends Component {
  render() {
    this.vizinhos = new Map();
    for (const { deId, paraId } of this.props.conexoes) {
      if (!this.vizinhos.has(deId)) this.vizinhos.set(deId, []);
      if (!this.vizinhos.has(paraId)) this.vizinhos.set(paraId, []);
      this.vizinhos.get(deId).push(paraId);
      this.vizinhos.get(paraId).push(deId);
    }
    this.porId = new Map(this.props.componentes.map((c) => [c.id, c]));
    this.estadosAnteriores = new Map();

    this.linhas = svg('svg', { class: 'mapa-svg', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    this.nos = h('div', { class: 'mapa-nos' });
    const el = h('div', { class: 'mapa-wrap' }, h('div', { class: 'mapa-area' }, this.linhas, this.nos));
    this.desenhar();
    return el;
  }

  estado(componente) {
    const { descobertos } = this.props;
    if (descobertos.has(componente.id)) return 'descoberto';
    if (componente.inicial) return 'desbloqueado';
    return (this.vizinhos.get(componente.id) || []).some((id) => descobertos.has(id)) ? 'desbloqueado' : 'bloqueado';
  }

  definirDescobertos(descobertos) {
    this.props.descobertos = descobertos;
    this.desenhar();
  }

  desenhar() {
    this.nos.replaceChildren(...this.props.componentes.map((c) => this.no(c)));
    this.linhas.replaceChildren(
      ...this.props.conexoes
        .map(({ deId, paraId }) => [this.porId.get(deId), this.porId.get(paraId)])
        .filter(([a, b]) => a && b)
        .map(([a, b]) => this.linha(a, b))
    );
  }

  no(componente) {
    const estado = this.estado(componente);
    const anterior = this.estadosAnteriores.get(componente.id);
    this.estadosAnteriores.set(componente.id, estado);
    const novo = anterior === 'bloqueado' && estado !== 'bloqueado';

    const bloqueado = estado === 'bloqueado';
    const bolha = h(
      'span',
      { class: 'no-bolha', 'aria-hidden': 'true' },
      !bloqueado && componente.imagem ? h('img', { class: 'no-foto', src: componente.imagem, alt: '', loading: 'lazy' }) : bloqueado ? '🔒' : componente.icone,
      estado === 'descoberto' && h('span', { class: 'no-check', text: '✓' })
    );

    const rotuloAcessivel = {
      bloqueado: 'Peça bloqueada — descubra uma peça vizinha para liberar',
      desbloqueado: `${componente.nome}: liberada, toque para responder`,
      descoberto: `${componente.nome}: já descoberta`,
    }[estado];

    const no = h(
      bloqueado ? 'div' : 'button',
      {
        type: bloqueado ? null : 'button',
        class: `no no-${estado}${novo ? ' no-novo' : ''}`,
        style: { left: `${limitar(componente.posX)}%`, top: `${limitar(componente.posY)}%` },
        'aria-label': rotuloAcessivel,
        title: bloqueado ? 'Descubra uma peça vizinha para liberar' : componente.nome,
        onClick: bloqueado ? null : () => this.emitir('Escolher', { componente, estado }),
      },
      bolha,
      h('span', { class: 'no-label', text: bloqueado ? '???' : componente.nome })
    );
    return no;
  }

  linha(a, b) {
    const ea = this.estado(a);
    const eb = this.estado(b);
    let classe = 'linha-oculta';
    if (ea === 'descoberto' && eb === 'descoberto') classe = 'linha-completa';
    else if (ea !== 'bloqueado' && eb !== 'bloqueado') classe = 'linha-ativa';
    return svg('line', { x1: limitar(a.posX), y1: limitar(a.posY), x2: limitar(b.posX), y2: limitar(b.posY), class: classe });
  }
}

function limitar(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50;
}
