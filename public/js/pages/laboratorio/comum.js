import { Component } from '../../core/Component.js';
import { h } from '../../core/dom.js';

/** Peças de interface usadas pelas três telas do Laboratório (aluno, professor e telão). */

/** "Aperte [Windows] + [D]" → texto com as teclas desenhadas como teclas de verdade */
export function textoComTeclas(texto) {
  return String(texto ?? '')
    .split(/\[([^\]]+)\]/g)
    .map((parte, i) => (i % 2 === 1 ? tecla(parte) : parte))
    .filter((parte) => parte !== '');
}

export function tecla(nome) {
  const ehWindows = /^win(dows)?$/i.test(nome.trim());
  return h('kbd', { class: 'tecla' }, ehWindows && h('span', { class: 'tecla-logo', 'aria-hidden': 'true', text: '⊞' }), nome.trim());
}

/** "Windows + Shift + S" → [⊞ Windows] + [Shift] + [S] */
export function atalho(combo) {
  const partes = String(combo).split(/\s*\+\s*/).filter(Boolean);
  // "Windows + ." vira ["Windows", "."]; "Ctrl + +" deixaria vazio, então tratamos o "+" sozinho
  if (/\+\s*\+$/.test(combo)) partes.push('+');
  return h(
    'span',
    { class: 'atalho', 'aria-label': `Atalho ${partes.join(' mais ')}` },
    partes.flatMap((p, i) => (i === 0 ? [tecla(p)] : [h('span', { class: 'atalho-mais', 'aria-hidden': 'true', text: '+' }), tecla(p)]))
  );
}

/** 185000 → "3:05" */
export function formatarRelogio(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** 65000 → "1 min 05 s" */
export function formatarDuracao(ms) {
  const total = Math.max(0, Math.round((ms || 0) / 1000));
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return min ? `${min} min ${String(seg).padStart(2, '0')} s` : `${seg} s`;
}

export function posicaoTexto(posicao) {
  return `${posicao}º`;
}

export const MEDALHAS = ['🥇', '🥈', '🥉'];

export const FASES = {
  espera: 'Aguardando início',
  tarefa: 'Tarefa em andamento',
  parcial: 'Ranking parcial',
  livre: 'Modo livre em andamento',
  final: 'Partida encerrada',
};

/**
 * Cronômetro que conta sozinho a partir do estado da sala
 * ({ fimEm, restanteMs, pausada }), usando o relógio do servidor.
 * props: { conexao, grande? }
 */
export class Cronometro extends Component {
  render() {
    this.valor = h('span', { class: 'cronometro-valor', text: '0:00' });
    const el = h(
      'div',
      { class: `cronometro${this.props.grande ? ' cronometro-grande' : ''}`, role: 'timer', 'aria-live': 'off' },
      h('span', { class: 'cronometro-icone', 'aria-hidden': 'true', text: '⏱️' }),
      this.valor
    );
    this.agendar(() => this.desenhar(), 250, { repetir: true });
    return el;
  }

  definir(sala) {
    this.sala = sala;
    this.desenhar();
  }

  desenhar() {
    if (!this.el) return;
    const sala = this.sala;
    const ativo = sala && (sala.fimEm || sala.restanteMs !== null);
    this.el.hidden = !ativo;
    if (!ativo) return;
    const restante = sala.pausada || !sala.fimEm ? sala.restanteMs : sala.fimEm - this.props.conexao.agora();
    this.valor.textContent = formatarRelogio(restante);
    this.el.classList.toggle('acabando', !sala.pausada && restante <= 30000);
    this.el.classList.toggle('pausado', Boolean(sala.pausada));
  }
}

/**
 * Lista do ranking que reaproveita as linhas e anima quem muda de lugar
 * (técnica FLIP: mede antes, reordena, anima a diferença). Quem sobe ganha
 * um destaque por alguns segundos.
 * props: { limite?, destacarId? }
 */
export class RankingAnimado extends Component {
  render() {
    this.linhas = new Map();
    this.anteriores = new Map();
    return h('ol', { class: 'ranking-lista' });
  }

  definir(ranking, { destacarId = this.props.destacarId } = {}) {
    const limite = this.props.limite || ranking.length;
    const visiveis = ranking.slice(0, limite);
    // Quem está fora do top também aparece, se for o aluno desta tela
    const eu = destacarId && ranking.find((r) => r.id === destacarId);
    if (eu && !visiveis.includes(eu)) visiveis.push(eu);

    const antes = new Map([...this.linhas].map(([id, el]) => [id, el.getBoundingClientRect().top]));
    const usados = new Set();

    visiveis.forEach((r, i) => {
      let el = this.linhas.get(r.id);
      if (!el) {
        el = this.criarLinha();
        this.linhas.set(r.id, el);
      }
      this.preencher(el, r, r.id === destacarId);
      const anterior = this.anteriores.get(r.id);
      if (anterior && r.posicao < anterior) this.marcarSubida(el);
      this.anteriores.set(r.id, r.posicao);
      if (this.el.children[i] !== el) this.el.insertBefore(el, this.el.children[i] || null);
      usados.add(r.id);
    });

    for (const [id, el] of this.linhas) {
      if (!usados.has(id)) {
        el.remove();
        this.linhas.delete(id);
      }
    }

    // FLIP: cada linha começa onde estava e desliza até o lugar novo
    for (const [id, el] of this.linhas) {
      const topoAntes = antes.get(id);
      if (topoAntes === undefined) continue;
      const delta = topoAntes - el.getBoundingClientRect().top;
      if (!delta) continue;
      el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }

  criarLinha() {
    const el = h(
      'li',
      { class: 'ranking-linha' },
      h('span', { class: 'ranking-posicao' }),
      h('span', { class: 'ranking-nome' }),
      h('span', { class: 'ranking-subiu', 'aria-hidden': 'true', text: '▲' }),
      h('span', { class: 'ranking-pontos' })
    );
    return el;
  }

  preencher(el, r, ehEu) {
    const [posicao, nome, , pontos] = el.children;
    // Medalha só para quem já pontuou (no começo todos têm 0)
    const medalha = r.posicao <= 3 && r.pontos > 0;
    posicao.textContent = medalha ? MEDALHAS[r.posicao - 1] : posicaoTexto(r.posicao);
    nome.textContent = ehEu ? `${r.nome} (você)` : r.nome;
    pontos.textContent = `${r.pontos} pts`;
    el.classList.toggle('ranking-eu', ehEu);
    el.classList.toggle('ranking-top', medalha);
  }

  marcarSubida(el) {
    el.classList.remove('subiu');
    void el.offsetWidth; // reinicia a animação
    el.classList.add('subiu');
    clearTimeout(el._timerSubida);
    el._timerSubida = setTimeout(() => el.classList.remove('subiu'), 3000);
  }
}

/** Pódio com os 3 primeiros (2º, 1º, 3º, como no esporte) */
export function podio(ranking) {
  const lugares = [ranking[1], ranking[0], ranking[2]];
  return h(
    'div',
    { class: 'podio' },
    lugares.map((r, i) => {
      const posicao = [2, 1, 3][i];
      if (!r) return h('div', { class: `podio-lugar podio-${posicao} podio-vazio` });
      return h(
        'div',
        { class: `podio-lugar podio-${posicao}` },
        h('span', { class: 'podio-medalha', 'aria-hidden': 'true', text: MEDALHAS[posicao - 1] }),
        h('strong', { class: 'podio-nome', text: r.nome }),
        h('span', { class: 'podio-pontos', text: `${r.pontos} pontos` }),
        h('div', { class: 'podio-degrau' }, h('span', { text: `${posicao}º` }))
      );
    })
  );
}

/** Faixa "Reconectando..." que aparece quando a internet cai */
export function avisoConexao(conexao) {
  const el = h('div', { class: 'aviso-conexao', role: 'status', hidden: true }, '📡 Sem conexão. Tentando reconectar...');
  conexao.aoMudarStatus((ok) => {
    el.hidden = ok;
  });
  return el;
}
