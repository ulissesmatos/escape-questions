import Phaser from '../phaser.js';
import { LARGURA, CORES, HEX, estiloTexto, prepararCamera, pontoNoMundo } from '../constantes.js';
import { peca as buscarPeca } from '../../regras/catalogo.js';
import { Montagem } from '../../regras/Montagem.js';
import { SimuladorTeste } from '../../regras/SimuladorTeste.js';
import { PEDIDOS, AvaliadorPedido } from '../../regras/pedidos.js';
import { Progresso } from '../Progresso.js';
import { Tutorial } from '../Tutorial.js';
import { desenharOficina } from '../ui/cenario.js';
import { Botao, Aviso, desenharPainel } from '../ui/componentes.js';
import { Bandeja, tamanhoFantasma } from '../ui/Bandeja.js';
import { CartaoPedido } from '../ui/CartaoPedido.js';
import { VistaPlaca } from '../vistas/VistaPlaca.js';
import { VistaGabinete } from '../vistas/VistaGabinete.js';
import { AlinharProcessador, AplicarPasta, ParafusarCooler, ConectarCabos } from '../skills/skills.js';
import { TelaTeste, TelaResultado } from '../telas/telas.js';

const CARTAO = new Phaser.Geom.Rectangle(8, 44, 214, 488);
const BANCADA = new Phaser.Geom.Rectangle(230, 44, 474, 434);
const AREA_VISTA = { x: 246, y: 96, w: 442, h: 372 };
const BANDEJA = new Phaser.Geom.Rectangle(712, 44, 240, 488);

/**
 * A bancada: junta o pedido, a bandeja de peças, as vistas (placa-mãe e
 * gabinete), os skill checks, o teste e a avaliação. As regras ficam em
 * Montagem/SimuladorTeste/AvaliadorPedido — aqui é só interação e desenho.
 */
export class CenaOficina extends Phaser.Scene {
  constructor() {
    super('oficina');
  }

  // A mesma instância da cena é reaproveitada a cada pedido: tudo que é por
  // pedido precisa ser zerado aqui (senão o tutorial anterior continua ativo)
  init({ idPedido }) {
    this.pedido = PEDIDOS.find((p) => p.id === idPedido) || PEDIDOS[0];
    this.montagem = new Montagem();
    this.progresso = new Progresso();
    this.vistaAtual = 'placa';
    this.arraste = null;
    this.fantasma = null;
    this.skillAtual = null;
    this.tutorial = null;
    this.ocupado = false;
    this.testou = false;
    this.botoes = new Map();
    this.zonas = [];
    this.pecasVista = [];
  }

  create() {
    prepararCamera(this);
    desenharOficina(this, { alturaBancada: 60 });
    this.desenharHud();
    this.cartao = new CartaoPedido(this, CARTAO, this.pedido);

    const g = this.add.graphics();
    desenharPainel(g, BANCADA.x, BANCADA.y, BANCADA.width, BANCADA.height, { cor: CORES.tapete, raio: 12 });
    g.lineStyle(1, 0x4a5779, 0.5);
    for (let x = BANCADA.x + 20; x < BANCADA.right; x += 24) g.lineBetween(x, BANCADA.y + 46, x, BANCADA.bottom - 6);
    for (let y = BANCADA.y + 46; y < BANCADA.bottom; y += 24) g.lineBetween(BANCADA.x + 6, y, BANCADA.right - 6, y);

    // No tutorial a faixa de baixo da bancada fica reservada para o balão de instruções
    const area = this.pedido.tutorial ? { ...AREA_VISTA, h: AREA_VISTA.h - 92 } : AREA_VISTA;
    this.vistas = { placa: new VistaPlaca(this, area), gabinete: new VistaGabinete(this, area) };
    this.camadaVista = this.add.container(0, 0).setDepth(10);
    this.camadaZonas = this.add.graphics().setDepth(800);
    this.camadaDebug = this.add.graphics().setDepth(801);
    this.criarAbas();
    this.criarBotoesDeAcao();

    this.bandeja = new Bandeja(this, BANDEJA, {
      aoIniciarArraste: (id, ponteiro, info) => this.iniciarArraste(id, ponteiro, info),
      aoArrastar: (ponteiro) => this.aoArrastar(ponteiro),
      aoSoltar: (ponteiro) => this.aoSoltar(ponteiro),
      podeArrastar: (id) => this.podeArrastar(id),
      podeRolar: () => !this.ocupado,
      aoMudarCategoria: () => this.tutorial && this.tutorial.atualizar(),
    });

    // Avisos no rodapé da bancada (no tutorial, no topo, porque o rodapé é do balão)
    this.aviso = new Aviso(this, BANCADA.centerX, this.pedido.tutorial ? BANCADA.y + 70 : BANCADA.bottom - 30, BANCADA.width - 40);
    if (this.pedido.tutorial) this.tutorial = new Tutorial(this, BANCADA.centerX, BANCADA.bottom - 8, BANCADA.width - 24);

    this.bandeja.selecionar('placa_mae');
    this.redesenhar();
    if (!this.pedido.tutorial) this.aviso.mostrar(`Novo pedido de ${this.pedido.cliente}! Leia o que o cliente quer antes de escolher as peças.`, 'info', 4000);
  }

  // ---------------- Interface fixa ----------------

  desenharHud() {
    const g = this.add.graphics();
    g.fillStyle(0x12152a, 0.92).fillRect(0, 0, LARGURA, 36);
    this.add.text(12, 18, '🔧 OFICINA DE PCs', estiloTexto(16, HEX.destaque)).setOrigin(0, 0.5);
    this.add.text(LARGURA / 2, 18, `Pedido: ${this.pedido.cliente}`, estiloTexto(15)).setOrigin(0.5);
    this.add.image(LARGURA - 170, 18, 'moeda');
    this.textoMoedas = this.add.text(LARGURA - 156, 18, String(this.progresso.moedas), estiloTexto(15, HEX.destaque)).setOrigin(0, 0.5);
    new Botao(this, LARGURA - 56, 18, '☰ Menu', () => this.scene.start('menu'), { largura: 90, altura: 26, tamanho: 13 });
  }

  criarAbas() {
    const y = BANCADA.y + 24;
    this.abas = {
      placa: new Botao(this, BANCADA.x + 90, y, '🧩 Placa-mãe', () => this.trocarVista('placa'), { largura: 150, altura: 30, tamanho: 13 }),
      gabinete: new Botao(this, BANCADA.x + 250, y, '🖥️ Gabinete', () => this.trocarVista('gabinete'), { largura: 150, altura: 30, tamanho: 13 }),
    };
  }

  criarBotoesDeAcao() {
    const y = BANCADA.bottom + 28;
    const definicoes = [
      ['placa-gabinete', 'Placa → gabinete', () => this.alternarPlacaNoGabinete(), 124],
      ['cabos', '🔌 Ligar cabos', () => this.ligarCabos(), 112],
      ['tampa', 'Fechar tampa', () => this.alternarTampa(), 112],
      ['testar', '⚡ Ligar e testar', () => this.testar(), 118, 0x2f9e5b],
    ];
    let x = BANCADA.x;
    for (const [id, texto, acao, largura, cor] of definicoes) {
      const botao = new Botao(this, x + largura / 2, y, texto, () => this.clicarBotao(id, acao), { largura, altura: 40, tamanho: 13, cor: cor || CORES.painelClaro, id });
      this.botoes.set(id, botao);
      x += largura + (BANCADA.width - 466) / 3;
    }
  }

  clicarBotao(id, acao) {
    if (this.ocupado) return;
    if (this.tutorial && !this.tutorial.permiteBotao(id)) {
      this.aviso.mostrar(this.tutorial.lembrete, 'aviso');
      return;
    }
    acao();
  }

  atualizarBotoes() {
    const m = this.montagem;
    const { estado } = m;
    this.botoes.get('placa-gabinete').definirTexto(estado.placaNoGabinete ? 'Tirar placa' : 'Placa → gabinete').habilitar(Boolean(m.placa() && m.gabinete()));
    this.botoes.get('cabos').habilitar(Boolean(m.fonte()) && !estado.tampaFechada);
    this.botoes.get('tampa').definirTexto(estado.tampaFechada ? 'Abrir tampa' : 'Fechar tampa').habilitar(Boolean(m.gabinete()));
    for (const [id, aba] of Object.entries(this.abas)) {
      aba.cor = id === this.vistaAtual ? 0x5a4fcf : CORES.painelClaro;
      aba.desenhar();
    }
  }

  trocarVista(vista) {
    if (this.vistaAtual === vista) return;
    this.vistaAtual = vista;
    this.redesenhar();
  }

  // ---------------- Desenho ----------------

  redesenhar() {
    this.camadaVista.removeAll(true);
    const { zonas, pecas } = this.vistas[this.vistaAtual].desenhar(this.camadaVista, this.montagem);
    this.zonas = zonas;
    this.pecasVista = pecas;
    for (const { encaixe, objeto } of pecas) this.tornarArrastavel(objeto, encaixe);

    this.cartao.atualizar(this.montagem);
    this.atualizarBotoes();
    this.desenharDebug();
    if (this.tutorial) this.tutorial.atualizar();
  }

  tornarArrastavel(objeto, encaixe) {
    objeto.setInteractive({ draggable: true, cursor: 'grab' });
    objeto.on('dragstart', (ponteiro) => {
      if (this.ocupado) return;
      const idPeca = this.montagem.estado.pecas[encaixe];
      if (!idPeca) return;
      objeto.setAlpha(0.35);
      this.iniciarArraste(idPeca, ponteiro, { origem: 'encaixe', encaixe });
    });
    objeto.on('drag', (ponteiro) => this.arraste && this.aoArrastar(ponteiro));
    objeto.on('dragend', (ponteiro) => {
      if (!this.arraste) return;
      objeto.setAlpha(1);
      this.aoSoltar(ponteiro);
    });
  }

  desenharZonas(ponteiro) {
    const g = this.camadaZonas;
    g.clear();
    if (!this.arraste) return;
    const { x, y } = pontoNoMundo(this, ponteiro);
    const tempo = this.time.now / 180;
    for (const zona of this.zonasValidas()) {
      const sobre = zona.ret.contains(x, y);
      g.fillStyle(CORES.sucesso, sobre ? 0.35 : 0.12 + Math.sin(tempo) * 0.05).fillRect(zona.ret.x, zona.ret.y, zona.ret.width, zona.ret.height);
      g.lineStyle(sobre ? 3 : 2, CORES.sucesso, 1).strokeRect(zona.ret.x, zona.ret.y, zona.ret.width, zona.ret.height);
    }
    if (this.arraste.origem === 'encaixe') {
      g.lineStyle(3, CORES.erro, this.bandeja.contem(x, y) ? 1 : 0.4).strokeRoundedRect(BANDEJA.x + 4, BANDEJA.y + 4, BANDEJA.width - 8, BANDEJA.height - 8, 12);
    }
  }

  desenharDebug() {
    if (!this.registry.get('mostrarZonas')) return;
    const g = this.camadaDebug;
    g.clear().lineStyle(1, 0xff00ff, 1);
    for (const z of this.zonas) g.strokeRect(z.ret.x, z.ret.y, z.ret.width, z.ret.height);
  }

  // ---------------- Arrastar e soltar ----------------

  podeArrastar(idPeca) {
    if (this.ocupado) return false;
    if (this.tutorial && !this.tutorial.permiteArrastar(idPeca)) {
      this.aviso.mostrar(this.tutorial.lembrete, 'aviso');
      return false;
    }
    return true;
  }

  zonasValidas() {
    if (!this.arraste) return [];
    return this.zonas.filter((z) => this.arraste.validos.has(z.encaixe));
  }

  centroZonaValida() {
    const zona = this.zonasValidas()[0];
    return zona ? { x: zona.ret.centerX, y: zona.ret.centerY - 10 } : null;
  }

  /** Centro de uma peça já instalada, se ela aparece na vista atual */
  centroPecaInstalada(encaixe) {
    const item = this.pecasVista.find((p) => p.encaixe === encaixe);
    if (!item) return null;
    const limites = item.objeto.getBounds();
    return { x: limites.centerX, y: limites.centerY };
  }

  iniciarArraste(idPeca, ponteiro, { origem, encaixe = null }) {
    const p = buscarPeca(idPeca);
    const validos = new Set(this.montagem.encaixesPara(idPeca).map((e) => e.id));
    if (idPeca === 'pasta-termica') validos.add('pasta');
    this.arraste = { idPeca, origem, encaixe, validos };

    // Se a peça só encaixa na outra vista, troca de vista automaticamente
    if (origem === 'bandeja' && !this.zonasValidas().length) {
      const outra = this.vistaAtual === 'placa' ? 'gabinete' : 'placa';
      if ([...validos].some((id) => this.montagem.encaixe(id).vista === outra)) this.trocarVista(outra);
    }

    const { largura, altura } = tamanhoFantasma(p.sprite);
    const { x, y } = pontoNoMundo(this, ponteiro);
    this.fantasma = this.add.image(x, y, p.sprite).setDisplaySize(largura, altura).setDepth(850).setAlpha(0.92);
    this.desenharZonas(ponteiro);
    if (this.tutorial) this.tutorial.apontar();
  }

  aoArrastar(ponteiro) {
    if (!this.arraste || !this.fantasma) return;
    const { x, y } = pontoNoMundo(this, ponteiro);
    this.fantasma.setPosition(x, y);
    this.desenharZonas(ponteiro);
  }

  async aoSoltar(ponteiro) {
    if (!this.arraste) return;
    const arraste = this.arraste;
    const { x, y } = pontoNoMundo(this, ponteiro);
    const zona = this.zonasValidas().find((z) => z.ret.contains(x, y));
    this.arraste = null;
    if (this.fantasma) this.fantasma.destroy();
    this.fantasma = null;
    this.camadaZonas.clear();

    if (arraste.origem === 'encaixe') {
      if (this.bandeja.contem(x, y)) {
        const r = this.montagem.remover(arraste.encaixe);
        this.aviso.mostrar(r.status === 'ok' ? (r.estragada ? r.mensagem : `${buscarPeca(r.idPeca).nome} devolvida à bandeja.`) : r.mensagem, r.status === 'ok' ? (r.estragada ? 'aviso' : 'info') : 'erro');
      } else if (zona && zona.encaixe !== arraste.encaixe) {
        const r = this.montagem.remover(arraste.encaixe);
        if (r.status === 'ok') await this.soltarEm(zona, arraste.idPeca);
        else this.aviso.mostrar(r.mensagem, 'erro');
      }
      this.redesenhar();
      return;
    }

    if (zona) await this.soltarEm(zona, arraste.idPeca);
    else if (!this.bandeja.contem(x, y)) this.explicarSemEncaixe(arraste.idPeca);
    this.redesenhar();
  }

  /** Soltou fora de um encaixe: explica o que falta montar antes e pisca onde encontrar */
  explicarSemEncaixe(idPeca) {
    const pendencia = this.montagem.pendenciaPara(idPeca);
    if (!pendencia) {
      this.aviso.mostrar('Solte a peça em um lugar destacado em verde.', 'aviso', 2200);
      return;
    }
    this.aviso.mostrar(pendencia.mensagem, 'aviso', 4500);
    const { alvo } = pendencia;
    if (alvo && alvo.categoria) {
      this.bandeja.selecionar(alvo.categoria);
      this.bandeja.destacarCategoria(alvo.categoria);
    }
    if (alvo && alvo.botao) this.botoes.get(alvo.botao).piscar();
  }

  async soltarEm(zona, idPeca) {
    let resultado = this.montagem.tentar(zona.encaixe, idPeca);

    if (resultado.status === 'skill') {
      this.ocupado = true;
      if (this.tutorial) this.tutorial.atualizar();
      this.skillAtual = this.criarSkill(resultado.skill, idPeca);
      const saida = await this.skillAtual.abrir();
      this.skillAtual = null;
      this.ocupado = false;
      if (saida === null) {
        this.aviso.mostrar('Cancelado: a peça voltou para a bandeja.', 'info');
        return;
      }
      resultado = this.montagem.concluir(zona.encaixe, idPeca, saida);
    }

    if (resultado.status === 'ok') {
      this.efeitoEncaixe(zona.ret.centerX, zona.ret.centerY);
      this.aviso.mostrar(resultado.mensagem, 'sucesso', 2000);
    } else if (resultado.status === 'dano') {
      this.efeitoDano(zona.ret.centerX, zona.ret.centerY);
      this.aviso.mostrar(resultado.mensagem, 'erro', 5000);
    } else {
      this.cameras.main.shake(120, 0.003);
      this.aviso.mostrar(resultado.mensagem, 'erro', 4000);
    }
  }

  criarSkill(nome, idPeca) {
    const skills = {
      alinhar_cpu: () => new AlinharProcessador(this, buscarPeca(idPeca)),
      pasta: () => new AplicarPasta(this, this.montagem.processador()),
      parafusos: () => new ParafusarCooler(this, buscarPeca(idPeca)),
    };
    return skills[nome]();
  }

  efeitoEncaixe(x, y) {
    const particulas = this.add.particles(x, y, 'faisca', {
      speed: { min: 40, max: 140 },
      lifespan: 380,
      scale: { start: 1.2, end: 0 },
      tint: [0xffc94a, 0xffffff],
      emitting: false,
    }).setDepth(860);
    particulas.explode(14);
    this.time.delayedCall(600, () => particulas.destroy());
  }

  efeitoDano(x, y) {
    this.cameras.main.shake(320, 0.012);
    const flash = this.add.rectangle(LARGURA / 2, 270, LARGURA, 540, CORES.erro, 0.35).setDepth(870);
    this.tweens.add({ targets: flash, alpha: 0, duration: 450, onComplete: () => flash.destroy() });
    const particulas = this.add.particles(x, y, 'faisca', {
      speed: { min: 80, max: 220 },
      lifespan: 520,
      scale: { start: 1.6, end: 0 },
      tint: [0xff5a36, 0xffc94a],
      emitting: false,
    }).setDepth(860);
    particulas.explode(26);
    this.time.delayedCall(700, () => particulas.destroy());
  }

  // ---------------- Ações ----------------

  alternarPlacaNoGabinete() {
    const m = this.montagem;
    const r = m.estado.placaNoGabinete ? m.retirarPlacaDoGabinete() : m.colocarPlacaNoGabinete();
    this.aviso.mostrar(r.mensagem, r.status === 'ok' ? 'sucesso' : 'erro');
    if (r.status === 'ok') this.vistaAtual = m.estado.placaNoGabinete ? 'gabinete' : 'placa';
    this.redesenhar();
  }

  async ligarCabos() {
    this.ocupado = true;
    this.redesenhar();
    this.skillAtual = new ConectarCabos(this, this.montagem);
    const resultado = await this.skillAtual.abrir();
    this.skillAtual = null;
    this.ocupado = false;
    if (resultado) {
      this.montagem.conectarCabos(resultado);
      this.vistaAtual = 'gabinete';
    }
    this.redesenhar();
  }

  alternarTampa() {
    const m = this.montagem;
    const r = m.estado.tampaFechada ? m.abrirTampa() : m.fecharTampa();
    if (r.status === 'ok' && m.estado.tampaFechada) this.vistaAtual = 'gabinete';
    this.aviso.mostrar(r.mensagem, r.status === 'ok' ? 'info' : 'erro', 1800);
    this.redesenhar();
  }

  async testar() {
    const m = this.montagem;
    if (m.gabinete() && !m.estado.tampaFechada) {
      this.aviso.mostrar('Feche a tampa do gabinete antes de ligar o computador.', 'aviso');
      return;
    }
    this.ocupado = true;
    this.testou = true;
    if (this.tutorial) this.tutorial.atualizar();

    const teste = SimuladorTeste.executar(m);
    await new TelaTeste(this).executar(teste, m);

    const avaliacao = AvaliadorPedido.avaliar(this.pedido, m, teste);
    if (avaliacao.estrelas > 0) {
      avaliacao.moedas = this.progresso.registrar(this.pedido.id, avaliacao);
      this.textoMoedas.setText(String(this.progresso.moedas));
    }
    const proximo = this.progresso.proximoPedido(this.pedido.id);

    new TelaResultado(this).mostrar(avaliacao, {
      temProximo: Boolean(proximo && this.progresso.liberado(proximo.id)),
      aoConsertar: () => {
        this.ocupado = false;
        m.abrirTampa();
        this.redesenhar();
      },
      aoProximo: () => this.scene.restart({ idPedido: proximo.id }),
      aoMenu: () => this.scene.start('menu'),
    });
  }

  update() {
    if (this.arraste) this.desenharZonas(this.input.activePointer);
  }
}
