import { h } from '../../core/dom.js';
import { api } from '../../core/ApiClient.js';
import { ScreenFlow } from '../../core/ScreenFlow.js';
import { IdentityForm } from '../../components/IdentityForm.js';
import { PlayerChip, BackBar, ProgressBar, estadoCarregando, estadoVazio } from '../../components/ui.js';
import { LevelGrid } from './LevelGrid.js';
import { HardwareMap } from './HardwareMap.js';
import { SkillMeter } from './SkillMeter.js';
import { ChallengeModal } from './ChallengeModal.js';

/** Página do Mapa de Hardware: identificação → níveis → mapa do nível. */
export class HardwarePage {
  constructor(raiz) {
    this.raiz = raiz;
    this.identidade = null;
    this.niveis = [];
    this.nivelAtual = null;
  }

  iniciar() {
    this.telas = {
      identificacao: h('section'),
      niveis: h('section', { hidden: true }),
      mapa: h('section', { hidden: true }),
      carregando: h('section', { hidden: true }),
    };
    this.raiz.append(...Object.values(this.telas));

    this.fluxo = new ScreenFlow({
      telas: this.telas,
      aoMostrar: (nome) => {
        document.getElementById('pagina-topo').hidden = nome === 'mapa';
        window.scrollTo({ top: 0 });
      },
      aoVoltarNoHistorico: (estado) => this.aoVoltarNoHistorico(estado),
    });

    this.formulario = new IdentityForm({
      titulo: 'Quem vai explorar?',
      textoBotao: 'Começar →',
      chave: 'hardware',
      onEnviar: (identidade) => this.identificar(identidade),
    });
    this.formulario.montar(this.telas.identificacao);
    this.fluxo.mostrar('identificacao');
  }

  carregando(texto) {
    this.telas.carregando.replaceChildren(estadoCarregando(texto));
    this.fluxo.mostrar('carregando');
  }

  falha(mensagem, tentarDeNovo) {
    this.telas.carregando.replaceChildren(
      estadoVazio({
        icone: '⚠️',
        titulo: 'Não foi possível carregar',
        texto: mensagem,
        acao: h('button', { type: 'button', class: 'btn btn-primario', text: 'Tentar de novo', onClick: tentarDeNovo }),
      })
    );
    this.fluxo.mostrar('carregando');
  }

  async identificar(identidade) {
    this.identidade = identidade;
    this.modal = new ChallengeModal({
      identidade,
      onResultado: (dados) => this.aoResponder(dados),
    });
    await this.abrirNiveis({ substituir: true });
  }

  trocarJogador() {
    this.identidade = null;
    history.replaceState({}, '', location.pathname);
    this.fluxo.mostrar('identificacao');
    this.formulario.focar();
  }

  aoVoltarNoHistorico(estado) {
    if (this.modal && this.modal.aberto) this.modal.fechar({ restaurarFoco: false });
    if (!this.identidade) return this.fluxo.mostrar('identificacao');
    const nivel = estado.tela === 'mapa' && this.niveis.find((n) => n.id === estado.nivelId);
    if (nivel) this.abrirNivel(nivel, { registrarHistorico: false });
    else this.abrirNiveis({ registrarHistorico: false });
  }

  // ---------------- Níveis ----------------

  async abrirNiveis({ substituir = false, registrarHistorico = true } = {}) {
    this.nivelAtual = null;
    this.carregando('Carregando níveis...');
    try {
      this.niveis = await api.post('/hardware/niveis', this.identidade);
    } catch (err) {
      return this.falha(err.message, () => this.abrirNiveis({ substituir, registrarHistorico }));
    }

    const conteudo = this.niveis.length
      ? new LevelGrid({ niveis: this.niveis, onEscolher: (nivel) => this.abrirNivel(nivel) }).montar()
      : estadoVazio({ icone: '🗺️', titulo: 'Nenhum nível cadastrado ainda', texto: 'Avise o professor.' });

    this.telas.niveis.replaceChildren(
      new PlayerChip({ rotulo: 'Explorando como', identidade: this.identidade, onTrocar: () => this.trocarJogador() }).montar(),
      h('h2', { class: 'titulo-etapa', text: 'Escolha um nível' }),
      h('p', { class: 'subtitulo-etapa', text: 'Complete 100% de um nível para liberar o próximo.' }),
      conteudo
    );

    if (!registrarHistorico) this.fluxo.mostrar('niveis');
    else if (substituir) this.fluxo.substituir('niveis');
    else this.fluxo.ir('niveis');
  }

  // ---------------- Mapa ----------------

  async abrirNivel(nivel, { registrarHistorico = true } = {}) {
    this.nivelAtual = nivel;
    this.carregando('Carregando o mapa...');

    let dados;
    try {
      dados = await api.post('/hardware/mapa', { ...this.identidade, nivelId: nivel.id });
    } catch (err) {
      return this.falha(err.message, () => this.abrirNivel(nivel, { registrarHistorico }));
    }
    if (this.nivelAtual !== nivel) return; // voltou enquanto carregava

    this.dadosMapa = dados;
    this.descobertos = new Set(dados.descobertos);
    this.montarTelaMapa(dados);

    if (!registrarHistorico) this.fluxo.mostrar('mapa');
    else if (history.state && history.state.tela === 'mapa') this.fluxo.substituir('mapa', { nivelId: nivel.id });
    else this.fluxo.ir('mapa', { nivelId: nivel.id }, { hash: `nivel-${nivel.id}` });
  }

  montarTelaMapa(dados) {
    const voltar = () => this.fluxo.voltar(() => this.abrirNiveis());

    this.progresso = new ProgressBar({ fixa: true });
    this.medidor = new SkillMeter({ perfil: dados.perfil });
    this.mapa = new HardwareMap({
      componentes: dados.componentes,
      conexoes: dados.conexoes,
      descobertos: this.descobertos,
      onEscolher: ({ componente, estado }) => this.modal.abrirPara(componente, { descoberto: estado === 'descoberto' }),
    });

    this.aviso = h('div', { class: 'nivel-completo', hidden: true });

    this.telas.mapa.replaceChildren(
      new BackBar({ texto: 'Voltar aos níveis', migalhas: ['Níveis', dados.nivel.nome], onVoltar: voltar }).montar(),
      h(
        'div',
        { class: 'mapa-cabecalho' },
        h('div', {}, h('h2', { text: dados.nivel.nome }), dados.nivel.descricao && h('p', { text: dados.nivel.descricao })),
        this.medidor.montar()
      ),
      this.progresso.montar(),
      this.aviso,
      dados.componentes.length
        ? this.mapa.montar()
        : estadoVazio({ icone: '🧩', titulo: 'Este nível ainda não tem peças', texto: 'Avise o professor.' }),
      h(
        'ul',
        { class: 'legenda' },
        h('li', {}, h('span', { class: 'legenda-bolinha legenda-bloqueado' }), 'Bloqueada'),
        h('li', {}, h('span', { class: 'legenda-bolinha legenda-desbloqueado' }), 'Liberada — toque para responder'),
        h('li', {}, h('span', { class: 'legenda-bolinha legenda-descoberto' }), 'Descoberta')
      )
    );
    this.atualizarProgresso();
  }

  atualizarProgresso() {
    const total = this.dadosMapa.componentes.length;
    const feitos = this.dadosMapa.componentes.filter((c) => this.descobertos.has(c.id)).length;
    this.progresso.definir(feitos, total, `${feitos} de ${total} peças descobertas`);

    const completo = total > 0 && feitos >= total;
    this.aviso.hidden = !completo;
    if (!completo) return;

    const proximo = this.dadosMapa.proximoNivel;
    this.aviso.replaceChildren(
      h('span', { class: 'nivel-completo-icone', 'aria-hidden': 'true', text: '🏆' }),
      h(
        'div',
        { class: 'nivel-completo-texto' },
        h('strong', { text: 'Nível completo!' }),
        h('span', { text: proximo ? 'Você descobriu todas as peças. O próximo nível foi liberado!' : 'Você completou o último nível. Parabéns!' })
      ),
      h(
        'div',
        { class: 'nivel-completo-acoes' },
        proximo &&
          h('button', {
            type: 'button',
            class: 'btn btn-primario',
            text: 'Próximo nível →',
            onClick: () => this.abrirNivel({ ...this.niveis.find((n) => n.id === proximo.id), ...proximo }),
          }),
        h('button', { type: 'button', class: 'btn btn-contorno', text: 'Ver níveis', onClick: () => this.fluxo.voltar(() => this.abrirNiveis()) })
      )
    );
  }

  aoResponder({ resultado, componente }) {
    if (resultado.perfil) this.medidor.definir(resultado.perfil);
    if (resultado.resultado !== 'correta' || this.descobertos.has(componente.id)) return;

    this.descobertos.add(componente.id);
    this.mapa.definirDescobertos(this.descobertos);
    this.atualizarProgresso();
  }
}
