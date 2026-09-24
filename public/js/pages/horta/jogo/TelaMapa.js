// Tela inicial: os mundos e as fases, com as estrelas já conquistadas.

import { h, substituirFilhos } from '../../../core/dom.js';
import { BLOCOS, nomeCurto } from '../regras/blocos.js';
import { FASES, MUNDOS } from '../regras/fases.js';

function estrelasTexto(n) {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

export class TelaMapa {
  constructor({ alvo, topo, progresso, aoAbrirFase }) {
    this.alvo = alvo;
    this.topo = topo;
    this.progresso = progresso;
    this.aoAbrirFase = aoAbrirFase;
  }

  montar() {
    const { progresso } = this;
    // A fase "da vez": a primeira liberada que ainda não tem estrela
    const atual = FASES.findIndex((f, i) => progresso.liberada(i) && !progresso.estrelas(f.id));

    substituirFilhos(this.topo, h('h1', { class: 'topo-fase-titulo', text: 'Escolha uma fase' }));

    const mundos = MUNDOS.map((mundo) => {
      const fases = FASES.map((fase, indice) => ({ fase, indice })).filter(({ fase }) => fase.mundo === mundo.numero);
      const novos = fases.flatMap(({ fase }) => fase.novos || []);
      const aberto = progresso.liberada(fases[0].indice);
      const ganhas = fases.reduce((soma, { fase }) => soma + progresso.estrelas(fase.id), 0);
      return h(
        'section',
        { class: `painel mundo mundo-${mundo.numero}${aberto ? '' : ' fechado'}` },
        h(
          'div',
          { class: 'mundo-cabeca' },
          h('span', { class: 'mundo-icone', 'aria-hidden': 'true', text: aberto ? mundo.icone : '🔒' }),
          h(
            'div',
            { class: 'mundo-textos' },
            h('span', { class: 'mundo-numero', text: `Mundo ${mundo.numero}` }),
            h('h2', { text: mundo.titulo }),
            h('p', { text: mundo.descricao })
          ),
          h('span', { class: 'mundo-estrelas', text: `★ ${ganhas}/${fases.length * 3}` })
        ),
        h(
          'div',
          { class: 'mundo-blocos', title: 'Blocos novos neste mundo' },
          h('span', { class: 'mundo-blocos-rotulo', text: 'Blocos novos:' }),
          novos.map((tipo) => h('span', { class: `chip-bloco cat-${BLOCOS[tipo].categoria}`, text: `${BLOCOS[tipo].icone} ${nomeCurto(tipo)}` }))
        ),
        h(
          'div',
          { class: 'mundo-fases' },
          fases.map(({ fase, indice }) => {
            const liberada = progresso.liberada(indice);
            const estrelas = progresso.estrelas(fase.id);
            return h(
              'button',
              {
                type: 'button',
                class: `fase-botao${liberada ? '' : ' bloqueada'}${estrelas ? ' concluida' : ''}${indice === atual ? ' atual' : ''}`,
                disabled: !liberada,
                title: liberada ? fase.titulo : 'Complete a fase anterior para liberar',
                onClick: () => this.aoAbrirFase(indice),
              },
              h('span', { class: 'fase-botao-numero', text: liberada ? fase.id : '🔒' }),
              h('span', { class: 'fase-botao-titulo', text: fase.titulo }),
              h('span', { class: 'fase-botao-estrelas', 'aria-label': `${estrelas} de 3 estrelas`, text: estrelasTexto(estrelas) }),
              indice === atual && h('span', { class: 'fase-botao-jogar', text: '▶ Jogar' })
            );
          })
        )
      );
    });

    substituirFilhos(this.alvo, h('div', { class: 'horta-mapa' }, mundos));
  }

  destruir() {}
}
