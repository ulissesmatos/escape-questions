// Estado da horta e o que o robô consegue fazer nela. JavaScript puro (sem
// desenho), testado com node:test.

export const DIRECOES = ['cima', 'direita', 'baixo', 'esquerda'];

const DESLOCAMENTO = {
  cima: [0, -1],
  direita: [1, 0],
  baixo: [0, 1],
  esquerda: [-1, 0],
};

/** Letra do mapa → tipo de casa */
const LETRAS = {
  '.': 'grama',
  t: 'terra', // terra vazia: precisa plantar
  m: 'madura', // planta madura: precisa colher
  b: 'broto', // planta verde: não pode colher
  s: 'sede', // planta com sede: precisa regar
  p: 'pedra',
  c: 'celeiro', // o robô precisa terminar aqui
};

// Tipos que aparecem depois de uma ação
// muda (plantou), colhida (colheu), regada (regou)

/**
 * Uma horta: grade de casas, moedas e o robô.
 * Mapa: lista de linhas com as letras de LETRAS; `o` é grama com moeda.
 */
export class Horta {
  constructor({ casas, moedas = [], robo }) {
    this.casas = casas.map((linha) => [...linha]);
    this.altura = this.casas.length;
    this.largura = this.casas[0].length;
    this.moedas = new Set(moedas.map(([x, y]) => `${x},${y}`));
    this.robo = { ...robo };
    this.moedasPegas = 0;
    this.metas = this.contarPendencias();
    this.metas.moedas = this.moedas.size;
    this.temCeleiro = this.casas.some((linha) => linha.includes('celeiro'));
  }

  static deMapa({ mapa, moedas = [], robo }) {
    const extras = [...moedas];
    const casas = mapa.map((linha, y) =>
      [...linha].map((letra, x) => {
        if (letra === 'o') {
          extras.push([x, y]);
          return 'grama';
        }
        const tipo = LETRAS[letra];
        if (!tipo) throw new Error(`Letra desconhecida no mapa: "${letra}"`);
        return tipo;
      })
    );
    const [x, y, dir = 'direita'] = robo;
    return new Horta({ casas, moedas: extras, robo: { x, y, dir } });
  }

  clonar() {
    const copia = Object.create(Horta.prototype);
    Object.assign(copia, this, {
      casas: this.casas.map((linha) => [...linha]),
      moedas: new Set(this.moedas),
      robo: { ...this.robo },
      metas: { ...this.metas },
    });
    return copia;
  }

  dentro(x, y) {
    return x >= 0 && y >= 0 && x < this.largura && y < this.altura;
  }

  casa(x, y) {
    return this.dentro(x, y) ? this.casas[y][x] : 'cerca';
  }

  temMoeda(x, y) {
    return this.moedas.has(`${x},${y}`);
  }

  frente() {
    const [dx, dy] = DESLOCAMENTO[this.robo.dir];
    return { x: this.robo.x + dx, y: this.robo.y + dy };
  }

  aqui() {
    return this.casa(this.robo.x, this.robo.y);
  }

  /** Sensores usados pelos blocos "Se" e "Repita até" */
  sensor(nome) {
    const aqui = this.aqui();
    switch (nome) {
      case 'madura':
        return aqui === 'madura';
      case 'sede':
        return aqui === 'sede';
      case 'vazia':
        return aqui === 'terra' || aqui === 'colhida';
      case 'bloqueio': {
        const { x, y } = this.frente();
        const tipo = this.casa(x, y);
        return tipo === 'cerca' || tipo === 'pedra';
      }
      case 'celeiro':
        return aqui === 'celeiro';
      default:
        throw new Error(`Sensor desconhecido: ${nome}`);
    }
  }

  /**
   * Executa uma ação. Devolve { ok, efeito?, erro? }.
   * Um erro para o robô (e o plano), com uma mensagem para o aluno.
   */
  agir(acao) {
    const { robo } = this;
    const aqui = this.aqui();
    switch (acao) {
      case 'andar': {
        const alvo = this.frente();
        const tipo = this.casa(alvo.x, alvo.y);
        if (tipo === 'cerca') return { ok: false, efeito: 'bater', erro: 'Opa! O robô bateu na cerca.' };
        if (tipo === 'pedra') return { ok: false, efeito: 'bater', erro: 'Opa! O robô bateu numa pedra.' };
        const de = { x: robo.x, y: robo.y };
        robo.x = alvo.x;
        robo.y = alvo.y;
        const chave = `${robo.x},${robo.y}`;
        const pegouMoeda = this.moedas.delete(chave);
        if (pegouMoeda) this.moedasPegas += 1;
        return { ok: true, efeito: pegouMoeda ? 'moeda' : 'andar', de };
      }
      case 'direita':
      case 'esquerda': {
        const passo = acao === 'direita' ? 1 : 3;
        robo.dir = DIRECOES[(DIRECOES.indexOf(robo.dir) + passo) % 4];
        return { ok: true, efeito: 'virar' };
      }
      case 'colher':
        if (aqui === 'madura') return this.trocar('colhida', 'colher');
        if (aqui === 'broto') return { ok: false, efeito: 'errar', erro: 'Essa planta ainda está verde! Só dá para colher as maduras.' };
        if (aqui === 'sede') return { ok: false, efeito: 'errar', erro: 'Essa planta está com sede, ela precisa de água e não de colheita.' };
        return { ok: false, efeito: 'errar', erro: 'Não tem nada para colher aqui.' };
      case 'plantar':
        if (aqui === 'terra' || aqui === 'colhida') return this.trocar('muda', 'plantar');
        if (aqui === 'grama' || aqui === 'celeiro') return { ok: false, efeito: 'errar', erro: 'Aqui não é terra! Só dá para plantar na terra.' };
        return { ok: false, efeito: 'errar', erro: 'Aqui já tem uma planta.' };
      case 'regar':
        if (aqui === 'sede') return this.trocar('regada', 'regar');
        if (aqui === 'madura' || aqui === 'broto' || aqui === 'regada' || aqui === 'muda') {
          return { ok: false, efeito: 'errar', erro: 'Essa planta não está com sede. Água demais afoga a planta!' };
        }
        return { ok: false, efeito: 'errar', erro: 'Não tem planta aqui para regar.' };
      default:
        throw new Error(`Ação desconhecida: ${acao}`);
    }
  }

  trocar(tipo, efeito) {
    this.casas[this.robo.y][this.robo.x] = tipo;
    return { ok: true, efeito };
  }

  contarPendencias() {
    const pendentes = { colher: 0, plantar: 0, regar: 0 };
    for (const linha of this.casas) {
      for (const tipo of linha) {
        if (tipo === 'madura') pendentes.colher += 1;
        else if (tipo === 'terra') pendentes.plantar += 1;
        else if (tipo === 'sede') pendentes.regar += 1;
      }
    }
    return pendentes;
  }

  /** O que ainda falta: { colher, plantar, regar, celeiro } */
  pendencias() {
    return { ...this.contarPendencias(), celeiro: this.temCeleiro && this.aqui() !== 'celeiro' };
  }

  concluida() {
    const p = this.pendencias();
    return p.colher === 0 && p.plantar === 0 && p.regar === 0 && !p.celeiro;
  }

  /** Frase curta do que faltou, para quando o plano termina antes da hora */
  descreverFalta() {
    const p = this.pendencias();
    const partes = [];
    if (p.colher) partes.push(`colher ${p.colher} ${p.colher === 1 ? 'planta' : 'plantas'}`);
    if (p.plantar) partes.push(`plantar em ${p.plantar} ${p.plantar === 1 ? 'terra' : 'terras'}`);
    if (p.regar) partes.push(`regar ${p.regar} ${p.regar === 1 ? 'planta' : 'plantas'}`);
    if (p.celeiro) partes.push('chegar no celeiro');
    if (!partes.length) return '';
    const texto = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`;
    return `As ordens acabaram, mas ainda faltou ${texto}.`;
  }
}
