// Fases do Robô na Horta, organizadas em mundos. Cada mundo libera blocos
// novos. A partir do mundo 3 a horta é sorteada e o mesmo plano precisa
// funcionar em 3 hortas diferentes: decorar o caminho não resolve, o aluno
// precisa de "Se" e "Repita até".

import { Horta } from './Horta.js';

/** Gerador de números com semente (mulberry32): a mesma semente dá as mesmas hortas */
export function criarSorteio(semente) {
  let a = semente >>> 0;
  const proximo = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    proximo,
    inteiro: (min, max) => min + Math.floor(proximo() * (max - min + 1)),
    escolher: (lista) => lista[Math.floor(proximo() * lista.length)],
    embaralhar(lista) {
      const copia = [...lista];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(proximo() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
    },
  };
}

export const MUNDOS = [
  { numero: 1, titulo: 'Primeiros passos', icone: '🌱', descricao: 'Dê ordens ao robô, uma de cada vez.' },
  { numero: 2, titulo: 'Repetindo', icone: '🔁', descricao: 'Faça o robô repetir sem precisar de tantos blocos.' },
  { numero: 3, titulo: 'Horta surpresa', icone: '❓', descricao: 'A horta muda a cada vez. O robô precisa olhar antes de agir.' },
  { numero: 4, titulo: 'Até quando?', icone: '⏳', descricao: 'Caminhos de tamanho diferente. O robô repete até chegar lá.' },
];

const BASICOS = ['andar', 'direita', 'esquerda', 'colher'];
const TODAS_ACOES = [...BASICOS, 'plantar', 'regar'];

// ---------- geradores das hortas sorteadas ----------

/** Linha de n casas sorteadas, com pelo menos `minimo` de cada letra */
function sortearLinha(sorteio, n, letras, minimo = 1) {
  for (;;) {
    const linha = Array.from({ length: n }, () => sorteio.escolher(letras));
    if (letras.every((l) => linha.filter((c) => c === l).length >= minimo)) return linha.join('');
  }
}

function moedasNaLinha(sorteio, y, xs, quantas) {
  return sorteio.embaralhar(xs).slice(0, quantas).map((x) => [x, y]);
}

function fileiraSorteada(letras, minimo) {
  return (sorteio) => {
    const linha = sortearLinha(sorteio, 6, letras, minimo);
    return {
      mapa: ['........', `.${linha}.`, '........'],
      moedas: moedasNaLinha(sorteio, 1, [1, 2, 3, 4, 5, 6], 2),
      robo: [0, 1, 'direita'],
    };
  };
}

function pomarSorteado(sorteio) {
  let casas;
  do {
    casas = Array.from({ length: 12 }, () => sorteio.escolher(['m', 'm', 'b']));
  } while (casas.filter((c) => c === 'b').length < 3 || casas.filter((c) => c === 'm').length < 4);
  const linhas = [0, 1, 2].map((y) => `.${casas.slice(y * 4, y * 4 + 4).join('')}`);
  return { mapa: [...linhas, '.....'], moedas: moedasNaLinha(sorteio, 3, [1, 2, 3, 4], 2), robo: [0, 3, 'direita'] };
}

/** Fileira de tamanho sorteado que termina numa pedra */
function corredorSorteado(letras) {
  return (sorteio, indice) => {
    const tamanho = [3, 5, 7, 4, 6, 8][(indice + sorteio.inteiro(0, 5)) % 6];
    const linha = letras.length > 1 ? sortearLinha(sorteio, tamanho, letras) : letras[0].repeat(tamanho);
    const meio = `.${linha}p`.padEnd(10, '.');
    return {
      mapa: ['..........', meio, '..........'],
      moedas: moedasNaLinha(sorteio, 1, Array.from({ length: tamanho }, (_, i) => i + 1), 1),
      robo: [0, 1, 'direita'],
    };
  };
}

/** Caminho em espiral (direita, desce, volta) até o celeiro; o resto é pedra */
function caminhoSorteado(comPlantas) {
  return (sorteio) => {
    const l1 = sorteio.inteiro(2, 5);
    const l2 = sorteio.inteiro(1, 3);
    const l3 = sorteio.inteiro(1, l1);
    const grade = Array.from({ length: 5 }, () => Array(7).fill('p'));
    const caminho = [];
    for (let x = 0; x <= l1; x++) caminho.push([x, 0]);
    for (let y = 1; y <= l2; y++) caminho.push([l1, y]);
    for (let x = l1 - 1; x >= l1 - l3; x--) caminho.push([x, l2]);
    const meio = caminho.slice(1, -1);
    for (const [x, y] of caminho) grade[y][x] = '.';
    if (comPlantas) {
      let letras;
      do {
        letras = meio.map(() => sorteio.escolher(['m', 'b', '.']));
      } while (!letras.includes('m') || !letras.includes('b'));
      meio.forEach(([x, y], i) => (grade[y][x] = letras[i]));
    }
    const [cx, cy] = caminho[caminho.length - 1];
    grade[cy][cx] = 'c';
    return { mapa: grade.map((l) => l.join('')), moedas: sorteio.embaralhar(meio).slice(0, 2), robo: [0, 0, 'direita'] };
  };
}

// ---------- fases ----------

export const FASES = [
  {
    id: '1-1',
    mundo: 1,
    titulo: 'Primeira colheita',
    fala: 'Oi! Eu sou o Bip. Clique nos blocos para montar meu plano e aperte ▶ Rodar. Tem um tomate maduro ali na frente!',
    blocos: ['andar', 'colher'],
    novos: ['andar', 'colher'],
    meta: 5,
    mapa: { mapa: ['.....', '..o.m', '.....'], robo: [0, 1, 'direita'] },
  },
  {
    id: '1-2',
    mundo: 1,
    titulo: 'Virando a esquina',
    fala: 'Agora eu sei virar! A direita e a esquerda são as minhas, olhando para onde eu estou virado.',
    blocos: BASICOS,
    novos: ['direita', 'esquerda'],
    meta: 6,
    mapa: { mapa: ['...p.', '..o..', '..m..'], robo: [0, 0, 'direita'] },
  },
  {
    id: '1-3',
    mundo: 1,
    titulo: 'Duas plantas',
    fala: 'Duas plantas maduras! Cuidado com a minha esquerda quando eu estiver virado para baixo.',
    blocos: BASICOS,
    meta: 10,
    mapa: { mapa: ['..m.p', '..o.p', '...om'], robo: [0, 0, 'direita'] },
  },
  {
    id: '1-4',
    mundo: 1,
    titulo: 'Hora de plantar',
    fala: 'Terra vazia é terra triste. Plante uma semente em cada pedaço de terra marrom.',
    blocos: [...BASICOS, 'plantar'],
    novos: ['plantar'],
    meta: 9,
    mapa: { mapa: ['.tot.', 'p...t', '.....'], robo: [0, 0, 'direita'] },
  },
  {
    id: '1-5',
    mundo: 1,
    titulo: 'Planta com sede',
    fala: 'As plantas murchas estão com sede. Regue essas e colha as maduras.',
    blocos: TODAS_ACOES,
    novos: ['regar'],
    meta: 10,
    mapa: { mapa: ['.som.', '...s.', '.p.m.'], robo: [0, 0, 'direita'] },
  },

  {
    id: '2-1',
    mundo: 2,
    titulo: 'Fileira de tomates',
    fala: 'Ufa, são muitos blocos iguais! O bloco Repita faz o que estiver dentro dele várias vezes.',
    blocos: [...TODAS_ACOES, 'repita'],
    novos: ['repita'],
    meta: 3,
    mapa: { mapa: ['........', '.mmmmmm.', '........'], moedas: [[3, 1], [6, 1]], robo: [0, 1, 'direita'] },
  },
  {
    id: '2-2',
    mundo: 2,
    titulo: 'Volta no canteiro',
    fala: 'Colha nas quatro pontas do canteiro. Repare que o caminho é igual nos quatro lados!',
    blocos: [...TODAS_ACOES, 'repita'],
    meta: 7,
    mapa: { mapa: ['m...m', '.ppp.', '.ppp.', '.ppp.', 'm...m'], moedas: [[2, 0], [4, 2], [2, 4], [0, 2]], robo: [0, 0, 'direita'] },
  },
  {
    id: '2-3',
    mundo: 2,
    titulo: 'Canteiro gigante',
    fala: 'O canteiro cresceu! Dá para colocar um Repita dentro de outro Repita.',
    blocos: [...TODAS_ACOES, 'repita'],
    meta: 5,
    mapa: {
      mapa: ['m.....m', '.ppppp.', '.ppppp.', '.ppppp.', '.ppppp.', '.ppppp.', 'm.....m'],
      moedas: [[3, 0], [6, 3], [3, 6], [0, 3]],
      robo: [0, 0, 'direita'],
    },
  },
  {
    id: '2-4',
    mundo: 2,
    titulo: 'Escadinha',
    fala: 'Suba a escadinha colhendo cada degrau. Qual pedaço do caminho se repete?',
    blocos: [...TODAS_ACOES, 'repita'],
    meta: 6,
    mapa: { mapa: ['....m', '...m.', '..m..', '.m...', '.....'], moedas: [[1, 4], [3, 2]], robo: [0, 4, 'direita'] },
  },
  {
    id: '2-5',
    mundo: 2,
    titulo: 'Pomar',
    fala: 'Um pomar inteiro! Suba cada coluna colhendo, desça e vá para a próxima.',
    blocos: [...TODAS_ACOES, 'repita'],
    meta: 11,
    mapa: { mapa: ['.mmmm', '.mmmm', '.mmmm', '.....'], moedas: [[2, 3], [4, 3]], robo: [0, 3, 'direita'] },
  },

  {
    id: '3-1',
    mundo: 3,
    titulo: 'Só as maduras',
    fala: 'Essa horta muda toda vez! Não dá para decorar. Use o Se para eu olhar antes de colher.',
    blocos: [...TODAS_ACOES, 'repita', 'se'],
    novos: ['se'],
    condicoes: ['madura'],
    meta: 4,
    variantes: 3,
    gerar: fileiraSorteada(['m', 'b'], 2),
  },
  {
    id: '3-2',
    mundo: 3,
    titulo: 'Regar ou colher?',
    fala: 'Cada planta ou está com sede, ou está madura. O bloco Se... senão escolhe entre duas coisas.',
    blocos: [...TODAS_ACOES, 'repita', 'se', 'seSenao'],
    novos: ['seSenao'],
    condicoes: ['sede', 'madura'],
    meta: 5,
    variantes: 3,
    gerar: fileiraSorteada(['s', 'm'], 2),
  },
  {
    id: '3-3',
    mundo: 3,
    titulo: 'Plantar ou colher?',
    fala: 'Terra vazia: plante. Planta madura: colha. Planta verde: deixe crescer!',
    blocos: [...TODAS_ACOES, 'repita', 'se', 'seSenao'],
    condicoes: ['vazia', 'madura'],
    meta: 6,
    variantes: 3,
    gerar: fileiraSorteada(['t', 'm', 'b'], 1),
  },
  {
    id: '3-4',
    mundo: 3,
    titulo: 'Pomar surpresa',
    fala: 'O pomar voltou, mas agora tem fruta verde no meio. Junte tudo o que você já aprendeu!',
    blocos: [...TODAS_ACOES, 'repita', 'se', 'seSenao'],
    condicoes: ['madura'],
    meta: 12,
    variantes: 3,
    gerar: pomarSorteado,
  },

  {
    id: '4-1',
    mundo: 4,
    titulo: 'Até a pedra',
    fala: 'Cada fileira tem um tamanho. O Repita até faz eu repetir até acontecer alguma coisa.',
    blocos: [...TODAS_ACOES, 'repita', 'repitaAte', 'se', 'seSenao'],
    novos: ['repitaAte'],
    condicoes: ['bloqueio'],
    meta: 3,
    variantes: 3,
    gerar: corredorSorteado(['m']),
  },
  {
    id: '4-2',
    mundo: 4,
    titulo: 'Colha até a pedra',
    fala: 'Tamanho diferente e plantas diferentes. Vou precisar repetir e também olhar!',
    blocos: [...TODAS_ACOES, 'repita', 'repitaAte', 'se', 'seSenao'],
    condicoes: ['bloqueio', 'madura'],
    meta: 4,
    variantes: 3,
    gerar: corredorSorteado(['m', 'b']),
  },
  {
    id: '4-3',
    mundo: 4,
    titulo: 'Caminho do celeiro',
    fala: 'Me leve até o celeiro! O caminho muda, mas sempre que aparece uma pedra na frente é hora de virar à direita.',
    blocos: [...TODAS_ACOES, 'repita', 'repitaAte', 'se', 'seSenao'],
    condicoes: ['celeiro', 'bloqueio'],
    meta: 4,
    variantes: 3,
    gerar: caminhoSorteado(false),
  },
  {
    id: '4-4',
    mundo: 4,
    titulo: 'Grande colheita',
    fala: 'O desafio final: siga o caminho até o celeiro colhendo só as plantas maduras. Você consegue!',
    blocos: [...TODAS_ACOES, 'repita', 'repitaAte', 'se', 'seSenao'],
    condicoes: ['celeiro', 'bloqueio', 'madura'],
    meta: 6,
    variantes: 3,
    gerar: caminhoSorteado(true),
  },
];

/** As hortas de uma fase: a fixa, ou `variantes` hortas sorteadas diferentes entre si */
export function montarHortas(fase, semente = Date.now()) {
  if (!fase.gerar) return [Horta.deMapa(fase.mapa)];
  const sorteio = criarSorteio(semente);
  const vistas = new Set();
  const hortas = [];
  for (let tentativa = 0; hortas.length < fase.variantes && tentativa < 50; tentativa++) {
    const def = fase.gerar(sorteio, hortas.length);
    const chave = def.mapa.join('/');
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    hortas.push(Horta.deMapa(def));
  }
  return hortas;
}

/**
 * Estrelas: 1 por completar, +1 por usar no máximo `meta` blocos,
 * +1 por pegar todas as moedas (em todas as hortas).
 */
export function calcularEstrelas(fase, { blocos, moedasPegas, moedasTotal }) {
  return 1 + (blocos <= fase.meta ? 1 : 0) + (moedasPegas >= moedasTotal ? 1 : 0);
}
