import { Component } from '../../../core/Component.js';
import { h } from '../../../core/dom.js';
import { ConfirmDialog } from '../../../components/Modal.js';
import { Toast, estadoCarregando } from '../../../components/ui.js';
import { textoComTeclas } from '../comum.js';

const LETRAS = ['a', 'b', 'c', 'd'];

/**
 * Editor simples das tarefas. O padrão vem do tasks.json; o que for salvo
 * aqui fica no banco e vale para as próximas salas (as salas já abertas
 * continuam com as tarefas de quando foram criadas).
 *
 * props: { api (ApiClient com a sessão do professor), onSalvar(tarefas) }
 */
export class EditorTarefas extends Component {
  render() {
    this.lista = h('div', { class: 'editor-lista' }, estadoCarregando('Carregando tarefas...'));
    this.origem = h('p', { class: 'editor-origem' });
    this.filtros = h('div', { class: 'editor-filtros', role: 'tablist', 'aria-label': 'Filtrar por tema' });
    this.filtro = 'todas';
    this.categorias = [];
    this.carregar();
    return h(
      'section',
      { class: 'editor-tarefas' },
      h(
        'div',
        { class: 'cartao prof-secao editor-topo' },
        h('h2', { text: '📝 Tarefas do laboratório' }),
        this.origem,
        h(
          'ul',
          { class: 'editor-dicas' },
          h('li', {}, 'Na instrução, escreva as teclas entre colchetes para destacar: ', h('code', { text: '[Ctrl] + [Z]' }), ' vira ', ...textoComTeclas('[Ctrl] + [Z]')),
          h('li', { text: 'Em "Atalhos em destaque", separe os atalhos com ponto e vírgula. Ex.: Windows + Shift + S; Ctrl + V' }),
          h('li', { text: 'O aluno primeiro só vê a instrução. As opções aparecem depois do tempo mínimo, embaralhadas para cada aluno.' }),
          h('li', { text: 'Prefira perguntas sobre algo que só quem fez vê na tela ("o que apareceu?"), em vez de "o que vai acontecer?".' }),
          h('li', { text: 'As mudanças valem para as próximas salas. Salas já abertas continuam com as tarefas de quando foram criadas.' })
        )
      ),
      this.filtros,
      this.lista,
      h(
        'div',
        { class: 'editor-barra' },
        h('button', { type: 'button', class: 'btn btn-contorno', text: '➕ Nova tarefa', onClick: () => this.adicionar() }),
        h('span', { class: 'espacador' }),
        h('button', { type: 'button', class: 'btn btn-contorno', text: '⬇️ Baixar tasks.json', onClick: () => this.baixar() }),
        h('button', { type: 'button', class: 'btn btn-perigo-contorno', text: '↩️ Restaurar padrão', onClick: () => this.restaurar() }),
        h('button', { type: 'button', class: 'btn btn-primario', text: '💾 Salvar tarefas', onClick: () => this.salvar() })
      )
    );
  }

  async carregar() {
    try {
      this.aplicar(await this.props.api.get('/tarefas'));
    } catch (erro) {
      this.lista.replaceChildren(h('p', { class: 'erro-msg mostrar', text: erro.message }));
    }
  }

  aplicar({ tarefas, personalizadas, categorias }) {
    this.tarefas = tarefas;
    this.categorias = categorias;
    this.origem.textContent = personalizadas
      ? '✏️ Usando a versão editada aqui no painel.'
      : '📄 Usando o arquivo tasks.json (padrão). Ao salvar, sua versão passa a valer.';
    this.desenharLista();
  }

  desenharLista() {
    this.lista.replaceChildren(...this.tarefas.map((t, i) => this.formTarefa(t, i)));
    this.aplicarFiltro();
  }

  /** Mostra só as tarefas do tema escolhido (as outras ficam escondidas, não somem) */
  aplicarFiltro() {
    const formularios = [...this.lista.querySelectorAll('.editor-tarefa')];
    const temaDe = (fs) => fs.querySelector('[data-campo="categoria"]').value;
    const contar = (id) => (id === 'todas' ? formularios.length : formularios.filter((fs) => temaDe(fs) === id).length);
    const opcoes = [{ id: 'todas', nome: 'Todas', icone: '📚' }, ...this.categorias];
    this.filtros.replaceChildren(
      ...opcoes.map((c) =>
        h('button', {
          type: 'button',
          role: 'tab',
          class: `chip-filtro${this.filtro === c.id ? ' ativo' : ''}`,
          'aria-selected': String(this.filtro === c.id),
          text: `${c.icone} ${c.nome} (${contar(c.id)})`,
          onClick: () => {
            this.filtro = c.id;
            this.aplicarFiltro();
          },
        })
      )
    );
    for (const fs of formularios) fs.hidden = this.filtro !== 'todas' && temaDe(fs) !== this.filtro;
  }

  formTarefa(t, i) {
    const campo = (rotulo, el) => h('label', { class: 'editor-campo' }, h('span', { class: 'rotulo', text: rotulo }), el);
    const nomeRadio = `correta-${i}-${Math.random().toString(36).slice(2, 6)}`;
    const opcoes = LETRAS.map((letra, j) =>
      h(
        'div',
        { class: 'editor-opcao' },
        h('label', { class: 'editor-correta', title: 'Marcar como correta' }, h('input', { type: 'radio', name: nomeRadio, value: letra, checked: t.correta === letra, 'data-campo': 'correta' }), h('span', { class: 'opcao-letra', 'data-letra': letra, text: letra.toUpperCase() })),
        h('input', { type: 'text', maxlength: 200, value: t.opcoes[j] || '', placeholder: j < 2 ? 'Opção' : 'Opção (opcional)', 'data-opcao': j, 'aria-label': `Opção ${letra.toUpperCase()}` })
      )
    );
    const total = this.tarefas.length;
    return h(
      'fieldset',
      { class: 'cartao editor-tarefa', 'data-id': t.id || '' },
      h(
        'legend',
        { class: 'editor-legenda' },
        h('span', { class: 'tarefa-numero', text: `Tarefa ${i + 1}` }),
        h(
          'span',
          { class: 'editor-ordem' },
          h('button', { type: 'button', class: 'btn-mini', title: 'Subir', disabled: i === 0, onClick: () => this.mover(i, -1) }, '↑'),
          h('button', { type: 'button', class: 'btn-mini', title: 'Descer', disabled: i === total - 1, onClick: () => this.mover(i, 1) }, '↓'),
          h('button', { type: 'button', class: 'btn-mini btn-mini-perigo', title: 'Remover', onClick: () => this.remover(i) }, '🗑️')
        )
      ),
      campo('Tema', h('select', { class: 'campo', 'data-campo': 'categoria', onChange: () => this.aplicarFiltro() }, this.categorias.map((c) => h('option', { value: c.id, selected: c.id === t.categoria, text: `${c.icone} ${c.nome}` })))),
      campo('Título', h('input', { type: 'text', maxlength: 80, value: t.titulo, 'data-campo': 'titulo' })),
      campo('Instrução (o que o aluno faz)', h('textarea', { rows: 2, maxlength: 600, value: t.instrucao, 'data-campo': 'instrucao' })),
      campo('Atalhos em destaque (opcional)', h('input', { type: 'text', value: (t.teclas || []).join('; '), placeholder: 'Windows + D', 'data-campo': 'teclas' })),
      campo('Tempo mínimo para fazer (segundos)', h('input', { type: 'number', min: 0, max: 300, value: t.tempoMinimo ?? 15, class: 'campo campo-curto', 'data-campo': 'tempoMinimo' })),
      campo('Pergunta (aparece depois de fazer)', h('input', { type: 'text', maxlength: 200, value: t.pergunta, 'data-campo': 'pergunta' })),
      h('div', { class: 'editor-campo' }, h('span', { class: 'rotulo', text: 'Opções (marque a correta)' }), h('div', { class: 'editor-opcoes' }, opcoes)),
      campo('Explicação (aparece depois da resposta)', h('textarea', { rows: 2, maxlength: 600, value: t.explicacao, 'data-campo': 'explicacao' })),
      campo('Nota para o professor (só você vê)', h('input', { type: 'text', maxlength: 400, value: t.notaProfessor || '', 'data-campo': 'notaProfessor' }))
    );
  }

  /** Lê o que está nos formulários (antes de mover, remover ou salvar) */
  lerFormularios() {
    return [...this.lista.querySelectorAll('.editor-tarefa')].map((fs) => {
      const valor = (nome) => fs.querySelector(`[data-campo="${nome}"]`).value;
      const marcada = fs.querySelector('[data-campo="correta"]:checked');
      return {
        id: fs.dataset.id || undefined,
        categoria: valor('categoria'),
        titulo: valor('titulo'),
        instrucao: valor('instrucao'),
        teclas: valor('teclas').split(';').map((x) => x.trim()).filter(Boolean),
        tempoMinimo: Number(valor('tempoMinimo')),
        pergunta: valor('pergunta'),
        opcoes: [...fs.querySelectorAll('[data-opcao]')].map((el) => el.value.trim()),
        correta: marcada ? marcada.value : '',
        explicacao: valor('explicacao'),
        notaProfessor: valor('notaProfessor'),
      };
    });
  }

  /** As opções vazias do meio somem; a letra correta acompanha a opção marcada */
  static compactar(t) {
    const indiceCorreta = LETRAS.indexOf(t.correta);
    const usadas = t.opcoes.map((texto, i) => ({ texto, i })).filter((o) => o.texto);
    const novaPosicao = usadas.findIndex((o) => o.i === indiceCorreta);
    return { ...t, opcoes: usadas.map((o) => o.texto), correta: novaPosicao >= 0 ? LETRAS[novaPosicao] : '' };
  }

  mover(i, delta) {
    this.tarefas = this.lerFormularios();
    const [item] = this.tarefas.splice(i, 1);
    this.tarefas.splice(i + delta, 0, item);
    this.desenharLista();
  }

  async remover(i) {
    const ok = await ConfirmDialog.perguntar({ titulo: 'Remover esta tarefa?', mensagem: 'Ela só some de verdade quando você clicar em "Salvar tarefas".', textoConfirmar: 'Remover', perigoso: true });
    if (!ok) return;
    this.tarefas = this.lerFormularios();
    this.tarefas.splice(i, 1);
    this.desenharLista();
  }

  adicionar() {
    this.tarefas = this.lerFormularios();
    // A tarefa nova já entra no tema que está filtrado
    const categoria = this.filtro !== 'todas' ? this.filtro : this.categorias[0].id;
    this.tarefas.push({ categoria, titulo: '', instrucao: '', teclas: [], tempoMinimo: 15, pergunta: 'O que aconteceu?', opcoes: ['', '', '', ''], correta: 'a', explicacao: '', notaProfessor: '' });
    this.desenharLista();
    const ultimo = this.lista.lastElementChild;
    ultimo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    ultimo.querySelector('[data-campo="titulo"]').focus({ preventScroll: true });
  }

  async salvar() {
    const tarefas = this.lerFormularios().map((t) => EditorTarefas.compactar(t));
    try {
      const resposta = await this.props.api.put('/tarefas', { tarefas });
      this.aplicar(resposta);
      this.emitir('Salvar', resposta.tarefas);
      Toast.sucesso('Tarefas salvas! Valem para as próximas salas.');
    } catch (erro) {
      Toast.erro(erro.message);
    }
  }

  async restaurar() {
    const ok = await ConfirmDialog.perguntar({
      titulo: 'Voltar para o tasks.json?',
      mensagem: 'As tarefas editadas aqui no painel serão descartadas e volta a valer o arquivo padrão.',
      textoConfirmar: 'Restaurar padrão',
      perigoso: true,
    });
    if (!ok) return;
    try {
      const resposta = await this.props.api.delete('/tarefas');
      this.aplicar(resposta);
      this.emitir('Salvar', resposta.tarefas);
      Toast.sucesso('Pronto! Voltou a valer o tasks.json.');
    } catch (erro) {
      Toast.erro(erro.message);
    }
  }

  /** Baixa as tarefas atuais no formato do tasks.json (para guardar no repositório) */
  baixar() {
    const tarefas = this.lerFormularios().map((t) => {
      const { notaProfessor, ...resto } = EditorTarefas.compactar(t);
      return notaProfessor ? { ...resto, notaProfessor } : resto;
    });
    const blob = new Blob([`${JSON.stringify(tarefas, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = h('a', { href: url, download: 'tasks.json' });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
