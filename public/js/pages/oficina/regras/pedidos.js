import { PECAS, formatarPreco } from './catalogo.js';
import { LIMITE_QUENTE } from './SimuladorTeste.js';

/**
 * Requisitos de um pedido. Cada subclasse sabe se foi atendida e explica
 * o porquê — é isso que o aluno lê no fim do pedido.
 */
export class Requisito {
  /** @returns {string} texto curto mostrado no cartão do pedido */
  get texto() {
    return '';
  }

  /** @abstract @returns {{ ok: boolean, detalhe: string }} */
  avaliar(montagem, teste) { // eslint-disable-line no-unused-vars
    throw new Error('avaliar() não implementado');
  }
}

export class RamMinima extends Requisito {
  constructor(gb) {
    super();
    this.gb = gb;
  }

  get texto() {
    return `${this.gb} GB de memória RAM`;
  }

  avaliar(m) {
    const total = m.ramTotalGb();
    return { ok: total >= this.gb, detalhe: `Montado com ${total} GB de RAM.` };
  }
}

export class SsdMinimo extends Requisito {
  constructor(gb) {
    super();
    this.gb = gb;
  }

  get texto() {
    return `SSD de pelo menos ${this.gb >= 1000 ? `${this.gb / 1000} TB` : `${this.gb} GB`}`;
  }

  avaliar(m) {
    const total = m.armazenamentoTotalGb({ somenteSsd: true });
    return { ok: total >= this.gb, detalhe: total ? `SSD somando ${total} GB.` : 'Nenhum SSD instalado.' };
  }
}

export class ArmazenamentoMinimo extends Requisito {
  constructor(gb) {
    super();
    this.gb = gb;
  }

  get texto() {
    return `Pelo menos ${this.gb / 1000} TB de espaço no total`;
  }

  avaliar(m) {
    const total = m.armazenamentoTotalGb();
    return { ok: total >= this.gb, detalhe: `Espaço total: ${total >= 1000 ? `${total / 1000} TB` : `${total} GB`}.` };
  }
}

export class NucleosMinimos extends Requisito {
  constructor(nucleos) {
    super();
    this.nucleos = nucleos;
  }

  get texto() {
    return `Processador com ${this.nucleos} núcleos ou mais`;
  }

  avaliar(m) {
    const cpu = m.processador();
    return { ok: Boolean(cpu) && cpu.nucleos >= this.nucleos, detalhe: cpu ? `Processador de ${cpu.nucleos} núcleos.` : 'Sem processador.' };
  }
}

export class NivelDeVideoMinimo extends Requisito {
  constructor(nivel) {
    super();
    this.nivel = nivel;
  }

  get texto() {
    return `Placa de vídeo nível ${this.nivel} ou melhor`;
  }

  avaliar(m) {
    const gpu = m.placaDeVideo();
    return { ok: Boolean(gpu) && gpu.nivel >= this.nivel, detalhe: gpu ? `Placa de vídeo nível ${gpu.nivel}.` : 'Sem placa de vídeo dedicada.' };
  }
}

export class MelhorPlacaDeVideo extends Requisito {
  get texto() {
    return 'A melhor placa de vídeo da loja';
  }

  avaliar(m) {
    const melhor = Math.max(...PECAS.filter((p) => p.categoria === 'gpu').map((p) => p.nivel));
    const gpu = m.placaDeVideo();
    return { ok: Boolean(gpu) && gpu.nivel === melhor, detalhe: gpu ? `Escolheu: ${gpu.nome}.` : 'Sem placa de vídeo dedicada.' };
  }
}

export class SemPlacaDeVideo extends Requisito {
  get texto() {
    return 'Sem gastar com placa de vídeo';
  }

  avaliar(m) {
    const gpu = m.placaDeVideo();
    return { ok: !gpu, detalhe: gpu ? `Colocou ${gpu.nome}, que o cliente não precisa.` : 'Usou o vídeo integrado do processador.' };
  }
}

export class Orcamento extends Requisito {
  constructor(maximo) {
    super();
    this.maximo = maximo;
  }

  get texto() {
    return `Orçamento de até ${formatarPreco(this.maximo)}`;
  }

  avaliar(m) {
    const custo = m.custoPecas();
    return {
      ok: custo <= this.maximo,
      detalhe: custo <= this.maximo ? `Custou ${formatarPreco(custo)}.` : `Custou ${formatarPreco(custo)}: passou ${formatarPreco(custo - this.maximo)}.`,
    };
  }
}

export class TemperaturaSegura extends Requisito {
  get texto() {
    return 'Funcionar sem esquentar demais';
  }

  avaliar(m, teste) {
    if (!teste || !teste.sucesso) return { ok: false, detalhe: 'O PC não passou no teste.' };
    return { ok: teste.temperatura < LIMITE_QUENTE, detalhe: `Chegou a ${teste.temperatura} °C no teste de estresse.` };
  }
}

// ---------------- Pedidos ----------------

export const PEDIDOS = [
  {
    id: 'tutorial',
    tutorial: true,
    cliente: 'Dona Cida',
    avatar: 'cliente-cida',
    fala: 'Oi! Preciso de um computador simples para o escritório: 16 GB de memória e um SSD, por favor.',
    requisitos: [new RamMinima(16), new SsdMinimo(500), new Orcamento(300000)],
    recompensa: 150,
  },
  {
    id: 'ricardo',
    cliente: 'Professor Ricardo',
    avatar: 'cliente-ricardo',
    fala: 'Dou aula online: planilha, PDF e videochamada. Quero 16 GB de RAM e SSD. Não vou jogar, então nada de gastar com placa de vídeo!',
    requisitos: [new RamMinima(16), new SsdMinimo(500), new SemPlacaDeVideo(), new Orcamento(300000)],
    recompensa: 200,
  },
  {
    id: 'enzo',
    cliente: 'Enzo',
    avatar: 'cliente-enzo',
    fala: 'Quero um PC gamer com a melhor placa de vídeo do mercado, 32 GB de RAM e 1 TB de SSD!',
    requisitos: [new MelhorPlacaDeVideo(), new RamMinima(32), new SsdMinimo(1000), new Orcamento(1500000)],
    recompensa: 350,
  },
  {
    id: 'marina',
    cliente: 'Marina',
    avatar: 'cliente-marina',
    fala: 'Edito vídeos para o meu canal. Preciso de processador de 8 núcleos, 32 GB de RAM, uma placa de vídeo intermediária e pelo menos 2 TB de espaço.',
    requisitos: [new NucleosMinimos(8), new RamMinima(32), new NivelDeVideoMinimo(2), new ArmazenamentoMinimo(2000), new Orcamento(1100000)],
    recompensa: 400,
  },
];

/**
 * Avalia o pedido entregue:
 *  0 ★ — o PC não passou no teste
 *  1 ★ — funciona
 *  2 ★ — funciona e atende tudo que o cliente pediu (inclusive orçamento e temperatura)
 *  3 ★ — além disso, montado sem estragar peças e com capricho (pasta e parafusos certos)
 */
export class AvaliadorPedido {
  static avaliar(pedido, montagem, teste) {
    const requisitos = [...pedido.requisitos, new TemperaturaSegura()].map((r) => ({ texto: r.texto, ...r.avaliar(montagem, teste) }));
    const capricho = [];
    const { estado } = montagem;

    const danos = estado.ocorrencias.filter((o) => o.dano);
    capricho.push({ texto: 'Nenhuma peça estragada', ok: danos.length === 0 && estado.prejuizo === 0, detalhe: danos.length ? danos.map((d) => d.mensagem).join(' ') : 'Tudo inteiro.' });
    capricho.push({
      texto: 'Pasta térmica na medida',
      ok: estado.pasta === 'ideal',
      detalhe: { ideal: 'Grão de ervilha, perfeito.', pouca: 'Pouca pasta.', demais: 'Pasta demais escorreu.', nenhuma: 'Sem pasta térmica.' }[estado.pasta],
    });
    capricho.push({ texto: 'Cooler parafusado em X', ok: estado.parafusosEmX, detalhe: estado.parafusosEmX ? 'Pressão uniforme.' : 'Aperto fora de ordem.' });

    let estrelas = 0;
    if (teste.sucesso) {
      estrelas = 1;
      if (requisitos.every((r) => r.ok)) {
        estrelas = 2;
        if (capricho.every((c) => c.ok)) estrelas = 3;
      }
    }

    const dicas = [];
    if (montagem.memorias().length === 1) dicas.push('Dica: dois pentes iguais (dual channel) deixam a memória mais rápida que um pente só.');
    else if (montagem.memorias().length >= 2 && !montagem.dualChannel()) dicas.push('Dica: consulte o manual — os pentes em dual channel vão em slots específicos.');

    const moedas = estrelas === 0 ? 0 : Math.round((pedido.recompensa * estrelas) / 3) - Math.round(estado.prejuizo / 1000);

    return { estrelas, requisitos, capricho, dicas, moedas: Math.max(0, moedas), teste };
  }
}
