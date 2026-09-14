import { Component } from '../../core/Component.js';
import { h } from '../../core/dom.js';

/** Abas. props: { abas: [{ id, rotulo, contador? }], ativa, onTrocar(id) } */
export class Tabs extends Component {
  render() {
    const { abas, ativa } = this.props;
    return h(
      'div',
      { class: 'abas', role: 'tablist' },
      abas.map((aba) =>
        h(
          'button',
          {
            type: 'button',
            role: 'tab',
            class: `aba${aba.id === ativa ? ' ativa' : ''}`,
            'aria-selected': aba.id === ativa ? 'true' : 'false',
            onClick: () => this.emitir('Trocar', aba.id),
          },
          aba.rotulo,
          aba.contador ? h('span', { class: 'aba-contador', text: String(aba.contador) }) : null
        )
      )
    );
  }
}

/** Filtro de turma reutilizado nas seções. props: { api, valor, onMudar(turma) } */
export class TurmaFilter extends Component {
  render() {
    this.select = h('select', { class: 'filtro-select', 'aria-label': 'Filtrar por turma' }, h('option', { value: '', text: 'Todas as turmas' }));
    this.ouvir(this.select, 'change', () => this.emitir('Mudar', this.select.value));
    this.carregar();
    return h('label', { class: 'filtro' }, h('span', { class: 'filtro-rotulo', text: 'Turma' }), this.select);
  }

  async carregar() {
    try {
      const turmas = await this.props.api.get('/turmas');
      this.select.append(...turmas.map((t) => h('option', { value: t, text: t })));
      this.select.value = this.props.valor || '';
    } catch {
      // sem turmas: fica só "Todas"
    }
  }
}

/** Cartão de número do painel */
export function statCard({ icone, rotulo, valor, detalhe = '', destaque = '' }) {
  return h(
    'div',
    { class: `stat-card ${destaque}` },
    h('span', { class: 'stat-icone', 'aria-hidden': 'true', text: icone }),
    h('div', {}, h('span', { class: 'stat-rotulo', text: rotulo }), h('strong', { class: 'stat-valor', text: String(valor) }), detalhe && h('span', { class: 'stat-detalhe', text: detalhe }))
  );
}

export function badge(texto, tipo = '') {
  return h('span', { class: `badge ${tipo ? `badge-${tipo}` : ''}`, text: texto });
}

export function pontosDificuldade(nivel, rotulo = '') {
  return h(
    'span',
    { class: 'dificuldade', title: rotulo ? `Dificuldade: ${rotulo}` : null },
    h('span', { class: 'medidor-pontos', 'aria-hidden': 'true' }, [1, 2, 3, 4, 5].map((n) => h('span', { class: `medidor-ponto${n <= Math.round(nivel) ? ' ativo' : ''}` }))),
    rotulo && h('span', { class: 'dificuldade-rotulo', text: rotulo })
  );
}

export function miniBarra(feitos, total, { rotulo = '' } = {}) {
  const pct = total > 0 ? Math.round((feitos / total) * 100) : 0;
  return h(
    'span',
    { class: `mini-barra${pct === 100 ? ' completa' : ''}`, title: `${feitos} de ${total}` },
    rotulo && h('span', { class: 'mini-barra-rotulo', text: rotulo }),
    h('span', { class: 'mini-barra-trilha' }, h('span', { style: { width: `${pct}%` } })),
    h('span', { class: 'mini-barra-valor', text: `${feitos}/${total}` })
  );
}

/** Cabeçalho de seção com título, descrição e ações */
export function cabecalhoSecao({ titulo, descricao = '', acoes = [] }) {
  return h(
    'div',
    { class: 'secao-admin-cabecalho' },
    h('div', {}, h('h1', { text: titulo }), descricao && h('p', { text: descricao })),
    acoes.length > 0 && h('div', { class: 'secao-admin-acoes' }, acoes)
  );
}

/** Barra de filtros */
export function barraFiltros(...filtros) {
  return h('div', { class: 'barra-filtros' }, filtros);
}

export function campoBusca({ placeholder = 'Buscar...', onBuscar }) {
  let timer;
  const input = h('input', { type: 'search', class: 'filtro-busca', placeholder, 'aria-label': placeholder });
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => onBuscar(input.value.trim().toLowerCase()), 200);
  });
  return input;
}

/** Baixa um CSV gerado no navegador (abre no Excel/Planilhas) */
export function baixarCsv(nomeArquivo, cabecalho, linhas) {
  const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const conteudo = [cabecalho, ...linhas].map((l) => l.map(escapar).join(';')).join('\r\n');
  const blob = new Blob([`﻿${conteudo}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = h('a', { href: url, download: nomeArquivo });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
