import { h, tempoRelativo } from '../../core/dom.js';
import { AdminSection, AdminTab } from './base.js';
import { statCard, barraFiltros } from '../components/widgets.js';

const ATIVIDADES = {
  escape: { icone: '🔎', nome: 'Escape Room', rota: '/escape/envios' },
  hardware: { icone: '🗺️', nome: 'Mapa de Hardware', rota: '/hardware/alunos' },
  pc: { icone: '🛒', nome: 'Monte o PC', rota: '/pc/propostas' },
};

class PainelTab extends AdminTab {
  async carregar() {
    return this.props.api.get('/resumo', { turma: this.turma || '' });
  }

  desenhar(resumo) {
    const { escape, hardware, pc, recentes } = resumo;
    const irPara = (rota) => () => this.props.router.ir(rota);

    const cartaoAtividade = (chave, stats, acao) =>
      h(
        'button',
        { type: 'button', class: `painel-atividade painel-${chave}`, onClick: irPara(ATIVIDADES[chave].rota) },
        h('div', { class: 'painel-atividade-topo' }, h('span', { class: 'painel-atividade-icone', text: ATIVIDADES[chave].icone }), h('strong', { text: ATIVIDADES[chave].nome }), h('span', { class: 'painel-ver', text: acao })),
        h('div', { class: 'painel-stats' }, stats)
      );

    return [
      barraFiltros(this.filtroTurma()),
      h(
        'div',
        { class: 'painel-grade' },
        cartaoAtividade('escape', [
          statCard({ icone: '📨', rotulo: 'Envios', valor: escape.envios, detalhe: `${escape.hoje} hoje` }),
          statCard({ icone: '👥', rotulo: 'Alunos/grupos', valor: escape.alunos }),
          statCard({ icone: '🎯', rotulo: 'Média de acertos', valor: `${escape.mediaAcertos}%` }),
        ], 'Ver respostas →'),
        cartaoAtividade('hardware', [
          statCard({ icone: '👥', rotulo: 'Alunos/grupos', valor: hardware.alunos }),
          statCard({ icone: '⚡', rotulo: 'Tentativas hoje', valor: hardware.tentativasHoje }),
          statCard({ icone: '🎯', rotulo: 'Taxa de acerto', valor: `${hardware.taxaAcerto}%` }),
          statCard({ icone: '⏱️', rotulo: 'Respostas no chute', valor: hardware.rapidas, destaque: hardware.rapidas > 0 ? 'stat-alerta' : '' }),
        ], 'Ver progresso →'),
        cartaoAtividade('pc', [
          statCard({ icone: '📋', rotulo: 'Propostas', valor: pc.propostas }),
          statCard({ icone: '⏳', rotulo: 'Aguardando revisão', valor: pc.pendentes, destaque: pc.pendentes > 0 ? 'stat-destaque' : '' }),
        ], 'Revisar →')
      ),
      h(
        'div',
        { class: 'cartao painel-recentes' },
        h('h2', { text: 'Atividade recente' }),
        recentes.length
          ? h(
              'ul',
              { class: 'lista-recentes' },
              recentes.map((r) =>
                h(
                  'li',
                  {},
                  h('span', { class: 'recente-icone', 'aria-hidden': 'true', text: ATIVIDADES[r.atividade].icone }),
                  h('div', { class: 'recente-texto' }, h('strong', { text: r.participantes }), h('span', { text: ` · ${r.turma} — ${r.descricao}` })),
                  h('time', { datetime: r.criadoEm, title: new Date(r.criadoEm).toLocaleString('pt-BR'), text: tempoRelativo(r.criadoEm) })
                )
              )
            )
          : h('p', { class: 'texto-suave', text: 'Nenhuma atividade ainda.' })
      ),
    ];
  }
}

export class DashboardSection extends AdminSection {
  static id = 'painel';
  static titulo = 'Visão geral';
  static icone = '📊';
  static descricao = 'Resumo das atividades das turmas.';
  static abas = [{ id: 'resumo', rotulo: 'Resumo', Classe: PainelTab }];
}
