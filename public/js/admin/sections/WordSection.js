import { h, formatarDataHora, tempoRelativo } from '../../core/dom.js';
import { Modal, ConfirmDialog } from '../../components/Modal.js';
import { Toast, estadoCarregando } from '../../components/ui.js';
import { AdminSection, AdminTab } from './base.js';
import { DataTable } from '../components/DataTable.js';
import { badge, miniBarra, barraFiltros, campoBusca, baixarCsv } from '../components/widgets.js';
import { CAPITULOS, MISSOES } from '../../pages/word/regras/missoes.js';
import { conceito } from '../../pages/word/regras/conceitos.js';

/**
 * Operação Word: o professor acompanha cada @ (missões, estrelas, quanta
 * ajuda pediu, quantas vezes se perdeu e o documento que entregou) e vê
 * em que missão a turma mais trava.
 */
const TITULO = new Map(MISSOES.map((m, i) => [m.id, `${i + 1}. ${m.titulo}`]));
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function tempo(ms) {
  if (!Number.isFinite(ms)) return '—';
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${s % 60}s`;
}

function estrelas(n) {
  return h('span', { class: 'word-estrelas', title: `${n} de 3 estrelas` }, [0, 1, 2].map((i) => h('span', { class: i < n ? 'cheia' : '', text: '★' })));
}

/** Documento entregue, desenhado como no Word (num iframe sem scripts) */
function visualizarDocumento(bruto) {
  let doc;
  try {
    doc = JSON.parse(bruto);
  } catch {
    doc = { html: bruto };
  }
  const paisagem = doc.layout?.orientacao === 'paisagem';
  const cabecalho = doc.cabecalho ? `<div class="cab">${doc.cabecalho}</div>` : '';
  const numero = doc.numeroPagina ? `<div class="num num-${doc.numeroPagina.alinhamento || 'centro'}">1</div>` : '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/css/word-sistema.css">
    <style>
      body { margin: 0; background: #e3e3e3; padding: 20px; font-family: system-ui, sans-serif; }
      .folha { position: relative; width: ${paisagem ? '29.7cm' : '21cm'}; min-height: ${paisagem ? '21cm' : '29.7cm'}; margin: 0 auto; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,.25); padding: 2.5cm 3cm; box-sizing: border-box; }
      .doc-corpo { position: static !important; display: block !important; ${doc.layout?.colunas > 1 ? `column-count: ${doc.layout.colunas};` : ''} }
      .doc-quebra { border-top: 1px dashed #999; margin: 12px 0; }
      .cab { position: absolute; top: 1.25cm; left: 3cm; right: 3cm; font: 11pt Calibri, Carlito, sans-serif; }
      .num { position: absolute; bottom: 1.25cm; left: 3cm; right: 3cm; font: 11pt Calibri, Carlito, sans-serif; text-align: center; }
      .num-direita { text-align: right; } .num-esquerda { text-align: left; }
      .doc-sumario-acoes { display: none; }
    </style></head><body><div class="folha">${cabecalho}<div class="doc-corpo">${doc.html || ''}</div>${numero}</div></body></html>`;
  return h('iframe', { class: 'word-entrega', sandbox: '', title: 'Documento entregue pelo aluno', srcdoc: html });
}

class AlunosTab extends AdminTab {
  async carregar() {
    const [alunos, config] = await Promise.all([this.props.api.get('/word/alunos', { turma: this.turma || '' }), this.props.api.get('/word/config')]);
    return { alunos, config };
  }

  configuracao(config) {
    const chave = h('input', { type: 'checkbox', class: 'interruptor-campo', checked: config.liberarTudo });
    const estado = h('strong', { class: 'interruptor-estado' });
    const explicacao = h('p', { class: 'texto-suave' });
    const mostrar = (ligado) => {
      estado.textContent = ligado ? 'Ligado' : 'Desligado';
      estado.classList.toggle('ligada', ligado);
      explicacao.textContent = ligado
        ? 'Todas as missões estão abertas: os alunos podem ir direto a qualquer assunto (bom para revisar).'
        : 'As missões abrem em ordem: cada uma libera a seguinte quando é concluída.';
    };
    mostrar(config.liberarTudo);
    chave.addEventListener('change', async () => {
      chave.disabled = true;
      try {
        const salvo = await this.props.api.put('/word/config', { liberarTudo: chave.checked });
        mostrar(salvo.liberarTudo);
        Toast.sucesso(salvo.liberarTudo ? 'Todas as missões liberadas.' : 'Missões em ordem.');
      } catch (erro) {
        chave.checked = !chave.checked;
        Toast.erro(erro.message);
      } finally {
        chave.disabled = false;
      }
    });
    return h(
      'div',
      { class: 'cartao resposta-config' },
      h('label', { class: 'interruptor' }, chave, h('span', { class: 'interruptor-trilho', 'aria-hidden': 'true' }), h('span', { class: 'interruptor-rotulo' }, '🔓 Liberar todas as missões ', estado)),
      explicacao
    );
  }

  desenhar({ alunos, config }) {
    if (!this.elementoBusca) {
      this.elementoBusca = campoBusca({
        placeholder: 'Buscar @ ou nome',
        onBuscar: (b) => {
          this.busca = b;
          this.redesenhar();
        },
      });
    }
    const termo = (this.busca || '').replace(/^@/, '');
    const lista = alunos.filter((a) => !termo || a.arroba.includes(termo) || a.nome.toLowerCase().includes(termo));
    return [
      this.configuracao(config),
      barraFiltros(this.filtroTurma(), this.elementoBusca, h('button', { type: 'button', class: 'btn btn-contorno btn-pequeno', text: '⬇️ Exportar CSV', disabled: !lista.length, onClick: () => this.exportar(lista) })),
      h(
        'p',
        { class: 'legenda-admin' },
        'Cada aluno entra só com o ', h('strong', { text: '@' }), ' (sem senha). ',
        h('strong', { text: 'Ajudas' }), ' são as dicas e os "Mostre-me" que ele usou; ',
        h('strong', { text: 'Se perdeu' }), ' conta as vezes em que o sistema percebeu que ele estava perdido (muitas ações sem avançar ou muito tempo parado) e mostrou a pista sozinho.'
      ),
      new DataTable({
        linhas: lista,
        onClicarLinha: (aluno) => this.abrirDetalhe(aluno),
        vazio: { icone: '📝', titulo: 'Nenhum agente ainda', texto: 'Os alunos aparecem aqui quando criarem o @ na Operação Word.' },
        colunas: [
          { titulo: 'Aluno', valor: (a) => h('div', {}, h('strong', { text: `@${a.arroba}` }), h('span', { class: 'texto-suave bloco', text: `${a.nome} · ${a.turma}` })) },
          { titulo: 'Missões', valor: (a) => miniBarra(a.concluidas, MISSOES.length) },
          { titulo: 'Estrelas', valor: (a) => h('strong', { text: `★ ${a.estrelas}` }) },
          { titulo: 'Ajudas', valor: (a) => (a.ajudas ? String(a.ajudas) : badge('Nenhuma', 'sucesso')) },
          { titulo: 'Se perdeu', valor: (a) => (a.perdido ? badge(plural(a.perdido, 'vez', 'vezes'), a.perdido >= 5 ? 'erro' : 'aviso') : '—') },
          { titulo: 'Fazendo agora', valor: (a) => (a.emAndamento ? h('span', { text: TITULO.get(a.emAndamento) || a.emAndamento }) : h('span', { class: 'texto-suave', text: '—' })) },
          { titulo: 'Último acesso', valor: (a) => h('span', { title: formatarDataHora(a.ultimoAcesso), text: tempoRelativo(a.ultimoAcesso) }) },
        ],
      }).montar(),
    ];
  }

  exportar(alunos) {
    baixarCsv(
      'operacao-word-alunos.csv',
      ['@', 'Nome', 'Turma', 'Missões concluídas', 'Estrelas', 'Ajudas', 'Se perdeu', 'Fazendo agora', 'Último acesso'],
      alunos.map((a) => [`@${a.arroba}`, a.nome, a.turma, a.concluidas, a.estrelas, a.ajudas, a.perdido, TITULO.get(a.emAndamento) || '', formatarDataHora(a.ultimoAcesso)])
    );
  }

  async abrirDetalhe(aluno) {
    const dialogo = new Modal({ classe: 'modal-largo', onFechar: () => setTimeout(() => dialogo.destruir(), 0) });
    dialogo.montar(document.body);
    dialogo.definirCabecalho(h('div', {}, h('span', { class: 'modal-etiqueta', text: `${aluno.nome} · ${aluno.turma}` }), h('h2', { text: `@${aluno.arroba}` })));
    dialogo.definirCorpo(estadoCarregando('Carregando missões...'));
    dialogo.definirRodape(
      h('button', { type: 'button', class: 'btn btn-perigo-contorno', text: 'Excluir aluno', onClick: () => this.excluir(aluno, dialogo) }),
      h('button', { type: 'button', class: 'btn btn-perigo-contorno', text: 'Zerar progresso', onClick: () => this.zerar(aluno, dialogo) }),
      h('button', { type: 'button', class: 'btn btn-contorno', text: 'Editar @, nome ou turma', onClick: () => this.editar(aluno, dialogo) }),
      h('button', { type: 'button', class: 'btn btn-primario', text: 'Fechar', onClick: () => dialogo.fechar() })
    );
    dialogo.abrir();
    let detalhe;
    try {
      detalhe = await this.props.api.get(`/word/alunos/${aluno.id}`);
    } catch (erro) {
      dialogo.definirCorpo(h('div', { class: 'erro-msg mostrar', text: erro.message }));
      return;
    }
    const porMissao = new Map(detalhe.missoes.map((m) => [m.missao, m]));
    dialogo.definirCorpo(
      h('div', { class: 'detalhe-resumo' }, miniBarra(aluno.concluidas, MISSOES.length, { rotulo: 'Missões' }), badge(`★ ${aluno.estrelas} estrelas`), badge(`Criado em ${formatarDataHora(detalhe.conta.criadoEm)}`)),
      new DataTable({
        linhas: MISSOES.map((m) => ({ m, p: porMissao.get(m.id) })),
        colunas: [
          { titulo: 'Missão', valor: ({ m }) => h('strong', { text: TITULO.get(m.id) }) },
          { titulo: 'Situação', valor: ({ p }) => (!p ? h('span', { class: 'texto-suave', text: 'Não começou' }) : p.concluidaEm ? badge('Concluída', 'sucesso') : badge('Tentou', 'aviso')) },
          { titulo: 'Estrelas', valor: ({ p }) => (p?.concluidaEm ? estrelas(p.estrelas) : '—') },
          { titulo: 'Tentativas', valor: ({ p }) => (p ? String(p.tentativas) : '—') },
          { titulo: 'Melhor tempo', valor: ({ p }) => tempo(p?.melhorTempoMs) },
          { titulo: 'Ajudas (última vez)', valor: ({ p }) => (p?.concluidaEm ? `${plural(p.dicas, 'dica', 'dicas')} · ${p.mostreMe} Mostre-me` : '—') },
          { titulo: 'Se perdeu', valor: ({ p }) => (p?.perdido ? badge(plural(p.perdido, 'vez', 'vezes'), 'aviso') : '—') },
          { titulo: 'Entrega', valor: ({ m, p }) => (p?.documento ? h('button', { type: 'button', class: 'btn btn-contorno btn-pequeno', text: '📄 Ver documento', onClick: () => this.verDocumento(aluno, m, p) }) : '—') },
        ],
      }).montar()
    );
  }

  verDocumento(aluno, missao, progresso) {
    const dialogo = new Modal({ classe: 'modal-largo modal-documento', onFechar: () => setTimeout(() => dialogo.destruir(), 0) });
    dialogo.montar(document.body);
    dialogo.definirCabecalho(h('div', {}, h('span', { class: 'modal-etiqueta', text: `@${aluno.arroba} · ${formatarDataHora(progresso.concluidaEm)}` }), h('h2', { text: TITULO.get(missao.id) })));
    dialogo.definirCorpo(visualizarDocumento(progresso.documento));
    dialogo.definirRodape(h('button', { type: 'button', class: 'btn btn-primario', text: 'Fechar', onClick: () => dialogo.fechar() }));
    dialogo.abrir();
  }

  editar(aluno, detalhe) {
    const campo = (rotulo, valor, max) => {
      const entrada = h('input', { type: 'text', value: valor, maxlength: max });
      return { entrada, el: h('div', { class: 'campo-admin' }, h('label', { text: rotulo }, entrada)) };
    };
    const arroba = campo('@ (sem o símbolo)', aluno.arroba, 20);
    const nome = campo('Nome', aluno.nome, 40);
    const turma = campo('Turma', aluno.turma, 30);
    const erro = h('div', { class: 'erro-msg', role: 'alert' });
    const dialogo = new Modal({ classe: 'modal-pequeno', onFechar: () => setTimeout(() => dialogo.destruir(), 0) });
    dialogo.montar(document.body);
    dialogo.definirCabecalho(h('h2', { text: `Editar @${aluno.arroba}` }));
    dialogo.definirCorpo(arroba.el, nome.el, turma.el, h('p', { class: 'texto-suave', text: 'Se mudar o @, avise o aluno: ele vai entrar com o @ novo.' }), erro);
    dialogo.definirRodape(
      h('button', { type: 'button', class: 'btn btn-contorno', text: 'Cancelar', onClick: () => dialogo.fechar() }),
      h('button', {
        type: 'button',
        class: 'btn btn-primario',
        text: 'Salvar',
        onClick: async () => {
          try {
            await this.props.api.patch(`/word/alunos/${aluno.id}`, { arroba: arroba.entrada.value, nome: nome.entrada.value, turma: turma.entrada.value });
            Toast.sucesso('Aluno atualizado.');
            dialogo.fechar();
            detalhe.fechar();
            this.recarregar();
          } catch (falha) {
            erro.textContent = falha.message;
            erro.classList.add('mostrar');
          }
        },
      })
    );
    dialogo.abrir();
  }

  async zerar(aluno, dialogo) {
    const ok = await ConfirmDialog.perguntar({ titulo: 'Zerar progresso?', mensagem: `As missões, estrelas e documentos de @${aluno.arroba} serão apagados. O @ continua valendo.`, textoConfirmar: 'Zerar progresso', perigoso: true });
    if (!ok) return;
    try {
      await this.props.api.delete(`/word/alunos/${aluno.id}/progresso`);
      Toast.sucesso('Progresso zerado.');
      dialogo.fechar();
      this.recarregar();
    } catch (erro) {
      Toast.erro(erro.message);
    }
  }

  async excluir(aluno, dialogo) {
    const ok = await ConfirmDialog.perguntar({ titulo: 'Excluir aluno?', mensagem: `O @${aluno.arroba} e todo o progresso serão apagados. O @ fica livre para outra pessoa usar.`, textoConfirmar: 'Excluir', perigoso: true });
    if (!ok) return;
    try {
      await this.props.api.delete(`/word/alunos/${aluno.id}`);
      Toast.sucesso('Aluno excluído.');
      dialogo.fechar();
      this.recarregar();
    } catch (erro) {
      Toast.erro(erro.message);
    }
  }
}

class MissoesTab extends AdminTab {
  async carregar() {
    return this.props.api.get('/word/missoes', { turma: this.turma || '' });
  }

  desenhar(estatisticas) {
    const porMissao = new Map(estatisticas.map((e) => [e.missao, e]));
    return [
      barraFiltros(this.filtroTurma(), h('a', { class: 'btn btn-contorno btn-pequeno', href: 'word.html?tudo', target: '_blank', rel: 'noopener', text: 'Abrir a Operação Word ↗' })),
      h(
        'p',
        { class: 'legenda-admin' },
        'Use para ver onde a turma trava: missões com ', h('strong', { text: 'muita ajuda' }), ' ou ', h('strong', { text: 'muitos alunos perdidos' }), ' são bons assuntos para explicar no quadro. ',
        'Com "word.html?tudo" todas as missões ficam abertas para você conhecer (crie um @ seu).'
      ),
      ...CAPITULOS.map((cap) =>
        h(
          'section',
          { class: 'resposta-mundo' },
          h('h2', { class: 'resposta-mundo-titulo', text: `Capítulo ${cap.numero}: ${cap.titulo}` }),
          h('p', { class: 'texto-suave', text: cap.descricao }),
          h('div', { class: 'word-missoes-grade' }, MISSOES.filter((m) => m.capitulo === cap.numero).map((m) => this.cartao(m, porMissao.get(m.id))))
        )
      ),
    ];
  }

  cartao(missao, e) {
    const objetivos = missao.objetivos({ arroba: 'aluno' });
    const perdidos = e && e.iniciaram ? Math.round((e.sePerderam / e.iniciaram) * 100) : 0;
    return h(
      'article',
      { class: 'cartao word-missao-cartao' },
      h('header', { class: 'resposta-cabecalho' }, h('span', { class: 'resposta-numero', text: String(MISSOES.indexOf(missao) + 1) }), h('h3', { text: missao.titulo }), missao.tutorial && badge('Guiada')),
      h('div', { class: 'resposta-chips' }, missao.conceitos.map((id) => h('span', { class: 'resposta-chip', text: conceito(id).titulo }))),
      h('ol', { class: 'word-objetivos' }, objetivos.map((o) => h('li', { text: o.texto }))),
      e
        ? h(
            'div',
            { class: 'word-missao-numeros' },
            miniBarra(e.concluiram, e.iniciaram, { rotulo: 'Concluíram' }),
            badge(`★ ${String(e.estrelas).replace('.', ',')} em média`),
            badge(`${String(e.ajudas).replace('.', ',')} ajudas em média`, e.ajudas >= 3 ? 'aviso' : ''),
            badge(`${perdidos}% se perderam`, perdidos >= 40 ? 'erro' : perdidos >= 20 ? 'aviso' : 'sucesso'),
            e.tempoMedioMs ? badge(`⏱ ${tempo(e.tempoMedioMs)}`) : null
          )
        : h('p', { class: 'texto-suave', text: 'Ninguém começou esta missão ainda.' })
    );
  }
}

export class WordSection extends AdminSection {
  static id = 'word';
  static titulo = 'Operação Word';
  static icone = '📝';
  static descricao = 'Cada @, as missões, quanta ajuda precisou e o documento que entregou.';
  static abas = [
    { id: 'alunos', rotulo: 'Alunos', Classe: AlunosTab },
    { id: 'missoes', rotulo: 'Missões', Classe: MissoesTab },
  ];
}
