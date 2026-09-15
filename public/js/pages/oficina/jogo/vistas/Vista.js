import Phaser from '../phaser.js';
import { CORES, HEX, estiloTexto } from '../constantes.js';
import { SPRITES, LAYOUT_PLACAS } from '../sprites/manifesto.js';
import { ARTE_NO_ENCAIXE, AREA_DE_SOLTAR, caber, daFracao } from '../sprites/colocacao.js';

export const paraPhaser = (r) => new Phaser.Geom.Rectangle(r.x, r.y, r.width, r.height);

/**
 * Base das vistas da área de trabalho. Uma vista desenha o estado da
 * montagem dentro de um container e informa:
 *  - zonas: onde cada encaixe aceita peças (retângulos em coordenadas do jogo)
 *  - pecas: sprites de peças instaladas que podem ser arrastadas de volta
 *  - guias: os encaixes como foram calibrados no editor (para ?zonas=1)
 */
export class Vista {
  constructor(cena, area) {
    this.cena = cena;
    this.area = area;
  }

  /** @abstract @returns {{ zonas: Array, pecas: Array, guias: Array }} */
  desenhar(container, montagem) { // eslint-disable-line no-unused-vars
    throw new Error('desenhar() não implementado');
  }

  /** Coloca a arte de uma peça num retângulo { x, y, width, height } */
  imagemEm(container, chave, r) {
    const img = this.cena.add.image(r.x, r.y, chave).setOrigin(0).setDisplaySize(r.width, r.height);
    container.add(img);
    return img;
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
   * Desenha a placa-mãe (com as peças instaladas nela) dentro de uma caixa.
   * Usado pela vista da placa (grande) e pela do gabinete (pequena).
   */
  desenharPlaca(container, montagem, caixa, { arrastaveis = null } = {}) {
    // arrastaveis: Set de encaixes cujas peças podem ser arrastadas (null = todas)
    const podeArrastar = (encaixe) => !arrastaveis || arrastaveis.has(encaixe);
    const placa = montagem.placa();
    const base = caber(placa.sprite, caixa);
    const escala = base.width / SPRITES[placa.sprite].largura;
    const layout = LAYOUT_PLACAS[placa.sprite];
    const R = (n) => daFracao(n, base);

    const zonas = [];
    const pecas = [];
    const guias = [];
    const aceitar = (encaixe, r) => zonas.push({ encaixe, ret: paraPhaser(r) });
    const instalar = (encaixe, regra, r) => {
      const peca = montagem.pecaNo(encaixe);
      if (!peca) return;
      const img = this.imagemEm(container, peca.sprite, ARTE_NO_ENCAIXE[regra](peca.sprite, r, escala));
      if (podeArrastar(encaixe)) pecas.push({ encaixe, objeto: img });
    };

    const imgPlaca = this.imagemEm(container, placa.sprite, base);
    if (podeArrastar('placa')) pecas.push({ encaixe: 'placa', objeto: imgPlaca });

    const socket = R(layout.socket);
    const centroSocket = { x: socket.x + socket.width / 2, y: socket.y + socket.height / 2 };
    guias.push(socket);
    if (montagem.estado.placaDanificada) {
      const g = this.cena.add.graphics();
      g.fillStyle(CORES.erro, 0.35).fillRect(socket.x, socket.y, socket.width, socket.height);
      g.lineStyle(2, CORES.erro, 1);
      for (let i = 0; i < 5; i++) {
        const px = socket.x + (socket.width / 6) * (i + 1);
        g.lineBetween(px, centroSocket.y - 6, px + (i % 2 ? 5 : -5), centroSocket.y + 6);
      }
      container.add(g);
    }

    // Processador, pasta e cooler
    aceitar('cpu', AREA_DE_SOLTAR.cpu(socket));
    aceitar('pasta', AREA_DE_SOLTAR.cpu(socket));
    instalar('cpu', 'cpu', socket);
    const pasta = montagem.estado.pasta;
    if (pasta !== 'nenhuma' && !montagem.cooler()) {
      const g = this.cena.add.graphics();
      const { x: cx, y: cy } = centroSocket;
      const raio = socket.width * { pouca: 0.1, ideal: 0.2, demais: 0.34 }[pasta];
      g.fillStyle(0xb8bfcc, 1).fillCircle(cx, cy, raio);
      g.fillStyle(0xdfe4ec, 1).fillCircle(cx - raio * 0.3, cy - raio * 0.3, raio * 0.35);
      if (pasta === 'demais') {
        for (let i = 0; i < 4; i++) g.fillStyle(0xb8bfcc, 1).fillCircle(cx + Math.cos(i * 1.6) * raio * 1.1, cy + Math.sin(i * 1.6) * raio * 1.1, raio * 0.3);
      }
      container.add(g);
    }
    aceitar('cooler', AREA_DE_SOLTAR.cooler(socket));
    instalar('cooler', 'cooler', socket);

    // Memórias e M.2
    layout.ram.forEach((n, i) => {
      if (i >= placa.slotsRam) return;
      const r = R(n);
      guias.push(r);
      aceitar(`ram-${i}`, AREA_DE_SOLTAR.ram(r));
      instalar(`ram-${i}`, 'ram', r);
    });
    layout.m2.forEach((n, i) => {
      if (i >= placa.slotsM2) return;
      const r = R(n);
      guias.push(r);
      aceitar(`m2-${i}`, AREA_DE_SOLTAR.m2(r));
      instalar(`m2-${i}`, 'm2', r);
    });

    // Placa de vídeo (só com a placa-mãe dentro do gabinete)
    const pcie = R(layout.pcie);
    guias.push(pcie);
    if (montagem.estado.placaNoGabinete) aceitar('gpu', AREA_DE_SOLTAR.gpu(pcie));
    instalar('gpu', 'gpu', pcie);

    const conector24 = R(layout.conector24);
    const conectorCpu = R(layout.conectorCpu);
    guias.push(conector24, conectorCpu);

    return {
      zonas,
      pecas,
      guias: guias.map(paraPhaser),
      pontos: { conector24: paraPhaser(conector24), conectorCpu: paraPhaser(conectorCpu), pcie: paraPhaser(pcie) },
    };
  }
}
