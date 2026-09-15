import Phaser from '../phaser.js';
import { CORES, HEX, estiloTexto } from '../constantes.js';
import { SPRITES, LAYOUT_GABINETES } from '../sprites/manifesto.js';
import { ARTE_NO_ENCAIXE, AREA_DE_SOLTAR, caber, daFracao, retangulo } from '../sprites/colocacao.js';
import { Vista, paraPhaser } from './Vista.js';

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

    const base = caber(gabinete.sprite, retangulo(x, y, w, h));
    const { x: x0, y: y0, width: gw, height: gh } = base;
    const escala = gw / SPRITES[gabinete.sprite].largura;
    const layout = LAYOUT_GABINETES[gabinete.sprite];
    const R = (n) => daFracao(n, base);

    const zonas = [];
    const pecas = [];
    const guias = [];
    pecas.push({ encaixe: 'gabinete', objeto: this.imagemEm(container, gabinete.sprite, base) });

    // Placa-mãe
    const areaPlaca = R(layout.placa);
    guias.push(paraPhaser(areaPlaca));
    let pontos = null;
    if (montagem.estado.placaNoGabinete) {
      const resultado = this.desenharPlaca(container, montagem, areaPlaca, { arrastaveis: new Set(['gpu']) });
      pontos = resultado.pontos;
      zonas.push(...resultado.zonas.filter((z) => z.encaixe === 'gpu'));
      pecas.push(...resultado.pecas);
      guias.push(...resultado.guias);
    } else {
      const texto = montagem.placa() ? 'Espaço da placa-mãe\n(use o botão "Placa → gabinete")' : 'Espaço da placa-mãe';
      container.add(this.cena.add.text(areaPlaca.x + areaPlaca.width / 2, areaPlaca.y + areaPlaca.height / 2, texto, estiloTexto(12, HEX.textoSuave, { align: 'center' })).setOrigin(0.5));
    }

    // Fonte
    const baiaFonte = R(layout.fonte);
    guias.push(paraPhaser(baiaFonte));
    zonas.push({ encaixe: 'fonte', ret: paraPhaser(AREA_DE_SOLTAR.fonte(baiaFonte)) });
    const fonte = montagem.fonte();
    if (fonte) pecas.push({ encaixe: 'fonte', objeto: this.imagemEm(container, fonte.sprite, ARTE_NO_ENCAIXE.fonte(fonte.sprite, baiaFonte, escala)) });

    // Baias SATA
    const baias = layout.sata.map((n, i) => {
      const r = R(n);
      guias.push(paraPhaser(r));
      zonas.push({ encaixe: `sata-${i}`, ret: paraPhaser(AREA_DE_SOLTAR.sata(r)) });
      const disco = montagem.pecaNo(`sata-${i}`);
      if (disco) pecas.push({ encaixe: `sata-${i}`, objeto: this.imagemEm(container, disco.sprite, ARTE_NO_ENCAIXE.sata(disco.sprite, r, escala)) });
      return paraPhaser(r);
    });

    if (fonte) this.desenharCabos(container, montagem, paraPhaser(baiaFonte), pontos, baias);

    if (montagem.estado.tampaFechada) {
      const g = this.cena.add.graphics();
      g.fillStyle(0x0d1a33, 0.72).fillRect(x0 + 6 * escala, y0 + 6 * escala, gw * 0.9, gh - 12 * escala);
      g.fillStyle(0xffffff, 0.08).fillTriangle(x0 + 6, y0 + 6, x0 + gw * 0.45, y0 + 6, x0 + 6, y0 + gh * 0.45);
      g.lineStyle(4, CORES.borda, 1).strokeRect(x0 + 6 * escala, y0 + 6 * escala, gw * 0.9, gh - 12 * escala);
      container.add(g);
      container.add(this.cena.add.text(x0 + gw * 0.45, y0 + gh / 2, 'Tampa fechada', estiloTexto(16, HEX.textoSuave)).setOrigin(0.5));
      return { zonas: [], pecas: [], guias };
    }

    return { zonas, pecas, guias };
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
