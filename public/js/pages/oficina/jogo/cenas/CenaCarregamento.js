import Phaser from '../phaser.js';
import { LARGURA, ALTURA, CORES, HEX, estiloTexto, prepararCamera } from '../constantes.js';
import { SPRITES } from '../sprites/manifesto.js';
import { ArtistaPixel } from '../sprites/ArtistaPixel.js';

/**
 * Carrega a arte que já existe em /images/oficina (lista vinda do servidor)
 * e desenha provisórios para o que ainda não tem imagem.
 */
export class CenaCarregamento extends Phaser.Scene {
  constructor() {
    super('carregamento');
  }

  preload() {
    prepararCamera(this);
    const barra = this.add.graphics();
    const texto = this.add.text(LARGURA / 2, ALTURA / 2 - 30, 'Abrindo a oficina...', estiloTexto(20)).setOrigin(0.5);
    this.load.on('progress', (valor) => {
      barra.clear();
      barra.fillStyle(CORES.painel, 1).fillRoundedRect(LARGURA / 2 - 160, ALTURA / 2, 320, 16, 8);
      barra.fillStyle(CORES.destaque, 1).fillRoundedRect(LARGURA / 2 - 158, ALTURA / 2 + 2, 316 * valor, 12, 6);
    });

    this.disponiveis = new Set(this.registry.get('spritesDisponiveis') || []);
    for (const chave of Object.keys(SPRITES)) {
      if (this.disponiveis.has(chave)) this.load.image(chave, `/images/oficina/${chave}.png`);
    }
    this.load.on('loaderror', (arquivo) => {
      this.disponiveis.delete(arquivo.key);
      texto.setColor(HEX.aviso);
    });
  }

  create() {
    new ArtistaPixel(this).gerarFaltantes(this.disponiveis);
    this.scene.start('menu');
  }
}
