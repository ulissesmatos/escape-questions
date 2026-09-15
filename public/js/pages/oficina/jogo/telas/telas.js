import { LARGURA, ALTURA, CORES, HEX, estiloTexto } from '../constantes.js';
import { Botao, desenharPainel } from '../ui/componentes.js';
import { LIMITE_DESLIGA, LIMITE_QUENTE } from '../../regras/SimuladorTeste.js';

/** Base das telas sobrepostas (teste e resultado) */
class TelaSobreposta {
  constructor(cena, { largura, altura }) {
    this.cena = cena;
    this.largura = largura;
    this.altura = altura;
    this.x0 = (LARGURA - largura) / 2;
    this.y0 = (ALTURA - altura) / 2;
    this.camada = cena.add.container(0, 0).setDepth(1100);
    this.camada.add(cena.add.rectangle(LARGURA / 2, ALTURA / 2, LARGURA, ALTURA, 0x05070f, 0.8).setInteractive());
    const g = cena.add.graphics();
    desenharPainel(g, this.x0, this.y0, largura, altura, { raio: 16 });
    this.camada.add(g);
  }

  texto(x, y, conteudo, estilo) {
    const t = this.cena.add.text(this.x0 + x, this.y0 + y, conteudo, estilo);
    this.camada.add(t);
    return t;
  }

  fechar() {
    this.cena.tweens.add({ targets: this.camada, alpha: 0, duration: 150, onComplete: () => this.camada.destroy() });
  }
}

/**
 * Animação do teste: o monitor mostra as etapas do POST uma a uma, com
 * medidores de temperatura e energia. Resolve quando o jogador pede a avaliação.
 */
export class TelaTeste extends TelaSobreposta {
  constructor(cena) {
    super(cena, { largura: 700, altura: 440 });
  }

  executar(teste, montagem) {
    return new Promise((resolver) => {
      this.texto(this.largura / 2, 26, 'Ligando o computador...', estiloTexto(22, HEX.destaque)).setOrigin(0.5);

      // Monitor
      const g = this.cena.add.graphics();
      const mx = this.x0 + 30;
      const my = this.y0 + 60;
      g.fillStyle(0x0b0d14, 1).fillRoundedRect(mx, my, 400, 270, 10);
      g.fillStyle(0x2c2f3a, 1).fillRoundedRect(mx + 8, my + 8, 384, 254, 6);
      g.fillStyle(0x000000, 1).fillRect(mx + 16, my + 16, 368, 238);
      g.fillStyle(0x2c2f3a, 1).fillRect(mx + 180, my + 270, 40, 22).fillRect(mx + 130, my + 290, 140, 10);
      this.camada.add(g);
      const tela = this.cena.add.text(mx + 26, my + 26, '', estiloTexto(13, '#9ef0a8', { wordWrap: { width: 340 }, lineSpacing: 6 }));
      this.camada.add(tela);

      // Medidores
      const medidores = this.cena.add.graphics();
      this.camada.add(medidores);
      const rotuloTemp = this.texto(460, 70, 'Temperatura da CPU', estiloTexto(13, HEX.textoSuave));
      const valorTemp = this.texto(460, 90, '--', estiloTexto(26));
      this.texto(460, 180, 'Energia (pico)', estiloTexto(13, HEX.textoSuave));
      const valorEnergia = this.texto(460, 200, '--', estiloTexto(22));
      const fonte = montagem.fonte();

      const desenharMedidores = (temp, energia) => {
        medidores.clear();
        const barra = (y, fracao, cor) => {
          medidores.fillStyle(0x1b2033, 1).fillRoundedRect(this.x0 + 460, this.y0 + y, 200, 14, 7);
          medidores.fillStyle(cor, 1).fillRoundedRect(this.x0 + 460, this.y0 + y, 200 * Math.min(1, fracao), 14, 7);
        };
        const corTemp = temp >= LIMITE_DESLIGA ? CORES.erro : temp >= LIMITE_QUENTE ? CORES.aviso : CORES.sucesso;
        barra(130, (temp - 20) / 100, corTemp);
        valorTemp.setText(temp ? `${Math.round(temp)} °C` : '--').setColor(`#${corTemp.toString(16)}`);
        if (fonte) {
          const fracao = energia / fonte.potencia;
          barra(240, fracao, fracao > 1 ? CORES.erro : fracao > 0.87 ? CORES.aviso : CORES.info);
          valorEnergia.setText(`${Math.round(energia)} W / ${fonte.potencia} W`);
        }
      };
      desenharMedidores(0, 0);

      const linhas = ['BIOS v2.6 — iniciando...'];
      const icone = { ok: '✓', aviso: '!', erro: '✗' };
      let i = 0;
      const proxima = () => {
        if (i < teste.etapas.length) {
          const etapa = teste.etapas[i++];
          linhas.push(`${icone[etapa.tipo]} ${etapa.texto}`);
          tela.setText(linhas.join('\n'));
          if (etapa.tipo === 'erro') tela.setColor('#ff9a9a');
          this.cena.time.delayedCall(etapa.tipo === 'erro' ? 200 : 650, proxima);
          return;
        }
        this.finalizar(teste, desenharMedidores, rotuloTemp, resolver);
      };

      // Sobe temperatura e energia durante o teste de estresse
      const alvoTemp = teste.temperatura || (teste.motivo === 'superaquecimento' || teste.motivo === 'sem_cooler' ? 110 : 45);
      const alvoEnergia = teste.consumoPico || 0;
      const estado = { temp: 25, energia: 20 };
      this.cena.tweens.add({
        targets: estado,
        temp: alvoTemp,
        energia: alvoEnergia,
        duration: Math.max(1200, teste.etapas.length * 600),
        ease: 'Quad.easeIn',
        onUpdate: () => desenharMedidores(estado.temp, estado.energia),
      });

      this.cena.time.delayedCall(500, proxima);
    });
  }

  finalizar(teste, desenharMedidores, rotuloTemp, resolver) {
    if (!teste.sucesso) {
      this.cena.cameras.main.shake(300, 0.012);
      if (['superaquecimento', 'sem_cooler', 'fonte_fraca'].includes(teste.motivo)) {
        const fumaca = this.cena.add.particles(this.x0 + 230, this.y0 + 190, 'fumaca', {
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
    }
    const titulo = teste.sucesso ? 'Funcionou! 🎉' : 'Deu problema... 😬';
    this.texto(this.largura / 2, this.altura - 76, titulo, estiloTexto(20, teste.sucesso ? HEX.sucesso : HEX.erro)).setOrigin(0.5);
    const botao = new Botao(this.cena, LARGURA / 2, this.y0 + this.altura - 34, 'Ver avaliação', () => {
      this.fechar();
      resolver();
    }, { largura: 200, cor: 0x2f9e5b, tamanho: 16 });
    this.camada.add(botao);
  }
}

/** Avaliação do pedido: estrelas, requisitos, capricho e próximos passos. */
export class TelaResultado extends TelaSobreposta {
  constructor(cena) {
    super(cena, { largura: 760, altura: 480 });
  }

  mostrar(avaliacao, { aoConsertar, aoProximo, aoMenu, temProximo }) {
    const { estrelas, teste } = avaliacao;
    const titulos = ['Não passou no teste', 'Funciona, mas o cliente não ficou satisfeito', 'Cliente satisfeito!', 'Trabalho perfeito!'];
    this.texto(this.largura / 2, 30, titulos[estrelas], estiloTexto(24, estrelas >= 2 ? HEX.sucesso : estrelas === 1 ? HEX.aviso : HEX.erro)).setOrigin(0.5);

    for (let i = 0; i < 3; i++) {
      const estrela = this.cena.add.image(LARGURA / 2 + (i - 1) * 64, this.y0 + 84, i < estrelas ? 'estrela' : 'estrela-vazia').setScale(0);
      this.camada.add(estrela);
      this.cena.tweens.add({ targets: estrela, scale: 1.8, duration: 300, delay: 200 + i * 250, ease: 'Back.easeOut' });
    }

    let y = 122;
    if (!teste.sucesso) {
      this.texto(30, y, `❗ ${teste.explicacao}`, estiloTexto(15, HEX.erro, { wordWrap: { width: this.largura - 60 } }));
      y += 44;
    }

    const coluna = (x, titulo, itens) => {
      this.texto(x, y, titulo, estiloTexto(15, HEX.destaque));
      let yy = y + 26;
      for (const item of itens) {
        const linha = this.texto(x, yy, `${item.ok ? '✅' : '❌'} ${item.texto}`, estiloTexto(13, item.ok ? HEX.texto : HEX.erro, { wordWrap: { width: 320 } }));
        const detalhe = this.texto(x + 22, yy + linha.height + 1, item.detalhe, estiloTexto(11, HEX.textoSuave, { wordWrap: { width: 300 } }));
        yy += linha.height + detalhe.height + 8;
      }
      return yy;
    };
    const fim = Math.max(coluna(30, 'O que o cliente pediu', avaliacao.requisitos), coluna(400, 'Capricho na montagem', avaliacao.capricho));

    if (avaliacao.dicas.length) this.texto(400, Math.min(fim + 4, this.altura - 110), `💡 ${avaliacao.dicas[0]}`, estiloTexto(12, HEX.info, { wordWrap: { width: 330 } }));

    if (estrelas > 0) {
      this.camada.add(this.cena.add.image(this.x0 + 40, this.y0 + this.altura - 34, 'moeda').setScale(1.4));
      this.texto(58, this.altura - 46, `+${avaliacao.moedas} moedas`, estiloTexto(18, HEX.destaque));
    }

    const botoes = [];
    if (estrelas < 3) botoes.push(['🔧 Voltar e melhorar', () => aoConsertar(), CORES.painelClaro]);
    if (estrelas > 0 && temProximo) botoes.push(['Próximo pedido →', () => aoProximo(), 0x2f9e5b]);
    botoes.push(['Menu', () => aoMenu(), CORES.painelClaro]);
    botoes.forEach(([rotulo, acao, cor], i) => {
      const x = this.x0 + this.largura - 24 - (botoes.length - i) * 190 + 95;
      this.camada.add(new Botao(this.cena, x, this.y0 + this.altura - 34, rotulo, () => {
        this.fechar();
        acao();
      }, { largura: 180, cor, tamanho: 14 }));
    });
  }
}
