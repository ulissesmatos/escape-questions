import { h } from '../../../core/dom.js';
import { Simulador } from '../sistema/Simulador.js';
import { icone } from '../sistema/icones.js';
import { Central } from '../ajuda/Central.js';
import { Guia } from '../ajuda/Guia.js';
import { Holofote } from '../ajuda/Holofote.js';
import { DetectorDePerdido } from '../regras/Detector.js';
import { CAPITULOS, MISSOES, calcularEstrelas, missoesLiberadas, personalizar } from '../regras/missoes.js';
import { conceito } from '../regras/conceitos.js';

const COMANDOS_DE_FORMATO = new Set(['negrito', 'italico', 'sublinhado', 'tachado', 'fonte', 'tamanho', 'cor', 'realce', 'aumentarFonte', 'diminuirFonte', 'maiusculas', 'limparFormatacao']);
const NOMES_DE_COMANDO = { negrito: 'Negrito', italico: 'Itálico', sublinhado: 'Sublinhado', colar: 'Colar', salvar: 'Salvar', centralizar: 'Centralizar', marcadores: 'Marcadores', numeracao: 'Numeração', desfazer: 'Desfazer' };

/** Troca {arroba} dentro do conteúdo dos arquivos da missão */
function personalizarArquivos(arquivos, contexto) {
  return arquivos.map((a) => ({ ...a, conteudo: a.conteudo && JSON.parse(personalizar(JSON.stringify(a.conteudo), contexto)) }));
}

/**
 * Uma missão em andamento: o computador simulado à esquerda e a Central à
 * direita. Confere os objetivos a cada ação do aluno, dispara a história
 * (ex.: o vírus), percebe quando ele está perdido e dá ajuda na medida certa.
 *
 * props: { sessao, missao (null = treino livre), aoSair(), aoJogar(missao), alternarTelaCheia() }
 */
export class TelaMissao {
  constructor(props) {
    this.props = props;
    this.el = h('section', { class: 'tela-missao' });
    // monta o computador depois que a tela entra na página (as janelas precisam medir o espaço)
    Promise.resolve().then(() => this.iniciar());
  }

  iniciar() {
    const { sessao, missao } = this.props;
    this.contexto = { arroba: sessao.conta.arroba, nome: sessao.conta.nome };
    this.treino = !missao;
    this.objetivos = missao ? missao.objetivos(this.contexto) : [];
    this.marcos = new Set();
    this.copias = [];
    this.respostas = {};
    this.feitos = this.objetivos.map(() => false);
    this.atual = 0;
    this.roteiroDisparado = new Set();
    this.dicas = 0;
    this.mostreMe = 0;
    this.ajudaNoObjetivo = { dica: false, mostre: false };
    this.ultimasFalas = new Map();
    this.concluida = false;
    this.inicio = Date.now();
    this.ultimoProgressoGuia = -1;
    this.ultimaDigitacaoContada = 0;

    const arquivos = personalizarArquivos(missao ? missao.arquivos : MISSOES[0].arquivos, this.contexto);
    this.pc = h('div', { class: 'missao-pc' });
    const indice = missao ? MISSOES.indexOf(missao) + 1 : 0;
    const cap = missao ? CAPITULOS.find((c) => c.numero === missao.capitulo) : null;
    this.central = new Central({
      titulo: missao ? missao.titulo : 'Treino livre',
      subtitulo: missao ? `Missão ${indice} · Capítulo ${cap.numero}` : 'Sem objetivos: explore à vontade',
      historia: missao ? personalizar(missao.historia, this.contexto) : 'Este computador é todo seu para treinar. Abra o Word pelo menu Iniciar e teste os botões, os menus e os atalhos. Nada aqui vale estrelas.',
      aoDica: () => this.pedirDica(),
      aoMostreMe: () => this.alternarMostreMe(),
      aoResponder: (obj, valor) => this.responder(obj, valor),
      aoSair: () => this.confirmarSaida(),
      aoReiniciar: missao ? () => this.confirmarReinicio() : null,
      aoTelaCheia: this.props.alternarTelaCheia,
      aoConceito: (id) => this.mostrarConceito(id),
      aoRecolher: () => setTimeout(() => window.dispatchEvent(new Event('resize')), 260),
    });
    this.el.replaceChildren(this.pc, this.central.el, this.central.aba);
    this.sim = new Simulador(this.pc, { conta: { arroba: sessao.conta.arroba, nome: sessao.conta.nome }, arquivos });
    this.holofote = new Holofote();
    this.guia = new Guia({ sim: this.sim, holofote: this.holofote });
    this.guia.marcos = this.marcos;
    this.detector = new DetectorDePerdido({ agora: Date.now() });
    this.sim.aoEvento((ev) => this.aoEvento(ev));

    if (missao?.abrir) {
      const item = this.sim.fs.obter(missao.abrir.pasta, missao.abrir.nome, 'docx');
      if (item) this.sim.abrirArquivo(item, { via: 'missao' });
    }
    if (this.treino) {
      this.central.botaoDica.disabled = true;
      this.central.botaoMostre.disabled = true;
      this.central.falar('Treino livre: aqui não tem objetivos. Que tal experimentar o =rand() no Word? Digite =rand() e aperte Enter.');
    } else {
      sessao.iniciarMissao(missao.id);
      this.central.falar(missao.tutorial ? 'Siga a luz: eu vou mostrando onde clicar em cada passo.' : 'Comece pelo objetivo 1. Se travar, peça uma Dica ou clique em Mostre-me.', { tipo: 'info' });
    }
    this.avaliar({ inicial: true });
    // o que o simulador faz sozinho ao abrir a missão não conta como ação do aluno
    this.pronto = false;
    setTimeout(() => {
      this.pronto = true;
      this.detector.reiniciar(Date.now());
    }, 600);
    if (missao?.tutorial) this.ligarMostreMe({ contar: false });
    this.relogio = setInterval(() => this.tique(), 1000);
    this.aoSairDaPagina = (e) => {
      if (!this.concluida && !this.treino) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', this.aoSairDaPagina);
  }

  estado() {
    return { ...this.sim.estado(), marcos: this.marcos, copias: this.copias, respostas: this.respostas };
  }

  get objetivoAtual() {
    return this.objetivos[this.atual] || null;
  }

  // ================= eventos do computador =================

  registrarMarcos(ev) {
    const m = this.marcos;
    if (ev.tipo === 'app' && ev.acao === 'abrir') {
      m.add(`app:abrir:${ev.app}`);
      m.add(`app:abrir:${ev.app}:${ev.via}`);
    }
    if (ev.tipo === 'word') m.add(`word:${ev.acao}`);
    if (ev.tipo === 'arquivo') m.add(`arquivo:${ev.acao}:${ev.nome}`);
    if (ev.tipo === 'comando') m.add(`comando:${ev.comando}`);
    if (ev.tipo === 'desfazer') {
      m.add('desfazer');
      if (ev.marca) m.add(`desfazer:${ev.marca}`);
    }
    if (ev.tipo === 'copiar') this.copias.push({ app: ev.app, texto: ev.texto || '' });
  }

  aoEvento(ev) {
    if (this.concluida) return;
    if (ev.tipo === 'desligar') return this.confirmarSaida();
    this.registrarMarcos(ev);
    const antes = this.feitos.filter(Boolean).length;
    this.avaliar();
    if (this.treino || this.concluida) return;
    const agora = Date.now();
    const estado = this.estado();
    const objetivo = this.objetivoAtual;
    const avancou = this.feitos.filter(Boolean).length > antes;

    // erro conhecido: a Central explica na hora (na digitação, espera uma pausa)
    let fala = this.diagnosticoGeral(ev, estado);
    if (!fala && objetivo?.diagnosticar) {
      if (ev.tipo === 'digitar') this.agendarDiagnosticoDeDigitacao(objetivo, ev);
      else fala = this.diagnosticar(objetivo, ev, estado);
    }
    if (fala) this.falarUmaVez(fala, 'alerta');

    if (!this.pronto || !this.contaComoAcao(ev, agora)) return;
    // o passo do Mostre-me avançou? (olha depois da tela se atualizar)
    setTimeout(() => {
      if (this.concluida) return;
      const progresso = objetivo ? this.guia.progresso(objetivo) : -1;
      const util = avancou || progresso > this.ultimoProgressoGuia || Boolean(objetivo?.util?.(ev, estado));
      if (progresso > this.ultimoProgressoGuia) this.ultimoProgressoGuia = progresso;
      const intervencao = this.detector.acao({ util, tipo: ev.tipo, chave: ev.comando || ev.menu || null }, Date.now());
      if (fala) this.detector.ajudaPedida(1, Date.now());
      else if (intervencao && !this.props.missao.tutorial) this.intervir(intervencao);
    }, 30);
  }

  diagnosticar(objetivo, ev, estado) {
    try {
      return objetivo.diagnosticar(ev, estado);
    } catch {
      return null;
    }
  }

  agendarDiagnosticoDeDigitacao(objetivo, ev) {
    clearTimeout(this.tempoDiagnostico);
    this.tempoDiagnostico = setTimeout(() => {
      if (this.concluida || this.objetivoAtual !== objetivo) return;
      const fala = this.diagnosticar(objetivo, ev, this.estado());
      if (fala) {
        this.falarUmaVez(fala, 'alerta');
        this.detector.ajudaPedida(1, Date.now());
      }
    }, 1800);
  }

  /** Quais eventos contam como "uma ação" para o detector de perdido */
  contaComoAcao(ev, agora) {
    if (['comando', 'guia', 'menu', 'navegar', 'arquivo', 'clique-vazio', 'zoom', 'digame', 'tecla-perdida', 'mostrar-area', 'selecionar-tudo', 'copiar', 'colar', 'desfazer', 'clique-imagem'].includes(ev.tipo)) return true;
    if (ev.tipo === 'app') return true;
    if (ev.tipo === 'dialogo') return ev.acao !== 'fechar';
    if (ev.tipo === 'digitar') {
      if (agora - this.ultimaDigitacaoContada < 4000) return false;
      this.ultimaDigitacaoContada = agora;
      return true;
    }
    return false;
  }

  /** Erros comuns que não dependem do objetivo */
  diagnosticoGeral(ev, estado) {
    if (ev.tipo === 'atalho') {
      if (ev.teclas === 'Ctrl+B' && ev.selecao?.trim()) return 'Atenção: no Word em português, Ctrl+B é SALVAR. Para negrito, use Ctrl+N (N de Negrito).';
      if (ev.teclas === 'Ctrl+A') return 'No Word em português, Ctrl+A abre outro arquivo. Para selecionar tudo, use Ctrl+T (T de Tudo). Aperte Esc para voltar ao documento.';
      if (ev.teclas === 'Ctrl+S' && !this.objetivoAtual?.texto.toLowerCase().includes('sublinhado')) return 'Ctrl+S sublinha o texto (S de Sublinhado). Para salvar no Word em português, use Ctrl+B.';
    }
    if (ev.tipo === 'comando' && COMANDOS_DE_FORMATO.has(ev.comando) && ev.vazio && ev.origem !== 'contexto') {
      return 'Nada estava selecionado. Para formatar, primeiro selecione o texto: dois cliques numa palavra ou arraste o mouse.';
    }
    if (ev.tipo === 'tecla-perdida') {
      return estado.apps.ativo === 'word' ? 'Você está digitando, mas o cursor não está na folha. Clique dentro do documento primeiro.' : 'Você está digitando, mas nenhum programa está aberto para receber o texto. Abra o programa e clique onde quer escrever.';
    }
    if (ev.tipo === 'abrir-na-lixeira') return 'Arquivos que estão na Lixeira não abrem. Primeiro restaure: botão direito › Restaurar.';
    if (ev.tipo === 'abrir-link') return 'Os links não abrem no simulador (aqui não tem internet), mas no Word de verdade Ctrl + clique abre o site.';
    return null;
  }

  falarUmaVez(texto, tipo, extra = {}) {
    const agora = Date.now();
    if (agora - (this.ultimasFalas.get(texto) || 0) < 20000) return null;
    this.ultimasFalas.set(texto, agora);
    return this.central.falar(texto, { tipo, ...extra });
  }

  // ================= objetivos =================

  avaliar({ inicial = false } = {}) {
    if (this.concluida || this.treino) {
      if (this.treino) this.central.desenharObjetivos([], -1);
      return;
    }
    const estado = this.estado();
    let anterioresOk = true;
    const novos = this.objetivos.map((o) => {
      let ok = false;
      try {
        ok = Boolean(o.verificar(estado));
      } catch {
        ok = false;
      }
      if (o.aposAnteriores && !anterioresOk) ok = false;
      anterioresOk = anterioresOk && ok;
      return ok;
    });
    const recemFeitos = novos.map((ok, i) => ok && !this.feitos[i]);
    this.feitos = novos;
    const atual = novos.findIndex((ok) => !ok);
    const mudouAtual = atual !== this.atual;
    this.atual = atual === -1 ? this.objetivos.length : atual;
    this.central.desenharObjetivos(this.objetivos.map((objetivo, i) => ({ objetivo, feito: novos[i] })), this.atual);

    if (!inicial) {
      recemFeitos.forEach((feito, i) => {
        if (!feito) return;
        this.central.objetivoConcluido(i);
        this.dispararRoteiro(i);
      });
    }
    if (mudouAtual || recemFeitos.some(Boolean)) {
      this.detector.reiniciar(Date.now());
      this.ultimoProgressoGuia = -1;
      this.ajudaNoObjetivo = { dica: false, mostre: false };
      this.central.chamarAtencao('dica', false);
      this.central.chamarAtencao('mostre', false);
      if (this.guia.ativo) {
        if (this.props.missao.tutorial) this.guia.trocarObjetivo(this.objetivoAtual);
        else if (this.objetivoAtual) {
          this.desligarMostreMe();
          if (recemFeitos.some(Boolean)) this.central.falar('Isso! Agora tente o próximo objetivo sozinho. Se precisar, é só pedir.', { tipo: 'info' });
        }
      }
    }
    if (this.feitos.every(Boolean) && this.objetivos.length) {
      this.concluida = true;
      setTimeout(() => this.concluir(), 900);
    }
  }

  dispararRoteiro(indice) {
    for (const [i, passo] of (this.props.missao.roteiro || []).entries()) {
      if (passo.quando?.objetivo !== indice || this.roteiroDisparado.has(i)) continue;
      this.roteiroDisparado.add(i);
      setTimeout(() => this.executarRoteiro(passo), 700);
    }
  }

  /** Acontecimentos da história da missão */
  executarRoteiro(passo) {
    if (passo.acao === 'virus') {
      const word = this.sim.apps.word;
      const achado = word?.temDocumento && word.inspetor.achar(passo.trecho);
      if (!achado) return;
      this.sim.el.classList.add('virus');
      setTimeout(() => this.sim.el.classList.remove('virus'), 1400);
      word.documento.mudar('Vírus do Dr. Kaos', () => achado.bloco.remove(), { marca: 'virus' });
      this.marcos.add('virus');
      this.central.falar(personalizar(passo.fala, this.contexto), { tipo: 'alerta' });
      this.avaliar();
    }
  }

  responder(objetivo, valor) {
    const estado = this.estado();
    if (objetivo.conferir(valor, estado)) {
      this.respostas[objetivo.pergunta.id] = valor;
      this.avaliar();
    } else {
      this.central.falar(`"${valor}" não está certo. Confira de novo!`, { tipo: 'alerta' });
      const intervencao = this.detector.acao({ util: false, tipo: 'resposta' }, Date.now());
      if (intervencao) this.intervir(intervencao);
    }
  }

  // ================= ajuda =================

  tique() {
    this.central.definirTempo(Date.now() - this.inicio);
    if (this.concluida || this.treino || this.props.missao.tutorial) return;
    const intervencao = this.detector.tick(Date.now());
    if (intervencao) this.intervir(intervencao);
  }

  nomeDaGuiaDoObjetivo() {
    const passo = (this.objetivoAtual?.caminho || []).find((p) => p.alvo?.startsWith('word.guia.') && p.alvo !== 'word.guia.arquivo');
    return passo ? this.guia.nomeDaGuia(passo.alvo.slice(10)) : null;
  }

  intervir({ nivel, motivo, chave }) {
    const objetivo = this.objetivoAtual;
    if (!objetivo) return;
    if (nivel === 1) {
      let texto = 'Precisa de uma pista? Clique em Dica.';
      if (motivo === 'guias') {
        const guia = this.nomeDaGuiaDoObjetivo();
        texto = guia ? `Procurando o botão? O que você precisa está na guia ${guia}.` : 'Procurando algum botão? Leia de novo o objetivo e, se quiser, peça uma Dica.';
      } else if (motivo === 'repetido') {
        texto = `Você usou "${NOMES_DE_COMANDO[chave] || chave}" várias vezes. Se não deu certo, talvez falte selecionar o texto antes, ou o caminho seja outro.`;
      } else if (motivo === 'parado') {
        texto = 'Tudo certo por aí? Se travar, a Central dá uma pista.';
      }
      this.central.falar(texto, { tipo: 'pergunta', acoes: [{ rotulo: 'Ver dica', primaria: true, acao: () => this.pedirDica() }, { rotulo: 'Estou bem', acao: () => {} }] });
      this.central.chamarAtencao('dica', true);
    } else if (nivel === 2) {
      this.contarAjuda('dica');
      this.central.falar(objetivo.dica || 'Leia o objetivo com calma.', { tipo: 'dica', acoes: [{ rotulo: 'Mostre-me onde', primaria: true, acao: () => this.ligarMostreMe() }] });
      this.central.chamarAtencao('dica', false);
      this.central.chamarAtencao('mostre', true);
    } else if (nivel === 3 && !this.guia.ativo) {
      this.central.falar('Parece que esse está difícil. Vou te mostrar o caminho: siga a luz!', { tipo: 'info' });
      this.ligarMostreMe();
    }
  }

  contarAjuda(tipo) {
    if (tipo === 'dica' && !this.ajudaNoObjetivo.dica) {
      this.ajudaNoObjetivo.dica = true;
      this.dicas += 1;
    }
    if (tipo === 'mostre' && !this.ajudaNoObjetivo.mostre) {
      this.ajudaNoObjetivo.mostre = true;
      this.mostreMe += 1;
    }
  }

  pedirDica() {
    const objetivo = this.objetivoAtual;
    if (!objetivo || this.concluida) return;
    this.contarAjuda('dica');
    this.detector.ajudaPedida(2, Date.now());
    this.central.chamarAtencao('dica', false);
    this.central.falar(objetivo.dica || 'Leia o objetivo com calma.', { tipo: 'dica', acoes: objetivo.caminho?.length ? [{ rotulo: 'Mostre-me onde', acao: () => this.ligarMostreMe() }] : [] });
  }

  alternarMostreMe() {
    if (this.guia.ativo) this.desligarMostreMe();
    else this.ligarMostreMe();
  }

  ligarMostreMe({ contar = true } = {}) {
    const objetivo = this.objetivoAtual;
    if (!objetivo || this.concluida) return;
    if (!objetivo.caminho?.length) {
      this.pedirDica();
      return;
    }
    if (contar && !this.props.missao.tutorial) this.contarAjuda('mostre');
    this.detector.ajudaPedida(3, Date.now());
    this.guia.iniciar(objetivo);
    this.central.mostreMeAtivo(true);
    this.central.chamarAtencao('mostre', false);
  }

  desligarMostreMe() {
    this.guia.parar();
    this.central.mostreMeAtivo(false);
  }

  mostrarConceito(id) {
    const c = conceito(id);
    this.central.falar(`${c.titulo}: ${c.texto} Onde: ${c.onde}.${c.atalho ? ` Atalho: ${c.atalho}.` : ''}`, { tipo: 'dica' });
  }

  // ================= fim da missão =================

  async concluir() {
    clearInterval(this.relogio);
    this.desligarMostreMe();
    const { missao, sessao } = this.props;
    const tempoMs = Date.now() - this.inicio;
    const estrelas = calcularEstrelas({ dicas: this.dicas, mostreMe: this.mostreMe, tutorial: missao.tutorial });
    const documento = this.sim.apps.word?.documentoParaEntrega?.() || null;
    const envio = sessao.concluirMissao(missao.id, { estrelas, tempoMs, dicas: this.dicas, mostreMe: this.mostreMe, perdido: this.detector.vezesPerdido, documento });
    this.mostrarResultado({ estrelas, tempoMs, envio });
  }

  mostrarResultado({ estrelas, tempoMs, envio }) {
    const { missao, sessao } = this.props;
    const indice = MISSOES.indexOf(missao);
    const proxima = MISSOES[indice + 1] || null;
    const liberadas = missoesLiberadas([...sessao.concluidas(), missao.id], sessao.config);
    const min = Math.floor(tempoMs / 60000);
    const seg = Math.round((tempoMs % 60000) / 1000);
    const ajuda =
      missao.tutorial
        ? 'Missão guiada concluída!'
        : this.dicas + this.mostreMe === 0
          ? 'Sem pedir nenhuma ajuda. Excelente!'
          : `Com ${[this.dicas && `${this.dicas} ${this.dicas === 1 ? 'dica' : 'dicas'}`, this.mostreMe && `${this.mostreMe} Mostre-me`].filter(Boolean).join(' e ')}.`;
    const status = h('p', { class: 'resultado-status', text: 'Salvando seu progresso...' });
    envio.then(({ salvo }) => (status.textContent = salvo ? `Progresso salvo no seu @${sessao.conta.arroba}.` : 'Sem conexão agora: seu progresso ficou guardado neste computador e será enviado depois.'));
    const fundo = h(
      'div',
      { class: 'resultado-fundo' },
      h(
        'div',
        { class: 'resultado' },
        h('p', { class: 'base-olho', text: `MISSÃO ${indice + 1} CUMPRIDA` }),
        h('h2', { class: 'resultado-titulo', text: missao.titulo }),
        h('div', { class: 'resultado-estrelas' }, [0, 1, 2].map((i) => h('span', { class: i < estrelas ? 'cheia' : 'vazia', style: { animationDelay: `${0.25 + i * 0.25}s` }, text: '★' }))),
        h('p', { class: 'resultado-info', text: `${ajuda} Tempo: ${min ? `${min} min ` : ''}${seg} s.` }),
        !missao.tutorial && estrelas < 3 && h('p', { class: 'resultado-dica', text: 'Para 3 estrelas: faça a missão de novo usando no máximo uma dica.' }),
        h('p', { class: 'resultado-conclusao', text: personalizar(missao.conclusao, this.contexto) }),
        h('h3', { class: 'briefing-secao', text: 'Você aprendeu' }),
        h('div', { class: 'resultado-conceitos' }, missao.conceitos.map((id) => {
          const c = conceito(id);
          return h('span', { class: 'resultado-conceito' }, icone(c.icone, { tamanho: 16 }), h('strong', { text: c.titulo }), c.atalho && h('small', { text: c.atalho }));
        })),
        status,
        h(
          'div',
          { class: 'briefing-acoes' },
          h('button', { type: 'button', class: 'base-botao', text: 'Voltar à base', onClick: () => this.sair() }),
          h('button', { type: 'button', class: 'base-botao', text: 'Repetir', onClick: () => this.reiniciar() }),
          proxima && liberadas.has(proxima.id) && h('button', { type: 'button', class: 'base-jogar', onClick: () => (this.destruir(), this.props.aoJogar(proxima)) }, 'Próxima missão', icone('arrow_right', { tamanho: 18 }))
        )
      )
    );
    this.el.append(fundo);
  }

  // ================= sair e recomeçar =================

  confirmar(texto, rotulo, acao) {
    const fundo = h('div', { class: 'resultado-fundo' });
    fundo.append(
      h(
        'div',
        { class: 'resultado pequeno' },
        h('p', { class: 'resultado-conclusao', text: texto }),
        h('div', { class: 'briefing-acoes' }, h('button', { type: 'button', class: 'base-botao', text: 'Continuar a missão', onClick: () => fundo.remove() }), h('button', { type: 'button', class: 'base-jogar perigo', text: rotulo, onClick: () => (fundo.remove(), acao()) }))
      )
    );
    this.el.append(fundo);
    fundo.querySelector('.base-botao').focus();
  }

  confirmarSaida() {
    if (this.concluida || this.treino) return this.sair();
    this.confirmar('Sair da missão? O que você fez nesta missão não fica salvo (as missões já concluídas continuam valendo).', 'Sair da missão', () => this.sair());
  }

  confirmarReinicio() {
    this.confirmar('Recomeçar a missão do zero? O computador volta a ser como era no começo.', 'Recomeçar', () => this.reiniciar());
  }

  reiniciar() {
    this.destruir();
    this.el.replaceChildren();
    this.iniciar();
  }

  sair() {
    this.destruir();
    this.props.aoSair();
  }

  destruir() {
    clearInterval(this.relogio);
    clearTimeout(this.tempoDiagnostico);
    window.removeEventListener('beforeunload', this.aoSairDaPagina);
    this.guia?.parar();
    this.holofote?.destruir();
    this.sim?.destruir();
  }
}
