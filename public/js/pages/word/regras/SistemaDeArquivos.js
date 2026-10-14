/**
 * Arquivos e pastas do computador simulado (sem nada de tela, testável).
 *
 * Como no Windows com a configuração de fábrica, a extensão fica escondida:
 * o nome guardado é "Relatório" e o tipo diz que é .docx. Dois arquivos só
 * colidem se tiverem o mesmo nome e o mesmo tipo (ou forem pastas).
 *
 * Caminhos usam "/": "Documentos", "Documentos/Operação Kaos".
 */
export const PASTAS_RAIZ = ['Área de Trabalho', 'Documentos', 'Imagens', 'Downloads'];
export const LIXEIRA = 'Lixeira';

export const TIPOS = {
  pasta: { extensao: '', descricao: 'Pasta de arquivos' },
  docx: { extensao: '.docx', descricao: 'Documento do Microsoft Word' },
  txt: { extensao: '.txt', descricao: 'Documento de Texto' },
  imagem: { extensao: '.png', descricao: 'Arquivo PNG' },
  pdf: { extensao: '.pdf', descricao: 'Documento PDF' },
};

const PROIBIDOS = /[\\/:*?"<>|]/;
const RESERVADOS = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
export const MENSAGEM_CARACTERES = 'Um nome de arquivo não pode conter nenhum dos seguintes caracteres: \\ / : * ? " < > |';

export class ErroDeArquivo extends Error {}

/** Compara nomes como o Windows: sem diferenciar maiúsculas */
const mesmo = (a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'accent' }) === 0;

/** Tira a extensão que o aluno digitou ("Relatorio.docx" → "Relatorio") e descobre o tipo */
export function separarExtensao(nome) {
  const limpo = String(nome ?? '').trim();
  for (const [tipo, { extensao }] of Object.entries(TIPOS)) {
    if (extensao && limpo.toLowerCase().endsWith(extensao)) return { base: limpo.slice(0, -extensao.length).trim(), tipo };
  }
  return { base: limpo, tipo: null };
}

/** Lança ErroDeArquivo com a mensagem do Windows se o nome não vale */
export function validarNome(nome) {
  const limpo = String(nome ?? '').trim();
  if (!limpo) throw new ErroDeArquivo('Digite um nome de arquivo.');
  if (PROIBIDOS.test(limpo)) throw new ErroDeArquivo(MENSAGEM_CARACTERES);
  if (RESERVADOS.test(limpo) || /^\.+$/.test(limpo)) throw new ErroDeArquivo('O nome de arquivo especificado não é válido ou é muito longo.');
  if (limpo.length > 120) throw new ErroDeArquivo('O nome de arquivo especificado não é válido ou é muito longo.');
  return limpo.replace(/\.+$/, '');
}

let proximoId = 1;

export class SistemaDeArquivos {
  /** itens: [{ pasta, nome, tipo, conteudo?, modificado? }] (pastas intermediárias são criadas sozinhas) */
  constructor(itens = [], { agora = () => Date.now() } = {}) {
    this.agora = agora;
    this.itens = [];
    this.ouvintes = new Set();
    for (const item of itens) {
      this.garantirPasta(item.pasta);
      if (item.tipo === 'pasta') this.garantirPasta(`${item.pasta}/${item.nome}`);
      else this.itens.push(this.novoItem(item));
    }
  }

  novoItem({ pasta, nome, tipo, conteudo = null, modificado, origem }) {
    return { id: proximoId++, pasta, nome, tipo, conteudo, modificado: modificado ?? this.agora(), origem: origem ?? null };
  }

  aoMudar(fn) {
    this.ouvintes.add(fn);
    return () => this.ouvintes.delete(fn);
  }

  avisar(evento) {
    for (const fn of this.ouvintes) fn(evento);
  }

  // ---------------- consulta ----------------

  static nomeCompleto(item) {
    return item.nome + (TIPOS[item.tipo]?.extensao || '');
  }

  static caminhoDaPasta(item) {
    return `${item.pasta}/${item.nome}`;
  }

  pastaExiste(caminho) {
    if (caminho === LIXEIRA || PASTAS_RAIZ.includes(caminho)) return true;
    return this.itens.some((i) => i.tipo === 'pasta' && SistemaDeArquivos.caminhoDaPasta(i) === caminho);
  }

  /** Itens de uma pasta: pastas primeiro, depois por nome */
  listar(pasta) {
    return this.itens
      .filter((i) => i.pasta === pasta)
      .sort((a, b) => (b.tipo === 'pasta') - (a.tipo === 'pasta') || a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
  }

  obter(pasta, nome, tipo = null) {
    return this.itens.find((i) => i.pasta === pasta && mesmo(i.nome, nome) && (!tipo || i.tipo === tipo)) || null;
  }

  porId(id) {
    return this.itens.find((i) => i.id === id) || null;
  }

  /** Procura em todas as pastas (menos a Lixeira) */
  procurar(nome, tipo = null) {
    return this.itens.filter((i) => i.pasta !== LIXEIRA && mesmo(i.nome, nome) && (!tipo || i.tipo === tipo));
  }

  /** Subpastas (caminhos) de uma pasta */
  subpastas(pasta) {
    return this.listar(pasta).filter((i) => i.tipo === 'pasta').map((i) => SistemaDeArquivos.caminhoDaPasta(i));
  }

  // ---------------- nomes ----------------

  colide(pasta, nome, tipo, ignorar = null) {
    return this.itens.some(
      (i) => i !== ignorar && i.pasta === pasta && mesmo(i.nome, nome) && (i.tipo === tipo || i.tipo === 'pasta' || tipo === 'pasta')
    );
  }

  /** "Nova pasta" → "Nova pasta (2)" se já existir */
  nomeLivre(pasta, base, tipo) {
    if (!this.colide(pasta, base, tipo)) return base;
    for (let n = 2; ; n++) {
      const nome = `${base} (${n})`;
      if (!this.colide(pasta, nome, tipo)) return nome;
    }
  }

  // ---------------- mudanças ----------------

  garantirPasta(caminho) {
    if (!caminho || this.pastaExiste(caminho)) return;
    const partes = caminho.split('/');
    const nome = partes.pop();
    const pai = partes.join('/');
    this.garantirPasta(pai);
    this.itens.push(this.novoItem({ pasta: pai, nome, tipo: 'pasta' }));
  }

  criarPasta(pasta, nome = 'Nova pasta') {
    const item = this.novoItem({ pasta, nome: this.nomeLivre(pasta, validarNome(nome), 'pasta'), tipo: 'pasta' });
    this.itens.push(item);
    this.avisar({ tipo: 'pasta-criada', item });
    return item;
  }

  /** Arquivo novo vazio (menu Novo do Explorador): "Novo Documento do Microsoft Word" */
  criarArquivo(pasta, tipo, nome = null, conteudo = null) {
    const base = nome || (tipo === 'docx' ? 'Novo Documento do Microsoft Word' : 'Novo Documento de Texto');
    const item = this.novoItem({ pasta, nome: this.nomeLivre(pasta, validarNome(base), tipo), tipo, conteudo });
    this.itens.push(item);
    this.avisar({ tipo: 'arquivo-criado', item });
    return item;
  }

  /** Salvar (cria ou substitui) */
  salvar(pasta, nome, tipo, conteudo) {
    if (!this.pastaExiste(pasta)) throw new ErroDeArquivo('Essa pasta não existe mais.');
    const limpo = validarNome(nome);
    let item = this.obter(pasta, limpo, tipo);
    if (this.itens.some((i) => i.pasta === pasta && i.tipo === 'pasta' && mesmo(i.nome, limpo))) {
      throw new ErroDeArquivo(`Já existe uma pasta chamada "${limpo}" aqui. Escolha outro nome.`);
    }
    if (item) {
      item.conteudo = conteudo;
      item.modificado = this.agora();
    } else {
      item = this.novoItem({ pasta, nome: limpo, tipo, conteudo });
      this.itens.push(item);
    }
    this.avisar({ tipo: 'arquivo-salvo', item });
    return item;
  }

  renomear(item, novoNome) {
    const limpo = validarNome(novoNome);
    if (limpo === item.nome) return item;
    if (this.colide(item.pasta, limpo, item.tipo, item)) {
      throw new ErroDeArquivo(`Já existe um ${item.tipo === 'pasta' ? 'pasta' : 'arquivo'} com o nome "${limpo}" neste local.`);
    }
    const antigo = item.nome;
    if (item.tipo === 'pasta') {
      const de = SistemaDeArquivos.caminhoDaPasta(item);
      const para = `${item.pasta}/${limpo}`;
      for (const i of this.itens) {
        if (i.pasta === de || i.pasta.startsWith(`${de}/`)) i.pasta = para + i.pasta.slice(de.length);
      }
    }
    item.nome = limpo;
    item.modificado = this.agora();
    this.avisar({ tipo: 'renomeado', item, antigo });
    return item;
  }

  /** Itens que estão dentro de uma pasta (em qualquer nível) */
  conteudoDaPasta(item) {
    const caminho = SistemaDeArquivos.caminhoDaPasta(item);
    return this.itens.filter((i) => i.pasta === caminho || i.pasta.startsWith(`${caminho}/`));
  }

  mover(item, destino) {
    if (!this.pastaExiste(destino)) throw new ErroDeArquivo('Essa pasta não existe.');
    if (item.pasta === destino) return item;
    if (item.tipo === 'pasta') {
      const caminho = SistemaDeArquivos.caminhoDaPasta(item);
      if (destino === caminho || destino.startsWith(`${caminho}/`)) {
        throw new ErroDeArquivo('A pasta de destino é uma subpasta da pasta de origem.');
      }
    }
    if (this.colide(destino, item.nome, item.tipo, item)) {
      throw new ErroDeArquivo(`O destino já tem um ${item.tipo === 'pasta' ? 'pasta' : 'arquivo'} chamado "${item.nome}".`);
    }
    const origem = item.pasta;
    this.trocarPasta(item, destino);
    this.avisar({ tipo: 'movido', item, origem });
    return item;
  }

  trocarPasta(item, destino) {
    if (item.tipo === 'pasta') {
      const de = SistemaDeArquivos.caminhoDaPasta(item);
      const para = `${destino}/${item.nome}`;
      for (const i of this.conteudoDaPasta(item)) i.pasta = para + i.pasta.slice(de.length);
    }
    item.pasta = destino;
  }

  copiar(item, destino) {
    if (item.tipo === 'pasta') throw new ErroDeArquivo('Copiar pastas não está disponível no simulador.');
    const nome = this.colide(destino, item.nome, item.tipo) ? this.nomeLivre(destino, `${item.nome} - Cópia`, item.tipo) : item.nome;
    const copia = this.novoItem({ pasta: destino, nome, tipo: item.tipo, conteudo: structuredClone(item.conteudo) });
    this.itens.push(copia);
    this.avisar({ tipo: 'copiado', item: copia, de: item });
    return copia;
  }

  /** Excluir = mandar para a Lixeira (lembrando de onde veio) */
  excluir(item) {
    if (item.pasta === LIXEIRA) return this.excluirDefinitivo(item);
    item.origem = item.pasta;
    item.excluidoEm = this.agora();
    this.trocarPasta(item, LIXEIRA);
    this.avisar({ tipo: 'excluido', item });
    return item;
  }

  restaurar(item) {
    if (item.pasta !== LIXEIRA) return item;
    const destino = item.origem && this.pastaExiste(item.origem) ? item.origem : item.origem?.split('/')[0] || 'Documentos';
    this.garantirPasta(destino);
    if (this.colide(destino, item.nome, item.tipo, item)) item.nome = this.nomeLivre(destino, item.nome, item.tipo);
    this.trocarPasta(item, destino);
    item.origem = null;
    this.avisar({ tipo: 'restaurado', item });
    return item;
  }

  excluirDefinitivo(item) {
    const fora = new Set([item, ...(item.tipo === 'pasta' ? this.conteudoDaPasta(item) : [])]);
    this.itens = this.itens.filter((i) => !fora.has(i));
    this.avisar({ tipo: 'apagado', item });
  }

  esvaziarLixeira() {
    for (const item of this.listar(LIXEIRA)) this.excluirDefinitivo(item);
  }
}
