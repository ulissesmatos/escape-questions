// Editor do plano do robô, feito em HTML comum (sem biblioteca), leve para
// computadores antigos. Dá para montar de dois jeitos:
// - clicar num bloco da paleta: ele entra onde está a setinha (o "cursor");
// - arrastar: da paleta para o plano, dentro do plano para mudar de lugar e
//   do plano para fora (ou para a paleta) para jogar fora.

import { h, substituirFilhos } from '../../../core/dom.js';
import { BLOCOS, CONDICOES, VEZES_MAX, VEZES_MIN, nomeCurto, novoBloco } from '../regras/blocos.js';
import { sons } from './sons.js';

const DISTANCIA_ARRASTE = 6;

function listaContem(raiz, alvo) {
  if (raiz === alvo) return true;
  return raiz.some((b) => (b.corpo && listaContem(b.corpo, alvo)) || (b.senao && listaContem(b.senao, alvo)));
}

export class EditorDeBlocos {
  /**
   * paleta, area: elementos onde desenhar
   * fase: { blocos, novos, condicoes }
   * plano: lista de blocos (é alterada no lugar)
   * aoMudar(plano): chamado a cada mudança
   */
  constructor({ paleta, area, fase, plano, aoMudar }) {
    this.paletaEl = paleta;
    this.areaEl = area;
    this.fase = fase;
    this.plano = plano;
    this.aoMudar = aoMudar;
    this.cursor = { lista: plano, indice: plano.length };
    this.travado = false;
    this.fendas = [];
    this.arraste = null;
    this.aoMover = (e) => this.mover(e);
    this.aoSoltar = (e) => this.soltar(e);
    // Sem isso, clicar duas vezes seleciona o texto do bloco e o navegador
    // passa a arrastar o texto (o "fantasma") em vez do bloco
    for (const el of [paleta, area]) {
      el.addEventListener('dragstart', (e) => e.preventDefault());
      el.addEventListener('mousedown', (e) => {
        if (!e.target.closest('select')) e.preventDefault();
      });
    }
    this.renderPaleta();
    this.renderPlano();
  }

  destruir() {
    this.cancelarArraste();
  }

  travar(travado) {
    this.travado = travado;
    this.areaEl.classList.toggle('travado', travado);
    this.paletaEl.classList.toggle('travado', travado);
  }

  // ---------- desenho ----------

  renderPaleta() {
    const itens = this.fase.blocos.map((tipo) => {
      const def = BLOCOS[tipo];
      const novo = (this.fase.novos || []).includes(tipo);
      const item = h(
        'button',
        {
          type: 'button',
          class: `bloco paleta-item cat-${def.categoria}${def.corpo ? ' com-corpo' : ''}`,
          title: 'Clique para colocar no plano, ou arraste',
          onClick: (e) => e.detail === 0 && this.inserirNovo(tipo), // teclado (Enter/Espaço)
        },
        h('span', { class: 'bloco-icone', 'aria-hidden': 'true', text: def.icone }),
        h('span', { class: 'bloco-texto', text: nomeCurto(tipo) }),
        novo && h('span', { class: 'bloco-novo', text: 'Novo!' })
      );
      item.addEventListener('pointerdown', (e) => this.comecar(e, { tipo }, item));
      return item;
    });
    substituirFilhos(this.paletaEl, itens);
  }

  renderPlano() {
    this.fendas = [];
    if (!listaContem(this.plano, this.cursor.lista)) this.cursor = { lista: this.plano, indice: this.plano.length };
    this.cursor.indice = Math.min(this.cursor.indice, this.cursor.lista.length);
    const conteudo = h(
      'div',
      { class: 'plano' },
      h('div', { class: 'plano-chapeu' }, h('span', { 'aria-hidden': 'true', text: '▶' }), ' Quando apertar Rodar'),
      this.renderLista(this.plano, true)
    );
    substituirFilhos(this.areaEl, conteudo);
  }

  renderLista(lista, principal = false) {
    const filhos = [];
    lista.forEach((bloco, i) => {
      filhos.push(this.renderFenda(lista, i, false));
      filhos.push(this.renderBloco(bloco, lista));
    });
    filhos.push(this.renderFenda(lista, lista.length, lista.length === 0, principal));
    return h('div', { class: 'plano-lista' }, filhos);
  }

  renderFenda(lista, indice, vazia, principal = false) {
    const ehCursor = this.cursor.lista === lista && this.cursor.indice === indice;
    let texto = null;
    if (vazia) texto = principal ? 'Clique nos blocos para montar o plano' : 'coloque blocos aqui';
    else if (ehCursor) texto = '＋ o próximo bloco entra aqui';
    const el = h('div', {
      class: `fenda${vazia ? ' vazia' : ''}${principal ? ' principal' : ''}${ehCursor ? ' cursor' : ''}`,
      title: 'O próximo bloco entra aqui',
      onClick: () => {
        if (this.travado) return;
        this.cursor = { lista, indice };
        this.renderPlano();
      },
    });
    if (texto) el.textContent = texto;
    this.fendas.push({ el, lista, indice });
    return el;
  }

  renderBloco(bloco, lista) {
    const def = BLOCOS[bloco.tipo];
    const linha = h(
      'div',
      { class: 'bloco-linha' },
      h('span', { class: 'bloco-icone', 'aria-hidden': 'true', text: def.icone }),
      h('span', { class: 'bloco-texto', text: def.texto }),
      this.renderControles(bloco),
      h('button', {
        type: 'button',
        class: 'bloco-tirar',
        title: 'Tirar este bloco',
        'aria-label': 'Tirar este bloco',
        text: '✕',
        onClick: (e) => {
          e.stopPropagation();
          if (!this.travado) this.remover(bloco, lista);
        },
      })
    );
    const el = h(
      'div',
      { class: `bloco cat-${def.categoria}${def.corpo ? ' com-corpo' : ''}`, dataset: { id: bloco.id } },
      linha,
      def.corpo && h('div', { class: 'bloco-corpo' }, this.renderLista(bloco.corpo)),
      def.senao && h('div', { class: 'bloco-linha bloco-senao', text: 'senão' }),
      def.senao && h('div', { class: 'bloco-corpo' }, this.renderLista(bloco.senao)),
      def.corpo && h('div', { class: 'bloco-pe' })
    );
    linha.addEventListener('pointerdown', (e) => this.comecar(e, { bloco, lista }, el));
    return el;
  }

  renderControles(bloco) {
    const def = BLOCOS[bloco.tipo];
    const parar = (e) => e.stopPropagation();
    if (def.vezes) {
      const mudar = (delta) => {
        if (this.travado) return;
        const novo = Math.min(VEZES_MAX, Math.max(VEZES_MIN, bloco.vezes + delta));
        if (novo === bloco.vezes) return;
        bloco.vezes = novo;
        sons.tocar('clique');
        this.mudou();
      };
      return h(
        'span',
        { class: 'bloco-controle', onPointerdown: parar },
        h('button', { type: 'button', class: 'vezes-botao', 'aria-label': 'Menos', text: '−', onClick: () => mudar(-1) }),
        h('span', { class: 'vezes-numero', text: String(bloco.vezes) }),
        h('button', { type: 'button', class: 'vezes-botao', 'aria-label': 'Mais', text: '+', onClick: () => mudar(1) }),
        h('span', { class: 'bloco-texto', text: 'vezes' })
      );
    }
    if (def.condicao) {
      const opcoes = this.fase.condicoes || [];
      if (!opcoes.includes(bloco.condicao)) bloco.condicao = opcoes[0];
      const rotulo = (c) => `${CONDICOES[c].icone} ${CONDICOES[c][def.condicao]}`;
      if (opcoes.length <= 1) return h('span', { class: 'bloco-condicao', text: rotulo(bloco.condicao) });
      return h(
        'select',
        {
          class: 'bloco-condicao',
          onPointerdown: parar,
          onChange: (e) => {
            bloco.condicao = e.target.value;
            this.mudou();
          },
          disabled: this.travado,
        },
        opcoes.map((c) => h('option', { value: c, selected: c === bloco.condicao, text: rotulo(c) }))
      );
    }
    return null;
  }

  // ---------- mudanças no plano ----------

  mudou() {
    this.renderPlano();
    this.aoMudar(this.plano);
  }

  inserirNovo(tipo, lista = this.cursor.lista, indice = this.cursor.indice) {
    if (this.travado) return;
    const bloco = novoBloco(tipo, { condicoes: this.fase.condicoes });
    lista.splice(indice, 0, bloco);
    // Bloco com corpo: o próximo clique já entra dentro dele
    this.cursor = BLOCOS[tipo].corpo ? { lista: bloco.corpo, indice: 0 } : { lista, indice: indice + 1 };
    sons.tocar('encaixar');
    this.mudou();
    this.piscar(bloco.id);
  }

  moverBloco(bloco, deLista, paraLista, indice) {
    const de = deLista.indexOf(bloco);
    deLista.splice(de, 1);
    if (deLista === paraLista && de < indice) indice -= 1;
    paraLista.splice(indice, 0, bloco);
    this.cursor = { lista: paraLista, indice: indice + 1 };
    sons.tocar('encaixar');
    this.mudou();
    this.piscar(bloco.id);
  }

  remover(bloco, lista) {
    const i = lista.indexOf(bloco);
    if (i < 0) return;
    lista.splice(i, 1);
    if (this.cursor.lista === lista && this.cursor.indice > i) this.cursor.indice -= 1;
    sons.tocar('tirar');
    this.mudou();
  }

  limpar() {
    this.plano.splice(0);
    this.cursor = { lista: this.plano, indice: 0 };
    sons.tocar('tirar');
    this.mudou();
  }

  piscar(id) {
    const el = this.areaEl.querySelector(`[data-id="${id}"]`);
    if (!el) return;
    el.classList.add('chegou');
    setTimeout(() => el.classList.remove('chegou'), 400);
  }

  // ---------- destaque durante a execução ----------

  destacar(id, classe = 'executando') {
    for (const el of this.areaEl.querySelectorAll(`.${classe}`)) el.classList.remove(classe);
    if (!id) return;
    const el = this.areaEl.querySelector(`[data-id="${id}"]`);
    if (!el) return;
    el.classList.add(classe);
    // mantém o bloco visível em planos compridos, sem mexer na página
    const area = this.areaEl;
    const c = el.getBoundingClientRect();
    const a = area.getBoundingClientRect();
    if (c.top < a.top || c.top > a.bottom - 40) area.scrollTop += c.top - a.top - 40;
  }

  limparDestaques() {
    this.destacar(null, 'executando');
    this.destacar(null, 'com-erro');
  }

  // ---------- arrastar ----------

  comecar(e, origem, el) {
    if (this.travado || e.button > 0) return;
    if (e.target.closest('button:not(.paleta-item), select')) return;
    this.cancelarArraste();
    this.arraste = { origem, el, x0: e.clientX, y0: e.clientY, ativo: false, alvo: null, lixeira: false };
    window.addEventListener('pointermove', this.aoMover);
    window.addEventListener('pointerup', this.aoSoltar);
    window.addEventListener('pointercancel', this.aoSoltar);
  }

  mover(e) {
    const a = this.arraste;
    if (!a) return;
    if (!a.ativo) {
      if (Math.abs(e.clientX - a.x0) + Math.abs(e.clientY - a.y0) < DISTANCIA_ARRASTE) return;
      this.iniciarArraste(e);
    }
    e.preventDefault();
    a.fantasma.style.transform = `translate(${e.clientX - a.dx}px, ${e.clientY - a.dy}px)`;
    const alvo = this.fendaMaisPerto(e.clientX, e.clientY);
    if (alvo !== a.alvo) {
      if (a.alvo) a.alvo.el.classList.remove('alvo');
      if (alvo) alvo.el.classList.add('alvo');
      a.alvo = alvo;
    }
    a.lixeira = !alvo && !!a.origem.bloco;
    this.paletaEl.classList.toggle('lixeira', a.lixeira);
  }

  iniciarArraste(e) {
    const a = this.arraste;
    a.ativo = true;
    const selecao = window.getSelection && window.getSelection();
    if (selecao) selecao.removeAllRanges();
    const caixa = a.el.getBoundingClientRect();
    a.dx = e.clientX - caixa.left;
    a.dy = e.clientY - caixa.top;
    const fantasma = a.el.cloneNode(true);
    fantasma.classList.add('bloco-fantasma');
    fantasma.style.width = `${caixa.width}px`;
    fantasma.style.transform = `translate(${caixa.left}px, ${caixa.top}px)`;
    document.body.appendChild(fantasma);
    a.fantasma = fantasma;
    if (a.origem.bloco) a.el.classList.add('sendo-arrastado');
    document.body.classList.add('arrastando-bloco');
    sons.tocar('clique');
  }

  /** A fenda mais próxima do ponteiro, se ele estiver sobre o plano */
  fendaMaisPerto(x, y) {
    const area = this.areaEl.getBoundingClientRect();
    if (x < area.left - 40 || x > area.right + 40 || y < area.top - 30 || y > area.bottom + 30) return null;
    const arrastado = this.arraste.origem.bloco ? this.arraste.el : null;
    let melhor = null;
    let menor = Infinity;
    for (const fenda of this.fendas) {
      if (arrastado && arrastado.contains(fenda.el)) continue;
      const c = fenda.el.getBoundingClientRect();
      const dy = y < c.top ? c.top - y : y > c.bottom ? y - c.bottom : 0;
      const dx = x < c.left ? c.left - x : x > c.right ? (x - c.right) * 0.3 : 0;
      const d = dy + dx;
      if (d < menor) {
        menor = d;
        melhor = fenda;
      }
    }
    return melhor;
  }

  soltar() {
    const a = this.arraste;
    if (!a) return;
    const { origem, alvo, ativo, lixeira } = a;
    this.cancelarArraste();
    if (!ativo) {
      // Foi um clique
      if (origem.tipo) this.inserirNovo(origem.tipo);
      else {
        const i = origem.lista.indexOf(origem.bloco);
        this.cursor = { lista: origem.lista, indice: i + 1 };
        this.renderPlano();
      }
      return;
    }
    if (alvo) {
      if (origem.tipo) this.inserirNovo(origem.tipo, alvo.lista, alvo.indice);
      else this.moverBloco(origem.bloco, origem.lista, alvo.lista, alvo.indice);
    } else if (origem.bloco && lixeira) {
      this.remover(origem.bloco, origem.lista);
    }
  }

  cancelarArraste() {
    const a = this.arraste;
    window.removeEventListener('pointermove', this.aoMover);
    window.removeEventListener('pointerup', this.aoSoltar);
    window.removeEventListener('pointercancel', this.aoSoltar);
    if (!a) return;
    if (a.fantasma) a.fantasma.remove();
    if (a.alvo) a.alvo.el.classList.remove('alvo');
    a.el.classList.remove('sendo-arrastado');
    this.paletaEl.classList.remove('lixeira');
    document.body.classList.remove('arrastando-bloco');
    this.arraste = null;
  }
}
