import { CORES } from '../constantes.js';
import { somDa } from '../audio/SomDaOficina.js';
import { Botao } from './componentes.js';

const COR_ICONE = 0xf1f3fb;

/** Desenhos dos ícones (16×16 em volta do centro) */
const ICONES = {
  musica(g, ligado) {
    g.fillStyle(COR_ICONE, 1);
    g.fillCircle(-3, 4, 3).fillRect(-1, -6, 2, 10).fillRect(-1, -6, 7, 2).fillCircle(5, 2, 3).fillRect(5, -6, 2, 8);
    if (!ligado) riscar(g);
  },
  efeitos(g, ligado) {
    g.fillStyle(COR_ICONE, 1);
    g.fillRect(-7, -3, 4, 6).fillTriangle(-4, 0, 2, -7, 2, 7);
    if (ligado) {
      g.lineStyle(2, COR_ICONE, 1);
      g.beginPath().arc(2, 0, 5, -0.9, 0.9).strokePath();
      g.beginPath().arc(2, 0, 8, -0.9, 0.9).strokePath();
    } else riscar(g);
  },
  telaCheia(g, cheia) {
    g.fillStyle(COR_ICONE, 1);
    // Fora da tela cheia: cantos nas bordas. Em tela cheia: cantos "recolhidos" no meio.
    const retangulos = cheia
      ? [[-8, -4, 6, 2], [-4, -8, 2, 6], [2, -4, 6, 2], [2, -8, 2, 6], [-8, 2, 6, 2], [-4, 2, 2, 6], [2, 2, 6, 2], [2, 2, 2, 6]]
      : [[-8, -8, 6, 2], [-8, -8, 2, 6], [2, -8, 6, 2], [6, -8, 2, 6], [-8, 6, 6, 2], [-8, 2, 2, 6], [2, 6, 6, 2], [6, 2, 2, 6]];
    for (const [x, y, w, h] of retangulos) g.fillRect(x, y, w, h);
  },
};

function riscar(g) {
  g.lineStyle(3, CORES.erro, 1).lineBetween(-8, 8, 8, -8);
}

export function alternarTelaCheia(cena) {
  if (cena.scale.isFullscreen) cena.scale.stopFullscreen();
  else cena.scale.startFullscreen();
}

/**
 * Botões de música, efeitos e tela cheia (tecla F também alterna a tela cheia).
 * Cada cena cria os seus; o estado vem do som e do Scale Manager.
 */
export class ControlesDeJogo {
  constructor(cena, x, y, { espaco = 34, profundidade = 50 } = {}) {
    this.cena = cena;
    const som = somDa(cena);
    const botoes = [
      ['musica', 'Música', () => som.alternar('musica'), () => som.preferencias.musica],
      ['efeitos', 'Efeitos sonoros', () => som.alternar('efeitos'), () => som.preferencias.efeitos],
      ['telaCheia', 'Tela cheia (F)', () => alternarTelaCheia(cena), () => cena.scale.isFullscreen],
    ];
    this.icones = botoes.map(([nome, , acao, estado], i) => {
      const botao = new Botao(cena, x + i * espaco, y, '', acao, { largura: 28, altura: 24 }).setDepth(profundidade);
      const icone = cena.add.graphics();
      botao.add(icone);
      return { nome, icone, estado };
    });
    this.redesenhar();

    const redesenhar = () => this.redesenhar();
    const pararDeOuvir = som.aoMudar(redesenhar);
    cena.scale.on('enterfullscreen', redesenhar);
    cena.scale.on('leavefullscreen', redesenhar);
    const teclaF = () => alternarTelaCheia(cena);
    cena.input.keyboard?.on('keydown-F', teclaF);
    cena.events.once('shutdown', () => {
      pararDeOuvir();
      cena.scale.off('enterfullscreen', redesenhar);
      cena.scale.off('leavefullscreen', redesenhar);
      cena.input.keyboard?.off('keydown-F', teclaF);
    });
  }

  redesenhar() {
    for (const { nome, icone, estado } of this.icones) {
      icone.clear();
      ICONES[nome](icone, estado());
    }
  }
}
