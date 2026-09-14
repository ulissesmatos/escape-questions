import { h, formatarDataHora } from '../../core/dom.js';
import { Modal, ConfirmDialog } from '../../components/Modal.js';
import { Toast } from '../../components/ui.js';
import { AdminSection, AdminTab } from './base.js';
import { DataTable } from '../components/DataTable.js';
import { FormDialog } from '../components/FormDialog.js';
import { CampoTexto, CampoNumero, CampoSelect, CampoCheckbox, linhaCampos } from '../components/campos.js';
import { badge, miniBarra, barraFiltros, campoBusca, baixarCsv } from '../components/widgets.js';
import { RowListEditor } from '../questionEditors/ListEditors.js';

const TIPOS_PISTA = [
  { valor: 'digito', rotulo: 'Dígito (palavra + número de 0 a 9)' },
  { valor: 'multipla_escolha', rotulo: 'Múltipla escolha' },
  { valor: 'verdadeiro_falso', rotulo: 'Verdadeiro ou falso' },
];

// ---------------- Envios ----------------

class EnviosTab extends AdminTab {
  async carregar() {
    return this.props.api.get('/escape/envios', { turma: this.turma || '' });
  }

  filtrados() {
    const busca = this.busca || '';
    return this.dados.filter((e) => !busca || e.participantes.toLowerCase().includes(busca));
  }

  desenhar() {
    if (!this.elementoBusca) {
      this.elementoBusca = campoBusca({ placeholder: 'Buscar aluno ou grupo', onBuscar: (b) => { this.busca = b; this.redesenhar(); } });
    }
    const envios = this.filtrados();
    const porTurma = new Map();
    for (const e of envios) {
      if (!porTurma.has(e.turma)) porTurma.set(e.turma, []);
      porTurma.get(e.turma).push(e);
    }

    const grupos = [...porTurma.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR')).map(([turma, lista]) =>
      h(
        'div',
        { class: 'grupo-turma' },
        h('h2', { class: 'grupo-turma-titulo' }, `Turma ${turma}`, badge(`${lista.length} envio${lista.length > 1 ? 's' : ''}`)),
        new DataTable({
          linhas: lista,
          onClicarLinha: (envio) => this.abrirDetalhe(envio),
          colunas: [
            { titulo: 'Aluno / grupo', valor: (e) => h('strong', { text: e.participantes }) },
            { titulo: 'Acertos', valor: (e) => miniBarra(e.acertos, e.total) },
            { titulo: 'Situação', valor: (e) => (e.completo ? badge('Tudo certo', 'sucesso') : badge(`${e.total - e.acertos} erradas`, 'aviso')) },
            { titulo: 'Enviado em', valor: (e) => formatarDataHora(e.criadoEm) },
            { titulo: '', classe: 'col-acoes', valor: (e) => h('button', { type: 'button', class: 'btn-mini', text: 'Ver respostas', onClick: () => this.abrirDetalhe(e) }) },
          ],
        }).montar()
      )
    );

    return [
      barraFiltros(
        this.filtroTurma(),
        this.elementoBusca,
        h('button', { type: 'button', class: 'btn btn-contorno btn-pequeno', text: '⬇️ Exportar CSV', disabled: !envios.length, onClick: () => this.exportar(envios) })
      ),
      grupos.length ? grupos : new DataTable({ linhas: [], vazio: { icone: '📨', titulo: 'Nenhum envio encontrado', texto: 'Quando os alunos enviarem o Escape Room, as respostas aparecem aqui.' } }).montar(),
    ];
  }

  exportar(envios) {
    baixarCsv(
      'escape-room-respostas.csv',
      ['Turma', 'Aluno/grupo', 'Acertos', 'Total', 'Enviado em'],
      envios.map((e) => [e.turma, e.participantes, e.acertos, e.total, formatarDataHora(e.criadoEm)])
    );
  }

  abrirDetalhe(envio) {
    const dialogo = new Modal({ classe: 'modal-largo', onFechar: () => setTimeout(() => dialogo.destruir(), 0) });
    dialogo.montar(document.body);
    const respostas = Array.isArray(envio.respostas) ? envio.respostas : [];

    dialogo.definirCabecalho(
      h('div', {}, h('span', { class: 'modal-etiqueta', text: `Turma ${envio.turma} · ${formatarDataHora(envio.criadoEm)}` }), h('h2', { text: envio.participantes }))
    );
    dialogo.definirCorpo(
      h('div', { class: 'detalhe-resumo' }, miniBarra(envio.acertos, envio.total, { rotulo: 'Acertos' })),
      respostas.length
        ? h(
            'ol',
            { class: 'lista-respostas' },
            respostas.map((r) =>
              h(
                'li',
                { class: r.correta ? 'certa' : 'errada' },
                h('span', { class: 'resposta-marca', 'aria-label': r.correta ? 'Certa' : 'Errada', text: r.correta ? '✓' : '✗' }),
                h(
                  'div',
                  {},
                  h('strong', { text: r.titulo }),
                  h('span', {
                    class: 'resposta-aluno',
                    text: r.tipo === 'digito' ? `Escreveu "${r.respostaTexto || '—'}" · número ${r.respostaDigito ?? '—'}` : `Escolheu: ${r.opcaoTexto || '—'}`,
                  })
                )
              )
            )
          )
        : h('p', { class: 'texto-suave', text: 'Este envio não tem detalhes por pista.' })
    );
    dialogo.definirRodape(
      h('button', {
        type: 'button',
        class: 'btn btn-perigo-contorno',
        text: 'Excluir envio',
        onClick: async () => {
          const ok = await ConfirmDialog.perguntar({ titulo: 'Excluir envio?', mensagem: `O envio de ${envio.participantes} será apagado.`, textoConfirmar: 'Excluir', perigoso: true });
          if (!ok) return;
          try {
            await this.props.api.delete(`/escape/envios/${envio.id}`);
            Toast.sucesso('Envio excluído.');
            dialogo.fechar();
            this.recarregar();
          } catch (err) {
            Toast.erro(err.message);
          }
        },
      }),
      h('button', { type: 'button', class: 'btn btn-primario', text: 'Fechar', onClick: () => dialogo.fechar() })
    );
    dialogo.abrir();
  }
}

// ---------------- Pistas ----------------

/** Alternativas da pista com a correta marcada (radio) */
class OpcoesPistaEditor extends RowListEditor {
  valorVazio() {
    return { texto: '', correta: false };
  }

  render() {
    this.nomeGrupo = `correta-${Math.random().toString(36).slice(2, 8)}`;
    return super.render();
  }

  criarControles(valor) {
    const radio = h('input', { type: 'radio', name: this.nomeGrupo, checked: Boolean(valor.correta), 'aria-label': 'Esta é a correta' });
    const input = h('input', { type: 'text', value: valor.texto || '', placeholder: 'Texto da alternativa', maxlength: 300 });
    return {
      elementos: [h('label', { class: 'marcar-correta', title: 'Marque a alternativa correta' }, radio, h('span', { text: 'Certa' })), input],
      obter: () => ({ texto: input.value.trim(), correta: radio.checked }),
      focar: () => input.focus(),
    };
  }

  estaVazio(valor) {
    return !valor.texto;
  }
}

class PistasTab extends AdminTab {
  async carregar() {
    return this.props.api.get('/escape/pistas');
  }

  desenhar(pistas) {
    return [
      barraFiltros(
        h('p', { class: 'texto-suave', text: 'As pistas ativas aparecem para os alunos na ordem abaixo.' }),
        h('button', { type: 'button', class: 'btn btn-primario btn-pequeno', text: '+ Nova pista', onClick: () => this.abrirFormulario() })
      ),
      new DataTable({
        linhas: pistas,
        onClicarLinha: (p) => this.abrirFormulario(p),
        vazio: { icone: '🔎', titulo: 'Nenhuma pista cadastrada', texto: 'Crie a primeira pista do Escape Room.' },
        colunas: [
          { titulo: 'Ordem', classe: 'col-estreita', valor: (p) => String(p.ordem) },
          { titulo: 'Pista', valor: (p) => h('div', {}, h('strong', { text: p.titulo }), h('span', { class: 'texto-suave bloco', text: p.pergunta })) },
          { titulo: 'Tipo', valor: (p) => badge(TIPOS_PISTA.find((t) => t.valor === p.tipo)?.rotulo.split(' (')[0] || p.tipo) },
          { titulo: 'Gabarito', valor: (p) => (p.tipo === 'digito' ? `Número ${p.respostaDigito}` : (p.opcoes.find((o) => o.correta) || {}).texto || '—') },
          { titulo: 'Status', valor: (p) => (p.ativa ? badge('Ativa', 'sucesso') : badge('Inativa')) },
          {
            titulo: '',
            classe: 'col-acoes',
            valor: (p) => h('div', { class: 'acoes-linha' },
              h('button', { type: 'button', class: 'btn-mini', text: 'Editar', onClick: () => this.abrirFormulario(p) }),
              h('button', { type: 'button', class: 'btn-mini btn-mini-perigo', text: 'Excluir', onClick: () => this.excluir(p) })
            ),
          },
        ],
      }).montar(),
    ];
  }

  async excluir(pista) {
    const ok = await ConfirmDialog.perguntar({ titulo: 'Excluir pista?', mensagem: `"${pista.titulo}" será excluída. Envios antigos continuam guardados.`, textoConfirmar: 'Excluir', perigoso: true });
    if (!ok) return;
    try {
      await this.props.api.delete(`/escape/pistas/${pista.id}`);
      Toast.sucesso('Pista excluída.');
      this.recarregar();
    } catch (err) {
      Toast.erro(err.message);
    }
  }

  abrirFormulario(pista = null) {
    const campos = {
      tipo: new CampoSelect({ rotulo: 'Tipo', opcoes: TIPOS_PISTA }),
      titulo: new CampoTexto({ rotulo: 'Título', obrigatorio: true, placeholder: 'Ex: 🧭 O Animal Navegador', max: 200 }),
      enunciado: new CampoTexto({ rotulo: 'Contexto / o que pesquisar', multilinha: true, linhas: 3 }),
      pergunta: new CampoTexto({ rotulo: 'Pergunta', multilinha: true, linhas: 2 }),
      digito: new CampoNumero({ rotulo: 'Dígito correto (0 a 9)', min: 0, max: 9 }),
      ordem: new CampoNumero({ rotulo: 'Ordem', min: 0 }),
      ativa: new CampoCheckbox({ rotulo: 'Pista ativa', ajuda: 'Visível para os alunos' }),
    };
    campos.tipo.definir(pista ? pista.tipo : 'digito');
    campos.titulo.definir(pista && pista.titulo);
    campos.enunciado.definir(pista && pista.enunciado);
    campos.pergunta.definir(pista && pista.pergunta);
    campos.digito.definir(pista ? pista.respostaDigito : '');
    campos.ordem.definir(pista ? pista.ordem : this.dados.length + 1);
    campos.ativa.definir(pista ? pista.ativa : true);

    const areaResposta = h('div');
    let opcoes = null;
    const trocarTipo = (tipo) => {
      if (tipo === 'digito') {
        opcoes = null;
        areaResposta.replaceChildren(campos.digito.el);
        return;
      }
      const iniciais = pista && pista.tipo === tipo && pista.opcoes.length
        ? pista.opcoes
        : tipo === 'verdadeiro_falso'
          ? [{ texto: 'Verdadeiro', correta: true }, { texto: 'Falso', correta: false }]
          : [];
      opcoes = new OpcoesPistaEditor({ rotulo: 'Alternativas (marque a certa)', valores: iniciais, minimo: 4, textoAdicionar: '+ Alternativa' });
      areaResposta.replaceChildren(opcoes.montar());
    };
    trocarTipo(campos.tipo.obter());
    campos.tipo.aoMudar(trocarTipo);

    new FormDialog({
      titulo: pista ? 'Editar pista' : 'Nova pista',
      montarCampos: () => h('div', {}, campos.tipo.el, campos.titulo.el, campos.enunciado.el, campos.pergunta.el, areaResposta, linhaCampos(campos.ordem, campos.ativa)),
      coletar: () => {
        const dados = {
          tipo: campos.tipo.obter(),
          titulo: campos.titulo.obter(),
          enunciado: campos.enunciado.obter(),
          pergunta: campos.pergunta.obter(),
          respostaDigito: campos.digito.obter(),
          ordem: campos.ordem.obter() || 0,
          ativa: campos.ativa.obter(),
          opcoes: opcoes ? opcoes.obter() : [],
        };
        if (!dados.titulo) {
          campos.titulo.erro('Informe o título.');
          throw new Error('Informe o título da pista.');
        }
        return dados;
      },
      salvar: (dados) => (pista ? this.props.api.put(`/escape/pistas/${pista.id}`, dados) : this.props.api.post('/escape/pistas', dados)),
      onSalvo: () => this.recarregar(),
    }).abrirFormulario();
  }
}

export class EscapeSection extends AdminSection {
  static id = 'escape';
  static titulo = 'Escape Room';
  static icone = '🔎';
  static descricao = 'Respostas dos alunos organizadas por turma e as pistas da atividade.';
  static abas = [
    { id: 'envios', rotulo: 'Respostas dos alunos', Classe: EnviosTab },
    { id: 'pistas', rotulo: 'Pistas', Classe: PistasTab },
  ];
}
