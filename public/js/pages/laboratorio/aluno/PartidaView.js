import { Component } from '../../../core/Component.js';
import { h } from '../../../core/dom.js';
import { SafeStorage } from '../../../core/SafeStorage.js';
import { Cronometro, RankingAnimado, podio, posicaoTexto } from '../comum.js';
import { TarefaCard } from './TarefaCard.js';

/**
 * Tela do aluno durante a partida: barra com pontos, posição e cronômetro,
 * e no corpo a tarefa atual (rodadas), a lista de tarefas (livre), o ranking
 * parcial ou o pódio final.
 *
 * O servidor manda o estado completo a cada mudança. Para não atrapalhar quem
 * está digitando, o corpo só é remontado quando muda a "cena" (fase, tarefa
 * atual); no resto, cada parte se atualiza no lugar.
 *
 * props: { conexao, codigo, alunoId, onErro(mensagem) }
 */
export class PartidaView extends Component {
  render() {
    const { codigo, alunoId } = this.props;
    this.rascunhos = new SafeStorage('local', `laboratorio:${codigo}:${alunoId}:`);
    this.cartoes = new Map();
    this.cena = null;

    this.cronometro = new Cronometro({ conexao: this.props.conexao });
    this.nome = h('strong');
    this.pontos = h('strong', { class: 'stat-numero', text: '0' });
    this.posicao = h('strong', { class: 'stat-numero', text: '-' });
    this.respondidas = h('strong', { class: 'stat-numero', text: '0' });

    const topo = h(
      'header',
      { class: 'partida-topo cartao' },
      h('div', { class: 'partida-quem' }, h('span', { class: 'partida-avatar', 'aria-hidden': 'true', text: '🧑‍🔬' }), h('div', {}, this.nome, h('span', { class: 'partida-sala', text: `Sala ${codigo}` }))),
      h(
        'div',
        { class: 'partida-stats' },
        h('div', { class: 'stat stat-pontos' }, h('span', { class: 'stat-icone', 'aria-hidden': 'true', text: '⭐' }), h('div', {}, this.pontos, h('span', { class: 'stat-rotulo', text: 'pontos' }))),
        h('div', { class: 'stat stat-posicao' }, h('span', { class: 'stat-icone', 'aria-hidden': 'true', text: '🏆' }), h('div', {}, this.posicao, (this.deTotal = h('span', { class: 'stat-rotulo', text: 'no ranking' })))),
        h('div', { class: 'stat' }, h('span', { class: 'stat-icone', 'aria-hidden': 'true', text: '✅' }), h('div', {}, this.respondidas, (this.deTarefas = h('span', { class: 'stat-rotulo', text: 'tarefas' }))))
      ),
      this.cronometro.montar()
    );

    this.corpo = h('div', { class: 'partida-corpo' });
    this.pausa = h(
      'div',
      { class: 'overlay-pausa', hidden: true, role: 'alert' },
      h('div', { class: 'overlay-pausa-card' }, h('span', { class: 'overlay-icone', 'aria-hidden': 'true', text: '⏸️' }), h('strong', { text: 'Partida pausada' }), h('p', { text: 'Tire as mãos do teclado e preste atenção no professor.' }))
    );
    return h('div', { class: 'partida' }, topo, this.corpo, this.pausa);
  }

  destruir() {
    this.cronometro.destruir();
    for (const cartao of this.cartoes.values()) cartao.destruir();
    if (this.ranking) this.ranking.destruir();
    super.destruir();
  }

  definir(estado) {
    this.estado = estado;
    const { sala, eu } = estado;

    this.nome.textContent = eu.nome;
    this.pontos.textContent = String(eu.pontos);
    this.posicao.textContent = sala.totalAlunos ? posicaoTexto(eu.posicao) : '-';
    this.deTotal.textContent = `de ${sala.totalAlunos}`;
    this.respondidas.textContent = String(eu.respondidas);
    this.deTarefas.textContent = `de ${sala.totalTarefas}`;
    this.cronometro.definir(sala);
    this.pausa.hidden = !sala.pausada;

    if (sala.modo === 'livre' && sala.fase === 'livre') this.escolherTarefaLivre();

    const cena = this.calcularCena();
    if (cena !== this.cena) {
      this.cena = cena;
      this.montarCena();
    } else {
      this.atualizarCena();
    }
  }

  calcularCena() {
    const { sala } = this.estado;
    if (sala.fase === 'espera' || sala.fase === 'final') return sala.fase;
    if (sala.modo === 'livre') return `livre:${this.selecionada}`;
    return `${sala.fase}:${sala.indice}`;
  }

  // ------------------------------------------------------------ cenas

  montarCena() {
    const { sala } = this.estado;
    // Cada cena cria só as partes que usa
    this.ranking = this.navegacao = this.statusRodada = this.colegas = null;
    if (sala.fase === 'espera') return this.corpo.replaceChildren(this.cenaEspera());
    if (sala.fase === 'final') return this.corpo.replaceChildren(...this.cenaFinal());
    if (sala.modo === 'livre') return this.corpo.replaceChildren(...this.cenaLivre());
    return this.corpo.replaceChildren(...this.cenaRodada());
  }

  atualizarCena() {
    const { sala, tarefas, ranking } = this.estado;
    for (const tarefa of tarefas) {
      const cartao = this.cartoes.get(tarefa.id);
      if (cartao) cartao.definir(tarefa, sala.pausada);
    }
    if (this.ranking && ranking) this.ranking.definir(ranking);
    if (this.navegacao) this.desenharNavegacao();
    if (this.statusRodada) this.desenharStatusRodada();
    if (this.colegas) this.colegas.textContent = this.textoColegas();
  }

  textoColegas() {
    const n = this.estado.sala.totalAlunos;
    return n === 1 ? 'Por enquanto só você está na sala.' : `${n} cientistas já estão na sala.`;
  }

  cenaEspera() {
    this.colegas = h('p', { class: 'espera-colegas', text: this.textoColegas() });
    return h(
      'section',
      { class: 'cartao espera' },
      h('div', { class: 'espera-emoji', 'aria-hidden': 'true', text: '⚗️' }),
      h('h2', { text: 'Você está no laboratório!' }),
      h('p', { text: 'Aguarde o professor começar a partida. A primeira tarefa aparece aqui sozinha.' }),
      this.colegas,
      h(
        'ol',
        { class: 'espera-regras' },
        h('li', {}, h('strong', { text: '🖱️ Faça' }), ' o experimento no computador e preste atenção na tela'),
        h('li', {}, h('strong', { text: '🔍 Responda' }), ' o que aconteceu: acertou, +10 pontos'),
        h('li', {}, h('strong', { text: '⚡ Seja rápido' }), ': os 3 primeiros a acertar ganham bônus (+5, +3, +1)'),
        h('li', {}, h('strong', { text: '🙌 Errou?' }), ' Ainda ganha +2 por participar')
      )
    );
  }

  cartao(tarefa, extras = {}) {
    let cartao = this.cartoes.get(tarefa.id);
    if (!cartao) {
      cartao = new TarefaCard({
        tarefa,
        total: this.estado.sala.totalTarefas,
        pausada: this.estado.sala.pausada,
        conexao: this.props.conexao,
        rascunhos: this.rascunhos,
        onErro: (mensagem) => this.emitir('Erro', mensagem),
      });
      cartao.montar();
      this.cartoes.set(tarefa.id, cartao);
    }
    Object.assign(cartao.props, extras);
    cartao.assinatura = null; // redesenha com os extras desta cena
    cartao.definir(tarefa, this.estado.sala.pausada);
    return cartao.el;
  }

  cenaRodada() {
    const { sala, tarefas, ranking } = this.estado;
    const atual = tarefas[sala.indice];
    this.statusRodada = h('p', { class: 'status-rodada', role: 'status' });
    this.desenharStatusRodada();
    const partes = [];
    if (sala.fase === 'parcial') {
      partes.push(
        h('div', { class: 'faixa-parcial' }, h('span', { 'aria-hidden': 'true', text: '🏁' }), h('div', {}, h('strong', { text: 'Tempo encerrado!' }), h('span', { text: sala.indice + 1 < sala.totalTarefas ? ' Veja como está o ranking e aguarde a próxima tarefa.' : ' Aguarde o professor mostrar o resultado final.' })))
      );
      partes.push(this.secaoRanking(ranking, 'Ranking parcial'));
    }
    partes.push(this.statusRodada, this.cartao(atual, { onProxima: null }));
    return partes;
  }

  desenharStatusRodada() {
    const { sala, tarefas } = this.estado;
    const atual = tarefas[sala.indice];
    if (!atual || sala.fase !== 'tarefa') {
      this.statusRodada.hidden = true;
      return;
    }
    this.statusRodada.hidden = false;
    const feito = Boolean(atual.minha.resposta);
    this.statusRodada.textContent = feito
      ? `👏 Pronto! ${sala.responderam} de ${sala.conectados} colegas já responderam. Aguarde a próxima tarefa.`
      : `👥 ${sala.responderam} de ${sala.conectados} colegas já responderam esta tarefa.`;
  }

  secaoRanking(ranking, titulo) {
    this.ranking = new RankingAnimado({ limite: 10, destacarId: this.props.alunoId });
    const secao = h('section', { class: 'cartao secao-ranking' }, h('h2', { text: `🏆 ${titulo}` }), this.ranking.montar());
    this.ranking.definir(ranking || []);
    return secao;
  }

  // ------------------------------------------------------------ modo livre

  escolherTarefaLivre() {
    const { tarefas } = this.estado;
    if (this.selecionada && tarefas.some((t) => t.id === this.selecionada)) return;
    const pendente = tarefas.find((t) => !t.minha.resposta) || tarefas[0];
    this.selecionar(pendente.id, { redesenhar: false });
  }

  selecionar(tarefaId, { redesenhar = true } = {}) {
    this.selecionada = tarefaId;
    const tarefa = this.estado.tarefas.find((t) => t.id === tarefaId);
    // Começa a contar o tempo desta tarefa (modo livre)
    if (tarefa && !tarefa.minha.resposta) this.props.conexao.pedir('aluno:abrir', { tarefaId }).catch(() => {});
    if (redesenhar) {
      this.cena = this.calcularCena();
      this.montarCena();
      this.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  proximaLivre() {
    const { tarefas } = this.estado;
    const atual = tarefas.findIndex((t) => t.id === this.selecionada);
    const ordem = [...tarefas.slice(atual + 1), ...tarefas.slice(0, atual)];
    const proxima = ordem.find((t) => !t.minha.resposta);
    if (proxima) this.selecionar(proxima.id);
    else this.emitir('Erro', 'Você já fez todas as tarefas! 🎉 Aguarde o professor encerrar.');
  }

  cenaLivre() {
    const tarefa = this.estado.tarefas.find((t) => t.id === this.selecionada);
    this.navegacao = h('nav', { class: 'nav-tarefas', 'aria-label': 'Tarefas' });
    this.desenharNavegacao();
    return [
      h('h2', { class: 'titulo-secao', text: '🧭 Escolha a tarefa (faça no seu ritmo)' }),
      this.navegacao,
      this.cartao(tarefa, { onProxima: () => this.proximaLivre() }),
    ];
  }

  desenharNavegacao() {
    const { tarefas } = this.estado;
    this.navegacao.replaceChildren(
      ...tarefas.map((t) => {
        const status = t.minha.resposta ? '✅' : '';
        return h(
          'button',
          {
            type: 'button',
            class: `nav-tarefa${t.id === this.selecionada ? ' ativa' : ''}${t.minha.resposta ? ' feita' : ''}`,
            'aria-current': t.id === this.selecionada ? 'true' : null,
            title: t.titulo,
            onClick: () => t.id !== this.selecionada && this.selecionar(t.id),
          },
          h('span', { class: 'nav-numero', text: String(t.numero) }),
          h('span', { class: 'nav-titulo', text: t.titulo }),
          status && h('span', { class: 'nav-status', 'aria-label': 'respondida', text: status })
        );
      })
    );
  }

  // ------------------------------------------------------------ final

  cenaFinal() {
    const { eu, ranking, sala } = this.estado;
    const mensagem = eu.posicao === 1 ? 'Você é o grande cientista da turma! 🏆' : eu.posicao <= 3 ? 'Você subiu no pódio! 🎉' : 'Parabéns pela participação! 👏';
    return [
      h(
        'section',
        { class: 'cartao final' },
        h('h2', { class: 'final-titulo', text: '🏁 Fim do experimento!' }),
        podio(ranking || []),
        h(
          'div',
          { class: 'final-voce' },
          h('strong', { text: `Você ficou em ${posicaoTexto(eu.posicao)} lugar de ${sala.totalAlunos}` }),
          h('span', { text: `${eu.pontos} pontos · ${eu.acertos} acertos · ${eu.respondidas} tarefas` }),
          h('p', { text: mensagem })
        )
      ),
      this.secaoRanking(ranking, 'Ranking final'),
    ];
  }
}
