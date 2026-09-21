import Phaser from './phaser.js';
import { LARGURA, ALTURA, ESCALA, CORES, definirEscala } from './constantes.js';
import { modoLeveEscolhido } from './desempenho.js';
import { SomDaOficina } from './audio/SomDaOficina.js';
import { CenaCarregamento } from './cenas/CenaCarregamento.js';
import { CenaMenu } from './cenas/CenaMenu.js';
import { CenaOficina } from './cenas/CenaOficina.js';

/**
 * Cria o jogo dentro do elemento informado.
 * `fontesDeSprite` (chave → endereço da imagem) permite embutir a arte no
 * próprio arquivo: é assim que a versão para baixar funciona sem servidor.
 */
export function criarJogo(elemento, { spritesDisponiveis = [], fontesDeSprite = {}, mostrarZonas = false, modoLeve = modoLeveEscolhido() } = {}) {
  definirEscala(modoLeve ? 1 : 2);
  const jogo = new Phaser.Game({
    type: Phaser.AUTO,
    parent: elemento,
    width: LARGURA * ESCALA,
    height: ALTURA * ESCALA,
    backgroundColor: CORES.fundo,
    // Pixels grandes e nítidos, mas com bordas suaves (texto legível ao ampliar).
    // No modo leve, o desenho mais simples pesa menos.
    render: modoLeve ? { pixelArt: true } : { smoothPixelArt: true },
    // Em tela cheia o elemento do jogo ocupa a tela toda e o canvas se ajusta mantendo 16:9
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: elemento },
    input: { mouse: { preventDefaultWheel: false } },
    scene: [CenaCarregamento, CenaMenu, CenaOficina],
  });
  jogo.registry.set('spritesDisponiveis', spritesDisponiveis);
  jogo.registry.set('fontesDeSprite', fontesDeSprite);
  jogo.registry.set('mostrarZonas', mostrarZonas);
  jogo.registry.set('modoLeve', modoLeve);

  // O navegador só libera áudio depois da primeira interação
  const som = new SomDaOficina();
  jogo.registry.set('som', som);
  const liberarAudio = () => som.desbloquear();
  window.addEventListener('pointerdown', liberarAudio, { once: true });
  window.addEventListener('keydown', liberarAudio, { once: true });
  document.addEventListener('visibilitychange', () => som.pausar(document.hidden));
  return jogo;
}
