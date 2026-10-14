import { h } from '../../../core/dom.js';
import { Dialogo } from './Dialogo.js';
import { ErroDeArquivo, LIXEIRA, SistemaDeArquivos, TIPOS } from '../regras/SistemaDeArquivos.js';

/**
 * O que dá para fazer com arquivos e pastas, igual na Área de Trabalho e no
 * Explorador: menus do botão direito, renomear no lugar, excluir para a
 * Lixeira, restaurar, recortar/copiar/colar e arrastar para uma pasta.
 * Toda mudança vira um evento { tipo: 'arquivo', acao, ... } no simulador.
 */
const evento = (sim, acao, item, extra = {}) =>
  sim.emitir({ tipo: 'arquivo', acao, nome: item.nome, pasta: item.pasta, tipoItem: item.tipo, ...extra });

async function tentar(sim, fn) {
  try {
    return await fn();
  } catch (erro) {
    if (!(erro instanceof ErroDeArquivo)) throw erro;
    await Dialogo.mensagem(sim, { titulo: 'Explorador de Arquivos', texto: erro.message, tipo: 'erro', nome: 'erroArquivo' });
    return null;
  }
}

export function excluirItem(sim, item) {
  if (item.pasta === LIXEIRA) return excluirDefinitivo(sim, item);
  const pasta = item.pasta;
  sim.fs.excluir(item);
  evento(sim, 'excluir', item, { pasta, origem: pasta });
  sim.som?.('lixeira');
  return true;
}

async function excluirDefinitivo(sim, item) {
  const resposta = await Dialogo.mensagem(sim, {
    titulo: 'Excluir arquivo',
    texto: `Tem certeza de que deseja excluir permanentemente "${SistemaDeArquivos.nomeCompleto(item)}"?`,
    tipo: 'aviso',
    botoes: ['Sim', 'Não'],
    nome: 'excluirDefinitivo',
  });
  if (resposta !== 'Sim') return false;
  sim.fs.excluirDefinitivo(item);
  evento(sim, 'apagar', item);
  return true;
}

export function restaurarItem(sim, item) {
  sim.fs.restaurar(item);
  evento(sim, 'restaurar', item);
}

export function moverItem(sim, item, destino) {
  if (destino === LIXEIRA) return excluirItem(sim, item);
  const origem = item.pasta;
  return tentar(sim, () => {
    sim.fs.mover(item, destino);
    evento(sim, 'mover', item, { origem });
    return true;
  });
}

/** Ctrl+X / Ctrl+C de arquivos (o arquivo só muda ao colar) */
export function guardarArquivo(sim, item, modo) {
  sim.arquivoNaTransferencia = { id: item.id, modo };
  sim.emitir({ tipo: modo === 'recortar' ? 'recortar-arquivo' : 'copiar-arquivo', nome: item.nome });
}

export function colarArquivo(sim, destino) {
  const guardado = sim.arquivoNaTransferencia;
  const item = guardado && sim.fs.porId(guardado.id);
  if (!item) return null;
  if (guardado.modo === 'recortar') {
    sim.arquivoNaTransferencia = null;
    return moverItem(sim, item, destino);
  }
  return tentar(sim, () => {
    const copia = sim.fs.copiar(item, destino);
    evento(sim, 'copiar', copia, { de: item.nome });
    return true;
  });
}

/**
 * Renomear no lugar: troca o rótulo por uma caixa de texto (Enter confirma,
 * Esc cancela). Como no Windows, só o nome é selecionado (sem extensão).
 */
export function renomearNoLugar(sim, item, rotulo, aoTerminar) {
  const campo = h('textarea', { class: 'renomear-campo', rows: 1, spellcheck: false, 'data-alvo': 'explorador.renomeando' });
  campo.value = item.nome;
  rotulo.replaceWith(campo);
  campo.focus();
  campo.select();
  let terminou = false;
  const terminar = async (salvar) => {
    if (terminou) return;
    terminou = true;
    const novo = campo.value.replace(/\n/g, '').trim();
    if (salvar && novo && novo !== item.nome) {
      const antigo = item.nome;
      await tentar(sim, () => {
        sim.fs.renomear(item, novo);
        evento(sim, 'renomear', item, { antigo });
      });
    }
    aoTerminar();
  };
  campo.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      terminar(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      terminar(false);
    }
  });
  campo.addEventListener('blur', () => terminar(true));
  campo.addEventListener('pointerdown', (e) => e.stopPropagation());
  campo.addEventListener('dblclick', (e) => e.stopPropagation());
}

/** Menu do botão direito num arquivo/pasta (Windows 11: ícones no alto + lista) */
export function menuDoItem(sim, item, { renomear, abrir }) {
  if (item.pasta === LIXEIRA) {
    return [
      { rotulo: 'Restaurar', icone: 'arrow_reset', negrito: true, alvo: 'contexto.restaurar', acao: () => restaurarItem(sim, item) },
      { separador: true },
      { rotulo: 'Recortar', icone: 'cut', alvo: 'contexto.recortar', acao: () => guardarArquivo(sim, item, 'recortar') },
      { rotulo: 'Excluir', icone: 'delete', alvo: 'contexto.excluir', acao: () => excluirItem(sim, item) },
      { separador: true },
      { rotulo: 'Propriedades', icone: 'info', acao: () => propriedades(sim, item) },
    ];
  }
  const abrirCom =
    item.tipo === 'txt' || item.tipo === 'docx'
      ? [
          {
            rotulo: 'Abrir com',
            icone: 'open',
            submenu: [
              { rotulo: 'Word', icone: 'img:logo-word', acao: () => sim.abrirArquivo(item, { via: 'abrir-com', app: 'word' }) },
              { rotulo: 'Bloco de Notas', icone: 'img:logo-bloco-de-notas', acao: () => sim.abrirArquivo(item, { via: 'abrir-com', app: 'bloco' }) },
            ],
          },
        ]
      : [];
  return [
    { rotulo: 'Abrir', icone: 'open', negrito: true, alvo: 'contexto.abrir', acao: abrir },
    ...abrirCom,
    { separador: true },
    { rotulo: 'Recortar', icone: 'cut', atalho: 'Ctrl+X', alvo: 'contexto.recortar', acao: () => guardarArquivo(sim, item, 'recortar') },
    { rotulo: 'Copiar', icone: 'copy', atalho: 'Ctrl+C', alvo: 'contexto.copiar', acao: () => guardarArquivo(sim, item, 'copiar') },
    { rotulo: 'Renomear', icone: 'rename', atalho: 'F2', alvo: 'contexto.renomear', acao: renomear },
    { rotulo: 'Excluir', icone: 'delete', atalho: 'Delete', alvo: 'contexto.excluir', acao: () => excluirItem(sim, item) },
    { separador: true },
    { rotulo: 'Propriedades', icone: 'info', atalho: 'Alt+Enter', acao: () => propriedades(sim, item) },
  ];
}

/** Menu do botão direito no espaço vazio de uma pasta (ou da Área de Trabalho) */
export function menuDoFundo(sim, pasta, { aoNovo, extras = [] }) {
  const novo = (tipo) => () => tentar(sim, () => {
    const item = tipo === 'pasta' ? sim.fs.criarPasta(pasta) : sim.fs.criarArquivo(pasta, tipo, null, tipo === 'docx' ? { html: '<p><br></p>' } : { texto: '' });
    evento(sim, tipo === 'pasta' ? 'criar-pasta' : 'criar', item);
    aoNovo?.(item);
  });
  const temColar = Boolean(sim.arquivoNaTransferencia && sim.fs.porId(sim.arquivoNaTransferencia.id));
  return [
    ...extras,
    { rotulo: 'Colar', icone: 'clipboard_paste', atalho: 'Ctrl+V', desabilitado: !temColar, alvo: 'contexto.colar', acao: () => colarArquivo(sim, pasta) },
    { separador: true },
    {
      rotulo: 'Novo',
      icone: 'add',
      alvo: 'contexto.novo',
      submenu: [
        { rotulo: 'Pasta', icone: 'img:pasta', alvo: 'contexto.novo.pasta', acao: novo('pasta') },
        { separador: true },
        { rotulo: 'Documento do Microsoft Word', icone: 'img:logo-word', acao: novo('docx') },
        { rotulo: 'Documento de Texto', icone: 'img:document-text-48-color', acao: novo('txt') },
      ],
    },
    { separador: true },
    { rotulo: 'Propriedades', icone: 'info', acao: () => Dialogo.mensagem(sim, { titulo: `Propriedades de ${pasta.split('/').pop()}`, texto: `${sim.fs.listar(pasta).length} itens nesta pasta.`, nome: 'propriedades' }) },
  ];
}

function tamanhoDoItem(item) {
  if (item.tipo === 'pasta') return '';
  const bytes = JSON.stringify(item.conteudo || '').length + (item.tipo === 'docx' ? 11000 : 0) + (item.tipo === 'imagem' ? 180000 : 0);
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('pt-BR')} KB`;
}

export { tamanhoDoItem };

function propriedades(sim, item) {
  const linhas = [
    `Tipo: ${TIPOS[item.tipo].descricao}${TIPOS[item.tipo].extensao ? ` (${TIPOS[item.tipo].extensao})` : ''}`,
    `Local: C:\\Usuários\\${sim.conta.arroba}\\${(item.origem || item.pasta).replace(/\//g, '\\')}`,
    item.tipo !== 'pasta' && `Tamanho: ${tamanhoDoItem(item)}`,
    `Modificado: ${new Date(item.modificado).toLocaleString('pt-BR')}`,
  ].filter(Boolean);
  return Dialogo.mensagem(sim, { titulo: `Propriedades de ${SistemaDeArquivos.nomeCompleto(item)}`, texto: linhas.join('\n'), nome: 'propriedades' });
}
