import { Component } from '../../../core/Component.js';
import { h, formatarDataHora } from '../../../core/dom.js';
import { Modal, ConfirmDialog } from '../../../components/Modal.js';
import { Toast } from '../../../components/ui.js';
import { Tabs, baixarCsv } from '../../../admin/components/widgets.js';
import { Cronometro, FASES, MEDALHAS, formatarDuracao, textoComTeclas } from '../comum.js';

const LETRAS = ['a', 'b', 'c', 'd'];

/**
 * Painel de uma sala: código e links, botões de controle da partida e abas
 * (respostas ao vivo, alunos e ranking).
 *
 * O estado chega a cada mudança; o desenho é agrupado por quadro de
 * animação e as partes fixas (abas, seletor de tarefa) não são recriadas,
 * para não atrapalhar quem está clicando.
 *
 * props: { codigo, conexao, onErro }
 */
export class SalaPainel extends Component {
  render() {
    this.aba = 'aovivo';
    this.tarefaVista = null;
    this.cronometro = new Cronometro({ conexao: this.props.conexao, grande: true });
    this.cronometro.montar();

    this.cabecalho = h('section', { class: 'cartao painel-cabecalho' });
    this.controles = h('div', { class: 'painel-controles' });
    this.abas = h('div');
    this.conteudo = h('div', { class: 'painel-conteudo' });
    return h('div', { class: 'painel-sala' }, this.cabecalho, this.controles, this.abas, this.conteudo);
  }

  destruir() {
    this.cronometro.destruir();
    super.destruir();
  }

  definir(estado) {
    this.estado = estado;
    if (this.quadro) return;
    // Com uma lista de seleção aberta, redesenhar a fecharia: espera o professor escolher
    const ativo = document.activeElement;
    if (ativo && ativo.tagName === 'SELECT' && this.el.contains(ativo)) {
      this.quadro = 'adiado';
      const soltar = () => this.quadro === 'adiado' && this.desenhar();
      ativo.addEventListener('blur', soltar, { once: true });
      setTimeout(soltar, 10000); // garantia, caso o blur não aconteça
      return;
    }
    this.quadro = requestAnimationFrame(() => {
      this.quadro = null;
      this.desenhar();
    });
  }

  async acao(acao, dados = {}) {
    try {
      await this.props.conexao.pedir('prof:acao', { codigo: this.props.codigo, acao, ...dados });
    } catch (erro) {
      this.emitir('Erro', erro.message);
    }
  }

  // ------------------------------------------------------------ desenho

  desenhar() {
    if (this.quadro === 'adiado') this.quadro = null;
    if (!this.el || !this.estado) return;
    const { sala } = this.estado;
    this.cronometro.definir(sala);
    this.desenharCabecalho();
    this.desenharControles();

    const abas = new Tabs({
      abas: [
        { id: 'aovivo', rotulo: '📡 Respostas ao vivo' },
        { id: 'alunos', rotulo: '🧑‍🔬 Alunos', contador: sala.totalAlunos },
        { id: 'ranking', rotulo: '🏆 Ranking' },
      ],
      ativa: this.aba,
      onTrocar: (id) => {
        this.aba = id;
        this.desenhar();
      },
    });
    this.abas.replaceChildren(abas.montar());

    const conteudo = {
      aovivo: () => this.abaAoVivo(),
      alunos: () => this.abaAlunos(),
      ranking: () => this.abaRanking(),
    }[this.aba]();
    this.conteudo.replaceChildren(conteudo);
  }

  desenharCabecalho() {
    const { sala } = this.estado;
    const linkAlunos = `${location.origin}/laboratorio?sala=${sala.codigo}`;
    const tarefaAtual = sala.modo === 'rodadas' && sala.indice >= 0 ? `Tarefa ${sala.indice + 1} de ${sala.totalTarefas}` : `${sala.totalTarefas} tarefas`;
    this.cabecalho.replaceChildren(
      h('div', { class: 'painel-codigo' }, h('span', { text: 'Código da sala' }), h('strong', { text: sala.codigo })),
      h(
        'div',
        { class: 'painel-info' },
        h('span', { class: `fase-badge fase-${sala.fase}` }, sala.pausada ? '⏸️ Pausada' : FASES[sala.fase]),
        h('span', { text: `${sala.tema.icone} ${sala.tema.nome} · ${sala.modo === 'rodadas' ? '🔁 Rodadas' : '🧭 Livre'} · ${tarefaAtual}${sala.partida > 1 ? ` · Partida ${sala.partida}` : ''}` }),
        h('span', { text: `🟢 ${sala.conectados} online · ${sala.totalAlunos} na sala` }),
        h(
          'div',
          { class: 'painel-links' },
          h('a', { class: 'btn btn-escuro btn-pequeno', href: `/laboratorio/telao/${sala.codigo}`, target: '_blank', rel: 'noopener', text: '📺 Abrir telão' }),
          h('button', {
            type: 'button',
            class: 'btn btn-contorno btn-pequeno',
            text: '📋 Copiar link dos alunos',
            onClick: () => navigator.clipboard.writeText(linkAlunos).then(() => Toast.sucesso('Link copiado!'), () => Toast.mostrar(linkAlunos)),
          })
        )
      ),
      this.cronometro.el
    );
  }

  desenharControles() {
    const { sala } = this.estado;
    const botao = (texto, classe, onClick, extras = {}) => h('button', { type: 'button', class: `btn ${classe}`, onClick, ...extras }, texto);
    const grupo = [];
    const ultima = sala.indice + 1 >= sala.totalTarefas;

    if (sala.fase === 'espera') grupo.push(botao('▶️ Iniciar partida', 'btn-primario btn-grande', () => this.acao('iniciar')));
    if (sala.fase === 'tarefa') {
      grupo.push(botao('⏹️ Encerrar tarefa agora', 'btn-escuro', () => this.acao('encerrarTarefa')));
      grupo.push(botao('➕ 1 minuto', 'btn-contorno', () => this.acao('maisTempo', { segundos: 60 })));
    }
    if (sala.fase === 'parcial') {
      grupo.push(ultima ? botao('🏁 Mostrar resultado final', 'btn-primario btn-grande', () => this.acao('finalizar')) : botao('⏭️ Próxima tarefa', 'btn-primario btn-grande', () => this.acao('proxima')));
    }
    if (sala.fase === 'tarefa' || sala.fase === 'livre') {
      grupo.push(sala.pausada ? botao('▶️ Retomar', 'btn-primario', () => this.acao('retomar')) : botao('⏸️ Pausar', 'btn-contorno', () => this.acao('pausar')));
    }
    if (sala.fase !== 'espera' && sala.fase !== 'final' && !(sala.fase === 'parcial' && ultima)) {
      grupo.push(botao('🏁 Finalizar partida', 'btn-contorno', () => this.confirmarFinalizar()));
    }
    if (sala.fase === 'final') grupo.push(botao('🔁 Nova partida com perguntas novas', 'btn-primario btn-grande', () => this.novaPartida()));

    const extras = [botao('⬇️ Exportar CSV', 'btn-contorno', () => this.exportar())];
    this.controles.replaceChildren(h('div', { class: 'painel-controles-principal' }, grupo), h('div', { class: 'painel-controles-extra' }, extras));
  }

  async confirmarFinalizar() {
    const ok = await ConfirmDialog.perguntar({
      titulo: 'Finalizar a partida?',
      mensagem: 'Ninguém poderá mais responder e o telão mostra o pódio.',
      textoConfirmar: 'Finalizar',
    });
    if (ok) this.acao('finalizar');
  }

  async novaPartida() {
    const { sala } = this.estado;
    const ok = await ConfirmDialog.perguntar({
      titulo: 'Começar uma nova partida?',
      mensagem: `Os alunos continuam na sala, os pontos voltam a zero e são sorteadas ${sala.totalTarefas} perguntas que esta sala ainda não viu (${sala.tema.nome}). Exporte o CSV antes se quiser guardar o resultado desta partida.`,
      textoConfirmar: 'Nova partida',
    });
    if (!ok) return;
    try {
      const { recomecou } = await this.props.conexao.pedir('prof:novaPartida', { codigo: this.props.codigo });
      if (recomecou) Toast.mostrar('As perguntas novas desse tema acabaram: a lista recomeçou pelas que saíram há mais tempo.', { duracao: 6000 });
      else Toast.sucesso('Nova partida pronta! Clique em Iniciar quando a turma estiver pronta.');
    } catch (erro) {
      this.emitir('Erro', erro.message);
    }
  }

  // ------------------------------------------------------------ dados derivados

  tarefasLiberadas() {
    const { sala, tarefas } = this.estado;
    if (sala.fase === 'espera') return [];
    if (sala.modo === 'rodadas') return tarefas.slice(0, sala.indice + 1);
    return tarefas;
  }

  // ------------------------------------------------------------ aba: respostas ao vivo

  abaAoVivo() {
    const liberadas = this.tarefasLiberadas();
    if (!liberadas.length) {
      return h('div', { class: 'estado-vazio' }, h('span', { class: 'estado-vazio-icone', text: '⏳' }), h('strong', { text: 'A partida ainda não começou' }), h('p', { text: 'Quando os alunos começarem, as respostas aparecem aqui em tempo real.' }));
    }
    const { sala } = this.estado;
    // Segue a tarefa atual nas rodadas, a não ser que o professor tenha escolhido outra
    const padrao = sala.modo === 'rodadas' ? liberadas[liberadas.length - 1].id : liberadas[0].id;
    if (padrao !== this.ultimaAtual) {
      this.ultimaAtual = padrao;
      this.seguirAtual = true; // tarefa nova liberada: volta a acompanhar a atual
    }
    if (!liberadas.some((t) => t.id === this.tarefaVista) || (sala.modo === 'rodadas' && this.seguirAtual !== false && this.tarefaVista !== padrao)) {
      this.tarefaVista = padrao;
    }
    const tarefa = liberadas.find((t) => t.id === this.tarefaVista);

    const seletor = h(
      'select',
      {
        class: 'campo seletor-tarefa',
        'aria-label': 'Tarefa',
        onChange: (e) => {
          this.tarefaVista = e.target.value;
          this.seguirAtual = this.tarefaVista === padrao;
          this.desenhar();
        },
      },
      liberadas.map((t) => h('option', { value: t.id, selected: t.id === tarefa.id, text: `Tarefa ${this.estado.tarefas.indexOf(t) + 1}: ${t.titulo}` }))
    );

    const alunos = this.estado.alunos.map((a) => ({ aluno: a, r: a.respostas[tarefa.id] || {} }));
    const contagem = Object.fromEntries(LETRAS.slice(0, tarefa.opcoes.length).map((l) => [l, 0]));
    for (const { r } of alunos) if (r.resposta) contagem[r.resposta] += 1;
    const responderam = alunos.filter(({ r }) => r.resposta).length;
    const acertaram = alunos.filter(({ r }) => r.acertou).length;

    // Quem respondeu primeiro aparece em cima; depois quem ainda não respondeu
    alunos.sort((a, b) => {
      const peso = (x) => (x.r.resposta ? 0 : 1);
      return peso(a) - peso(b) || (a.r.respondidaEm ?? 0) - (b.r.respondidaEm ?? 0) || a.aluno.nome.localeCompare(b.aluno.nome, 'pt-BR');
    });

    const correta = LETRAS.indexOf(tarefa.correta);
    return h(
      'div',
      { class: 'aovivo' },
      h(
        'div',
        { class: 'cartao aovivo-tarefa' },
        h('div', { class: 'aovivo-topo' }, seletor, h('span', { class: 'aovivo-contagem', text: `🔍 ${responderam} de ${alunos.length} responderam · 🎯 ${acertaram} ${acertaram === 1 ? 'acertou' : 'acertaram'}` })),
        h('p', { class: 'aovivo-instrucao' }, textoComTeclas(tarefa.instrucao)),
        h(
          'div',
          { class: 'aovivo-apostas' },
          tarefa.opcoes.map((texto, i) =>
            h(
              'div',
              { class: `aposta-barra${i === correta ? ' correta' : ''}` },
              h('span', { class: 'opcao-letra', 'data-letra': LETRAS[i], text: LETRAS[i].toUpperCase() }),
              h('span', { class: 'aposta-barra-texto', text: texto }),
              h('strong', { class: 'aposta-barra-n', text: String(contagem[LETRAS[i]]) })
            )
          )
        ),
        h('p', { class: 'texto-suave', text: 'Cada aluno vê as opções embaralhadas: as letras acima são as do cadastro da tarefa.' }),
        tarefa.notaProfessor && h('p', { class: 'nota-professor' }, h('strong', { text: '📌 Nota para você: ' }), tarefa.notaProfessor)
      ),
      h('ul', { class: 'registros-lista' }, alunos.map(({ aluno, r }) => this.linhaResposta(aluno, tarefa, r)))
    );
  }

  linhaResposta(aluno, tarefa, r) {
    let status;
    if (r.resposta && r.acertou) status = `${r.ordem < 3 ? `${MEDALHAS[r.ordem]} ` : ''}${r.ordem + 1}º a acertar · ${formatarDuracao(r.tempoMs)} · +${r.pontos ? r.pontos.total : 0} pts`;
    else if (r.resposta) status = `${formatarDuracao(r.tempoMs)} · +${r.pontos ? r.pontos.total : 0} pts`;
    else status = '⏳ Ainda não respondeu';

    return h(
      'li',
      { class: `registro-item${r.resposta ? '' : ' registro-pendente'}` },
      h(
        'div',
        { class: 'registro-cabeca' },
        h('span', { class: `ponto-online${aluno.conectado ? ' on' : ''}`, title: aluno.conectado ? 'Online' : 'Desconectado' }),
        h('strong', { text: aluno.nome }),
        r.resposta && h('span', { class: `aposta-chip ${r.acertou ? 'certa' : 'errada'}` }, `${r.resposta.toUpperCase()} ${r.acertou ? '✓ acertou' : '✗ errou'}`),
        h('span', { class: 'registro-status', text: status })
      )
    );
  }

  // ------------------------------------------------------------ aba: alunos

  abaAlunos() {
    const { alunos, ranking } = this.estado;
    if (!alunos.length) {
      return h('div', { class: 'estado-vazio' }, h('span', { class: 'estado-vazio-icone', text: '🧑‍🔬' }), h('strong', { text: 'Ninguém entrou ainda' }), h('p', { text: `Peça para a turma abrir ${location.host}/laboratorio e digitar o código ${this.estado.sala.codigo}.` }));
    }
    const porId = new Map(ranking.map((r) => [r.id, r]));
    const ordenados = [...alunos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return h(
      'div',
      { class: 'cartao tabela-wrap' },
      h(
        'table',
        { class: 'tabela-lab' },
        h('thead', {}, h('tr', {}, ['', 'Nome', 'Pontos', 'Tarefas', 'Entrou', ''].map((t) => h('th', { text: t })))),
        h(
          'tbody',
          {},
          ordenados.map((a) => {
            const r = porId.get(a.id);
            return h(
              'tr',
              {},
              h('td', {}, h('span', { class: `ponto-online${a.conectado ? ' on' : ''}`, title: a.conectado ? 'Online' : 'Desconectado' })),
              h('td', {}, h('strong', { text: a.nome })),
              h('td', { text: String(r.pontos) }),
              h('td', { text: `${r.respondidas}/${this.estado.tarefas.length}` }),
              h('td', { class: 'texto-suave', text: formatarDataHora(a.entrouEm) }),
              h(
                'td',
                { class: 'acoes-linha' },
                h('button', { type: 'button', class: 'btn-mini', text: '✏️ Renomear', onClick: () => this.renomear(a) }),
                h('button', { type: 'button', class: 'btn-mini btn-mini-perigo', text: '🚫 Expulsar', onClick: () => this.expulsar(a) })
              )
            );
          })
        )
      )
    );
  }

  renomear(aluno) {
    const dialogo = new Modal({ classe: 'modal-pequeno', onFechar: () => setTimeout(() => dialogo.destruir(), 0) });
    dialogo.montar(document.body);
    const campo = h('input', { type: 'text', maxlength: 20, value: aluno.nome, 'aria-label': 'Novo nome' });
    const erro = h('div', { class: 'erro-msg', role: 'alert' });
    const salvar = async () => {
      try {
        await this.props.conexao.pedir('prof:acao', { codigo: this.props.codigo, acao: 'renomear', alunoId: aluno.id, nome: campo.value });
        dialogo.fechar();
      } catch (e) {
        erro.textContent = e.message;
        erro.classList.add('mostrar');
      }
    };
    campo.addEventListener('keydown', (e) => e.key === 'Enter' && salvar());
    dialogo.definirCabecalho(h('h2', { text: `Renomear ${aluno.nome}` }));
    dialogo.definirCorpo(h('div', { class: 'form-renomear' }, campo, erro));
    dialogo.definirRodape(
      h('button', { type: 'button', class: 'btn btn-contorno', text: 'Cancelar', onClick: () => dialogo.fechar() }),
      h('button', { type: 'button', class: 'btn btn-primario', text: 'Salvar', onClick: salvar })
    );
    dialogo.abrir();
    campo.select();
  }

  async expulsar(aluno) {
    const ok = await ConfirmDialog.perguntar({
      titulo: `Expulsar ${aluno.nome}?`,
      mensagem: 'O aluno sai da sala e perde os pontos. Ele pode entrar de novo com outro nome.',
      textoConfirmar: 'Expulsar',
      perigoso: true,
    });
    if (ok) this.acao('expulsar', { alunoId: aluno.id });
  }

  // ------------------------------------------------------------ aba: ranking

  abaRanking() {
    const { ranking } = this.estado;
    if (!ranking.length) return h('div', { class: 'estado-vazio' }, h('span', { class: 'estado-vazio-icone', text: '🏆' }), h('strong', { text: 'Sem alunos ainda' }));
    return h(
      'div',
      { class: 'cartao tabela-wrap' },
      h(
        'table',
        { class: 'tabela-lab' },
        h('thead', {}, h('tr', {}, ['#', 'Nome', 'Pontos', 'Acertos', 'Respondidas', 'Tempo total'].map((t) => h('th', { text: t })))),
        h(
          'tbody',
          {},
          ranking.map((r) =>
            h(
              'tr',
              { class: r.posicao <= 3 ? 'linha-podio' : '' },
              h('td', { text: r.posicao <= 3 ? MEDALHAS[r.posicao - 1] : `${r.posicao}º` }),
              h('td', {}, h('strong', { text: r.nome })),
              h('td', { text: String(r.pontos) }),
              h('td', { text: String(r.acertos) }),
              h('td', { text: String(r.respondidas) }),
              h('td', { text: formatarDuracao(r.tempoTotalMs) })
            )
          )
        )
      ),
      h('p', { class: 'texto-suave legenda', text: 'Desempate: mais acertos, depois menor tempo total.' })
    );
  }

  exportar() {
    const { sala, ranking } = this.estado;
    const data = new Date().toISOString().slice(0, 10);
    baixarCsv(
      `laboratorio-${sala.codigo}-${data}.csv`,
      ['Posição', 'Nome', 'Pontos', 'Acertos', 'Tarefas respondidas', 'Tempo total (s)', 'Tempo total'],
      ranking.map((r) => [r.posicao, r.nome, r.pontos, r.acertos, r.respondidas, Math.round(r.tempoTotalMs / 1000), formatarDuracao(r.tempoTotalMs)])
    );
  }
}
