// Catálogo dos blocos de ordens e das perguntas que o robô sabe fazer.
// O texto evita palavras de programação: o aluno monta "o plano do robô".

export const BLOCOS = {
  andar: { categoria: 'movimento', icone: '🦶', texto: 'Ande 1 casa' },
  direita: { categoria: 'movimento', icone: '↪️', texto: 'Vire à direita' },
  esquerda: { categoria: 'movimento', icone: '↩️', texto: 'Vire à esquerda' },
  colher: { categoria: 'acao', icone: '🧺', texto: 'Colha' },
  plantar: { categoria: 'acao', icone: '🌱', texto: 'Plante uma semente' },
  regar: { categoria: 'acao', icone: '💧', texto: 'Regue' },
  repita: { categoria: 'repeticao', icone: '🔁', texto: 'Repita', vezes: true, corpo: true },
  repitaAte: { categoria: 'repeticao', icone: '⏳', texto: 'Repita até', condicao: 'ate', corpo: true },
  se: { categoria: 'decisao', icone: '❓', texto: 'Se', condicao: 'se', corpo: true },
  seSenao: { categoria: 'decisao', icone: '❓', texto: 'Se', condicao: 'se', corpo: true, senao: true },
};

/** Perguntas que o robô faz sobre a casa onde está (ou a da frente) */
export const CONDICOES = {
  madura: { icone: '🍅', se: 'tiver planta madura aqui', ate: 'achar planta madura' },
  sede: { icone: '🥀', se: 'a planta aqui estiver com sede', ate: 'achar planta com sede' },
  vazia: { icone: '🟫', se: 'a terra aqui estiver vazia', ate: 'achar terra vazia' },
  bloqueio: { icone: '🚧', se: 'tiver cerca ou pedra na frente', ate: 'ter cerca ou pedra na frente' },
  celeiro: { icone: '🏠', se: 'estiver no celeiro', ate: 'chegar no celeiro' },
};

/** Nome curto do bloco, para a paleta e as listas */
export function nomeCurto(tipo) {
  if (tipo === 'repita') return 'Repita 3 vezes';
  if (tipo === 'repitaAte') return 'Repita até ...';
  if (tipo === 'se') return 'Se ...';
  if (tipo === 'seSenao') return 'Se ... senão';
  return BLOCOS[tipo].texto;
}

export const VEZES_MIN = 2;
export const VEZES_MAX = 12;

let proximoId = 1;

/** Cria um bloco novo do tipo pedido, já com valores iniciais */
export function novoBloco(tipo, { condicoes = [] } = {}) {
  const def = BLOCOS[tipo];
  if (!def) throw new Error(`Bloco desconhecido: ${tipo}`);
  const bloco = { id: `b${proximoId++}`, tipo };
  if (def.vezes) bloco.vezes = 3;
  if (def.condicao) bloco.condicao = condicoes[0] || 'madura';
  if (def.corpo) bloco.corpo = [];
  if (def.senao) bloco.senao = [];
  return bloco;
}

/** Quantos blocos o plano usa (contando os de dentro) */
export function contarBlocos(lista) {
  let total = 0;
  for (const bloco of lista) {
    total += 1;
    if (bloco.corpo) total += contarBlocos(bloco.corpo);
    if (bloco.senao) total += contarBlocos(bloco.senao);
  }
  return total;
}

/**
 * Confere e copia um plano salvo (ou escrito à mão nos testes), dando ids
 * novos. Blocos que a fase não permite são descartados.
 */
export function copiarPlano(lista, permitidos = null) {
  const copia = [];
  for (const bloco of Array.isArray(lista) ? lista : []) {
    const def = BLOCOS[bloco && bloco.tipo];
    if (!def || (permitidos && !permitidos.includes(bloco.tipo))) continue;
    const novo = { id: `b${proximoId++}`, tipo: bloco.tipo };
    if (def.vezes) novo.vezes = Math.min(VEZES_MAX, Math.max(VEZES_MIN, Number(bloco.vezes) || 3));
    if (def.condicao) novo.condicao = CONDICOES[bloco.condicao] ? bloco.condicao : 'madura';
    if (def.corpo) novo.corpo = copiarPlano(bloco.corpo, permitidos);
    if (def.senao) novo.senao = copiarPlano(bloco.senao, permitidos);
    copia.push(novo);
  }
  return copia;
}

/** Plano sem ids, para salvar */
export function planoParaSalvar(lista) {
  return lista.map(({ id, corpo, senao, ...resto }) => ({
    ...resto,
    ...(corpo ? { corpo: planoParaSalvar(corpo) } : {}),
    ...(senao ? { senao: planoParaSalvar(senao) } : {}),
  }));
}
