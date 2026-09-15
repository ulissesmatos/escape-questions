// Contas do editor de zonas. O jogo guarda frações (0 a 1) da imagem; o
// editor trabalha em pixels inteiros da arte, para os ajustes "grudarem" nos
// pixels do desenho.

export const TAMANHO_MINIMO = 2;

/** [x, y, largura, altura] em frações → { x, y, w, h } em pixels da imagem */
export function paraPixels([x, y, w, h], { largura, altura }) {
  return { x: Math.round(x * largura), y: Math.round(y * altura), w: Math.round(w * largura), h: Math.round(h * altura) };
}

/** { x, y, w, h } em pixels → frações com 4 casas (voltam exatamente aos mesmos pixels) */
export function paraFracao({ x, y, w, h }, { largura, altura }) {
  const casas = (valor) => Math.round(valor * 10000) / 10000;
  return [casas(x / largura), casas(y / altura), casas(w / largura), casas(h / altura)];
}

/** Mantém o retângulo dentro da imagem e com o tamanho mínimo */
export function limitar({ x, y, w, h }, { largura, altura }) {
  const lw = Math.min(Math.max(TAMANHO_MINIMO, Math.round(w)), largura);
  const lh = Math.min(Math.max(TAMANHO_MINIMO, Math.round(h)), altura);
  return {
    x: Math.min(Math.max(0, Math.round(x)), largura - lw),
    y: Math.min(Math.max(0, Math.round(y)), altura - lh),
    w: lw,
    h: lh,
  };
}

/**
 * Retângulo depois de arrastar dx, dy (pixels da imagem).
 * modo 'mover' desloca tudo; um canto ('nw', 'ne', 'sw', 'se') é puxado
 * enquanto o canto oposto fica parado.
 */
export function arrastarRetangulo(inicio, modo, dx, dy, imagem) {
  if (modo === 'mover') return limitar({ ...inicio, x: inicio.x + dx, y: inicio.y + dy }, imagem);
  let esquerda = inicio.x;
  let topo = inicio.y;
  let direita = inicio.x + inicio.w;
  let base = inicio.y + inicio.h;
  if (modo.includes('w')) esquerda = Math.min(Math.max(0, esquerda + dx), direita - TAMANHO_MINIMO);
  if (modo.includes('e')) direita = Math.max(Math.min(imagem.largura, direita + dx), esquerda + TAMANHO_MINIMO);
  if (modo.includes('n')) topo = Math.min(Math.max(0, topo + dy), base - TAMANHO_MINIMO);
  if (modo.includes('s')) base = Math.max(Math.min(imagem.altura, base + dy), topo + TAMANHO_MINIMO);
  return { x: esquerda, y: topo, w: direita - esquerda, h: base - topo };
}

export const mesmoRetangulo = (a, b) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
