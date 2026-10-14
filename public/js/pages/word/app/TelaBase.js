import { h } from '../../../core/dom.js';
import { icone } from '../sistema/icones.js';
import { CAPITULOS, MISSOES, missoesLiberadas, personalizar } from '../regras/missoes.js';
import { CONCEITOS, conceito } from '../regras/conceitos.js';

const estrelas = (n, total = 3) => h('span', { class: 'estrelas', 'aria-label': `${n} de ${total} estrelas` }, Array.from({ length: total }, (_, i) => h('span', { class: i < n ? 'cheia' : 'vazia', text: '★' })));

/**
 * Base da Central: o crachá do aluno, os capítulos com as missões
 * (liberadas, concluídas com estrelas ou bloqueadas), o briefing antes de
 * cada missão e o Manual do Agente (tudo o que já aprendeu, para revisar).
 *
 * props: { sessao, aoJogar(missao), aoTreino(), aoSair() }
 */
export class TelaBase {
  constructor(props) {
    this.props = props;
    this.el = h('section', { class: 'tela-base' });
    this.desenhar();
  }

  desenhar() {
    const { sessao } = this.props;
    const conta = sessao.conta;
    const concluidas = new Set(sessao.concluidas());
    const liberadas = missoesLiberadas([...concluidas], sessao.config);
    const proxima = MISSOES.find((m) => liberadas.has(m.id) && !concluidas.has(m.id)) || null;
    const total = sessao.totalDeEstrelas();

    this.el.replaceChildren(
      h(
        'header',
        { class: 'base-topo' },
        h('a', { href: 'index.html', class: 'base-sair-site', title: 'Voltar para as atividades' }, '⟵'),
        h('div', { class: 'base-marca' }, icone('img:logo-word', { tamanho: 28 }), h('span', {}, h('strong', { text: 'Operação Word' }), h('small', { text: 'Central de treinamento' }))),
        h('div', { class: 'base-espaco' }),
        h('div', { class: 'base-estrelas', title: 'Estrelas conquistadas' }, h('span', { text: '★' }), ` ${total} / ${MISSOES.length * 3}`),
        h('button', { type: 'button', class: 'base-botao', onClick: () => this.abrirManual() }, icone('book_open', { tamanho: 16 }), h('span', { text: 'Manual do Agente' })),
        h('button', { type: 'button', class: 'base-botao', onClick: () => this.props.aoTreino() }, icone('desktop', { tamanho: 16 }), h('span', { text: 'Treino livre' })),
        h(
          'div',
          { class: 'base-cracha' },
          h('span', { class: 'base-avatar', text: (conta.nome || conta.arroba)[0].toUpperCase() }),
          h('span', { class: 'base-cracha-texto' }, h('strong', { text: `@${conta.arroba}` }), h('small', { text: `${conta.nome} · ${conta.turma}` })),
          h('button', { type: 'button', class: 'base-trocar', onClick: () => this.props.aoSair(), title: 'Sair (trocar de agente)' }, 'Sair')
        )
      ),
      sessao.offline ? h('p', { class: 'base-aviso', text: 'Sem conexão com o servidor: seu progresso fica guardado neste computador e é enviado quando a internet voltar.' }) : '',
      h(
        'div',
        { class: 'base-conteudo' },
        this.destaque(proxima, concluidas),
        ...CAPITULOS.map((cap) => this.capitulo(cap, concluidas, liberadas))
      )
    );
  }

  destaque(proxima, concluidas) {
    if (!proxima) {
      return h(
        'div',
        { class: 'base-destaque concluido' },
        icone('img:trofeu', { tamanho: 64 }),
        h('div', {}, h('p', { class: 'base-olho', text: 'OPERAÇÃO CONCLUÍDA' }), h('h1', { text: 'Você completou todas as missões!' }), h('p', { text: 'Repita as missões para conquistar 3 estrelas em todas, ou treine à vontade no Treino livre.' }))
      );
    }
    const cap = CAPITULOS.find((c) => c.numero === proxima.capitulo);
    const indice = MISSOES.indexOf(proxima) + 1;
    return h(
      'div',
      { class: 'base-destaque' },
      icone('img:agente', { tamanho: 72 }),
      h(
        'div',
        { class: 'base-destaque-texto' },
        h('p', { class: 'base-olho', text: concluidas.size ? 'PRÓXIMA MISSÃO' : 'SUA PRIMEIRA MISSÃO' }),
        h('h1', { text: `${indice}. ${proxima.titulo}` }),
        h('p', { text: `Capítulo ${cap.numero} · ${cap.titulo}` })
      ),
      h('button', { type: 'button', class: 'base-jogar', onClick: () => this.abrirBriefing(proxima) }, concluidas.size ? 'Continuar' : 'Começar', icone('arrow_right', { tamanho: 18 }))
    );
  }

  capitulo(cap, concluidas, liberadas) {
    const missoes = MISSOES.filter((m) => m.capitulo === cap.numero);
    const feitas = missoes.filter((m) => concluidas.has(m.id)).length;
    return h(
      'section',
      { class: 'base-capitulo' },
      h(
        'header',
        { class: 'base-capitulo-topo' },
        h('span', { class: 'base-capitulo-icone' }, icone(cap.icone, { tamanho: 26 })),
        h('div', {}, h('h2', { text: `Capítulo ${cap.numero} · ${cap.titulo}` }), h('p', { text: cap.descricao })),
        h('span', { class: 'base-capitulo-progresso', text: `${feitas}/${missoes.length}` })
      ),
      h('div', { class: 'base-missoes' }, missoes.map((m) => this.cartao(m, concluidas.has(m.id), liberadas.has(m.id))))
    );
  }

  cartao(missao, feita, liberada) {
    const indice = MISSOES.indexOf(missao) + 1;
    const el = h(
      'button',
      {
        type: 'button',
        class: `base-missao${feita ? ' feita' : ''}${liberada ? '' : ' bloqueada'}`,
        disabled: !liberada,
        title: liberada ? '' : 'Conclua a missão anterior para liberar',
        onClick: () => this.abrirBriefing(missao),
      },
      h('span', { class: 'base-missao-numero', text: String(indice) }),
      h('strong', { class: 'base-missao-titulo', text: missao.titulo }),
      h(
        'span',
        { class: 'base-missao-conceitos' },
        missao.conceitos.slice(0, 4).map((id) => h('span', { title: conceito(id).titulo }, icone(conceito(id).icone, { tamanho: 16 })))
      ),
      liberada ? estrelas(this.props.sessao.estrelas(missao.id)) : h('span', { class: 'base-cadeado' }, icone('img:cadeado', { tamanho: 18 }), 'Bloqueada'),
      missao.tutorial && h('span', { class: 'base-selo', text: 'Guiada' })
    );
    return el;
  }

  /** Briefing: história, o que vai aprender e os objetivos */
  abrirBriefing(missao) {
    const { sessao } = this.props;
    const cap = CAPITULOS.find((c) => c.numero === missao.capitulo);
    const objetivos = missao.objetivos({ arroba: sessao.conta.arroba });
    const fundo = h('div', { class: 'base-modal-fundo' });
    const fechar = () => fundo.remove();
    fundo.append(
      h(
        'div',
        { class: 'base-modal briefing', role: 'dialog', 'aria-label': missao.titulo },
        h('button', { type: 'button', class: 'base-modal-fechar', 'aria-label': 'Fechar', onClick: fechar }, icone('dismiss', { tamanho: 18 })),
        h('p', { class: 'base-olho', text: `MISSÃO ${MISSOES.indexOf(missao) + 1} · CAPÍTULO ${cap.numero}: ${cap.titulo.toUpperCase()}` }),
        h('h2', { class: 'briefing-titulo', text: missao.titulo }),
        h('p', { class: 'briefing-historia', text: personalizar(missao.historia, { arroba: sessao.conta.arroba }) }),
        missao.tutorial && h('p', { class: 'briefing-guiada' }, icone('cursor_click', { tamanho: 16 }), 'Missão guiada: a Central acende o lugar certo de cada passo. É só seguir a luz.'),
        h('h3', { class: 'briefing-secao', text: 'Nesta missão você vai aprender' }),
        h('div', { class: 'briefing-conceitos' }, missao.conceitos.map((id) => this.cartaoConceito(conceito(id)))),
        h('h3', { class: 'briefing-secao', text: 'Objetivos' }),
        h('ol', { class: 'briefing-objetivos' }, objetivos.map((o) => h('li', { text: o.texto }))),
        h(
          'div',
          { class: 'briefing-acoes' },
          h('button', { type: 'button', class: 'base-botao', text: 'Agora não', onClick: fechar }),
          h('button', {
            type: 'button',
            class: 'base-jogar',
            onClick: () => {
              fechar();
              this.props.aoJogar(missao);
            },
          }, 'Começar missão', icone('arrow_right', { tamanho: 18 }))
        )
      )
    );
    fundo.addEventListener('pointerdown', (e) => e.target === fundo && fechar());
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') {
        fechar();
        document.removeEventListener('keydown', esc);
      }
    });
    this.el.append(fundo);
    fundo.querySelector('.base-jogar')?.focus();
  }

  cartaoConceito(c, { bloqueado = false } = {}) {
    return h(
      'article',
      { class: `cartao-conceito${bloqueado ? ' bloqueado' : ''}` },
      h('span', { class: 'cartao-conceito-icone' }, icone(c.icone, { tamanho: 26 })),
      h(
        'div',
        {},
        h('strong', { text: c.titulo }),
        h('p', { text: c.texto }),
        h('p', { class: 'cartao-conceito-onde' }, icone('cursor_click', { tamanho: 12 }), c.onde),
        c.atalho && h('p', { class: 'cartao-conceito-atalho' }, icone('keyboard', { tamanho: 12 }), c.atalho)
      )
    );
  }

  /** Manual do Agente: conceitos de cada capítulo; os ainda não vistos ficam apagados */
  abrirManual() {
    const vistos = new Set(MISSOES.filter((m) => this.props.sessao.concluidas().includes(m.id)).flatMap((m) => m.conceitos));
    const fundo = h('div', { class: 'base-modal-fundo' });
    const fechar = () => fundo.remove();
    const ordem = [...new Set(MISSOES.flatMap((m) => m.conceitos))];
    const extras = Object.keys(CONCEITOS).filter((id) => !ordem.includes(id));
    fundo.append(
      h(
        'div',
        { class: 'base-modal manual', role: 'dialog', 'aria-label': 'Manual do Agente' },
        h('button', { type: 'button', class: 'base-modal-fechar', 'aria-label': 'Fechar', onClick: fechar }, icone('dismiss', { tamanho: 18 })),
        h('p', { class: 'base-olho', text: 'MANUAL DO AGENTE' }),
        h('h2', { class: 'briefing-titulo', text: 'Tudo o que você já aprendeu' }),
        h('p', { class: 'briefing-historia', text: `${vistos.size} de ${ordem.length + extras.length} assuntos liberados. Os apagados aparecem quando você concluir a missão que ensina cada um.` }),
        ...CAPITULOS.map((cap) => {
          const ids = [...new Set(MISSOES.filter((m) => m.capitulo === cap.numero).flatMap((m) => m.conceitos))];
          return h('section', {}, h('h3', { class: 'briefing-secao', text: `Capítulo ${cap.numero} · ${cap.titulo}` }), h('div', { class: 'briefing-conceitos' }, ids.map((id) => this.cartaoConceito(conceito(id), { bloqueado: !vistos.has(id) }))));
        }),
        extras.length > 0 && h('section', {}, h('h3', { class: 'briefing-secao', text: 'Extras' }), h('div', { class: 'briefing-conceitos' }, extras.map((id) => this.cartaoConceito(conceito(id)))))
      )
    );
    fundo.addEventListener('pointerdown', (e) => e.target === fundo && fechar());
    this.el.append(fundo);
  }
}
