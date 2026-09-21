import { h, formatarDataHora, tempoRelativo } from '../../../core/dom.js';
import { Modal, ConfirmDialog } from '../../../components/Modal.js';
import { Toast, estadoCarregando } from '../../../components/ui.js';
import { AdminTab } from '../base.js';
import { DataTable } from '../../components/DataTable.js';
import { badge, miniBarra, pontosDificuldade, barraFiltros, campoBusca, baixarCsv } from '../../components/widgets.js';
import { QuestionEditorFactory } from '../../questionEditors/QuestionEditors.js';

const RESULTADOS = {
  correta: ['✓ Certa', 'sucesso'],
  errada: ['✗ Errada', 'erro'],
  rapido_demais: ['⏱️ Rápida demais', 'aviso'],
};

function plural(n, singular, pluralTexto) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

function segundos(ms) {
  return Number.isFinite(ms) ? `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}s` : '—';
}

/** Progresso do Mapa de Hardware por aluno/grupo, com histórico detalhado de cada tentativa. */
/**
 * Indícios de consulta externa durante a pergunta: tentativas de copiar o
 * enunciado, de colar a resposta e saídas da aba. São pistas para conversar
 * com o aluno, não prova de nada.
 */
function sinaisDeConsulta(sinais = {}) {
  const { copias = 0, colagens = 0, saidasDeAba = 0, tempoForaMs = 0 } = sinais;
  const marcas = [];
  if (copias) marcas.push(['⧉', `Tentou copiar a pergunta ${copias}×`]);
  if (colagens) marcas.push(['📋', `Tentou colar a resposta ${colagens}×`]);
  if (saidasDeAba) marcas.push(['↗', `Saiu da aba ${saidasDeAba}× (${segundos(tempoForaMs)} fora)`]);
  if (!marcas.length) return h('span', { class: 'texto-suave', text: '—' });
  return h('span', { class: 'sinais-consulta' }, marcas.map(([icone, titulo]) => h('span', { title: titulo, text: icone })));
}

export class AlunosTab extends AdminTab {
  async carregar() {
    return this.props.api.get('/hardware/alunos', { turma: this.turma || '' });
  }

  desenhar({ niveis, alunos }) {
    if (!this.elementoBusca) {
      this.elementoBusca = campoBusca({ placeholder: 'Buscar aluno ou grupo', onBuscar: (b) => { this.busca = b; this.redesenhar(); } });
    }
    const lista = alunos.filter((a) => !this.busca || a.participantes.toLowerCase().includes(this.busca));

    return [
      barraFiltros(
        this.filtroTurma(),
        this.elementoBusca,
        h('button', { type: 'button', class: 'btn btn-contorno btn-pequeno', text: '⬇️ Exportar CSV', disabled: !lista.length, onClick: () => this.exportar(lista, niveis) })
      ),
      h(
        'p',
        { class: 'legenda-admin' },
        'O ', h('strong', { text: 'desafio' }), ' é o nível que o sistema adaptou para cada aluno (sobe quando acerta rápido e em sequência, desce quando erra). ',
        h('strong', { text: 'Rápidas demais' }), ' são respostas dadas antes do tempo mínimo de leitura — um sinal de chute.'
      ),
      new DataTable({
        linhas: lista,
        onClicarLinha: (aluno) => this.abrirDetalhe(aluno),
        vazio: { icone: '🗺️', titulo: 'Ninguém jogou ainda', texto: 'O progresso aparece aqui assim que os alunos começarem.' },
        colunas: [
          { titulo: 'Aluno / grupo', valor: (a) => h('div', {}, h('strong', { text: a.participantes }), h('span', { class: 'texto-suave bloco', text: `Turma ${a.turma}` })) },
          { titulo: 'Progresso por nível', valor: (a) => h('div', { class: 'niveis-mini' }, a.porNivel.map((n, i) => miniBarra(n.descobertos, n.total, { rotulo: `N${i + 1}` }))) },
          { titulo: 'Desafio atual', valor: (a) => (a.habilidade === null ? '—' : pontosDificuldade(a.habilidade, a.nivelDificuldade)) },
          { titulo: 'Acertos', valor: (a) => h('span', {}, h('strong', { text: `${a.taxaAcerto}%` }), h('span', { class: 'texto-suave', text: ` (${a.acertos}/${a.tentativas})` })) },
          { titulo: 'Chutes', valor: (a) => (a.rapidas ? badge(`${plural(a.rapidas, 'rápida', 'rápidas')}${a.pausas ? ` · ${plural(a.pausas, 'pausa', 'pausas')}` : ''}`, a.rapidas >= 5 ? 'erro' : 'aviso') : badge('Nenhum', 'sucesso')) },
          { titulo: 'Última atividade', valor: (a) => h('span', { title: formatarDataHora(a.ultimaAtividade), text: tempoRelativo(a.ultimaAtividade) }) },
        ],
      }).montar(),
    ];
  }

  exportar(alunos, niveis) {
    baixarCsv(
      'mapa-hardware-progresso.csv',
      ['Turma', 'Aluno/grupo', ...niveis.map((n) => n.nome), 'Desafio', 'Tentativas', 'Acertos', 'Taxa de acerto', 'Rápidas demais', 'Última atividade'],
      alunos.map((a) => [
        a.turma,
        a.participantes,
        ...a.porNivel.map((n) => `${n.descobertos}/${n.total}`),
        a.nivelDificuldade || '',
        a.tentativas,
        a.acertos,
        `${a.taxaAcerto}%`,
        a.rapidas,
        formatarDataHora(a.ultimaAtividade),
      ])
    );
  }

  async abrirDetalhe(aluno) {
    const identidade = { participantes: aluno.participantes, turma: aluno.turma };
    const dialogo = new Modal({ classe: 'modal-largo', onFechar: () => setTimeout(() => dialogo.destruir(), 0) });
    dialogo.montar(document.body);
    dialogo.definirCabecalho(h('div', {}, h('span', { class: 'modal-etiqueta', text: `Turma ${aluno.turma}` }), h('h2', { text: aluno.participantes })));
    dialogo.definirCorpo(estadoCarregando('Carregando histórico...'));
    dialogo.definirRodape(
      h('button', { type: 'button', class: 'btn btn-perigo-contorno', text: 'Zerar progresso', onClick: () => this.zerar(identidade, dialogo) }),
      h('button', { type: 'button', class: 'btn btn-primario', text: 'Fechar', onClick: () => dialogo.fechar() })
    );
    dialogo.abrir();

    let tentativas;
    try {
      tentativas = await this.props.api.post('/hardware/alunos/detalhe', identidade);
    } catch (err) {
      dialogo.definirCorpo(h('div', { class: 'erro-msg mostrar', text: err.message }));
      return;
    }

    dialogo.definirCorpo(
      h(
        'div',
        { class: 'detalhe-resumo' },
        ...aluno.porNivel.map((n, i) => miniBarra(n.descobertos, n.total, { rotulo: `Nível ${i + 1}` })),
        aluno.habilidade !== null && pontosDificuldade(aluno.habilidade, `Desafio ${aluno.nivelDificuldade}`),
        badge(`${aluno.taxaAcerto}% de acerto`)
      ),
      new DataTable({
        linhas: tentativas,
        vazio: { icone: '📭', titulo: 'Sem tentativas registradas' },
        colunas: [
          { titulo: 'Quando', valor: (t) => formatarDataHora(t.criadoEm) },
          { titulo: 'Peça', valor: (t) => h('div', {}, h('strong', { text: t.componente }), t.nivel && h('span', { class: 'texto-suave bloco', text: t.nivel })) },
          {
            titulo: 'Pergunta',
            valor: (t) => h(
              'div',
              { class: 'celula-pergunta' },
              t.pergunta ? h('span', { text: t.pergunta }) : h('span', { class: 'texto-suave', text: '(versão antiga do mapa)' }),
              h('span', { class: 'texto-suave bloco' }, t.tipo ? QuestionEditorFactory.rotulo(t.tipo) : '', t.dificuldade ? ` · nível ${t.dificuldade}` : '')
            ),
          },
          {
            titulo: 'Resposta',
            valor: (t) => h('div', {}, h('span', { text: t.resposta || '—' }), t.resultado !== 'correta' && t.respostaCerta && h('span', { class: 'texto-suave bloco', text: `Certa: ${t.respostaCerta}` })),
          },
          { titulo: 'Resultado', valor: (t) => badge(...(RESULTADOS[t.resultado] || [t.resultado])) },
          { titulo: 'Tempo', valor: (t) => h('span', { title: `Mínimo esperado: ${segundos(t.tempoMinimoMs)}`, text: segundos(t.tempoMs) }) },
          { titulo: 'Sinais', valor: (t) => sinaisDeConsulta(t.sinais) },
        ],
      }).montar()
    );
  }

  async zerar(identidade, dialogo) {
    const ok = await ConfirmDialog.perguntar({
      titulo: 'Zerar progresso?',
      mensagem: `Todo o histórico e as peças descobertas de ${identidade.participantes} (${identidade.turma}) serão apagados. Não dá para desfazer.`,
      textoConfirmar: 'Zerar progresso',
      perigoso: true,
    });
    if (!ok) return;
    try {
      await this.props.api.post('/hardware/alunos/zerar', identidade);
      Toast.sucesso('Progresso zerado.');
      dialogo.fechar();
      this.recarregar();
    } catch (err) {
      Toast.erro(err.message);
    }
  }
}
