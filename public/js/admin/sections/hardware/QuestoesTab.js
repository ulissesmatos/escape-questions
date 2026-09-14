import { h } from '../../../core/dom.js';
import { ConfirmDialog } from '../../../components/Modal.js';
import { Toast, estadoVazio } from '../../../components/ui.js';
import { AdminTab } from '../base.js';
import { badge, pontosDificuldade } from '../../components/widgets.js';
import { QuestionEditorFactory } from '../../questionEditors/QuestionEditors.js';
import { abrirFormularioQuestao, PreviewDialog } from '../../questionEditors/QuestionFormDialog.js';

const ROTULOS_DIFICULDADE = ['Aquecimento', 'Fácil', 'Médio', 'Difícil', 'Desafio'];

/** Banco de perguntas: escolhe a peça à esquerda, vê e edita as questões à direita. */
export class QuestoesTab extends AdminTab {
  async carregar() {
    const [componentes, niveis] = await Promise.all([this.props.api.get('/hardware/componentes'), this.props.api.get('/hardware/niveis')]);
    const nomeNivel = new Map(niveis.map((n) => [n.id, n.nome]));
    this.componentes = componentes.map((c) => ({ ...c, nivelNome: nomeNivel.get(c.nivelId) }));
    this.niveis = niveis;
    if (!this.componentId || !this.componentes.some((c) => c.id === this.componentId)) {
      this.componentId = this.componentes[0] ? this.componentes[0].id : null;
    }
    this.questoes = this.componentId ? await this.props.api.get('/hardware/questoes', { componentId: this.componentId }) : [];
    return true;
  }

  async selecionar(componentId) {
    this.componentId = componentId;
    this.recarregar();
  }

  desenhar() {
    if (!this.componentes.length) {
      return estadoVazio({ icone: '🧩', titulo: 'Nenhuma peça cadastrada', texto: 'Crie as peças na aba "Mapa e níveis".' });
    }
    return h('div', { class: 'layout-banco' }, this.listaComponentes(), this.painelQuestoes());
  }

  listaComponentes() {
    const grupos = [...this.niveis.map((n) => ({ id: n.id, nome: n.nome })), { id: null, nome: 'Sem nível' }];
    return h(
      'nav',
      { class: 'lista-componentes cartao', 'aria-label': 'Peças do mapa' },
      grupos.map((grupo) => {
        const itens = this.componentes.filter((c) => (c.nivelId || null) === grupo.id);
        if (!itens.length) return null;
        return h(
          'div',
          { class: 'lista-componentes-grupo' },
          h('span', { class: 'lista-componentes-titulo', text: grupo.nome }),
          itens.map((c) =>
            h(
              'button',
              { type: 'button', class: `componente-item${c.id === this.componentId ? ' ativo' : ''}`, onClick: () => this.selecionar(c.id) },
              h('span', { 'aria-hidden': 'true', text: c.icone }),
              h('span', { class: 'componente-item-nome', text: c.nome }),
              h('span', { class: `componente-item-qtd${c.totalQuestoes < 3 ? ' poucas' : ''}`, title: 'Questões cadastradas', text: String(c.totalQuestoes) })
            )
          )
        );
      })
    );
  }

  painelQuestoes() {
    const componente = this.componentes.find((c) => c.id === this.componentId);
    const porDificuldade = [1, 2, 3, 4, 5].map((d) => this.questoes.filter((q) => q.dificuldade === d && q.ativa).length);
    const faltando = porDificuldade.map((qtd, i) => (qtd ? null : ROTULOS_DIFICULDADE[i])).filter(Boolean);

    return h(
      'div',
      { class: 'painel-questoes' },
      h(
        'div',
        { class: 'painel-questoes-cabecalho' },
        h('div', {}, h('h2', {}, `${componente.icone} ${componente.nome}`), h('p', { class: 'texto-suave', text: `${this.questoes.length} questões · cada aluno recebe uma sorteada de acordo com o nível dele` })),
        h('button', { type: 'button', class: 'btn btn-primario btn-pequeno', text: '+ Nova questão', onClick: () => this.abrirFormulario() })
      ),
      h('div', { class: 'cobertura-dificuldade' }, porDificuldade.map((qtd, i) => h('span', { class: `cobertura-item${qtd ? '' : ' vazio'}`, title: ROTULOS_DIFICULDADE[i] }, h('strong', { text: String(i + 1) }), ` ${ROTULOS_DIFICULDADE[i]}: ${qtd}`))),
      faltando.length > 0 &&
        h('p', { class: 'aviso-admin', text: `⚠️ Sem questões ativas em: ${faltando.join(', ')}. O sistema usa o nível mais próximo, mas o ideal é ter pelo menos uma de cada.` }),
      this.questoes.length
        ? h('div', { class: 'lista-questoes' }, this.questoes.map((q) => this.cartaoQuestao(q)))
        : estadoVazio({ icone: '❓', titulo: 'Nenhuma questão para esta peça', texto: 'Sem questões, a peça não pode ser desbloqueada pelos alunos.' })
    );
  }

  cartaoQuestao(q) {
    const est = q.estatisticas || { respondida: 0, certas: 0 };
    const taxa = est.respondida ? Math.round((est.certas / est.respondida) * 100) : null;
    const variantes = (q.conteudo.variantes || []).length;
    return h(
      'article',
      { class: `cartao-questao${q.ativa ? '' : ' inativa'}` },
      h(
        'div',
        { class: 'cartao-questao-topo' },
        pontosDificuldade(q.dificuldade, ROTULOS_DIFICULDADE[q.dificuldade - 1]),
        badge(QuestionEditorFactory.rotulo(q.tipo), 'info'),
        variantes > 0 && badge(`${variantes} variações`),
        !q.ativa && badge('Inativa')
      ),
      h('p', { class: 'cartao-questao-pergunta', text: q.pergunta || '(pergunta nas variações)' }),
      q.enunciado && h('p', { class: 'texto-suave', text: `🔎 ${q.enunciado}` }),
      h(
        'div',
        { class: 'cartao-questao-rodape' },
        h('span', { class: 'texto-suave', text: taxa === null ? 'Ainda não respondida' : `Respondida ${est.respondida}× · ${taxa}% de acerto` }),
        h(
          'div',
          { class: 'acoes-linha' },
          h('button', { type: 'button', class: 'btn-mini', text: '👁️ Ver', onClick: () => PreviewDialog.abrir(this.props.api, q) }),
          h('button', { type: 'button', class: 'btn-mini', text: 'Editar', onClick: () => this.abrirFormulario(q) }),
          h('button', { type: 'button', class: 'btn-mini btn-mini-perigo', text: 'Excluir', onClick: () => this.excluir(q) })
        )
      )
    );
  }

  abrirFormulario(questao = null) {
    abrirFormularioQuestao({
      api: this.props.api,
      componentes: this.componentes,
      questao,
      componentIdPadrao: this.componentId,
      onSalvo: (salva) => {
        if (salva && salva.componentId) this.componentId = salva.componentId;
        this.recarregar();
      },
    });
  }

  async excluir(questao) {
    const ok = await ConfirmDialog.perguntar({
      titulo: 'Excluir questão?',
      mensagem: 'O histórico dos alunos continua guardado. Se quiser só tirar do sorteio, prefira desmarcar "Questão ativa".',
      textoConfirmar: 'Excluir',
      perigoso: true,
    });
    if (!ok) return;
    try {
      await this.props.api.delete(`/hardware/questoes/${questao.id}`);
      Toast.sucesso('Questão excluída.');
      this.recarregar();
    } catch (err) {
      Toast.erro(err.message);
    }
  }
}
