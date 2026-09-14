// Helpers mínimos de DOM usados por todos os componentes.

const PROPRIEDADES = new Set(['value', 'checked', 'disabled', 'hidden', 'selected', 'indeterminate', 'htmlFor', 'tabIndex']);

/**
 * Cria um elemento: h('button', { class: 'btn', onClick: fn }, 'Texto', filho)
 * - class, style (objeto), dataset (objeto), text (textContent)
 * - onXxx: listener de evento
 * - valores false/null/undefined são ignorados; true vira atributo vazio
 */
export function h(tag, props = {}, ...filhos) {
  const el = document.createElement(tag);
  aplicarProps(el, props);
  anexar(el, filhos);
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svg(tag, atributos = {}, ...filhos) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(atributos)) {
    if (v !== null && v !== undefined && v !== false) el.setAttribute(k, v);
  }
  anexar(el, filhos);
  return el;
}

function aplicarProps(el, props) {
  for (const [chave, valor] of Object.entries(props || {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (chave === 'class') el.className = valor;
    else if (chave === 'text') el.textContent = valor;
    else if (chave === 'style' && typeof valor === 'object') Object.assign(el.style, valor);
    else if (chave === 'dataset') Object.assign(el.dataset, valor);
    else if (chave.startsWith('on') && typeof valor === 'function') el.addEventListener(chave.slice(2).toLowerCase(), valor);
    else if (PROPRIEDADES.has(chave)) el[chave] = valor;
    else el.setAttribute(chave, valor === true ? '' : valor);
  }
}

export function anexar(el, filhos) {
  for (const filho of filhos.flat(Infinity)) {
    if (filho === null || filho === undefined || filho === false) continue;
    if (filho instanceof Node) el.appendChild(filho);
    else if (filho && typeof filho.render === 'function' && filho.el === null) el.appendChild(filho.montar());
    else if (filho && filho.el instanceof Node) el.appendChild(filho.el);
    else el.appendChild(document.createTextNode(String(filho)));
  }
  return el;
}

/** Remove todos os filhos e (opcionalmente) coloca novos */
export function substituirFilhos(el, ...filhos) {
  el.replaceChildren();
  return anexar(el, filhos);
}

export function $(seletor, raiz = document) {
  return raiz.querySelector(seletor);
}

export function $$(seletor, raiz = document) {
  return [...raiz.querySelectorAll(seletor)];
}

/** Formata data/hora no padrão brasileiro */
export function formatarDataHora(valor) {
  if (!valor) return '';
  return new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function tempoRelativo(valor) {
  if (!valor) return '';
  const segundos = Math.round((Date.now() - new Date(valor).getTime()) / 1000);
  if (segundos < 60) return 'agora';
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? 'ontem' : `há ${dias} dias`;
}
