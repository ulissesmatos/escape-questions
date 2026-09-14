import { Component } from '../../core/Component.js';
import { h } from '../../core/dom.js';
import { formatarReais } from '../../core/Money.js';
import { MIN_JUSTIFICATIVA } from './catalogo.js';
import { DraftStore } from './DraftStore.js';

/** Grade de missões (clientes). props: { missoes, rascunhos: DraftStore, onEscolher(missao) } */
export class MissionGrid extends Component {
  render() {
    return h(
      'div',
      { class: 'grid-atividades' },
      this.props.missoes.map((missao) => {
        const temRascunho = DraftStore.temConteudo(this.props.rascunhos.ler(missao.id));
        return h(
          'button',
          { type: 'button', class: 'card-atividade card-missao', onClick: () => this.emitir('Escolher', missao) },
          h(
            'div',
            { class: 'card-topo' },
            h('span', { class: 'card-icone', 'aria-hidden': 'true', text: missao.emoji }),
            h('span', { class: `card-badge${temRascunho ? ' card-badge-destaque' : ''}`, text: temRascunho ? '📝 Rascunho salvo' : 'Nova' })
          ),
          h('h2', { text: missao.personaNome }),
          h('p', { text: missao.personaDescricao }),
          missao.necessidade && h('div', { class: 'card-missao-necessidade', text: `💡 ${missao.necessidade}` }),
          h(
            'div',
            { class: 'card-rodape' },
            h('span', { class: 'card-orcamento' }, h('small', { text: 'Orçamento' }), formatarReais(missao.orcamentoCentavos)),
            h('span', { class: 'card-acao', text: temRascunho ? 'Continuar' : 'Aceitar missão' })
          )
        );
      })
    );
  }
}

/** Chips "+ Placa de vídeo", "+ Monitor"... props: { categorias, onAdicionar(categoria) } */
export class ExtraPicker extends Component {
  render() {
    this.contagem = new Map();
    this.chips = new Map();
    const el = h('div', { class: 'chips-extras' });
    for (const categoria of this.props.categorias) {
      const qtd = h('span', { class: 'chip-qtd', hidden: true });
      const chip = h(
        'button',
        { type: 'button', class: 'chip-extra', 'aria-label': `Adicionar ${categoria.rotulo}`, onClick: () => this.emitir('Adicionar', categoria) },
        h('span', { class: 'chip-mais', 'aria-hidden': 'true', text: '+' }),
        h('span', { 'aria-hidden': 'true', text: categoria.icone }),
        categoria.rotulo,
        qtd
      );
      this.chips.set(categoria.id, qtd);
      el.appendChild(chip);
    }
    return el;
  }

  /** @param {Map<string, number>} contagem id da categoria → quantidade adicionada */
  definirContagem(contagem) {
    for (const [id, qtd] of this.chips) {
      const n = contagem.get(id) || 0;
      qtd.hidden = n === 0;
      qtd.textContent = String(n);
    }
  }
}

/** Guia + campo da justificativa com contador. props: { valor, onMudar } */
export class JustificationField extends Component {
  render() {
    this.campo = h('textarea', {
      id: 'justificativa',
      rows: 6,
      maxlength: 5000,
      placeholder: 'Ex: Escolhi o processador X porque ele usa o soquete AM4, igual ao da placa-mãe Y. A memória é DDR4, que é o tipo que essa placa aceita...',
    });
    this.campo.value = this.props.valor || '';
    this.contador = h('span', { class: 'contador-texto' });
    this.ouvir(this.campo, 'input', () => {
      this.campo.classList.remove('campo-invalido');
      this.atualizarContador();
      this.emitir('Mudar');
    });

    const guia = [
      ['O ', 'soquete', ' do processador é o mesmo da placa-mãe?'],
      ['A ', 'memória RAM', ' é do tipo que a placa-mãe aceita (DDR4 ou DDR5)?'],
      ['A ', 'fonte', ' tem potência (watts) suficiente?'],
      ['A ', 'placa-mãe cabe', ' no gabinete?'],
      ['O PC atende à ', 'necessidade do cliente', '?'],
    ];

    const el = h(
      'div',
      {},
      h('ul', { class: 'guia-justificativa' }, guia.map(([antes, destaque, depois]) => h('li', {}, antes, h('strong', { text: destaque }), depois))),
      h('div', { class: 'zona-resposta' }, h('label', { class: 'zona-resposta-titulo', for: 'justificativa', text: '✏️ Sua justificativa' }), this.campo, this.contador)
    );
    this.atualizarContador();
    return el;
  }

  get valor() {
    return this.campo.value;
  }

  get tamanho() {
    return this.campo.value.trim().length;
  }

  get valida() {
    return this.tamanho >= MIN_JUSTIFICATIVA;
  }

  atualizarContador() {
    this.contador.textContent = this.valida ? `✓ ${this.tamanho} caracteres` : `${this.tamanho} caracteres — escreva pelo menos ${MIN_JUSTIFICATIVA}`;
    this.contador.classList.toggle('ok', this.valida);
  }

  marcarErro() {
    this.campo.classList.add('campo-invalido');
    this.campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.campo.focus({ preventScroll: true });
  }
}

/**
 * Painel de orçamento: total, medidor, checklist e botão de enviar.
 * props: { orcamentoCentavos, totalObrigatorias, onEnviar }
 */
export class BudgetSummary extends Component {
  render() {
    this.total = h('div', { class: 'resumo-total', text: formatarReais(0) });
    this.barra = h('div', { class: 'medidor-barra' });
    this.status = h('div', { class: 'resumo-status' });
    this.valorObrigatorias = h('span', { class: 'check-valor' });
    this.valorJustificativa = h('span', { class: 'check-valor' });
    this.itemObrigatorias = h('li', {}, h('span', { class: 'check-icone' }), h('span', { class: 'check-texto', text: 'Peças obrigatórias' }), this.valorObrigatorias);
    this.itemJustificativa = h('li', {}, h('span', { class: 'check-icone' }), h('span', { class: 'check-texto', text: 'Justificativa' }), this.valorJustificativa);
    this.erro = h('div', { class: 'erro-msg', role: 'alert' });
    this.botao = h('button', { type: 'button', class: 'btn btn-primario btn-grande btn-bloco', text: 'Enviar proposta', onClick: () => this.emitir('Enviar') });

    return h(
      'aside',
      { class: 'montagem-resumo', 'aria-label': 'Resumo do orçamento' },
      h(
        'div',
        { class: 'resumo-card cartao' },
        h('span', { class: 'resumo-rotulo', text: 'Total da proposta' }),
        this.total,
        h('div', { class: 'resumo-orcamento' }, 'de ', h('strong', { text: formatarReais(this.props.orcamentoCentavos) }), ' de orçamento'),
        h('div', { class: 'medidor', 'aria-hidden': 'true' }, this.barra),
        this.status,
        h('ul', { class: 'resumo-checklist' }, this.itemObrigatorias, this.itemJustificativa),
        this.erro,
        this.botao,
        h('p', { class: 'resumo-rascunho', text: '💾 Rascunho salvo automaticamente neste computador' })
      )
    );
  }

  get cartao() {
    return this.el.querySelector('.resumo-card');
  }

  /** Situação do orçamento, reutilizada também pela barra do celular */
  static situacao(totalCentavos, orcamentoCentavos) {
    const percentual = orcamentoCentavos > 0 ? (totalCentavos / orcamentoCentavos) * 100 : totalCentavos > 0 ? 101 : 0;
    if (totalCentavos === 0) return { percentual, classe: '', texto: 'Comece digitando o preço das peças', curto: `de ${formatarReais(orcamentoCentavos)}` };
    if (percentual > 100) {
      const excesso = formatarReais(totalCentavos - orcamentoCentavos);
      return { percentual, classe: 'estourado', texto: `⚠️ Passou ${excesso} do orçamento`, curto: `Passou ${excesso}` };
    }
    const sobra = formatarReais(orcamentoCentavos - totalCentavos);
    return percentual > 85
      ? { percentual, classe: 'alerta', texto: `Quase no limite — sobram ${sobra}`, curto: `Sobram ${sobra}` }
      : { percentual, classe: 'ok', texto: `✓ Dentro do orçamento — sobram ${sobra}`, curto: `Sobram ${sobra}` };
  }

  definir({ totalCentavos, prontas, justificativa }) {
    const s = BudgetSummary.situacao(totalCentavos, this.props.orcamentoCentavos);
    this.total.textContent = formatarReais(totalCentavos);
    this.barra.style.width = `${Math.min(100, s.percentual)}%`;
    this.barra.className = `medidor-barra ${s.classe === 'ok' ? '' : s.classe}`;
    this.status.textContent = s.texto;
    this.status.className = `resumo-status ${s.classe}`;

    const completas = prontas === this.props.totalObrigatorias;
    this.valorObrigatorias.textContent = `${prontas}/${this.props.totalObrigatorias}`;
    this.itemObrigatorias.classList.toggle('ok', completas);
    this.valorJustificativa.textContent = justificativa.valida ? 'Ok' : justificativa.tamanho > 0 ? 'Curta' : '—';
    this.itemJustificativa.classList.toggle('ok', justificativa.valida);
  }

  mostrarErro(mensagem) {
    this.erro.textContent = mensagem;
    this.erro.classList.add('mostrar');
  }

  limparErro() {
    this.erro.classList.remove('mostrar');
  }

  carregando(ativo) {
    this.botao.disabled = ativo;
    this.botao.textContent = ativo ? 'Enviando...' : 'Enviar proposta';
  }
}

/** Barra fixa com o total no celular. props: { orcamentoCentavos, onClicar } */
export class MobileTotalBar extends Component {
  render() {
    this.total = h('strong', { text: formatarReais(0) });
    this.status = h('span', { class: 'barra-total-movel-status' });
    return h(
      'button',
      { type: 'button', class: 'barra-total-movel', onClick: () => this.emitir('Clicar') },
      h('span', { class: 'barra-total-movel-texto' }, h('span', { class: 'barra-total-movel-rotulo', text: 'Total' }), this.total),
      this.status,
      h('span', { class: 'barra-total-movel-acao', text: 'Revisar e enviar ↓' })
    );
  }

  definir(totalCentavos) {
    const s = BudgetSummary.situacao(totalCentavos, this.props.orcamentoCentavos);
    this.total.textContent = formatarReais(totalCentavos);
    this.status.textContent = s.curto;
    this.status.className = `barra-total-movel-status ${s.classe === 'alerta' ? 'ok' : s.classe}`;
  }

  esconder(escondida) {
    this.el.classList.toggle('escondida', escondida);
  }
}
