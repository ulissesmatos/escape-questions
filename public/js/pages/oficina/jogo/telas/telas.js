import { LARGURA, ALTURA, CORES, HEX, estiloTexto } from '../constantes.js';
import { Botao, desenharPainel } from '../ui/componentes.js';
import { somDa } from '../audio/SomDaOficina.js';

/** Base das telas sobrepostas (ligar o PC e resultado) */
export class TelaSobreposta {
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

/** Avaliação do pedido: estrelas, requisitos, capricho e próximos passos. */
export class TelaResultado extends TelaSobreposta {
  constructor(cena) {
    super(cena, { largura: 760, altura: 480 });
  }

  mostrar(avaliacao, { aoConsertar, aoProximo, aoMenu, temProximo }) {
    const { estrelas, teste } = avaliacao;
    const titulos = ['Não passou no teste', 'Funciona, mas o cliente não ficou satisfeito', 'Cliente satisfeito!', 'Trabalho perfeito!'];
    this.texto(this.largura / 2, 30, titulos[estrelas], estiloTexto(24, estrelas >= 2 ? HEX.sucesso : estrelas === 1 ? HEX.aviso : HEX.erro)).setOrigin(0.5);

    const som = somDa(this.cena);
    for (let i = 0; i < 3; i++) {
      const ganhou = i < estrelas;
      const estrela = this.cena.add.image(LARGURA / 2 + (i - 1) * 64, this.y0 + 84, ganhou ? 'estrela' : 'estrela-vazia').setScale(0);
      this.camada.add(estrela);
      this.cena.tweens.add({
        targets: estrela,
        scale: 1.8,
        duration: 300,
        delay: 200 + i * 250,
        ease: 'Back.easeOut',
        onStart: () => ganhou && som.efeito('estrela', { tom: i * 4 }),
      });
    }
    if (estrelas > 0) this.cena.time.delayedCall(250 + 3 * 250, () => som.efeito('moeda'));

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
