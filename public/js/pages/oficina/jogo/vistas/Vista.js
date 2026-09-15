import Phaser from '../phaser.js';
import { CORES, HEX, estiloTexto } from '../constantes.js';
import { SPRITES, LAYOUT_PLACAS } from '../sprites/manifesto.js';

/**
 * Base das vistas da área de trabalho. Uma vista desenha o estado da
 * montagem dentro de um container e informa:
 *  - zonas: onde cada encaixe aceita peças (retângulos em coordenadas do jogo)
 *  - pecas: sprites de peças instaladas que podem ser arrastadas de volta
 */
export class Vista {
  constructor(cena, area) {
    this.cena = cena;
    this.area = area;
  }

  /** @abstract @returns {{ zonas: Array, pecas: Array }} */
  desenhar(container, montagem) { // eslint-disable-line no-unused-vars
    throw new Error('desenhar() não implementado');
  }

  imagem(container, chave, x, y, escala = 1, { origem = [0.5, 0.5] } = {}) {
    const { largura, altura } = SPRITES[chave];
    const img = this.cena.add.image(x, y, chave).setOrigin(...origem).setDisplaySize(largura * escala, altura * escala);
    container.add(img);
    return img;
  }

  /** Imagem que cabe inteira num retângulo, centralizada */
  imagemNoRetangulo(container, chave, ret, margem = 0.92) {
    const { largura, altura } = SPRITES[chave];
    const escala = Math.min((ret.width * margem) / largura, (ret.height * margem) / altura);
    return this.imagem(container, chave, ret.centerX, ret.centerY, escala);
  }

  espacoVazio(container, ret, texto) {
    const g = this.cena.add.graphics();
    g.lineStyle(3, CORES.borda, 1);
    const passo = 14;
    for (let x = ret.x; x < ret.right; x += passo * 2) {
      g.lineBetween(x, ret.y, Math.min(x + passo, ret.right), ret.y);
      g.lineBetween(x, ret.bottom, Math.min(x + passo, ret.right), ret.bottom);
    }
    for (let y = ret.y; y < ret.bottom; y += passo * 2) {
      g.lineBetween(ret.x, y, ret.x, Math.min(y + passo, ret.bottom));
      g.lineBetween(ret.right, y, ret.right, Math.min(y + passo, ret.bottom));
    }
    container.add(g);
    container.add(this.cena.add.text(ret.centerX, ret.centerY, texto, estiloTexto(16, HEX.textoSuave, { align: 'center', wordWrap: { width: ret.width - 30 } })).setOrigin(0.5));
  }

  /**
   * Desenha a placa-mãe (com as peças instaladas nela) dentro de um retângulo.
   * Usado pela vista da placa (grande) e pela do gabinete (pequena).
   */
  desenharPlaca(container, montagem, caixa, { arrastaveis = null } = {}) {
    // arrastaveis: Set de encaixes cujas peças podem ser arrastadas (null = todas)
    const podeArrastar = (encaixe) => !arrastaveis || arrastaveis.has(encaixe);
    const placa = montagem.placa();
    const { largura, altura } = SPRITES[placa.sprite];
    const escala = Math.min(caixa.width / largura, caixa.height / altura);
    const w = largura * escala;
    const h = altura * escala;
    const x0 = caixa.centerX - w / 2;
    const y0 = caixa.centerY - h / 2;
    const layout = LAYOUT_PLACAS[placa.sprite];
    const R = (n) => new Phaser.Geom.Rectangle(x0 + n[0] * w, y0 + n[1] * h, n[2] * w, n[3] * h);

    const zonas = [];
    const pecas = [];
    const imgPlaca = this.imagem(container, placa.sprite, x0, y0, escala, { origem: [0, 0] });
    if (podeArrastar('placa')) pecas.push({ encaixe: 'placa', objeto: imgPlaca });

    const socket = R(layout.socket);
    if (montagem.estado.placaDanificada) {
      const g = this.cena.add.graphics();
      g.fillStyle(CORES.erro, 0.35).fillRect(socket.x, socket.y, socket.width, socket.height);
      g.lineStyle(2, CORES.erro, 1);
      for (let i = 0; i < 5; i++) {
        const px = socket.x + (socket.width / 6) * (i + 1);
        g.lineBetween(px, socket.centerY - 6, px + (i % 2 ? 5 : -5), socket.centerY + 6);
      }
      container.add(g);
    }

    // Processador, pasta e cooler
    zonas.push({ encaixe: 'cpu', ret: socket }, { encaixe: 'pasta', ret: socket });
    const cpu = montagem.processador();
    if (cpu) {
      // A arte final usa margem visual própria; ocupar levemente mais que o
      // soquete evita que o processador pareça solto sobre o encaixe.
      const img = this.imagemNoRetangulo(container, cpu.sprite, socket, 1.02);
      if (podeArrastar('cpu')) pecas.push({ encaixe: 'cpu', objeto: img });
    }
    const pasta = montagem.estado.pasta;
    if (pasta !== 'nenhuma' && !montagem.cooler()) {
      const g = this.cena.add.graphics();
      const raio = socket.width * { pouca: 0.1, ideal: 0.2, demais: 0.34 }[pasta];
      g.fillStyle(0xb8bfcc, 1).fillCircle(socket.centerX, socket.centerY, raio);
      g.fillStyle(0xdfe4ec, 1).fillCircle(socket.centerX - raio * 0.3, socket.centerY - raio * 0.3, raio * 0.35);
      if (pasta === 'demais') {
        for (let i = 0; i < 4; i++) g.fillStyle(0xb8bfcc, 1).fillCircle(socket.centerX + Math.cos(i * 1.6) * raio * 1.1, socket.centerY + Math.sin(i * 1.6) * raio * 1.1, raio * 0.3);
      }
      container.add(g);
    }
    zonas.push({ encaixe: 'cooler', ret: Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(socket), socket.width * 0.3, socket.height * 0.3) });
    const cooler = montagem.cooler();
    if (cooler) {
      const img = this.imagem(container, cooler.sprite, socket.centerX, socket.centerY, escala);
      if (podeArrastar('cooler')) pecas.push({ encaixe: 'cooler', objeto: img });
    }

    // Memórias e M.2
    layout.ram.forEach((n, i) => {
      if (i >= placa.slotsRam) return;
      const ret = R(n);
      zonas.push({ encaixe: `ram-${i}`, ret: Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(ret), ret.width * 0.8, 0) });
      const ram = montagem.pecaNo(`ram-${i}`);
      if (ram) {
        const img = this.imagem(container, ram.sprite, ret.centerX, ret.centerY, escala * 1.16);
        if (podeArrastar(`ram-${i}`)) pecas.push({ encaixe: `ram-${i}`, objeto: img });
      }
    });
    layout.m2.forEach((n, i) => {
      if (i >= placa.slotsM2) return;
      const ret = R(n);
      zonas.push({ encaixe: `m2-${i}`, ret: Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(ret), 0, ret.height) });
      const ssd = montagem.pecaNo(`m2-${i}`);
      if (ssd) {
        const img = this.imagem(container, ssd.sprite, ret.x, ret.centerY, escala, { origem: [0, 0.5] });
        if (podeArrastar(`m2-${i}`)) pecas.push({ encaixe: `m2-${i}`, objeto: img });
      }
    });

    // Placa de vídeo (só com a placa-mãe dentro do gabinete)
    const pcie = R(layout.pcie);
    if (montagem.estado.placaNoGabinete) {
      zonas.push({ encaixe: 'gpu', ret: Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(pcie), 0, pcie.height * 2) });
    }
    const gpu = montagem.placaDeVideo();
    if (gpu) {
      const img = this.imagem(container, gpu.sprite, pcie.x - 6 * escala, pcie.centerY + 2 * escala, escala, { origem: [0, 1] });
      if (podeArrastar('gpu')) pecas.push({ encaixe: 'gpu', objeto: img });
    }

    return {
      zonas,
      pecas,
      pontos: {
        conector24: R(layout.conector24),
        conectorCpu: R(layout.conectorCpu),
        pcie,
      },
    };
  }
}
