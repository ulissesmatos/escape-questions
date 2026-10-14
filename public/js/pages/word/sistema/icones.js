import { ICONES } from './iconesFluent.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PASTA_IMAGENS = '/images/word/icones';

/**
 * Ícone pelo nome:
 * - "text_bold" → ícone Fluent monocromático (herda a cor do texto);
 * - "img:pasta" → imagem colorida de public/images/word/icones/pasta.svg.
 */
export function icone(nome, { tamanho = 20, classe = '' } = {}) {
  if (nome.startsWith('img:')) {
    return Object.assign(document.createElement('img'), {
      src: `${PASTA_IMAGENS}/${nome.slice(4)}.svg`,
      alt: '',
      width: tamanho,
      height: tamanho,
      draggable: false,
      className: `icone icone-img ${classe}`.trim(),
    });
  }
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('width', tamanho);
  svg.setAttribute('height', tamanho);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `icone ${classe}`.trim());
  svg.setAttribute('fill', 'currentColor');
  svg.innerHTML = ICONES[nome] || ICONES.question_circle || '';
  return svg;
}

/** Ícone de cada programa (logotipos reais) */
export const ICONE_DO_APP = {
  word: 'img:logo-word',
  bloco: 'img:logo-bloco-de-notas',
  explorador: 'img:pasta',
  edge: 'img:logo-edge',
  fotos: 'img:image-48-color',
  windows: 'img:logo-windows',
};

/** Ícone de um arquivo pelo tipo (como o Explorador do Windows 11 mostra) */
export function iconeDoArquivo(item, tamanho = 20) {
  const base = h2('span', `icone-arquivo icone-arquivo-${item.tipo}`);
  base.style.width = base.style.height = `${tamanho}px`;
  if (item.tipo === 'pasta') {
    base.append(icone('img:pasta', { tamanho }));
  } else if (item.tipo === 'imagem') {
    base.append(icone('img:image-48-color', { tamanho }));
  } else if (item.tipo === 'pdf') {
    base.append(icone('img:document-48-color', { tamanho }));
    base.append(selo('PDF', 'selo-pdf'));
  } else if (item.tipo === 'txt') {
    base.append(icone('img:document-text-48-color', { tamanho }));
  } else if (item.tipo === 'docx') {
    base.append(icone('img:document-48-color', { tamanho }));
    const w = icone('img:logo-word', { tamanho: Math.round(tamanho * 0.55), classe: 'selo-app' });
    base.append(w);
  } else {
    base.append(icone('img:document-48-color', { tamanho }));
  }
  return base;
}

function h2(tag, classe) {
  const el = document.createElement(tag);
  el.className = classe;
  return el;
}

function selo(texto, classe) {
  const el = h2('span', `selo-texto ${classe}`);
  el.textContent = texto;
  return el;
}
