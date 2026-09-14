import { h } from '../../core/dom.js';
import { Modal } from '../../components/Modal.js';
import { Toast } from '../../components/ui.js';
import { QuestionViewFactory } from '../../questions/QuestionViewFactory.js';
import { FormDialog } from '../components/FormDialog.js';
import { CampoTexto, CampoSelect, CampoCheckbox, CampoDificuldade, linhaCampos } from '../components/campos.js';
import { QuestionEditorFactory } from './QuestionEditors.js';

/** Mostra a questão exatamente como o aluno veria (com as mesmas views da página do aluno). */
export class PreviewDialog extends Modal {
  static async abrir(api, dados) {
    let previa;
    try {
      previa = await api.post('/hardware/questoes/previa', dados);
    } catch (err) {
      Toast.erro(err.message);
      return;
    }
    const dialogo = new PreviewDialog({ classe: 'modal-previa', onFechar: () => setTimeout(() => dialogo.destruir(), 0) });
    dialogo.montar(document.body);
    const view = QuestionViewFactory.criar(previa.questao, {});
    dialogo.definirCabecalho(h('div', {}, h('span', { class: 'modal-etiqueta', text: 'Pré-visualização' }), h('h2', { text: 'Como o aluno vê' })));
    dialogo.definirCorpo(
      view.montar(),
      h('div', { class: 'previa-gabarito' }, h('strong', { text: 'Resposta certa desta versão: ' }), previa.respostaCerta)
    );
    dialogo.definirRodape(
      h('button', { type: 'button', class: 'btn btn-contorno', text: 'Sortear outra versão', onClick: () => { dialogo.fechar(); PreviewDialog.abrir(api, dados); } }),
      h('button', { type: 'button', class: 'btn btn-primario', text: 'Fechar', onClick: () => dialogo.fechar() })
    );
    dialogo.abrir();
  }
}

/**
 * Formulário de questão do Mapa de Hardware. Trocar o tipo troca o editor
 * (polimorfismo: todos respondem a renderizar()/lerConteudo()).
 */
export function abrirFormularioQuestao({ api, componentes, questao = null, componentIdPadrao = null, onSalvo }) {
  const campos = {
    componente: new CampoSelect({
      rotulo: 'Peça do mapa',
      obrigatorio: true,
      opcoes: componentes.map((c) => ({ valor: c.id, rotulo: c.nome, grupo: c.nivelNome || 'Sem nível' })),
    }),
    tipo: new CampoSelect({ rotulo: 'Tipo de pergunta', opcoes: QuestionEditorFactory.opcoes() }),
    dificuldade: new CampoDificuldade({ rotulo: 'Dificuldade' }),
    enunciado: new CampoTexto({ rotulo: 'Dica de pesquisa', multilinha: true, linhas: 2, ajuda: 'O que o aluno deve pesquisar — sem entregar a resposta.' }),
    pergunta: new CampoTexto({ rotulo: 'Pergunta', multilinha: true, linhas: 2 }),
    explicacao: new CampoTexto({ rotulo: 'Explicação (aparece quando o aluno acerta)', multilinha: true, linhas: 2 }),
    ativa: new CampoCheckbox({ rotulo: 'Questão ativa', ajuda: 'Desmarque para tirar do sorteio sem excluir.' }),
  };

  campos.componente.definir(questao ? questao.componentId : componentIdPadrao);
  campos.tipo.definir(questao ? questao.tipo : 'multipla_escolha');
  campos.dificuldade.definir(questao ? questao.dificuldade : 2);
  campos.enunciado.definir(questao && questao.enunciado);
  campos.pergunta.definir(questao && questao.pergunta);
  campos.explicacao.definir(questao && questao.explicacao);
  campos.ativa.definir(questao ? questao.ativa : true);

  const areaEditor = h('div', { class: 'area-editor' });
  let editor;
  const trocarEditor = (tipo, conteudo) => {
    editor = QuestionEditorFactory.criar(tipo, conteudo);
    areaEditor.replaceChildren(editor.renderizar());
    campos.pergunta.controle.placeholder = editor.exemploPergunta;
  };
  trocarEditor(campos.tipo.obter(), questao ? questao.conteudo : {});
  campos.tipo.aoMudar((tipo) => trocarEditor(tipo, {}));

  const coletar = () => {
    const dados = {
      componentId: Number(campos.componente.obter()),
      tipo: campos.tipo.obter(),
      dificuldade: campos.dificuldade.obter(),
      enunciado: campos.enunciado.obter(),
      pergunta: campos.pergunta.obter(),
      explicacao: campos.explicacao.obter(),
      ativa: campos.ativa.obter(),
      conteudo: editor.lerConteudo(),
    };
    if (!dados.componentId) throw new Error('Escolha a peça do mapa.');
    if (editor.perguntaObrigatoria && !dados.pergunta && !dados.conteudo.variantes) {
      campos.pergunta.erro('Escreva a pergunta.');
      throw new Error('Escreva a pergunta.');
    }
    if (!dados.pergunta && !editor.perguntaObrigatoria) dados.pergunta = editor.exemploPergunta;
    return dados;
  };

  const dialogo = new FormDialog({
    titulo: questao ? 'Editar questão' : 'Nova questão',
    classe: 'modal-largo',
    montarCampos: () =>
      h(
        'div',
        {},
        linhaCampos(campos.componente, campos.tipo),
        campos.dificuldade.el,
        campos.enunciado.el,
        campos.pergunta.el,
        areaEditor,
        campos.explicacao.el,
        campos.ativa.el,
        h('button', {
          type: 'button',
          class: 'btn btn-suave btn-pequeno btn-previa',
          text: '👁️ Pré-visualizar como aluno',
          onClick: () => {
            try {
              PreviewDialog.abrir(api, coletar());
            } catch (err) {
              dialogo.mostrarErro(err.message);
            }
          },
        })
      ),
    coletar,
    salvar: (dados) => (questao ? api.put(`/hardware/questoes/${questao.id}`, dados) : api.post('/hardware/questoes', dados)),
    onSalvo,
  });
  dialogo.abrirFormulario();
  return dialogo;
}
