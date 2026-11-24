import { h } from '../../../core/dom.js';
import { icone } from '../../word/sistema/icones.js';

/**
 * Notificação do Windows (cantinho de baixo, à direita): "Celular · Nova
 * mensagem de ...". Clicar abre o programa. Some sozinha depois de alguns
 * segundos.
 */
export function notificar(sim, { app, titulo, texto, icone: nomeIcone = 'img:phone-48-color', aoClicar = null }) {
  let pilha = sim.tela.querySelector('.win-notificacoes');
  if (!pilha) {
    pilha = h('div', { class: 'win-notificacoes' });
    sim.tela.append(pilha);
  }
  const fechar = () => {
    aviso.classList.add('saindo');
    setTimeout(() => aviso.remove(), 250);
  };
  const aviso = h(
    'button',
    {
      type: 'button',
      class: 'win-notificacao',
      'data-alvo': `notificacao.${app}`,
      onClick: () => {
        fechar();
        const programa = sim.abrirApp(app, { via: 'notificacao' });
        aoClicar?.(programa);
      },
    },
    h('span', { class: 'win-notificacao-app' }, icone(nomeIcone, { tamanho: 16 }), sim.perfil.apps[app]?.nome || app),
    h('strong', { text: titulo }),
    h('span', { text: texto })
  );
  pilha.append(aviso);
  setTimeout(fechar, 9000);
  return aviso;
}
