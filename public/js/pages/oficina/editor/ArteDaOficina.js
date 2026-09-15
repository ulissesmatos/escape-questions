import Phaser from '../jogo/phaser.js';
import { SPRITES } from '../jogo/sprites/manifesto.js';
import { ArtistaPixel } from '../jogo/sprites/ArtistaPixel.js';

/**
 * Endereço da imagem de cada sprite para o editor: o PNG de /images/oficina
 * quando existe; senão, o mesmo desenho provisório que o jogo usaria
 * (gerado pelo ArtistaPixel num Phaser invisível).
 */
export async function carregarArteDaOficina(disponiveis) {
  const chaves = Object.keys(SPRITES);
  const faltando = chaves.filter((chave) => !disponiveis.has(chave));
  const provisorios = faltando.length ? await desenharProvisorios(disponiveis) : {};
  const versao = Date.now(); // evita mostrar um PNG antigo do cache depois de trocar a arte
  return Object.fromEntries(chaves.map((chave) => [chave, provisorios[chave] || `/images/oficina/${chave}.png?v=${versao}`]));
}

function desenharProvisorios(disponiveis) {
  return new Promise((resolver) => {
    const alvo = document.createElement('div');
    alvo.hidden = true;
    document.body.append(alvo);
    const jogo = new Phaser.Game({
      type: Phaser.CANVAS,
      width: 1,
      height: 1,
      parent: alvo,
      banner: false,
      audio: { noAudio: true },
      scene: {
        create() {
          new ArtistaPixel(this).gerarFaltantes(disponiveis);
          const imagens = {};
          for (const chave of Object.keys(SPRITES)) {
            if (!disponiveis.has(chave) && this.textures.exists(chave)) imagens[chave] = this.textures.getBase64(chave);
          }
          resolver(imagens);
          jogo.destroy(true);
          alvo.remove();
        },
      },
    });
  });
}
