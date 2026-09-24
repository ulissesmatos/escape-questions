import { CORES, HEX, estiloTexto } from './constantes.js';
import { peca as buscarPeca } from '../regras/catalogo.js';
import { Ponteiro } from './ui/componentes.js';
import { somDa } from './audio/SomDaOficina.js';

/**
 * Passos do primeiro pedido. Cada passo diz o que fazer, qual peça ou botão
 * está liberado e quando foi concluído. Nos pedidos seguintes não há guia.
 */
const PASSOS = [
  {
    texto: 'Bem-vindo(a) à oficina! Tudo começa pela PLACA-MÃE: arraste a placa-mãe "ASUS Prime A520M-K" (socket AM4) da bandeja para a bancada.',
    peca: 'pm-am4-matx',
    feito: (m) => Boolean(m.placa()),
  },
  {
    texto: 'Agora o PROCESSADOR. Ele precisa ter o MESMO socket da placa-mãe (AM4). Arraste o "AMD Ryzen 5 5600G" até o socket e siga as etapas da janela. (O "G" no nome indica que ele tem vídeo integrado.)',
    peca: 'cpu-am4-6g',
    feito: (m) => Boolean(m.processador()),
  },
  {
    texto: 'PASTA TÉRMICA: ela ajuda o calor a sair do processador. Abra "Ferramentas" e arraste a pasta até o processador.',
    peca: 'pasta-termica',
    feito: (m) => m.estado.pasta !== 'nenhuma',
  },
  {
    texto: 'O COOLER vai em cima do processador e da pasta. Arraste o "Cooler box simples".',
    peca: 'cooler-box',
    feito: (m) => Boolean(m.cooler()),
  },
  {
    texto: 'MEMÓRIA: esta placa usa DDR4. Coloque DOIS pentes "Kingston Fury Beast DDR4 8 GB" (16 GB no total).',
    peca: 'ram-ddr4-8',
    feito: (m) => m.memorias().length >= 2,
  },
  {
    texto: 'ARMAZENAMENTO: arraste o "SSD M.2 NVMe 500 GB" para o slot M.2 da placa.',
    peca: 'ssd-nvme-500',
    feito: (m) => m.armazenamentos().length >= 1,
  },
  {
    texto: 'Agora o GABINETE, a "caixa" do computador. Arraste o "Gabinete Mini Tower".',
    peca: 'gab-mini',
    feito: (m) => Boolean(m.gabinete()),
  },
  {
    texto: 'Clique em "Placa → gabinete" para parafusar a placa-mãe dentro do gabinete.',
    botao: 'placa-gabinete',
    feito: (m) => m.estado.placaNoGabinete,
  },
  {
    texto: 'A FONTE leva energia para todas as peças. Arraste a "Fonte 450 W" para a baia de baixo do gabinete.',
    peca: 'fonte-450',
    feito: (m) => Boolean(m.fonte()),
  },
  {
    texto: 'Sem cabo, nada liga! Clique em "Ligar cabos" e conecte cada plugue na entrada certa.',
    botao: 'cabos',
    feito: (m) => m.estado.cabos.placa && m.estado.cabos.cpu,
  },
  {
    texto: 'Tudo montado! Clique em "Fechar tampa".',
    botao: 'tampa',
    feito: (m) => m.estado.tampaFechada,
  },
  {
    texto: 'Hora da verdade: clique em "Ligar e testar"! ⚡',
    botao: 'testar',
    feito: (m, cena) => cena.testou,
  },
];

/** Passo extra enquanto houver placa com pinos tortos: sem trocar a placa, nada mais encaixa */
const TROCAR_PLACA_ESTRAGADA = {
  texto: 'Ops! Os pinos do socket entortaram e essa placa-mãe estragou. Arraste a placa da bancada de volta para a bandeja para descartá-la e comece com uma nova.',
  encaixe: 'placa',
  recuperacao: true,
};

export class Tutorial {
  constructor(cena, x, y, largura) {
    this.cena = cena;
    this.indice = 0;
    this.ponteiro = new Ponteiro(cena);
    this.balao = cena.add.container(x, y).setDepth(940);
    this.fundo = cena.add.graphics();
    this.texto = cena.add.text(0, 0, '', estiloTexto(14, HEX.texto, { wordWrap: { width: largura - 40 }, lineSpacing: 3, align: 'left' })).setOrigin(0.5, 1);
    this.etapa = cena.add.text(0, 0, '', estiloTexto(11, HEX.destaque)).setOrigin(0.5, 1);
    this.balao.add([this.fundo, this.texto, this.etapa]);
    this.largura = largura;
  }

  get passo() {
    if (this.cena.montagem.estado.placaDanificada) return TROCAR_PLACA_ESTRAGADA;
    return PASSOS[this.indice] || null;
  }

  get concluido() {
    return this.indice >= PASSOS.length;
  }

  permiteArrastar(idPeca) {
    const { passo } = this;
    if (!passo) return true;
    if (passo.recuperacao) return false; // primeiro descarta a placa estragada
    return !passo.peca || passo.peca === idPeca;
  }

  permiteBotao(id) {
    return !this.passo || !this.passo.botao || this.passo.botao === id;
  }

  /** Mensagem para quando o jogador tenta outra coisa */
  get lembrete() {
    return this.passo ? `Siga o tutorial: ${this.passo.texto}` : '';
  }

  atualizar() {
    // O passo vem do estado da montagem (não só avança): se o jogador desfaz
    // algo, como tirar a placa-mãe, o tutorial volta para o passo certo
    const { montagem } = this.cena;
    const pendente = PASSOS.findIndex((p) => !p.feito(montagem, this.cena));
    const anterior = this.indice;
    this.indice = pendente === -1 ? PASSOS.length : pendente;
    if (this.indice > anterior) somDa(this.cena).efeito('passo');

    if (!this.passo) {
      this.balao.setVisible(false);
      this.ponteiro.esconder();
      return;
    }

    const titulo = this.passo.recuperacao ? 'TUTORIAL · VAMOS CONSERTAR' : `TUTORIAL · PASSO ${this.indice + 1} DE ${PASSOS.length}`;
    this.texto.setText(this.passo.texto).setPosition(0, -14);
    this.etapa.setText(titulo).setPosition(0, -this.texto.height - 20);
    const h = this.texto.height + 40;
    this.fundo.clear();
    this.fundo.fillStyle(0x000000, 0.35).fillRoundedRect(-this.largura / 2, -h + 3, this.largura, h, 12);
    this.fundo.fillStyle(0x12152a, 0.94).fillRoundedRect(-this.largura / 2, -h, this.largura, h, 12);
    this.fundo.lineStyle(2, CORES.destaque, 1).strokeRoundedRect(-this.largura / 2, -h, this.largura, h, 12);
    this.balao.setVisible(!this.cena.ocupado);
    this.apontar();
  }

  apontar() {
    const cena = this.cena;
    if (cena.ocupado || !this.passo) {
      this.ponteiro.esconder();
      return;
    }
    let alvo = null;
    if (this.passo.encaixe) {
      alvo = cena.arraste ? cena.bandeja.centroLista() : cena.centroPecaInstalada(this.passo.encaixe);
    } else if (this.passo.botao) {
      const botao = cena.botoes.get(this.passo.botao);
      alvo = botao && { x: botao.x, y: botao.y - 18 };
    } else if (this.passo.peca) {
      const p = buscarPeca(this.passo.peca);
      if (cena.arraste) alvo = cena.centroZonaValida();
      else if (cena.bandeja.categoria !== p.categoria) alvo = cena.bandeja.posicaoCategoria(p.categoria);
      else alvo = cena.bandeja.posicaoPeca(p.id);
    }
    if (alvo) this.ponteiro.apontar(alvo.x, alvo.y);
    else this.ponteiro.esconder();
  }
}
