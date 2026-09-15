import { LARGURA, ALTURA, CORES, HEX, estiloTexto } from '../constantes.js';
import { Botao, desenharPainel } from '../ui/componentes.js';

/**
 * Base dos minigames de habilidade (skill checks). Abre uma janela por
 * cima da oficina e devolve uma Promise com o resultado — ou null se o
 * jogador cancelar. Subclasses implementam montar(conteudo).
 */
export class SkillCheck {
  static largura = 560;
  static altura = 400;

  constructor(cena, { titulo, instrucao }) {
    this.cena = cena;
    this.titulo = titulo;
    this.instrucao = instrucao;
  }

  abrir() {
    return new Promise((resolver) => {
      this.resolver = resolver;
      const { largura: w, altura: h } = this.constructor;
      this.camada = this.cena.add.container(0, 0).setDepth(1000);

      const fundo = this.cena.add.rectangle(LARGURA / 2, ALTURA / 2, LARGURA, ALTURA, 0x05070f, 0.72).setInteractive();
      const g = this.cena.add.graphics();
      desenharPainel(g, (LARGURA - w) / 2, (ALTURA - h) / 2, w, h, { raio: 16, cor: CORES.painel });
      const titulo = this.cena.add.text(LARGURA / 2, (ALTURA - h) / 2 + 22, this.titulo, estiloTexto(22, HEX.destaque)).setOrigin(0.5);
      const instrucao = this.cena.add
        .text(LARGURA / 2, (ALTURA - h) / 2 + 50, this.instrucao, estiloTexto(13, HEX.texto, { align: 'center', wordWrap: { width: w - 60 } }))
        .setOrigin(0.5, 0);
      const fechar = new Botao(this.cena, (LARGURA + w) / 2 - 26, (ALTURA - h) / 2 + 24, '✕', () => this.concluir(null), { largura: 34, altura: 30 });

      this.camada.add([fundo, g, titulo, instrucao, fechar]);
      this.conteudo = this.cena.add.container(LARGURA / 2, ALTURA / 2 + 30);
      this.camada.add(this.conteudo);
      this.montar(this.conteudo);

      this.camada.setAlpha(0);
      this.cena.tweens.add({ targets: this.camada, alpha: 1, duration: 150 });
    });
  }

  /** @abstract */
  montar(conteudo) { // eslint-disable-line no-unused-vars
    throw new Error('montar() não implementado');
  }

  concluir(resultado) {
    if (!this.resolver) return;
    const resolver = this.resolver;
    this.resolver = null;
    this.aoFechar();
    this.cena.tweens.add({
      targets: this.camada,
      alpha: 0,
      duration: 150,
      onComplete: () => this.camada.destroy(),
    });
    resolver(resultado);
  }

  /** Gancho para limpar eventos/timers */
  aoFechar() {}

  mensagem(texto, cor = HEX.texto) {
    if (!this.textoMensagem) {
      this.textoMensagem = this.cena.add.text(0, this.constructor.altura / 2 - 92, '', estiloTexto(15, cor)).setOrigin(0.5);
      this.conteudo.add(this.textoMensagem);
    }
    this.textoMensagem.setText(texto).setColor(cor);
  }
}
