// Resolução lógica do jogo: todas as posições do código usam 960×540
export const LARGURA = 960;
export const ALTURA = 540;

// O canvas é renderizado ESCALA× maior e a câmera aplica zoom, para que textos
// e bordas fiquem nítidos quando o jogo é esticado para caber na tela.
// No modo leve vale 1: quatro vezes menos pixels por quadro.
export let ESCALA = 2;

export function definirEscala(valor) {
  ESCALA = valor;
}

// Tamanho do "pixel" dos desenhos provisórios (2 = cada pixel lógico vira 2×2)
export const PIXEL = 2;

// DotGothic16: pixelada e legível — em outras fontes do tipo o 5 vira S e o 8 confunde
export const FONTE = '"DotGothic16", "Segoe UI", sans-serif';

export const CORES = {
  fundo: 0x1b2033,
  fundoClaro: 0x252b43,
  painel: 0x2c3350,
  painelClaro: 0x3a4266,
  borda: 0x4a5380,
  texto: 0xf1f3fb,
  textoSuave: 0xb4bbd8,
  destaque: 0xffc94a,
  sucesso: 0x4ade80,
  erro: 0xf87171,
  aviso: 0xfbbf24,
  info: 0x60a5fa,
  bancada: 0x6b4a33,
  bancadaEscura: 0x4f3524,
  tapete: 0x3a4660,
};

export const HEX = Object.fromEntries(Object.entries(CORES).map(([k, v]) => [k, `#${v.toString(16).padStart(6, '0')}`]));

export function estiloTexto(tamanho = 14, cor = HEX.texto, extra = {}) {
  return { fontFamily: FONTE, fontSize: `${tamanho}px`, color: cor, resolution: ESCALA, ...extra };
}

/** Faz a câmera mostrar o mundo lógico (960×540) ocupando o canvas ampliado */
export function prepararCamera(cena) {
  cena.cameras.main.setZoom(ESCALA).centerOn(LARGURA / 2, ALTURA / 2);
}

/** Converte a posição do ponteiro (pixels do canvas) para coordenadas do jogo */
export function pontoNoMundo(cena, ponteiro) {
  return cena.cameras.main.getWorldPoint(ponteiro.x, ponteiro.y);
}
