import Phaser from './phaser.js';
import { LARGURA, ALTURA, ESCALA, CORES } from './constantes.js';
import { CenaCarregamento } from './cenas/CenaCarregamento.js';
import { CenaMenu } from './cenas/CenaMenu.js';
import { CenaOficina } from './cenas/CenaOficina.js';

/** Cria o jogo dentro do elemento informado. */
export function criarJogo(elemento, { spritesDisponiveis = [], mostrarZonas = false } = {}) {
  const jogo = new Phaser.Game({
    type: Phaser.AUTO,
    parent: elemento,
    width: LARGURA * ESCALA,
    height: ALTURA * ESCALA,
    backgroundColor: CORES.fundo,
    // Pixels grandes e nítidos, mas com bordas suaves (texto legível ao ampliar)
    render: { smoothPixelArt: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { mouse: { preventDefaultWheel: false } },
    scene: [CenaCarregamento, CenaMenu, CenaOficina],
  });
  jogo.registry.set('spritesDisponiveis', spritesDisponiveis);
  jogo.registry.set('mostrarZonas', mostrarZonas);
  return jogo;
}
