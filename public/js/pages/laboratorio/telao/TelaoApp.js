import { h } from '../../../core/dom.js';
import { Conexao, ErroPedido } from '../Conexao.js';
import { Cronometro, RankingAnimado, podio, atalho, textoComTeclas, avisoConexao } from '../comum.js';

/**
 * Telão para projetar (/laboratorio/telao/CODIGO). Não tem controles: só
 * acompanha a sala. Mostra o código, a tarefa atual, o cronômetro, quantos
 * já concluíram, o ranking ao vivo (animado quando alguém sobe) e, no fim,
 * o pódio. As respostas criativas aparecem por cima quando o professor manda.
 */
export class TelaoApp {
  constructor(raiz) {
    this.raiz = raiz;
    this.codigo = decodeURIComponent(location.pathname.split('/').filter(Boolean)[2] || '').toUpperCase();
    this.enderecoAlunos = `${location.host}/laboratorio`;
  }

  iniciar() {
    if (!/^[A-Z]{4}$/.test(this.codigo)) return this.pedirCodigo();

    this.conexao = new Conexao();
    this.conexao
      .on('connect', () => this.assistir())
      .on('estado', (estado) => this.desenhar(estado))
      .on('sala-fechada', () => this.mensagem('👋', 'Sala encerrada', 'Obrigado pela aula! Até o próximo experimento.'));

    this.cronometro = new Cronometro({ conexao: this.conexao, grande: true });
    this.cronometro.montar();
    this.ranking = new RankingAnimado({ limite: 10 });
    this.principal = h('section', { class: 'telao-principal' });
    this.lateral = h(
      'aside',
      { class: 'telao-lateral cartao' },
      h('h2', { class: 'telao-lateral-titulo', text: '🏆 Ranking ao vivo' }),
      this.ranking.montar(),
      (this.rankingVazio = h('p', { class: 'telao-vazio', text: 'O ranking aparece quando a turma entrar.' }))
    );
    this.sobreposicao = h('div', { class: 'telao-sobreposicao', hidden: true });

    this.raiz.replaceChildren(
      avisoConexao(this.conexao),
      h(
        'div',
        { class: 'telao' },
        h(
          'header',
          { class: 'telao-topo' },
          h('div', { class: 'telao-marca' }, h('span', { 'aria-hidden': 'true', text: '🧪' }), 'Laboratório de Experimentos'),
          h('div', { class: 'telao-entre' }, 'Entre em ', h('strong', { text: this.enderecoAlunos })),
          h('div', { class: 'telao-codigo' }, h('span', { text: 'Código' }), h('strong', { text: this.codigo }))
        ),
        h('div', { class: 'telao-grade' }, this.principal, this.lateral),
        this.sobreposicao
      ),
      h('button', { type: 'button', class: 'telao-tela-cheia', title: 'Tela cheia (F)', onClick: () => this.alternarTelaCheia() }, '⛶')
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'f' || e.key === 'F') this.alternarTelaCheia();
    });
    this.principal.replaceChildren(h('p', { class: 'carregando', text: 'Conectando à sala...' }));
  }

  async assistir() {
    try {
      const { estado } = await this.conexao.pedir('telao:assistir', { codigo: this.codigo });
      this.desenhar(estado);
    } catch (erro) {
      if (erro instanceof ErroPedido) this.mensagem('🔎', 'Sala não encontrada', `Confira o código ${this.codigo} no painel do professor.`);
    }
  }

  alternarTelaCheia() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  pedirCodigo() {
    const campo = h('input', { type: 'text', maxlength: 4, class: 'campo-codigo', placeholder: 'ABCD', 'aria-label': 'Código da sala' });
    const form = h(
      'form',
      { class: 'cartao entrada-card' },
      h('div', { class: 'entrada-emoji', 'aria-hidden': 'true', text: '📺' }),
      h('h1', { text: 'Telão do Laboratório' }),
      h('p', { class: 'entrada-texto', text: 'Digite o código da sala para projetar.' }),
      campo,
      h('button', { type: 'submit', class: 'btn btn-primario btn-grande btn-bloco', text: 'Abrir telão' })
    );
    campo.addEventListener('input', () => {
      campo.value = campo.value.toUpperCase().replace(/[^A-Z]/g, '');
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (campo.value.length === 4) location.href = `/laboratorio/telao/${campo.value}`;
    });
    this.raiz.replaceChildren(h('main', { class: 'entrada telao-sem-sala' }, form));
    campo.focus();
  }

  mensagem(icone, titulo, texto) {
    this.raiz.replaceChildren(
      h('main', { class: 'entrada telao-sem-sala' }, h('div', { class: 'cartao entrada-card' }, h('div', { class: 'entrada-emoji', text: icone }), h('h1', { text: titulo }), h('p', { class: 'entrada-texto', text: texto })))
    );
  }

  // ------------------------------------------------------------ desenho

  desenhar(estado) {
    if (!estado || !this.principal) return;
    const { sala, ranking } = estado;
    this.cronometro.definir(sala);
    this.ranking.definir(ranking);
    this.rankingVazio.hidden = ranking.length > 0;
    this.lateral.hidden = sala.fase === 'final';

    const cena = {
      espera: () => this.cenaEspera(estado),
      tarefa: () => this.cenaTarefa(estado),
      parcial: () => this.cenaParcial(estado),
      livre: () => this.cenaLivre(estado),
      final: () => this.cenaFinal(estado),
    }[sala.fase];
    // O cronômetro é o mesmo elemento em todas as cenas (não pisca ao redesenhar)
    this.principal.replaceChildren(...[].concat(cena()));
    this.principal.classList.toggle('telao-principal-final', sala.fase === 'final');
    this.desenharSobreposicao(estado);
  }

  cenaEspera({ sala, ranking }) {
    return [
      h(
        'div',
        { class: 'telao-bloco telao-espera cartao' },
        h('span', { class: 'telao-etiqueta', text: 'Prepare-se!' }),
        h('h1', { class: 'telao-titulo-gigante', text: 'Entre na sala' }),
        h('p', { class: 'telao-passo' }, '1. Abra ', h('strong', { text: this.enderecoAlunos })),
        h('p', { class: 'telao-passo' }, '2. Digite o código ', h('strong', { class: 'telao-codigo-inline', text: sala.codigo })),
        h('p', { class: 'telao-passo', text: '3. Escreva seu nome e aguarde' }),
        h('p', { class: 'telao-contagem', text: `🧑‍🔬 ${sala.totalAlunos} ${sala.totalAlunos === 1 ? 'aluno entrou' : 'alunos entraram'}` })
      ),
      ranking.length > 0 && h('div', { class: 'telao-nomes' }, ranking.map((r) => h('span', { class: 'telao-nome-chip', text: r.nome }))),
    ];
  }

  barraConcluiram(sala) {
    const total = Math.max(sala.conectados, sala.concluiram || 0);
    const pct = total ? Math.round(((sala.concluiram || 0) / total) * 100) : 0;
    return h(
      'div',
      { class: 'telao-concluiram' },
      h('div', { class: 'telao-concluiram-texto' }, h('strong', { text: `${sala.concluiram || 0} de ${total}` }), ' já concluíram'),
      h('div', { class: 'telao-barra' }, h('span', { style: { width: `${pct}%` } }))
    );
  }

  cenaTarefa({ sala, tarefa }) {
    return [
      h(
        'div',
        { class: 'telao-bloco cartao telao-tarefa' },
        h('div', { class: 'telao-tarefa-topo' }, h('span', { class: 'telao-etiqueta', text: `Tarefa ${tarefa.numero} de ${sala.totalTarefas}` }), this.cronometro.el),
        h('h1', { class: 'telao-titulo-gigante', text: tarefa.titulo }),
        tarefa.teclas.length > 0 && h('div', { class: 'telao-atalhos' }, tarefa.teclas.map((combo) => atalho(combo))),
        h('p', { class: 'telao-instrucao' }, textoComTeclas(tarefa.instrucao)),
        h('p', { class: 'telao-lembrete', text: '🎯 Aposte primeiro, depois faça e registre!' })
      ),
      this.barraConcluiram(sala),
    ];
  }

  cenaParcial({ sala, tarefa }) {
    const ultima = sala.indice + 1 >= sala.totalTarefas;
    return [
      h(
        'div',
        { class: 'telao-bloco cartao telao-parcial' },
        h('span', { class: 'telao-etiqueta', text: `Tarefa ${tarefa.numero} encerrada` }),
        h('h1', { class: 'telao-titulo-gigante', text: '🏁 Ranking parcial' }),
        h('p', { class: 'telao-instrucao', text: `${tarefa.titulo}: ${sala.concluiram} ${sala.concluiram === 1 ? 'aluno concluiu' : 'alunos concluíram'}.` }),
        h('p', { class: 'telao-lembrete', text: ultima ? 'Foi a última tarefa! O resultado final vem aí...' : 'Prepare-se para a próxima tarefa!' })
      ),
    ];
  }

  cenaLivre({ sala, progresso }) {
    const total = Math.max(1, sala.conectados);
    return [
      h(
        'div',
        { class: 'telao-bloco cartao telao-livre' },
        h('span', { class: 'telao-etiqueta', text: 'Modo livre' }),
        h('h1', { class: 'telao-titulo-gigante', text: 'Cada um no seu ritmo!' }),
        h(
          'ol',
          { class: 'telao-progresso' },
          progresso.map((p, i) =>
            h(
              'li',
              {},
              h('span', { class: 'telao-progresso-nome', text: `${i + 1}. ${p.titulo}` }),
              h('span', { class: 'telao-barra' }, h('span', { style: { width: `${Math.min(100, Math.round((p.concluiram / total) * 100))}%` } })),
              h('strong', { text: String(p.concluiram) })
            )
          )
        )
      ),
    ];
  }

  cenaFinal({ ranking }) {
    return [
      h(
        'div',
        { class: 'telao-bloco telao-final' },
        h('h1', { class: 'telao-titulo-gigante', text: '🎉 Grandes cientistas da turma!' }),
        podio(ranking),
        ranking.length > 3 && h('p', { class: 'telao-lembrete', text: `Parabéns a todos os ${ranking.length} cientistas! Veja sua posição no seu computador.` })
      ),
    ];
  }

  desenharSobreposicao({ sala, destaques }) {
    if (destaques.length) {
      this.sobreposicao.replaceChildren(
        h(
          'div',
          { class: 'telao-destaques' },
          h('h2', { text: '✨ Respostas mais criativas' }),
          h(
            'div',
            { class: 'telao-destaques-lista' },
            destaques.map((d) =>
              h('figure', { class: 'telao-destaque cartao' }, h('blockquote', { text: `"${d.registro}"` }), h('figcaption', {}, h('strong', { text: d.nome }), ` · ${d.tarefa}`))
            )
          )
        )
      );
      this.sobreposicao.hidden = false;
    } else if (sala.pausada) {
      this.sobreposicao.replaceChildren(h('div', { class: 'telao-pausa' }, h('span', { 'aria-hidden': 'true', text: '⏸️' }), h('strong', { text: 'Partida pausada' }), h('p', { text: 'Olhos aqui na frente!' })));
      this.sobreposicao.hidden = false;
    } else {
      this.sobreposicao.hidden = true;
    }
  }
}
