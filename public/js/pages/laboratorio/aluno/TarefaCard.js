import { Component } from '../../../core/Component.js';
import { h } from '../../../core/dom.js';
import { textoComTeclas, atalho } from '../comum.js';

const ROTULOS = ['A', 'B', 'C', 'D'];

const ETAPAS = [
  { id: 'acao', icone: '🖱️', rotulo: 'Faça' },
  { id: 'pergunta', icone: '🔍', rotulo: 'Responda' },
  { id: 'resultado', icone: '🏁', rotulo: 'Resultado' },
];

/**
 * Uma tarefa na tela do aluno, sem nada para escrever:
 *   1. Faça: só a instrução. O botão "Já fiz" libera depois do tempo mínimo
 *      (o servidor confere esse tempo de novo ao receber a resposta).
 *   2. Responda: só agora aparecem as opções de "o que aconteceu?", numa
 *      ordem embaralhada para cada aluno. Uma resposta só.
 *   3. Resultado: certo ou errado, a resposta certa, a explicação e os pontos.
 *
 * O cartão só é redesenhado quando muda algo dele (não a cada resposta dos
 * colegas). "Já fiz" fica guardado no navegador: recarregar a página não
 * volta para a etapa 1.
 *
 * props: { tarefa, total, pausada, conexao, rascunhos, onProxima?, onErro }
 */
export class TarefaCard extends Component {
  /** Atualiza com o estado novo; só redesenha se algo deste cartão mudou */
  definir(tarefa, pausada) {
    const assinatura = JSON.stringify([tarefa.minha, tarefa.revelacao, tarefa.aberta, tarefa.liberaEm !== null, pausada]);
    this.props.tarefa = tarefa;
    this.props.pausada = pausada;
    if (tarefa.liberaEm !== null) this.liberaEm = tarefa.liberaEm;
    if (assinatura === this.assinatura) return;
    this.assinatura = assinatura;
    this.atualizar();
  }

  aoMontar() {
    // Um relógio só para a contagem do botão "Já fiz" (sobrevive aos redesenhos)
    if (!this.relogio) this.relogio = this.agendar(() => this.contarTempo(), 250, { repetir: true });
    this.contarTempo();
  }

  get chaveFez() {
    return `fez:${this.props.tarefa.id}`;
  }

  get etapa() {
    const { minha, revelacao } = this.props.tarefa;
    if (revelacao && minha.resposta) return 'resultado';
    if (revelacao) return 'perdida';
    return this.props.rascunhos.ler(this.chaveFez, false) ? 'pergunta' : 'acao';
  }

  get bloqueada() {
    return this.props.pausada || !this.props.tarefa.aberta;
  }

  render() {
    const { tarefa, total } = this.props;
    const etapa = this.etapa;
    this.botaoPronto = null;
    const conteudo = {
      acao: () => this.etapaAcao(),
      pergunta: () => this.etapaPergunta(),
      resultado: () => this.etapaResultado(),
      perdida: () => this.etapaPerdida(),
    }[etapa]();

    return h(
      'article',
      { class: `tarefa-card cartao etapa-${etapa}` },
      h(
        'header',
        { class: 'tarefa-cabecalho' },
        h('span', { class: 'tarefa-numero', text: total ? `Tarefa ${tarefa.numero} de ${total}` : `Tarefa ${tarefa.numero}` }),
        h('h2', { class: 'tarefa-titulo', text: tarefa.titulo })
      ),
      this.passos(etapa),
      conteudo
    );
  }

  passos(etapa) {
    const perdida = etapa === 'perdida';
    const atual = perdida ? 2 : ETAPAS.findIndex((e) => e.id === etapa);
    // Tempo esgotado: nenhuma etapa anterior conta como feita
    const feito = (i) => i < atual && !perdida;
    return h(
      'ol',
      { class: 'passos', 'aria-label': 'Etapas da tarefa' },
      ETAPAS.map((e, i) =>
        h(
          'li',
          { class: `passo${feito(i) ? ' feito' : ''}${i === atual ? ' atual' : ''}`, 'aria-current': i === atual ? 'step' : null },
          h('span', { class: 'passo-bolinha', 'aria-hidden': 'true', text: feito(i) ? '✓' : e.icone }),
          h('span', { class: 'passo-nome', text: `${i + 1}. ${e.rotulo}` })
        )
      )
    );
  }

  instrucao({ compacta = false } = {}) {
    const { tarefa } = this.props;
    return h(
      'div',
      { class: `instrucao${compacta ? ' instrucao-compacta' : ''}` },
      h('p', { class: 'instrucao-texto' }, textoComTeclas(tarefa.instrucao)),
      !compacta && tarefa.teclas.length > 0 && h('div', { class: 'instrucao-atalhos' }, tarefa.teclas.map((combo) => atalho(combo)))
    );
  }

  aviso() {
    if (this.props.pausada) return h('p', { class: 'aviso-bloqueio', text: '⏸️ A partida está pausada. Aguarde o professor.' });
    if (!this.props.tarefa.aberta) return h('p', { class: 'aviso-bloqueio', text: '🔒 Esta tarefa não está liberada agora.' });
    return null;
  }

  /** Rótulo (A, B, C...) na ordem em que ESTE aluno vê as opções */
  opcaoVista(letra) {
    const i = this.props.tarefa.opcoes.findIndex((o) => o.letra === letra);
    return i < 0 ? null : { rotulo: ROTULOS[i], texto: this.props.tarefa.opcoes[i].texto };
  }

  letraVisual(rotulo) {
    return h('span', { class: 'opcao-letra', 'data-letra': rotulo.toLowerCase(), text: rotulo });
  }

  // ------------------------------------------------------------ 1. faça

  etapaAcao() {
    this.botaoPronto = h('button', {
      type: 'button',
      class: 'btn btn-primario btn-grande',
      onClick: () => {
        if (this.botaoPronto.disabled) return;
        this.props.rascunhos.salvar(this.chaveFez, true);
        this.atualizar();
        this.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    });
    return h(
      'div',
      { class: 'etapa' },
      h('div', { class: 'bloco-faca' }, h('span', { class: 'bloco-rotulo', text: '🖱️ Faça no computador' }), this.instrucao()),
      h('p', { class: 'alerta-calma' }, '👀 ', h('strong', { text: 'Preste atenção no que acontece na tela!' }), ' Depois você vai responder uma pergunta sobre isso.'),
      this.aviso(),
      h('div', { class: 'etapa-acoes' }, this.botaoPronto)
    );
  }

  /** Contagem regressiva do botão "Já fiz" */
  contarTempo() {
    if (!this.botaoPronto) return;
    const { tarefa, conexao } = this.props;
    // Antes do servidor confirmar o início (modo livre), conta a partir de agora
    if (this.liberaEm == null) this.liberaEm = conexao.agora() + tarefa.tempoMinimo * 1000;
    const falta = Math.ceil((this.liberaEm - conexao.agora()) / 1000);
    const esperando = falta > 0;
    const texto = esperando ? `⏳ Faça o experimento... ${falta} s` : '✅ Pronto, já fiz!';
    if (this.botaoPronto.textContent !== texto) this.botaoPronto.textContent = texto;
    this.botaoPronto.disabled = esperando || this.bloqueada;
  }

  // ------------------------------------------------------------ 2. responda

  etapaPergunta() {
    const { tarefa } = this.props;
    let escolhida = null;
    const botao = h('button', { type: 'submit', class: 'btn btn-primario btn-grande', disabled: true }, '✅ Confirmar resposta');

    const lista = h('div', { class: 'aposta-opcoes', role: 'radiogroup', 'aria-label': tarefa.pergunta });
    tarefa.opcoes.forEach((o, i) => {
      const opcao = h(
        'button',
        {
          type: 'button',
          class: 'aposta-opcao',
          role: 'radio',
          'aria-checked': 'false',
          disabled: this.bloqueada,
          onClick: () => {
            escolhida = o.letra;
            for (const outra of lista.children) outra.setAttribute('aria-checked', String(outra === opcao));
            botao.disabled = this.bloqueada;
          },
        },
        this.letraVisual(ROTULOS[i]),
        h('span', { class: 'opcao-texto', text: o.texto })
      );
      lista.appendChild(opcao);
    });

    const form = h(
      'form',
      { class: 'etapa' },
      h('details', { class: 'lembrete' }, h('summary', { text: 'Ver a instrução de novo' }), this.instrucao({ compacta: true })),
      h('h3', { class: 'pergunta', text: `🔍 ${tarefa.pergunta}` }),
      lista,
      this.aviso(),
      h('div', { class: 'etapa-acoes' }, botao, h('span', { class: 'dica', text: 'Você só pode responder uma vez.' }))
    );
    this.ouvir(form, 'submit', async (e) => {
      e.preventDefault();
      if (!escolhida || botao.disabled) return;
      botao.disabled = true;
      botao.textContent = 'Enviando...';
      try {
        const { revelacao } = await this.props.conexao.pedir('aluno:responder', { tarefaId: tarefa.id, letra: escolhida });
        this.definir({ ...tarefa, minha: { resposta: escolhida }, revelacao }, this.props.pausada);
        this.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (erro) {
        this.emitir('Erro', erro.message);
        botao.disabled = false;
        botao.textContent = '✅ Confirmar resposta';
      }
    });
    return form;
  }

  // ------------------------------------------------------------ 3. resultado

  blocoCerta() {
    const r = this.props.tarefa.revelacao;
    const certa = this.opcaoVista(r.correta);
    return h(
      'div',
      { class: 'revelacao' },
      h('span', { class: 'bloco-rotulo', text: '✅ Resposta certa' }),
      h('p', { class: 'revelacao-certa' }, certa && this.letraVisual(certa.rotulo), ' ', r.textoCorreta),
      h('p', { class: 'revelacao-explicacao' }, h('strong', { text: '💡 Por quê? ' }), r.explicacao)
    );
  }

  minhaResposta() {
    const vista = this.opcaoVista(this.props.tarefa.minha.resposta);
    if (!vista) return null;
    return h(
      'div',
      { class: 'minha-aposta' },
      h('span', { class: 'bloco-rotulo', text: 'Sua resposta' }),
      h('span', {}, this.letraVisual(vista.rotulo), ' ', vista.texto)
    );
  }

  botaoProxima() {
    return this.props.onProxima && h('div', { class: 'etapa-acoes' }, h('button', { type: 'button', class: 'btn btn-escuro btn-grande', onClick: () => this.emitir('Proxima') }, 'Próxima tarefa →'));
  }

  etapaResultado() {
    const r = this.props.tarefa.revelacao;
    const p = r.pontos || { acerto: 0, participacao: 0, velocidade: 0, total: 0 };
    const chips = [
      p.acerto && ['🎯', `+${p.acerto} acertou`],
      p.velocidade && ['⚡', `+${p.velocidade} bônus de velocidade`],
      p.participacao && ['🙌', `+${p.participacao} participação`],
    ].filter(Boolean);

    return h(
      'div',
      { class: 'etapa' },
      h(
        'div',
        { class: `veredito ${r.acertou ? 'veredito-acertou' : 'veredito-errou'}` },
        h('span', { class: 'veredito-icone', 'aria-hidden': 'true', text: r.acertou ? '🎉' : '🤔' }),
        h('div', {}, h('strong', { text: r.acertou ? 'Você acertou!' : 'Não foi dessa vez!' }), h('span', { text: r.acertou ? 'Mandou bem, cientista!' : 'Veja o que acontece de verdade:' }))
      ),
      !r.acertou && this.minhaResposta(),
      this.blocoCerta(),
      h(
        'div',
        { class: 'pontos-ganhos' },
        h('strong', { class: 'pontos-total', text: `+${p.total} pontos` }),
        h('div', { class: 'pontos-chips' }, chips.map(([icone, texto]) => h('span', { class: 'chip-ponto' }, h('span', { 'aria-hidden': 'true', text: icone }), ` ${texto}`)))
      ),
      this.botaoProxima()
    );
  }

  etapaPerdida() {
    return h(
      'div',
      { class: 'etapa' },
      h(
        'div',
        { class: 'veredito veredito-tempo' },
        h('span', { class: 'veredito-icone', 'aria-hidden': 'true', text: '⏰' }),
        h('div', {}, h('strong', { text: 'Esta tarefa foi encerrada.' }), h('span', { text: 'Você não respondeu a tempo, mas veja o que acontece:' }))
      ),
      this.blocoCerta(),
      this.botaoProxima()
    );
  }
}
