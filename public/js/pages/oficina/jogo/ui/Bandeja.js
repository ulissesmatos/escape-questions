import Phaser from '../phaser.js';
import { CORES, HEX, estiloTexto, pontoNoMundo } from '../constantes.js';
import { SPRITES } from '../sprites/manifesto.js';
import { CATEGORIAS, pecasDaCategoria, formatarPreco } from '../../regras/catalogo.js';
import { desenharPainel, ajustarImagem, piscarDestaque, truncarTexto, encolherTexto } from './componentes.js';
import { somDa } from '../audio/SomDaOficina.js';

const ICONES = {
  placa_mae: 'placa-atx',
  cpu: 'cpu-am5',
  cooler: 'cooler-box',
  ram: 'ram-ddr5',
  armazenamento: 'ssd-m2',
  gpu: 'gpu-2',
  fonte: 'fonte',
  gabinete: 'gabinete-mid',
  ferramenta: 'pasta',
};

const COLUNAS = 3;
const ALTURA_CATEGORIA = 48;
const PASSO_CATEGORIA = 52;
const ALTURA_CARTAO = 86;
const ESPACO_CARTAO = 6;
const LARGURA_BARRA = 6;

/**
 * Bandeja de peças à direita: categorias em grade + lista rolável de peças da
 * categoria. Os cartões de peça são arrastáveis; quem trata o arraste é a cena
 * (via callbacks aoIniciarArraste / aoArrastar / aoSoltar).
 */
export class Bandeja {
  constructor(cena, ret, { aoIniciarArraste, aoArrastar, aoSoltar, podeArrastar = () => true, podeRolar = () => true, aoMudarCategoria = () => {} }) {
    this.cena = cena;
    this.ret = ret;
    this.callbacks = { aoIniciarArraste, aoArrastar, aoSoltar, podeArrastar, podeRolar, aoMudarCategoria };
    this.categoria = null;
    this.botoesCategoria = new Map();
    this.cartoes = new Map();
    this.rolagem = 0;
    this.alturaConteudo = 0;

    const g = cena.add.graphics();
    desenharPainel(g, ret.x, ret.y, ret.width, ret.height, { raio: 12 });
    cena.add.text(ret.x + 14, ret.y + 10, 'Peças', estiloTexto(16, HEX.destaque));
    this.dica = cena.add.text(ret.right - 12, ret.y + 13, 'arraste →', estiloTexto(12, HEX.textoSuave)).setOrigin(1, 0);
    this.montarCategorias();

    const topoLista = ret.y + 36 + Math.ceil(CATEGORIAS.length / COLUNAS) * PASSO_CATEGORIA;
    this.areaLista = new Phaser.Geom.Rectangle(ret.x + 6, topoLista, ret.width - 12, ret.bottom - 8 - topoLista);
    this.lista = cena.add.container(0, this.areaLista.y);
    this.recortarLista();
    this.barra = this.criarBarra();
    this.tooltip = this.criarTooltip();
    this.escutarRodaDoMouse();
  }

  montarCategorias() {
    const tamanho = (this.ret.width - 28) / COLUNAS;
    CATEGORIAS.forEach((cat, i) => {
      const x = this.ret.x + 14 + (i % COLUNAS) * tamanho;
      const y = this.ret.y + 36 + Math.floor(i / COLUNAS) * PASSO_CATEGORIA;
      const botao = this.cena.add.container(x, y);
      const fundo = this.cena.add.graphics();
      const icone = ajustarImagem(this.cena.add.image(tamanho / 2 - 2, 18, ICONES[cat.id]), tamanho - 26, 26);
      const nome = encolherTexto(this.cena.add.text(tamanho / 2 - 2, 40, cat.curto, estiloTexto(11, HEX.textoSuave)).setOrigin(0.5), tamanho - 10, 9);
      // Zone com origem no canto: a área de clique bate com o desenho (em containers o hit area é centralizado)
      const area = this.cena.add.zone(0, 0, tamanho - 4, ALTURA_CATEGORIA).setOrigin(0).setInteractive({ useHandCursor: true });
      botao.add([fundo, icone, nome, area]);
      botao.setSize(tamanho - 4, ALTURA_CATEGORIA);
      area.on('pointerup', () => {
        somDa(this.cena).efeito('aba');
        this.selecionar(cat.id);
      });
      botao.desenhar = (ativo) => {
        fundo.clear();
        fundo.fillStyle(ativo ? CORES.destaque : CORES.painelClaro, ativo ? 0.25 : 0.6).fillRoundedRect(0, 0, tamanho - 4, ALTURA_CATEGORIA, 8);
        if (ativo) fundo.lineStyle(2, CORES.destaque, 1).strokeRoundedRect(0, 0, tamanho - 4, ALTURA_CATEGORIA, 8);
        nome.setColor(ativo ? HEX.destaque : HEX.textoSuave);
      };
      botao.desenhar(false);
      this.botoesCategoria.set(cat.id, botao);
    });
  }

  /** Posição (centro) do botão de categoria — usado pelo tutorial */
  posicaoCategoria(id) {
    const b = this.botoesCategoria.get(id);
    return b ? { x: b.x + b.width / 2, y: b.y + ALTURA_CATEGORIA / 2 } : null;
  }

  /** Ponto "pegável" do cartão de uma peça; rola a lista se ele estiver escondido */
  posicaoPeca(id) {
    const cartao = this.cartoes.get(id);
    if (!cartao) return null;
    this.mostrarCartao(cartao);
    return { x: cartao.x + 30, y: this.lista.y + cartao.y + ALTURA_CARTAO / 2 };
  }

  centroLista() {
    return { x: this.areaLista.centerX, y: this.areaLista.centerY };
  }

  /** Pisca a categoria em amarelo para mostrar onde clicar */
  destacarCategoria(id) {
    const b = this.botoesCategoria.get(id);
    if (b) piscarDestaque(this.cena, b.x, b.y, b.width, ALTURA_CATEGORIA, { raio: 8 });
  }

  selecionar(idCategoria) {
    this.categoria = idCategoria;
    for (const [id, botao] of this.botoesCategoria) botao.desenhar(id === idCategoria);
    this.montarLista();
    this.callbacks.aoMudarCategoria(idCategoria);
  }

  montarLista() {
    this.lista.removeAll(true);
    this.cartoes.clear();
    const pecas = pecasDaCategoria(this.categoria);
    const largura = this.ret.width - 38;
    pecas.forEach((peca, i) => {
      const cartao = this.criarCartao(peca, this.ret.x + 10, 4 + i * (ALTURA_CARTAO + ESPACO_CARTAO), largura);
      this.lista.add(cartao);
      this.cartoes.set(peca.id, cartao);
    });
    this.alturaConteudo = 8 + pecas.length * (ALTURA_CARTAO + ESPACO_CARTAO) - ESPACO_CARTAO;
    this.rolarPara(0);
  }

  criarCartao(peca, x, y, largura) {
    const altura = ALTURA_CARTAO;
    const cartao = this.cena.add.container(x, y);
    const fundo = this.cena.add.graphics();
    const desenharFundo = (destaque) => {
      fundo.clear();
      fundo.fillStyle(destaque ? CORES.painelClaro : 0x323a5c, 1).fillRoundedRect(0, 0, largura, altura, 10);
      fundo.lineStyle(2, destaque ? CORES.destaque : CORES.borda, 1).strokeRoundedRect(0, 0, largura, altura, 10);
    };
    desenharFundo(false);

    const miniatura = ajustarImagem(this.cena.add.image(32, altura / 2, peca.sprite), 48, 54);
    // Três linhas: nome (até 2 linhas), resumo técnico e preço
    const nome = this.cena.add.text(62, 7, peca.nome, estiloTexto(13, HEX.texto, { wordWrap: { width: largura - 68 }, lineSpacing: 1 }));
    const preco = this.cena.add.text(largura - 8, altura - 6, peca.ferramenta ? 'Grátis' : formatarPreco(peca.preco), estiloTexto(13, HEX.destaque)).setOrigin(1, 1);
    // No processador, o resumo diz se tem vídeo integrado (verde) ou não (amarelo)
    const corResumo = peca.categoria === 'cpu' ? (peca.videoIntegrado ? HEX.sucesso : HEX.aviso) : HEX.textoSuave;
    const detalhe = this.cena.add.text(62, altura - 24, peca.resumo || peca.detalhes[0], estiloTexto(11, corResumo)).setOrigin(0, 1);
    truncarTexto(detalhe, largura - 68);

    // A área só responde na parte visível da lista (o resto está escondido pela rolagem)
    const visivel = (hitArea, hx, hy) => Phaser.Geom.Rectangle.Contains(hitArea, hx, hy) && this.areaLista.contains(cartao.x + hx, this.lista.y + cartao.y + hy);
    const area = this.cena.add.zone(0, 0, largura, altura).setOrigin(0).setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, largura, altura),
      hitAreaCallback: visivel,
      cursor: 'grab',
      draggable: true,
    });
    cartao.add([fundo, miniatura, nome, detalhe, preco, area]);
    cartao.setSize(largura, altura);

    area.on('pointerover', () => {
      desenharFundo(true);
      this.mostrarTooltip(peca, this.lista.y + cartao.y);
    });
    area.on('pointerout', () => {
      desenharFundo(false);
      this.tooltip.setVisible(false);
    });
    area.on('dragstart', (ponteiro) => {
      this.tooltip.setVisible(false);
      cartao.arrasteBloqueado = !this.callbacks.podeArrastar(peca.id);
      if (!cartao.arrasteBloqueado) this.callbacks.aoIniciarArraste(peca.id, ponteiro, { origem: 'bandeja' });
    });
    area.on('drag', (ponteiro) => !cartao.arrasteBloqueado && this.callbacks.aoArrastar(ponteiro));
    area.on('dragend', (ponteiro) => !cartao.arrasteBloqueado && this.callbacks.aoSoltar(ponteiro));
    return cartao;
  }

  // ---------------- Rolagem ----------------

  get rolagemMaxima() {
    return Math.max(0, this.alturaConteudo - this.areaLista.height);
  }

  rolarPara(valor) {
    this.rolagem = Phaser.Math.Clamp(Math.round(valor), 0, this.rolagemMaxima);
    this.lista.y = this.areaLista.y - this.rolagem;
    this.tooltip.setVisible(false);
    this.desenharBarra();
  }

  mostrarCartao(cartao) {
    const { height } = this.areaLista;
    if (cartao.y - 4 < this.rolagem) this.rolarPara(cartao.y - 4);
    else if (cartao.y + ALTURA_CARTAO + 4 > this.rolagem + height) this.rolarPara(cartao.y + ALTURA_CARTAO + 4 - height);
  }

  /** Esconde o que passar para fora da área da lista */
  recortarLista() {
    if (!this.lista.enableFilters().filters) return; // renderizador Canvas: sem recorte
    const a = this.areaLista;
    const forma = this.cena.add.rectangle(a.centerX, a.centerY, a.width, a.height, 0xffffff);
    this.cena.children.remove(forma);
    this.lista.filters.external.addMask(forma);
    this.cena.events.once('shutdown', () => forma.destroy());
  }

  criarBarra() {
    const a = this.areaLista;
    const x = this.ret.right - 9 - LARGURA_BARRA;
    const desenho = this.cena.add.graphics();
    const zona = this.cena.add.zone(x - 8, a.y, LARGURA_BARRA + 16, a.height).setOrigin(0).setInteractive({ draggable: true, useHandCursor: true });
    const arrastar = (ponteiro) => {
      const { y } = pontoNoMundo(this.cena, ponteiro);
      const altura = this.alturaAlca();
      this.rolarPara(((y - a.y - altura / 2) / (a.height - altura)) * this.rolagemMaxima);
    };
    zona.on('pointerdown', arrastar);
    zona.on('drag', arrastar);
    return { x, desenho, zona };
  }

  alturaAlca() {
    const { height } = this.areaLista;
    return Math.max(32, height * (height / Math.max(this.alturaConteudo, height)));
  }

  desenharBarra() {
    const { x, desenho, zona } = this.barra;
    const a = this.areaLista;
    const maxima = this.rolagemMaxima;
    desenho.clear();
    zona.input.enabled = maxima > 0;
    if (!maxima) return;
    const altura = this.alturaAlca();
    const y = a.y + (a.height - altura) * (this.rolagem / maxima);
    desenho.fillStyle(0x000000, 0.3).fillRoundedRect(x, a.y + 2, LARGURA_BARRA, a.height - 4, 3);
    desenho.fillStyle(0x8f98c7, 1).fillRoundedRect(x, y + 2, LARGURA_BARRA, altura - 4, 3);
  }

  /** Roda do mouse sobre a lista rola a lista (e não a página) */
  escutarRodaDoMouse() {
    const { canvas } = this.cena.game;
    const aoRodar = (evento) => {
      if (!this.rolagemMaxima || !this.callbacks.podeRolar()) return;
      const { scale } = this.cena;
      const { x, y } = pontoNoMundo(this.cena, { x: scale.transformX(evento.pageX), y: scale.transformY(evento.pageY) });
      if (!this.areaLista.contains(x, y)) return;
      evento.preventDefault();
      const delta = evento.deltaMode === 1 ? evento.deltaY * 16 : evento.deltaY;
      this.rolarPara(this.rolagem + Phaser.Math.Clamp(delta, -120, 120) * 0.5);
    };
    canvas.addEventListener('wheel', aoRodar, { passive: false });
    this.cena.events.once('shutdown', () => canvas.removeEventListener('wheel', aoRodar));
  }

  // ---------------- Detalhes ----------------

  criarTooltip() {
    // Acima do aviso da bancada (900), abaixo da seta do tutorial (950) e das janelas (1000)
    const container = this.cena.add.container(0, 0).setDepth(920).setVisible(false);
    container.fundo = this.cena.add.graphics();
    container.texto = this.cena.add.text(12, 10, '', estiloTexto(13, HEX.texto, { lineSpacing: 4 }));
    container.descricao = this.cena.add.text(12, 0, '', estiloTexto(12, HEX.destaque, { wordWrap: { width: 250 }, lineSpacing: 2 }));
    container.add([container.fundo, container.texto, container.descricao]);
    return container;
  }

  mostrarTooltip(peca, y) {
    const t = this.tooltip;
    t.texto.setText([peca.nome, ...peca.detalhes.map((d) => `• ${d}`)].join('\n'));
    t.descricao.setText(peca.descricao || '').setY(t.texto.height + 16).setVisible(Boolean(peca.descricao));
    const w = Math.max(t.texto.width, peca.descricao ? t.descricao.width : 0) + 24;
    const h = t.texto.height + (peca.descricao ? t.descricao.height + 8 : 0) + 20;
    t.fundo.clear();
    t.fundo.fillStyle(0x0f1224, 0.96).fillRoundedRect(0, 0, w, h, 8);
    t.fundo.lineStyle(2, CORES.destaque, 1).strokeRoundedRect(0, 0, w, h, 8);
    t.setPosition(this.ret.x - w - 8, Phaser.Math.Clamp(y, this.ret.y, this.ret.bottom - h)).setVisible(true);
  }

  contem(x, y) {
    return this.ret.contains(x, y);
  }
}

/** Tamanho padrão de exibição de uma peça (para o "fantasma" do arraste) */
export function tamanhoFantasma(sprite) {
  const { largura, altura } = SPRITES[sprite];
  const escala = Math.min(1, 150 / Math.max(largura, altura));
  return { largura: largura * escala, altura: altura * escala };
}
