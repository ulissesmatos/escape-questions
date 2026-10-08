import { h } from '../../../core/dom.js';
import { AdminSession } from '../../../admin/AdminSession.js';
import { LoginView } from '../../../admin/LoginView.js';
import { ConfirmDialog } from '../../../components/Modal.js';
import { Toast } from '../../../components/ui.js';
import { Conexao, ErroPedido } from '../Conexao.js';
import { FASES, avisoConexao } from '../comum.js';
import { SalaPainel } from './SalaPainel.js';
import { EditorTarefas } from './EditorTarefas.js';

const TEXTOS_LOGIN = {
  icone: '🧪',
  titulo: 'Painel do Laboratório',
  descricao: 'Digite o PIN do professor para criar e controlar as salas.',
  rotulo: 'PIN do professor',
  placeholder: 'Digite o PIN',
  vazio: 'Digite o PIN.',
  voltarHref: '/laboratorio',
};

/**
 * Painel do professor (/laboratorio/professor), protegido pelo PIN
 * (PROFESSOR_PIN). Telas: lista de salas + criar sala, painel de uma sala
 * e editor de tarefas. A sala aberta fica no endereço (#ABCD), então
 * recarregar a página volta para ela.
 */
export class ProfessorApp {
  constructor(raiz) {
    this.raiz = raiz;
    this.salas = [];
    this.tarefas = [];
    this.sessao = new AdminSession({
      base: '/api/laboratorio',
      prefixo: 'laboratorio-prof:',
      aoExpirar: () => this.mostrarLogin('Sua sessão expirou. Digite o PIN de novo.'),
    });
  }

  iniciar() {
    if (this.sessao.ativa) this.conectar();
    else this.mostrarLogin();
  }

  limpar() {
    for (const parte of [this.login, this.painel, this.editor]) if (parte) parte.destruir();
    this.login = this.painel = this.editor = null;
  }

  mostrarLogin(aviso = '') {
    this.limpar();
    this.raiz.replaceChildren();
    if (this.conexao) this.conexao.socket.disconnect();
    this.login = new LoginView({ sessao: this.sessao, aviso, textos: TEXTOS_LOGIN, onEntrar: () => this.conectar() });
    this.login.montar(this.raiz);
  }

  conectar() {
    this.limpar();
    this.area = h('main', { class: 'prof-area container container-largo' }, h('p', { class: 'carregando', text: 'Conectando...' }));
    this.raiz.replaceChildren(this.barraTopo(), this.area);

    if (!this.conexao) {
      this.conexao = new Conexao();
      this.conexao
        .on('connect', () => this.autenticar())
        .on('salas', (salas) => this.receberSalas(salas))
        .on('estado', (estado) => this.painel && this.painel.definir(estado))
        .on('sala-fechada', () => {
          if (!this.painel) return;
          Toast.mostrar('A sala foi fechada.');
          this.irPara('');
        });
      window.addEventListener('hashchange', () => this.navegar());
    } else {
      this.conexao.garantirConectado();
      if (this.conexao.conectado) this.autenticar();
    }
    this.raiz.prepend(avisoConexao(this.conexao));
  }

  barraTopo() {
    return h(
      'header',
      { class: 'prof-topo' },
      h('a', { class: 'prof-marca', href: '#' }, h('span', { 'aria-hidden': 'true', text: '🧪' }), h('span', {}, h('strong', { text: 'Laboratório' }), h('small', { text: 'Painel do professor' }))),
      h(
        'nav',
        { class: 'prof-menu' },
        h('a', { href: '#', class: 'btn btn-contorno btn-pequeno', text: '🏠 Salas' }),
        h('a', { href: '#tarefas', class: 'btn btn-contorno btn-pequeno', text: '📝 Tarefas' }),
        h('button', {
          type: 'button',
          class: 'btn btn-contorno btn-pequeno',
          text: 'Sair',
          onClick: () => {
            this.sessao.sair();
            this.mostrarLogin();
          },
        })
      )
    );
  }

  /** Conecta o socket como professor (a cada reconexão) e mostra a tela do endereço */
  async autenticar() {
    try {
      const resposta = await this.conexao.pedir('prof:entrar', { token: this.sessao.token });
      this.salas = resposta.salas;
      this.tarefas = resposta.tarefas;
      this.navegar({ reconexao: true });
    } catch (erro) {
      if (erro instanceof ErroPedido) {
        this.sessao.sair();
        this.mostrarLogin(erro.message);
      }
    }
  }

  irPara(destino) {
    if (location.hash.slice(1) === destino) this.navegar();
    else location.hash = destino;
  }

  navegar({ reconexao = false } = {}) {
    if (!this.area) return;
    const destino = location.hash.slice(1).toUpperCase();
    if (destino === 'TAREFAS') return this.mostrarEditor();
    if (/^[A-Z]{4}$/.test(destino)) return this.abrirSala(destino, { reconexao });
    return this.mostrarLobby();
  }

  // ------------------------------------------------------------ lista de salas

  receberSalas(salas) {
    this.salas = salas;
    if (this.listaSalas) this.desenharSalas();
  }

  mostrarLobby() {
    this.limpar();
    this.listaSalas = h('div', { class: 'salas-lista' });
    this.desenharSalas();
    this.area.replaceChildren(
      h('div', { class: 'prof-lobby' }, this.formCriar(), h('section', { class: 'cartao prof-secao' }, h('h2', { text: '🚪 Salas abertas' }), this.listaSalas))
    );
  }

  desenharSalas() {
    if (!this.salas.length) {
      this.listaSalas.replaceChildren(h('p', { class: 'texto-suave', text: 'Nenhuma sala aberta. Crie uma ao lado.' }));
      return;
    }
    this.listaSalas.replaceChildren(
      ...this.salas.map((s) =>
        h(
          'div',
          { class: 'sala-item' },
          h('strong', { class: 'sala-item-codigo', text: s.codigo }),
          h(
            'div',
            { class: 'sala-item-info' },
            h('span', { text: `${s.modo === 'rodadas' ? '🔁 Rodadas' : '🧭 Livre'} · ${FASES[s.fase]}` }),
            h('span', { class: 'texto-suave', text: `${s.conectados} online de ${s.totalAlunos} alunos · ${s.totalTarefas} tarefas` })
          ),
          h('a', { href: `#${s.codigo}`, class: 'btn btn-primario btn-pequeno', text: 'Abrir' }),
          h('button', { type: 'button', class: 'btn btn-perigo-contorno btn-pequeno', text: 'Fechar', onClick: () => this.fecharSala(s.codigo) })
        )
      )
    );
  }

  async fecharSala(codigo) {
    const ok = await ConfirmDialog.perguntar({
      titulo: `Fechar a sala ${codigo}?`,
      mensagem: 'Os alunos saem da sala e o ranking é apagado. Exporte o CSV antes se quiser guardar o resultado.',
      textoConfirmar: 'Fechar sala',
      perigoso: true,
    });
    if (!ok) return;
    try {
      await this.conexao.pedir('prof:fechar', { codigo });
      Toast.sucesso(`Sala ${codigo} fechada.`);
    } catch (erro) {
      Toast.erro(erro.message);
    }
  }

  formCriar() {
    const modo = (valor, icone, titulo, texto, marcado) =>
      h(
        'label',
        { class: 'modo-opcao' },
        h('input', { type: 'radio', name: 'modo', value: valor, checked: marcado }),
        h('span', { class: 'modo-icone', 'aria-hidden': 'true', text: icone }),
        h('span', {}, h('strong', { text: titulo }), h('span', { class: 'texto-suave bloco', text: texto }))
      );
    const duracao = h('input', { type: 'number', name: 'duracao', min: 1, max: 30, step: 0.5, value: 4, class: 'campo campo-curto' });
    const campoDuracao = h('div', { class: 'campo-duracao' }, h('label', { for: 'lab-duracao', text: '⏱️ Tempo por tarefa (minutos)' }), Object.assign(duracao, { id: 'lab-duracao' }));
    const caixas = this.tarefas.map((t, i) =>
      h('label', { class: 'tarefa-check' }, h('input', { type: 'checkbox', value: t.id, checked: true }), `${i + 1}. ${t.titulo}`)
    );
    const marcarTodas = (valor) => caixas.forEach((c) => (c.querySelector('input').checked = valor));
    const botao = h('button', { type: 'submit', class: 'btn btn-primario btn-grande btn-bloco', text: '✨ Criar sala' });

    const form = h(
      'form',
      { class: 'cartao prof-secao form-criar' },
      h('h2', { text: '✨ Nova sala' }),
      h('fieldset', { class: 'modos' }, h('legend', { class: 'rotulo', text: 'Como vai ser a partida?' }), modo('rodadas', '🔁', 'Rodadas', 'Você libera uma tarefa por vez, com cronômetro.', true), modo('livre', '🧭', 'Livre', 'Todas liberadas, cada aluno no seu ritmo.', false)),
      campoDuracao,
      h(
        'fieldset',
        { class: 'tarefas-escolha' },
        h('legend', { class: 'rotulo' }, `📋 Tarefas (${this.tarefas.length})`, ' ', h('button', { type: 'button', class: 'btn-link', text: 'todas', onClick: () => marcarTodas(true) }), ' · ', h('button', { type: 'button', class: 'btn-link', text: 'nenhuma', onClick: () => marcarTodas(false) })),
        h('div', { class: 'tarefas-checks' }, caixas)
      ),
      botao
    );
    form.addEventListener('change', () => {
      campoDuracao.hidden = form.elements.modo.value !== 'rodadas';
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tarefaIds = caixas.map((c) => c.querySelector('input')).filter((c) => c.checked).map((c) => c.value);
      if (!tarefaIds.length) return Toast.erro('Escolha pelo menos uma tarefa.');
      botao.disabled = true;
      try {
        const { codigo } = await this.conexao.pedir('prof:criar', { modo: form.elements.modo.value, duracaoMin: Number(duracao.value), tarefaIds });
        this.irPara(codigo);
      } catch (erro) {
        Toast.erro(erro.message);
      } finally {
        botao.disabled = false;
      }
    });
    return form;
  }

  // ------------------------------------------------------------ sala

  async abrirSala(codigo, { reconexao = false } = {}) {
    try {
      const { estado } = await this.conexao.pedir('prof:abrir', { codigo });
      if (reconexao && this.painel && this.painel.props.codigo === codigo) {
        this.painel.definir(estado);
        return;
      }
      this.limpar();
      this.listaSalas = null;
      this.painel = new SalaPainel({ codigo, conexao: this.conexao, onErro: (m) => Toast.erro(m) });
      this.area.replaceChildren(this.painel.montar());
      this.painel.definir(estado);
    } catch (erro) {
      Toast.erro(erro.message);
      this.irPara('');
    }
  }

  // ------------------------------------------------------------ tarefas

  mostrarEditor() {
    this.limpar();
    this.listaSalas = null;
    this.editor = new EditorTarefas({
      api: this.sessao.api,
      onSalvar: (tarefas) => {
        this.tarefas = tarefas.map(({ id, titulo }) => ({ id, titulo }));
      },
    });
    this.area.replaceChildren(this.editor.montar());
  }
}
