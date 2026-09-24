import Phaser from '../phaser.js';
import { CORES, HEX, estiloTexto } from '../constantes.js';
import { Botao } from '../ui/componentes.js';
import { somDa } from '../audio/SomDaOficina.js';
import { EncaixeProcessador } from '../../regras/encaixes.js';
import { SkillCheck } from './SkillCheck.js';

const TAMANHO_PINOS = 150; // lado da área de pinos do socket (px do jogo)

const PASSOS = {
  alavanca: '1) Clique na ALAVANCA do socket para levantá-la. Com ela abaixada, o processador não entra.',
  posicionar: '2) Gire o processador até o triângulo dourado ficar no canto da marca do socket (clique nele ou tecla R).\n3) Arraste e solte BEM NO CENTRO do socket.',
  travar: '4) Abaixe a alavanca para travar o processador no lugar.',
};

/**
 * Encaixar o processador como na vida real: levantar a alavanca, alinhar o
 * triângulo, descer o processador reto no centro do socket e travar.
 *
 * Ao arrastar, o processador "sobe" na mão (fica maior e ganha sombra) e
 * "desce" ao soltar. Soltar fora do centro pode entortar os pinos; a chance
 * vem das regras (EncaixeProcessador.soltar).
 */
export class EncaixarProcessador extends SkillCheck {
  static largura = 660;
  static altura = 470;
  static alturaMensagem = 186; // abaixo do botão Girar

  constructor(cena, peca) {
    super(cena, { titulo: 'Encaixe o processador', instrucao: PASSOS.alavanca });
    this.peca = peca;
    this.angulo = Phaser.Math.RND.pick([90, 180, 270]);
    this.etapa = 'alavanca';
    this.socket = { x: -130, y: -6 };
    this.bandeja = { x: 175, y: -6 };
    this.pivo = { x: this.socket.x + TAMANHO_PINOS / 2 + 34, y: this.socket.y + TAMANHO_PINOS / 2 + 20 };
  }

  get alinhado() {
    return this.angulo % 360 === 0;
  }

  /** Distância do centro do socket, em fração do tamanho da área de pinos */
  get desvio() {
    return Math.max(Math.abs(this.cpu.x - this.socket.x), Math.abs(this.cpu.y - this.socket.y)) / TAMANHO_PINOS;
  }

  montar(c) {
    this.montarSocket(c);
    this.montarAlavanca(c);
    this.montarProcessador(c);
  }

  montarSocket(c) {
    const { x, y } = this.socket;
    const meio = TAMANHO_PINOS / 2;
    const g = this.cena.add.graphics();
    g.fillStyle(0x3b4252, 1).fillRoundedRect(x - meio - 24, y - meio - 24, TAMANHO_PINOS + 48, TAMANHO_PINOS + 48, 10);
    g.fillStyle(0x9aa3b5, 1).fillRect(x - meio - 8, y - meio - 8, TAMANHO_PINOS + 16, TAMANHO_PINOS + 16);
    g.fillStyle(0x5b6475, 1).fillRect(x - meio, y - meio, TAMANHO_PINOS, TAMANHO_PINOS);
    for (let py = y - meio + 8; py < y + meio - 4; py += 10) {
      for (let px = x - meio + 8; px < x + meio - 4; px += 10) g.fillStyle(0xe8b64c, 1).fillRect(px, py, 3, 3);
    }
    // Marca dourada no canto inferior esquerdo: o triângulo do processador precisa ficar aqui
    g.fillStyle(0xffc94a, 1).fillTriangle(x - meio - 6, y + meio + 6, x - meio - 6, y + meio - 22, x - meio + 22, y + meio + 6);
    this.pinosTortos = this.cena.add.graphics();
    this.alvo = this.cena.add.graphics();
    c.add([g, this.pinosTortos, this.alvo, this.cena.add.text(x, y + meio + 40, 'Socket', estiloTexto(13, HEX.textoSuave)).setOrigin(0.5)]);
  }

  /** Alavanca de retenção: presa no canto inferior direito, deitada ao lado do socket */
  montarAlavanca(c) {
    const comprimento = TAMANHO_PINOS + 26;
    this.brilhoAlavanca = this.cena.add.graphics(this.pivo);
    this.brilhoAlavanca.fillStyle(CORES.destaque, 0.45).fillRoundedRect(-13, -comprimento - 12, 26, comprimento + 24, 10);
    this.alavanca = this.cena.add.graphics(this.pivo);
    this.alavanca.fillStyle(0x2c2f3a, 1).fillCircle(0, 0, 9);
    this.alavanca.fillStyle(0xd5dbe6, 1).fillRect(-3, -comprimento, 6, comprimento);
    this.alavanca.fillStyle(0xaab2c2, 1).fillRect(-3, -comprimento, 18, 7);
    this.alavanca.setInteractive(new Phaser.Geom.Rectangle(-18, -comprimento - 10, 44, comprimento + 20), Phaser.Geom.Rectangle.Contains);
    this.alavanca.input.cursor = 'pointer';
    this.alavanca.on('pointerup', () => this.usarAlavanca());
    c.add([this.brilhoAlavanca, this.alavanca]);
    this.pulso = this.cena.tweens.add({ targets: this.brilhoAlavanca, alpha: { from: 0.15, to: 1 }, duration: 450, yoyo: true, repeat: -1 });
  }

  montarProcessador(c) {
    const { x, y } = this.bandeja;
    const blister = this.cena.add.graphics();
    blister.fillStyle(0x0f1224, 0.7).fillRoundedRect(x - 95, y - 95, 190, 190, 14);
    blister.lineStyle(2, CORES.borda, 1).strokeRoundedRect(x - 95, y - 95, 190, 190, 14);

    const imagem = this.cena.textures.get(this.peca.sprite).getSourceImage();
    this.escalaBase = TAMANHO_PINOS / Math.max(imagem.width, imagem.height);
    this.sombra = this.cena.add.image(x, y, this.peca.sprite).setScale(this.escalaBase).setAngle(this.angulo).setAlpha(0);
    this.sombra.setTint(0x000000).setTintMode(Phaser.TintModes.FILL);
    this.cpu = this.cena.add.image(x, y, this.peca.sprite).setScale(this.escalaBase).setAngle(this.angulo);
    this.cpu.setInteractive({ useHandCursor: true, draggable: true });
    this.cpu.on('dragstart', () => this.levantar());
    this.cpu.on('drag', (ponteiro, px, py) => this.moverNaMao(px, py));
    this.cpu.on('dragend', () => this.soltar());

    c.add([blister, this.sombra, this.cpu, this.cena.add.text(x, y + 112, 'Processador', estiloTexto(13, HEX.textoSuave)).setOrigin(0.5)]);
    c.add(new Botao(this.cena, x, y + 146, '⟲ Girar (R)', () => this.girar(), { largura: 150, altura: 32, tamanho: 13 }));
    this.teclaR = () => this.girar();
    this.cena.input.keyboard?.on('keydown-R', this.teclaR);
  }

  // ---------------- Alavanca ----------------

  usarAlavanca() {
    if (this.bloqueado) return;
    if (this.etapa === 'alavanca') {
      this.moverAlavanca(true, 'posicionar');
    } else if (this.etapa === 'posicionar') {
      this.moverAlavanca(false, 'alavanca');
    } else if (this.etapa === 'travar') {
      this.bloqueado = true;
      this.moverAlavanca(false, 'travado');
      somDa(this.cena).efeito('sucesso');
      this.mensagem('Processador travado! 🔒', HEX.sucesso);
      this.cena.time.delayedCall(900, () => this.concluir({ alinhado: true, entortou: false }));
    }
  }

  moverAlavanca(aberta, proximaEtapa) {
    somDa(this.cena).efeito('alavanca');
    this.alavancaAberta = aberta;
    this.etapa = proximaEtapa;
    if (PASSOS[proximaEtapa]) this.instruir(PASSOS[proximaEtapa]);
    // Vista de cima: a alavanca levantada aponta para cima da tela, então parece mais curta
    this.cena.tweens.add({ targets: [this.alavanca, this.brilhoAlavanca], angle: aberta ? 20 : 0, scaleY: aberta ? 0.45 : 1, duration: 220, ease: 'Back.easeOut' });
    // O brilho só pisca quando a próxima ação é na alavanca
    const destacar = proximaEtapa === 'alavanca' || proximaEtapa === 'travar';
    if (destacar) this.pulso.resume();
    else {
      this.pulso.pause();
      this.brilhoAlavanca.setAlpha(0);
    }
  }

  // ---------------- Processador na mão ----------------

  girar() {
    if (this.bloqueado || this.naMao || this.etapa === 'travar') return;
    // Cliques rápidos: o giro anterior termina na hora, no ângulo exato, antes
    // de começar outro. Girar a partir do ângulo "no meio do caminho" deixava
    // a imagem torta (fora dos 90°) e o erro ia se acumulando a cada clique.
    this.endireitar();
    this.angulo = (this.angulo + 270) % 360;
    somDa(this.cena).efeito('clique');
    const giro = this.cena.tweens.add({
      targets: [this.cpu, this.sombra],
      angle: this.cpu.angle - 90,
      duration: 160,
      onComplete: () => this.giro === giro && this.endireitar(),
    });
    this.giro = giro;
  }

  /**
   * Interrompe o giro em andamento (se houver) e crava o processador e a
   * sombra no ângulo certo, sempre múltiplo de 90°
   */
  endireitar() {
    if (this.giro) {
      const giro = this.giro;
      this.giro = null;
      giro.stop();
    }
    this.cpu.setAngle(this.angulo);
    this.sombra.setAngle(this.angulo);
  }

  levantar() {
    if (this.bloqueado || this.etapa === 'travar') return;
    this.naMao = true;
    this.moveu = false;
    somDa(this.cena).efeito('levantar');
    this.cena.tweens.add({ targets: this.cpu, scale: this.escalaBase * 1.18, duration: 120 });
    this.cena.tweens.add({ targets: this.sombra, alpha: 0.35, duration: 120 });
  }

  moverNaMao(x, y) {
    if (!this.naMao) return;
    if (Phaser.Math.Distance.Between(x, y, this.bandeja.x, this.bandeja.y) > 6) this.moveu = true;
    this.cpu.setPosition(x, y);
    this.sombra.setPosition(x + 12, y + 16);
    this.desenharAlvo();
  }

  /** Quadrado-guia no socket: verde = no centro, amarelo = arriscado */
  desenharAlvo() {
    this.alvo.clear();
    if (!this.naMao || this.desvio > EncaixeProcessador.FOLGA.maxima) return;
    const cor = this.desvio <= EncaixeProcessador.FOLGA.perfeita ? CORES.sucesso : CORES.aviso;
    const meio = TAMANHO_PINOS / 2;
    this.alvo.fillStyle(cor, 0.15).fillRect(this.socket.x - meio, this.socket.y - meio, TAMANHO_PINOS, TAMANHO_PINOS);
    this.alvo.lineStyle(3, cor, 1).strokeRect(this.socket.x - meio, this.socket.y - meio, TAMANHO_PINOS, TAMANHO_PINOS);
  }

  soltar() {
    if (!this.naMao) return;
    this.naMao = false;
    this.endireitar();
    this.alvo.clear();

    if (!this.moveu) {
      // Foi só um clique: gira
      this.voltarParaBandeja();
      this.girar();
      return;
    }
    if (this.desvio > EncaixeProcessador.FOLGA.maxima) {
      this.voltarParaBandeja({ som: 'soltar' });
      return;
    }
    if (!this.alavancaAberta) {
      this.mensagem('Levante a alavanca do socket antes!', HEX.aviso);
      this.voltarParaBandeja({ som: 'negar' });
      return;
    }

    const { resultado } = EncaixeProcessador.soltar({ alinhado: this.alinhado, desvio: this.desvio });
    this.bloqueado = true;
    // Descendo: volta ao tamanho normal e a sombra se esconde embaixo do processador
    this.cena.tweens.add({ targets: this.sombra, alpha: 0, x: this.cpu.x, y: this.cpu.y, duration: 180 });
    this.cena.tweens.add({ targets: this.cpu, scale: this.escalaBase, duration: 180, ease: 'Quad.easeIn', onComplete: () => this.aoDescer(resultado) });
  }

  aoDescer(resultado) {
    const som = somDa(this.cena);
    if (resultado === 'entortou') {
      som.efeito('dano');
      this.cena.cameras.main.shake(260, 0.01);
      this.desenharPinosTortos();
      this.mensagem(this.alinhado ? 'Desceu torto e os pinos entortaram! 😱' : 'Estava virado! Os pinos entortaram. 😱', HEX.erro);
      this.cena.time.delayedCall(1500, () => this.concluir({ alinhado: this.alinhado, entortou: true }));
      return;
    }

    const centralizar = () => this.cena.tweens.add({
      targets: this.cpu,
      x: this.socket.x,
      y: this.socket.y,
      duration: 110,
      onComplete: () => {
        som.efeito('encaixe');
        this.cpu.disableInteractive();
        this.bloqueado = false;
        this.etapa = 'travar';
        this.instruir(PASSOS.travar);
        this.pulso.resume();
      },
    });

    if (resultado === 'por_pouco') {
      som.efeito('raspar');
      this.mensagem('Ufa! Desceu torto, mas encaixou. Da próxima vez, solte bem no centro.', HEX.aviso);
      this.cena.tweens.add({ targets: this.cpu, angle: this.cpu.angle + 4, duration: 60, yoyo: true, repeat: 2, onComplete: centralizar });
    } else {
      this.mensagem('Desceu reto, no centro!', HEX.sucesso);
      centralizar();
    }
  }

  voltarParaBandeja({ som = null } = {}) {
    if (som) somDa(this.cena).efeito(som);
    const { x, y } = this.bandeja;
    this.cena.tweens.add({ targets: this.cpu, x, y, scale: this.escalaBase, duration: 200 });
    this.cena.tweens.add({ targets: this.sombra, x, y, alpha: 0, duration: 200 });
  }

  desenharPinosTortos() {
    const meio = TAMANHO_PINOS / 2;
    const { x, y } = this.socket;
    this.pinosTortos.fillStyle(CORES.erro, 0.3).fillRect(x - meio, y - meio, TAMANHO_PINOS, TAMANHO_PINOS);
    this.pinosTortos.lineStyle(3, CORES.erro, 1);
    for (let i = 0; i < 7; i++) {
      const px = x - meio + 16 + i * 20;
      this.pinosTortos.lineBetween(px, y - 12, px + (i % 2 ? 9 : -9), y + 12);
    }
    this.cena.tweens.add({ targets: this.cpu, alpha: 0.5, duration: 300 });
  }

  aoFechar() {
    this.cena.input.keyboard?.off('keydown-R', this.teclaR);
  }

  // ---------------- Posições no jogo (para testes automatizados) ----------------

  get pontoAlavanca() {
    const angulo = Phaser.Math.DegToRad(this.alavanca.angle);
    const distancia = TAMANHO_PINOS * 0.35 * this.alavanca.scaleY;
    return this.noMundo({ x: this.pivo.x + Math.sin(angulo) * distancia, y: this.pivo.y - Math.cos(angulo) * distancia });
  }

  get pontoCpu() {
    return this.noMundo(this.cpu);
  }

  get pontoSocket() {
    return this.noMundo(this.socket);
  }
}
