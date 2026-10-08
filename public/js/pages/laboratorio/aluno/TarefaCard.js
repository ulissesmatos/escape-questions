import { Component } from '../../../core/Component.js';
import { h } from '../../../core/dom.js';
import { textoComTeclas, atalho } from '../comum.js';

const MIN_REGISTRO = 15;
const MIN_EXPLICACAO = 10;

const ETAPAS = [
  { id: 'aposta', icone: '🎯', rotulo: 'Aposta' },
  { id: 'acao', icone: '🖱️', rotulo: 'Ação' },
  { id: 'registro', icone: '✍️', rotulo: 'Registro' },
  { id: 'resultado', icone: '🔍', rotulo: 'Resultado' },
];

/**
 * Uma tarefa na tela do aluno, em 4 etapas:
 *   1. Aposta: escolhe o que vai acontecer e trava (sem ver a resposta)
 *   2. Ação: faz no computador
 *   3. Registro: escreve o que aconteceu (mínimo 15 letras)
 *   4. Resultado: vê a resposta certa, a explicação e os pontos; pode
 *      mandar o "por quê" para o professor aprovar
 *
 * O cartão só é redesenhado quando muda algo dele (não a cada envio dos
 * colegas), e o texto digitado fica guardado como rascunho, então nada se
 * perde se a página recarregar.
 *
 * props: { tarefa, total, pausada, conexao, rascunhos, onProxima?, onErro }
 */
export class TarefaCard extends Component {
  constructor(props) {
    super(props);
    this.fezAcao = false;
  }

  /** Atualiza com o estado novo; só redesenha se algo deste cartão mudou */
  definir(tarefa, pausada) {
    const assinatura = JSON.stringify([tarefa.minha, tarefa.revelacao, tarefa.aberta, pausada]);
    this.props.tarefa = tarefa;
    this.props.pausada = pausada;
    if (assinatura === this.assinatura) return;
    this.assinatura = assinatura;
    this.redesenhar();
  }

  redesenhar() {
    if (!this.el) return;
    const foco = document.activeElement && this.el.contains(document.activeElement) ? document.activeElement.name : null;
    this.atualizar();
    if (foco) {
      const campo = this.el.querySelector(`[name="${foco}"]`);
      if (campo) {
        campo.focus({ preventScroll: true });
        if (campo.setSelectionRange) campo.setSelectionRange(campo.value.length, campo.value.length);
      }
    }
  }

  get etapa() {
    const { minha, revelacao } = this.props.tarefa;
    if (revelacao && minha.registro) return 'resultado';
    if (revelacao) return 'perdida';
    if (!minha.aposta) return 'aposta';
    // Quem já tinha começado a escrever (e recarregou a página) volta direto ao registro
    const temRascunho = Boolean(this.props.rascunhos.ler(`registro:${this.props.tarefa.id}`, ''));
    return this.fezAcao || temRascunho ? 'registro' : 'acao';
  }

  get bloqueada() {
    return this.props.pausada || !this.props.tarefa.aberta;
  }

  render() {
    const { tarefa, total } = this.props;
    const etapa = this.etapa;
    const conteudo = {
      aposta: () => this.etapaAposta(),
      acao: () => this.etapaAcao(),
      registro: () => this.etapaRegistro(),
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
    const atual = perdida ? 3 : ETAPAS.findIndex((e) => e.id === etapa);
    // Tempo esgotado: só a aposta (se houve) conta como feita
    const feito = (i) => i < atual && (!perdida || (i === 0 && Boolean(this.props.tarefa.minha.aposta)));
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

  // ------------------------------------------------------------ 1. aposta

  etapaAposta() {
    const { tarefa } = this.props;
    let escolhida = null;
    const botaoTravar = h('button', { type: 'submit', class: 'btn btn-primario btn-grande', disabled: true }, '🔒 Travar minha aposta');

    const opcoes = tarefa.opcoes.map((o) => {
      const botao = h(
        'button',
        {
          type: 'button',
          class: 'aposta-opcao',
          role: 'radio',
          'aria-checked': 'false',
          disabled: this.bloqueada,
          onClick: () => {
            escolhida = o.letra;
            for (const outro of lista.children) outro.setAttribute('aria-checked', String(outro === botao));
            botaoTravar.disabled = this.bloqueada;
          },
        },
        h('span', { class: 'opcao-letra', 'data-letra': o.letra, text: o.letra.toUpperCase() }),
        h('span', { class: 'opcao-texto', text: o.texto })
      );
      return botao;
    });
    const lista = h('div', { class: 'aposta-opcoes', role: 'radiogroup', 'aria-label': tarefa.pergunta }, opcoes);

    const form = h(
      'form',
      { class: 'etapa' },
      h('div', { class: 'bloco-voce-vai' }, h('span', { class: 'bloco-rotulo', text: '🧪 O experimento' }), this.instrucao()),
      h('p', { class: 'alerta-calma' }, '✋ ', h('strong', { text: 'Ainda não faça!' }), ' Primeiro aposte o que vai acontecer.'),
      h('h3', { class: 'pergunta', text: `🎯 ${tarefa.pergunta}` }),
      lista,
      this.aviso(),
      h('div', { class: 'etapa-acoes' }, botaoTravar, h('span', { class: 'dica', text: 'Depois de travar, não dá para mudar.' }))
    );
    this.ouvir(form, 'submit', async (e) => {
      e.preventDefault();
      if (!escolhida) return;
      botaoTravar.disabled = true;
      botaoTravar.textContent = 'Travando...';
      try {
        await this.props.conexao.pedir('aluno:apostar', { tarefaId: tarefa.id, letra: escolhida });
        tarefa.minha.aposta = escolhida;
        this.definir({ ...tarefa }, this.props.pausada);
      } catch (erro) {
        this.emitir('Erro', erro.message);
        botaoTravar.disabled = false;
        botaoTravar.textContent = '🔒 Travar minha aposta';
      }
    });
    return form;
  }

  minhaAposta() {
    const { tarefa } = this.props;
    const opcao = tarefa.opcoes.find((o) => o.letra === tarefa.minha.aposta);
    return h(
      'div',
      { class: 'minha-aposta' },
      h('span', { class: 'bloco-rotulo', text: '🔒 Sua aposta' }),
      h('span', {}, h('span', { class: 'opcao-letra', 'data-letra': tarefa.minha.aposta, text: tarefa.minha.aposta.toUpperCase() }), ' ', opcao ? opcao.texto : '')
    );
  }

  // ------------------------------------------------------------ 2. ação

  etapaAcao() {
    return h(
      'div',
      { class: 'etapa' },
      this.minhaAposta(),
      h('div', { class: 'bloco-faca' }, h('span', { class: 'bloco-rotulo', text: '🖱️ Agora faça no computador' }), this.instrucao()),
      this.aviso(),
      h(
        'div',
        { class: 'etapa-acoes' },
        h('button', {
          type: 'button',
          class: 'btn btn-primario btn-grande',
          disabled: this.bloqueada,
          onClick: () => {
            this.fezAcao = true;
            this.redesenhar();
            const campo = this.el.querySelector('textarea');
            if (campo) campo.focus();
          },
        }, '✅ Já fiz! Registrar o que aconteceu')
      )
    );
  }

  // ------------------------------------------------------------ 3. registro

  etapaRegistro() {
    const { tarefa, rascunhos } = this.props;
    const chave = `registro:${tarefa.id}`;
    const campo = h('textarea', {
      name: 'registro',
      rows: 5,
      maxlength: 1000,
      placeholder: 'Conte com suas palavras o que você viu na tela...',
      value: rascunhos.ler(chave, ''),
      disabled: this.bloqueada,
      'aria-describedby': `contador-${tarefa.id}`,
    });
    const contador = h('span', { class: 'contador', id: `contador-${tarefa.id}` });
    const botao = h('button', { type: 'submit', class: 'btn btn-primario btn-grande' }, '📨 Enviar registro');

    const atualizarContador = () => {
      const faltam = MIN_REGISTRO - campo.value.trim().length;
      contador.textContent = faltam > 0 ? `Faltam ${faltam} letras` : '✓ Pronto para enviar';
      contador.classList.toggle('ok', faltam <= 0);
      botao.disabled = faltam > 0 || this.bloqueada;
    };
    this.ouvir(campo, 'input', () => {
      rascunhos.salvar(chave, campo.value);
      atualizarContador();
    });
    atualizarContador();

    const form = h(
      'form',
      { class: 'etapa' },
      this.minhaAposta(),
      h('details', { class: 'lembrete' }, h('summary', { text: 'Ver a instrução de novo' }), this.instrucao({ compacta: true })),
      h('label', { class: 'rotulo-grande', for: `registro-${tarefa.id}`, text: '✍️ O que aconteceu de verdade?' }),
      Object.assign(campo, { id: `registro-${tarefa.id}` }),
      h('div', { class: 'linha-contador' }, contador, h('span', { class: 'dica', text: 'Mínimo de 15 letras' })),
      this.aviso(),
      h('div', { class: 'etapa-acoes' }, botao)
    );
    this.ouvir(form, 'submit', async (e) => {
      e.preventDefault();
      if (botao.disabled) return;
      botao.disabled = true;
      botao.textContent = 'Enviando...';
      try {
        const { revelacao } = await this.props.conexao.pedir('aluno:registrar', { tarefaId: tarefa.id, texto: campo.value });
        rascunhos.remover(chave);
        this.definir({ ...tarefa, minha: { ...tarefa.minha, registro: campo.value.trim() }, revelacao }, this.props.pausada);
        this.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (erro) {
        this.emitir('Erro', erro.message);
        botao.textContent = '📨 Enviar registro';
        atualizarContador();
      }
    });
    return form;
  }

  // ------------------------------------------------------------ 4. resultado

  revelacaoBloco() {
    const { tarefa } = this.props;
    const r = tarefa.revelacao;
    return h(
      'div',
      { class: 'revelacao' },
      h('span', { class: 'bloco-rotulo', text: '✅ Resposta certa' }),
      h('p', { class: 'revelacao-certa' }, h('span', { class: 'opcao-letra', text: r.correta.toUpperCase() }), ' ', r.textoCorreta),
      h('p', { class: 'revelacao-explicacao' }, h('strong', { text: '💡 Por quê? ' }), r.explicacao)
    );
  }

  etapaResultado() {
    const { tarefa } = this.props;
    const r = tarefa.revelacao;
    const p = r.pontos || { aposta: 0, conclusao: 0, velocidade: 0, explicacao: 0, total: 0 };
    const chips = [
      p.aposta && ['🎯', `+${p.aposta} aposta certa`],
      p.conclusao && ['✅', `+${p.conclusao} tarefa concluída`],
      p.velocidade && ['⚡', `+${p.velocidade} bônus de velocidade`],
      p.explicacao && ['🧠', `+${p.explicacao} explicação aprovada`],
    ].filter(Boolean);

    return h(
      'div',
      { class: 'etapa' },
      h(
        'div',
        { class: `veredito ${r.acertou ? 'veredito-acertou' : 'veredito-errou'}` },
        h('span', { class: 'veredito-icone', 'aria-hidden': 'true', text: r.acertou ? '🎉' : '🤔' }),
        h('div', {}, h('strong', { text: r.acertou ? 'Você acertou a aposta!' : 'Não foi dessa vez!' }), h('span', { text: r.acertou ? 'Mandou bem, cientista!' : 'Errar a aposta faz parte do experimento.' }))
      ),
      this.minhaAposta(),
      this.revelacaoBloco(),
      h(
        'div',
        { class: 'pontos-ganhos' },
        h('strong', { class: 'pontos-total', text: `+${p.total} pontos` }),
        h('div', { class: 'pontos-chips' }, chips.map(([icone, texto]) => h('span', { class: 'chip-ponto' }, h('span', { 'aria-hidden': 'true', text: icone }), ` ${texto}`)))
      ),
      h('blockquote', { class: 'meu-registro' }, h('span', { class: 'bloco-rotulo', text: '✍️ Seu registro' }), h('p', { text: tarefa.minha.registro })),
      this.blocoExplicacao(),
      this.props.onProxima && h('div', { class: 'etapa-acoes' }, h('button', { type: 'button', class: 'btn btn-escuro btn-grande', onClick: () => this.emitir('Proxima') }, 'Próxima tarefa →'))
    );
  }

  blocoExplicacao() {
    const { tarefa, rascunhos } = this.props;
    const { explicacao, explicacaoStatus } = tarefa.minha;
    if (explicacao) {
      const status = {
        pendente: ['⏳', 'Aguardando o professor avaliar', 'pendente'],
        aprovada: ['✅', 'Aprovada pelo professor! +5 pontos', 'aprovada'],
        recusada: ['💬', 'Não foi aprovada desta vez. Converse com o professor.', 'recusada'],
      }[explicacaoStatus] || ['⏳', 'Enviada', 'pendente'];
      return h(
        'div',
        { class: `explicacao-enviada explicacao-${status[2]}` },
        h('span', { class: 'bloco-rotulo', text: '🤔 Sua explicação' }),
        h('p', { text: explicacao }),
        h('span', { class: 'explicacao-status' }, `${status[0]} ${status[1]}`)
      );
    }

    const chave = `explicacao:${tarefa.id}`;
    const campo = h('textarea', { name: 'explicacao', rows: 3, maxlength: 600, value: rascunhos.ler(chave, ''), placeholder: 'Ex.: acho que acontece porque...' });
    const botao = h('button', { type: 'submit', class: 'btn btn-suave' }, 'Enviar explicação');
    const atualizar = () => {
      botao.disabled = campo.value.trim().length < MIN_EXPLICACAO;
    };
    this.ouvir(campo, 'input', () => {
      rascunhos.salvar(chave, campo.value);
      atualizar();
    });
    atualizar();

    const form = h(
      'form',
      { class: 'explicacao-form' },
      h('label', { class: 'rotulo-grande', for: `explicacao-${tarefa.id}` }, '🤔 Por que você acha que aconteceu? ', h('span', { class: 'rotulo-opcional', text: '(opcional, vale +5 se o professor aprovar)' })),
      Object.assign(campo, { id: `explicacao-${tarefa.id}` }),
      h('div', { class: 'etapa-acoes' }, botao)
    );
    this.ouvir(form, 'submit', async (e) => {
      e.preventDefault();
      if (botao.disabled) return;
      botao.disabled = true;
      try {
        await this.props.conexao.pedir('aluno:explicar', { tarefaId: tarefa.id, texto: campo.value });
        rascunhos.remover(chave);
        this.definir({ ...tarefa, minha: { ...tarefa.minha, explicacao: campo.value.trim(), explicacaoStatus: 'pendente' } }, this.props.pausada);
      } catch (erro) {
        this.emitir('Erro', erro.message);
        atualizar();
      }
    });
    return form;
  }

  etapaPerdida() {
    const { tarefa } = this.props;
    return h(
      'div',
      { class: 'etapa' },
      h(
        'div',
        { class: 'veredito veredito-tempo' },
        h('span', { class: 'veredito-icone', 'aria-hidden': 'true', text: '⏰' }),
        h('div', {}, h('strong', { text: 'Esta tarefa foi encerrada.' }), h('span', { text: 'Você não enviou o registro a tempo, mas veja o que acontece:' }))
      ),
      tarefa.minha.aposta && this.minhaAposta(),
      this.revelacaoBloco(),
      this.props.onProxima && h('div', { class: 'etapa-acoes' }, h('button', { type: 'button', class: 'btn btn-escuro btn-grande', onClick: () => this.emitir('Proxima') }, 'Próxima tarefa →'))
    );
  }
}
