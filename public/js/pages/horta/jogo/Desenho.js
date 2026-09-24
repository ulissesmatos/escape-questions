// Desenho da horta em pixel art com Canvas 2D (sem imagens nem WebGL). Tudo é
// desenhado numa escala de 16 px por casa e ampliado sem suavizar. O chão só é
// redesenhado quando alguma casa muda; a cada quadro entram só o robô, as
// moedas e os efeitos. Fora das animações nada é redesenhado.

const T = 16; // pixels por casa
const BORDA = 8; // cerca em volta

const COR = {
  grama: '#6abe5a',
  gramaEscura: '#56a64a',
  gramaClara: '#86d173',
  terra: '#8b5a33',
  terraEscura: '#6e4424',
  terraClara: '#a36d43',
  terraSeca: '#b08457',
  terraMolhada: '#5e3a1f',
  folha: '#3f8f3a',
  folhaClara: '#66bb6a',
  tomate: '#e0413a',
  tomateBrilho: '#ff9a8f',
  tomateVerde: '#9ccc65',
  murcha: '#b39b3c',
  murchaEscura: '#8d7a2c',
  agua: '#4fc3f7',
  aguaClara: '#b3e5fc',
  pedra: '#8d8d8d',
  pedraClara: '#b8b8b8',
  pedraEscura: '#5f5f5f',
  madeira: '#a0612d',
  madeiraClara: '#c98a4b',
  celeiro: '#c0392b',
  celeiroEscuro: '#7b241c',
  branco: '#fdfdfd',
  moeda: '#ffd54f',
  moedaEscura: '#f59f00',
  robo: '#b0bec5',
  roboClaro: '#e3eaee',
  roboEscuro: '#546e7a',
  olho: '#263238',
  luz: '#ff5252',
  certo: '#2e7d32',
  errado: '#c62828',
  sombra: 'rgba(0,0,0,0.18)',
};

/** Número pseudoaleatório fixo por casa (para os tufos de grama não piscarem) */
function ruido(x, y, n = 0) {
  let h = (x * 374761393 + y * 668265263 + n * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) / 4294967296;
}

function r(ctx, cor, x, y, l, a) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, y, l, a);
}

// ---------- casas ----------

function grama(ctx, px, py, x, y) {
  r(ctx, COR.grama, px, py, T, T);
  for (let i = 0; i < 4; i++) {
    const tx = px + Math.floor(ruido(x, y, i) * 14);
    const ty = py + Math.floor(ruido(x, y, i + 9) * 14);
    r(ctx, i % 2 ? COR.gramaEscura : COR.gramaClara, tx, ty, 2, 1);
    r(ctx, COR.gramaEscura, tx + 1, ty + 1, 1, 1);
  }
  if (ruido(x, y, 42) > 0.85) {
    const fx = px + 3 + Math.floor(ruido(x, y, 43) * 9);
    const fy = py + 3 + Math.floor(ruido(x, y, 44) * 9);
    r(ctx, '#fff59d', fx, fy, 2, 2);
    r(ctx, '#ffb74d', fx, fy, 1, 1);
  }
}

function terra(ctx, px, py, cor = COR.terra) {
  r(ctx, cor, px, py, T, T);
  r(ctx, COR.terraEscura, px, py, T, 1);
  r(ctx, COR.terraEscura, px, py, 1, T);
  for (const ly of [4, 9, 14]) {
    r(ctx, COR.terraEscura, px + 2, py + ly, 12, 1);
    r(ctx, COR.terraClara, px + 2, py + ly - 1, 12, 1);
  }
}

function tomateiro(ctx, px, py, corFruta, brilho) {
  r(ctx, COR.folha, px + 7, py + 4, 2, 10);
  r(ctx, COR.folha, px + 3, py + 5, 4, 2);
  r(ctx, COR.folha, px + 9, py + 3, 4, 2);
  r(ctx, COR.folhaClara, px + 4, py + 5, 2, 1);
  r(ctx, COR.folhaClara, px + 10, py + 3, 2, 1);
  r(ctx, COR.folha, px + 4, py + 10, 3, 2);
  r(ctx, COR.folha, px + 9, py + 9, 3, 2);
  for (const [fx, fy] of [[3, 7], [10, 6], [6, 11]]) {
    r(ctx, corFruta, px + fx, py + fy, 4, 3);
    r(ctx, corFruta, px + fx + 1, py + fy - 1, 2, 5);
    if (brilho) r(ctx, brilho, px + fx + 1, py + fy, 1, 1);
  }
}

function muda(ctx, px, py) {
  r(ctx, COR.folha, px + 7, py + 8, 2, 5);
  r(ctx, COR.folhaClara, px + 4, py + 7, 3, 2);
  r(ctx, COR.folhaClara, px + 9, py + 6, 3, 2);
}

function murcha(ctx, px, py) {
  r(ctx, COR.murchaEscura, px + 7, py + 6, 2, 8);
  r(ctx, COR.murcha, px + 3, py + 8, 4, 2);
  r(ctx, COR.murcha, px + 2, py + 10, 2, 2);
  r(ctx, COR.murcha, px + 9, py + 7, 4, 2);
  r(ctx, COR.murcha, px + 12, py + 9, 2, 2);
  r(ctx, COR.murchaEscura, px + 6, py + 5, 3, 2);
  // gota: está com sede
  r(ctx, COR.agua, px + 12, py + 1, 2, 1);
  r(ctx, COR.agua, px + 11, py + 2, 4, 3);
  r(ctx, COR.aguaClara, px + 12, py + 2, 1, 1);
}

function pedra(ctx, px, py, x, y) {
  grama(ctx, px, py, x, y);
  r(ctx, COR.sombra, px + 2, py + 12, 13, 3);
  r(ctx, COR.pedraEscura, px + 2, py + 5, 12, 9);
  r(ctx, COR.pedra, px + 3, py + 4, 10, 8);
  r(ctx, COR.pedra, px + 5, py + 3, 6, 1);
  r(ctx, COR.pedraClara, px + 4, py + 5, 4, 2);
  if (ruido(x, y, 7) > 0.5) r(ctx, COR.folhaClara, px + 11, py + 12, 3, 1);
}

function celeiro(ctx, px, py, x, y) {
  grama(ctx, px, py, x, y);
  r(ctx, COR.celeiroEscuro, px + 1, py + 4, 14, 3);
  r(ctx, COR.celeiroEscuro, px + 3, py + 2, 10, 2);
  r(ctx, COR.celeiroEscuro, px + 5, py + 1, 6, 1);
  r(ctx, COR.celeiro, px + 2, py + 7, 12, 8);
  r(ctx, COR.branco, px + 5, py + 9, 6, 6);
  r(ctx, COR.celeiro, px + 6, py + 10, 4, 5);
  r(ctx, COR.branco, px + 7, py + 11, 2, 1);
  r(ctx, COR.branco, px + 7, py + 13, 2, 1);
  r(ctx, COR.branco, px + 6, py + 5, 4, 1);
}

function desenharCasa(ctx, tipo, px, py, x, y) {
  switch (tipo) {
    case 'grama':
      return grama(ctx, px, py, x, y);
    case 'terra':
      return terra(ctx, px, py);
    case 'madura':
      terra(ctx, px, py);
      return tomateiro(ctx, px, py, COR.tomate, COR.tomateBrilho);
    case 'broto':
      terra(ctx, px, py);
      return tomateiro(ctx, px, py, COR.tomateVerde, null);
    case 'sede':
      terra(ctx, px, py, COR.terraSeca);
      return murcha(ctx, px, py);
    case 'regada':
      terra(ctx, px, py, COR.terraMolhada);
      return tomateiro(ctx, px, py, COR.tomateVerde, null);
    case 'muda':
      terra(ctx, px, py);
      return muda(ctx, px, py);
    case 'colhida':
      terra(ctx, px, py);
      r(ctx, COR.folha, px + 7, py + 11, 2, 3);
      return r(ctx, COR.folhaClara, px + 6, py + 11, 1, 1);
    case 'pedra':
      return pedra(ctx, px, py, x, y);
    case 'celeiro':
      return celeiro(ctx, px, py, x, y);
    default:
      return r(ctx, '#ff00ff', px, py, T, T);
  }
}

function cerca(ctx, largura, altura) {
  r(ctx, COR.gramaEscura, 0, 0, largura, altura);
  const trilho = (x, y, l, a) => {
    r(ctx, COR.madeira, x, y, l, a);
  };
  trilho(0, 2, largura, 1);
  trilho(0, 5, largura, 1);
  trilho(0, altura - 6, largura, 1);
  trilho(0, altura - 3, largura, 1);
  trilho(2, 0, 1, altura);
  trilho(5, 0, 1, altura);
  trilho(largura - 6, 0, 1, altura);
  trilho(largura - 3, 0, 1, altura);
  for (let x = 1; x < largura; x += 8) {
    r(ctx, COR.madeiraClara, x, 1, 2, 6);
    r(ctx, COR.madeiraClara, x, altura - 7, 2, 6);
  }
  for (let y = 1; y < altura; y += 8) {
    r(ctx, COR.madeiraClara, 1, y, 6, 2);
    r(ctx, COR.madeiraClara, largura - 7, y, 6, 2);
  }
}

// ---------- robô e efeitos ----------

function robo(ctx, px, py, dir, piscar) {
  r(ctx, COR.sombra, px + 3, py + 13, 10, 2);
  // esteiras
  r(ctx, COR.roboEscuro, px + 2, py + 11, 12, 3);
  r(ctx, COR.olho, px + 3, py + 12, 1, 1);
  r(ctx, COR.olho, px + 7, py + 12, 1, 1);
  r(ctx, COR.olho, px + 11, py + 12, 1, 1);
  // corpo e cabeça
  r(ctx, COR.roboEscuro, px + 3, py + 4, 10, 8);
  r(ctx, COR.robo, px + 4, py + 4, 8, 7);
  r(ctx, COR.roboClaro, px + 4, py + 4, 8, 1);
  // antena
  r(ctx, COR.roboEscuro, px + 7, py + 1, 1, 3);
  r(ctx, COR.luz, px + 6, py, 3, 2);

  const olhos = piscar ? 1 : 2;
  if (dir === 'baixo') {
    r(ctx, COR.olho, px + 5, py + 6, 2, olhos);
    r(ctx, COR.olho, px + 9, py + 6, 2, olhos);
    r(ctx, COR.roboEscuro, px + 6, py + 9, 4, 1);
  } else if (dir === 'cima') {
    r(ctx, COR.roboEscuro, px + 5, py + 6, 6, 3);
    r(ctx, COR.roboClaro, px + 6, py + 7, 1, 1);
  } else {
    const frente = dir === 'direita' ? 1 : -1;
    const ox = dir === 'direita' ? px + 9 : px + 5;
    r(ctx, COR.olho, ox, py + 6, 2, olhos);
    r(ctx, COR.roboEscuro, dir === 'direita' ? px + 13 : px + 2, py + 7, 1, 3);
    r(ctx, COR.roboClaro, px + 7 - frente, py + 8, 2, 2);
  }
}

function moeda(ctx, px, py, t) {
  const larg = [6, 4, 2, 4][Math.floor(t / 180) % 4];
  const x = px + 8 - larg / 2;
  const y = py + 5 + Math.round(Math.sin(t / 300) * 1);
  r(ctx, COR.sombra, px + 5, py + 13, 6, 1);
  r(ctx, COR.moedaEscura, x, y, larg, 6);
  r(ctx, COR.moeda, x + (larg > 2 ? 1 : 0), y + 1, Math.max(1, larg - 2), 4);
  if (larg > 2) r(ctx, COR.branco, x + 1, y + 1, 1, 1);
}

function balao(ctx, px, py, valor) {
  const bx = px + 9;
  const by = py - 9;
  r(ctx, COR.olho, bx - 1, by - 1, 11, 10);
  r(ctx, COR.branco, bx, by, 9, 8);
  r(ctx, COR.branco, bx + 1, by + 8, 2, 2);
  const cor = valor ? COR.certo : COR.errado;
  if (valor) {
    for (const [dx, dy] of [[2, 4], [3, 5], [4, 4], [5, 3], [6, 2]]) r(ctx, cor, bx + dx, by + dy, 1, 2);
  } else {
    for (let i = 0; i < 5; i++) {
      r(ctx, cor, bx + 2 + i, by + 1 + i, 1, 1);
      r(ctx, cor, bx + 6 - i, by + 1 + i, 1, 1);
    }
  }
}

/**
 * Desenha a horta num <canvas>. `visual` é o que a animação controla:
 * { x, y, dir, pulo, tremor, balao, particulas }
 */
export class Desenho {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.chao = document.createElement('canvas');
    this.chaoChave = '';
    this.escala = 3;
  }

  /** Ajusta o tamanho do canvas à horta e ao espaço disponível */
  ajustar(horta, larguraDisponivel, alturaMaxima = 460) {
    const lw = horta.largura * T + BORDA * 2;
    const lh = horta.altura * T + BORDA * 2;
    const porLargura = Math.floor(larguraDisponivel / lw);
    const porAltura = Math.floor(alturaMaxima / lh);
    this.escala = Math.max(1, Math.min(5, porLargura, porAltura));
    this.canvas.width = lw * this.escala;
    this.canvas.height = lh * this.escala;
    this.chaoChave = '';
  }

  desenharChao(horta) {
    const chave = `${horta.largura}x${horta.altura}:${horta.casas.map((l) => l.join(',')).join('/')}`;
    if (chave === this.chaoChave) return;
    this.chaoChave = chave;
    const c = this.chao;
    c.width = horta.largura * T + BORDA * 2;
    c.height = horta.altura * T + BORDA * 2;
    const ctx = c.getContext('2d');
    cerca(ctx, c.width, c.height);
    for (let y = 0; y < horta.altura; y++) {
      for (let x = 0; x < horta.largura; x++) {
        desenharCasa(ctx, horta.casas[y][x], BORDA + x * T, BORDA + y * T, x, y);
      }
    }
  }

  desenhar(horta, visual, tempo = 0) {
    const { ctx, escala } = this;
    this.desenharChao(horta);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.chao, 0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(escala, 0, 0, escala, 0, 0);

    for (const chave of horta.moedas) {
      const [x, y] = chave.split(',').map(Number);
      moeda(ctx, BORDA + x * T, BORDA + y * T, tempo + x * 90);
    }

    const tremor = visual.tremor ? Math.round(Math.sin(tempo / 25) * visual.tremor) : 0;
    const px = Math.round(BORDA + visual.x * T) + tremor;
    const py = Math.round(BORDA + visual.y * T - (visual.pulo || 0));
    const piscar = Math.floor(tempo / 150) % 20 === 0;
    robo(ctx, px, py, visual.dir, piscar);

    for (const p of visual.particulas || []) {
      r(ctx, p.cor, Math.round(BORDA + p.x * T), Math.round(BORDA + p.y * T), p.tamanho, p.tamanho);
    }
    if (visual.balao !== null && visual.balao !== undefined) balao(ctx, px, py, visual.balao);
  }
}

export const CORES_PARTICULAS = {
  colher: [COR.tomate, COR.tomateBrilho, COR.folhaClara],
  plantar: [COR.terraClara, COR.folhaClara, COR.terraEscura],
  regar: [COR.agua, COR.aguaClara, COR.branco],
  moeda: [COR.moeda, COR.branco, COR.moedaEscura],
  bater: [COR.pedraClara, COR.branco, COR.roboEscuro],
  festa: [COR.moeda, COR.tomate, COR.agua, COR.folhaClara, COR.branco],
};
