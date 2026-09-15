import Phaser from '../phaser.js';
import { CORES, HEX, estiloTexto } from '../constantes.js';
import { Botao, ajustarImagem } from '../ui/componentes.js';
import { SkillCheck } from './SkillCheck.js';

/**
 * Alinhar o processador: gire até o triângulo dourado ficar no mesmo canto
 * da marca do socket. Encaixar virado entorta os pinos.
 */
export class AlinharProcessador extends SkillCheck {
  constructor(cena, peca) {
    super(cena, {
      titulo: 'Encaixe o processador',
      instrucao: 'Gire o processador até o triângulo dourado ficar no MESMO canto da marca dourada do socket. Depois clique em Encaixar.',
    });
    this.peca = peca;
    this.angulo = Phaser.Math.RND.pick([90, 180, 270]);
  }

  montar(c) {
    const socket = this.cena.add.graphics();
    socket.fillStyle(0x9aa3b5, 1).fillRect(-230, -90, 160, 160);
    socket.fillStyle(0x5b6475, 1).fillRect(-222, -82, 144, 144);
    for (let yy = -74; yy < 56; yy += 10) for (let xx = -214; xx < -84; xx += 10) socket.fillStyle(0xe8b64c, 1).fillRect(xx, yy, 3, 3);
    socket.fillStyle(0xffc94a, 1).fillTriangle(-226, 66, -226, 40, -200, 66);
    c.add([socket, this.cena.add.text(-150, 80, 'Socket', estiloTexto(13, HEX.textoSuave)).setOrigin(0.5)]);

    this.cpu = ajustarImagem(this.cena.add.image(120, -10, this.peca.sprite), 150, 150).setAngle(this.angulo);
    this.cpu.setInteractive({ useHandCursor: true }).on('pointerup', () => this.girar());
    c.add([this.cpu, this.cena.add.text(120, 80, 'Clique para girar', estiloTexto(13, HEX.textoSuave)).setOrigin(0.5)]);

    c.add(new Botao(this.cena, -90, 140, '⟲ Girar', () => this.girar(), { largura: 150 }));
    c.add(new Botao(this.cena, 90, 140, 'Encaixar ✓', () => this.encaixar(), { largura: 150, cor: 0x2f9e5b }));
  }

  girar() {
    if (this.encaixando) return;
    this.angulo = (this.angulo + 270) % 360;
    this.cena.tweens.add({ targets: this.cpu, angle: this.cpu.angle - 90, duration: 160 });
  }

  encaixar() {
    if (this.encaixando) return;
    this.encaixando = true;
    const alinhado = this.angulo % 360 === 0;
    this.cena.tweens.add({
      targets: this.cpu,
      x: -150,
      y: -10,
      scale: this.cpu.scale * 0.9,
      duration: 380,
      ease: 'Back.easeIn',
      onComplete: () => {
        if (alinhado) this.mensagem('Encaixou certinho! 👍', HEX.sucesso);
        else {
          this.mensagem('Estava virado... os pinos entortaram! 😱', HEX.erro);
          this.cena.cameras.main.shake(250, 0.01);
        }
        this.cena.time.delayedCall(900, () => this.concluir({ alinhado }));
      },
    });
  }
}

/** Aplicar pasta térmica: segure para apertar o tubo e solte na quantidade certa. */
export class AplicarPasta extends SkillCheck {
  static VELOCIDADE = 0.42; // fração por segundo

  constructor(cena, processador) {
    super(cena, {
      titulo: 'Passe a pasta térmica',
      instrucao: 'Segure o botão do mouse sobre o processador para apertar o tubo. Solte quando a barra estiver na faixa VERDE (um "grão de ervilha").',
    });
    this.processador = processador;
    this.quantidade = 0;
  }

  montar(c) {
    const area = this.cena.add.rectangle(-60, 0, 240, 240, 0x000000, 0).setInteractive({ useHandCursor: true });
    this.cpu = ajustarImagem(this.cena.add.image(-60, 0, this.processador.sprite), 190, 190);
    this.gota = this.cena.add.graphics();
    this.tubo = ajustarImagem(this.cena.add.image(-10, -120, 'pasta'), 110, 44).setAngle(-35);
    c.add([area, this.cpu, this.gota, this.tubo]);

    // Medidor vertical com as faixas
    const medidor = this.cena.add.graphics();
    const mx = 150;
    const my = -110;
    const mh = 220;
    medidor.fillStyle(0x1b2033, 1).fillRoundedRect(mx, my, 34, mh, 8);
    const faixa = (de, ate, cor) => medidor.fillStyle(cor, 0.5).fillRect(mx + 4, my + mh * (1 - ate), 26, mh * (ate - de));
    faixa(0, 0.2, CORES.aviso);
    faixa(0.2, 0.6, CORES.sucesso);
    faixa(0.6, 1, CORES.erro);
    this.nivel = this.cena.add.graphics();
    c.add([medidor, this.nivel, this.cena.add.text(mx + 17, my + mh + 16, 'Quantidade', estiloTexto(12, HEX.textoSuave)).setOrigin(0.5)]);
    this.medidor = { mx, my, mh };

    area.on('pointerdown', () => this.apertar());
    this.soltarGlobal = () => this.soltar();
    this.cena.input.on('pointerup', this.soltarGlobal);
    this.desenhar();
  }

  apertar() {
    if (this.terminou) return;
    this.apertando = true;
    this.cena.tweens.add({ targets: this.tubo, y: -80, duration: 120 });
    this.evento = this.cena.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        this.quantidade = Math.min(1, this.quantidade + AplicarPasta.VELOCIDADE * 0.03);
        this.desenhar();
      },
    });
  }

  soltar() {
    if (!this.apertando || this.terminou) return;
    this.apertando = false;
    this.terminou = true;
    this.evento.remove();
    const q = this.quantidade;
    const [texto, cor] = q < 0.2 ? ['Ficou pouca pasta...', HEX.aviso] : q > 0.6 ? ['Pasta demais! Vai escorrer.', HEX.erro] : ['Perfeito, um grão de ervilha! 👌', HEX.sucesso];
    this.mensagem(texto, cor);
    this.cena.time.delayedCall(900, () => this.concluir({ quantidade: q }));
  }

  desenhar() {
    const r = 6 + this.quantidade * 90;
    this.gota.clear();
    if (this.quantidade > 0) {
      this.gota.fillStyle(0xb8bfcc, 1).fillCircle(-60, 0, r);
      this.gota.fillStyle(0xdfe4ec, 1).fillCircle(-60 - r * 0.3, -r * 0.3, r * 0.35);
    }
    const { mx, my, mh } = this.medidor;
    this.nivel.clear();
    this.nivel.fillStyle(0xffffff, 1).fillRect(mx - 6, my + mh * (1 - this.quantidade) - 2, 46, 4);
  }

  aoFechar() {
    this.cena.input.off('pointerup', this.soltarGlobal);
    if (this.evento) this.evento.remove();
  }
}

/** Parafusar o cooler: 4 parafusos em X (cada um seguido do canto oposto). */
export class ParafusarCooler extends SkillCheck {
  constructor(cena, cooler) {
    super(cena, {
      titulo: 'Parafuse o cooler',
      instrucao: 'Aperte os 4 parafusos um de cada vez, em X: depois de um canto, aperte o canto OPOSTO (na diagonal). Assim a pressão fica igual.',
    });
    this.cooler = cooler;
    this.ordem = [];
  }

  montar(c) {
    c.add(ajustarImagem(this.cena.add.image(0, 0, this.cooler.sprite), 210, 210));
    const cantos = [[-95, -95], [95, -95], [-95, 95], [95, 95]]; // 0 sup-esq, 1 sup-dir, 2 inf-esq, 3 inf-dir
    cantos.forEach(([x, y], i) => {
      const parafuso = this.cena.add.container(x, y);
      const g = this.cena.add.graphics();
      g.fillStyle(0x5b6475, 1).fillCircle(0, 0, 18);
      g.fillStyle(0xd5dbe6, 1).fillCircle(0, 0, 14);
      g.lineStyle(4, 0x5b6475, 1).lineBetween(-8, 0, 8, 0).lineBetween(0, -8, 0, 8);
      const numero = this.cena.add.text(22, -22, '', estiloTexto(16, HEX.destaque, { stroke: '#12152a', strokeThickness: 4 })).setOrigin(0.5);
      parafuso.add([g, numero]);
      parafuso.setSize(40, 40).setInteractive({ useHandCursor: true });
      parafuso.on('pointerup', () => this.apertar(i, parafuso, g, numero));
      c.add(parafuso);
    });
  }

  apertar(i, parafuso, g, numero) {
    if (this.ordem.includes(i) || this.ordem.length === 4) return;
    this.ordem.push(i);
    numero.setText(String(this.ordem.length));
    this.cena.tweens.add({ targets: g, angle: 180, duration: 250 });
    parafuso.disableInteractive();

    if (this.ordem.length === 4) {
      const oposto = { 0: 3, 3: 0, 1: 2, 2: 1 };
      const emX = oposto[this.ordem[0]] === this.ordem[1] && oposto[this.ordem[2]] === this.ordem[3];
      this.mensagem(emX ? 'Apertado em X, perfeito! 🔩' : 'Fora de ordem: a pressão ficou desigual.', emX ? HEX.sucesso : HEX.aviso);
      this.cena.time.delayedCall(900, () => this.concluir({ emX }));
    }
  }
}

const CONECTORES = {
  placa: { nome: '24 pinos', destino: 'Placa-mãe (24 pinos)', w: 96, h: 30, cor: 0xeef1f7, colunas: 12, linhas: 2 },
  cpu: { nome: 'CPU 8 pinos', destino: 'Energia do processador', w: 46, h: 30, cor: 0x1b1d24, colunas: 4, linhas: 2 },
  gpu: { nome: 'PCIe 8 pinos', destino: 'Placa de vídeo', w: 54, h: 30, cor: 0x1b1d24, colunas: 4, linhas: 2, separado: true },
  sata: { nome: 'SATA', destino: 'Disco SATA', w: 70, h: 14, cor: 0x1b1d24, colunas: 7, linhas: 1, eleL: true },
};

/** Conectar cabos: arraste cada plugue da fonte até a entrada do mesmo formato. */
export class ConectarCabos extends SkillCheck {
  static altura = 430;

  constructor(cena, montagem) {
    super(cena, {
      titulo: 'Ligue os cabos da fonte',
      instrucao: 'Arraste cada plugue (esquerda) até a entrada com o MESMO formato (direita). Cabos esquecidos = PC que não liga!',
    });
    this.montagem = montagem;
    this.disponiveis = montagem.cabosDisponiveis();
    this.conectados = Object.fromEntries(this.disponiveis.map((c) => [c, Boolean(montagem.estado.cabos[c])]));
  }

  desenharConector(g, tipo, x, y, { entrada = false } = {}) {
    const d = CONECTORES[tipo];
    const cor = entrada ? 0x2c3350 : d.cor;
    g.fillStyle(entrada ? 0x0f1224 : 0x000000, entrada ? 1 : 0.3).fillRoundedRect(x - d.w / 2 - 4, y - d.h / 2 - 4, d.w + 8, d.h + 8, 6);
    g.fillStyle(cor, 1).fillRoundedRect(x - d.w / 2, y - d.h / 2, d.w, d.h, 4);
    if (d.eleL) g.fillStyle(entrada ? 0x0f1224 : 0x2c3350, 1).fillRect(x + d.w / 2 - 14, y - d.h / 2, 14, d.h / 2);
    const passoX = d.w / d.colunas;
    const passoY = d.h / d.linhas;
    for (let i = 0; i < d.colunas; i++) {
      if (d.separado && i === 3) continue;
      for (let j = 0; j < d.linhas; j++) {
        const px = x - d.w / 2 + passoX * i + passoX / 2;
        const py = y - d.h / 2 + passoY * j + passoY / 2;
        g.fillStyle(entrada ? 0x6b7399 : 0x5b6475, 1).fillRect(px - 2, py - 2, 4, 4);
      }
    }
  }

  montar(c) {
    if (!this.disponiveis.length) {
      c.add(this.cena.add.text(0, -20, 'Não há nada para ligar ainda.\nInstale a placa-mãe no gabinete e a fonte.', estiloTexto(15, HEX.texto, { align: 'center' })).setOrigin(0.5));
      c.add(new Botao(this.cena, 0, 140, 'Fechar', () => this.concluir(null), { largura: 160 }));
      return;
    }

    const destinos = Phaser.Utils.Array.Shuffle([...this.disponiveis]);
    this.entradas = new Map();
    destinos.forEach((tipo, i) => {
      const y = -110 + i * 66;
      const g = this.cena.add.graphics();
      this.desenharConector(g, tipo, 150, y, { entrada: true });
      const rotulo = this.cena.add.text(150, y + 26, CONECTORES[tipo].destino, estiloTexto(11, HEX.textoSuave)).setOrigin(0.5, 0);
      c.add([g, rotulo]);
      this.entradas.set(tipo, { x: 150, y, rotulo });
    });

    this.disponiveis.forEach((tipo, i) => {
      const y = -110 + i * 66;
      const plugue = this.cena.add.container(-160, y);
      const g = this.cena.add.graphics();
      this.desenharConector(g, tipo, 0, 0);
      const cabo = this.cena.add.graphics();
      const rotulo = this.cena.add.text(0, 26, CONECTORES[tipo].nome, estiloTexto(11, HEX.texto)).setOrigin(0.5, 0);
      plugue.add([g, rotulo]);
      plugue.setSize(CONECTORES[tipo].w + 16, CONECTORES[tipo].h + 16).setInteractive({ useHandCursor: true, draggable: true });
      plugue.inicio = { x: -160, y };
      plugue.rotulo = rotulo;
      c.add([cabo, plugue]);

      const desenharCabo = () => {
        cabo.clear().lineStyle(6, 0xf5c542, 1).lineBetween(-250, plugue.inicio.y, plugue.x - CONECTORES[tipo].w / 2, plugue.y);
      };
      desenharCabo();

      if (this.conectados[tipo]) this.encaixar(tipo, plugue, desenharCabo);

      plugue.on('drag', (ponteiro, dx, dy) => {
        if (this.conectados[tipo]) return;
        plugue.setPosition(dx, dy);
        desenharCabo();
      });
      plugue.on('dragend', () => {
        if (this.conectados[tipo]) return;
        const alvo = [...this.entradas.entries()].find(([, e]) => Phaser.Math.Distance.Between(plugue.x, plugue.y, e.x, e.y) < 44);
        if (alvo && alvo[0] === tipo) {
          this.encaixar(tipo, plugue, desenharCabo);
          this.mensagem(`${CONECTORES[tipo].nome}: conectado! ✅`, HEX.sucesso);
        } else {
          if (alvo) {
            this.mensagem('Não encaixa: o formato é diferente.', HEX.erro);
            this.cena.cameras.main.shake(120, 0.004);
          }
          this.cena.tweens.add({ targets: plugue, x: plugue.inicio.x, y: plugue.inicio.y, duration: 200, onUpdate: desenharCabo });
        }
      });
    });

    c.add(new Botao(this.cena, 0, ConectarCabos.altura / 2 - 54, 'Pronto', () => this.concluir({ ...this.conectados }), { largura: 180, cor: 0x2f9e5b }));
  }

  encaixar(tipo, plugue, desenharCabo) {
    const entrada = this.entradas.get(tipo);
    this.conectados[tipo] = true;
    plugue.disableInteractive();
    plugue.rotulo.setVisible(false); // o rótulo da entrada já identifica o cabo
    this.cena.tweens.add({ targets: plugue, x: entrada.x, y: entrada.y, duration: 160, onUpdate: desenharCabo, onComplete: desenharCabo });
    entrada.rotulo.setColor(HEX.sucesso);
  }
}
