import { h } from '../../core/dom.js';
import { api } from '../../core/ApiClient.js';
import { formatarReais } from '../../core/Money.js';
import { ScreenFlow } from '../../core/ScreenFlow.js';
import { IdentityForm } from '../../components/IdentityForm.js';
import { ConfirmDialog } from '../../components/Modal.js';
import { PlayerChip, BackBar, estadoCarregando, estadoVazio } from '../../components/ui.js';
import { OBRIGATORIAS, OPCIONAIS, LOJAS } from './catalogo.js';
import { DraftStore } from './DraftStore.js';
import { PartCard } from './PartCard.js';
import { MissionGrid, ExtraPicker, JustificationField, BudgetSummary, MobileTotalBar } from './componentes.js';

/** Monte o PC Ideal: identificação → clientes → montagem da proposta → enviada. */
export class PcBuildPage {
  constructor(raiz) {
    this.raiz = raiz;
    this.missoes = null;
    this.missao = null;
    this.pecas = [];
  }

  iniciar() {
    this.telas = {
      identificacao: h('section'),
      missoes: h('section', { hidden: true }),
      montagem: h('section', { hidden: true }),
      sucesso: h('section', { hidden: true }),
      carregando: h('section', { hidden: true }),
    };
    this.raiz.append(...Object.values(this.telas));

    this.fluxo = new ScreenFlow({
      telas: this.telas,
      aoMostrar: (nome) => {
        document.getElementById('pagina-topo').hidden = nome === 'montagem' || nome === 'sucesso';
        this.raiz.closest('.container').classList.toggle('container-largo', nome === 'montagem');
        if (nome !== 'montagem' && this.barraMovel) this.barraMovel.esconder(true);
        window.scrollTo({ top: 0 });
      },
      aoVoltarNoHistorico: (estado) => this.aoVoltarNoHistorico(estado),
    });

    this.formulario = new IdentityForm({
      titulo: 'Quem vai montar?',
      textoBotao: 'Ver missões →',
      chave: 'pcbuild',
      exemploTurma: 'Ex: 8º Ano B',
      onEnviar: (identidade) => this.identificar(identidade),
    });
    this.formulario.montar(this.telas.identificacao);
    this.fluxo.mostrar('identificacao');
    window.addEventListener('beforeunload', () => this.salvarRascunho());
  }

  async identificar(identidade) {
    this.identidade = identidade;
    this.rascunhos = new DraftStore(identidade);
    await this.abrirMissoes({ substituir: true });
  }

  trocarJogador() {
    this.identidade = null;
    history.replaceState({}, '', location.pathname);
    this.fluxo.mostrar('identificacao');
    this.formulario.focar();
  }

  aoVoltarNoHistorico(estado) {
    this.salvarRascunho();
    if (!this.identidade) return this.fluxo.mostrar('identificacao');
    const missao = estado.tela === 'montagem' && (this.missoes || []).find((m) => m.id === estado.missaoId);
    if (missao) this.abrirMontagem(missao, { registrarHistorico: false });
    else this.abrirMissoes({ registrarHistorico: false });
  }

  // ---------------- Missões ----------------

  async abrirMissoes({ substituir = false, registrarHistorico = true } = {}) {
    this.missao = null;
    if (!this.missoes) {
      this.telas.carregando.replaceChildren(estadoCarregando('Carregando missões...'));
      this.fluxo.mostrar('carregando');
      try {
        this.missoes = await api.get('/pcbuild/missoes');
      } catch (err) {
        this.telas.carregando.replaceChildren(
          estadoVazio({
            icone: '⚠️',
            titulo: 'Não foi possível carregar as missões',
            texto: err.message,
            acao: h('button', { type: 'button', class: 'btn btn-primario', text: 'Tentar de novo', onClick: () => this.abrirMissoes({ substituir, registrarHistorico }) }),
          })
        );
        return;
      }
    }

    this.telas.missoes.replaceChildren(
      new PlayerChip({ rotulo: 'Montando como', identidade: this.identidade, onTrocar: () => this.trocarJogador() }).montar(),
      h('h2', { class: 'titulo-etapa', text: 'Escolha um cliente' }),
      h('p', { class: 'subtitulo-etapa', text: 'Cada cliente precisa de um computador diferente e tem um orçamento para gastar.' }),
      this.missoes.length
        ? new MissionGrid({ missoes: this.missoes, rascunhos: this.rascunhos, onEscolher: (m) => this.abrirMontagem(m) }).montar()
        : estadoVazio({ icone: '🛒', titulo: 'Nenhuma missão cadastrada ainda', texto: 'Avise o professor.' })
    );

    if (!registrarHistorico) this.fluxo.mostrar('missoes');
    else if (substituir) this.fluxo.substituir('missoes');
    else this.fluxo.ir('missoes');
  }

  // ---------------- Montagem ----------------

  abrirMontagem(missao, { registrarHistorico = true } = {}) {
    this.missao = missao;
    const rascunho = this.rascunhos.ler(missao.id) || {};

    this.pecas = [];
    this.listaObrigatorias = h('div', { class: 'lista-pecas' });
    this.listaExtras = h('div', { class: 'lista-pecas' });
    for (const categoria of OBRIGATORIAS) {
      this.adicionarPeca(categoria, (rascunho.obrigatorias || {})[categoria.id], { extra: false });
    }
    this.seletorExtras = new ExtraPicker({ categorias: OPCIONAIS, onAdicionar: (c) => this.adicionarPeca(c, {}, { extra: true, focar: true }) });
    this.seletorExtras.montar();
    for (const extra of rascunho.extras || []) {
      const categoria = OPCIONAIS.find((c) => c.id === extra.id);
      if (categoria) this.adicionarPeca(categoria, extra, { extra: true });
    }

    this.justificativa = new JustificationField({ valor: rascunho.justificativa, onMudar: () => this.atualizar() });
    this.resumo = new BudgetSummary({ orcamentoCentavos: missao.orcamentoCentavos, totalObrigatorias: OBRIGATORIAS.length, onEnviar: () => this.enviar() });
    this.barraMovel = new MobileTotalBar({
      orcamentoCentavos: missao.orcamentoCentavos,
      onClicar: () => this.resumo.cartao.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    });
    this.contadorObrigatorias = h('span', { class: 'contador-pecas' });

    this.telas.montagem.replaceChildren(
      new BackBar({ texto: 'Trocar de cliente', migalhas: ['Clientes', missao.personaNome], onVoltar: () => this.voltarParaMissoes() }).montar(),
      h(
        'div',
        { class: 'montagem-layout' },
        h(
          'div',
          { class: 'montagem-principal' },
          this.briefing(missao),
          this.dicaPesquisa(),
          this.etapa(1, 'Peças obrigatórias', 'Todo computador precisa dessas 6 peças.', this.listaObrigatorias, this.contadorObrigatorias),
          this.etapa(2, 'Peças extras', 'O cliente precisa de mais alguma coisa? Toque para adicionar.', [this.seletorExtras.el, this.listaExtras], null, true),
          this.etapa(3, 'Por que essas peças combinam?', 'Explique com suas palavras. Use as perguntas abaixo como guia.', this.justificativa.montar())
        ),
        this.resumo.montar()
      ),
      this.barraMovel.montar()
    );

    this.observarResumo();
    this.atualizar({ salvar: false });

    if (!registrarHistorico) this.fluxo.mostrar('montagem');
    else this.fluxo.ir('montagem', { missaoId: missao.id }, { hash: `missao-${missao.id}` });
  }

  briefing(missao) {
    return h(
      'div',
      { class: 'missao-brief cartao' },
      h('span', { class: 'missao-brief-emoji', 'aria-hidden': 'true', text: missao.emoji }),
      h('div', { class: 'missao-brief-texto' }, h('span', { class: 'missao-brief-rotulo', text: 'Seu cliente' }), h('h2', { text: missao.personaNome }), h('p', { text: missao.personaDescricao })),
      h(
        'div',
        { class: 'missao-necessidade' },
        h('span', { class: 'missao-brief-rotulo', text: '💡 O que o cliente precisa' }),
        h('p', { text: missao.necessidade || 'Monte um computador que funcione bem e caiba no orçamento.' })
      )
    );
  }

  dicaPesquisa() {
    const links = [];
    LOJAS.forEach((loja, i) => {
      if (i > 0) links.push(i === LOJAS.length - 1 ? ' ou ' : ', ');
      links.push(h('a', { href: loja.url, target: '_blank', rel: 'noopener', text: loja.nome }));
    });
    return h(
      'div',
      { class: 'dica-pesquisa' },
      h('span', { class: 'dica-pesquisa-icone', 'aria-hidden': 'true', text: '🔎' }),
      h('div', {}, h('strong', { text: 'Onde pesquisar? ' }), 'Em lojas de informática de verdade, como ', ...links, '. Copie o nome da peça e o preço.')
    );
  }

  etapa(numero, titulo, subtitulo, conteudo, extraCabecalho = null, opcional = false) {
    return h(
      'div',
      { class: 'etapa-montagem' },
      h(
        'div',
        { class: 'etapa-montagem-cabecalho' },
        h('span', { class: 'etapa-numero', text: String(numero) }),
        h('div', {}, h('h3', {}, titulo, opcional && h('span', { class: 'rotulo-opcional', text: ' (opcional)' })), h('p', { text: subtitulo })),
        extraCabecalho
      ),
      conteudo
    );
  }

  adicionarPeca(categoria, valores = {}, { extra, focar = false }) {
    const peca = new PartCard({
      categoria,
      extra,
      valores,
      onMudar: () => this.atualizar(),
      onRemover: (card) => this.removerPeca(card),
    });
    this.pecas.push(peca);
    (extra ? this.listaExtras : this.listaObrigatorias).appendChild(peca.montar());

    if (focar) {
      peca.el.classList.add('peca-extra-nova');
      peca.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      peca.nome.focus({ preventScroll: true });
      this.atualizar();
    }
  }

  removerPeca(card) {
    this.pecas = this.pecas.filter((p) => p !== card);
    card.destruir();
    this.atualizar();
  }

  observarResumo() {
    if (this.observador) this.observador.disconnect();
    if (!('IntersectionObserver' in window)) return;
    this.observador = new IntersectionObserver((entradas) => {
      this.barraMovel.esconder(entradas.some((e) => e.isIntersecting));
    });
    this.observador.observe(this.resumo.cartao);
  }

  atualizar({ salvar = true } = {}) {
    if (!this.missao) return;
    const dados = this.pecas.map((p) => ({ extra: p.props.extra, ...p.ler() }));
    const totalCentavos = dados.reduce((soma, d) => soma + (d.precoCentavos || 0), 0);
    const prontas = dados.filter((d) => !d.extra && d.pronta).length;

    this.contadorObrigatorias.textContent = `${prontas}/${OBRIGATORIAS.length}`;
    this.contadorObrigatorias.classList.toggle('completo', prontas === OBRIGATORIAS.length);
    this.resumo.definir({ totalCentavos, prontas, justificativa: this.justificativa });
    this.barraMovel.definir(totalCentavos);

    const contagem = new Map();
    for (const p of this.pecas.filter((x) => x.props.extra)) contagem.set(p.props.categoria.id, (contagem.get(p.props.categoria.id) || 0) + 1);
    this.seletorExtras.definirContagem(contagem);

    if (salvar) {
      clearTimeout(this.timerRascunho);
      this.timerRascunho = setTimeout(() => this.salvarRascunho(), 400);
    }
  }

  salvarRascunho() {
    clearTimeout(this.timerRascunho);
    if (!this.missao || !this.rascunhos) return;
    const obrigatorias = {};
    const extras = [];
    for (const p of this.pecas) {
      if (p.props.extra) extras.push(p.paraRascunho());
      else obrigatorias[p.props.categoria.id] = p.paraRascunho();
    }
    this.rascunhos.salvar(this.missao.id, { obrigatorias, extras, justificativa: this.justificativa.valor });
  }

  voltarParaMissoes() {
    this.salvarRascunho();
    this.fluxo.voltar(() => this.abrirMissoes());
  }

  // ---------------- Envio ----------------

  async enviar() {
    if (this.enviando || !this.missao) return;
    this.resumo.limparErro();

    const invalidas = this.pecas.filter((p) => !p.validar());
    if (invalidas.length) {
      const nomes = invalidas.map((p) => p.props.extra ? p.props.categoria.rotulo : p.props.categoria.nome);
      this.resumo.mostrarErro(
        invalidas.length === 1 ? `Complete o nome e o preço de: ${nomes[0]}.` : `Complete o nome e o preço de ${invalidas.length} peças (marcadas em vermelho).`
      );
      invalidas[0].focarPrimeiroErro();
      return;
    }

    if (!this.justificativa.valida) {
      this.resumo.mostrarErro(
        this.justificativa.tamanho
          ? 'Sua justificativa está muito curta. Explique melhor por que as peças combinam.'
          : 'Falta a justificativa: explique por que as peças escolhidas combinam entre si.'
      );
      this.justificativa.marcarErro();
      return;
    }

    const itens = this.pecas
      .map((p) => p.ler())
      .filter((d) => !d.vazia)
      .map((d) => ({ categoria: d.categoria.nome, nomePeca: d.nome, precoCentavos: d.precoCentavos, link: d.link }));
    const total = itens.reduce((s, i) => s + i.precoCentavos, 0);

    if (total > this.missao.orcamentoCentavos) {
      const continuar = await ConfirmDialog.perguntar({
        titulo: 'Passou do orçamento',
        mensagem: `Sua proposta passou ${formatarReais(total - this.missao.orcamentoCentavos)} do orçamento de ${formatarReais(this.missao.orcamentoCentavos)}. Quer enviar mesmo assim?`,
        textoConfirmar: 'Enviar mesmo assim',
      });
      if (!continuar) return;
    }

    this.enviando = true;
    this.resumo.carregando(true);
    try {
      const resposta = await api.post('/pcbuild/propostas', {
        ...this.identidade,
        missaoId: this.missao.id,
        itens,
        justificativa: this.justificativa.valor.trim(),
      });
      this.rascunhos.remover(this.missao.id);
      this.mostrarSucesso(resposta);
    } catch (err) {
      this.resumo.mostrarErro(err.message);
    } finally {
      this.enviando = false;
      this.resumo.carregando(false);
    }
  }

  mostrarSucesso({ totalCentavos, dentroOrcamento }) {
    const primeiroNome = this.missao.personaNome.split(' ')[0];
    this.missao = null;
    this.telas.sucesso.replaceChildren(
      h(
        'div',
        { class: 'cartao tela-sucesso' },
        h('div', { class: 'tela-sucesso-icone', text: '🎉' }),
        h('h2', { text: 'Proposta enviada!' }),
        h('p', {
          text: dentroOrcamento
            ? `Total de ${formatarReais(totalCentavos)} — dentro do orçamento de ${primeiroNome}! 🎯`
            : `Total de ${formatarReais(totalCentavos)} — um pouco acima do orçamento. Da próxima vez, confira as peças mais caras.`,
        }),
        h('p', { text: 'O professor vai avaliar se o PC atende ao cliente, se as peças são compatíveis e se coube no orçamento.' }),
        h(
          'div',
          { class: 'acoes' },
          h('button', { type: 'button', class: 'btn btn-primario', text: 'Escolher outro cliente', onClick: () => this.fluxo.voltar(() => this.abrirMissoes()) }),
          h('a', { href: 'index.html', class: 'btn btn-contorno', text: 'Voltar ao início' })
        )
      )
    );
    this.fluxo.substituir('sucesso');
  }
}
