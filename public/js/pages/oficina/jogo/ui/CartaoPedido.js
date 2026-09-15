import { CORES, HEX, estiloTexto } from '../constantes.js';
import { formatarPreco } from '../../regras/catalogo.js';
import { Orcamento } from '../../regras/pedidos.js';
import { desenharPainel, encolherTexto } from './componentes.js';

/** Cartão do cliente à esquerda: fala, requisitos (marcados ao vivo) e custo × orçamento. */
export class CartaoPedido {
  constructor(cena, ret, pedido) {
    this.cena = cena;
    this.ret = ret;
    this.pedido = pedido;
    const { x, y, width: w } = ret;

    const g = cena.add.graphics();
    desenharPainel(g, x, y, w, ret.height, { raio: 12 });

    cena.add.image(x + 42, y + 42, pedido.avatar).setDisplaySize(60, 60);
    encolherTexto(cena.add.text(x + 80, y + 24, pedido.cliente, estiloTexto(17, HEX.texto)), w - 92, 13);
    cena.add.text(x + 80, y + 48, 'Cliente', estiloTexto(12, HEX.textoSuave));

    const balao = cena.add.text(x + 16, y + 84, pedido.fala, estiloTexto(13, '#1b2033', { wordWrap: { width: w - 40 }, lineSpacing: 3 }));
    const gb = cena.add.graphics();
    gb.fillStyle(0xf1f3fb, 1).fillRoundedRect(x + 8, y + 76, w - 16, balao.height + 16, 10);
    gb.fillTriangle(x + 30, y + 76, x + 44, y + 76, x + 36, y + 66);
    balao.setDepth(1);

    this.topoRequisitos = y + 76 + balao.height + 30;
    cena.add.text(x + 14, this.topoRequisitos - 4, 'O cliente quer:', estiloTexto(13, HEX.destaque));
    this.itens = pedido.requisitos.map((r, i) => {
      const linha = cena.add.text(x + 14, this.topoRequisitos + 18 + i * 34, '', estiloTexto(12, HEX.texto, { wordWrap: { width: w - 28 }, lineSpacing: 2 }));
      return { requisito: r, linha };
    });

    this.custo = cena.add.text(x + 14, ret.bottom - 58, '', estiloTexto(13));
    this.barra = cena.add.graphics();
    this.orcamento = pedido.requisitos.find((r) => r instanceof Orcamento);
  }

  atualizar(montagem) {
    for (const { requisito, linha } of this.itens) {
      if (requisito instanceof Orcamento) {
        linha.setText(`💰 ${requisito.texto}`).setColor(HEX.texto);
        continue;
      }
      const { ok } = requisito.avaliar(montagem, null);
      linha.setText(`${ok ? '✅' : '⬜'} ${requisito.texto}`).setColor(ok ? HEX.sucesso : HEX.texto);
    }

    const custo = montagem.custoPecas();
    const maximo = this.orcamento ? this.orcamento.maximo : custo || 1;
    const passou = custo > maximo;
    this.custo.setText(`Peças: ${formatarPreco(custo)}\nde ${formatarPreco(maximo)}`).setColor(passou ? HEX.erro : HEX.texto);

    const { x, width: w, bottom } = this.ret;
    this.barra.clear();
    this.barra.fillStyle(0x1b2033, 1).fillRoundedRect(x + 14, bottom - 18, w - 28, 8, 4);
    this.barra.fillStyle(passou ? CORES.erro : custo / maximo > 0.85 ? CORES.aviso : CORES.sucesso, 1).fillRoundedRect(x + 14, bottom - 18, (w - 28) * Math.min(1, custo / maximo), 8, 4);
  }
}
