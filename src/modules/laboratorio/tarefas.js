const PADRAO = require('./tasks.json');
const { normalizar } = require('../../shared/texto');

/**
 * Tarefas do Laboratório de Experimentos.
 *
 * O conjunto padrão fica em tasks.json (fácil de editar sem mexer no código).
 * O professor também pode editar pelo painel: a versão editada é salva no
 * banco e passa a valer para as próximas salas; "Restaurar padrão" volta ao
 * tasks.json.
 *
 * Cada sala guarda uma cópia das tarefas no momento em que foi criada, então
 * editar no meio da aula não muda uma partida em andamento.
 */

const LETRAS = ['a', 'b', 'c', 'd'];
const PERGUNTA_PADRAO = 'O que aconteceu?';
const TEMPO_MINIMO_PADRAO = 15;
const LIMITES = { tarefas: 30, titulo: 80, instrucao: 600, pergunta: 200, opcao: 200, explicacao: 600, nota: 400, teclas: 4, combo: 40, tempoMinimo: 300 };

function texto(valor, max) {
  return typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function gerarId(titulo, usados) {
  const base = normalizar(titulo).replace(/\s+/g, '-').slice(0, 40) || 'tarefa';
  let id = base;
  for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
  return id;
}

/**
 * Confere e normaliza uma lista de tarefas (do arquivo ou do editor).
 * Lança Error com uma mensagem que o professor entende.
 */
function validarTarefas(lista) {
  if (!Array.isArray(lista) || lista.length === 0) throw new Error('Cadastre pelo menos uma tarefa.');
  if (lista.length > LIMITES.tarefas) throw new Error(`Use no máximo ${LIMITES.tarefas} tarefas.`);

  const usados = new Set();
  return lista.map((bruta, i) => {
    const t = bruta && typeof bruta === 'object' ? bruta : {};
    const onde = `Tarefa ${i + 1}`;

    const titulo = texto(t.titulo, LIMITES.titulo);
    if (!titulo) throw new Error(`${onde}: informe o título.`);
    const instrucao = texto(t.instrucao, LIMITES.instrucao);
    if (!instrucao) throw new Error(`${onde}: informe a instrução.`);

    const opcoes = (Array.isArray(t.opcoes) ? t.opcoes : []).map((o) => texto(o, LIMITES.opcao)).filter(Boolean);
    if (opcoes.length < 2 || opcoes.length > 4) throw new Error(`${onde}: use de 2 a 4 opções de resposta.`);

    const correta = String(t.correta ?? '').trim().toLowerCase();
    const indice = LETRAS.indexOf(correta);
    if (indice < 0 || indice >= opcoes.length) throw new Error(`${onde}: marque qual opção é a correta.`);

    const explicacao = texto(t.explicacao, LIMITES.explicacao);
    if (!explicacao) throw new Error(`${onde}: escreva a explicação que aparece depois da resposta.`);

    // Segundos que o aluno espera antes de poder responder (tempo para fazer a ação)
    const tempo = Number(t.tempoMinimo ?? TEMPO_MINIMO_PADRAO);
    const tempoMinimo = Number.isFinite(tempo) ? Math.min(LIMITES.tempoMinimo, Math.max(0, Math.round(tempo))) : TEMPO_MINIMO_PADRAO;

    // Teclas: lista de atalhos como "Windows + D"
    const teclas = (Array.isArray(t.teclas) ? t.teclas : [])
      .map((combo) => texto(combo, LIMITES.combo))
      .filter(Boolean)
      .slice(0, LIMITES.teclas);

    let id = texto(t.id, 50).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!id || usados.has(id)) id = gerarId(titulo, usados);
    usados.add(id);

    return {
      id,
      titulo,
      instrucao,
      teclas,
      tempoMinimo,
      pergunta: texto(t.pergunta, LIMITES.pergunta) || PERGUNTA_PADRAO,
      opcoes,
      correta,
      explicacao,
      notaProfessor: texto(t.notaProfessor, LIMITES.nota),
    };
  });
}

/**
 * O que o aluno pode ver ANTES de responder: sem a resposta certa e sem a
 * explicação. `ordem` embaralha as opções (cada aluno vê numa ordem, para o
 * vizinho não soprar "é a B"); `letra` continua sendo a letra original, que
 * é o que volta para o servidor, e não diz qual é a certa.
 */
function tarefaParaAluno(tarefa, { ordem = null, comOpcoes = true } = {}) {
  const indices = ordem || tarefa.opcoes.map((_, i) => i);
  return {
    id: tarefa.id,
    titulo: tarefa.titulo,
    instrucao: tarefa.instrucao,
    teclas: tarefa.teclas,
    tempoMinimo: tarefa.tempoMinimo,
    pergunta: tarefa.pergunta,
    opcoes: comOpcoes ? indices.map((i) => ({ letra: LETRAS[i], texto: tarefa.opcoes[i] })) : [],
  };
}

/** Catálogo atual: a versão editada no painel (se houver) ou o tasks.json */
class CatalogoDeTarefas {
  constructor({ repositorio }) {
    this.repositorio = repositorio;
    this.padrao = validarTarefas(PADRAO);
    this.editadas = null;
  }

  async carregar() {
    const salvas = await this.repositorio.carregarTarefas();
    if (!salvas) return;
    try {
      this.editadas = validarTarefas(salvas);
    } catch (erro) {
      console.warn('[laboratorio] tarefas salvas inválidas, usando tasks.json:', erro.message);
    }
  }

  get atuais() {
    return this.editadas || this.padrao;
  }

  get personalizadas() {
    return Boolean(this.editadas);
  }

  async salvar(lista) {
    const tarefas = validarTarefas(lista);
    await this.repositorio.salvarTarefas(tarefas);
    this.editadas = tarefas;
    return tarefas;
  }

  async restaurarPadrao() {
    await this.repositorio.salvarTarefas(null);
    this.editadas = null;
    return this.padrao;
  }
}

module.exports = { validarTarefas, tarefaParaAluno, CatalogoDeTarefas, LETRAS };
