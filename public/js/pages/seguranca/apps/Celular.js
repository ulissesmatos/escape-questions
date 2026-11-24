import { h } from '../../../core/dom.js';
import { Janela } from '../../word/sistema/Janela.js';
import { icone } from '../../word/sistema/icones.js';
import { MenuDeContexto } from '../../word/sistema/MenuDeContexto.js';

/**
 * Celular do aluno, espelhado no computador (como o "Vincular ao Celular"
 * do Windows): Mensagens (SMS e conversas) e Contatos (para ligar).
 *
 * O que o aluno aprende aqui: desconfiar de número desconhecido, de link em
 * SMS e de pedido de dinheiro ou de código; confirmar ligando para o número
 * que já está nos Contatos; bloquear e denunciar.
 *
 * Mensagens: { de: 'ele' | 'eu', texto, hora }. No texto, [[url]] vira link.
 * Respostas prontas: { id, texto, perigosa, alerta } (a perigosa é deslize).
 */
const TELAS = { inicio: 'Início', conversas: 'Mensagens', conversa: '', contatos: 'Contatos', chamada: '' };

export class Celular {
  constructor(sim) {
    this.sim = sim;
    this.mundo = sim.mundo;
    this.tela = 'conversas';
    this.atual = null; // id da conversa aberta
    this.chamada = null; // { contato, falas mostradas, terminou }
    this.janela = new Janela(sim, { app: 'celular', titulo: 'Celular', icone: 'img:phone-48-color', largura: 380, altura: 640, minLargura: 320, minAltura: 480, classe: 'janela-celular' });
    this.tela_el = h('div', { class: 'cel-tela' });
    this.janela.conteudo.append(h('div', { class: 'cel-moldura' }, h('div', { class: 'cel-status' }, h('span', { text: '9:41' }), h('span', {}, icone('wifi_1', { tamanho: 12 }), icone('battery_10', { tamanho: 12 }))), this.tela_el, this.barraDeBaixo()));
    this.pararDeOuvir = this.mundo.aoMudar(() => this.desenhar());
    this.janela.aoFechar = () => {
      this.pararDeOuvir();
      clearTimeout(this.relogioChamada);
    };
    this.desenhar();
  }

  barraDeBaixo() {
    return h(
      'div',
      { class: 'cel-navegacao' },
      h('button', { type: 'button', 'aria-label': 'Voltar', 'data-alvo': 'cel.voltarBaixo', onClick: () => this.voltar() }, icone('chevron_right', { tamanho: 16, classe: 'cel-girar' })),
      h('button', { type: 'button', 'aria-label': 'Início', 'data-alvo': 'cel.inicio', onClick: () => this.ir('inicio') }, h('span', { class: 'cel-bolinha' })),
      h('button', { type: 'button', 'aria-label': 'Apps recentes', onClick: () => this.ir('conversas') }, icone('square_multiple', { tamanho: 14 }))
    );
  }

  emitir(evento) {
    this.sim.emitir({ tipo: 'celular', app: 'celular', ...evento });
  }

  get conversas() {
    return this.mundo.celular.conversas.filter((c) => !c.excluida);
  }

  // ================= navegação =================

  ir(tela, atual = null) {
    this.tela = tela;
    this.atual = atual;
    this.desenhar();
    this.emitir({ acao: 'tela', tela, marco: `cel:tela:${tela}` });
  }

  voltar() {
    if (this.tela === 'conversa') return this.ir('conversas');
    if (this.tela === 'chamada') return this.encerrarChamada();
    if (this.tela !== 'inicio') return this.ir('inicio');
  }

  abrirConversa(id) {
    const c = this.mundo.conversa(id);
    if (!c) return;
    c.lida = true;
    this.tela = 'conversa';
    this.atual = id;
    this.mundo.mudou();
    this.emitir({ acao: 'abrir-conversa', conversa: id, desconhecido: !c.conhecido, marco: `cel:abrir:${id}` });
  }

  // ================= desenho =================

  desenhar() {
    const tela = { inicio: () => this.telaInicio(), conversas: () => this.telaConversas(), conversa: () => this.telaConversa(), contatos: () => this.telaContatos(), chamada: () => this.telaChamada() }[this.tela];
    this.tela_el.replaceChildren(tela());
    this.tela_el.dataset.tela = this.tela;
    const naoLidas = this.conversas.filter((c) => !c.lida).length;
    this.janela.definirTitulo(naoLidas ? `Celular (${naoLidas} nova${naoLidas > 1 ? 's' : ''})` : 'Celular');
    const balao = this.tela_el.querySelector('.cel-mensagens');
    if (balao) balao.scrollTop = balao.scrollHeight;
  }

  topo(titulo, { voltar = true, extra = null } = {}) {
    return h(
      'header',
      { class: 'cel-topo' },
      voltar ? h('button', { type: 'button', class: 'cel-topo-voltar', 'aria-label': 'Voltar', 'data-alvo': 'cel.voltar', onClick: () => this.voltar() }, icone('arrow_left', { tamanho: 18 })) : null,
      h('div', { class: 'cel-topo-titulo' }, titulo),
      extra
    );
  }

  telaInicio() {
    const naoLidas = this.conversas.filter((c) => !c.lida).length;
    const app = (id, nome, nomeIcone, cor, contador = 0) =>
      h(
        'button',
        { type: 'button', class: 'cel-app', 'data-alvo': `cel.app.${id}`, onClick: () => this.ir(id) },
        h('span', { class: 'cel-app-icone', style: { background: cor } }, icone(nomeIcone, { tamanho: 26 }), contador ? h('small', { text: String(contador) }) : null),
        h('span', { text: nome })
      );
    return h(
      'div',
      { class: 'cel-inicio' },
      h('p', { class: 'cel-hora', text: '9:41' }),
      h('div', { class: 'cel-apps' }, app('conversas', 'Mensagens', 'chat', '#0f6cbd', naoLidas), app('contatos', 'Contatos', 'call', '#13a10e'))
    );
  }

  telaConversas() {
    return h(
      'div',
      { class: 'cel-lista-tela' },
      this.topo('Mensagens', { voltar: false }),
      h(
        'div',
        { class: 'cel-lista' },
        this.conversas.length
          ? this.conversas.map((c) => {
              const ultima = c.mensagens[c.mensagens.length - 1];
              return h(
                'button',
                { type: 'button', class: `cel-item${c.lida ? '' : ' nao-lida'}${c.bloqueado ? ' bloqueada' : ''}`, 'data-alvo': `cel.conversa.${c.id}`, onClick: () => this.abrirConversa(c.id) },
                h('span', { class: `cel-avatar${c.conhecido ? '' : ' desconhecido'}`, style: { background: c.cor || '' } }, c.conhecido ? (c.nome || '?')[0].toUpperCase() : icone('person', { tamanho: 16 })),
                h(
                  'span',
                  { class: 'cel-item-texto' },
                  h('span', { class: 'cel-item-linha' }, h('strong', { text: c.conhecido ? c.nome : c.numero }), h('small', { text: ultima?.hora || '' })),
                  h('span', { class: 'cel-item-previa', text: c.bloqueado ? 'Bloqueado' : textoSemLinks(ultima?.texto || '') })
                )
              );
            })
          : h('p', { class: 'cel-vazio', text: 'Nenhuma conversa.' })
      )
    );
  }

  telaConversa() {
    const c = this.mundo.conversa(this.atual);
    if (!c || c.excluida) {
      this.tela = 'conversas';
      return this.telaConversas();
    }
    const menu = h('button', { type: 'button', class: 'cel-topo-menu', 'aria-label': 'Mais opções', 'data-alvo': 'cel.menu', onClick: (e) => this.menuConversa(e.currentTarget, c) }, icone('more_vertical', { tamanho: 18 }));
    const titulo = h('div', {}, h('strong', { text: c.conhecido ? c.nome : c.numero }), h('small', { text: c.conhecido ? c.numero : 'Número desconhecido (não está nos seus Contatos)' }));
    return h(
      'div',
      { class: 'cel-conversa' },
      this.topo(titulo, { extra: menu }),
      !c.conhecido && !c.bloqueado ? h('p', { class: 'cel-alerta' }, icone('warning', { tamanho: 14 }), 'Este número não está nos seus Contatos. Cuidado com pedidos de dinheiro, códigos ou links.') : null,
      h('div', { class: 'cel-mensagens' }, c.mensagens.map((m, i) => this.balao(m, c, i))),
      c.bloqueado
        ? h('p', { class: 'cel-bloqueado' }, icone('prohibited', { tamanho: 16 }), c.denunciado ? 'Você bloqueou e denunciou este número.' : 'Você bloqueou este número.')
        : h(
            'div',
            { class: 'cel-respostas' },
            (c.respostas || []).filter((r) => !c.respondidas.includes(r.id)).map((r) => h('button', { type: 'button', class: 'cel-resposta', 'data-alvo': `cel.resposta.${r.id}`, text: r.texto, onClick: () => this.responder(c, r) }))
          )
    );
  }

  balao(m, c, i) {
    const p = h('p', { class: `cel-balao ${m.de === 'eu' ? 'meu' : ''}` });
    let n = 0;
    for (const pedaco of String(m.texto).split(/(\[\[[^\]]+\]\])/)) {
      const url = pedaco.match(/^\[\[([^\]]+)\]\]$/)?.[1];
      if (!url) {
        if (pedaco) p.append(pedaco);
        continue;
      }
      const alvo = `cel.link.${i}.${n++}`;
      p.append(h('a', { href: '#', class: 'cel-link', 'data-alvo': alvo, text: url, onClick: (e) => (e.preventDefault(), this.clicarLink(c, url)) }));
    }
    return h('div', { class: `cel-linha ${m.de === 'eu' ? 'minha' : ''}` }, p, h('small', { text: m.hora || '' }));
  }

  telaContatos() {
    return h(
      'div',
      { class: 'cel-lista-tela' },
      this.topo('Contatos'),
      h(
        'div',
        { class: 'cel-lista' },
        this.mundo.celular.contatos.map((ct) =>
          h(
            'div',
            { class: 'cel-contato' },
            h('span', { class: 'cel-avatar', style: { background: ct.cor || '#038387' } }, ct.nome[0].toUpperCase()),
            h('span', { class: 'cel-item-texto' }, h('strong', { text: ct.nome }), h('small', { text: ct.numero })),
            h('button', { type: 'button', class: 'cel-ligar', 'aria-label': `Ligar para ${ct.nome}`, 'data-alvo': `cel.contato.${ct.id}.ligar`, onClick: () => this.ligar(ct) }, icone('call', { tamanho: 18 }))
          )
        )
      )
    );
  }

  telaChamada() {
    const { contato, mostradas, terminou } = this.chamada;
    return h(
      'div',
      { class: 'cel-chamada' },
      h('span', { class: 'cel-avatar enorme', style: { background: contato.cor || '#038387' } }, contato.nome[0].toUpperCase()),
      h('strong', { text: contato.nome }),
      h('small', { text: terminou ? 'Chamada encerrada' : mostradas ? 'Em chamada...' : 'Chamando...' }),
      h('div', { class: 'cel-falas' }, (contato.aoLigar || []).slice(0, mostradas).map((f) => h('p', { class: 'cel-fala', text: `“${f}”` }))),
      h('button', { type: 'button', class: 'cel-encerrar', 'aria-label': 'Encerrar chamada', 'data-alvo': 'cel.encerrar', onClick: () => this.encerrarChamada() }, icone('call', { tamanho: 22 }))
    );
  }

  // ================= ações =================

  menuConversa(botao, c) {
    MenuDeContexto.abrir({
      ancora: botao,
      raiz: this.sim.el,
      itens: [
        { rotulo: c.bloqueado ? 'Desbloquear' : 'Bloquear e denunciar como spam', icone: 'prohibited', alvo: 'cel.menu.bloquear', acao: () => this.bloquear(c) },
        { rotulo: 'Excluir conversa', icone: 'delete', alvo: 'cel.menu.excluir', acao: () => this.excluir(c) },
      ],
    });
    this.emitir({ acao: 'menu', conversa: c.id });
    this.sim.emitir({ tipo: 'menu', menu: 'cel.conversa' });
  }

  bloquear(c) {
    c.bloqueado = !c.bloqueado;
    c.denunciado = c.bloqueado;
    this.mundo.mudou();
    this.emitir({ acao: c.bloqueado ? 'bloquear' : 'desbloquear', conversa: c.id, golpe: Boolean(c.golpe), marco: c.bloqueado ? `cel:bloquear:${c.id}` : null });
  }

  excluir(c) {
    c.excluida = true;
    this.tela = 'conversas';
    this.atual = null;
    this.mundo.mudou();
    this.emitir({ acao: 'excluir', conversa: c.id, marco: `cel:excluir:${c.id}` });
  }

  responder(c, r) {
    c.mensagens.push({ de: 'eu', texto: r.texto, hora: horaAgora() });
    c.respondidas.push(r.id);
    this.mundo.mudou();
    this.emitir({ acao: 'responder', conversa: c.id, resposta: r.id, deslize: Boolean(r.perigosa), alerta: r.alerta || null, marco: `cel:respondeu:${c.id}:${r.id}` });
    if (r.reacao) setTimeout(() => this.mundo.receberMensagem(c.id, { texto: r.reacao }), 1200);
  }

  clicarLink(c, url) {
    this.emitir({ acao: 'clicar-link', conversa: c.id, url, deslize: Boolean(c.golpe), falso: Boolean(c.golpe), marco: `cel:clicou:${c.id}` });
    const navegador = this.sim.abrirApp('edge', { via: 'celular' });
    navegador?.navegar(url, { via: 'link' });
  }

  ligar(contato) {
    clearTimeout(this.relogioChamada);
    this.chamada = { contato, mostradas: 0, terminou: false };
    this.tela = 'chamada';
    this.desenhar();
    this.mundo.celular.ligacoes.push(contato.id);
    this.emitir({ acao: 'ligar', contato: contato.id, marco: `cel:ligar:${contato.id}` });
    const proxima = () => {
      if (!this.chamada || this.chamada.contato !== contato) return;
      if (this.chamada.mostradas >= (contato.aoLigar || []).length) {
        this.chamada.terminou = true;
        this.desenhar();
        this.emitir({ acao: 'ligacao-concluida', contato: contato.id, marco: `cel:ligacao:${contato.id}` });
        return;
      }
      this.chamada.mostradas += 1;
      this.desenhar();
      this.relogioChamada = setTimeout(proxima, 1700);
    };
    this.relogioChamada = setTimeout(proxima, 900);
  }

  encerrarChamada() {
    clearTimeout(this.relogioChamada);
    const contato = this.chamada?.contato;
    // desligar no meio ainda conta: o aluno já ouviu o que precisava
    if (contato && !this.chamada.terminou && this.chamada.mostradas >= (contato.aoLigar || []).length) this.emitir({ acao: 'ligacao-concluida', contato: contato.id, marco: `cel:ligacao:${contato.id}` });
    this.chamada = null;
    this.ir('contatos');
  }

  // ================= missão =================

  estado() {
    return { tela: this.tela, conversa: this.atual };
  }

  /** Mostre-me: leva até a tela certa (Mensagens, a conversa, os Contatos) */
  prerequisito(passo, guia) {
    const alvo = passo.alvo || '';
    const id = passo.conversa || (alvo.startsWith('cel.conversa.') ? alvo.slice('cel.conversa.'.length) : null);
    if (this.tela === 'chamada' && this.chamada && !this.chamada.terminou) {
      return { passo, indice: -1, elemento: null, texto: 'Escute a ligação até o fim...', espera: true, prerequisito: true, obterRetangulo: () => null };
    }
    const irParaLista = () => {
      if (this.tela === 'inicio') return guia.apontar('cel.app.conversas', 'Toque em Mensagens.');
      if (this.tela === 'chamada') return guia.apontar('cel.encerrar', 'A ligação acabou: toque no botão vermelho para encerrar.');
      return guia.apontar('cel.voltar', 'Toque na seta para voltar.');
    };
    if (alvo.startsWith('cel.contato.')) {
      if (this.tela === 'contatos') return null;
      return this.tela === 'inicio' ? guia.apontar('cel.app.contatos', 'Toque em Contatos.') : guia.apontar('cel.inicio', 'Toque no botão de início do celular (a bolinha embaixo).');
    }
    if (id && !(this.tela === 'conversa' && this.atual === id)) {
      if (this.tela === 'conversas') return guia.apontar(`cel.conversa.${id}`, 'Toque na conversa para abrir.');
      return irParaLista();
    }
    if (alvo.startsWith('cel.menu.')) return guia.apontar('cel.menu', 'Toque nos três pontinhos, no alto da conversa.');
    return null;
  }
}

function textoSemLinks(texto) {
  return texto.replace(/\[\[([^\]]+)\]\]/g, '$1');
}

function horaAgora() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
