import { h } from '../../../../core/dom.js';

/** Pixels por centímetro (96 dpi, como o navegador) */
export const CM = 96 / 2.54;
export const ESPACO_ENTRE_PAGINAS = 18;

export const TAMANHOS = {
  A4: { nome: 'A4', largura: 21, altura: 29.7 },
  Carta: { nome: 'Carta', largura: 21.59, altura: 27.94 },
  Oficio: { nome: 'Ofício', largura: 21.59, altura: 35.56 },
};

// Margens do Word em português (Normal: 2,5 cm em cima e embaixo, 3 cm nos lados)
export const MARGENS = {
  normal: { nome: 'Normal', topo: 2.5, base: 2.5, esquerda: 3, direita: 3 },
  estreita: { nome: 'Estreita', topo: 1.27, base: 1.27, esquerda: 1.27, direita: 1.27 },
  moderada: { nome: 'Moderada', topo: 2.54, base: 2.54, esquerda: 1.91, direita: 1.91 },
  larga: { nome: 'Larga', topo: 2.54, base: 2.54, esquerda: 5.08, direita: 5.08 },
};

export const LAYOUT_PADRAO = Object.freeze({ orientacao: 'retrato', margens: 'normal', colunas: 1, tamanho: 'A4', corPagina: null });

/** Medidas da página em pixels */
export function medidas(layout) {
  const t = TAMANHOS[layout.tamanho] || TAMANHOS.A4;
  const m = MARGENS[layout.margens] || MARGENS.normal;
  const deitada = layout.orientacao === 'paisagem';
  const largura = (deitada ? t.altura : t.largura) * CM;
  const altura = (deitada ? t.largura : t.altura) * CM;
  return {
    largura,
    altura,
    topo: m.topo * CM,
    base: m.base * CM,
    esquerda: m.esquerda * CM,
    direita: m.direita * CM,
    conteudoLargura: largura - (m.esquerda + m.direita) * CM,
    conteudoAltura: altura - (m.topo + m.base) * CM,
  };
}

/**
 * Folhas do documento: desenha uma folha branca para cada página, com
 * cabeçalho, rodapé e número, e empurra para a página seguinte o parágrafo
 * que não cabe (ou que vem depois de uma quebra de página).
 *
 * O corpo editável é um só (fica por cima das folhas); o "empurrão" é uma
 * margem em cima do bloco, guardada em data-empurrado e retirada ao salvar.
 */
export class Paginas {
  constructor({ folhas, corpo, aoDuploCliqueNaMargem }) {
    this.folhas = folhas;
    this.corpo = corpo;
    this.fundos = h('div', { class: 'word-fundos' });
    folhas.prepend(this.fundos);
    this.aoDuploCliqueNaMargem = aoDuploCliqueNaMargem;
    this.total = 1;
    this.inicioDasPaginas = [0];
    this.cabecalho = '';
    this.rodape = '';
    this.numeroPagina = null;
    this.editandoMargem = null;
  }

  configurar(layout, { cabecalho = '', rodape = '', numeroPagina = null } = {}) {
    this.layout = layout;
    this.m = medidas(layout);
    Object.assign(this, { cabecalho, rodape, numeroPagina });
    Object.assign(this.folhas.style, { width: `${this.m.largura}px` });
    Object.assign(this.corpo.style, {
      left: `${this.m.esquerda}px`,
      top: `${this.m.topo}px`,
      width: `${this.m.conteudoLargura}px`,
      minHeight: `${this.m.conteudoAltura}px`,
      columnCount: layout.colunas > 1 ? String(layout.colunas) : '',
    });
    this.corpo.classList.toggle('doc-colunas', layout.colunas > 1);
  }

  get passo() {
    return this.m.altura + ESPACO_ENTRE_PAGINAS;
  }

  /** Blocos que podem ir para a próxima página (itens de lista contam um a um) */
  unidades() {
    const lista = [];
    for (const filho of this.corpo.children) {
      if (filho.tagName === 'UL' || filho.tagName === 'OL') lista.push(...filho.children);
      else lista.push(filho);
    }
    return lista;
  }

  limparEmpurroes() {
    for (const el of this.corpo.querySelectorAll('[data-empurrado]')) {
      el.style.marginTop = el.dataset.margemOriginal || '';
      if (!el.getAttribute('style')) el.removeAttribute('style');
      delete el.dataset.empurrado;
      delete el.dataset.margemOriginal;
    }
  }

  paginar() {
    if (!this.m) return;
    this.limparEmpurroes();
    const { conteudoAltura } = this.m;
    const passo = this.passo;
    this.inicioDasPaginas = [0];
    if (this.layout.colunas > 1) {
      this.total = Math.max(1, Math.ceil((this.corpo.offsetHeight - 2) / conteudoAltura));
    } else {
      let forcar = false;
      let ultimoFim = 0;
      for (const el of this.unidades()) {
        if (el.classList?.contains('doc-quebra')) {
          forcar = true;
          continue;
        }
        const topo = el.offsetTop;
        const altura = el.offsetHeight;
        const pagina = Math.floor((topo + 1) / passo);
        const topoDaPagina = pagina * passo;
        const fimDaPagina = topoDaPagina + conteudoAltura;
        let empurrar = 0;
        const noTopo = topo <= topoDaPagina + 1;
        if (forcar && !noTopo) empurrar = (pagina + 1) * passo - topo;
        else if (topo >= fimDaPagina - 1) empurrar = (pagina + 1) * passo - topo;
        else if (topo + altura > fimDaPagina + 1 && !noTopo && altura <= conteudoAltura) empurrar = (pagina + 1) * passo - topo;
        if (empurrar > 0) {
          el.dataset.margemOriginal = el.style.marginTop || '';
          const base = parseFloat(getComputedStyle(el).marginTop) || 0;
          el.style.marginTop = `${base + empurrar}px`;
          el.dataset.empurrado = '1';
        }
        forcar = false;
        const novaPagina = Math.floor((el.offsetTop + 1) / passo);
        if (novaPagina >= this.inicioDasPaginas.length) this.inicioDasPaginas.push(el.offsetTop);
        ultimoFim = el.offsetTop + el.offsetHeight;
      }
      this.total = Math.max(1, Math.floor(Math.max(0, ultimoFim - 1) / passo) + 1, this.inicioDasPaginas.length);
    }
    this.desenharFundos();
    return this.total;
  }

  /** Página (começando em 1) de um elemento do corpo */
  paginaDe(el) {
    if (!this.m || !el) return 1;
    let alvo = el.nodeType === 3 ? el.parentElement : el;
    while (alvo && alvo.offsetParent !== this.corpo && alvo !== this.corpo) alvo = alvo.parentElement;
    if (!alvo || alvo === this.corpo) return 1;
    return Math.floor((alvo.offsetTop + 1) / this.passo) + 1;
  }

  desenharFundos() {
    const { altura, largura, esquerda, direita } = this.m;
    const paginas = [];
    for (let i = 0; i < this.total; i++) {
      const numero = this.numeroPagina ? h('div', { class: `word-numero alinhar-${this.numeroPagina.alinhamento || 'centro'}`, text: String(i + 1) }) : null;
      const cab = h('div', { class: 'word-cabecalho', 'data-alvo': i === 0 ? 'word.cabecalho' : null, style: { left: `${esquerda}px`, right: `${direita}px` } });
      const rod = h('div', { class: 'word-rodape', 'data-alvo': i === 0 ? 'word.rodape' : null, style: { left: `${esquerda}px`, right: `${direita}px` } });
      cab.innerHTML = this.cabecalho;
      rod.innerHTML = this.rodape;
      if (numero) (this.numeroPagina.posicao === 'inicio' ? cab : rod).append(numero);
      const pagina = h(
        'div',
        {
          class: 'word-pagina',
          style: { top: `${i * this.passo}px`, height: `${altura}px`, width: `${largura}px`, background: this.layout.corPagina || '' },
        },
        cab,
        rod
      );
      pagina.addEventListener('dblclick', (e) => {
        const r = pagina.getBoundingClientRect();
        const escala = r.height / altura;
        const y = (e.clientY - r.top) / escala;
        if (y < this.m.topo) this.aoDuploCliqueNaMargem?.('cabecalho');
        else if (y > altura - this.m.base) this.aoDuploCliqueNaMargem?.('rodape');
      });
      paginas.push(pagina);
    }
    this.fundos.replaceChildren(...paginas);
    this.folhas.style.height = `${this.total * this.passo - ESPACO_ENTRE_PAGINAS}px`;
    if (this.editandoMargem) this.ligarEdicaoDaMargem(this.editandoMargem.tipo, this.editandoMargem.aoMudar);
  }

  /** Modo de edição do cabeçalho/rodapé: a margem da 1ª página vira editável */
  ligarEdicaoDaMargem(tipo, aoMudar) {
    this.editandoMargem = { tipo, aoMudar };
    this.folhas.classList.add('editando-margem');
    const alvo = this.fundos.querySelector(tipo === 'cabecalho' ? '.word-cabecalho' : '.word-rodape');
    if (!alvo) return null;
    alvo.querySelector('.word-numero')?.setAttribute('contenteditable', 'false');
    alvo.contentEditable = 'true';
    alvo.spellcheck = false;
    alvo.classList.add('editando');
    alvo.addEventListener('input', () => {
      const copia = alvo.cloneNode(true);
      copia.querySelector('.word-numero')?.remove();
      aoMudar(copia.innerHTML.replace(/<br>$/, ''));
    });
    return alvo;
  }

  /** Copia o cabeçalho/rodapé que está sendo editado para as outras páginas */
  espelhar(tipo, html) {
    if (tipo === 'cabecalho') this.cabecalho = html;
    else this.rodape = html;
    const seletor = tipo === 'cabecalho' ? '.word-cabecalho' : '.word-rodape';
    [...this.fundos.querySelectorAll(seletor)].slice(1).forEach((el, i) => {
      const numero = el.querySelector('.word-numero');
      el.innerHTML = html;
      if (numero) {
        numero.textContent = String(i + 2);
        el.append(numero);
      }
    });
  }

  desligarEdicaoDaMargem() {
    this.editandoMargem = null;
    this.folhas.classList.remove('editando-margem');
    this.desenharFundos();
  }
}
