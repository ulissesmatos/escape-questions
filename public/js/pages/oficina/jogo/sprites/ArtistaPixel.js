import { PIXEL } from '../constantes.js';
import { SPRITES, LAYOUT_PLACAS, LAYOUT_GABINETES } from './manifesto.js';

const C = {
  pcb: 0x1f6b4a,
  pcbEscuro: 0x164e36,
  pcbAzul: 0x1f3f6b,
  pcbAzulEscuro: 0x162d4e,
  trilha: 0x2f8a5f,
  trilhaAzul: 0x3563a3,
  preto: 0x1b1d24,
  pretoClaro: 0x2c2f3a,
  metal: 0x9aa3b5,
  metalClaro: 0xd5dbe6,
  metalEscuro: 0x5b6475,
  ouro: 0xe8b64c,
  ouroEscuro: 0xb9832a,
  branco: 0xeef1f7,
  creme: 0xe7ddc2,
  cobre: 0xd2804b,
  roxo: 0x8f63e8,
  ciano: 0x38d9e8,
  azul: 0x4f7df0,
  amarelo: 0xf5c542,
  vermelho: 0xe05252,
  gabinete: 0x23262f,
  gabineteInterior: 0x30343f,
  gabineteEscuro: 0x1b1e26,
};

/** Pincel em "pixels lógicos": cada unidade vira PIXEL×PIXEL na textura */
class Pincel {
  constructor(g, p = PIXEL) {
    this.g = g;
    this.p = p;
  }

  ret(x, y, w, h, cor, alpha = 1) {
    if (w <= 0 || h <= 0) return;
    this.g.fillStyle(cor, alpha);
    this.g.fillRect(Math.round(x) * this.p, Math.round(y) * this.p, Math.max(1, Math.round(w)) * this.p, Math.max(1, Math.round(h)) * this.p);
  }

  borda(x, y, w, h, cor) {
    this.ret(x, y, w, 1, cor);
    this.ret(x, y + h - 1, w, 1, cor);
    this.ret(x, y, 1, h, cor);
    this.ret(x + w - 1, y, 1, h, cor);
  }

  circulo(cx, cy, r, cor, alpha = 1) {
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
      this.ret(cx - dx, cy + dy, dx * 2 + 1, 1, cor, alpha);
    }
  }

  anel(cx, cy, r, espessura, cor) {
    for (let dy = -r; dy <= r; dy++) {
      const fora = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
      const ri = r - espessura;
      const dentro = Math.abs(dy) <= ri ? Math.floor(Math.sqrt(ri * ri - dy * dy) + 0.3) : -1;
      if (dentro < 0) this.ret(cx - fora, cy + dy, fora * 2 + 1, 1, cor);
      else {
        this.ret(cx - fora, cy + dy, fora - dentro, 1, cor);
        this.ret(cx + dentro + 1, cy + dy, fora - dentro, 1, cor);
      }
    }
  }

  pontos(x, y, w, h, passo, cor) {
    for (let yy = y; yy < y + h; yy += passo) for (let xx = x; xx < x + w; xx += passo) this.ret(xx, yy, 1, 1, cor);
  }

  /** Triângulo retângulo com o ângulo reto no canto inferior esquerdo */
  triangulo(x, y, tamanho, cor) {
    for (let i = 0; i < tamanho; i++) this.ret(x, y + i, i + 1, 1, cor);
  }

  ventoinha(cx, cy, r, { aro = C.preto, pa = C.pretoClaro, centro = C.metalEscuro } = {}) {
    this.circulo(cx, cy, r, aro);
    this.circulo(cx, cy, r - 1, pa);
    for (let a = 0; a < 7; a++) {
      const ang = (a / 7) * Math.PI * 2;
      for (let d = 2; d < r - 1; d++) this.ret(cx + Math.cos(ang + d * 0.12) * d, cy + Math.sin(ang + d * 0.12) * d, 1, 1, aro);
    }
    this.circulo(cx, cy, Math.max(1, Math.round(r / 3.5)), centro);
  }
}

/** Gerador pseudoaleatório com semente (as trilhas saem sempre iguais) */
function aleatorio(semente) {
  let s = semente;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/**
 * Desenha os sprites provisórios em pixel art. Assim o jogo funciona antes
 * da arte final; quando existir o PNG, ele substitui o desenho.
 */
export class ArtistaPixel {
  constructor(cena) {
    this.cena = cena;
  }

  gerarFaltantes(disponiveis = new Set()) {
    for (const chave of Object.keys(SPRITES)) {
      if (!disponiveis.has(chave) && !this.cena.textures.exists(chave)) this.gerar(chave);
    }
    this.gerarEfeitos();
  }

  gerar(chave) {
    const { largura, altura } = SPRITES[chave];
    const w = Math.round(largura / PIXEL);
    const h = Math.round(altura / PIXEL);
    const g = this.cena.add.graphics();
    const p = new Pincel(g);
    const desenhos = {
      'placa-atx': () => this.placa(p, w, h, LAYOUT_PLACAS['placa-atx'], { socket: 'am5', azul: false }),
      'placa-matx': () => this.placa(p, w, h, LAYOUT_PLACAS['placa-matx'], { socket: 'am4', azul: false }),
      'placa-matx-intel': () => this.placa(p, w, h, LAYOUT_PLACAS['placa-matx-intel'], { socket: 'lga', azul: true }),
      'cpu-am4': () => this.cpu(p, w, h, 'am4'),
      'cpu-am5': () => this.cpu(p, w, h, 'am5'),
      'cpu-intel': () => this.cpu(p, w, h, 'intel'),
      pasta: () => this.pasta(p, w, h),
      'cooler-box': () => this.coolerBox(p, w, h),
      'cooler-torre': () => this.coolerTorre(p, w, h),
      'ram-ddr4': () => this.ram(p, w, h, 'ddr4'),
      'ram-ddr5': () => this.ram(p, w, h, 'ddr5'),
      'ssd-m2': () => this.ssdM2(p, w, h),
      'ssd-sata': () => this.ssdSata(p, w, h),
      hd: () => this.hd(p, w, h),
      'gpu-1': () => this.gpu(p, w, h, 1),
      'gpu-2': () => this.gpu(p, w, h, 2),
      'gpu-3': () => this.gpu(p, w, h, 3),
      fonte: () => this.fonte(p, w, h),
      'gabinete-mini': () => this.gabinete(p, w, h, LAYOUT_GABINETES['gabinete-mini'], false),
      'gabinete-mid': () => this.gabinete(p, w, h, LAYOUT_GABINETES['gabinete-mid'], true),
      'cliente-cida': () => this.rosto(p, w, h, { pele: 0xf1c7a4, cabelo: 0xc9ccd6, roupa: 0x8f63e8, oculos: true, coque: true }),
      'cliente-ricardo': () => this.rosto(p, w, h, { pele: 0xd9a07a, cabelo: 0x4a3222, roupa: 0x7fb2f0, oculos: true, barba: true }),
      'cliente-enzo': () => this.rosto(p, w, h, { pele: 0xb97a55, cabelo: 0x1b1d24, roupa: 0x3fae6a, fone: true }),
      'cliente-marina': () => this.rosto(p, w, h, { pele: 0xe8b48c, cabelo: 0x9a4a2c, roupa: 0xf08a3c, coque: true, brinco: true }),
      moeda: () => this.moeda(p, w, h),
      estrela: () => this.estrela(g, largura, altura, true),
      'estrela-vazia': () => this.estrela(g, largura, altura, false),
    };
    (desenhos[chave] || (() => p.ret(0, 0, w, h, 0xff00ff)))();
    g.generateTexture(chave, largura, altura);
    g.destroy();
  }

  gerarEfeitos() {
    if (!this.cena.textures.exists('faisca')) {
      const g = this.cena.add.graphics();
      g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4);
      g.generateTexture('faisca', 4, 4);
      g.destroy();
    }
    if (!this.cena.textures.exists('fumaca')) {
      const g = this.cena.add.graphics();
      new Pincel(g).circulo(6, 6, 6, 0x9aa3b5, 0.8);
      g.generateTexture('fumaca', 26, 26);
      g.destroy();
    }
  }

  // ---------------- Placa-mãe ----------------

  placa(p, w, h, layout, { socket, azul }) {
    const base = azul ? C.pcbAzul : C.pcb;
    const escura = azul ? C.pcbAzulEscuro : C.pcbEscuro;
    const trilha = azul ? C.trilhaAzul : C.trilha;
    const R = (r) => [r[0] * w, r[1] * h, r[2] * w, r[3] * h];

    p.ret(0, 0, w, h, escura);
    p.ret(1, 1, w - 2, h - 2, base);

    const rnd = aleatorio(azul ? 91 : w * 7 + h);
    for (let i = 0; i < 70; i++) {
      const x = 2 + rnd() * (w - 6);
      const y = 2 + rnd() * (h - 6);
      if (rnd() < 0.5) p.ret(x, y, 3 + rnd() * 14, 1, trilha);
      else p.ret(x, y, 1, 3 + rnd() * 14, trilha);
    }

    for (const [fx, fy] of [[4, 4], [w - 5, 4], [4, h - 5], [w - 5, h - 5], [w * 0.5, h * 0.5]]) {
      p.circulo(fx, fy, 2, C.ouro);
      p.circulo(fx, fy, 1, C.ouroEscuro);
    }

    // Painel traseiro (entradas USB, vídeo, som)
    p.ret(0, 3, 5, h * 0.36, C.metalEscuro);
    for (let i = 0; i < 5; i++) p.ret(1, 6 + i * (h * 0.06), 3, 2, i % 2 ? C.azul : C.preto);

    // Conectores de energia
    const [cx, cy, cw, ch] = R(layout.conectorCpu);
    p.ret(cx, cy, cw, ch, C.preto);
    p.pontos(cx + 1, cy + 1, cw - 1, ch - 1, 2, C.metalEscuro);
    const [gx, gy, gw, gh] = R(layout.conector24);
    p.ret(gx, gy, gw, gh, C.creme);
    p.pontos(gx + 1, gy + 1, gw - 1, gh - 1, 2, C.metalEscuro);

    // Socket e dissipadores dos VRMs
    const [sx, sy, sw, sh] = R(layout.socket);
    p.ret(sx - 2, sy - 8, sw + 4, 5, C.metalEscuro);
    for (let i = 0; i < sw + 4; i += 2) p.ret(sx - 2 + i, sy - 8, 1, 5, C.metal);
    p.ret(sx - 9, sy - 2, 5, sh + 4, C.metalEscuro);
    for (let i = 0; i < sh + 4; i += 2) p.ret(sx - 9, sy - 2 + i, 5, 1, C.metal);
    for (let i = 0; i < 4; i++) p.circulo(sx + sw + 3, sy + 3 + i * 4, 1, C.preto);

    if (socket === 'am4') {
      p.ret(sx, sy, sw, sh, C.creme);
      p.borda(sx, sy, sw, sh, 0xb9ad8e);
      p.pontos(sx + 2, sy + 2, sw - 4, sh - 4, 2, 0x8d8269);
      p.ret(sx + sw, sy + 2, 2, sh - 2, C.metalClaro); // alavanca
    } else {
      const largura = socket === 'lga' ? sw * 0.86 : sw;
      const ox = sx + (sw - largura) / 2;
      p.ret(ox, sy, largura, sh, C.metalClaro);
      p.ret(ox + 2, sy + 2, largura - 4, sh - 4, C.metalEscuro);
      p.pontos(ox + 3, sy + 3, largura - 6, sh - 6, 2, C.ouro);
      p.ret(ox + largura, sy + 1, 1, sh - 1, C.metal);
      p.ret(ox + largura - 3, sy + sh - 1, 4, 1, C.metal);
    }
    p.triangulo(sx + 1, sy + sh - 4, 3, C.ouro);

    // Memória, M.2, PCI Express
    for (const slot of layout.ram) {
      const [x, y, sw2, sh2] = R(slot);
      p.ret(x, y, sw2, sh2, C.preto);
      p.ret(x, y, sw2, 2, C.metalClaro);
      p.ret(x, y + sh2 - 2, sw2, 2, C.metalClaro);
      p.ret(x + sw2 / 2 - 0.5, y + 3, 1, sh2 - 6, C.pretoClaro);
    }
    for (const slot of layout.m2) {
      const [x, y, mw, mh] = R(slot);
      p.ret(x + 4, y, mw - 4, mh, escura, 0.8);
      p.ret(x, y - 1, 4, mh + 2, C.preto);
      p.circulo(x + mw - 1, y + mh / 2, 1, C.metalClaro);
    }
    const [px, py, pw, ph] = R(layout.pcie);
    p.ret(px, py - 1, pw, ph + 2, C.metal);
    p.ret(px + 1, py, pw - 2, ph, C.preto);
    p.ret(px + pw - 4, py - 2, 4, ph + 4, C.metalClaro);

    // Chipset e bateria
    p.ret(w * 0.6, h * 0.73, w * 0.2, h * 0.11, C.metalEscuro);
    p.ret(w * 0.6, h * 0.73, w * 0.2, 2, azul ? C.azul : C.vermelho);
    p.circulo(w * 0.86, h * 0.9, 3, C.metalClaro);
    p.circulo(w * 0.86, h * 0.9, 2, C.metal);
  }

  // ---------------- Processador ----------------

  cpu(p, w, h, tipo) {
    p.ret(0, 0, w, h, C.pcb);
    p.borda(0, 0, w, h, C.pcbEscuro);
    if (tipo === 'intel') {
      p.ret(4, 3, w - 8, h - 6, C.metalClaro);
      p.borda(4, 3, w - 8, h - 6, C.metal);
      p.ret(0, h * 0.3, 1, 3, 0x0e2c1d);
      p.ret(w - 1, h * 0.3, 1, 3, 0x0e2c1d);
    } else {
      p.ret(2, 2, w - 4, h - 4, C.metalClaro);
      p.borda(2, 2, w - 4, h - 4, C.metal);
      if (tipo === 'am5') {
        for (const [x, y, ww, hh] of [[w / 2 - 2, 1, 4, 3], [w / 2 - 2, h - 4, 4, 3], [1, h / 2 - 2, 3, 4], [w - 4, h / 2 - 2, 3, 4]]) {
          p.ret(x, y, ww, hh, C.pcb);
          p.ret(x + 1, y + 1, 1, 1, C.ouro);
        }
      }
    }
    for (let i = 0; i < 3; i++) p.ret(w * 0.3, h * 0.35 + i * 3, w * (0.4 - i * 0.1), 1, C.metal);
    p.triangulo(1, h - 5, 4, C.ouro);
  }

  // ---------------- Pasta e coolers ----------------

  pasta(p, w, h) {
    p.ret(0, 3, 4, h - 6, C.metalEscuro);
    p.ret(4, 2, w - 12, h - 4, C.metalClaro);
    p.borda(4, 2, w - 12, h - 4, C.metal);
    p.ret(9, 3, w - 24, h - 6, C.azul);
    p.ret(10, h / 2 - 0.5, w - 26, 1, C.branco);
    p.ret(w - 8, 3, 4, h - 6, C.preto);
    p.ret(w - 4, h / 2 - 1, 4, 2, C.metal);
  }

  coolerBox(p, w, h) {
    p.ret(0, 0, w, h, C.preto);
    p.borda(0, 0, w, h, C.pretoClaro);
    p.anel(w / 2, h / 2, w / 2 - 2, 2, C.metal);
    p.ventoinha(w / 2, h / 2, w / 2 - 4, { centro: C.vermelho });
  }

  coolerTorre(p, w, h) {
    p.ret(6, 3, w - 9, h - 6, C.metal);
    for (let y = 4; y < h - 4; y += 2) p.ret(7, y, w - 11, 1, C.metalEscuro);
    for (let i = 0; i < 4; i++) p.circulo(14 + i * ((w - 22) / 3), h / 2, 1, C.cobre);
    p.ret(0, 2, 7, h - 4, C.preto);
    p.ret(1, h / 2 - 8, 5, 16, C.pretoClaro);
  }

  // ---------------- Memória e armazenamento ----------------

  ram(p, w, h, tipo) {
    const ddr5 = tipo === 'ddr5';
    p.ret(1, 0, w - 1, h, ddr5 ? C.preto : C.pcb);
    const entalhe = Math.round(h * (ddr5 ? 0.62 : 0.5));
    p.ret(0, 2, 1, entalhe - 3, C.ouro);
    p.ret(0, entalhe + 1, 1, h - entalhe - 3, C.ouro);
    if (ddr5) {
      p.ret(w - 2, 2, 1, h - 4, C.roxo);
      p.ret(2, h * 0.4, w - 4, 8, C.metalEscuro);
    } else {
      for (let y = 3; y < h - 5; y += 8) p.ret(2, y, w - 4, 5, C.preto);
    }
  }

  ssdM2(p, w, h) {
    p.ret(0, 0, w, h, C.preto);
    p.ret(0, 1, 3, h - 2, C.ouro);
    p.ret(1, h / 2 - 1, 1, 2, C.preto);
    p.ret(5, 1, 7, h - 2, C.pretoClaro);
    p.ret(13, 1, w - 18, h - 2, C.branco);
    p.ret(14, 2, w - 24, 1, C.azul);
    p.circulo(w - 1, h / 2, 1, C.pretoClaro);
  }

  ssdSata(p, w, h) {
    p.ret(0, 0, w, h, C.preto);
    p.borda(0, 0, w, h, C.pretoClaro);
    p.ret(4, 3, w - 8, h - 6, C.azul);
    p.ret(6, 5, w - 12, 2, C.branco);
    p.ret(0, h / 2 - 3, 1, 6, C.ouro);
  }

  hd(p, w, h) {
    p.ret(0, 0, w, h, C.metal);
    p.borda(0, 0, w, h, C.metalEscuro);
    p.anel(w * 0.62, h / 2, h / 2 - 3, 1, C.metalClaro);
    p.ret(3, 3, w * 0.35, h - 6, C.branco);
    p.ret(4, 5, w * 0.3, 1, C.vermelho);
    for (const [x, y] of [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]]) p.ret(x, y, 1, 1, C.metalEscuro);
  }

  // ---------------- Placa de vídeo e fonte ----------------

  gpu(p, w, h, ventoinhas) {
    p.ret(0, 0, 3, h, C.metalClaro);
    for (let i = 0; i < 3; i++) p.ret(1, 3 + i * 5, 1, 3, C.preto);
    p.ret(3, 0, w - 3, h - 4, ventoinhas === 3 ? C.preto : C.pretoClaro);
    p.ret(3, 0, w - 3, 1, C.metalEscuro);
    p.ret(3, h - 4, w - 3, 2, C.pcb);
    p.ret(10, h - 2, w * 0.36, 2, C.ouro);
    p.ret(10 + w * 0.08, h - 2, 1, 2, C.pcb);
    const r = Math.floor((h - 7) / 2);
    const espaco = (w - 8) / ventoinhas;
    for (let i = 0; i < ventoinhas; i++) p.ventoinha(Math.round(6 + espaco * i + espaco / 2), Math.round((h - 4) / 2), r, { aro: C.preto, pa: 0x3a3e4b });
    if (ventoinhas === 3) {
      const cores = [C.roxo, C.azul, C.ciano];
      for (let i = 0; i < 3; i++) p.ret(4 + (i * (w - 6)) / 3, 1, (w - 6) / 3, 1, cores[i]);
    }
    if (ventoinhas >= 2) p.ret(w - 9, 0, 6, 2, C.preto);
  }

  fonte(p, w, h) {
    p.ret(0, 0, w, h, C.preto);
    p.borda(0, 0, w, h, C.pretoClaro);
    const r = Math.floor(h / 2) - 2;
    for (let i = r; i > 2; i -= 3) p.anel(r + 3, h / 2, i, 1, 0x4a4f5e);
    p.circulo(r + 3, h / 2, 2, C.metalEscuro);
    p.ret(w - 16, 4, 12, 8, C.amarelo);
    p.ret(w - 15, 6, 10, 1, C.preto);
    p.ret(w - 5, h - 10, 3, 6, C.vermelho);
  }

  // ---------------- Gabinete ----------------

  gabinete(p, w, h, layout, grande) {
    const R = (r) => [r[0] * w, r[1] * h, r[2] * w, r[3] * h];
    p.ret(0, 0, w, h, C.gabinete);
    p.ret(3, 3, w - 16, h - 6, C.gabineteInterior);
    p.ret(w - 12, 0, 12, h, C.gabineteEscuro);
    for (let y = 16; y < h - 10; y += 3) p.ret(w - 10, y, 8, 1, C.pretoClaro);
    p.circulo(w - 6, 8, 2, C.azul);

    // Ventoinhas
    p.ventoinha(Math.round(w * 0.05) + 2, Math.round(h * 0.12), 7, { aro: C.gabineteEscuro, pa: 0x3a3e4b });
    if (grande) for (let i = 0; i < 2; i++) p.ventoinha(Math.round(w * (0.28 + i * 0.22)), 5, 5, { aro: C.gabineteEscuro, pa: 0x3a3e4b });

    // Suportes da placa-mãe
    const [bx, by, bw, bh] = R(layout.placa);
    p.borda(bx, by, bw, bh, 0x3b404d);
    for (const [fx, fy] of [[0.08, 0.06], [0.9, 0.06], [0.08, 0.92], [0.9, 0.92], [0.5, 0.5]]) p.circulo(bx + bw * fx, by + bh * fy, 1, C.ouroEscuro);

    // Tampas de slots traseiros
    for (let i = 0; i < 6; i++) p.ret(1, by + bh * 0.62 + i * 4, 3, 2, C.metalEscuro);

    // Passa-cabos
    for (let i = 0; i < 3; i++) p.ret(w * 0.69, h * (0.14 + i * 0.13), 3, 10, C.gabineteEscuro);

    // Compartimento da fonte
    const [fx, fy, fw, fh] = R(layout.fonte);
    p.ret(3, fy - 4, w - 16, h - fy + 1, C.gabineteEscuro);
    for (let x = fx + fw + 6; x < w - 18; x += 3) p.ret(x, fy + 2, 1, fh - 4, C.pretoClaro);
    p.ret(fx, fy, fw, fh, 0x16181e);

    // Baias de disco
    for (const baia of layout.sata) {
      const [x, y, bw2, bh2] = R(baia);
      p.ret(x, y, bw2, bh2, 0x282b34);
      p.borda(x, y, bw2, bh2, 0x4a4f5e);
    }
  }

  // ---------------- Pessoas e ícones ----------------

  rosto(p, w, h, o) {
    const cx = w / 2;
    p.ret(w * 0.2, h * 0.78, w * 0.6, h * 0.22, o.roupa);
    p.ret(cx - 3, h * 0.66, 6, 5, o.pele);
    if (o.coque) p.circulo(cx, h * 0.14, 4, o.cabelo);
    p.circulo(cx, h * 0.42, 10, o.cabelo);
    p.circulo(cx, h * 0.46, 9, o.pele);
    p.ret(cx - 9, h * 0.22, 18, 5, o.cabelo);
    p.ret(cx - 4, h * 0.44, 2, 2, C.preto);
    p.ret(cx + 3, h * 0.44, 2, 2, C.preto);
    p.ret(cx - 2, h * 0.58, 5, 1, 0x9c4a3a);
    if (o.oculos) {
      p.borda(cx - 6, h * 0.41, 6, 5, C.preto);
      p.borda(cx + 1, h * 0.41, 6, 5, C.preto);
    }
    if (o.barba) p.ret(cx - 6, h * 0.55, 13, 4, o.cabelo);
    if (o.fone) {
      p.anel(cx, h * 0.42, 12, 1, C.preto);
      p.ret(cx - 13, h * 0.4, 3, 7, 0x3fae6a);
      p.ret(cx + 11, h * 0.4, 3, 7, 0x3fae6a);
    }
    if (o.brinco) {
      p.ret(cx - 10, h * 0.54, 1, 2, C.amarelo);
      p.ret(cx + 10, h * 0.54, 1, 2, C.amarelo);
    }
  }

  moeda(p, w, h) {
    const r = Math.floor(w / 2) - 0.5;
    p.circulo(w / 2, h / 2, r, C.ouroEscuro);
    p.circulo(w / 2, h / 2, r - 1, C.ouro);
    p.ret(w / 2 - 0.5, 2, 1, h - 4, C.ouroEscuro);
    p.ret(w / 2 - 2, 3, 1, 1, 0xfff1b8);
  }

  estrela(g, largura, altura, cheia) {
    const cx = largura / 2;
    const cy = altura / 2 + 1;
    const pontos = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? largura / 2 - 1 : largura / 4.6;
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      pontos.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r });
    }
    if (cheia) {
      g.fillStyle(C.ouro, 1).fillPoints(pontos, true);
      g.lineStyle(2, C.ouroEscuro, 1).strokePoints(pontos, true, true);
    } else {
      g.fillStyle(0x3a4266, 1).fillPoints(pontos, true);
      g.lineStyle(2, 0x6b7399, 1).strokePoints(pontos, true, true);
    }
  }
}
