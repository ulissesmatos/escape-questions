import { comparavel } from '../regras/objetivos.js';
import { blocoDe } from '../sistema/word/Formatacao.js';

const PREFIXOS_DO_ARQUIVO = ['word.arquivo.', 'word.salvarComo.', 'word.exportar.', 'word.inicio.', 'word.abrir.', 'word.recente.', 'word.imprimir.'];

/**
 * Guia do "Mostre-me": descobre o próximo passo do objetivo olhando o que o
 * aluno já fez e o que está na tela.
 *
 * Tipos de passo (regras/objetivos.js):
 * - alvo / alvos: um elemento com data-alvo (alvos: o primeiro visível);
 * - trecho: um pedaço do texto (selecionar; com dentro: cursor dentro dele;
 *   inicio/fim: cursor no começo/fim; ate: selecionar até outro trecho);
 *   trecho também pode ser uma função do estado (ex.: o próximo título que
 *   ainda não tem estilo);
 * - imagem: a imagem com esse nome no documento;
 * - tabela: { linha, coluna } ou { ultimaLinha: true }; tabelaLinha: n;
 * - erro: a primeira palavra sublinhada de vermelho.
 *
 * Passos com condição (trecho, campo com valor, imagem selecionada, feito()...)
 * sabem quando já foram feitos; os de clique só se sabe pela tela (o clique
 * abre o próximo menu). O guia anda pelos passos em ordem: para no primeiro
 * passo com condição que ainda não foi cumprida e mostra o passo mais adiantado
 * que já está visível até ali. Assim "clique em PERIGO → Pincel → pinte
 * CUIDADO" segue a ordem mesmo com tudo visível o tempo todo, e um aluno que
 * clicou em coisas aleatórias volta a ver o passo que falta.
 *
 * Quando nada do caminho está na tela, resolve o que falta antes: abrir o
 * Word, trazer a janela para frente, fechar o menu Arquivo, trocar de guia...
 */
export class Guia {
  constructor({ sim, holofote }) {
    this.sim = sim;
    this.holofote = holofote;
    this.objetivo = null;
    this.ativo = false;
    this.rolouPara = null;
    this.marcos = new Set(); // a missão troca pelos marcos dela
  }

  get c() {
    return this.sim.consulta;
  }

  elemento(alvo) {
    return this.sim.el.querySelector(`[data-alvo="${CSS.escape(alvo)}"]`);
  }

  /** O elemento está na tela e não está escondido atrás de outra coisa? */
  visivel(el) {
    if (!el || !el.isConnected) return false;
    this.revelarNaFaixa(el);
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return false;
    const x = Math.min(window.innerWidth - 2, Math.max(1, r.left + Math.min(r.width / 2, 24)));
    const y = Math.min(window.innerHeight - 2, Math.max(1, r.top + r.height / 2));
    const topo = document.elementFromPoint(x, y);
    return Boolean(topo && (topo === el || el.contains(topo) || topo.contains(el)));
  }

  /** Na janela estreita, parte da faixa fica fora da tela: rola a faixa até o botão */
  revelarNaFaixa(el) {
    const faixa = el.closest?.('.word-faixa');
    if (!faixa) return;
    const r = el.getBoundingClientRect();
    const f = faixa.getBoundingClientRect();
    if (r.width && (r.left < f.left || r.right > f.right)) faixa.scrollLeft += r.left < f.left ? r.left - f.left - 20 : r.right - f.right + 20;
  }

  word() {
    return this.c.word();
  }

  /** Word aberto, na frente, com o documento à mostra (o meio da área do documento é do Word) */
  wordPronto() {
    const w = this.word();
    if (!w || !w.temDocumento || !this.c.janelaVisivel('word') || w.backstage.aberto) return false;
    const r = w.rolagem.getBoundingClientRect();
    if (r.width < 20 || r.height < 20) return false;
    const topo = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(60, r.height / 2));
    return Boolean(topo && w.janela.el.contains(topo));
  }

  // ---------------- tipos de passo ----------------

  ehDoDocumento(p) {
    return p.trecho !== undefined || p.inicioDoDocumento || p.imagem || p.tabela || p.tabelaLinha !== undefined || p.erro || p.alvo === 'word.folha';
  }

  /** Passo com condição: dá para saber se já foi feito */
  temCondicao(p) {
    return Boolean(p.feito || p.trecho !== undefined || p.inicioDoDocumento || p.imagem || p.tabelaLinha !== undefined || (p.tabela && p.valor !== undefined) || (p.alvo && p.valor !== undefined) || (p.alvo && p.escolher !== undefined));
  }

  textoDoTrecho(passo) {
    return typeof passo.trecho === 'function' ? passo.trecho(this.sim.estado()) : passo.trecho;
  }

  intervaloDoTrecho(passo) {
    const w = this.word();
    if (!w || !w.temDocumento) return null;
    if (passo.inicioDoDocumento) {
      const primeiro = w.corpo.querySelector('p, h1, h2, h3, li');
      if (!primeiro) return null;
      const r = document.createRange();
      r.selectNodeContents(primeiro);
      return r;
    }
    const a = w.inspetor.achar(this.textoDoTrecho(passo));
    if (!a) return null;
    if (passo.paragrafoInteiro) {
      const r = document.createRange();
      r.selectNodeContents(a.bloco);
      if (a.bloco.lastChild?.nodeName === 'BR') r.setEndBefore(a.bloco.lastChild);
      return r;
    }
    const r = a.mapa.intervalo(a.inicio, a.fim);
    if (passo.ate) {
      const b = w.inspetor.achar(passo.ate);
      if (b) {
        const fim = b.mapa.intervalo(b.inicio, b.fim);
        r.setEnd(fim.endContainer, fim.endOffset);
      }
    }
    return r;
  }

  imagem(passo) {
    const w = this.word();
    return w?.temDocumento ? [...w.corpo.querySelectorAll('img')].find((i) => comparavel(i.dataset.arquivo) === comparavel(passo.imagem)) || null : null;
  }

  celula(passo) {
    const w = this.word();
    const tabela = w?.temDocumento && w.corpo.querySelector('table');
    if (!tabela) return null;
    if (passo.tabela.ultimaLinha) return tabela.rows[tabela.rows.length - 1]?.cells[0] || null;
    return tabela.rows[passo.tabela.linha]?.cells[passo.tabela.coluna] || null;
  }

  intervaloDaLinha(passo) {
    const w = this.word();
    const linha = w?.temDocumento && w.corpo.querySelector('table')?.rows[passo.tabelaLinha];
    if (!linha) return null;
    const r = document.createRange();
    r.setStart(linha.cells[0], 0);
    const ultima = linha.cells[linha.cells.length - 1];
    r.setEnd(ultima, ultima.childNodes.length);
    return r;
  }

  intervaloDoErro() {
    const w = this.word();
    const erro = w?.temDocumento && w.documento.erros()[0];
    return erro ? erro.intervalo() : null;
  }

  elementoDoPasso(passo) {
    if (passo.alvos) return passo.alvos.map((a) => this.elemento(a)).find((el) => this.visivel(el)) || this.elemento(passo.alvos[passo.alvos.length - 1]);
    return passo.alvo ? this.elemento(passo.alvo) : null;
  }

  /** O passo já foi feito? (só faz sentido para passos com condição) */
  feito(passo) {
    if (passo.feito) return Boolean(passo.feito(this.c));
    const w = this.word();
    if (passo.alvo && passo.escolher !== undefined) return this.elemento(passo.alvo)?.value === passo.escolher;
    if (passo.alvo && passo.valor !== undefined) {
      const el = this.elemento(passo.alvo);
      if (!el) return false;
      const valor = el.value ?? el.textContent;
      const n = (t) => comparavel(t).replace(/\s*cm$/, '');
      const numero = (t) => parseFloat(String(t).replace(',', '.'));
      return n(valor) === n(passo.valor) || (/\d/.test(passo.valor) && numero(valor) === numero(passo.valor));
    }
    if (passo.imagem) {
      const img = this.imagem(passo);
      return Boolean(img) && w.documento.imagemSelecionada === img;
    }
    if (passo.tabela && passo.valor !== undefined) {
      const cel = this.celula(passo);
      return Boolean(cel) && comparavel(cel.textContent) === comparavel(passo.valor);
    }
    if (!w || !w.temDocumento) return false;
    const sel = w.documento.intervalo();
    if (passo.tabelaLinha !== undefined) {
      const linha = this.intervaloDaLinha(passo);
      return Boolean(linha && sel && !sel.collapsed) && comparavel(sel.toString()).includes(comparavel(linha.toString()));
    }
    if (passo.trecho !== undefined || passo.inicioDoDocumento) {
      const alvo = this.intervaloDoTrecho(passo);
      if (!alvo) return true; // o texto sumiu (o aluno já mexeu nele): não dá para guiar esse passo
      if (!sel) return false;
      const bloco = blocoDe(alvo.startContainer, w.corpo);
      if (passo.inicio || passo.inicioDoDocumento) {
        return Boolean(bloco) && sel.collapsed && (bloco === sel.startContainer || bloco.contains(sel.startContainer)) && w.documento.noInicioDoBloco(sel, bloco);
      }
      if (passo.fim) return sel.collapsed && sel.compareBoundaryPoints(Range.START_TO_END, alvo) === 0;
      if (passo.dentro) {
        // cursor (ou seleção) dentro do trecho ou do parágrafo dele
        if (passo.noParagrafo) return Boolean(bloco) && (bloco === sel.startContainer || bloco.contains(sel.startContainer));
        return alvo.compareBoundaryPoints(Range.START_TO_START, sel) <= 0 && alvo.compareBoundaryPoints(Range.END_TO_END, sel) >= 0;
      }
      if (sel.collapsed) return false;
      return comparavel(sel.toString()).includes(comparavel(alvo.toString()));
    }
    return false;
  }

  visivelPasso(passo) {
    if (this.ehDoDocumento(passo)) {
      if (!this.wordPronto()) return false;
      if (passo.alvo === 'word.folha') return true;
      if (passo.imagem) return Boolean(this.imagem(passo));
      if (passo.tabela) return Boolean(this.celula(passo));
      if (passo.tabelaLinha !== undefined) return Boolean(this.intervaloDaLinha(passo));
      if (passo.erro) return Boolean(this.intervaloDoErro());
      return Boolean(this.intervaloDoTrecho(passo));
    }
    return this.visivel(this.elementoDoPasso(passo));
  }

  /** O passo a mostrar agora: { passo, indice, obterRetangulo, texto } */
  resolver(objetivo = this.objetivo) {
    const passos = objetivo?.caminho || [];
    if (!passos.length) return null;
    // objetivo que depende de algo da história (ex.: o vírus) ainda não chegou a vez
    if (objetivo.espera && !this.marcos.has(objetivo.espera)) return { passo: {}, indice: -1, texto: 'Aguarde um instante...', espera: true, obterRetangulo: () => null };
    // uma janela (diálogo) aberta na frente que não é deste caminho
    const dialogo = this.sim.camadaDialogos.lastElementChild;
    const contagem = dialogo?.querySelector('[data-dialogo="contarPalavras"] .dlg-tabela tr:nth-child(2)');
    if (contagem && objetivo.pergunta) {
      return { passo: {}, indice: passos.length, texto: 'Aqui está: a linha Palavras mostra o número. Escreva ele na Central e clique em Responder.', elemento: contagem, obterRetangulo: () => (contagem.isConnected ? contagem.getBoundingClientRect() : null) };
    }
    if (dialogo && !passos.some((p) => (p.alvo || '').startsWith('dialogo.') && dialogo.querySelector(`[data-alvo="${CSS.escape(p.alvo)}"]`))) {
      const botao = dialogo.querySelector('.dlg-rodape button:last-child') || dialogo.querySelector('.dlg-rodape button') || dialogo.querySelector('.dlg-titulo .win-botao-fechar');
      return { passo: {}, indice: -1, texto: 'Esta janela está na frente. Feche (Fechar, OK ou Cancelar) para continuar.', elemento: botao, prerequisito: true, obterRetangulo: () => (botao?.isConnected ? botao.getBoundingClientRect() : null) };
    }
    // anda em ordem até o primeiro passo com condição ainda não cumprida
    let primeiroClique = -1;
    let parada = passos.length;
    for (let i = 0; i < passos.length; i++) {
      if (this.temCondicao(passos[i])) {
        if (this.feito(passos[i])) {
          primeiroClique = -1; // o que veio antes deu certo
          continue;
        }
        parada = i;
        break;
      }
      if (primeiroClique === -1) primeiroClique = i;
    }
    const inicio = primeiroClique !== -1 && primeiroClique < parada ? primeiroClique : Math.min(parada, passos.length - 1);
    const fim = Math.min(parada, passos.length - 1);
    for (let i = fim; i >= inicio; i--) {
      if (this.visivelPasso(passos[i])) return this.montar(passos[i], i);
    }
    return this.prerequisito(passos[inicio]);
  }

  montar(passo, indice) {
    const base = { passo, indice, texto: passo.texto };
    const rolar = (no) => ({ ...base, rolarPara: no });
    if (passo.alvo === 'word.folha') {
      const corpo = this.word().corpo;
      return { ...base, obterRetangulo: () => retanguloDaFolha(corpo), elemento: corpo };
    }
    if (passo.imagem) {
      const img = this.imagem(passo);
      return { ...rolar(img), elemento: img, obterRetangulo: () => (img.isConnected ? img.getBoundingClientRect() : null) };
    }
    if (passo.tabela) {
      const cel = this.celula(passo);
      return { ...rolar(cel), elemento: cel, obterRetangulo: () => (cel.isConnected ? (passo.tabela.ultimaLinha ? cel.parentElement : cel).getBoundingClientRect() : null) };
    }
    const intervalo = passo.tabelaLinha !== undefined ? this.intervaloDaLinha(passo) : passo.erro ? this.intervaloDoErro() : passo.trecho !== undefined || passo.inicioDoDocumento ? this.intervaloDoTrecho(passo) : null;
    if (intervalo) {
      return { ...rolar(intervalo.startContainer.nodeType === 3 ? intervalo.startContainer.parentElement : intervalo.startContainer), intervalo, obterRetangulo: () => uniao(intervalo.getClientRects()) };
    }
    const el = this.elementoDoPasso(passo);
    return { ...base, elemento: el, obterRetangulo: () => (el && el.isConnected ? el.getBoundingClientRect() : null) };
  }

  apontar(alvo, texto) {
    const el = this.elemento(alvo);
    return { passo: { alvo, texto }, indice: -1, elemento: el, texto, prerequisito: true, obterRetangulo: () => (el && el.isConnected ? el.getBoundingClientRect() : null) };
  }

  /** O que fazer antes do passo aparecer */
  prerequisito(passo) {
    const alvo = passo.alvo || passo.alvos?.[0] || 'word.folha';
    const c = this.c;
    const semAlvo = (texto) => ({ passo, indice: -1, elemento: null, texto, prerequisito: true, obterRetangulo: () => null });
    const precisaWord = alvo.startsWith('word.') || alvo.startsWith('dialogo.') || this.ehDoDocumento(passo);
    if (alvo.startsWith('iniciar.')) return this.apontar('barra.iniciar', 'Clique no botão Iniciar (o logotipo do Windows).');
    if (alvo.startsWith('area.')) return this.apontar('barra.areaDeTrabalho', 'As janelas estão cobrindo a Área de Trabalho. Clique neste cantinho (ou minimize as janelas).');
    if (alvo.startsWith('explorador.') || (alvo.startsWith('contexto.') && !c.appAberto('word'))) {
      if (!c.appAberto('explorador')) return this.apontar('barra.explorador', 'Abra o Explorador de Arquivos: a pasta amarela na barra de tarefas.');
      if (!c.janelaVisivel('explorador') || !this.sim.apps.explorador.janela.ativa) return this.apontar('barra.explorador', 'Traga o Explorador de Arquivos para a frente: clique nele na barra de tarefas.');
      const nome = alvo.startsWith('explorador.item.') ? alvo.slice('explorador.item.'.length) : null;
      if (nome) return this.irAtePasta(nome) || semAlvo(passo.texto);
      return semAlvo(passo.texto);
    }
    if (alvo.startsWith('bloco.')) {
      if (!c.appAberto('bloco')) return semAlvo('Primeiro abra o arquivo de texto (dois cliques nele).');
      return this.apontar('barra.bloco', 'Traga o Bloco de Notas para a frente: clique nele na barra de tarefas.');
    }
    if (precisaWord) {
      if (!c.appAberto('word')) {
        return c.menuIniciarAberto() ? this.apontar('iniciar.app.word', 'Clique no Word.') : this.apontar('barra.iniciar', 'Primeiro abra o Word: clique no botão Iniciar.');
      }
      const w = this.word();
      if (!c.janelaVisivel('word') || !w.janela.ativa) return this.apontar('barra.word', 'Traga o Word para a frente: clique no ícone dele na barra de tarefas.');
      if (w.backstage.aberto && !PREFIXOS_DO_ARQUIVO.some((p) => alvo.startsWith(p)) && !alvo.startsWith('dialogo.')) {
        if (!w.temDocumento) return semAlvo('Abra um documento: escolha um da lista Recentes ou crie um Documento em branco.');
        return this.apontar('word.arquivo.voltar', 'Saia do menu Arquivo: clique na seta para voltar ao documento.');
      }
      if (w.editandoMargem && this.ehDoDocumento(passo)) return this.apontar('word.faixa.cabecalhoRodape.fecharCabecalho', 'Primeiro feche o cabeçalho: clique em Fechar Cabeçalho e Rodapé.');
      const guia = alvo.match(/^word\.faixa\.([^.]+)\./)?.[1];
      if (guia && w.faixa.guia !== guia) return this.apontar(`word.guia.${guia}`, `Clique na guia ${this.nomeDaGuia(guia)}.`);
      if (alvo.startsWith('word.arquivo.') || alvo.startsWith('word.salvarComo.') || alvo.startsWith('word.exportar.')) return this.apontar('word.guia.arquivo', 'Clique em Arquivo.');
      if (alvo.startsWith('word.menu.') || alvo.startsWith('contexto.')) return semAlvo('O menu fechou. Volte um passo e abra de novo.');
    }
    return semAlvo(passo.texto);
  }

  /** O arquivo está em outra pasta: mostra o caminho até ela no Explorador */
  irAtePasta(nome) {
    const itens = this.sim.fs.itens.filter((i) => comparavel(i.nome) === comparavel(nome));
    const item = itens.find((i) => i.pasta !== 'Lixeira') || itens[0];
    if (!item) return null;
    if (item.pasta === 'Lixeira') {
      const lixeira = this.elemento('area.icone.Lixeira');
      if (this.visivel(lixeira)) return { ...this.apontar('area.icone.Lixeira', `${nome} está na Lixeira: dê dois cliques nela.`), passo: { alvo: 'area.icone.Lixeira', acao: 'duplo' } };
      return this.apontar('barra.areaDeTrabalho', `${nome} está na Lixeira, que fica na Área de Trabalho. Clique neste cantinho para ver a Área de Trabalho.`);
    }
    const partes = item.pasta.split('/');
    const atual = this.c.pastaDoExplorador() || '';
    // dentro da pasta-mãe: dois cliques na subpasta; senão, começa pela pasta principal
    for (let i = partes.length - 1; i >= 1; i--) {
      if (atual === partes.slice(0, i).join('/')) return { ...this.apontar(`explorador.item.${partes[i]}`, `${nome} está dentro da pasta ${partes[i]}: dê dois cliques nela.`), passo: { alvo: `explorador.item.${partes[i]}`, acao: 'duplo' } };
    }
    return this.apontar(`explorador.nav.${partes[0]}`, `${nome} está em ${partes[0]}: clique em ${partes[0]} no painel da esquerda.`);
  }

  nomeDaGuia(id) {
    return { inicio: 'Página Inicial', inserir: 'Inserir', design: 'Design', layout: 'Layout', referencias: 'Referências', revisao: 'Revisão', exibir: 'Exibir', formatoImagem: 'Formato da Imagem', layoutTabela: 'Layout (da tabela)', cabecalhoRodape: 'Cabeçalho e Rodapé' }[id] || id;
  }

  /** Índice do passo da vez (para saber se o aluno avançou) */
  progresso(objetivo) {
    const r = this.resolver(objetivo);
    return r ? r.indice : -1;
  }

  // ---------------- Mostre-me ----------------

  iniciar(objetivo) {
    this.objetivo = objetivo;
    this.ativo = true;
    this.rolouPara = null;
    this.atualizar();
    clearInterval(this.relogio);
    this.relogio = setInterval(() => this.atualizar(), 300);
  }

  trocarObjetivo(objetivo) {
    this.objetivo = objetivo;
    if (this.ativo) this.atualizar();
  }

  parar() {
    this.ativo = false;
    clearInterval(this.relogio);
    this.holofote.esconder();
  }

  atualizar() {
    if (!this.ativo) return;
    const r = this.resolver();
    if (!r) return this.holofote.esconder();
    const chave = `${r.indice}:${r.texto}`;
    if (r.rolarPara && this.rolouPara !== chave) {
      this.rolouPara = chave;
      r.rolarPara.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    }
    this.holofote.mostrar({ obterRetangulo: r.obterRetangulo, texto: r.texto });
  }
}

function uniao(rects) {
  const lista = [...rects].filter((r) => r.width > 0);
  if (!lista.length) return null;
  const left = Math.min(...lista.map((r) => r.left));
  const top = Math.min(...lista.map((r) => r.top));
  const right = Math.max(...lista.map((r) => r.right));
  const bottom = Math.max(...lista.map((r) => r.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

/** Na folha inteira o anel fica só na parte visível do texto */
function retanguloDaFolha(corpo) {
  if (!corpo.isConnected) return null;
  const r = corpo.getBoundingClientRect();
  const area = corpo.closest('.word-rolagem')?.getBoundingClientRect() || r;
  const top = Math.max(r.top, area.top + 8);
  const bottom = Math.min(r.bottom, area.bottom - 8, top + 160);
  return { left: r.left, top, right: r.right, bottom, width: r.width, height: Math.max(40, bottom - top) };
}
