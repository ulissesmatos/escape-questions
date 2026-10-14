import { h } from '../../../core/dom.js';
import { SistemaDeArquivos } from '../regras/SistemaDeArquivos.js';
import { AreaDeTrabalho } from './AreaDeTrabalho.js';
import { BarraDeTarefas } from './BarraDeTarefas.js';
import { MenuIniciar } from './MenuIniciar.js';
import { MenuDeContexto } from './MenuDeContexto.js';
import { Dica } from './Dica.js';
import { Dialogo } from './Dialogo.js';
import { Explorador } from './apps/Explorador.js';
import { BlocoDeNotas } from './apps/BlocoDeNotas.js';
import { Fotos } from './apps/Fotos.js';
import { Edge } from './apps/Edge.js';
import { Word } from './word/Word.js';
import { ALTURA_BARRA_TAREFAS } from './Janela.js';

export const APPS = {
  word: { Classe: Word, nome: 'Word' },
  bloco: { Classe: BlocoDeNotas, nome: 'Bloco de Notas' },
  explorador: { Classe: Explorador, nome: 'Explorador de Arquivos' },
  fotos: { Classe: Fotos, nome: 'Fotos' },
  edge: { Classe: Edge, nome: 'Microsoft Edge' },
};

/**
 * O computador simulado: Área de Trabalho, barra de tarefas, menu Iniciar,
 * janelas dos programas e o sistema de arquivos.
 *
 * Tudo o que o aluno faz vira um evento (emitir), que a missão usa para
 * conferir objetivos, perceber quando o aluno está perdido e guiar o
 * Mostre-me. estado() resume o computador para os objetivos e consulta
 * responde perguntas do Mostre-me ("qual pasta está aberta no diálogo?").
 *
 * opcoes: { conta: { arroba, nome }, arquivos }
 */
export class Simulador {
  constructor(raiz, { conta, arquivos = [] }) {
    this.conta = conta;
    this.fs = new SistemaDeArquivos(arquivos);
    this.janelas = [];
    this.janelaAtiva = null;
    this.apps = {};
    this.ouvintes = new Set();
    this.areaDeTransferencia = null; // { texto, html, app }
    this.arquivoNaTransferencia = null; // { id, modo }
    this.dialogoDeArquivo = null;
    this.zTopo = 10;

    this.camadaJanelas = h('div', { class: 'camada-janelas' });
    this.camadaDialogos = h('div', { class: 'camada-dialogos' });
    this.area = new AreaDeTrabalho(this);
    this.barra = new BarraDeTarefas(this);
    this.menuIniciar = new MenuIniciar(this);
    this.tela = h('div', { class: 'win-tela', 'data-alvo': 'tela' }, this.area.el, this.camadaJanelas, this.menuIniciar.el, this.barra.el, this.camadaDialogos);
    this.el = h('div', { class: 'sim' }, this.tela);
    raiz.append(this.el);
    this.dica = new Dica(this.el);

    this.aoTeclar = (e) => this.teclar(e);
    document.addEventListener('keydown', this.aoTeclar);
    this.tela.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('input, textarea')) e.preventDefault();
    });
    this.aoRedimensionarTela = () => this.janelas.forEach((j) => j.maximizada && j.aoRedimensionar());
    window.addEventListener('resize', this.aoRedimensionarTela);
    this.fs.aoMudar(() => this.area.desenhar());
  }

  // ---------------- eventos ----------------

  aoEvento(fn) {
    this.ouvintes.add(fn);
    return () => this.ouvintes.delete(fn);
  }

  emitir(evento) {
    // o que se copia em qualquer programa fica disponível para colar nos outros
    if (evento.tipo === 'copiar' && evento.texto) this.areaDeTransferencia = { texto: evento.texto, html: evento.html || null, app: evento.app };
    for (const fn of this.ouvintes) fn(evento);
  }

  // ---------------- programas ----------------

  /** Abre (ou traz para frente) um programa. opcoes: { via, arquivo } */
  abrirApp(id, opcoes = {}) {
    const def = APPS[id];
    if (!def) {
      Dialogo.mensagem(this, { titulo: 'Windows', texto: 'Este aplicativo não faz parte do simulador. Use o Word, o Bloco de Notas ou o Explorador de Arquivos.', nome: 'semApp' });
      this.emitir({ tipo: 'app', acao: 'indisponivel', app: id });
      return null;
    }
    MenuDeContexto.fechar();
    this.menuIniciar.fechar();
    let app = this.apps[id];
    const novo = !app || app.janela.fechada;
    if (novo) {
      app = new def.Classe(this, opcoes);
      this.apps[id] = app;
      app.janela.abrir();
      this.emitir({ tipo: 'app', acao: 'abrir', app: id, nome: def.nome, via: opcoes.via || 'outro' });
    } else {
      app.janela.focar();
      this.emitir({ tipo: 'app', acao: 'focar', app: id, nome: def.nome, via: opcoes.via || 'outro' });
    }
    this.barra.atualizar();
    return app;
  }

  /** Dois cliques num arquivo: abre no programa certo */
  async abrirArquivo(item, { via = 'explorador', app = null } = {}) {
    const destino = app || { docx: 'word', txt: 'bloco', imagem: 'fotos', pdf: 'edge' }[item.tipo];
    if (item.tipo === 'pasta') {
      const explorador = this.abrirApp('explorador', { via });
      explorador?.ir(SistemaDeArquivos.caminhoDaPasta(item));
      return;
    }
    const programa = this.abrirApp(destino, { via });
    if (!programa) return;
    await programa.abrirArquivo(item);
  }

  // ---------------- janelas ----------------

  areaDeTrabalhoUtil() {
    return { largura: this.tela.clientWidth, altura: this.tela.clientHeight - ALTURA_BARRA_TAREFAS };
  }

  focarJanela(janela) {
    if (this.janelaAtiva === janela && janela.el.style.zIndex) return;
    this.janelas = this.janelas.filter((j) => j !== janela).concat(janela);
    janela.el.style.zIndex = String(++this.zTopo);
    for (const j of this.janelas) j.el.classList.toggle('win-ativa', j === janela);
    this.janelaAtiva = janela;
    this.barra.atualizar();
  }

  janelaMinimizada(janela) {
    if (this.janelaAtiva === janela) {
      const proxima = [...this.janelas].reverse().find((j) => !j.minimizada && !j.fechada);
      this.janelaAtiva = null;
      if (proxima) this.focarJanela(proxima);
      else for (const j of this.janelas) j.el.classList.remove('win-ativa');
    }
    this.barra.atualizar();
  }

  janelaFechada(janela) {
    this.janelas = this.janelas.filter((j) => j !== janela);
    if (this.janelaAtiva === janela) {
      this.janelaAtiva = null;
      const proxima = [...this.janelas].reverse().find((j) => !j.minimizada);
      if (proxima) this.focarJanela(proxima);
    }
    this.barra.atualizar();
  }

  /** Clique no programa da barra de tarefas (como no Windows) */
  alternarApp(id) {
    const app = this.apps[id];
    if (!app || app.janela.fechada) return this.abrirApp(id, { via: 'barra' });
    if (app.janela.ativa && !app.janela.minimizada) return app.janela.minimizar();
    app.janela.focar();
    this.emitir({ tipo: 'app', acao: 'focar', app: id, nome: APPS[id].nome, via: 'barra' });
    return app;
  }

  /** Cantinho direito da barra: minimiza tudo (ou volta tudo) */
  mostrarAreaDeTrabalho() {
    const abertas = this.janelas.filter((j) => !j.minimizada);
    if (abertas.length) {
      this.minimizadasPeloCanto = abertas;
      abertas.forEach((j) => j.minimizar());
    } else if (this.minimizadasPeloCanto) {
      this.minimizadasPeloCanto.filter((j) => !j.fechada).forEach((j) => j.focar());
      this.minimizadasPeloCanto = null;
    }
    this.emitir({ tipo: 'mostrar-area' });
  }

  /** Depois de fechar um diálogo, o foco volta para o programa ativo */
  devolverFoco() {
    this.janelaAtiva?.aoReceberFoco?.();
  }

  // ---------------- teclado ----------------

  teclar(e) {
    if (!this.el.isConnected || !this.el.contains(document.activeElement) && document.activeElement !== document.body) return;
    if (this.camadaDialogos.childElementCount) return;
    if (e.target.closest?.('.central, .missao-painel')) return;
    if (MenuDeContexto.aberto) return;
    if (this.menuIniciar.aberto) return void this.menuIniciar.aoTeclar(e);
    const janela = this.janelaAtiva;
    if (janela && !janela.minimizada && janela.aoTeclar(e)) return;
    if (!janela || janela.minimizada) this.area.aoTeclar(e);
    // letra digitada que não foi para lugar nenhum (nenhum campo de texto com foco)
    const editavel = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
    if (!editavel && /^[\p{L}\p{N}]$/u.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey && Date.now() - (this.ultimaTeclaPerdida || 0) > 3000) {
      this.ultimaTeclaPerdida = Date.now();
      this.emitir({ tipo: 'tecla-perdida', tecla: e.key });
    }
  }

  // ---------------- leitura para a missão ----------------

  estado() {
    const apps = Object.entries(this.apps).filter(([, a]) => !a.janela.fechada);
    return {
      arroba: this.conta.arroba,
      fs: this.fs,
      apps: {
        abertos: apps.map(([id]) => id),
        ativo: Object.keys(this.apps).find((id) => this.apps[id].janela === this.janelaAtiva) || null,
      },
      word: this.apps.word && !this.apps.word.janela.fechada ? this.apps.word.estado() : null,
      bloco: this.apps.bloco && !this.apps.bloco.janela.fechada ? this.apps.bloco.estado() : null,
    };
  }

  /** Perguntas que o Mostre-me faz para saber se um passo já foi feito */
  get consulta() {
    return {
      pastaDoDialogo: () => this.dialogoDeArquivo?.pasta || null,
      pastaDoExplorador: () => (this.apps.explorador && !this.apps.explorador.janela.fechada ? this.apps.explorador.pasta : null),
      blocoTemSelecao: () => Boolean(this.apps.bloco?.temSelecaoCompleta?.()),
      valorDoCampo: (alvo) => {
        const el = this.el.querySelector(`[data-alvo="${CSS.escape(alvo)}"]`);
        return el ? el.value : null;
      },
      word: () => (this.apps.word && !this.apps.word.janela.fechada ? this.apps.word : null),
      menuIniciarAberto: () => this.menuIniciar.aberto,
      janelaVisivel: (id) => Boolean(this.apps[id] && !this.apps[id].janela.fechada && !this.apps[id].janela.minimizada),
      appAberto: (id) => Boolean(this.apps[id] && !this.apps[id].janela.fechada),
      /** O cursor (ou a seleção) está dentro do trecho? */
      cursorDentro: (trecho) => {
        const w = this.consulta.word();
        const achado = w?.temDocumento && w.inspetor.achar(trecho);
        const sel = achado && w.documento.intervalo();
        if (!sel) return false;
        const r = achado.mapa.intervalo(achado.inicio, achado.fim);
        return r.compareBoundaryPoints(Range.START_TO_START, sel) <= 0 && r.compareBoundaryPoints(Range.END_TO_END, sel) >= 0;
      },
      /** O cursor está no item de lista logo depois do item que tem o trecho? */
      cursorNoItemDepois: (trecho) => {
        const w = this.consulta.word();
        const achado = w?.temDocumento && w.inspetor.achar(trecho);
        const sel = achado && w.documento.intervalo();
        const proximo = achado?.bloco.nextElementSibling;
        return Boolean(sel && proximo && (proximo === sel.startContainer || proximo.contains(sel.startContainer)));
      },
      arquivoRecortado: (nome) => {
        const guardado = this.arquivoNaTransferencia;
        return Boolean(guardado && guardado.modo === 'recortar' && this.fs.porId(guardado.id)?.nome === nome);
      },
    };
  }

  destruir() {
    document.removeEventListener('keydown', this.aoTeclar);
    window.removeEventListener('resize', this.aoRedimensionarTela);
    MenuDeContexto.fechar();
    this.menuIniciar.destruir();
    clearInterval(this.barra.intervalo);
    for (const app of Object.values(this.apps)) app.destruir?.();
    this.el.remove();
    this.ouvintes.clear();
  }
}
