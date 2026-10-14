/**
 * Motor de formatação do Word simulado (sem tela, só DOM).
 *
 * O documento é uma lista de blocos (P, H1-H3, LI, e P dentro de células
 * de tabela). Dentro de cada bloco, o texto fica em "trechos" planos:
 * <span style="..."> com todo o estilo daquele pedaço, sem spans dentro de
 * spans. Toda formatação segue três passos:
 *
 *   1. corta os nós de texto nas bordas da seleção;
 *   2. embrulha cada pedaço num span com a mudança (data-mudanca);
 *   3. "achata" o bloco: calcula o estilo final de cada pedaço (herdado +
 *      mudança) e reconstrói os spans, juntando vizinhos iguais.
 *
 * Assim ligar e desligar negrito, sublinhado etc. funciona em qualquer
 * mistura, e o HTML salvo fica limpo. A seleção é guardada como posições
 * (contando letras) e restaurada depois.
 */

export const TAGS_BLOCO = new Set(['P', 'H1', 'H2', 'H3', 'LI']);
const TAGS_ATOMO = new Set(['IMG', 'BR']);
const TAGS_CONTEINER = new Set(['UL', 'OL', 'TABLE', 'TBODY', 'THEAD', 'TR', 'TD', 'TH', 'DIV', 'SECTION']);

export const ehBloco = (no) => no?.nodeType === 1 && TAGS_BLOCO.has(no.tagName);
export const ehAtomo = (no) => no?.nodeType === 1 && (TAGS_ATOMO.has(no.tagName) || no.classList.contains('doc-campo'));
const ehFixo = (no) => no?.nodeType === 1 && no.getAttribute('contenteditable') === 'false';

/** Bloco (parágrafo) que contém o nó, dentro da raiz */
export function blocoDe(no, raiz) {
  let atual = no?.nodeType === 3 ? no.parentNode : no;
  while (atual && atual !== raiz) {
    if (ehBloco(atual)) return atual;
    atual = atual.parentNode;
  }
  return null;
}

/** Todos os blocos da raiz, na ordem */
export function todosOsBlocos(raiz) {
  return [...raiz.querySelectorAll('p, h1, h2, h3, li')].filter((b) => !b.closest('[contenteditable="false"]') || b.closest('[contenteditable="false"]') === raiz);
}

/** Blocos tocados pelo intervalo (o do cursor, se estiver recolhido) */
export function blocosNoIntervalo(range, raiz) {
  const noInicial = range.startContainer.nodeType === 1 ? range.startContainer.childNodes[range.startOffset] || range.startContainer : range.startContainer;
  const inicio = blocoDe(noInicial, raiz) || blocoDe(range.startContainer, raiz);
  if (range.collapsed) return inicio ? [inicio] : [];
  return todosOsBlocos(raiz).filter((b) => {
    if (!range.intersectsNode(b)) return false;
    // Seleção que termina bem no começo de um bloco (três cliques) não conta esse bloco
    if (b !== inicio && (range.endContainer === b || b.contains(range.endContainer))) {
      const r = document.createRange();
      r.selectNodeContents(b);
      r.setEnd(range.endContainer, range.endOffset);
      return r.toString().length > 0 || Boolean(r.cloneContents().querySelector('img'));
    }
    return true;
  });
}

// ---------------- posições (para guardar e restaurar a seleção) ----------------

/**
 * Percorre a raiz em ordem chamando visitar(tipo, no): 'texto' (cada letra
 * conta 1), 'atomo' (imagem, quebra de linha: contam 1) e 'fim' (fim de um
 * bloco: conta 1, para "fim do parágrafo 1" ≠ "começo do 2").
 */
function percorrer(raiz, visitar) {
  const passo = (no) => {
    for (const filho of no.childNodes) {
      if (filho.nodeType === 3) {
        if (visitar('texto', filho) === false) return false;
      } else if (filho.nodeType === 1) {
        if (ehAtomo(filho) || ehFixo(filho)) {
          if (visitar('atomo', filho) === false) return false;
          continue;
        }
        if (visitar('entrar', filho) === false) return false;
        if (passo(filho) === false) return false;
        if (ehBloco(filho) && visitar('fim', filho) === false) return false;
      }
    }
    return true;
  };
  passo(raiz);
}

const tamanhoDaUnidade = (tipo, no) => (tipo === 'texto' ? no.data.length : tipo === 'atomo' || tipo === 'fim' ? 1 : 0);

/** Conta as unidades até encontrar "alvo" (texto, átomo ou elemento) ou o fim do bloco "fimDe" */
function contarAte(raiz, { alvo = null, fimDe = null }) {
  let contagem = 0;
  let achou = false;
  percorrer(raiz, (tipo, n) => {
    if ((alvo && n === alvo && tipo !== 'fim') || (fimDe && n === fimDe && tipo === 'fim')) {
      achou = true;
      return false;
    }
    contagem += tamanhoDaUnidade(tipo, n);
    return true;
  });
  return { contagem, achou };
}

/** Posição (número) de um ponto (nó, deslocamento) */
export function posicao(raiz, no, desloc) {
  if (no.nodeType === 3) return contarAte(raiz, { alvo: no }).contagem + Math.min(desloc, no.data.length);
  if (desloc < no.childNodes.length) {
    const filho = no.childNodes[desloc];
    if (filho.nodeType === 8) return posicao(raiz, no, desloc + 1);
    return contarAte(raiz, { alvo: filho }).contagem;
  }
  // fim do elemento
  if (no === raiz) return contarAte(raiz, {}).contagem;
  if (ehBloco(no)) return contarAte(raiz, { fimDe: no }).contagem;
  if (ehAtomo(no) || ehFixo(no)) return contarAte(raiz, { alvo: no }).contagem + 1;
  const ultimo = no.lastChild;
  if (ultimo && ultimo.nodeType !== 8) return posicao(raiz, ultimo, ultimo.nodeType === 3 ? ultimo.data.length : ultimo.childNodes.length);
  return contarAte(raiz, { alvo: no }).contagem;
}

/** Ponto (nó, deslocamento) de uma posição */
export function ponto(raiz, pos) {
  let contagem = 0;
  let achou = null;
  let ultimoTexto = null;
  percorrer(raiz, (tipo, n) => {
    if (tipo === 'texto') {
      if (pos <= contagem + n.data.length) {
        achou = { no: n, desloc: pos - contagem };
        return false;
      }
      ultimoTexto = n;
    } else if (tipo === 'atomo' && pos === contagem) {
      achou = { no: n.parentNode, desloc: [...n.parentNode.childNodes].indexOf(n) };
      return false;
    } else if (tipo === 'fim' && pos === contagem) {
      // fim de bloco vazio ou depois de um átomo
      const ultimo = n.lastChild;
      achou = ultimo && ultimo.nodeName === 'BR' ? { no: n, desloc: n.childNodes.length - 1 } : { no: n, desloc: n.childNodes.length };
      return false;
    }
    contagem += tamanhoDaUnidade(tipo, n);
    return true;
  });
  if (achou) return achou;
  if (ultimoTexto) return { no: ultimoTexto, desloc: ultimoTexto.data.length };
  return { no: raiz, desloc: raiz.childNodes.length };
}

export function salvarSelecao(raiz) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return null;
  const r = sel.getRangeAt(0);
  if (!raiz.contains(r.startContainer) || !raiz.contains(r.endContainer)) return null;
  return { inicio: posicao(raiz, r.startContainer, r.startOffset), fim: posicao(raiz, r.endContainer, r.endOffset) };
}

export function intervaloDe(raiz, { inicio, fim }) {
  const a = ponto(raiz, inicio);
  const b = ponto(raiz, fim);
  const r = document.createRange();
  r.setStart(a.no, a.desloc);
  r.setEnd(b.no, b.desloc);
  return r;
}

export function restaurarSelecao(raiz, salva) {
  if (!salva) return;
  const r = intervaloDe(raiz, salva);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
}

// ---------------- estilo dos trechos ----------------

const TAMANHOS_NOMEADOS = { 'xx-small': 7, 'x-small': 7.5, small: 10, medium: 12, large: 13.5, 'x-large': 18, 'xx-large': 24, 'xxx-large': 36 };
const TAMANHOS_FONT = { 1: 8, 2: 10, 3: 12, 4: 14, 5: 18, 6: 24, 7: 36 };

const primeiraFonte = (familia) => familia.split(',')[0].trim().replace(/^["']|["']$/g, '');

function paraPontos(valor) {
  if (!valor) return undefined;
  if (TAMANHOS_NOMEADOS[valor]) return TAMANHOS_NOMEADOS[valor];
  const n = parseFloat(valor);
  if (!Number.isFinite(n)) return undefined;
  if (valor.endsWith('px')) return Math.round(n * 0.75 * 2) / 2;
  if (valor.endsWith('pt')) return n;
  return undefined;
}

/** O que um elemento inline acrescenta ao estilo (tags antigas ou style) */
export function estiloDoElemento(el) {
  if (el.dataset?.mudanca) return JSON.parse(el.dataset.mudanca);
  const e = {};
  const tag = el.tagName;
  if (tag === 'B' || tag === 'STRONG') e.negrito = true;
  if (tag === 'I' || tag === 'EM') e.italico = true;
  if (tag === 'U' || tag === 'INS') e.sublinhado = true;
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') e.tachado = true;
  if (tag === 'SUB') e.script = 'sub';
  if (tag === 'SUP') e.script = 'super';
  if (tag === 'MARK') e.realce = '#ffff00';
  if (tag === 'FONT') {
    if (el.getAttribute('face')) e.fonte = primeiraFonte(el.getAttribute('face'));
    if (el.getAttribute('color')) e.cor = el.getAttribute('color');
    if (el.getAttribute('size')) e.tamanho = TAMANHOS_FONT[el.getAttribute('size')];
  }
  const s = el.style;
  if (s.fontWeight) e.negrito = s.fontWeight === 'bold' || s.fontWeight === 'bolder' || parseInt(s.fontWeight, 10) >= 600;
  if (s.fontStyle) e.italico = s.fontStyle === 'italic' || s.fontStyle === 'oblique';
  const decoracao = s.textDecorationLine || s.textDecoration;
  if (decoracao) {
    e.sublinhado = decoracao.includes('underline');
    e.tachado = decoracao.includes('line-through');
  }
  if (s.fontFamily) e.fonte = primeiraFonte(s.fontFamily);
  const pt = paraPontos(s.fontSize);
  if (pt) e.tamanho = pt;
  if (s.color) e.cor = s.color;
  if (s.backgroundColor && s.backgroundColor !== 'transparent' && s.backgroundColor !== 'rgba(0, 0, 0, 0)') e.realce = s.backgroundColor;
  if (s.verticalAlign === 'sub' || s.verticalAlign === 'super') e.script = s.verticalAlign;
  if (s.verticalAlign === 'baseline') e.script = null;
  return e;
}

/** Junta estilos: o de dentro ganha, mas "não definido" não apaga o de fora */
export function mesclar(fora, dentro) {
  const r = { ...fora };
  for (const [k, v] of Object.entries(dentro)) if (v !== undefined) r[k] = v;
  return r;
}

/** CSS de um estilo (ordem fixa, para comparar trechos vizinhos) */
export function cssDoEstilo(e) {
  const partes = [];
  if (e.fonte) partes.push(`font-family: ${/[\s\d]/.test(e.fonte) ? `"${e.fonte}"` : e.fonte}`);
  if (e.tamanho) partes.push(`font-size: ${e.tamanho}pt`);
  if (e.negrito !== undefined) partes.push(`font-weight: ${e.negrito ? 700 : 400}`);
  if (e.italico !== undefined) partes.push(`font-style: ${e.italico ? 'italic' : 'normal'}`);
  if (e.sublinhado || e.tachado) partes.push(`text-decoration-line: ${[e.sublinhado && 'underline', e.tachado && 'line-through'].filter(Boolean).join(' ')}`);
  if (e.cor) partes.push(`color: ${e.cor}`);
  if (e.realce) partes.push(`background-color: ${e.realce}`);
  if (e.script) partes.push(`vertical-align: ${e.script}`, `font-size: ${e.tamanho ? e.tamanho * 0.65 : 7}pt`);
  return partes.join('; ');
}

/** Deixa o bloco (ou link) com trechos planos e vizinhos iguais juntos */
export function achatar(conteiner, herdadoDeFora = {}) {
  const pedacos = [];
  const visitar = (no, herdado) => {
    for (const filho of [...no.childNodes]) {
      if (filho.nodeType === 3) {
        if (filho.data) pedacos.push({ texto: filho.data, estilo: herdado });
      } else if (filho.nodeType === 1) {
        if (ehAtomo(filho) || ehFixo(filho) || TAGS_CONTEINER.has(filho.tagName) || ehBloco(filho)) {
          pedacos.push({ no: filho });
        } else if (filho.tagName === 'A') {
          achatar(filho, mesclar(herdado, estiloDoElemento(filho)));
          filho.removeAttribute('style');
          pedacos.push({ no: filho });
        } else {
          visitar(filho, mesclar(herdado, estiloDoElemento(filho)));
        }
      }
    }
  };
  visitar(conteiner, herdadoDeFora);

  const novos = [];
  let ultimo = null;
  for (const p of pedacos) {
    if (p.no) {
      novos.push(p.no);
      ultimo = null;
      continue;
    }
    const css = cssDoEstilo(limparEstilo(p.estilo));
    if (ultimo && ultimo.css === css) {
      ultimo.texto += p.texto;
    } else {
      ultimo = { css, texto: p.texto };
      novos.push(ultimo);
    }
  }
  conteiner.replaceChildren(
    ...novos.map((n) => {
      if (n instanceof Node) return n;
      if (!n.css) return document.createTextNode(n.texto);
      const span = document.createElement('span');
      span.setAttribute('style', n.css);
      span.textContent = n.texto;
      return span;
    })
  );
  if (ehBloco(conteiner) && !conteiner.childNodes.length) conteiner.append(document.createElement('br'));
  // <br> sobrando no fim de um parágrafo com texto (o Chrome deixa às vezes)
  if (ehBloco(conteiner) && conteiner.childNodes.length > 1 && conteiner.lastChild.nodeName === 'BR' && conteiner.lastChild.previousSibling?.nodeType === 3) {
    conteiner.lastChild.remove();
  }
}

/** Tira valores "desligados" que não mudam nada (ex.: negrito: false fora de título) */
function limparEstilo(e) {
  const r = { ...e };
  for (const k of ['sublinhado', 'tachado', 'script']) if (!r[k]) delete r[k];
  if (r.realce === null) delete r.realce;
  return r;
}

/** Nós de texto tocados pelo intervalo, com as partes selecionadas */
export function textosNoIntervalo(range, raiz) {
  const lista = [];
  const caminhante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  while (caminhante.nextNode()) {
    const no = caminhante.currentNode;
    if (!range.intersectsNode(no) || no.parentElement.closest('[contenteditable="false"]')) continue;
    const inicio = no === range.startContainer ? range.startOffset : 0;
    const fim = no === range.endContainer ? range.endOffset : no.data.length;
    if (fim > inicio) lista.push({ no, inicio, fim });
  }
  return lista;
}

/**
 * Aplica uma mudança de estilo no intervalo. mudanca(estiloAtual) devolve
 * as propriedades novas (ex.: () => ({ negrito: true })). Devolve os
 * blocos alterados. A seleção é restaurada pelas posições.
 */
export function aplicarNoIntervalo(range, raiz, mudanca, estiloAtual) {
  const salva = { inicio: posicao(raiz, range.startContainer, range.startOffset), fim: posicao(raiz, range.endContainer, range.endOffset) };
  const pedacos = textosNoIntervalo(range, raiz);
  const blocos = new Set();
  for (const { no: original, inicio, fim } of pedacos) {
    let no = original;
    if (fim < no.data.length) no.splitText(fim);
    if (inicio > 0) no = no.splitText(inicio);
    const span = document.createElement('span');
    span.dataset.mudanca = JSON.stringify(mudanca(estiloAtual(no)));
    no.replaceWith(span);
    span.append(no);
    blocos.add(blocoDe(span, raiz) || span.parentNode);
  }
  for (const b of blocos) achatar(b);
  restaurarSelecao(raiz, salva);
  return [...blocos];
}

// ---------------- estilo calculado (o que o aluno vê) ----------------

export function rgb(cor) {
  const m = String(cor).match(/\d+(\.\d+)?/g);
  return m ? m.slice(0, 3).map(Number) : null;
}

const transparente = (c) => !c || c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c);

/** Estilo que aparece na tela para um nó de texto */
export function estiloCalculado(texto, raiz) {
  const el = texto.nodeType === 3 ? texto.parentElement : texto;
  const cs = getComputedStyle(el);
  let sublinhado = false;
  let tachado = false;
  let realce = null;
  for (let a = el; a && a !== raiz.parentElement; a = a.parentElement) {
    const acs = a === el ? cs : getComputedStyle(a);
    if (acs.textDecorationLine.includes('underline')) sublinhado = true;
    if (acs.textDecorationLine.includes('line-through')) tachado = true;
    if (!realce && !transparente(acs.backgroundColor) && !ehBloco(a) && a.tagName !== 'TD') realce = rgb(acs.backgroundColor);
    if (ehBloco(a)) break;
  }
  return {
    negrito: parseInt(cs.fontWeight, 10) >= 600,
    italico: cs.fontStyle === 'italic',
    sublinhado,
    tachado,
    fonte: primeiraFonte(cs.fontFamily),
    tamanho: Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2,
    cor: rgb(cs.color),
    realce,
    script: cs.verticalAlign === 'sub' || cs.verticalAlign === 'super' ? cs.verticalAlign : null,
  };
}

// ---------------- blocos: estilos de parágrafo e listas ----------------

/** Troca a tag de um bloco mantendo conteúdo e formatação de parágrafo */
export function trocarTag(bloco, tag, { estilo = null } = {}) {
  if (bloco.tagName === tag && (bloco.dataset.estilo || null) === estilo) return bloco;
  const novo = document.createElement(tag);
  for (const attr of bloco.attributes) if (attr.name !== 'data-estilo') novo.setAttribute(attr.name, attr.value);
  if (estilo) novo.dataset.estilo = estilo;
  novo.append(...bloco.childNodes);
  bloco.replaceWith(novo);
  return novo;
}

/** Tira um item da lista: vira parágrafo entre as duas metades da lista */
export function tirarDaLista(li) {
  const lista = li.parentElement;
  const depois = [...lista.children].slice([...lista.children].indexOf(li) + 1);
  if (depois.length) {
    const resto = lista.cloneNode(false);
    resto.append(...depois);
    lista.after(resto);
  }
  const p = trocarTag(li, 'P');
  lista.after(p);
  if (!lista.children.length) lista.remove();
  return p;
}

/**
 * Liga/desliga a lista nos blocos. tipo: 'UL' ou 'OL'. Se todos já estão
 * numa lista desse tipo, viram parágrafos; senão, viram uma lista só.
 */
export function alternarLista(blocos, tipo, raiz) {
  const fora = blocos.filter((b) => !b.closest('td'));
  if (!fora.length) return [];
  const todosNaLista = fora.every((b) => b.tagName === 'LI' && b.parentElement.tagName === tipo);
  if (todosNaLista) return fora.map((li) => tirarDaLista(li));

  const paragrafos = fora.map((b) => (b.tagName === 'LI' ? tirarDaLista(b) : b.tagName === 'P' ? b : trocarTag(b, 'P')));
  const lista = document.createElement(tipo);
  paragrafos[0].before(lista);
  const itens = paragrafos.map((p) => {
    const li = trocarTag(p, 'LI');
    lista.append(li);
    return li;
  });
  // junta com listas iguais logo antes ou logo depois
  const antes = lista.previousElementSibling;
  if (antes && antes.tagName === tipo) {
    antes.append(...lista.children);
    lista.remove();
    return itens;
  }
  const depois = lista.nextElementSibling;
  if (depois && depois.tagName === tipo) {
    lista.append(...depois.children);
    depois.remove();
  }
  raiz.normalize();
  return itens;
}

/**
 * Arruma a estrutura depois de colar ou apagar: texto solto vira parágrafo,
 * DIV vira P, bloco vazio ganha <br>, célula sem parágrafo ganha um.
 */
export function normalizarEstrutura(raiz) {
  let soltos = [];
  const fecharSoltos = (antesDe) => {
    if (!soltos.length) return;
    if (soltos.every((n) => n.nodeType === 3 && !n.data.trim())) {
      soltos.forEach((n) => n.remove());
    } else {
      const p = document.createElement('p');
      raiz.insertBefore(p, antesDe);
      p.append(...soltos);
    }
    soltos = [];
  };
  for (const filho of [...raiz.childNodes]) {
    if (filho.nodeType === 1 && filho.tagName === 'DIV' && !filho.className) {
      const p = trocarTag(filho, 'P');
      fecharSoltos(p);
      continue;
    }
    if (filho.nodeType === 1 && (ehBloco(filho) || TAGS_CONTEINER.has(filho.tagName) || ehFixo(filho))) {
      fecharSoltos(filho);
      continue;
    }
    if (filho.nodeType === 8) {
      filho.remove();
      continue;
    }
    soltos.push(filho);
  }
  fecharSoltos(null);
  for (const lista of raiz.querySelectorAll('ul, ol')) {
    for (const filho of [...lista.childNodes]) {
      if (filho.nodeType === 1 && filho.tagName === 'LI') continue;
      if (filho.nodeType === 3 && !filho.data.trim()) filho.remove();
      else {
        const li = document.createElement('li');
        filho.replaceWith(li);
        li.append(filho);
      }
    }
    if (!lista.children.length) lista.remove();
  }
  for (const celula of raiz.querySelectorAll('td, th')) {
    if (![...celula.children].some(ehBloco)) {
      const p = document.createElement('p');
      p.append(...celula.childNodes);
      celula.append(p);
    }
  }
  for (const bloco of todosOsBlocos(raiz)) {
    for (const div of bloco.querySelectorAll('div:not([class])')) div.replaceWith(...div.childNodes);
    if (!bloco.textContent && !bloco.querySelector('img, br, .doc-campo')) bloco.append(document.createElement('br'));
  }
  if (!raiz.firstChild) raiz.append(Object.assign(document.createElement('p'), { innerHTML: '<br>' }));
}
