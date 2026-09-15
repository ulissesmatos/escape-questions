import { CORES, HEX, estiloTexto } from '../constantes.js';
import { Botao } from '../ui/componentes.js';
import { somDa } from '../audio/SomDaOficina.js';
import { SimuladorTeste, LIMITE_DESLIGA, LIMITE_QUENTE } from '../../regras/SimuladorTeste.js';
import { TelaSobreposta } from './telas.js';

const TITULOS = {
  sem_gabinete: 'Não dá para ligar ainda',
  sem_energia: 'Você aperta o botão... e nada acontece',
  pinos_tortos: 'Ligou e desligou na mesma hora',
  sem_cpu: 'As ventoinhas giram, mas nada aparece',
  sem_cabo_cpu: 'As ventoinhas giram, mas a tela fica preta',
  sem_ram: 'Bipes longos e tela preta',
  sem_video: 'Monitor sem sinal',
  gpu_sem_cabo: 'Monitor sem sinal',
  sem_armazenamento: 'Nenhum sistema encontrado',
  fonte_fraca: 'A fonte não aguentou!',
  sem_cooler: 'Superaqueceu e desligou!',
  superaquecimento: 'Superaqueceu e desligou!',
};

// Códigos de bipe (simplificados) de quando o PC não consegue mostrar imagem
const BIPES = {
  sem_ram: ['bipLongo', 'bipLongo', 'bipLongo'],
  sem_video: ['bipLongo', 'bip', 'bip', 'bip'],
  gpu_sem_cabo: ['bipLongo', 'bip', 'bip', 'bip'],
};

const verde = '#9ef0a8';
const azul = '#7dd3fc';

/**
 * Ligar o PC montado: apertar o botão, ventoinhas, BIOS reconhecendo as peças,
 * sistema iniciando (mais rápido com SSD) e teste de estresse com gráfico de
 * temperatura. Cada falha do SimuladorTeste tem sua reação (bipes, sem sinal,
 * fonte estourando, superaquecimento). "Pular" acelera tudo.
 */
export class TelaLigando extends TelaSobreposta {
  constructor(cena) {
    super(cena, { largura: 820, altura: 490 });
    this.som = somDa(cena);
    this.rapido = false;
    const { x0, y0 } = this;
    this.gabinete = { x: x0 + 24, y: y0 + 62, w: 190, h: 318 };
    this.botaoLigar = { x: this.gabinete.x + 95, y: this.gabinete.y + 50 };
    this.ventoinha = { x: this.gabinete.x + 95, y: this.gabinete.y + 205 };
    this.monitor = { x: x0 + 238, y: y0 + 62, w: 558, h: 318 };
    this.tela = { x: this.monitor.x + 14, y: this.monitor.y + 14, w: this.monitor.w - 28, h: this.monitor.h - 40 };
  }

  async executar(teste, montagem) {
    this.teste = teste;
    this.montagem = montagem;
    this.titulo = this.texto(this.largura / 2, 30, '', estiloTexto(22, HEX.destaque)).setOrigin(0.5);
    this.montarGabinete();
    this.montarMonitor();
    this.montarMedidores();
    this.botaoPular = new Botao(this.cena, this.x0 + this.largura - 100, this.y0 + this.altura - 30, 'Pular ⏩', () => { this.rapido = true; }, { largura: 150, altura: 34, tamanho: 14 });
    this.camada.add(this.botaoPular);

    if (teste.motivo === 'sem_gabinete') {
      this.definirTitulo('Não dá para ligar ainda');
    } else {
      await this.esperarBotaoLigar();
      await this.sequencia();
    }
    return this.finalizar();
  }

  // ---------------- Sequência ----------------

  async sequencia() {
    const { motivo } = this.teste;
    if (motivo === 'sem_energia') {
      this.definirTitulo(TITULOS.sem_energia);
      await this.esperar(600);
      return;
    }

    await this.energizar();
    if (motivo === 'pinos_tortos') {
      await this.esperar(700);
      this.desenergizar();
      return;
    }
    if (['sem_cpu', 'sem_cabo_cpu', 'sem_ram', 'sem_video', 'gpu_sem_cabo'].includes(motivo)) {
      await this.semSinal(BIPES[motivo] || []);
      return;
    }

    await this.telaBios();
    if (motivo === 'sem_armazenamento') return;
    await this.iniciarSistema();
    await this.testeDeEstresse();
    if (this.teste.sucesso) await this.mostrarDesempenho();
  }

  esperar(ms) {
    return new Promise((resolver) => (this.rapido ? resolver() : this.cena.time.delayedCall(ms, resolver)));
  }

  duracao(ms) {
    return this.rapido ? 1 : ms;
  }

  definirTitulo(texto, cor = HEX.destaque) {
    this.titulo.setText(texto).setColor(cor);
  }

  // ---------------- Gabinete (botão, LED e ventoinha) ----------------

  montarGabinete() {
    const { x, y, w, h } = this.gabinete;
    const g = this.cena.add.graphics();
    g.fillStyle(0x16181f, 1).fillRoundedRect(x - 4, y - 4, w + 8, h + 8, 14);
    g.fillStyle(0x262a35, 1).fillRoundedRect(x, y, w, h, 12);
    g.fillStyle(0x1d2029, 1).fillRect(x + 12, y + 96, w - 24, 4);
    for (let i = 0; i < 5; i++) g.fillStyle(0x1d2029, 1).fillRect(x + 20, y + h - 40 + i * 6, w - 40, 2);

    const { x: vx, y: vy } = this.ventoinha;
    g.fillStyle(0x111318, 1).fillCircle(vx, vy, 70);
    g.lineStyle(2, 0x3a3f4d, 1).strokeCircle(vx, vy, 70).strokeCircle(vx, vy, 46).strokeCircle(vx, vy, 22);
    this.anelVentoinha = this.cena.add.graphics();
    this.helice = this.cena.add.graphics({ x: vx, y: vy });
    for (let i = 0; i < 5; i++) {
      const angulo = (i / 5) * Math.PI * 2;
      const ponta = (r, desvio) => [Math.cos(angulo + desvio) * r, Math.sin(angulo + desvio) * r];
      const [ax, ay] = ponta(14, -0.5);
      const [bx, by] = ponta(62, -0.15);
      const [cx, cy] = ponta(58, 0.45);
      this.helice.fillStyle(0x4b5263, 1).fillTriangle(ax, ay, bx, by, cx, cy);
    }
    this.helice.fillStyle(0x2c3140, 1).fillCircle(0, 0, 16);

    const { x: bx, y: by } = this.botaoLigar;
    g.fillStyle(0x3a3f4d, 1).fillCircle(bx, by, 28);
    this.botaoGrafico = this.cena.add.graphics({ x: bx, y: by });
    this.led = this.cena.add.graphics();
    this.desenharBotao(false);

    const rotulo = this.cena.add.text(bx, by + 40, 'LIGAR', estiloTexto(11, HEX.textoSuave)).setOrigin(0.5);
    this.camada.add([g, this.anelVentoinha, this.helice, this.botaoGrafico, this.led, rotulo]);
  }

  desenharBotao(ligado) {
    const g = this.botaoGrafico;
    const cor = ligado ? CORES.sucesso : 0x9aa3b5;
    g.clear();
    g.fillStyle(ligado ? 0x1f3b2a : 0x1a1c22, 1).fillCircle(0, 0, 22);
    g.lineStyle(3, cor, 1);
    g.beginPath().arc(0, 1, 10, -Math.PI / 2 + 0.7, Math.PI * 1.5 - 0.7).strokePath();
    g.lineBetween(0, -12, 0, 0);
    this.led.clear().fillStyle(ligado ? CORES.sucesso : 0x2a2d36, 1).fillCircle(this.botaoLigar.x + 46, this.botaoLigar.y, 5);
    this.anelVentoinha.clear();
    if (ligado) this.anelVentoinha.lineStyle(3, CORES.info, 0.8).strokeCircle(this.ventoinha.x, this.ventoinha.y, 68);
  }

  esperarBotaoLigar() {
    this.definirTitulo('Aperte o botão para ligar');
    const { x, y } = this.botaoLigar;
    const alvo = this.cena.add.circle(x, y, 30, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    const brilho = this.cena.add.circle(x, y, 32).setStrokeStyle(4, CORES.destaque, 1);
    this.camada.add([brilho, alvo]);
    const pulso = this.cena.tweens.add({ targets: brilho, scale: 1.25, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    return new Promise((resolver) => {
      // "Pular" também aperta o botão
      const vigiarPular = this.cena.time.addEvent({ delay: 100, loop: true, callback: () => this.rapido && apertar() });
      const apertar = () => {
        vigiarPular.remove();
        pulso.remove();
        brilho.destroy();
        alvo.destroy();
        this.som.efeito('botaoLigar');
        this.cena.tweens.add({ targets: this.botaoGrafico, scale: 0.85, duration: 70, yoyo: true });
        resolver();
      };
      alvo.once('pointerup', apertar);
    });
  }

  async energizar() {
    this.definirTitulo('Ligando...');
    this.desenharBotao(true);
    this.som.efeito('ligar');
    this.somVentoinha = this.som.continuo('ventoinha').intensidade(0.35, 0.8);
    this.giro = this.cena.tweens.add({ targets: this.helice, angle: 360, duration: 500, repeat: -1 });
    this.giro.timeScale = 0.2;
    this.cena.tweens.add({ targets: this.giro, timeScale: 1, duration: this.duracao(900) });
    await this.esperar(700);
  }

  desenergizar() {
    this.som.efeito('desligar');
    this.desenharBotao(false);
    this.somVentoinha?.parar(0.8);
    this.somVentoinha = null;
    if (this.giro) this.cena.tweens.add({ targets: this.giro, timeScale: 0, duration: 900, onComplete: () => this.giro.pause() });
    if (this.telaLigada) this.apagarTela();
  }

  // ---------------- Monitor ----------------

  montarMonitor() {
    const { x, y, w, h } = this.monitor;
    const g = this.cena.add.graphics();
    g.fillStyle(0x0b0d14, 1).fillRoundedRect(x, y, w, h, 12);
    g.fillStyle(0x2c2f3a, 1).fillRect(x + w / 2 - 30, y + h, 60, 14).fillRoundedRect(x + w / 2 - 90, y + h + 12, 180, 8, 4);
    this.fundoTela = this.cena.add.graphics();
    this.conteudoTela = this.cena.add.container(0, 0);
    this.camada.add([g, this.fundoTela, this.conteudoTela]);
    this.limparTela(0x000000);
    this.fundoTela.fillStyle(0xffffff, 0.04).fillTriangle(this.tela.x, this.tela.y, this.tela.x + 160, this.tela.y, this.tela.x, this.tela.y + 110);
  }

  limparTela(cor) {
    const { x, y, w, h } = this.tela;
    this.fundoTela.clear().fillStyle(cor, 1).fillRect(x, y, w, h);
    this.conteudoTela.removeAll(true);
  }

  escreverNaTela(x, y, texto, estilo) {
    const objeto = this.cena.add.text(this.tela.x + x, this.tela.y + y, texto, estilo);
    this.conteudoTela.add(objeto);
    return objeto;
  }

  /** Escreve letra por letra, como num terminal */
  digitar(x, y, texto, estilo) {
    const objeto = this.escreverNaTela(x, y, '', estilo);
    return new Promise((resolver) => {
      let letras = 0;
      const evento = this.cena.time.addEvent({
        delay: 14,
        loop: true,
        callback: () => {
          letras = this.rapido ? texto.length : letras + 1;
          objeto.setText(texto.slice(0, letras));
          if (letras % 3 === 0) this.som.efeito('tecla');
          if (letras >= texto.length) {
            evento.remove();
            resolver(objeto);
          }
        },
      });
    });
  }

  ligarTela(cor) {
    this.telaLigada = true;
    this.limparTela(cor);
  }

  /** Efeito de tela de tubo desligando: vira uma linha e some */
  apagarTela() {
    this.telaLigada = false;
    const { x, y, w, h } = this.tela;
    this.limparTela(0x000000);
    const linha = this.cena.add.rectangle(x + w / 2, y + h / 2, w, h, 0xffffff, 0.9);
    this.conteudoTela.add(linha);
    this.cena.tweens.chain({
      targets: linha,
      tweens: [
        { scaleY: 0.01, duration: this.duracao(160) },
        { scaleX: 0, alpha: 0, duration: this.duracao(220) },
      ],
    });
  }

  async semSinal(bipes) {
    this.definirTitulo(TITULOS[this.teste.motivo]);
    this.ligarTela(0x000000);
    const { w, h } = this.tela;
    const caixa = this.cena.add.rectangle(this.tela.x + w / 2, this.tela.y + h / 2, 200, 70, 0x1e3a8a, 1).setStrokeStyle(3, 0x93c5fd);
    this.conteudoTela.add(caixa);
    this.escreverNaTela(w / 2, h / 2, 'SEM SINAL', estiloTexto(22, '#ffffff')).setOrigin(0.5);
    for (const bipe of bipes) {
      this.som.efeito(bipe);
      await this.esperar(bipe === 'bipLongo' ? 850 : 320);
    }
    await this.esperar(500);
  }

  async telaBios() {
    const { montagem } = this;
    this.definirTitulo('Verificando as peças...');
    this.ligarTela(0x020617);
    this.escreverNaTela(20, 14, 'OFICINA BIOS v2.6', estiloTexto(16, azul));
    this.escreverNaTela(this.tela.w - 20, 16, 'POST: autoteste ao ligar', estiloTexto(12, HEX.textoSuave)).setOrigin(1, 0);

    const cpu = montagem.processador();
    const gpu = montagem.placaDeVideo();
    const memoria = montagem.memorias()[0];
    const discos = ['m2-0', 'm2-1', 'sata-0', 'sata-1'].map((id) => ({ id, peca: montagem.pecaNo(id) })).filter((d) => d.peca);
    const linhas = [
      [`Processador: ${cpu.nome}`, verde],
      [`Memória: ${montagem.ramTotalGb()} GB ${memoria.tipoRam}${montagem.dualChannel() ? ' (dual channel)' : ''}`, verde],
      [`Vídeo: ${gpu ? gpu.nome : 'integrado ao processador'}`, verde],
      ...discos.map(({ id, peca }) => {
        const semCabo = id.startsWith('sata') && !montagem.estado.cabos.sata;
        return [`Disco: ${peca.nome}${semCabo ? ' (sem cabo: não detectado)' : ''}`, semCabo ? HEX.aviso : verde];
      }),
    ];
    let y = 50;
    for (const [texto, cor] of linhas) {
      await this.digitar(20, y, texto, estiloTexto(14, cor));
      y += 26;
      await this.esperar(120);
    }

    if (this.teste.motivo === 'sem_armazenamento') {
      this.definirTitulo(TITULOS.sem_armazenamento);
      await this.digitar(20, y + 12, 'ERRO: nenhum disco com sistema foi encontrado.', estiloTexto(14, '#ff9a9a'));
      this.som.efeito('bipLongo');
      await this.esperar(900);
      return;
    }
    this.definirTitulo('Tudo reconhecido!');
    this.som.efeito('bip');
    await this.digitar(20, y + 12, '1 bipe curto: tudo certo. Iniciando o sistema...', estiloTexto(14, '#ffffff'));
    await this.esperar(700);
  }

  async iniciarSistema() {
    const disco = SimuladorTeste.discoDoSistema(this.montagem);
    const { w, h } = this.tela;
    this.definirTitulo('Iniciando o sistema...');
    this.ligarTela(0x0b2a5b);
    const logo = this.cena.add.graphics();
    const cx = this.tela.x + w / 2;
    const cy = this.tela.y + h / 2 - 40;
    logo.fillStyle(CORES.destaque, 1).fillCircle(cx, cy, 30);
    logo.fillStyle(0x0b2a5b, 1).fillCircle(cx, cy, 18);
    logo.fillStyle(CORES.destaque, 1).fillRect(cx + 10, cy - 6, 34, 12);
    this.conteudoTela.add(logo);
    this.escreverNaTela(w / 2, h / 2 + 10, 'OficinaOS', estiloTexto(22, '#ffffff')).setOrigin(0.5);
    this.escreverNaTela(w / 2, h / 2 + 42, `Iniciando pelo ${disco.nome}...`, estiloTexto(13, HEX.textoSuave)).setOrigin(0.5);

    const barra = this.cena.add.graphics();
    this.conteudoTela.add(barra);
    const estado = { progresso: 0 };
    await new Promise((resolver) => {
      this.cena.tweens.add({
        targets: estado,
        progresso: 1,
        duration: this.duracao(disco.segundos * 90),
        onUpdate: () => {
          barra.clear().fillStyle(0x1e3a8a, 1).fillRoundedRect(cx - 140, cy + 118, 280, 12, 6);
          barra.fillStyle(0x93c5fd, 1).fillRoundedRect(cx - 140, cy + 118, 280 * estado.progresso, 12, 6);
        },
        onComplete: resolver,
      });
    });
    const dica = disco.tipo === 'hd' ? ' (HD é bem mais lento que SSD!)' : '';
    this.escreverNaTela(w / 2, h / 2 + 108, `Sistema iniciou em uns ${disco.segundos} segundos${dica}`, estiloTexto(13, disco.tipo === 'hd' ? HEX.aviso : verde)).setOrigin(0.5);
    await this.esperar(900);
  }

  // ---------------- Teste de estresse ----------------

  testeDeEstresse() {
    const { motivo } = this.teste;
    const falhaDeEnergia = motivo === 'fonte_fraca';
    const superaquece = motivo === 'sem_cooler' || motivo === 'superaquecimento';
    const alvo = superaquece ? 112 : this.teste.temperatura ?? 45;
    const pico = this.teste.consumoPico;

    this.definirTitulo('Teste de estresse: processador a 100%');
    this.ligarTela(0x050a14);
    this.escreverNaTela(20, 12, 'Temperatura do processador', estiloTexto(14, azul));
    const grafico = { x: this.tela.x + 50, y: this.tela.y + 48, w: this.tela.w - 80, h: 170 };
    const paraY = (temp) => grafico.y + grafico.h - (Math.min(115, Math.max(20, temp)) - 20) / 95 * grafico.h;
    const eixos = this.cena.add.graphics();
    eixos.lineStyle(1, 0x334155, 1).strokeRect(grafico.x, grafico.y, grafico.w, grafico.h);
    eixos.lineStyle(2, CORES.aviso, 0.8).lineBetween(grafico.x, paraY(LIMITE_QUENTE), grafico.x + grafico.w, paraY(LIMITE_QUENTE));
    eixos.lineStyle(2, CORES.erro, 0.9).lineBetween(grafico.x, paraY(LIMITE_DESLIGA), grafico.x + grafico.w, paraY(LIMITE_DESLIGA));
    const linha = this.cena.add.graphics();
    this.conteudoTela.add([eixos, linha]);
    for (const [temp, texto, cor] of [[20, '20 °C', HEX.textoSuave], [LIMITE_QUENTE, '90', HEX.aviso], [LIMITE_DESLIGA, '100', HEX.erro]]) {
      this.escreverNaTela(grafico.x - this.tela.x - 6, paraY(temp) - this.tela.y, texto, estiloTexto(10, cor)).setOrigin(1, 0.5);
    }

    const pontos = [];
    this.somVentoinha?.intensidade(0.9, 2.5);
    return new Promise((resolver) => {
      let parou = false;
      const estado = { t: 0 };
      this.cena.tweens.add({
        targets: estado,
        t: 1,
        duration: this.duracao(2800),
        onUpdate: () => {
          if (parou) return;
          const { t } = estado;
          const temp = 35 + (alvo - 35) * (1 - (1 - t) ** 2);
          const energia = 60 + (pico - 60) * Math.min(1, t * 1.4);
          pontos.push({ x: grafico.x + t * grafico.w, y: paraY(temp), temp });
          linha.clear().lineStyle(3, temp >= LIMITE_QUENTE ? CORES.erro : CORES.sucesso, 1);
          linha.strokePoints(pontos);
          this.desenharMedidores(temp, energia);
          if (falhaDeEnergia && t >= 0.7) {
            parou = true;
            this.desenharMedidores(temp, pico);
            this.estourarFonte().then(resolver);
          } else if (superaquece && temp >= LIMITE_DESLIGA) {
            parou = true;
            this.superaquecer().then(resolver);
          }
        },
        onComplete: () => !parou && resolver(),
      });
    });
  }

  async estourarFonte() {
    this.som.efeito('estouro');
    this.cena.cameras.main.shake(300, 0.012);
    this.soltarFumaca();
    this.desenergizar();
    this.definirTitulo(TITULOS.fonte_fraca, HEX.erro);
    await this.esperar(1200);
  }

  async superaquecer() {
    this.som.efeito('alarme');
    const aviso = this.escreverNaTela(this.tela.w / 2, this.tela.h - 34, 'PROCESSADOR A 100 °C: DESLIGANDO PARA SE PROTEGER', estiloTexto(14, '#ff6b6b')).setOrigin(0.5);
    this.cena.tweens.add({ targets: aviso, alpha: 0.2, duration: 160, yoyo: true, repeat: 3 });
    this.definirTitulo(TITULOS[this.teste.motivo], HEX.erro);
    await this.esperar(1300);
    this.soltarFumaca();
    this.desenergizar();
    await this.esperar(700);
  }

  soltarFumaca() {
    const fumaca = this.cena.add.particles(this.ventoinha.x, this.ventoinha.y - 40, 'fumaca', {
      speed: { min: 20, max: 60 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.6, end: 2.2 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 1600,
      frequency: 90,
    });
    this.camada.add(fumaca);
    this.cena.time.delayedCall(1800, () => fumaca.stop());
  }

  async mostrarDesempenho() {
    const { partes, total } = SimuladorTeste.desempenho(this.montagem);
    const { w } = this.tela;
    this.ligarTela(0x071225);
    this.somVentoinha?.intensidade(0.4, 1);
    this.definirTitulo('Funcionou! 🎉', HEX.sucesso);
    this.som.efeito('sucesso');
    this.escreverNaTela(20, 12, 'Pontuação de desempenho', estiloTexto(16, azul));
    const valorTotal = this.escreverNaTela(w - 20, 10, '0 pts', estiloTexto(20, HEX.destaque)).setOrigin(1, 0);

    const barras = this.cena.add.graphics();
    this.conteudoTela.add(barras);
    const maximo = 3200;
    const estado = { t: 0 };
    const valores = partes.map((parte, i) => {
      this.escreverNaTela(20, 52 + i * 34, parte.nome, estiloTexto(13, '#e5e7eb'));
      return this.escreverNaTela(w - 20, 52 + i * 34, '0', estiloTexto(13, HEX.textoSuave)).setOrigin(1, 0);
    });
    await new Promise((resolver) => {
      let ultimoTique = 0;
      this.cena.tweens.add({
        targets: estado,
        t: 1,
        duration: this.duracao(1400),
        ease: 'Quad.easeOut',
        onUpdate: () => {
          barras.clear();
          partes.forEach((parte, i) => {
            const y = this.tela.y + 56 + i * 34;
            const largura = (w - 250) * Math.min(1, parte.pontos / maximo) * estado.t;
            barras.fillStyle(0x1e293b, 1).fillRoundedRect(this.tela.x + 130, y, w - 250, 14, 7);
            if (largura > 1) barras.fillStyle(CORES.info, 1).fillRoundedRect(this.tela.x + 130, y, largura, 14, 7);
            valores[i].setText(String(Math.round(parte.pontos * estado.t)));
          });
          valorTotal.setText(`${Math.round(total * estado.t).toLocaleString('pt-BR')} pts`);
          if (estado.t - ultimoTique > 0.08) {
            ultimoTique = estado.t;
            this.som.efeito('pontos');
          }
        },
        onComplete: resolver,
      });
    });

    const fonte = this.montagem.fonte();
    const avisos = this.teste.etapas.filter((e) => e.tipo === 'aviso').map((e) => `⚠ ${e.texto}`);
    const resumo = [`Temperatura máxima: ${this.teste.temperatura} °C · Pico de energia: ${this.teste.consumoPico} W de ${fonte.potencia} W`, ...avisos];
    resumo.forEach((linha, i) => {
      this.escreverNaTela(20, 196 + i * 20, linha, estiloTexto(12, i === 0 ? HEX.textoSuave : HEX.aviso, { wordWrap: { width: w - 40 } }));
    });
    await this.esperar(600);
  }

  // ---------------- Medidores e fim ----------------

  montarMedidores() {
    const y = this.monitor.y + this.monitor.h + 30;
    this.medidores = this.cena.add.graphics();
    this.camada.add(this.medidores);
    this.rotuloTemp = this.cena.add.text(this.x0 + 24, y, 'Temperatura da CPU', estiloTexto(12, HEX.textoSuave));
    this.valorTemp = this.cena.add.text(this.x0 + 214, y - 2, '--', estiloTexto(15, HEX.texto)).setOrigin(1, 0);
    this.rotuloEnergia = this.cena.add.text(this.x0 + 238, y, 'Energia (pico)', estiloTexto(12, HEX.textoSuave));
    this.valorEnergia = this.cena.add.text(this.x0 + 508, y - 2, '--', estiloTexto(15, HEX.texto)).setOrigin(1, 0);
    this.camada.add([this.rotuloTemp, this.valorTemp, this.rotuloEnergia, this.valorEnergia]);
    this.desenharMedidores(0, 0);
  }

  desenharMedidores(temp, energia) {
    const y = this.monitor.y + this.monitor.h + 50;
    const barra = (x, largura, fracao, cor) => {
      this.medidores.fillStyle(0x1b2033, 1).fillRoundedRect(x, y, largura, 12, 6);
      if (fracao > 0) this.medidores.fillStyle(cor, 1).fillRoundedRect(x, y, largura * Math.min(1, fracao), 12, 6);
    };
    this.medidores.clear();
    const corTemp = temp >= LIMITE_DESLIGA ? CORES.erro : temp >= LIMITE_QUENTE ? CORES.aviso : CORES.sucesso;
    barra(this.x0 + 24, 190, temp ? (temp - 20) / 95 : 0, corTemp);
    this.valorTemp.setText(temp ? `${Math.round(temp)} °C` : '--');
    const fonte = this.montagem.fonte();
    if (fonte) {
      const fracao = energia / fonte.potencia;
      barra(this.x0 + 238, 270, fracao, fracao > 1 ? CORES.erro : fracao > 0.87 ? CORES.aviso : CORES.info);
      this.valorEnergia.setText(energia ? `${Math.round(energia)} W de ${fonte.potencia} W` : '--');
    }
  }

  finalizar() {
    const { teste } = this;
    if (!teste.sucesso) {
      this.definirTitulo(TITULOS[teste.motivo] || this.titulo.text, HEX.erro);
      this.som.efeito('fracasso');
      const caixa = this.cena.add.graphics();
      const { x, y, w, h } = this.tela;
      caixa.fillStyle(0x12152a, 0.95).fillRoundedRect(x + 16, y + h - 74, w - 32, 60, 10);
      caixa.lineStyle(2, CORES.erro, 1).strokeRoundedRect(x + 16, y + h - 74, w - 32, 60, 10);
      const explicacao = this.cena.add.text(x + w / 2, y + h - 44, `Por quê? ${teste.explicacao}`, estiloTexto(13, HEX.texto, { align: 'center', wordWrap: { width: w - 64 } })).setOrigin(0.5);
      this.camada.add([caixa, explicacao]);
    }
    this.botaoPular.destroy();
    return new Promise((resolver) => {
      const botao = new Botao(this.cena, this.x0 + this.largura - 110, this.y0 + this.altura - 30, 'Ver avaliação', () => {
        this.fechar();
        resolver();
      }, { largura: 190, altura: 36, cor: 0x2f9e5b, tamanho: 15 });
      this.camada.add(botao);
      this.botaoAvaliacao = botao;
    });
  }

  fechar() {
    this.somVentoinha?.parar(0.5);
    super.fechar();
  }
}
