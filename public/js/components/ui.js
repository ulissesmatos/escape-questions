import { Component } from '../core/Component.js';
import { h } from '../core/dom.js';

/** "Jogando como Ana · 7B [Trocar]" — props: { rotulo, identidade, onTrocar } */
export class PlayerChip extends Component {
  render() {
    const { rotulo = 'Jogando como', identidade } = this.props;
    return h(
      'div',
      { class: 'jogador-chip' },
      h('span', {}, `${rotulo} `, h('strong', { text: `${identidade.participantes} · ${identidade.turma}` })),
      h('button', { type: 'button', text: 'Trocar', onClick: () => this.emitir('Trocar') })
    );
  }
}

/** Botão grande de voltar + migalhas. props: { texto, migalhas: string[], onVoltar } */
export class BackBar extends Component {
  render() {
    const { texto = 'Voltar', migalhas = [] } = this.props;
    const partes = [];
    migalhas.forEach((m, i) => {
      if (i > 0) partes.push(h('span', { 'aria-hidden': 'true', text: '›' }));
      partes.push(i === migalhas.length - 1 ? h('strong', { text: m }) : h('span', { text: m }));
    });

    return h(
      'div',
      { class: 'barra-voltar' },
      h(
        'button',
        { type: 'button', class: 'btn-voltar', onClick: () => this.emitir('Voltar') },
        h('span', { class: 'btn-voltar-seta', 'aria-hidden': 'true', text: '←' }),
        texto
      ),
      partes.length > 0 && h('nav', { class: 'migalhas', 'aria-label': 'Você está em' }, partes)
    );
  }
}

/** Barra de progresso com texto. Use definir() para atualizar sem redesenhar. */
export class ProgressBar extends Component {
  render() {
    this.texto = h('span');
    this.percentual = h('span', { class: 'progresso-percent' });
    this.barra = h('div', { class: 'progresso-barra' });
    const el = h(
      'div',
      { class: `progresso-wrap${this.props.fixa === false ? ' progresso-solta' : ''}` },
      h('div', { class: 'progresso-info' }, this.texto, this.percentual),
      h('div', { class: 'progresso-trilha', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, this.barra)
    );
    this.trilha = el.querySelector('.progresso-trilha');
    this.definir(this.props.feitos || 0, this.props.total || 0, this.props.rotulo || '');
    return el;
  }

  definir(feitos, total, rotulo) {
    const pct = total > 0 ? Math.round((feitos / total) * 100) : 0;
    const completo = total > 0 && feitos >= total;
    this.texto.textContent = rotulo;
    this.percentual.textContent = `${pct}%`;
    this.barra.style.width = `${pct}%`;
    this.barra.classList.toggle('completo', completo);
    this.trilha.setAttribute('aria-valuenow', pct);
  }
}

/** Estado de carregando / vazio / erro reutilizável */
export function estadoCarregando(texto = 'Carregando...') {
  return h('p', { class: 'carregando', role: 'status', text: texto });
}

export function estadoVazio({ icone = '📭', titulo, texto = '', acao = null }) {
  return h(
    'div',
    { class: 'estado-vazio' },
    h('span', { class: 'estado-vazio-icone', 'aria-hidden': 'true', text: icone }),
    h('strong', { text: titulo }),
    texto && h('p', { text: texto }),
    acao
  );
}

/** Aviso flutuante que some sozinho */
export const Toast = {
  mostrar(mensagem, { tipo = 'info', duracao = 3500 } = {}) {
    let pilha = document.querySelector('.toast-pilha');
    if (!pilha) {
      pilha = h('div', { class: 'toast-pilha', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(pilha);
    }
    const toast = h('div', { class: `toast toast-${tipo}`, text: mensagem });
    pilha.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('saindo');
      setTimeout(() => toast.remove(), 300);
    }, duracao);
  },
  sucesso(mensagem) {
    this.mostrar(mensagem, { tipo: 'sucesso' });
  },
  erro(mensagem) {
    this.mostrar(mensagem, { tipo: 'erro', duracao: 5000 });
  },
};
