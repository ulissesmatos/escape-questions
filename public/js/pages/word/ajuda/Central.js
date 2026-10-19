import { h } from '../../../core/dom.js';
import { icone } from '../sistema/icones.js';
import { conceito } from '../regras/conceitos.js';

const ICONES = { info: 'img:agente', dica: 'img:lightbulb-24-color', alerta: 'img:warning-24-color', sucesso: 'img:checkmark-circle-24-color', pergunta: 'img:question-circle-24-color' };
const MAXIMO_NO_HISTORICO = 8;

/**
 * Painel da Central, ao lado do computador simulado:
 * - o cartão "Seus objetivos" (em destaque, com o progresso e o objetivo da vez);
 * - a história da missão (recolhível);
 * - só o último recado da Central à mostra; os anteriores ficam em
 *   "Ver mensagens anteriores", para o painel não crescer nem rolar sozinho;
 * - os botões Dica e Mostre-me (o Mostre-me some quando semMostreMe está
 *   ligado na configuração do professor).
 *
 * props: { titulo, subtitulo, historia, semMostreMe, aoDica, aoMostreMe,
 *          aoResponder(objetivo, valor), aoSair, aoReiniciar, aoTelaCheia,
 *          aoConceito(id), aoRecolher }
 */
export class Central {
  constructor(props) {
    this.props = props;
    this.recolhido = false;
    this.historico = [];
    this.tempo = h('span', { class: 'central-tempo', text: '00:00' });
    this.lista = h('ol', { class: 'central-objetivos' });
    this.contagem = h('span', { class: 'central-contagem' });
    this.barra = h('span', { class: 'central-progresso-barra' });
    this.recado = h('div', { class: 'central-recado', 'aria-live': 'polite' });
    this.botaoHistorico = h('button', { type: 'button', class: 'central-historico-botao', hidden: true, onClick: () => this.alternarHistorico() });
    this.listaHistorico = h('div', { class: 'central-historico', hidden: true });
    this.botaoDica = h('button', { type: 'button', class: 'central-botao central-dica', onClick: () => props.aoDica() }, icone('img:lightbulb-24-color', { tamanho: 20 }), h('span', { text: 'Dica' }));
    this.botaoMostre = h('button', { type: 'button', class: 'central-botao central-mostre', onClick: () => props.aoMostreMe() }, icone('cursor_click', { tamanho: 18 }), h('span', { class: 'central-mostre-texto', text: 'Mostre-me' }));
    this.cartao = h(
      'section',
      { class: 'central-cartao', 'aria-label': 'Seus objetivos' },
      h('header', { class: 'central-cartao-topo' }, h('span', { class: 'central-cartao-icone' }, icone('checkbox_checked', { tamanho: 18 })), h('strong', { text: 'Seus objetivos' }), this.contagem),
      h('span', { class: 'central-progresso' }, this.barra),
      this.lista
    );
    this.el = h(
      'aside',
      { class: 'central', 'aria-label': 'Central da missão' },
      h(
        'header',
        { class: 'central-topo' },
        h('div', { class: 'central-logo' }, icone('img:agente', { tamanho: 30 })),
        h('div', { class: 'central-titulos' }, h('small', { text: props.subtitulo }), h('strong', { text: props.titulo })),
        this.tempo,
        h('button', { type: 'button', class: 'central-recolher', 'aria-label': 'Recolher painel', title: 'Recolher painel', onClick: () => this.alternar() }, icone('chevron_right', { tamanho: 16 }))
      ),
      h(
        'div',
        { class: 'central-rolagem' },
        this.cartao,
        h('details', { class: 'central-historia', open: true }, h('summary', { text: 'A história da missão' }), h('p', { text: props.historia })),
        h('div', { class: 'central-secao' }, h('span', { text: 'Recado da Central' })),
        this.recado,
        this.botaoHistorico,
        this.listaHistorico
      ),
      h(
        'footer',
        { class: 'central-rodape' },
        h('div', { class: 'central-botoes' }, this.botaoDica, !props.semMostreMe && this.botaoMostre),
        h(
          'div',
          { class: 'central-links' },
          props.aoTelaCheia && h('button', { type: 'button', onClick: () => props.aoTelaCheia() }, icone('arrow_maximize', { tamanho: 14 }), 'Tela cheia'),
          props.aoReiniciar && h('button', { type: 'button', onClick: () => props.aoReiniciar() }, icone('arrow_counterclockwise', { tamanho: 14 }), 'Recomeçar'),
          h('button', { type: 'button', onClick: () => props.aoSair() }, icone('arrow_left', { tamanho: 14 }), 'Sair')
        )
      )
    );
    this.aba = h('button', { type: 'button', class: 'central-aba', hidden: true, onClick: () => this.alternar() }, icone('img:agente', { tamanho: 26 }), h('span', { text: 'Central' }));
  }

  alternar() {
    this.recolhido = !this.recolhido;
    this.el.classList.toggle('recolhido', this.recolhido);
    this.aba.hidden = !this.recolhido;
    this.aba.classList.remove('chamando');
    this.props.aoRecolher?.(this.recolhido);
  }

  definirTempo(ms) {
    const s = Math.floor(ms / 1000);
    this.tempo.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  /** estados: [{ objetivo, feito }]; atual: índice do objetivo da vez */
  desenharObjetivos(estados, atual) {
    const feitos = estados.filter((e) => e.feito).length;
    this.cartao.hidden = estados.length === 0;
    this.contagem.textContent = `${feitos} de ${estados.length}`;
    this.barra.style.width = `${estados.length ? (feitos / estados.length) * 100 : 0}%`;
    this.lista.replaceChildren(
      ...estados.map(({ objetivo, feito }, i) => {
        const c = objetivo.conceito ? conceito(objetivo.conceito) : null;
        const item = h(
          'li',
          { class: `central-objetivo${feito ? ' feito' : ''}${i === atual ? ' atual' : ''}${i > atual && !feito ? ' depois' : ''}`, 'data-indice': i },
          h('span', { class: 'central-check' }, feito ? icone('checkmark', { tamanho: 14 }) : String(i + 1)),
          h(
            'div',
            { class: 'central-objetivo-texto' },
            i === atual ? h('small', { class: 'central-agora' }, h('span', { class: 'central-agora-ponto' }), 'AGORA') : null,
            h('span', { class: 'central-objetivo-frase', text: objetivo.texto }),
            i === atual && c ? h('button', { type: 'button', class: 'central-conceito', onClick: () => this.props.aoConceito?.(objetivo.conceito) }, icone(c.icone, { tamanho: 14 }), `Como faz: ${c.titulo}`) : null
          )
        );
        if (i === atual && objetivo.pergunta && !feito) item.append(this.campoResposta(objetivo));
        return item;
      })
    );
  }

  /** Objetivo cumprido: o item pisca no cartão (sem encher o painel de mensagens) */
  objetivoConcluido(indice) {
    const item = this.lista.querySelector(`[data-indice="${indice}"]`);
    item?.classList.add('acabou-de-fazer');
    this.cartao.classList.remove('comemorando');
    void this.cartao.offsetWidth;
    this.cartao.classList.add('comemorando');
  }

  campoResposta(objetivo) {
    const campo = h('input', { type: 'text', inputmode: 'numeric', class: 'central-resposta-campo', placeholder: 'Sua resposta', autocomplete: 'off', 'aria-label': 'Resposta' });
    const enviar = () => {
      if (!campo.value.trim()) return campo.focus();
      this.props.aoResponder(objetivo, campo.value.trim());
    };
    campo.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') enviar();
    });
    return h('div', { class: 'central-resposta' }, campo, h('button', { type: 'button', class: 'central-responder', onClick: enviar }, 'Responder'));
  }

  bolha(texto, tipo, acoes = []) {
    return h(
      'div',
      { class: `central-msg central-msg-${tipo}` },
      icone(ICONES[tipo] || ICONES.info, { tamanho: 22 }),
      h(
        'div',
        {},
        h('p', { text: texto }),
        acoes.length
          ? h(
              'div',
              { class: 'central-msg-acoes' },
              acoes.map((a) =>
                h('button', {
                  type: 'button',
                  text: a.rotulo,
                  class: a.primaria ? 'primaria' : '',
                  onClick: (e) => {
                    e.currentTarget.parentElement.remove();
                    a.acao();
                  },
                })
              )
            )
          : null
      )
    );
  }

  /**
   * Novo recado da Central. tipo: 'info' | 'dica' | 'alerta' | 'sucesso' | 'pergunta'.
   * acoes: [{ rotulo, acao, primaria }]. O recado anterior vai para o histórico.
   */
  falar(texto, { tipo = 'info', acoes = [] } = {}) {
    if (this.atual && this.atual.texto === texto) {
      // mesmo recado de novo: só chama a atenção
      this.recado.firstElementChild?.classList.remove('repetiu');
      void this.recado.offsetWidth;
      this.recado.firstElementChild?.classList.add('repetiu');
      return this.recado.firstElementChild;
    }
    if (this.atual) {
      this.historico.unshift(this.atual);
      this.historico.length = Math.min(this.historico.length, MAXIMO_NO_HISTORICO);
    }
    this.atual = { texto, tipo };
    const bolha = this.bolha(texto, tipo, acoes);
    this.recado.replaceChildren(bolha);
    this.desenharHistorico();
    if (this.recolhido && (tipo === 'alerta' || tipo === 'dica' || tipo === 'pergunta')) this.aba.classList.add('chamando');
    return bolha;
  }

  desenharHistorico() {
    const n = this.historico.length;
    this.botaoHistorico.hidden = n === 0;
    this.botaoHistorico.textContent = this.listaHistorico.hidden ? `Ver mensagens anteriores (${n})` : 'Esconder mensagens anteriores';
    if (!this.listaHistorico.hidden) this.listaHistorico.replaceChildren(...this.historico.map((m) => this.bolha(m.texto, m.tipo)));
  }

  alternarHistorico() {
    this.listaHistorico.hidden = !this.listaHistorico.hidden;
    this.desenharHistorico();
  }

  chamarAtencao(botao, ligado) {
    (botao === 'dica' ? this.botaoDica : this.botaoMostre).classList.toggle('chamando', ligado);
  }

  mostreMeAtivo(ativo) {
    this.botaoMostre.classList.toggle('ativo', ativo);
    this.botaoMostre.querySelector('.central-mostre-texto').textContent = ativo ? 'Parar de mostrar' : 'Mostre-me';
  }
}
