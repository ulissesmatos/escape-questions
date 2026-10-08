// Fases do Robô na Horta, organizadas em mundos. Cada mundo libera blocos
// novos (o mundo 3 ensina a combinar: um Repita dentro de outro). A partir
// do mundo 4 a horta é sorteada e o mesmo plano precisa funcionar em 3
// hortas diferentes: decorar o caminho não resolve, o aluno precisa de "Se"
// e "Repita até".
//
// Campos de cada fase:
//   id            chave do progresso salvo (não muda, mesmo se a fase mudar de lugar)
//   rotulo        número que aparece na tela ("3-2"), calculado pela posição
//   meta          até quantos blocos vale a estrela
//   memoria       limite de blocos: o robô não roda um plano maior (obriga o Repita)
//   planoInicial  plano que já vem montado, para o aluno completar
//   solucao       uma solução de referência: alimenta as dicas e os testes

import { Horta } from './Horta.js';
import { planoCurto } from './blocos.js';

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
  {
    numero: 3,
    titulo: 'Repita dentro do Repita',
    icone: '🔄',
    descricao: 'Um Repita pode guardar outro, como os ponteiros do relógio: o de dentro gira rápido e o de fora anda um pouco a cada volta.',
    novidade: '🔁 dentro de 🔁',
  },
  { numero: 4, titulo: 'Horta surpresa', icone: '❓', descricao: 'A horta muda a cada vez. O robô precisa olhar antes de agir.' },
  { numero: 5, titulo: 'Até quando?', icone: '⏳', descricao: 'Caminhos de tamanho diferente. O robô repete até chegar lá.' },
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

const SO_REPITA = [...TODAS_ACOES, 'repita'];
// Uma coluna do pomar: entra, sobe colhendo, dá meia-volta e desce
const COLUNA = ['andar', 'esquerda', ['repita', 3, ['andar', 'colher']], 'direita', 'direita', ['repita', 3, ['andar']]];

export const FASES = [
  // ---------------------------------------------------------------- Mundo 1
  {
    id: '1-1',
    mundo: 1,
    titulo: 'Primeira colheita',
    fala: 'Oi! Eu sou o Bip. Clique nos blocos para montar meu plano e aperte ▶ Rodar. Tem um tomate maduro ali na frente!',
    blocos: ['andar', 'colher'],
    novos: ['andar', 'colher'],
    meta: 5,
    mapa: { mapa: ['.....', '..o.m', '.....'], robo: [0, 1, 'direita'] },
    solucao: ['andar', 'andar', 'andar', 'andar', 'colher'],
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
    solucao: ['andar', 'andar', 'direita', 'andar', 'andar', 'colher'],
  },
  {
    id: '1-3',
    mundo: 1,
    titulo: 'Duas plantas',
    fala: 'Duas plantas maduras! Cuidado com a minha esquerda quando eu estiver virado para baixo.',
    blocos: BASICOS,
    meta: 10,
    mapa: { mapa: ['..m.p', '..o.p', '...om'], robo: [0, 0, 'direita'] },
    solucao: ['andar', 'andar', 'colher', 'direita', 'andar', 'andar', 'esquerda', 'andar', 'andar', 'colher'],
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
    solucao: ['andar', 'plantar', 'andar', 'andar', 'plantar', 'andar', 'direita', 'andar', 'plantar'],
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
    solucao: ['andar', 'regar', 'andar', 'andar', 'colher', 'direita', 'andar', 'regar', 'andar', 'colher'],
  },

  // ---------------------------------------------------------------- Mundo 2: um Repita só
  {
    id: 'ate-o-tomate',
    mundo: 2,
    titulo: 'Até o tomate',
    fala: 'O tomate está longe e na minha memória só cabem 4 blocos! O Repita faz o que está dentro dele várias vezes. Coloque um Repita, mude para 6 vezes e ponha um Ande dentro dele.',
    blocos: SO_REPITA,
    novos: ['repita'],
    meta: 3,
    memoria: 4,
    mapa: { mapa: ['........', '......m.', '........'], moedas: [[2, 1], [4, 1]], robo: [0, 1, 'direita'] },
    solucao: [['repita', 6, ['andar']], 'colher'],
  },
  {
    id: '2-1',
    mundo: 2,
    titulo: 'Fileira de tomates',
    fala: 'Agora são 6 tomates seguidos. Repare: para cada tomate eu ando e colho. Esse pedaço é que vai dentro do Repita!',
    blocos: SO_REPITA,
    meta: 3,
    memoria: 4,
    mapa: { mapa: ['........', '.mmmmmm.', '........'], moedas: [[3, 1], [6, 1]], robo: [0, 1, 'direita'] },
    solucao: [['repita', 6, ['andar', 'colher']]],
  },
  {
    id: '2-4',
    mundo: 2,
    titulo: 'Escadinha',
    fala: 'Suba a escadinha colhendo cada degrau. Monte o plano de UM degrau e depois coloque ele dentro do Repita.',
    blocos: SO_REPITA,
    meta: 6,
    memoria: 7,
    mapa: { mapa: ['....m', '...m.', '..m..', '.m...', '.....'], moedas: [[1, 4], [3, 2]], robo: [0, 4, 'direita'] },
    solucao: [['repita', 4, ['andar', 'esquerda', 'andar', 'direita', 'colher']]],
  },
  {
    id: '2-2',
    mundo: 2,
    titulo: 'Volta no canteiro',
    fala: 'Colha nas quatro pontas do canteiro. O caminho é igual nos quatro lados: colher, andar até a ponta e virar.',
    blocos: SO_REPITA,
    meta: 7,
    memoria: 8,
    mapa: { mapa: ['m...m', '.ppp.', '.ppp.', '.ppp.', 'm...m'], moedas: [[2, 0], [4, 2], [2, 4], [0, 2]], robo: [0, 0, 'direita'] },
    solucao: [['repita', 4, ['colher', 'andar', 'andar', 'andar', 'andar', 'direita']]],
  },

  // ---------------------------------------------------------------- Mundo 3: Repita dentro do Repita
  {
    id: 'quadradinho',
    mundo: 3,
    titulo: 'Quadradinho',
    fala: 'Olha o plano que eu comecei: um Repita dentro do outro! O de fora faz os 4 lados. O de dentro anda o lado inteiro. O que falta colocar no Repita de dentro?',
    blocos: SO_REPITA,
    meta: 5,
    memoria: 5,
    mapa: { mapa: ['m..m', '.pp.', '.pp.', 'm..m'], moedas: [[2, 0], [3, 2], [1, 3], [0, 1]], robo: [0, 0, 'direita'] },
    planoInicial: [['repita', 4, ['colher', ['repita', 3, []], 'direita']]],
    solucao: [['repita', 4, ['colher', ['repita', 3, ['andar']], 'direita']]],
  },
  {
    id: 'canteiro-medio',
    mundo: 3,
    titulo: 'O canteiro de novo',
    fala: 'Lembra deste canteiro? Agora só cabem 5 blocos na minha memória! Dentro de cada lado o Ande também se repete. Use um Repita para os lados e outro, dentro dele, para o Ande.',
    blocos: SO_REPITA,
    meta: 5,
    memoria: 5,
    mapa: { mapa: ['m...m', '.ppp.', '.ppp.', '.ppp.', 'm...m'], moedas: [[1, 0], [4, 3], [3, 4], [0, 1]], robo: [0, 0, 'direita'] },
    solucao: [['repita', 4, ['colher', ['repita', 4, ['andar']], 'direita']]],
  },
  {
    id: '2-3',
    mundo: 3,
    titulo: 'Canteiro gigante',
    fala: 'O canteiro cresceu! É igual ao de antes, só que cada lado é maior. O que muda no plano?',
    blocos: SO_REPITA,
    meta: 5,
    memoria: 5,
    mapa: {
      mapa: ['m.....m', '.ppppp.', '.ppppp.', '.ppppp.', '.ppppp.', '.ppppp.', 'm.....m'],
      moedas: [[3, 0], [6, 3], [3, 6], [0, 3]],
      robo: [0, 0, 'direita'],
    },
    solucao: [['repita', 4, ['colher', ['repita', 6, ['andar']], 'direita']]],
  },
  {
    id: 'uma-coluna',
    mundo: 3,
    titulo: 'Uma coluna do pomar',
    fala: 'Este é um pedaço do pomar: uma coluna só. Suba colhendo tudo e depois volte para o celeiro, lá embaixo. Dá para usar um Repita para subir e outro para descer.',
    blocos: SO_REPITA,
    meta: 9,
    memoria: 10,
    mapa: { mapa: ['.m', '.m', '.m', '.c'], robo: [0, 3, 'direita'] },
    solucao: COLUNA,
  },
  {
    id: 'duas-colunas',
    mundo: 3,
    titulo: 'Duas colunas',
    fala: 'Eu já sei fazer uma coluna: o plano está aí! Agora são duas colunas iguais. Aperte "🔁 Pôr tudo num Repita". Dica: antes da próxima coluna eu preciso virar para a direita de novo.',
    blocos: SO_REPITA,
    meta: 11,
    memoria: 12,
    mapa: { mapa: ['.mm', '.mm', '.mm', '...'], moedas: [[2, 3]], robo: [0, 3, 'direita'] },
    planoInicial: COLUNA,
    solucao: [['repita', 2, [...COLUNA, 'esquerda']]],
  },
  {
    id: '2-5',
    mundo: 3,
    titulo: 'Pomar',
    fala: 'O pomar inteiro! É o mesmo plano das duas colunas, só que agora são 4 colunas.',
    blocos: SO_REPITA,
    meta: 11,
    memoria: 12,
    mapa: { mapa: ['.mmmm', '.mmmm', '.mmmm', '.....'], moedas: [[2, 3], [4, 3]], robo: [0, 3, 'direita'] },
    solucao: [['repita', 4, [...COLUNA, 'esquerda']]],
  },

  // ---------------------------------------------------------------- Mundo 4: Horta surpresa
  {
    id: '3-1',
    mundo: 4,
    titulo: 'Só as maduras',
    fala: 'Essa horta muda toda vez! Não dá para decorar. Use o Se para eu olhar antes de colher.',
    blocos: [...TODAS_ACOES, 'repita', 'se'],
    novos: ['se'],
    condicoes: ['madura'],
    meta: 4,
    variantes: 3,
    gerar: fileiraSorteada(['m', 'b'], 2),
    solucao: [['repita', 6, ['andar', ['se', 'madura', ['colher']]]]],
  },
  {
    id: '3-2',
    mundo: 4,
    titulo: 'Regar ou colher?',
    fala: 'Cada planta ou está com sede, ou está madura. O bloco Se... senão escolhe entre duas coisas.',
    blocos: [...TODAS_ACOES, 'repita', 'se', 'seSenao'],
    novos: ['seSenao'],
    condicoes: ['sede', 'madura'],
    meta: 5,
    variantes: 3,
    gerar: fileiraSorteada(['s', 'm'], 2),
    solucao: [['repita', 6, ['andar', ['seSenao', 'sede', ['regar'], ['colher']]]]],
  },
  {
    id: '3-3',
    mundo: 4,
    titulo: 'Plantar ou colher?',
    fala: 'Terra vazia: plante. Planta madura: colha. Planta verde: deixe crescer!',
    blocos: [...TODAS_ACOES, 'repita', 'se', 'seSenao'],
    condicoes: ['vazia', 'madura'],
    meta: 6,
    variantes: 3,
    gerar: fileiraSorteada(['t', 'm', 'b'], 1),
    solucao: [['repita', 6, ['andar', ['se', 'vazia', ['plantar']], ['se', 'madura', ['colher']]]]],
  },
  {
    id: '3-4',
    mundo: 4,
    titulo: 'Pomar surpresa',
    fala: 'O pomar voltou, mas agora tem fruta verde no meio. É o plano do pomar, só que olhando antes de colher!',
    blocos: [...TODAS_ACOES, 'repita', 'se', 'seSenao'],
    condicoes: ['madura'],
    meta: 12,
    variantes: 3,
    gerar: pomarSorteado,
    solucao: [['repita', 4, ['andar', 'esquerda', ['repita', 3, ['andar', ['se', 'madura', ['colher']]]], 'direita', 'direita', ['repita', 3, ['andar']], 'esquerda']]],
  },

  // ---------------------------------------------------------------- Mundo 5: Até quando?
  {
    id: '4-1',
    mundo: 5,
    titulo: 'Até a pedra',
    fala: 'Cada fileira tem um tamanho. O Repita até faz eu repetir até acontecer alguma coisa.',
    blocos: [...TODAS_ACOES, 'repita', 'repitaAte', 'se', 'seSenao'],
    novos: ['repitaAte'],
    condicoes: ['bloqueio'],
    meta: 3,
    variantes: 3,
    gerar: corredorSorteado(['m']),
    solucao: [['repitaAte', 'bloqueio', ['andar', 'colher']]],
  },
  {
    id: '4-2',
    mundo: 5,
    titulo: 'Colha até a pedra',
    fala: 'Tamanho diferente e plantas diferentes. Vou precisar repetir e também olhar!',
    blocos: [...TODAS_ACOES, 'repita', 'repitaAte', 'se', 'seSenao'],
    condicoes: ['bloqueio', 'madura'],
    meta: 4,
    variantes: 3,
    gerar: corredorSorteado(['m', 'b']),
    solucao: [['repitaAte', 'bloqueio', ['andar', ['se', 'madura', ['colher']]]]],
  },
  {
    id: '4-3',
    mundo: 5,
    titulo: 'Caminho do celeiro',
    fala: 'Me leve até o celeiro! O caminho muda, mas sempre que aparece uma pedra na frente é hora de virar à direita.',
    blocos: [...TODAS_ACOES, 'repita', 'repitaAte', 'se', 'seSenao'],
    condicoes: ['celeiro', 'bloqueio'],
    meta: 4,
    variantes: 3,
    gerar: caminhoSorteado(false),
    solucao: [['repitaAte', 'celeiro', [['seSenao', 'bloqueio', ['direita'], ['andar']]]]],
  },
  {
    id: '4-4',
    mundo: 5,
    titulo: 'Grande colheita',
    fala: 'O desafio final: siga o caminho até o celeiro colhendo só as plantas maduras. Você consegue!',
    blocos: [...TODAS_ACOES, 'repita', 'repitaAte', 'se', 'seSenao'],
    condicoes: ['celeiro', 'bloqueio', 'madura'],
    meta: 6,
    variantes: 3,
    gerar: caminhoSorteado(true),
    solucao: [['repitaAte', 'celeiro', [['se', 'madura', ['colher']], ['seSenao', 'bloqueio', ['direita'], ['andar']]]]],
  },
];

// Número que aparece na tela: mundo-posição ("3-2"). O id fica para o progresso salvo.
for (const mundo of MUNDOS) {
  FASES.filter((f) => f.mundo === mundo.numero).forEach((fase, i) => {
    fase.rotulo = `${mundo.numero}-${i + 1}`;
  });
}

/** Solução de referência da fase, no formato do editor (dicas e testes) */
export function solucaoDaFase(fase) {
  return planoCurto(fase.solucao);
}

/** Plano que a fase já traz montado (vazio se não tiver) */
export function planoInicialDaFase(fase) {
  return fase.planoInicial ? planoCurto(fase.planoInicial) : [];
}

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
