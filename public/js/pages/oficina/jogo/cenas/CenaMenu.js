import Phaser from '../phaser.js';
import { LARGURA, ALTURA, CORES, HEX, estiloTexto, prepararCamera } from '../constantes.js';
import { PEDIDOS } from '../../regras/pedidos.js';
import { Progresso } from '../Progresso.js';
import { Botao, desenharPainel } from '../ui/componentes.js';
import { desenharOficina } from '../ui/cenario.js';

/** Tela inicial: escolha do pedido, com estrelas e pedidos bloqueados. */
export class CenaMenu extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    prepararCamera(this);
    const progresso = new Progresso();
    desenharOficina(this, { alturaBancada: 70 });

    this.add.text(LARGURA / 2, 42, 'OFICINA DE PCs', estiloTexto(44, HEX.destaque, { stroke: '#12152a', strokeThickness: 8 })).setOrigin(0.5);
    this.add.text(LARGURA / 2, 86, 'Atenda os clientes e monte o computador perfeito para cada um', estiloTexto(16, HEX.texto, { stroke: '#12152a', strokeThickness: 5 })).setOrigin(0.5);

    this.moedas(progresso.moedas);

    const largura = 210;
    const espaco = 18;
    const inicio = (LARGURA - (PEDIDOS.length * largura + (PEDIDOS.length - 1) * espaco)) / 2;
    PEDIDOS.forEach((pedido, i) => this.cartao(inicio + i * (largura + espaco), 128, largura, 330, pedido, progresso));

    this.add
      .text(LARGURA / 2, ALTURA - 34, 'Use o mouse para arrastar as peças. Monte com calma: peça errada pode estragar!', estiloTexto(14, HEX.textoSuave))
      .setOrigin(0.5);
  }

  moedas(valor) {
    const g = this.add.graphics();
    desenharPainel(g, LARGURA - 150, 14, 136, 40, { raio: 12 });
    this.add.image(LARGURA - 128, 34, 'moeda').setScale(1.2);
    this.add.text(LARGURA - 110, 34, String(valor), estiloTexto(20, HEX.destaque)).setOrigin(0, 0.5);
  }

  cartao(x, y, w, h, pedido, progresso) {
    const liberado = progresso.liberado(pedido.id);
    const g = this.add.graphics();
    desenharPainel(g, x, y, w, h, { cor: liberado ? CORES.painel : 0x262b42, raio: 14 });

    if (pedido.tutorial) {
      g.fillStyle(CORES.destaque, 1).fillRoundedRect(x + w - 88, y - 10, 80, 22, 8);
      this.add.text(x + w - 48, y + 1, 'TUTORIAL', estiloTexto(12, '#1b2033')).setOrigin(0.5);
    }

    const avatar = this.add.image(x + w / 2, y + 52, pedido.avatar).setDisplaySize(72, 72);
    this.add.text(x + w / 2, y + 102, pedido.cliente, estiloTexto(18)).setOrigin(0.5);
    const fala = pedido.fala.length > 95 ? `${pedido.fala.slice(0, 92).trimEnd()}…` : pedido.fala;
    this.add.text(x + 14, y + 124, `"${fala}"`, estiloTexto(13, HEX.textoSuave, { wordWrap: { width: w - 28 }, lineSpacing: 3 }));

    const estrelas = progresso.estrelasDe(pedido.id);
    for (let i = 0; i < 3; i++) {
      this.add.image(x + w / 2 + (i - 1) * 32, y + h - 78, i < estrelas ? 'estrela' : 'estrela-vazia');
    }

    if (liberado) {
      new Botao(this, x + w / 2, y + h - 32, estrelas ? 'Jogar de novo' : pedido.tutorial ? 'Começar' : 'Atender', () => {
        this.scene.start('oficina', { idPedido: pedido.id });
      }, { largura: w - 36, cor: estrelas ? CORES.painelClaro : 0x2f9e5b, tamanho: 16 });
    } else {
      avatar.setTint(0x555a70);
      this.add.text(x + w / 2, y + h - 32, '🔒 Termine o anterior', estiloTexto(13, HEX.textoSuave)).setOrigin(0.5);
    }
  }
}
