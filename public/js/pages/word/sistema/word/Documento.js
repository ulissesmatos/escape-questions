import { h } from '../../../../core/dom.js';
import {
  achatar,
  alternarLista,
  aplicarNoIntervalo,
  blocoDe,
  blocosNoIntervalo,
  ehBloco,
  estiloCalculado,
  intervaloDe,
  normalizarEstrutura,
  posicao,
  restaurarSelecao,
  salvarSelecao,
  textosNoIntervalo,
  tirarDaLista,
  todosOsBlocos,
  trocarTag,
} from './Formatacao.js';
import { Historico } from './Historico.js';
import { CM, LAYOUT_PADRAO, Paginas } from './Paginas.js';
import { errosNoTexto, textoRand } from '../../regras/ortografia.js';

/** Estilos de parágrafo da galeria (como o Word 2019 em português) */
export const ESTILOS_DE_PARAGRAFO = {
  normal: { nome: 'Normal', tag: 'P', estilo: null },
  'sem-espaco': { nome: 'Sem Espaçamento', tag: 'P', estilo: 'sem-espaco' },
  titulo1: { nome: 'Título 1', tag: 'H1', estilo: null },
  titulo2: { nome: 'Título 2', tag: 'H2', estilo: null },
  titulo3: { nome: 'Título 3', tag: 'H3', estilo: null },
  titulo: { nome: 'Título', tag: 'P', estilo: 'titulo' },
  subtitulo: { nome: 'Subtítulo', tag: 'P', estilo: 'subtitulo' },
  citacao: { nome: 'Citação', tag: 'P', estilo: 'citacao' },
};

export function estiloDoBloco(bloco) {
  if (!bloco) return 'normal';
  if (bloco.tagName === 'H1') return 'titulo1';
  if (bloco.tagName === 'H2') return 'titulo2';
  if (bloco.tagName === 'H3') return 'titulo3';
  return bloco.dataset.estilo || 'normal';
}

const TAGS_PERMITIDAS = new Set(['P', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'TABLE', 'TBODY', 'TR', 'TD', 'TH', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'SUB', 'SUP', 'BR', 'IMG', 'A']);
const PROPS_PERMITIDAS = ['font-weight', 'font-style', 'text-decoration-line', 'text-decoration', 'font-family', 'font-size', 'color', 'background-color', 'vertical-align', 'text-align', 'text-indent', 'margin-left', 'line-height', 'width'];

/** Limpa HTML colado de fora: só tags e estilos que o Word simulado entende */
export function sanitizar(html) {
  const modelo = document.createElement('template');
  modelo.innerHTML = html;
  const limpar = (no) => {
    for (const filho of [...no.childNodes]) {
      if (filho.nodeType === 3) continue;
      if (filho.nodeType !== 1) {
        filho.remove();
        continue;
      }
      if (['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'IFRAME', 'OBJECT', 'SVG'].includes(filho.tagName)) {
        filho.remove();
        continue;
      }
      limpar(filho);
      if (filho.tagName === 'DIV' && filho.classList.contains('doc-quebra')) continue;
      if (!TAGS_PERMITIDAS.has(filho.tagName)) {
        if (filho.tagName === 'DIV' || /^H[4-6]$/.test(filho.tagName)) {
          const p = document.createElement('p');
          p.append(...filho.childNodes);
          filho.replaceWith(p);
        } else filho.replaceWith(...filho.childNodes);
        continue;
      }
      const estilo = filho.style;
      const guardar = PROPS_PERMITIDAS.map((p) => [p, estilo.getPropertyValue(p)]).filter(([, v]) => v);
      for (const attr of [...filho.attributes]) {
        const nome = attr.name;
        const manter =
          (nome === 'href' && filho.tagName === 'A' && /^https?:/i.test(attr.value)) ||
          (nome === 'src' && filho.tagName === 'IMG' && /^(\/images\/|data:image\/)/.test(attr.value)) ||
          nome === 'data-arquivo' ||
          nome === 'data-estilo' ||
          nome === 'data-entre-linhas' ||
          nome === 'data-marcador' ||
          (nome === 'type' && filho.tagName === 'OL');
        if (!manter) filho.removeAttribute(nome);
      }
      if (guardar.length) filho.setAttribute('style', guardar.map(([p, v]) => `${p}: ${v}`).join('; '));
      if (filho.tagName === 'IMG' && !filho.getAttribute('src')) filho.remove();
    }
  };
  limpar(modelo.content);
  return modelo.innerHTML;
}

const escapar = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * O documento aberto no Word: conteúdo editável, páginas, histórico e todos
 * os comandos (formatar, listas, tabelas, imagens, quebra, sumário,
 * localizar/substituir, ortografia...).
 *
 * Avisa o Word pelos callbacks: aoMudar() depois de qualquer mudança,
 * aoSelecionar() quando a seleção muda, emitir(evento) para a missão.
 */
export class Documento {
  constructor({ corpo, folhas, camada, aoMudar, aoSelecionar, emitir, aoEditarMargem }) {
    this.corpo = corpo;
    this.folhas = folhas;
    this.camada = camada;
    this.aoMudar = aoMudar;
    this.aoSelecionar = aoSelecionar;
    this.emitir = emitir;
    this.historico = new Historico();
    this.paginas = new Paginas({ folhas, corpo, aoDuploCliqueNaMargem: (tipo) => aoEditarMargem?.(tipo) });
    this.config = { layout: { ...LAYOUT_PADRAO }, cabecalho: '', rodape: '', numeroPagina: null };
    this.pendente = null;
    this.ignorados = new Set();
    this.escala = 1;
    this.ultimaSelecao = null;
    this.ligarEventos();
  }

  // ================= conteúdo =================

  carregar({ html = '<p><br></p>', layout = {}, cabecalho = '', rodape = '', numeroPagina = null } = {}) {
    this.corpo.innerHTML = sanitizarDocumento(html);
    normalizarEstrutura(this.corpo);
    for (const b of todosOsBlocos(this.corpo)) achatar(b);
    this.config = { layout: { ...LAYOUT_PADRAO, ...layout }, cabecalho, rodape, numeroPagina };
    this.historico.limpar();
    this.pendente = null;
    this.ignorados.clear();
    this.reconfigurar();
    this.atualizarSumarios({ registrar: false });
  }

  /** HTML limpo (sem os empurrões da paginação nem botões de interface) */
  serializar() {
    const copia = this.corpo.cloneNode(true);
    for (const el of copia.querySelectorAll('[data-empurrado]')) {
      el.style.marginTop = el.dataset.margemOriginal || '';
      if (!el.getAttribute('style')) el.removeAttribute('style');
      delete el.dataset.empurrado;
      delete el.dataset.margemOriginal;
    }
    copia.querySelectorAll('.doc-sumario-acoes, .doc-imagem-selecionada').forEach((el) => el.remove());
    copia.querySelectorAll('.img-selecionada').forEach((el) => el.classList.remove('img-selecionada'));
    copia.querySelectorAll('[class=""]').forEach((el) => el.removeAttribute('class'));
    return copia.innerHTML;
  }

  conteudo() {
    return { html: this.serializar(), ...structuredClone(this.config) };
  }

  foto() {
    return { html: this.serializar(), config: structuredClone(this.config), selecao: salvarSelecao(this.corpo) || this.ultimaSelecao };
  }

  aplicarFoto(foto) {
    this.corpo.innerHTML = foto.html;
    this.config = structuredClone(foto.config);
    this.reconfigurar();
    if (foto.selecao) {
      this.corpo.focus({ preventScroll: true });
      try {
        restaurarSelecao(this.corpo, foto.selecao);
      } catch {
        // seleção antiga não cabe mais: fica no começo
      }
    }
  }

  /**
   * Toda mudança passa por aqui: guarda a foto para o Desfazer, roda a
   * mudança, arruma a estrutura, refaz as páginas e avisa o Word.
   */
  mudar(descricao, fn, { marca = null } = {}) {
    this.historico.registrar(this.foto(), { descricao, marca });
    const resultado = fn();
    normalizarEstrutura(this.corpo);
    this.depoisDeMudar();
    return resultado;
  }

  depoisDeMudar() {
    this.paginar();
    this.agendarOrtografia();
    this.aoMudar?.();
  }

  reconfigurar() {
    this.paginas.configurar(this.config.layout, this.config);
    this.paginar();
    this.agendarOrtografia();
  }

  paginar() {
    this.paginas.paginar();
    this.desenharCamadas();
  }

  definirConfig(parcial, descricao = 'Layout') {
    this.historico.registrar(this.foto(), { descricao });
    if (parcial.layout) this.config.layout = { ...this.config.layout, ...parcial.layout };
    for (const k of ['cabecalho', 'rodape', 'numeroPagina']) if (k in parcial) this.config[k] = parcial[k];
    this.reconfigurar();
    this.atualizarSumarios({ registrar: false });
    this.aoMudar?.();
  }

  desfazer() {
    const foto = this.historico.desfazer(this.foto());
    if (!foto) return null;
    this.aplicarFoto(foto);
    this.aoMudar?.();
    this.emitir({ tipo: 'desfazer', marca: foto.marca, descricao: foto.descricao });
    return foto;
  }

  refazer() {
    const foto = this.historico.refazer(this.foto());
    if (!foto) return null;
    this.aplicarFoto(foto);
    this.aoMudar?.();
    this.emitir({ tipo: 'refazer' });
    return foto;
  }

  // ================= seleção =================

  /** Seleção atual no documento (ou a última, se o foco foi para a faixa) */
  intervalo() {
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const r = sel.getRangeAt(0);
      if (this.corpo.contains(r.startContainer) && this.corpo.contains(r.endContainer)) return r;
    }
    if (this.ultimaSelecao) {
      try {
        return intervaloDe(this.corpo, this.ultimaSelecao);
      } catch {
        return null;
      }
    }
    return null;
  }

  focar() {
    const r = this.intervalo();
    this.corpo.focus({ preventScroll: true });
    if (r) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    }
  }

  textoSelecionado() {
    const r = this.intervalo();
    return r ? r.toString() : '';
  }

  /** Texto do parágrafo do cursor (para os diagnósticos da missão) */
  textoDoParagrafo() {
    const r = this.intervalo();
    const bloco = r && blocoDe(r.startContainer, this.corpo);
    return bloco ? bloco.textContent : '';
  }

  selecionarIntervalo(range) {
    this.corpo.focus({ preventScroll: true });
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    this.ultimaSelecao = salvarSelecao(this.corpo);
  }

  /** Palavra em volta do cursor (letras, números, hífen e apóstrofo) */
  palavraNoCursor(r) {
    const no = r.startContainer;
    if (no.nodeType !== 3) return null;
    const texto = no.data;
    const ehLetra = (c) => /[\p{L}\p{N}'-]/u.test(c || '');
    let a = r.startOffset;
    let b = r.startOffset;
    if (!ehLetra(texto[a - 1]) || !ehLetra(texto[b])) return null; // só se o cursor está DENTRO da palavra
    while (a > 0 && ehLetra(texto[a - 1])) a--;
    while (b < texto.length && ehLetra(texto[b])) b++;
    const palavra = document.createRange();
    palavra.setStart(no, a);
    palavra.setEnd(no, b);
    return palavra;
  }

  // ================= formatação de caracteres =================

  /** Estilo do texto na seleção (para os botões da faixa ficarem acesos) */
  estiloDaSelecao() {
    const r = this.intervalo();
    if (!r) return null;
    const pedacos = textosNoIntervalo(r, this.corpo);
    let nos = pedacos.map((p) => p.no);
    if (!nos.length) {
      let no = r.startContainer;
      if (no.nodeType === 1) no = no.childNodes[r.startOffset - 1] || no.childNodes[r.startOffset] || no;
      nos = [no.nodeType === 3 ? no : no.firstChild || no].filter(Boolean);
    }
    if (!nos.length) return null;
    const estilos = nos.map((n) => estiloCalculado(n, this.corpo));
    const juntar = (k) => (estilos.every((e) => String(e[k]) === String(estilos[0][k])) ? estilos[0][k] : null);
    const base = { negrito: estilos.every((e) => e.negrito), italico: estilos.every((e) => e.italico), sublinhado: estilos.every((e) => e.sublinhado), tachado: estilos.every((e) => e.tachado), fonte: juntar('fonte'), tamanho: juntar('tamanho'), script: juntar('script') };
    return this.pendente ? { ...base, ...this.pendente, fonte: this.pendente.fonte || base.fonte, tamanho: this.pendente.tamanho || base.tamanho } : base;
  }

  /**
   * Formata a seleção. Sem seleção: se o cursor está no meio de uma palavra,
   * vale para a palavra inteira (como no Word); senão, para o que for
   * digitado em seguida.
   */
  formatar(mudanca, descricao) {
    let r = this.intervalo();
    if (!r) return { vazio: true };
    if (r.collapsed) {
      const palavra = this.palavraNoCursor(r);
      if (!palavra) {
        const atual = estiloCalculado(r.startContainer, this.corpo);
        this.pendente = { ...(this.pendente || {}), ...mudanca(atual) };
        this.focar();
        this.posicaoDoPendente = salvarSelecao(this.corpo)?.inicio;
        this.aoSelecionar?.();
        return { vazio: true, pendente: true };
      }
      const salva = salvarSelecao(this.corpo);
      this.mudar(descricao, () => aplicarNoIntervalo(palavra, this.corpo, mudanca, (n) => estiloCalculado(n, this.corpo)));
      restaurarSelecao(this.corpo, salva);
      this.ultimaSelecao = salva;
      return { vazio: false, selecao: palavra.toString() };
    }
    const texto = r.toString();
    this.mudar(descricao, () => aplicarNoIntervalo(r, this.corpo, mudanca, (n) => estiloCalculado(n, this.corpo)));
    this.ultimaSelecao = salvarSelecao(this.corpo);
    return { vazio: false, selecao: texto };
  }

  /** Liga/desliga negrito, itálico, sublinhado ou tachado */
  alternar(prop, descricao) {
    const atual = this.estiloDaSelecao();
    const ligar = !(atual && atual[prop]);
    return this.formatar(() => ({ [prop]: ligar }), descricao);
  }

  /** Muda o texto (maiúsculas/minúsculas) sem mexer na formatação */
  trocarCaixa(modo) {
    let r = this.intervalo();
    if (!r) return { vazio: true };
    if (r.collapsed) {
      const palavra = this.palavraNoCursor(r);
      if (!palavra) return { vazio: true };
      r = palavra;
    }
    const salva = { inicio: posicao(this.corpo, r.startContainer, r.startOffset), fim: posicao(this.corpo, r.endContainer, r.endOffset) };
    const pedacos = textosNoIntervalo(r, this.corpo);
    const original = pedacos.map((p) => p.no.data.slice(p.inicio, p.fim)).join('');
    if (modo === 'ciclo') modo = original === original.toLowerCase() ? 'maiusculas' : original === original.toUpperCase() ? 'palavras' : 'minusculas';
    const antes = (() => {
      const r0 = document.createRange();
      r0.setStart(blocoDe(r.startContainer, this.corpo) || this.corpo, 0);
      r0.setEnd(r.startContainer, r.startOffset);
      return r0.toString();
    })();
    const novo = mudarCaixa(original, modo, { inicioDeFrase: !antes.trim() || /[.!?]\s*$/.test(antes) });
    const texto = r.toString();
    this.mudar('Maiúsculas e Minúsculas', () => {
      let i = 0;
      for (const p of pedacos) {
        const n = p.fim - p.inicio;
        p.no.data = p.no.data.slice(0, p.inicio) + novo.slice(i, i + n) + p.no.data.slice(p.fim);
        i += n;
      }
    });
    restaurarSelecao(this.corpo, salva);
    this.ultimaSelecao = salva;
    return { vazio: false, selecao: texto, modo };
  }

  /** Limpar Toda a Formatação: trechos sem estilo e parágrafos no estilo Normal */
  limparFormatacao() {
    const r = this.intervalo();
    if (!r) return { vazio: true };
    const blocos = blocosNoIntervalo(r, this.corpo);
    const texto = r.toString();
    const salva = salvarSelecao(this.corpo);
    this.mudar('Limpar Formatação', () => {
      const alvo = r.collapsed ? (() => {
        const t = document.createRange();
        if (blocos[0]) t.selectNodeContents(blocos[0]);
        return t;
      })() : r;
      for (const { no: original, inicio, fim } of textosNoIntervalo(alvo, this.corpo)) {
        let no = original;
        if (fim < no.data.length) no.splitText(fim);
        if (inicio > 0) no = no.splitText(inicio);
        const bloco = blocoDe(no, this.corpo);
        // tira o nó de dentro dos spans até o bloco
        let pai = no.parentNode;
        while (pai && pai !== bloco && pai.tagName !== 'A') {
          const depois = pai.cloneNode(false);
          let irmao = no.nextSibling;
          while (irmao) {
            const prox = irmao.nextSibling;
            depois.append(irmao);
            irmao = prox;
          }
          pai.after(no);
          if (depois.childNodes.length) no.after(depois);
          if (!pai.childNodes.length) pai.remove();
          pai = no.parentNode;
        }
      }
      for (const b of blocos) {
        b.removeAttribute('style');
        delete b.dataset.entreLinhas;
        const novo = b.tagName === 'LI' ? b : trocarTag(b, 'P', { estilo: null });
        achatar(novo);
      }
    });
    restaurarSelecao(this.corpo, salva);
    return { vazio: !texto, selecao: texto };
  }

  // ================= parágrafo =================

  blocosDaSelecao() {
    const r = this.intervalo();
    return r ? blocosNoIntervalo(r, this.corpo) : [];
  }

  paragrafo(descricao, fn) {
    const blocos = this.blocosDaSelecao();
    if (!blocos.length) return { vazio: true };
    const salva = salvarSelecao(this.corpo) || this.ultimaSelecao;
    const texto = blocos.map((b) => b.textContent).join('\n');
    this.mudar(descricao, () => blocos.forEach(fn));
    if (salva) {
      restaurarSelecao(this.corpo, salva);
      this.ultimaSelecao = salva;
    }
    return { vazio: false, paragrafo: texto };
  }

  alinhar(valor) {
    return this.paragrafo('Alinhamento', (b) => {
      b.style.textAlign = valor === 'left' ? '' : valor;
    });
  }

  /** Recuo da primeira linha e recuo à esquerda (em cm) */
  recuos({ primeiraLinha, esquerda, direita }) {
    return this.paragrafo('Recuo', (b) => {
      if (primeiraLinha !== undefined) b.style.textIndent = primeiraLinha ? `${primeiraLinha}cm` : '';
      if (esquerda !== undefined) b.style.marginLeft = esquerda > 0 ? `${esquerda}cm` : '';
      if (direita !== undefined) b.style.marginRight = direita > 0 ? `${direita}cm` : '';
    });
  }

  mudarRecuo(delta) {
    return this.paragrafo(delta > 0 ? 'Aumentar Recuo' : 'Diminuir Recuo', (b) => {
      const atual = (parseFloat(getComputedStyle(b).marginLeft) || 0) / CM;
      const novo = Math.max(0, Math.round((atual + delta) / 1.25) * 1.25);
      b.style.marginLeft = novo ? `${novo}cm` : '';
    });
  }

  /** Espaçamento entre linhas: 1, 1.15, 1.5, 2... (múltiplo do simples) */
  entreLinhas(valor) {
    return this.paragrafo('Espaçamento entre Linhas', (b) => {
      b.dataset.entreLinhas = String(valor);
      b.style.lineHeight = String(Math.round(valor * 1.22 * 100) / 100);
    });
  }

  espacamento({ antes, depois }) {
    return this.paragrafo('Espaçamento', (b) => {
      if (antes !== undefined) b.style.marginTop = antes ? `${antes}pt` : '';
      if (depois !== undefined) b.style.marginBottom = `${depois}pt`;
    });
  }

  aplicarEstiloDeParagrafo(id) {
    const def = ESTILOS_DE_PARAGRAFO[id];
    const blocos = this.blocosDaSelecao();
    if (!blocos.length) return { vazio: true };
    const salva = salvarSelecao(this.corpo) || this.ultimaSelecao;
    const texto = blocos.map((b) => b.textContent).join('\n');
    this.mudar(`Estilo ${def.nome}`, () => {
      for (let b of blocos) {
        if (b.closest('td')) {
          trocarTag(b, def.tag === 'P' ? 'P' : def.tag, { estilo: def.estilo });
          continue;
        }
        if (b.tagName === 'LI' && def.tag !== 'P') b = tirarDaLista(b);
        if (b.tagName === 'LI') continue;
        const novo = trocarTag(b, def.tag, { estilo: def.estilo });
        // os títulos tiram cor e tamanho manuais, para valer o estilo
        if (def.tag !== 'P' || def.estilo === 'titulo') achatar(novo);
      }
    });
    if (salva) restaurarSelecao(this.corpo, salva);
    this.atualizarSumarios({ registrar: false, soSeExistir: true });
    return { vazio: false, paragrafo: texto };
  }

  lista(tipo, { marcador = null, numeracao = null } = {}) {
    const blocos = this.blocosDaSelecao();
    if (!blocos.length) return { vazio: true };
    const salva = salvarSelecao(this.corpo) || this.ultimaSelecao;
    const texto = blocos.map((b) => b.textContent).join('\n');
    const tag = tipo === 'numerada' ? 'OL' : 'UL';
    this.mudar(tipo === 'numerada' ? 'Numeração' : 'Marcadores', () => {
      const jaTem = blocos.every((b) => b.tagName === 'LI' && b.parentElement.tagName === tag);
      if (jaTem && (marcador || numeracao)) {
        const lista = blocos[0].parentElement;
        if (marcador) lista.dataset.marcador = marcador;
        if (numeracao) lista.dataset.numeracao = numeracao;
        return;
      }
      const itens = alternarLista(blocos, tag, this.corpo);
      const lista = itens[0]?.parentElement;
      if (lista && (lista.tagName === 'UL' || lista.tagName === 'OL')) {
        if (marcador) lista.dataset.marcador = marcador;
        if (numeracao) lista.dataset.numeracao = numeracao;
      }
    });
    if (salva) restaurarSelecao(this.corpo, salva);
    return { vazio: false, paragrafo: texto };
  }

  // ================= inserir =================

  /** Bloco de primeiro nível (filho do corpo) onde está o cursor */
  blocoDeTopo(no) {
    let atual = no;
    while (atual && atual.parentNode !== this.corpo) atual = atual.parentNode;
    return atual;
  }

  /** Divide o bloco no cursor (como o Enter) e devolve [antes, depois] */
  dividirNoCursor(r, { tagDepois = null } = {}) {
    const bloco = blocoDe(r.startContainer, this.corpo);
    if (!bloco) return [null, null];
    const resto = document.createRange();
    resto.setStart(r.startContainer, r.startOffset);
    resto.setEnd(bloco, bloco.childNodes.length);
    const conteudo = resto.extractContents();
    const tag = tagDepois || (bloco.tagName === 'LI' ? 'LI' : /^H\d$/.test(bloco.tagName) || bloco.dataset.estilo === 'titulo' || bloco.dataset.estilo === 'subtitulo' ? 'P' : bloco.tagName);
    const novo = document.createElement(tag);
    if (tag === bloco.tagName) for (const attr of bloco.attributes) if (attr.name !== 'data-empurrado' && attr.name !== 'data-margem-original') novo.setAttribute(attr.name, attr.value);
    novo.append(conteudo);
    // spans vazios que vieram junto (o Chrome clona os de fora)
    novo.querySelectorAll('span:empty').forEach((s) => s.remove());
    bloco.after(novo);
    for (const b of [bloco, novo]) {
      if (!b.textContent && !b.querySelector('img')) b.replaceChildren(document.createElement('br'));
      achatar(b);
    }
    return [bloco, novo];
  }

  colocarCursorNoInicio(bloco) {
    const r = document.createRange();
    r.setStart(bloco, 0);
    r.collapse(true);
    this.selecionarIntervalo(r);
  }

  colocarCursorNoFim(bloco) {
    const r = document.createRange();
    if (bloco.lastChild?.nodeName === 'BR') r.setStartBefore(bloco.lastChild);
    else {
      r.selectNodeContents(bloco);
      r.collapse(false);
    }
    r.collapse(true);
    this.selecionarIntervalo(r);
  }

  inserirQuebraDePagina() {
    const r = this.intervalo();
    if (!r) return { vazio: true };
    this.mudar('Quebra de Página', () => {
      if (!r.collapsed) r.deleteContents();
      let [antes, depois] = this.dividirNoCursor(r, { tagDepois: null });
      if (!antes) return;
      // a quebra fica entre os dois pedaços, no primeiro nível
      const topoAntes = this.blocoDeTopo(antes);
      if (antes.tagName === 'LI') {
        depois = tirarDaLista(depois);
      }
      const quebra = h('div', { class: 'doc-quebra', contenteditable: 'false' });
      if (topoAntes.tagName === 'TABLE') return;
      this.blocoDeTopo(antes).after(quebra);
      quebra.after(depois.tagName === 'LI' ? tirarDaLista(depois) : depois);
      // dividir bem no começo deixa um parágrafo vazio sobrando: tira
      if (!antes.textContent && !antes.querySelector('img') && antes.previousElementSibling) {
        if (antes.parentElement.tagName !== 'UL' && antes.parentElement.tagName !== 'OL') antes.remove();
      }
      if (/^H\d$/.test(antes.tagName) && !antes.textContent && antes.isConnected) antes.remove();
      this.colocarCursorNoInicio(depois);
    });
    return { vazio: false };
  }

  inserirPaginaEmBranco() {
    this.inserirQuebraDePagina();
    const r = this.intervalo();
    const bloco = r && blocoDe(r.startContainer, this.corpo);
    if (!bloco) return;
    this.mudar('Página em Branco', () => {
      const quebra = h('div', { class: 'doc-quebra', contenteditable: 'false' });
      const vazio = Object.assign(document.createElement('p'), { innerHTML: '<br>' });
      this.blocoDeTopo(bloco).before(quebra);
      quebra.before(vazio);
    });
  }

  /** Insere elementos de bloco (tabela, sumário...) depois do parágrafo do cursor */
  inserirBloco(elemento, { substituirVazio = true } = {}) {
    const r = this.intervalo();
    const bloco = r ? blocoDe(r.startContainer, this.corpo) : null;
    const topo = bloco ? this.blocoDeTopo(bloco) : this.corpo.lastElementChild;
    const vazio = bloco && !bloco.textContent && !bloco.querySelector('img') && bloco.parentNode === this.corpo;
    if (vazio && substituirVazio) topo.replaceWith(elemento);
    else if (topo) topo.after(elemento);
    else this.corpo.append(elemento);
    if (!elemento.nextElementSibling) elemento.after(Object.assign(document.createElement('p'), { innerHTML: '<br>' }));
    return elemento;
  }

  inserirTabela(colunas, linhas) {
    const tabela = h(
      'table',
      { class: 'doc-tabela' },
      h('tbody', {}, Array.from({ length: linhas }, () => h('tr', {}, Array.from({ length: colunas }, () => h('td', {}, h('p', {}, h('br')))))))
    );
    this.mudar('Inserir Tabela', () => this.inserirBloco(tabela));
    this.colocarCursorNoInicio(tabela.querySelector('p'));
    return tabela;
  }

  celulaDoCursor() {
    const r = this.intervalo();
    const no = r && (r.startContainer.nodeType === 3 ? r.startContainer.parentElement : r.startContainer);
    return no?.closest?.('td, th') && this.corpo.contains(no) ? no.closest('td, th') : null;
  }

  operarTabela(acao) {
    const celula = this.celulaDoCursor();
    if (!celula) return { vazio: true };
    const linha = celula.parentElement;
    const tabela = celula.closest('table');
    const coluna = [...linha.children].indexOf(celula);
    const novaCelula = () => h('td', {}, h('p', {}, h('br')));
    const descricoes = {
      linhaAcima: 'Inserir Linha',
      linhaAbaixo: 'Inserir Linha',
      colunaEsquerda: 'Inserir Coluna',
      colunaDireita: 'Inserir Coluna',
      excluirLinha: 'Excluir Linha',
      excluirColuna: 'Excluir Coluna',
      excluirTabela: 'Excluir Tabela',
    };
    let foco = null;
    this.mudar(descricoes[acao], () => {
      if (acao === 'linhaAcima' || acao === 'linhaAbaixo') {
        const nova = h('tr', {}, [...linha.children].map(() => novaCelula()));
        if (acao === 'linhaAcima') linha.before(nova);
        else linha.after(nova);
        foco = nova.children[coluna];
      } else if (acao === 'colunaEsquerda' || acao === 'colunaDireita') {
        for (const tr of tabela.rows) {
          const ref = tr.children[Math.min(coluna, tr.children.length - 1)];
          const nova = novaCelula();
          if (acao === 'colunaEsquerda') ref.before(nova);
          else ref.after(nova);
          if (tr === linha) foco = nova;
        }
      } else if (acao === 'excluirLinha') {
        const vizinha = linha.nextElementSibling || linha.previousElementSibling;
        linha.remove();
        if (!tabela.rows.length) tabela.remove();
        foco = vizinha?.children[0] || null;
      } else if (acao === 'excluirColuna') {
        for (const tr of [...tabela.rows]) tr.children[coluna]?.remove();
        if (!tabela.rows[0]?.children.length) tabela.remove();
      } else if (acao === 'excluirTabela') {
        const depois = tabela.nextElementSibling;
        tabela.remove();
        if (depois && ehBloco(depois)) foco = depois;
      }
    });
    const destino = foco?.querySelector?.('p') || foco;
    if (destino && destino.isConnected) this.colocarCursorNoInicio(destino);
    return { vazio: false };
  }

  /** Tab na tabela: próxima célula (na última, cria uma linha nova) */
  tabNaTabela(voltar) {
    const celula = this.celulaDoCursor();
    if (!celula) return false;
    const celulas = [...celula.closest('table').querySelectorAll('td, th')];
    const i = celulas.indexOf(celula);
    if (voltar) {
      if (i > 0) this.selecionarCelula(celulas[i - 1]);
      return true;
    }
    if (i === celulas.length - 1) {
      this.operarTabela('linhaAbaixo');
      this.emitir({ tipo: 'comando', comando: 'inserirLinha', origem: 'tab' });
      return true;
    }
    this.selecionarCelula(celulas[i + 1]);
    return true;
  }

  selecionarCelula(celula) {
    const r = document.createRange();
    const p = celula.querySelector('p') || celula;
    r.selectNodeContents(p);
    if (!p.textContent) r.collapse(true);
    this.selecionarIntervalo(r);
  }

  inserirImagem({ src, nome, larguraPx, alturaPx }) {
    const largura = Math.min(larguraPx, this.paginas.m.conteudoLargura);
    const img = h('img', { src, alt: nome, 'data-arquivo': nome, style: { width: `${Math.round(largura)}px` }, draggable: 'false' });
    img.dataset.proporcao = String(alturaPx / larguraPx);
    this.mudar('Inserir Imagem', () => {
      const r = this.intervalo();
      const bloco = r && blocoDe(r.startContainer, this.corpo);
      if (!bloco) {
        this.corpo.append(h('p', {}, img));
      } else if (!bloco.textContent && !bloco.querySelector('img')) {
        bloco.replaceChildren(img);
      } else {
        r.collapse(true);
        r.insertNode(img);
      }
    });
    this.selecionarImagem(img);
    return img;
  }

  redimensionarImagem(img, larguraPx, { registrar = true } = {}) {
    const limite = this.paginas.m.conteudoLargura;
    const nova = Math.round(Math.max(20, Math.min(limite, larguraPx)));
    if (registrar) this.mudar('Redimensionar Imagem', () => (img.style.width = `${nova}px`));
    else img.style.width = `${nova}px`;
    this.desenharCamadas();
  }

  inserirTexto(texto, descricao = 'Digitação') {
    const r = this.intervalo();
    if (!r) return;
    this.mudar(descricao, () => {
      r.deleteContents();
      const no = document.createTextNode(texto);
      r.insertNode(no);
      const depois = document.createRange();
      depois.setStartAfter(no);
      depois.collapse(true);
      this.selecionarIntervalo(depois);
    });
  }

  inserirLink(texto, url) {
    const r = this.intervalo();
    if (!r) return { vazio: true };
    this.mudar('Inserir Link', () => {
      const a = h('a', { href: url });
      if (!r.collapsed) {
        a.append(r.extractContents());
      } else a.textContent = texto || url;
      if (!a.textContent.trim()) a.textContent = texto || url;
      r.insertNode(a);
      const bloco = blocoDe(a, this.corpo);
      if (bloco) achatar(bloco);
    });
    return { vazio: false };
  }

  // ================= sumário =================

  titulos() {
    return [...this.corpo.querySelectorAll('h1, h2, h3')]
      .filter((t) => !t.closest('.doc-sumario') && t.textContent.trim())
      .map((t) => ({ texto: t.textContent.trim(), nivel: Number(t.tagName[1]), pagina: this.paginas.paginaDe(t), el: t }));
  }

  inserirSumario() {
    const sumario = h('div', { class: 'doc-sumario', contenteditable: 'false' });
    this.mudar('Inserir Sumário', () => {
      const r = this.intervalo();
      const bloco = r && blocoDe(r.startContainer, this.corpo);
      const topo = bloco ? this.blocoDeTopo(bloco) : this.corpo.firstElementChild;
      const vazio = bloco && !bloco.textContent && bloco.parentNode === this.corpo;
      if (vazio) topo.replaceWith(sumario);
      else topo.before(sumario);
    });
    this.atualizarSumarios({ registrar: false });
    return sumario;
  }

  /** Recalcula títulos e páginas de todos os sumários (2 passadas: o sumário também ocupa espaço) */
  atualizarSumarios({ registrar = true, soSeExistir = false } = {}) {
    const sumarios = [...this.corpo.querySelectorAll('.doc-sumario')];
    if (!sumarios.length) return false;
    if (soSeExistir) return false;
    if (registrar) this.historico.registrar(this.foto(), { descricao: 'Atualizar Sumário' });
    for (let passada = 0; passada < 2; passada++) {
      this.paginas.paginar();
      const titulos = this.titulos();
      for (const s of sumarios) desenharSumario(s, titulos);
    }
    this.paginar();
    if (registrar) this.aoMudar?.();
    return true;
  }

  removerSumario() {
    const s = this.corpo.querySelector('.doc-sumario');
    if (s) this.mudar('Remover Sumário', () => s.remove());
  }

  // ================= localizar e substituir =================

  /** Intervalos de todas as ocorrências (sem diferenciar maiúsculas nem acentos) */
  localizar(termo) {
    if (!termo) return [];
    const alvo = dobrar(termo);
    const achados = [];
    for (const bloco of todosOsBlocos(this.corpo)) {
      if (bloco.closest('.doc-sumario')) continue;
      const mapa = mapaDoBloco(bloco);
      const texto = dobrar(mapa.texto);
      let i = texto.indexOf(alvo);
      while (i >= 0) {
        achados.push(mapa.intervalo(i, i + alvo.length));
        i = texto.indexOf(alvo, i + Math.max(1, alvo.length));
      }
    }
    return achados;
  }

  substituirTudo(de, para) {
    const achados = this.localizar(de);
    if (!achados.length) return 0;
    this.mudar('Substituir Tudo', () => {
      // troca de trás para frente e só depois arruma os blocos: arrumar antes
      // invalidaria as posições das outras ocorrências do mesmo parágrafo
      const blocos = new Set();
      for (const r of achados.reverse()) {
        const bloco = blocoDe(r.startContainer, this.corpo);
        r.deleteContents();
        r.insertNode(document.createTextNode(para));
        if (bloco) blocos.add(bloco);
      }
      for (const b of blocos) achatar(b);
    });
    return achados.length;
  }

  /** Substitui a seleção se ela for o termo; devolve true se trocou */
  substituirSelecao(de, para) {
    const r = this.intervalo();
    if (!r || r.collapsed || dobrar(r.toString()) !== dobrar(de)) return false;
    this.inserirTexto(para, 'Substituir');
    return true;
  }

  /** Seleciona a próxima ocorrência depois do cursor (dá a volta no fim) */
  localizarProxima(termo) {
    const achados = this.localizar(termo);
    if (!achados.length) return null;
    const r = this.intervalo();
    const depois = r ? achados.find((a) => a.compareBoundaryPoints(Range.START_TO_END, r) > 0 && !(r.toString() && a.compareBoundaryPoints(Range.START_TO_START, r) === 0)) : null;
    const alvo = depois || achados[0];
    this.selecionarIntervalo(alvo);
    alvo.startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return alvo;
  }

  // ================= ortografia =================

  erros() {
    const lista = [];
    for (const bloco of todosOsBlocos(this.corpo)) {
      if (bloco.closest('.doc-sumario')) continue;
      const mapa = mapaDoBloco(bloco);
      for (const erro of errosNoTexto(mapa.texto)) {
        if (this.ignorados.has(erro.palavra.toLowerCase())) continue;
        lista.push({ ...erro, intervalo: () => mapa.intervalo(erro.inicio, erro.fim) });
      }
    }
    return lista;
  }

  corrigir(erro, sugestao) {
    const r = erro.intervalo();
    this.mudar('Ortografia', () => {
      const inicio = r.startContainer;
      r.deleteContents();
      r.insertNode(document.createTextNode(sugestao));
      const bloco = blocoDe(inicio, this.corpo);
      if (bloco) achatar(bloco);
    });
  }

  ignorar(palavra) {
    this.ignorados.add(palavra.toLowerCase());
    this.desenharCamadas();
  }

  /** Erro de ortografia no ponto da tela (botão direito) */
  erroNoPonto(x, y) {
    for (const erro of this.erros()) {
      for (const ret of erro.intervalo().getClientRects()) {
        if (x >= ret.left - 1 && x <= ret.right + 1 && y >= ret.top - 2 && y <= ret.bottom + 2) return erro;
      }
    }
    return null;
  }

  agendarOrtografia() {
    clearTimeout(this.tempoOrtografia);
    this.tempoOrtografia = setTimeout(() => this.desenharCamadas(), 350);
  }

  // ================= camadas (sublinhado vermelho, busca, imagem) =================

  definirEscala(escala) {
    this.escala = escala;
    this.desenharCamadas();
  }

  retanguloNaFolha(ret) {
    const base = this.folhas.getBoundingClientRect();
    const e = base.width / this.folhas.offsetWidth || 1;
    return { x: (ret.left - base.left) / e, y: (ret.top - base.top) / e, largura: ret.width / e, altura: ret.height / e };
  }

  destacarBusca(intervalos) {
    this.realcesDeBusca = intervalos;
    this.desenharCamadas();
  }

  desenharCamadas() {
    if (!this.camada.isConnected) return;
    const marcas = [];
    for (const erro of this.erros()) {
      for (const ret of erro.intervalo().getClientRects()) {
        const r = this.retanguloNaFolha(ret);
        marcas.push(h('div', { class: 'marca-ortografia', style: { left: `${r.x}px`, top: `${r.y + r.altura - 3}px`, width: `${r.largura}px` } }));
      }
    }
    for (const intervalo of this.realcesDeBusca || []) {
      for (const ret of intervalo.getClientRects()) {
        const r = this.retanguloNaFolha(ret);
        marcas.push(h('div', { class: 'marca-busca', style: { left: `${r.x}px`, top: `${r.y}px`, width: `${r.largura}px`, height: `${r.altura}px` } }));
      }
    }
    this.camada.replaceChildren(...marcas, this.molduraDaImagem());
  }

  // ================= imagem selecionada =================

  selecionarImagem(img) {
    this.imagemSelecionada = img;
    const r = document.createRange();
    r.selectNode(img);
    this.selecionarIntervalo(r);
    this.desenharCamadas();
    this.aoSelecionar?.();
  }

  soltarImagem() {
    if (!this.imagemSelecionada) return;
    this.imagemSelecionada = null;
    this.desenharCamadas();
    this.aoSelecionar?.();
  }

  molduraDaImagem() {
    const img = this.imagemSelecionada;
    if (!img || !img.isConnected) return '';
    const r = this.retanguloNaFolha(img.getBoundingClientRect());
    const cantos = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    const moldura = h(
      'div',
      { class: 'moldura-imagem', style: { left: `${r.x}px`, top: `${r.y}px`, width: `${r.largura}px`, height: `${r.altura}px` } },
      cantos.map((c) => h('span', { class: `alca alca-${c}`, 'data-canto': c, 'data-alvo': c === 'se' ? 'word.imagem.canto' : null }))
    );
    moldura.addEventListener('pointerdown', (e) => this.arrastarAlca(e));
    return moldura;
  }

  arrastarAlca(e) {
    const canto = e.target.dataset.canto;
    if (!canto) return;
    e.preventDefault();
    e.stopPropagation();
    const img = this.imagemSelecionada;
    const foto = this.foto();
    const inicio = { x: e.clientX, largura: img.offsetWidth };
    const esquerda = canto.includes('w');
    const base = this.folhas.getBoundingClientRect();
    const escala = base.width / this.folhas.offsetWidth || 1;
    const mover = (ev) => {
      const dx = ((ev.clientX - inicio.x) / escala) * (esquerda ? -1 : 1);
      this.redimensionarImagem(img, inicio.largura + dx, { registrar: false });
    };
    const soltar = () => {
      document.removeEventListener('pointermove', mover);
      document.removeEventListener('pointerup', soltar);
      if (img.offsetWidth !== inicio.largura) {
        this.historico.registrar(foto, { descricao: 'Redimensionar Imagem' });
        this.depoisDeMudar();
        this.emitir({ tipo: 'comando', comando: 'tamanhoImagem', origem: 'alca', larguraCm: img.offsetWidth / CM });
      }
      this.selecionarImagem(img);
    };
    document.addEventListener('pointermove', mover);
    document.addEventListener('pointerup', soltar);
  }

  // ================= teclado e mouse =================

  ligarEventos() {
    const corpo = this.corpo;
    corpo.addEventListener('beforeinput', (e) => this.antesDeDigitar(e));
    corpo.addEventListener('input', (e) => this.depoisDeDigitar(e));
    corpo.addEventListener('keydown', (e) => this.tecla(e));
    corpo.addEventListener('paste', (e) => this.colar(e));
    corpo.addEventListener('copy', (e) => this.copiar(e, false));
    corpo.addEventListener('cut', (e) => this.copiar(e, true));
    corpo.addEventListener('dblclick', (e) => this.duploClique(e));
    corpo.addEventListener('pointerdown', (e) => {
      const img = e.target.closest?.('img');
      if (img && corpo.contains(img)) {
        e.preventDefault();
        this.selecionarImagem(img);
        this.emitir({ tipo: 'clique-imagem', nome: img.dataset.arquivo });
        return;
      }
      if (this.imagemSelecionada) this.soltarImagem();
      if (e.detail === 3) this.tresCliques = true;
    });
    corpo.addEventListener('click', (e) => {
      const acao = e.target.closest?.('[data-acao]');
      if (acao?.dataset.acao === 'atualizar-sumario') {
        this.atualizarSumarios();
        this.emitir({ tipo: 'comando', comando: 'atualizarSumario', origem: 'sumario' });
      }
      const link = e.target.closest?.('a');
      if (link && (e.ctrlKey || e.metaKey)) this.emitir({ tipo: 'abrir-link', url: link.getAttribute('href') });
    });
    this.aoMudarSelecao = () => {
      const sel = window.getSelection();
      if (!sel.rangeCount || !corpo.contains(sel.anchorNode)) return;
      const salva = salvarSelecao(corpo);
      if (this.pendente && this.ultimaSelecao && salva && (salva.inicio !== this.posicaoDoPendente)) this.pendente = null;
      this.ultimaSelecao = salva;
      // três cliques: o Chrome seleciona até o começo do próximo parágrafo; o Word, só o parágrafo
      if (this.tresCliques) {
        this.tresCliques = false;
        this.ajustarTresCliques();
      }
      clearTimeout(this.tempoSelecao);
      this.tempoSelecao = setTimeout(() => this.aoSelecionar?.(), 60);
    };
    document.addEventListener('selectionchange', this.aoMudarSelecao);
  }

  destruir() {
    document.removeEventListener('selectionchange', this.aoMudarSelecao);
  }

  ajustarTresCliques() {
    const r = this.intervalo();
    if (!r || r.collapsed) return;
    const bloco = blocoDe(r.startContainer, this.corpo);
    if (!bloco) return;
    const novo = document.createRange();
    novo.selectNodeContents(bloco);
    if (bloco.lastChild?.nodeName === 'BR') novo.setEndBefore(bloco.lastChild);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(novo);
  }

  /** Dois cliques: seleciona a palavra inteira, com hífen ("ALFA-7", "sexta-feira") */
  duploClique(e) {
    if (e.target.closest?.('img, [contenteditable="false"]')) return;
    const r = this.intervalo();
    if (!r || r.startContainer.nodeType !== 3) return;
    const no = r.startContainer;
    const texto = no.data;
    const ehLetra = (c) => /[\p{L}\p{N}'-]/u.test(c || '');
    let a = r.startOffset;
    let b = r.collapsed ? r.startOffset : r.endContainer === no ? r.endOffset : texto.length;
    while (a > 0 && ehLetra(texto[a - 1])) a--;
    while (b < texto.length && ehLetra(texto[b])) b++;
    while (b > a && texto[b - 1] === '-') b--;
    if (b <= a) return;
    const palavra = document.createRange();
    palavra.setStart(no, a);
    palavra.setEnd(no, b);
    this.selecionarIntervalo(palavra);
  }

  antesDeDigitar(e) {
    const tipo = e.inputType;
    if (tipo === 'historyUndo') {
      e.preventDefault();
      this.desfazer();
      return;
    }
    if (tipo === 'historyRedo') {
      e.preventDefault();
      this.refazer();
      return;
    }
    if (tipo === 'insertParagraph') {
      e.preventDefault();
      this.enter();
      return;
    }
    if (tipo === 'insertLineBreak') {
      e.preventDefault();
      this.inserirQuebraDeLinha();
      return;
    }
    if (tipo === 'deleteContentBackward' && this.backspaceEspecial()) {
      e.preventDefault();
      return;
    }
    if (tipo === 'deleteContentForward' && this.deleteEspecial()) {
      e.preventDefault();
      return;
    }
    if (tipo === 'insertFromDrop' || tipo === 'deleteByDrag') {
      e.preventDefault();
      return;
    }
    if (this.imagemSelecionada && (tipo.startsWith('delete') || tipo === 'insertText')) {
      e.preventDefault();
      const img = this.imagemSelecionada;
      this.soltarImagem();
      this.mudar('Excluir Imagem', () => img.remove());
      this.emitir({ tipo: 'comando', comando: 'excluirImagem' });
      return;
    }
    const quebraLinha = tipo === 'insertText' && /\s/.test(e.data || '');
    this.historico.digitacao(this.foto(), { quebra: quebraLinha || tipo.startsWith('delete') !== this.ultimoTipoApagar });
    this.ultimoTipoApagar = tipo.startsWith('delete');

    if (tipo === 'insertText' && e.data === ' ' && this.autoLista()) {
      e.preventDefault();
      return;
    }
    if (tipo === 'insertText' && this.pendente) {
      const r = this.intervalo();
      if (r) {
        e.preventDefault();
        if (!r.collapsed) r.deleteContents();
        const span = document.createElement('span');
        span.dataset.mudanca = JSON.stringify(this.pendente);
        const no = document.createTextNode(e.data);
        span.append(no);
        r.insertNode(span);
        const bloco = blocoDe(span, this.corpo);
        const pos = posicao(this.corpo, no, no.data.length);
        if (bloco) achatar(bloco);
        this.pendente = null;
        restaurarSelecao(this.corpo, { inicio: pos, fim: pos });
        this.depoisDeMudar();
        this.emitir({ tipo: 'digitar', app: 'word' });
      }
    }
  }

  depoisDeDigitar(e) {
    if (e.inputType?.startsWith('delete') || e.inputType === 'insertFromPaste' || e.inputType === 'insertReplacementText') {
      const salva = salvarSelecao(this.corpo);
      normalizarEstrutura(this.corpo);
      const r = this.intervalo();
      const bloco = r && blocoDe(r.startContainer, this.corpo);
      if (bloco) achatar(bloco);
      if (salva) restaurarSelecao(this.corpo, salva);
    }
    this.depoisDeMudar();
    this.emitir({ tipo: 'digitar', app: 'word', tecla: e.data || null });
  }

  /** "1. " vira lista numerada; "* " ou "- " vira lista com marcadores (AutoFormatação) */
  autoLista() {
    const r = this.intervalo();
    if (!r || !r.collapsed) return false;
    const bloco = blocoDe(r.startContainer, this.corpo);
    if (!bloco || bloco.tagName !== 'P' || bloco.closest('td')) return false;
    const antes = document.createRange();
    antes.setStart(bloco, 0);
    antes.setEnd(r.startContainer, r.startOffset);
    const texto = antes.toString();
    const tipo = /^1[.)]$/.test(texto) ? 'numerada' : /^[*-]$/.test(texto) ? 'marcadores' : null;
    if (!tipo) return false;
    this.mudar('AutoFormatação', () => {
      antes.deleteContents();
      if (!bloco.textContent) bloco.replaceChildren(document.createElement('br'));
      const [li] = alternarLista([bloco], tipo === 'numerada' ? 'OL' : 'UL', this.corpo);
      if (texto.endsWith(')')) li.parentElement.dataset.numeracao = '1)';
      this.colocarCursorNoInicio(li);
    });
    this.emitir({ tipo: 'comando', comando: tipo === 'numerada' ? 'numeracao' : 'marcadores', origem: 'autoformatacao', paragrafo: '' });
    return true;
  }

  enter() {
    const r = this.intervalo();
    if (!r) return;
    const bloco = blocoDe(r.startContainer, this.corpo);
    // =rand() e =lorem(): texto de exemplo do Word
    const rand = bloco && bloco.textContent.trim().match(/^=rand\((\d*)\s*[,;]?\s*(\d*)\)$/i);
    if (rand) {
      const paragrafos = textoRand(Number(rand[1]) || 5, Number(rand[2]) || 3);
      this.mudar('Texto de Exemplo', () => {
        const novos = paragrafos.map((t) => h('p', {}, t));
        bloco.replaceWith(...novos);
        this.colocarCursorNoFim(novos[novos.length - 1]);
      });
      this.emitir({ tipo: 'comando', comando: 'rand' });
      return;
    }
    this.mudar('Digitação', () => {
      if (!r.collapsed) r.deleteContents();
      if (!bloco) return;
      // Enter num item vazio termina a lista
      if (bloco.tagName === 'LI' && !bloco.textContent.trim()) {
        const p = tirarDaLista(bloco);
        this.colocarCursorNoInicio(p);
        return;
      }
      const estiloAntes = estiloCalculado(r.startContainer, this.corpo);
      const [, novo] = this.dividirNoCursor(r);
      this.colocarCursorNoInicio(novo);
      // continua digitando com a mesma formatação (como o Word), menos depois de um título
      if (!novo.textContent && !/^H\d$/.test(bloco.tagName)) {
        const herdar = {};
        if (estiloAntes.negrito && !/^H\d$/.test(bloco.tagName)) herdar.negrito = true;
        if (estiloAntes.italico) herdar.italico = true;
        if (estiloAntes.sublinhado) herdar.sublinhado = true;
        if (Object.keys(herdar).length) this.pendente = herdar;
      }
    });
    this.posicaoDoPendente = salvarSelecao(this.corpo)?.inicio;
    this.emitir({ tipo: 'digitar', app: 'word', tecla: 'Enter' });
  }

  inserirQuebraDeLinha() {
    const r = this.intervalo();
    if (!r) return;
    this.mudar('Digitação', () => {
      if (!r.collapsed) r.deleteContents();
      const br = document.createElement('br');
      r.insertNode(br);
      const depois = document.createRange();
      depois.setStartAfter(br);
      depois.collapse(true);
      if (!br.nextSibling) br.after(document.createElement('br'));
      this.selecionarIntervalo(depois);
    });
  }

  noInicioDoBloco(r, bloco) {
    const antes = document.createRange();
    antes.setStart(bloco, 0);
    antes.setEnd(r.startContainer, r.startOffset);
    return !antes.toString() && !antes.cloneContents().querySelector('img');
  }

  backspaceEspecial() {
    const r = this.intervalo();
    if (!r || !r.collapsed) return false;
    const bloco = blocoDe(r.startContainer, this.corpo);
    if (!bloco || !this.noInicioDoBloco(r, bloco)) return false;
    if (bloco.tagName === 'LI') {
      this.mudar('Digitação', () => this.colocarCursorNoInicio(tirarDaLista(bloco)));
      return true;
    }
    const topo = this.blocoDeTopo(bloco);
    const anterior = topo?.previousElementSibling;
    if (anterior?.classList.contains('doc-quebra')) {
      this.mudar('Excluir Quebra', () => anterior.remove());
      this.colocarCursorNoInicio(bloco);
      this.emitir({ tipo: 'comando', comando: 'excluirQuebra' });
      return true;
    }
    if (anterior?.classList.contains('doc-sumario') || anterior?.tagName === 'TABLE') return true;
    if (bloco.closest('td') && !bloco.previousElementSibling) return true;
    return false;
  }

  deleteEspecial() {
    const r = this.intervalo();
    if (!r || !r.collapsed) return false;
    const bloco = blocoDe(r.startContainer, this.corpo);
    if (!bloco) return false;
    const depois = document.createRange();
    depois.setStart(r.startContainer, r.startOffset);
    depois.setEnd(bloco, bloco.childNodes.length);
    if (depois.toString()) return false;
    const proximo = this.blocoDeTopo(bloco)?.nextElementSibling;
    if (proximo?.classList.contains('doc-quebra')) {
      this.mudar('Excluir Quebra', () => proximo.remove());
      return true;
    }
    return Boolean(proximo?.classList.contains('doc-sumario') || proximo?.tagName === 'TABLE' || (bloco.closest('td') && !bloco.nextElementSibling));
  }

  tecla(e) {
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (this.tabNaTabela(e.shiftKey)) return;
      if (!e.shiftKey) this.inserirTexto('\t');
    }
  }

  // ================= área de transferência =================

  copiar(e, recortar) {
    const r = this.intervalo();
    if (!r || r.collapsed) return;
    const div = document.createElement('div');
    div.append(r.cloneContents());
    div.querySelectorAll('.doc-sumario-acoes').forEach((el) => el.remove());
    const html = div.innerHTML;
    const texto = r.toString();
    e.preventDefault();
    e.clipboardData.setData('text/html', html);
    e.clipboardData.setData('text/plain', texto);
    this.guardarNaTransferencia({ texto, html, recortar });
    if (recortar) {
      this.mudar('Recortar', () => r.deleteContents());
    }
  }

  guardarNaTransferencia({ texto, html, recortar = false }) {
    this.emitir({ tipo: 'copiar', app: 'word', texto, html, modo: recortar ? 'recortar' : 'copiar' });
  }

  colar(e) {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const texto = e.clipboardData.getData('text/plain');
    this.colarConteudo({ html, texto });
  }

  /** Cola HTML (limpo) ou texto. Texto com várias linhas vira vários parágrafos. */
  colarConteudo({ html, texto, somenteTexto = false }) {
    const r = this.intervalo();
    if (!r || (!html && !texto)) return false;
    const limpo = !somenteTexto && html ? sanitizar(html.replace(/<!--(Start|End)Fragment-->/g, '')) : '';
    const linhas = (texto || '').replace(/\r/g, '').split('\n');
    const blocosHtml = limpo || (linhas.length > 1 ? linhas.map((l) => `<p>${escapar(l) || '<br>'}</p>`).join('') : '');
    this.mudar('Colar', () => {
      if (!r.collapsed) r.deleteContents();
      if (!blocosHtml) {
        const no = document.createTextNode(texto);
        r.insertNode(no);
        const depois = document.createRange();
        depois.setStartAfter(no);
        this.selecionarIntervalo(depois);
        const bloco = blocoDe(no, this.corpo);
        if (bloco) {
          const salva = salvarSelecao(this.corpo);
          achatar(bloco);
          restaurarSelecao(this.corpo, salva);
        }
        return;
      }
      const modelo = document.createElement('template');
      modelo.innerHTML = blocosHtml;
      const temBlocos = [...modelo.content.childNodes].some((n) => n.nodeType === 1 && (ehBloco(n) || ['UL', 'OL', 'TABLE', 'DIV'].includes(n.tagName)));
      if (!temBlocos) {
        const fragmento = modelo.content;
        const ultimo = fragmento.lastChild;
        r.insertNode(fragmento);
        const depois = document.createRange();
        if (ultimo?.isConnected) depois.setStartAfter(ultimo);
        this.selecionarIntervalo(depois);
        const bloco = ultimo && blocoDe(ultimo, this.corpo);
        if (bloco) {
          const salva = salvarSelecao(this.corpo);
          achatar(bloco);
          restaurarSelecao(this.corpo, salva);
        }
        return;
      }
      const [antes, depois] = this.dividirNoCursor(r);
      const novos = [...modelo.content.childNodes];
      const ancora = antes ? this.blocoDeTopo(antes) : this.corpo.lastChild;
      if (antes && antes.tagName === 'LI') {
        // colar dentro de lista: cada parágrafo vira item
        let atual = antes;
        for (const n of novos) {
          const li = n.nodeType === 1 && n.tagName === 'P' ? trocarTag(n, 'LI') : n;
          atual.after(li);
          atual = li;
        }
      } else {
        ancora.after(...novos);
        if (depois && depois.parentNode === this.corpo) novos[novos.length - 1].after(depois);
      }
      for (const b of [antes, depois]) if (b && !b.textContent && !b.querySelector('img') && b.parentNode) b.remove();
      const ultimoBloco = [...novos].reverse().find((n) => n.nodeType === 1 && n.isConnected);
      if (ultimoBloco) this.colocarCursorNoFim(ehBloco(ultimoBloco) ? ultimoBloco : ultimoBloco.querySelector('p, li') || ultimoBloco);
      for (const b of todosOsBlocos(this.corpo)) achatar(b);
    });
    this.emitir({ tipo: 'colar', app: 'word', texto: texto || modeloTexto(blocosHtml) });
    return true;
  }
}

function modeloTexto(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent;
}

/** Documento salvo pelo próprio simulador: confiável, só tira o que é de tela */
function sanitizarDocumento(html) {
  return String(html).replace(/\sdata-empurrado="[^"]*"/g, '').replace(/\sdata-margem-original="[^"]*"/g, '');
}

/** Sem acento e minúsculo, mantendo o mesmo tamanho (para achar posições) */
function dobrar(texto) {
  return [...texto].map((c) => c.normalize('NFD')[0].toLowerCase()).join('');
}

/** Texto do bloco e um jeito de transformar posições do texto em Range */
export function mapaDoBloco(bloco) {
  const nos = [];
  let texto = '';
  const caminhante = document.createTreeWalker(bloco, NodeFilter.SHOW_TEXT);
  while (caminhante.nextNode()) {
    const no = caminhante.currentNode;
    if (no.parentElement.closest('[contenteditable="false"]') && !bloco.closest('[contenteditable="false"]')) continue;
    nos.push({ no, inicio: texto.length });
    texto += no.data;
  }
  const achar = (pos, fim) => {
    for (let i = nos.length - 1; i >= 0; i--) {
      const { no, inicio } = nos[i];
      if (pos > inicio || (pos === inicio && (!fim || i === 0))) return { no, desloc: Math.min(no.data.length, pos - inicio) };
      if (pos === inicio && fim) return { no, desloc: 0 };
    }
    return { no: bloco, desloc: 0 };
  };
  return {
    texto,
    nos,
    intervalo(inicio, fim) {
      const a = achar(inicio, false);
      const b = achar(fim, true);
      const r = document.createRange();
      r.setStart(a.no, a.desloc);
      r.setEnd(b.no, b.desloc);
      return r;
    },
  };
}

/** Maiúsculas e minúsculas do jeito do Word */
export function mudarCaixa(texto, modo, { inicioDeFrase = true } = {}) {
  if (modo === 'maiusculas') return texto.toLocaleUpperCase('pt-BR');
  if (modo === 'minusculas') return texto.toLocaleLowerCase('pt-BR');
  if (modo === 'palavras') return texto.toLocaleLowerCase('pt-BR').replace(/(^|[\s\-("'])(\p{L})/gu, (m, a, l) => a + l.toLocaleUpperCase('pt-BR'));
  if (modo === 'alternar') return [...texto].map((c) => (c === c.toLocaleUpperCase('pt-BR') ? c.toLocaleLowerCase('pt-BR') : c.toLocaleUpperCase('pt-BR'))).join('');
  // 'frase': Primeira letra da frase em maiúscula.
  let resultado = '';
  let maiuscula = inicioDeFrase;
  for (const c of texto.toLocaleLowerCase('pt-BR')) {
    if (maiuscula && /\p{L}/u.test(c)) {
      resultado += c.toLocaleUpperCase('pt-BR');
      maiuscula = false;
    } else {
      resultado += c;
      if (/[.!?]/.test(c)) maiuscula = true;
    }
  }
  return resultado;
}

function desenharSumario(sumario, titulos) {
  sumario.dataset.entradas = JSON.stringify(titulos.map((t) => [t.texto, t.pagina]));
  sumario.replaceChildren(
    h('div', { class: 'doc-sumario-acoes' }, h('button', { type: 'button', 'data-acao': 'atualizar-sumario', 'data-alvo': 'word.sumario.atualizar', text: '⟳ Atualizar Sumário...' })),
    h('p', { class: 'doc-sumario-titulo', text: 'Sumário' }),
    ...titulos.map((t) => h('div', { class: `doc-sumario-item nivel-${t.nivel}` }, h('span', { class: 't', text: t.texto }), h('span', { class: 'pontos' }), h('span', { class: 'n', text: String(t.pagina) }))),
    titulos.length ? '' : h('p', { class: 'doc-sumario-vazio', text: 'Nenhuma entrada de sumário foi encontrada.' })
  );
}
