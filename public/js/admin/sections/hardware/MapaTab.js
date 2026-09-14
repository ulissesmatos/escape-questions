import { h } from '../../../core/dom.js';
import { ConfirmDialog } from '../../../components/Modal.js';
import { Toast, estadoVazio } from '../../../components/ui.js';
import { AdminTab } from '../base.js';
import { badge } from '../../components/widgets.js';
import { FormDialog } from '../../components/FormDialog.js';
import { CampoTexto, CampoNumero, CampoSelect, CampoCheckbox, linhaCampos } from '../../components/campos.js';
import { MapEditor } from './MapEditor.js';

/** Níveis, peças e conexões — com editor visual de arrastar. */
export class MapaTab extends AdminTab {
  async carregar() {
    const [niveis, componentes, conexoes] = await Promise.all([
      this.props.api.get('/hardware/niveis'),
      this.props.api.get('/hardware/componentes'),
      this.props.api.get('/hardware/conexoes'),
    ]);
    this.niveis = niveis;
    this.componentes = componentes;
    this.conexoes = conexoes;
    if (!niveis.some((n) => n.id === this.nivelId)) this.nivelId = niveis[0] ? niveis[0].id : null;
    return true;
  }

  desenhar() {
    const nivel = this.niveis.find((n) => n.id === this.nivelId);
    const doNivel = this.componentes.filter((c) => c.nivelId === this.nivelId);
    const ids = new Set(doNivel.map((c) => c.id));
    const conexoesNivel = this.conexoes.filter((cx) => ids.has(cx.deId) && ids.has(cx.paraId));
    const semNivel = this.componentes.filter((c) => !c.nivelId);

    return h(
      'div',
      { class: 'layout-mapa-admin' },
      h(
        'div',
        { class: 'coluna-niveis' },
        h(
          'div',
          { class: 'cartao bloco-admin' },
          h('div', { class: 'bloco-admin-cabecalho' }, h('h2', { text: 'Níveis' }), h('button', { type: 'button', class: 'btn-mini', text: '+ Nível', onClick: () => this.formularioNivel() })),
          this.niveis.length
            ? h(
                'div',
                { class: 'lista-niveis-admin' },
                this.niveis.map((n) =>
                  h(
                    'div',
                    { class: `nivel-admin${n.id === this.nivelId ? ' ativo' : ''}` },
                    h(
                      'button',
                      { type: 'button', class: 'nivel-admin-nome', onClick: () => { this.nivelId = n.id; this.redesenhar(); } },
                      h('strong', { text: n.nome }),
                      h('span', { class: 'texto-suave', text: `${n.totalComponentes} peças · ordem ${n.ordem}` }),
                      !n.ativo && badge('Inativo')
                    ),
                    h('button', { type: 'button', class: 'btn-mini', text: 'Editar', onClick: () => this.formularioNivel(n) })
                  )
                )
              )
            : h('p', { class: 'texto-suave', text: 'Nenhum nível.' })
        ),
        semNivel.length > 0 &&
          h(
            'div',
            { class: 'cartao bloco-admin' },
            h('h2', { text: 'Peças sem nível' }),
            h('p', { class: 'texto-suave', text: 'Não aparecem para os alunos até receberem um nível.' }),
            semNivel.map((c) => h('button', { type: 'button', class: 'componente-item', onClick: () => this.formularioComponente(c) }, h('span', { text: c.icone }), h('span', { class: 'componente-item-nome', text: c.nome })))
          )
      ),
      nivel
        ? h(
            'div',
            { class: 'coluna-editor' },
            h(
              'div',
              { class: 'barra-filtros' },
              h('div', {}, h('h2', { class: 'titulo-editor', text: nivel.nome }), h('p', { class: 'texto-suave', text: 'Arraste as peças para posicionar. Clique numa peça para editar. ★ = peça inicial (liberada desde o começo).' })),
              h(
                'div',
                { class: 'acoes-linha' },
                h('button', { type: 'button', class: 'btn btn-contorno btn-pequeno', text: '🔗 Conectar peças', disabled: doNivel.length < 2, onClick: () => this.formularioConexao(doNivel) }),
                h('button', { type: 'button', class: 'btn btn-primario btn-pequeno', text: '+ Peça', onClick: () => this.formularioComponente() })
              )
            ),
            doNivel.length
              ? new MapEditor({
                  componentes: doNivel,
                  conexoes: conexoesNivel,
                  onMover: ({ componente, posX, posY }) => this.mover(componente, posX, posY),
                  onClicar: (componente) => this.formularioComponente(componente),
                }).montar()
              : estadoVazio({ icone: '🧩', titulo: 'Este nível ainda não tem peças', texto: 'Adicione a primeira peça.' }),
            this.avisosNivel(doNivel, conexoesNivel),
            h(
              'div',
              { class: 'cartao bloco-admin' },
              h('h2', { text: `Conexões (${conexoesNivel.length})` }),
              h('p', { class: 'texto-suave', text: 'Quando o aluno descobre uma peça, as peças conectadas a ela são liberadas.' }),
              conexoesNivel.length
                ? h(
                    'ul',
                    { class: 'lista-conexoes' },
                    conexoesNivel.map((cx) => {
                      const nome = (id) => (this.componentes.find((c) => c.id === id) || {}).nome;
                      return h(
                        'li',
                        {},
                        h('span', { text: `${nome(cx.deId)} ↔ ${nome(cx.paraId)}` }),
                        h('button', { type: 'button', class: 'btn-mini btn-mini-perigo', text: 'Remover', onClick: () => this.removerConexao(cx) })
                      );
                    })
                  )
                : h('p', { class: 'texto-suave', text: 'Nenhuma conexão neste nível.' })
            )
          )
        : estadoVazio({ icone: '🗂️', titulo: 'Crie um nível para começar' })
    );
  }

  /** Aponta problemas que deixariam peças impossíveis de alcançar */
  avisosNivel(componentes, conexoes) {
    const avisos = [];
    const iniciais = componentes.filter((c) => c.inicial && c.ativo);
    if (componentes.length && !iniciais.length) avisos.push('Nenhuma peça inicial (★): os alunos não conseguem começar este nível.');

    const vizinhos = new Map(componentes.map((c) => [c.id, []]));
    for (const cx of conexoes) {
      vizinhos.get(cx.deId).push(cx.paraId);
      vizinhos.get(cx.paraId).push(cx.deId);
    }
    const alcancadas = new Set(iniciais.map((c) => c.id));
    const fila = [...alcancadas];
    while (fila.length) {
      for (const v of vizinhos.get(fila.shift()) || []) {
        if (!alcancadas.has(v)) {
          alcancadas.add(v);
          fila.push(v);
        }
      }
    }
    const inalcancaveis = componentes.filter((c) => c.ativo && !alcancadas.has(c.id));
    if (iniciais.length && inalcancaveis.length) avisos.push(`Peças sem caminho a partir da inicial: ${inalcancaveis.map((c) => c.nome).join(', ')}.`);
    const semQuestoes = componentes.filter((c) => c.ativo && !c.totalQuestoes);
    if (semQuestoes.length) avisos.push(`Peças sem questões (não podem ser descobertas): ${semQuestoes.map((c) => c.nome).join(', ')}.`);

    return avisos.length ? h('div', { class: 'aviso-admin' }, avisos.map((a) => h('p', { text: `⚠️ ${a}` }))) : null;
  }

  async mover(componente, posX, posY) {
    try {
      await this.props.api.patch(`/hardware/componentes/${componente.id}/posicao`, { posX, posY });
      Toast.mostrar(`${componente.nome} movida.`, { duracao: 1500 });
    } catch (err) {
      Toast.erro(err.message);
      this.recarregar();
    }
  }

  formularioNivel(nivel = null) {
    const campos = {
      nome: new CampoTexto({ rotulo: 'Nome', obrigatorio: true, placeholder: 'Ex: Nível 4 — Segurança digital', max: 120 }),
      descricao: new CampoTexto({ rotulo: 'Descrição', multilinha: true, linhas: 2, max: 500 }),
      ordem: new CampoNumero({ rotulo: 'Ordem', min: 0, ajuda: 'Menor aparece primeiro' }),
      ativo: new CampoCheckbox({ rotulo: 'Nível ativo', ajuda: 'Visível para os alunos' }),
    };
    campos.nome.definir(nivel && nivel.nome);
    campos.descricao.definir(nivel && nivel.descricao);
    campos.ordem.definir(nivel ? nivel.ordem : this.niveis.length + 1);
    campos.ativo.definir(nivel ? nivel.ativo : true);

    new FormDialog({
      titulo: nivel ? 'Editar nível' : 'Novo nível',
      montarCampos: (dialogo) =>
        h(
          'div',
          {},
          campos.nome.el,
          campos.descricao.el,
          linhaCampos(campos.ordem, campos.ativo),
          nivel && h('button', {
            type: 'button',
            class: 'btn btn-perigo-contorno btn-pequeno',
            text: 'Excluir nível',
            onClick: async () => {
              const ok = await ConfirmDialog.perguntar({ titulo: 'Excluir nível?', mensagem: 'As peças deste nível NÃO são apagadas — ficam "sem nível".', textoConfirmar: 'Excluir', perigoso: true });
              if (!ok) return;
              await this.props.api.delete(`/hardware/niveis/${nivel.id}`);
              dialogo.fechar();
              this.recarregar();
            },
          })
        ),
      coletar: () => {
        const dados = { nome: campos.nome.obter(), descricao: campos.descricao.obter(), ordem: campos.ordem.obter() || 0, ativo: campos.ativo.obter() };
        if (!dados.nome) throw new Error('Informe o nome do nível.');
        return dados;
      },
      salvar: (dados) => (nivel ? this.props.api.put(`/hardware/niveis/${nivel.id}`, dados) : this.props.api.post('/hardware/niveis', dados)),
      onSalvo: (salvo) => {
        if (salvo && !nivel) this.nivelId = salvo.id;
        this.recarregar();
      },
    }).abrirFormulario();
  }

  formularioComponente(componente = null) {
    const campos = {
      nome: new CampoTexto({ rotulo: 'Nome', obrigatorio: true, placeholder: 'Ex: Placa de vídeo (GPU)', max: 120 }),
      icone: new CampoTexto({ rotulo: 'Ícone (emoji)', placeholder: '🎮', max: 16, ajuda: 'Usado quando não há imagem' }),
      imagem: new CampoTexto({ rotulo: 'Imagem (caminho ou URL)', placeholder: '/images/hardware/gpu.jpg', max: 500 }),
      nivel: new CampoSelect({ rotulo: 'Nível', opcoes: [{ valor: '', rotulo: 'Sem nível' }, ...this.niveis.map((n) => ({ valor: n.id, rotulo: n.nome }))] }),
      inicial: new CampoCheckbox({ rotulo: '★ Peça inicial', ajuda: 'Já começa liberada (normalmente 1 por nível)' }),
      ativo: new CampoCheckbox({ rotulo: 'Peça ativa', ajuda: 'Aparece no mapa dos alunos' }),
    };
    campos.nome.definir(componente && componente.nome);
    campos.icone.definir(componente ? componente.icone : '🔧');
    campos.imagem.definir(componente && componente.imagem);
    campos.nivel.definir(componente ? componente.nivelId : this.nivelId);
    campos.inicial.definir(componente && componente.inicial);
    campos.ativo.definir(componente ? componente.ativo : true);

    new FormDialog({
      titulo: componente ? 'Editar peça' : 'Nova peça',
      montarCampos: (dialogo) =>
        h(
          'div',
          {},
          linhaCampos(campos.nome, campos.icone),
          campos.imagem.el,
          campos.nivel.el,
          linhaCampos(campos.inicial, campos.ativo),
          componente &&
            h(
              'div',
              { class: 'acoes-linha' },
              h('button', { type: 'button', class: 'btn btn-suave btn-pequeno', text: `❓ Ver questões (${componente.totalQuestoes})`, onClick: () => { dialogo.fechar(); this.props.router.ir('/hardware/questoes'); } }),
              h('button', {
                type: 'button',
                class: 'btn btn-perigo-contorno btn-pequeno',
                text: 'Excluir peça',
                onClick: async () => {
                  const ok = await ConfirmDialog.perguntar({ titulo: 'Excluir peça?', mensagem: `"${componente.nome}", suas questões e conexões serão apagadas.`, textoConfirmar: 'Excluir', perigoso: true });
                  if (!ok) return;
                  await this.props.api.delete(`/hardware/componentes/${componente.id}`);
                  dialogo.fechar();
                  this.recarregar();
                },
              })
            )
        ),
      coletar: () => {
        const dados = {
          nome: campos.nome.obter(),
          icone: campos.icone.obter() || '🔧',
          imagem: campos.imagem.obter(),
          nivelId: Number(campos.nivel.obter()) || null,
          inicial: campos.inicial.obter(),
          ativo: campos.ativo.obter(),
          posX: componente ? componente.posX : 50,
          posY: componente ? componente.posY : 50,
        };
        if (!dados.nome) throw new Error('Informe o nome da peça.');
        return dados;
      },
      salvar: (dados) => (componente ? this.props.api.put(`/hardware/componentes/${componente.id}`, dados) : this.props.api.post('/hardware/componentes', dados)),
      onSalvo: () => this.recarregar(),
    }).abrirFormulario();
  }

  formularioConexao(componentes) {
    const opcoes = componentes.map((c) => ({ valor: c.id, rotulo: c.nome }));
    const de = new CampoSelect({ rotulo: 'Peça', opcoes });
    const para = new CampoSelect({ rotulo: 'Conectar com', opcoes });
    if (componentes[1]) para.definir(componentes[1].id);

    new FormDialog({
      titulo: 'Conectar peças',
      textoSalvar: 'Conectar',
      montarCampos: () => linhaCampos(de, para),
      coletar: () => {
        const dados = { deId: Number(de.obter()), paraId: Number(para.obter()) };
        if (dados.deId === dados.paraId) throw new Error('Escolha duas peças diferentes.');
        return dados;
      },
      salvar: (dados) => this.props.api.post('/hardware/conexoes', dados),
      onSalvo: () => this.recarregar(),
    }).abrirFormulario();
  }

  async removerConexao(conexao) {
    try {
      await this.props.api.delete(`/hardware/conexoes/${conexao.id}`);
      Toast.sucesso('Conexão removida.');
      this.recarregar();
    } catch (err) {
      Toast.erro(err.message);
    }
  }
}
