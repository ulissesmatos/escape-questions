import { h, formatarDataHora, tempoRelativo } from '../../core/dom.js';
import { formatarReais } from '../../core/Money.js';
import { ConfirmDialog } from '../../components/Modal.js';
import { Toast, estadoVazio } from '../../components/ui.js';
import { AdminSection, AdminTab } from './base.js';
import { DataTable } from '../components/DataTable.js';
import { FormDialog } from '../components/FormDialog.js';
import { CampoTexto, CampoNumero, CampoMoeda, CampoCheckbox, linhaCampos } from '../components/campos.js';
import { badge, barraFiltros, baixarCsv } from '../components/widgets.js';

// ---------------- Propostas ----------------

class PropostasTab extends AdminTab {
  constructor(props) {
    super(props);
    this.status = 'pendentes';
    this.missaoId = '';
  }

  async carregar() {
    const [propostas, missoes] = await Promise.all([
      this.props.api.get('/pcbuild/propostas', { turma: this.turma || '', missaoId: this.missaoId, status: this.status }),
      this.missoes ? Promise.resolve(this.missoes) : this.props.api.get('/pcbuild/missoes'),
    ]);
    this.missoes = missoes;
    return propostas;
  }

  filtros() {
    if (!this.elementoFiltros) {
      const missao = h(
        'select',
        { class: 'filtro-select', 'aria-label': 'Filtrar por missão' },
        h('option', { value: '', text: 'Todas as missões' }),
        this.missoes.map((m) => h('option', { value: m.id, text: `${m.emoji} ${m.personaNome}` }))
      );
      missao.addEventListener('change', () => {
        this.missaoId = missao.value;
        this.recarregar();
      });

      const status = h(
        'div',
        { class: 'segmentado', role: 'group', 'aria-label': 'Situação' },
        [['pendentes', 'Aguardando revisão'], ['revisadas', 'Revisadas'], ['', 'Todas']].map(([valor, rotulo]) =>
          h('button', {
            type: 'button',
            class: valor === this.status ? 'ativo' : '',
            dataset: { valor },
            text: rotulo,
            onClick: (e) => {
              this.status = valor;
              status.querySelectorAll('button').forEach((b) => b.classList.toggle('ativo', b.dataset.valor === valor));
              e.currentTarget.blur();
              this.recarregar();
            },
          })
        )
      );

      this.elementoFiltros = barraFiltros(
        this.filtroTurma(),
        h('label', { class: 'filtro' }, h('span', { class: 'filtro-rotulo', text: 'Missão' }), missao),
        status,
        h('button', { type: 'button', class: 'btn btn-contorno btn-pequeno', text: '⬇️ Exportar CSV', onClick: () => this.exportar() })
      );
    }
    return this.elementoFiltros;
  }

  desenhar(propostas) {
    return [
      this.filtros(),
      propostas.length
        ? h('div', { class: 'lista-propostas' }, propostas.map((p) => this.cartaoProposta(p)))
        : estadoVazio({
            icone: this.status === 'pendentes' ? '🎉' : '📋',
            titulo: this.status === 'pendentes' ? 'Nenhuma proposta aguardando revisão' : 'Nenhuma proposta encontrada',
            texto: this.status === 'pendentes' ? 'Tudo em dia por aqui.' : '',
          }),
    ];
  }

  cartaoProposta(p) {
    const diferenca = p.totalCentavos - p.orcamentoCentavos;
    const feedback = h('textarea', { rows: 2, maxlength: 3000, placeholder: 'Escreva um comentário para a turma ou para o aluno (opcional)' });
    feedback.value = p.feedbackProfessor || '';

    const salvar = async (revisado) => {
      try {
        await this.props.api.put(`/pcbuild/propostas/${p.id}`, { feedbackProfessor: feedback.value, revisado });
        Toast.sucesso(revisado ? 'Proposta marcada como revisada.' : 'Salvo.');
        this.recarregar();
      } catch (err) {
        Toast.erro(err.message);
      }
    };

    return h(
      'article',
      { class: `cartao proposta${p.revisado ? ' revisada' : ''}` },
      h(
        'header',
        { class: 'proposta-cabecalho' },
        h('div', {}, h('strong', { class: 'proposta-aluno', text: p.participantes }), h('span', { class: 'texto-suave bloco', title: formatarDataHora(p.criadoEm), text: `Turma ${p.turma} · ${tempoRelativo(p.criadoEm)}` })),
        h('div', { class: 'proposta-selos' }, badge(`${p.missaoEmoji} ${p.missaoNome}`, 'info'), p.revisado ? badge('✓ Revisada', 'sucesso') : badge('Aguardando revisão', 'aviso'))
      ),
      h(
        'div',
        { class: `proposta-orcamento${p.dentroOrcamento ? ' ok' : ' estourado'}` },
        h('span', {}, 'Total ', h('strong', { text: formatarReais(p.totalCentavos) }), ` de ${formatarReais(p.orcamentoCentavos)}`),
        h('span', { text: p.dentroOrcamento ? `✓ Sobraram ${formatarReais(-diferenca)}` : `⚠️ Passou ${formatarReais(diferenca)}` })
      ),
      h(
        'div',
        { class: 'tabela-wrap' },
        h(
          'table',
          { class: 'tabela tabela-compacta' },
          h('thead', {}, h('tr', {}, ['Categoria', 'Peça', 'Preço'].map((t) => h('th', { text: t })))),
          h(
            'tbody',
            {},
            p.itens.map((i) =>
              h(
                'tr',
                {},
                h('td', { 'data-rotulo': 'Categoria', text: i.categoria }),
                h('td', { 'data-rotulo': 'Peça' }, i.link && /^https?:\/\//i.test(i.link) ? h('a', { href: i.link, target: '_blank', rel: 'noopener noreferrer', text: `${i.nomePeca} ↗` }) : i.nomePeca),
                h('td', { 'data-rotulo': 'Preço', class: 'col-numero', text: formatarReais(i.precoCentavos) })
              )
            )
          )
        )
      ),
      h('div', { class: 'proposta-justificativa' }, h('span', { class: 'secao-titulo', text: 'Justificativa do aluno' }), h('p', { text: p.justificativa })),
      h('div', { class: 'proposta-feedback' }, h('label', { class: 'secao-titulo', text: 'Seu feedback' }), feedback),
      h(
        'footer',
        { class: 'proposta-acoes' },
        h('button', {
          type: 'button',
          class: 'btn-mini btn-mini-perigo',
          text: 'Excluir',
          onClick: async () => {
            const ok = await ConfirmDialog.perguntar({ titulo: 'Excluir proposta?', mensagem: `A proposta de ${p.participantes} será apagada.`, textoConfirmar: 'Excluir', perigoso: true });
            if (!ok) return;
            await this.props.api.delete(`/pcbuild/propostas/${p.id}`);
            Toast.sucesso('Proposta excluída.');
            this.recarregar();
          },
        }),
        h('span', { class: 'espacador' }),
        p.revisado
          ? h('button', { type: 'button', class: 'btn btn-contorno btn-pequeno', text: 'Reabrir', onClick: () => salvar(false) })
          : h('button', { type: 'button', class: 'btn btn-contorno btn-pequeno', text: 'Salvar comentário', onClick: () => salvar(false) }),
        h('button', { type: 'button', class: 'btn btn-primario btn-pequeno', text: p.revisado ? 'Salvar' : '✓ Marcar como revisada', onClick: () => salvar(true) })
      )
    );
  }

  exportar() {
    const propostas = this.dados || [];
    baixarCsv(
      'monte-o-pc-propostas.csv',
      ['Turma', 'Aluno/grupo', 'Missão', 'Total', 'Orçamento', 'Dentro do orçamento', 'Revisada', 'Peças', 'Justificativa', 'Feedback', 'Enviada em'],
      propostas.map((p) => [
        p.turma,
        p.participantes,
        p.missaoNome,
        formatarReais(p.totalCentavos),
        formatarReais(p.orcamentoCentavos),
        p.dentroOrcamento ? 'Sim' : 'Não',
        p.revisado ? 'Sim' : 'Não',
        p.itens.map((i) => `${i.categoria}: ${i.nomePeca} (${formatarReais(i.precoCentavos)})`).join(' | '),
        p.justificativa,
        p.feedbackProfessor,
        formatarDataHora(p.criadoEm),
      ])
    );
  }
}

// ---------------- Missões ----------------

class MissoesTab extends AdminTab {
  async carregar() {
    return this.props.api.get('/pcbuild/missoes');
  }

  desenhar(missoes) {
    return [
      barraFiltros(
        h('p', { class: 'texto-suave', text: 'Cada missão é um cliente com uma necessidade e um orçamento. Evite entregar a lista de peças pronta.' }),
        h('button', { type: 'button', class: 'btn btn-primario btn-pequeno', text: '+ Nova missão', onClick: () => this.formulario() })
      ),
      new DataTable({
        linhas: missoes,
        onClicarLinha: (m) => this.formulario(m),
        vazio: { icone: '🛒', titulo: 'Nenhuma missão cadastrada' },
        colunas: [
          { titulo: 'Ordem', classe: 'col-estreita', valor: (m) => String(m.ordem) },
          { titulo: 'Cliente', valor: (m) => h('div', {}, h('strong', { text: `${m.emoji} ${m.personaNome}` }), h('span', { class: 'texto-suave bloco', text: m.necessidade })) },
          { titulo: 'Orçamento', valor: (m) => formatarReais(m.orcamentoCentavos) },
          { titulo: 'Propostas', valor: (m) => h('span', {}, String(m.totalPropostas), m.pendentes ? h('span', {}, ' ', badge(`${m.pendentes} a revisar`, 'aviso')) : null) },
          { titulo: 'Status', valor: (m) => (m.ativa ? badge('Ativa', 'sucesso') : badge('Inativa')) },
          { titulo: '', classe: 'col-acoes', valor: (m) => h('button', { type: 'button', class: 'btn-mini', text: 'Editar', onClick: () => this.formulario(m) }) },
        ],
      }).montar(),
    ];
  }

  formulario(missao = null) {
    const campos = {
      emoji: new CampoTexto({ rotulo: 'Emoji', placeholder: '🎮', max: 16 }),
      nome: new CampoTexto({ rotulo: 'Nome da missão / cliente', obrigatorio: true, placeholder: 'Ex: Enzo quer jogar', max: 160 }),
      descricao: new CampoTexto({ rotulo: 'Quem é o cliente', multilinha: true, linhas: 2, max: 1000 }),
      necessidade: new CampoTexto({ rotulo: 'O que o PC precisa fazer', multilinha: true, linhas: 2, max: 1000, ajuda: 'Uma dica para guiar a escolha — sem entregar as peças.' }),
      orcamento: new CampoMoeda({ rotulo: 'Orçamento (R$)', obrigatorio: true }),
      ordem: new CampoNumero({ rotulo: 'Ordem', min: 0 }),
      ativa: new CampoCheckbox({ rotulo: 'Missão ativa', ajuda: 'Visível para os alunos' }),
    };
    campos.emoji.definir(missao ? missao.emoji : '💻');
    campos.nome.definir(missao && missao.personaNome);
    campos.descricao.definir(missao && missao.personaDescricao);
    campos.necessidade.definir(missao && missao.necessidade);
    campos.orcamento.definir(missao && missao.orcamentoCentavos);
    campos.ordem.definir(missao ? missao.ordem : (this.dados || []).length + 1);
    campos.ativa.definir(missao ? missao.ativa : true);

    new FormDialog({
      titulo: missao ? 'Editar missão' : 'Nova missão',
      montarCampos: (dialogo) =>
        h(
          'div',
          {},
          linhaCampos(campos.emoji, campos.nome),
          campos.descricao.el,
          campos.necessidade.el,
          linhaCampos(campos.orcamento, campos.ordem),
          campos.ativa.el,
          missao &&
            h('button', {
              type: 'button',
              class: 'btn btn-perigo-contorno btn-pequeno',
              text: 'Excluir missão',
              onClick: async () => {
                const ok = await ConfirmDialog.perguntar({
                  titulo: 'Excluir missão?',
                  mensagem: `As ${missao.totalPropostas} propostas dos alunos para esta missão também serão apagadas. Para só esconder, desmarque "Missão ativa".`,
                  textoConfirmar: 'Excluir',
                  perigoso: true,
                });
                if (!ok) return;
                await this.props.api.delete(`/pcbuild/missoes/${missao.id}`);
                dialogo.fechar();
                this.recarregar();
              },
            })
        ),
      coletar: () => {
        const orcamentoCentavos = campos.orcamento.obter();
        if (!campos.nome.obter()) {
          campos.nome.erro('Informe o nome.');
          throw new Error('Informe o nome da missão.');
        }
        if (!orcamentoCentavos) {
          campos.orcamento.erro('Informe um valor, ex: 2.500,00');
          throw new Error('Informe um orçamento válido (ex: 2.500,00).');
        }
        return {
          emoji: campos.emoji.obter() || '💻',
          personaNome: campos.nome.obter(),
          personaDescricao: campos.descricao.obter(),
          necessidade: campos.necessidade.obter(),
          orcamentoCentavos,
          ordem: campos.ordem.obter() || 0,
          ativa: campos.ativa.obter(),
        };
      },
      salvar: (dados) => (missao ? this.props.api.put(`/pcbuild/missoes/${missao.id}`, dados) : this.props.api.post('/pcbuild/missoes', dados)),
      onSalvo: () => this.recarregar(),
    }).abrirFormulario();
  }
}

export class PcSection extends AdminSection {
  static id = 'pc';
  static titulo = 'Monte o PC Ideal';
  static icone = '🛒';
  static descricao = 'Revise as propostas dos alunos e gerencie as missões.';
  static abas = [
    { id: 'propostas', rotulo: 'Propostas dos alunos', Classe: PropostasTab },
    { id: 'missoes', rotulo: 'Missões', Classe: MissoesTab },
  ];
}
