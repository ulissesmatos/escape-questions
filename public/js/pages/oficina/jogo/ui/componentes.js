import Phaser from '../phaser.js';
import { CORES, HEX, estiloTexto } from '../constantes.js';
import { somDa } from '../audio/SomDaOficina.js';

/** Desenha um painel arredondado com borda (estilo "jogo mobile") */
export function desenharPainel(g, x, y, w, h, { cor = CORES.painel, borda = CORES.borda, raio = 10, sombra = true } = {}) {
  if (sombra) g.fillStyle(0x000000, 0.25).fillRoundedRect(x, y + 4, w, h, raio);
  g.fillStyle(borda, 1).fillRoundedRect(x, y, w, h, raio);
  g.fillStyle(cor, 1).fillRoundedRect(x + 2, y + 2, w - 4, h - 4, raio - 2);
}

/** Pisca uma borda amarela em volta de uma área para mostrar onde clicar */
export function piscarDestaque(cena, x, y, w, h, { vezes = 2, raio = 10 } = {}) {
  const g = cena.add.graphics().setDepth(960).setAlpha(0);
  g.fillStyle(CORES.destaque, 0.35).fillRoundedRect(x, y, w, h, raio);
  g.lineStyle(4, 0xffe08a, 1).strokeRoundedRect(x - 4, y - 4, w + 8, h + 8, raio + 4);
  cena.tweens.add({ targets: g, alpha: 1, duration: 200, hold: 180, yoyo: true, repeat: vezes - 1, onComplete: () => g.destroy() });
  return g;
}

/** Corta o texto com reticências até caber na largura (em pixels do jogo) */
export function truncarTexto(objetoTexto, larguraMaxima) {
  let texto = objetoTexto.text;
  while (objetoTexto.width > larguraMaxima && texto.length > 1) {
    texto = texto.slice(0, -1);
    objetoTexto.setText(`${texto.trimEnd()}…`);
  }
  return objetoTexto;
}

/** Diminui a fonte até o texto caber numa linha; abaixo do mínimo, corta com reticências */
export function encolherTexto(objetoTexto, larguraMaxima, tamanhoMinimo) {
  let tamanho = parseInt(objetoTexto.style.fontSize, 10);
  while (objetoTexto.width > larguraMaxima && tamanho > tamanhoMinimo) {
    tamanho -= 1;
    objetoTexto.setFontSize(tamanho);
  }
  return truncarTexto(objetoTexto, larguraMaxima);
}

/** Encaixa uma imagem dentro de uma caixa mantendo a proporção */
export function ajustarImagem(imagem, largura, altura) {
  const escala = Math.min(largura / imagem.width, altura / imagem.height);
  imagem.setScale(escala);
  return imagem;
}

/**
 * Botão com sombra, estado desabilitado e efeito de clique.
 * Container com: fundo (graphics) + texto.
 */
export class Botao extends Phaser.GameObjects.Container {
  constructor(cena, x, y, texto, aoClicar, { largura = 150, altura = 36, cor = CORES.painelClaro, corTexto = HEX.texto, tamanho = 14, id = null } = {}) {
    super(cena, x, y);
    this.largura = largura;
    this.altura = altura;
    this.cor = cor;
    this.id = id;
    this.aoClicar = aoClicar;
    this.habilitado = true;

    this.fundo = cena.add.graphics();
    this.rotulo = cena.add.text(0, 0, texto, estiloTexto(tamanho, corTexto, { align: 'center' })).setOrigin(0.5);
    this.add([this.fundo, this.rotulo]);
    this.desenhar();

    this.setSize(largura, altura);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => this.habilitado && this.desenhar(0.12));
    this.on('pointerout', () => this.desenhar());
    this.on('pointerdown', () => {
      if (!this.habilitado) return;
      this.rotulo.y = 2;
      this.desenhar(0, 2);
    });
    this.on('pointerup', () => {
      this.rotulo.y = 0;
      this.desenhar();
      somDa(cena).efeito(this.habilitado ? 'clique' : 'negar');
      if (this.habilitado) this.aoClicar();
    });
    cena.add.existing(this);
  }

  desenhar(clarear = 0, afundar = 0) {
    const { largura: w, altura: h } = this;
    const cor = this.habilitado ? Phaser.Display.Color.ValueToColor(this.cor).lighten(clarear * 100).color : 0x3a3f55;
    this.fundo.clear();
    if (!afundar) this.fundo.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2, -h / 2 + 3, w, h, 8);
    this.fundo.fillStyle(cor, 1).fillRoundedRect(-w / 2, -h / 2 + afundar, w, h, 8);
    this.fundo.fillStyle(0xffffff, this.habilitado ? 0.12 : 0.04).fillRoundedRect(-w / 2 + 3, -h / 2 + 2 + afundar, w - 6, h / 2 - 2, 6);
    this.rotulo.setAlpha(this.habilitado ? 1 : 0.45);
  }

  definirTexto(texto) {
    this.rotulo.setText(texto);
    return this;
  }

  habilitar(habilitado = true) {
    this.habilitado = habilitado;
    this.desenhar();
    return this;
  }

  piscar() {
    piscarDestaque(this.scene, this.x - this.largura / 2, this.y - this.altura / 2, this.largura, this.altura, { raio: 8 });
    return this;
  }
}

/** Mensagem flutuante no topo da área de trabalho */
export class Aviso {
  constructor(cena, x, y, largura) {
    this.cena = cena;
    this.container = cena.add.container(x, y).setDepth(900).setAlpha(0);
    this.fundo = cena.add.graphics();
    this.texto = cena.add.text(0, 0, '', estiloTexto(14, HEX.texto, { align: 'center', wordWrap: { width: largura - 32 } })).setOrigin(0.5);
    this.container.add([this.fundo, this.texto]);
    this.largura = largura;
  }

  mostrar(mensagem, tipo = 'info', duracao = 3200) {
    const cores = { info: CORES.info, erro: CORES.erro, sucesso: CORES.sucesso, aviso: CORES.aviso };
    this.texto.setText(mensagem);
    const h = Math.max(38, this.texto.height + 18);
    this.fundo.clear();
    this.fundo.fillStyle(0x000000, 0.4).fillRoundedRect(-this.largura / 2, -h / 2 + 3, this.largura, h, 10);
    this.fundo.fillStyle(0x12152a, 0.96).fillRoundedRect(-this.largura / 2, -h / 2, this.largura, h, 10);
    this.fundo.fillStyle(cores[tipo] || CORES.info, 1).fillRoundedRect(-this.largura / 2, -h / 2, 6, h, { tl: 10, bl: 10, tr: 0, br: 0 });

    this.cena.tweens.killTweensOf(this.container);
    this.container.setAlpha(0).setScale(0.96);
    this.cena.tweens.add({ targets: this.container, alpha: 1, scale: 1, duration: 160 });
    this.cena.tweens.add({ targets: this.container, alpha: 0, delay: duracao, duration: 400 });
  }
}

/** Seta que pula apontando para um alvo (tutorial) */
export class Ponteiro {
  constructor(cena) {
    this.cena = cena;
    this.g = cena.add.graphics().setDepth(950).setVisible(false);
    this.g.fillStyle(CORES.destaque, 1).fillTriangle(-12, -26, 12, -26, 0, -4);
    this.g.fillStyle(0x000000, 0.25).fillTriangle(-12, -22, 12, -22, 0, 0);
    this.g.fillStyle(CORES.destaque, 1).fillRect(-5, -44, 10, 20);
  }

  apontar(x, y) {
    this.cena.tweens.killTweensOf(this.g);
    this.g.setPosition(x, y).setVisible(true);
    this.cena.tweens.add({ targets: this.g, y: y - 10, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  esconder() {
    this.cena.tweens.killTweensOf(this.g);
    this.g.setVisible(false);
  }
}
