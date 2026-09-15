import Phaser from '../phaser.js';
import { HEX, estiloTexto } from '../constantes.js';
import { Vista } from './Vista.js';

/** Visão de perto da placa-mãe na bancada (ou dentro do gabinete, com zoom). */
export class VistaPlaca extends Vista {
  desenhar(container, montagem) {
    const { x, y, w, h } = this.area;
    const caixa = new Phaser.Geom.Rectangle(x, y, w, h);

    if (!montagem.placa()) {
      const ret = Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(caixa), -w * 0.18, -h * 0.08);
      this.espacoVazio(container, ret, 'Arraste uma placa-mãe para a bancada');
      return { zonas: [{ encaixe: 'placa', ret }], pecas: [] };
    }

    const resultado = this.desenharPlaca(container, montagem, Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(caixa), -8, -8));
    if (montagem.estado.placaNoGabinete) {
      container.add(this.cena.add.text(x + w / 2, y + h + 2, 'A placa está dentro do gabinete (visão de perto)', estiloTexto(12, HEX.textoSuave)).setOrigin(0.5, 1));
    }
    return resultado;
  }
}
