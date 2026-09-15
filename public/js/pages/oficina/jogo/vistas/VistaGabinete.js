import Phaser from '../phaser.js';
import { CORES, HEX, estiloTexto } from '../constantes.js';
import { SPRITES, LAYOUT_GABINETES } from '../sprites/manifesto.js';
import { Vista } from './Vista.js';

const CORES_CABOS = { placa: 0xf5c542, cpu: 0xf08a3c, gpu: 0x8f63e8, sata: 0x60a5fa };

/** Gabinete aberto visto de lado: fonte, baias de disco, placa-mãe, cabos e tampa. */
export class VistaGabinete extends Vista {
  desenhar(container, montagem) {
    const { x, y, w, h } = this.area;
    const gabinete = montagem.gabinete();

    if (!gabinete) {
      const ret = new Phaser.Geom.Rectangle(x + w * 0.2, y + h * 0.04, w * 0.6, h * 0.92);
      this.espacoVazio(container, ret, 'Arraste um gabinete para a bancada');
      return { zonas: [{ encaixe: 'gabinete', ret }], pecas: [] };
    }

    const { largura, altura } = SPRITES[gabinete.sprite];
    const escala = Math.min(w / largura, h / altura);
    const gw = largura * escala;
    const gh = altura * escala;
    const x0 = x + (w - gw) / 2;
    const y0 = y + (h - gh) / 2;
    const layout = LAYOUT_GABINETES[gabinete.sprite];
    const R = (n) => new Phaser.Geom.Rectangle(x0 + n[0] * gw, y0 + n[1] * gh, n[2] * gw, n[3] * gh);

    const zonas = [];
    const pecas = [];
    const img = this.imagem(container, gabinete.sprite, x0, y0, escala, { origem: [0, 0] });
    pecas.push({ encaixe: 'gabinete', objeto: img });

    // Placa-mãe
    const areaPlaca = R(layout.placa);
    let pontos = null;
    if (montagem.estado.placaNoGabinete) {
      const resultado = this.desenharPlaca(container, montagem, areaPlaca, { arrastaveis: new Set(['gpu']) });
      pontos = resultado.pontos;
      zonas.push(...resultado.zonas.filter((z) => z.encaixe === 'gpu'));
      pecas.push(...resultado.pecas);
    } else {
      container.add(this.cena.add.text(areaPlaca.centerX, areaPlaca.centerY, montagem.placa() ? 'Espaço da placa-mãe\n(use o botão "Placa → gabinete")' : 'Espaço da placa-mãe', estiloTexto(12, HEX.textoSuave, { align: 'center' })).setOrigin(0.5));
    }

    // Fonte
    const baiaFonte = R(layout.fonte);
    zonas.push({ encaixe: 'fonte', ret: baiaFonte });
    const fonte = montagem.fonte();
    if (fonte) pecas.push({ encaixe: 'fonte', objeto: this.imagemNoRetangulo(container, fonte.sprite, baiaFonte, 0.98) });

    // Baias SATA
    const baias = layout.sata.map((n, i) => {
      const ret = R(n);
      zonas.push({ encaixe: `sata-${i}`, ret });
      const disco = montagem.pecaNo(`sata-${i}`);
      if (disco) pecas.push({ encaixe: `sata-${i}`, objeto: this.imagemNoRetangulo(container, disco.sprite, ret, 0.95) });
      return ret;
    });

    if (fonte) this.desenharCabos(container, montagem, baiaFonte, pontos, baias);

    if (montagem.estado.tampaFechada) {
      const g = this.cena.add.graphics();
      g.fillStyle(0x0d1a33, 0.72).fillRect(x0 + 6 * escala, y0 + 6 * escala, gw * 0.9, gh - 12 * escala);
      g.fillStyle(0xffffff, 0.08).fillTriangle(x0 + 6, y0 + 6, x0 + gw * 0.45, y0 + 6, x0 + 6, y0 + gh * 0.45);
      g.lineStyle(4, CORES.borda, 1).strokeRect(x0 + 6 * escala, y0 + 6 * escala, gw * 0.9, gh - 12 * escala);
      container.add(g);
      container.add(this.cena.add.text(x0 + gw * 0.45, y0 + gh / 2, 'Tampa fechada', estiloTexto(16, HEX.textoSuave)).setOrigin(0.5));
      return { zonas: [], pecas: [] };
    }

    return { zonas, pecas };
  }

  desenharCabos(container, montagem, baiaFonte, pontos, baias) {
    const g = this.cena.add.graphics();
    const origem = { x: baiaFonte.right - 6, y: baiaFonte.y + 4 };
    const cabo = (tipo, destino) => {
      g.lineStyle(4, CORES_CABOS[tipo], 1);
      const meio = { x: destino.x + 30, y: origem.y - 20 };
      const curva = new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(origem.x, origem.y),
        new Phaser.Math.Vector2(meio.x, origem.y),
        new Phaser.Math.Vector2(meio.x, destino.y),
        new Phaser.Math.Vector2(destino.x, destino.y)
      );
      curva.draw(g, 24);
    };
    const { cabos } = montagem.estado;
    if (pontos && cabos.placa) cabo('placa', { x: pontos.conector24.centerX, y: pontos.conector24.centerY });
    if (pontos && cabos.cpu) cabo('cpu', { x: pontos.conectorCpu.centerX, y: pontos.conectorCpu.centerY });
    if (pontos && cabos.gpu && montagem.placaDeVideo()) cabo('gpu', { x: pontos.pcie.centerX + 30, y: pontos.pcie.y - 8 });
    if (cabos.sata) {
      baias.forEach((ret, i) => {
        if (montagem.pecaNo(`sata-${i}`)) cabo('sata', { x: ret.x, y: ret.centerY });
      });
    }
    container.add(g);
  }
}
