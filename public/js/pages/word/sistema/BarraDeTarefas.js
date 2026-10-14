import { h } from '../../../core/dom.js';
import { icone, ICONE_DO_APP } from './icones.js';
import { dica } from './Dica.js';

const FIXADOS = ['explorador', 'edge', 'word', 'bloco'];
const NOMES = { explorador: 'Explorador de Arquivos', edge: 'Microsoft Edge', word: 'Word', bloco: 'Bloco de Notas', fotos: 'Fotos' };

/**
 * Barra de tarefas do Windows 11: Iniciar, Pesquisar, programas fixados (com
 * o tracinho de "aberto" e o tracinho azul de "ativo"), relógio e o
 * cantinho que mostra a Área de Trabalho.
 */
export class BarraDeTarefas {
  constructor(sim) {
    this.sim = sim;
    this.programas = h('div', { class: 'barra-programas' });
    this.relogio = h('div', { class: 'barra-relogio' });
    this.botaoIniciar = h(
      'button',
      { type: 'button', class: 'barra-botao barra-iniciar', 'data-alvo': 'barra.iniciar', ...dica('Iniciar') , onClick: () => sim.menuIniciar.alternar() },
      icone('img:logo-windows', { tamanho: 24 })
    );
    this.pesquisa = h(
      'button',
      { type: 'button', class: 'barra-pesquisa', 'data-alvo': 'barra.pesquisa', onClick: () => sim.menuIniciar.abrir({ pesquisar: true }) },
      icone('search', { tamanho: 16 }),
      h('span', { text: 'Pesquisar' })
    );
    this.el = h(
      'footer',
      { class: 'barra-tarefas' },
      h('div', { class: 'barra-centro' }, this.botaoIniciar, this.pesquisa, this.programas),
      h(
        'div',
        { class: 'barra-bandeja' },
        h('button', { type: 'button', class: 'barra-bandeja-botao', ...dica('Mostrar ícones ocultos') }, icone('chevron_up', { tamanho: 16 })),
        h('div', { class: 'barra-bandeja-botao barra-status', 'aria-label': 'Rede, som e bateria' }, icone('wifi_1', { tamanho: 16 }), icone('speaker_2', { tamanho: 16 }), icone('battery_10', { tamanho: 16 })),
        this.relogio,
        h('button', { type: 'button', class: 'barra-mostrar-area', 'data-alvo': 'barra.areaDeTrabalho', ...dica('Mostrar a área de trabalho'), onClick: () => sim.mostrarAreaDeTrabalho() })
      )
    );
    this.atualizarRelogio();
    this.intervalo = setInterval(() => this.atualizarRelogio(), 15000);
    this.atualizar();
  }

  atualizarRelogio() {
    if (!this.el.isConnected && this.iniciado) return clearInterval(this.intervalo);
    this.iniciado = true;
    const agora = new Date();
    this.relogio.replaceChildren(
      h('span', { text: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }),
      h('span', { text: agora.toLocaleDateString('pt-BR') })
    );
  }

  atualizar() {
    const abertos = Object.entries(this.sim.apps)
      .filter(([, app]) => !app.janela.fechada)
      .map(([id]) => id);
    const lista = [...FIXADOS, ...abertos.filter((id) => !FIXADOS.includes(id))];
    this.programas.replaceChildren(
      ...lista.map((id) => {
        const app = this.sim.apps[id];
        const aberto = abertos.includes(id);
        const ativo = aberto && app.janela.ativa && !app.janela.minimizada;
        return h(
          'button',
          {
            type: 'button',
            class: `barra-botao barra-app${aberto ? ' aberto' : ''}${ativo ? ' ativo' : ''}`,
            'data-alvo': `barra.${id}`,
            ...dica(aberto && app.janela.tituloTexto?.textContent ? app.janela.tituloTexto.textContent : NOMES[id]),
            onClick: () => this.sim.alternarApp(id),
          },
          icone(ICONE_DO_APP[id], { tamanho: 24 }),
          h('span', { class: 'barra-indicador' })
        );
      })
    );
    this.botaoIniciar.classList.toggle('ativo', Boolean(this.sim.menuIniciar?.aberto));
  }
}
