// Tela inicial: os mundos e as fases, com as estrelas já conquistadas.

import { h, substituirFilhos } from '../../../core/dom.js';
import { BLOCOS, nomeCurto } from '../regras/blocos.js';
import { FASES, MUNDOS } from '../regras/fases.js';

function estrelasTexto(n) {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

export class TelaMapa {
  constructor({ alvo, progresso, aoAbrirFase }) {
    this.alvo = alvo;
    this.progresso = progresso;
    this.aoAbrirFase = aoAbrirFase;
  }

  montar() {
    const { progresso } = this;
    const mundos = MUNDOS.map((mundo) => {
      const fases = FASES.map((fase, indice) => ({ fase, indice })).filter(({ fase }) => fase.mundo === mundo.numero);
      const novos = fases.flatMap(({ fase }) => fase.novos || []);
      return h(
        'section',
        { class: `mundo mundo-${mundo.numero}` },
        h(
          'div',
          { class: 'mundo-cabeca' },
          h('span', { class: 'mundo-icone', 'aria-hidden': 'true', text: mundo.icone }),
          h('div', {}, h('h3', { text: `Mundo ${mundo.numero}: ${mundo.titulo}` }), h('p', { text: mundo.descricao })),
          h(
            'div',
            { class: 'mundo-blocos', title: 'Blocos novos neste mundo' },
            novos.map((tipo) => h('span', { class: `chip-bloco cat-${BLOCOS[tipo].categoria}`, text: `${BLOCOS[tipo].icone} ${nomeCurto(tipo)}` }))
          )
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
                class: `fase-botao${liberada ? '' : ' bloqueada'}${estrelas ? ' concluida' : ''}`,
                disabled: !liberada,
                onClick: () => this.aoAbrirFase(indice),
              },
              h('span', { class: 'fase-botao-numero', text: liberada ? fase.id : '🔒' }),
              h('span', { class: 'fase-botao-titulo', text: fase.titulo }),
              h('span', { class: 'fase-botao-estrelas', 'aria-label': `${estrelas} de 3 estrelas`, text: estrelasTexto(estrelas) })
            );
          })
        )
      );
    });

    substituirFilhos(
      this.alvo,
      h(
        'div',
        { class: 'horta-mapa' },
        h(
          'div',
          { class: 'mapa-topo' },
          h('div', {}, h('h2', { text: 'Escolha uma fase' }), h('p', { text: 'Cada fase liberada abre a próxima. Tente pegar as 3 estrelas!' })),
          h('div', { class: 'mapa-total', text: `★ ${progresso.total()} / ${FASES.length * 3}` })
        ),
        mundos
      )
    );
  }

  destruir() {}
}
