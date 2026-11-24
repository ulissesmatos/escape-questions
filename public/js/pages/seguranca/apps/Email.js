import { h } from '../../../core/dom.js';
import { Janela } from '../../word/sistema/Janela.js';
import { icone } from '../../word/sistema/icones.js';
import { MenuDeContexto } from '../../word/sistema/MenuDeContexto.js';
import { dominioDe } from '../regras/enderecos.js';

const PASTAS = [
  { id: 'entrada', nome: 'Caixa de Entrada', icone: 'mail_inbox' },
  { id: 'lixo', nome: 'Lixo Eletrônico', icone: 'mail_warning' },
  { id: 'excluidos', nome: 'Itens Excluídos', icone: 'delete' },
];

const iniciais = (nome) =>
  String(nome || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

/** Cor do avatar a partir do nome (como no Outlook: sempre a mesma para a mesma pessoa) */
function corDoAvatar(nome) {
  const cores = ['#0f6cbd', '#8764b8', '#c239b3', '#038387', '#ca5010', '#498205', '#986f0b', '#4f6bed'];
  let soma = 0;
  for (const letra of String(nome)) soma += letra.charCodeAt(0);
  return cores[soma % cores.length];
}

/**
 * Programa de Email (no estilo do Outlook do Windows 11): pastas, lista de
 * mensagens e o painel de leitura.
 *
 * O que o aluno aprende aqui:
 * - clicar no nome de quem enviou mostra o endereço de verdade;
 * - parar o mouse num link mostra, embaixo, para onde ele leva de verdade
 *   (o texto azul pode mentir);
 * - Relatar › Relatar phishing tira o golpe da Caixa de Entrada; se errar,
 *   o Lixo Eletrônico tem "Não é lixo eletrônico".
 *
 * Corpo das mensagens: lista de parágrafos; [[chave]] vira o link
 * email.links[chave] = { texto, url }.
 */
export class Email {
  constructor(sim) {
    this.sim = sim;
    this.mundo = sim.mundo;
    this.pasta = 'entrada';
    this.aberto = null;
    this.mostrandoEndereco = false;
    this.linksVistos = new Set();
    this.janela = new Janela(sim, { app: 'email', titulo: 'Email', icone: 'img:mail-48-color', largura: 960, altura: 590, minLargura: 620, classe: 'janela-email' });
    this.ferramentas = h('div', { class: 'email-ferramentas' });
    this.nav = h('nav', { class: 'email-pastas', 'aria-label': 'Pastas' });
    this.lista = h('div', { class: 'email-lista', role: 'listbox' });
    this.leitura = h('section', { class: 'email-leitura' });
    this.status = h('div', { class: 'email-status', hidden: true });
    this.janela.conteudo.append(
      this.ferramentas,
      h('div', { class: 'email-corpo' }, this.nav, this.lista, h('div', { class: 'email-leitura-caixa' }, this.leitura, this.status))
    );
    this.pararDeOuvir = this.mundo.aoMudar(() => this.desenhar());
    this.janela.aoFechar = () => this.pararDeOuvir();
    this.desenhar();
  }

  get emailAberto() {
    const e = this.aberto ? this.mundo.email(this.aberto) : null;
    return e && e.pasta === this.pasta ? e : null;
  }

  emitir(evento) {
    this.sim.emitir({ tipo: 'email', app: 'email', ...evento });
  }

  // ================= desenho =================

  desenhar() {
    this.desenharFerramentas();
    this.desenharPastas();
    this.desenharLista();
    this.desenharLeitura();
    const naoLidos = this.mundo.emailsDaPasta('entrada').filter((e) => !e.lido).length;
    this.janela.definirTitulo(naoLidos ? `Caixa de Entrada (${naoLidos}) - Email` : 'Caixa de Entrada - Email');
  }

  botao(rotulo, nomeIcone, alvo, acao, { desabilitado = false, perigo = false } = {}) {
    return h(
      'button',
      { type: 'button', class: `email-ferramenta${perigo ? ' perigo' : ''}`, 'data-alvo': alvo, disabled: desabilitado, onClick: (e) => acao(e.currentTarget) },
      icone(nomeIcone, { tamanho: 18 }),
      h('span', { text: rotulo })
    );
  }

  desenharFerramentas() {
    const e = this.emailAberto;
    const nada = !e;
    const itens = [
      this.botao('Novo email', 'add', 'email.acao.novo', () => this.novoEmail()),
      h('span', { class: 'email-sep' }),
      this.botao('Excluir', 'delete', 'email.acao.excluir', () => this.excluir(e), { desabilitado: nada || e.pasta === 'excluidos' }),
    ];
    if (e?.pasta === 'lixo') itens.push(this.botao('Não é lixo eletrônico', 'mail_inbox', 'email.acao.naoELixo', () => this.naoELixo(e)));
    else itens.push(this.botao('Relatar', 'flag', 'email.acao.relatar', (b) => this.menuRelatar(b, e), { desabilitado: nada }));
    itens.push(
      this.botao('Bloquear', 'prohibited', 'email.acao.bloquear', () => this.bloquear(e), { desabilitado: nada || e.bloqueado }),
      h('span', { class: 'email-sep' }),
      this.botao('Responder', 'arrow_reply', 'email.acao.responder', () => this.responder(e), { desabilitado: nada })
    );
    this.ferramentas.replaceChildren(...itens);
  }

  desenharPastas() {
    this.nav.replaceChildren(
      h('div', { class: 'email-conta' }, icone('img:mail-48-color', { tamanho: 22 }), h('span', { text: this.mundo.conta.email })),
      ...PASTAS.map((p) => {
        const qtd = this.mundo.emailsDaPasta(p.id).filter((e) => p.id !== 'entrada' || !e.lido).length;
        return h(
          'button',
          { type: 'button', class: `email-pasta${p.id === this.pasta ? ' ativa' : ''}`, 'data-alvo': `email.pasta.${p.id}`, onClick: () => this.irPara(p.id) },
          icone(p.icone, { tamanho: 18 }),
          h('span', { text: p.nome }),
          qtd ? h('small', { text: String(qtd) }) : null
        );
      })
    );
  }

  desenharLista() {
    const emails = this.mundo.emailsDaPasta(this.pasta);
    const nome = PASTAS.find((p) => p.id === this.pasta).nome;
    this.lista.replaceChildren(
      h('h2', { class: 'email-lista-titulo', text: nome }),
      ...(emails.length
        ? emails.map((e) =>
            h(
              'button',
              {
                type: 'button',
                class: `email-item${e.lido ? '' : ' nao-lido'}${e.id === this.aberto ? ' selecionado' : ''}`,
                'data-alvo': `email.item.${e.id}`,
                role: 'option',
                onClick: () => this.abrir(e.id),
              },
              h('span', { class: 'email-avatar', style: { background: corDoAvatar(e.de.nome) }, text: iniciais(e.de.nome) }),
              h(
                'span',
                { class: 'email-item-texto' },
                h('span', { class: 'email-item-linha' }, h('strong', { text: e.de.nome }), h('small', { text: e.data || '' })),
                h('span', { class: 'email-item-assunto' }, e.anexos.length ? icone('attach', { tamanho: 14 }) : null, h('span', { text: e.assunto })),
                h('span', { class: 'email-item-previa', text: previa(e) })
              )
            )
          )
        : [h('p', { class: 'email-vazio', text: this.pasta === 'entrada' ? 'Tudo em dia! Nenhuma mensagem aqui.' : 'Nada por aqui.' })])
    );
  }

  desenharLeitura() {
    const e = this.emailAberto;
    if (!e) {
      this.leitura.replaceChildren(h('div', { class: 'email-nada' }, icone('img:mail-48-color', { tamanho: 64 }), h('p', { text: 'Selecione um item para ler' })));
      return;
    }
    const remetente = h(
      'button',
      { type: 'button', class: `email-remetente${this.mostrandoEndereco ? ' aberto' : ''}`, 'data-alvo': 'email.remetente', title: 'Clique para ver o endereço de quem enviou', onClick: () => this.alternarEndereco(e) },
      h('strong', { text: e.de.nome }),
      this.mostrandoEndereco ? h('span', { class: 'email-endereco', text: `<${e.de.endereco}>` }) : icone('chevron_down', { tamanho: 14 })
    );
    // (replaceChildren escreveria "null" no lugar dos itens que não existem)
    this.leitura.replaceChildren(...[
      h('h1', { class: 'email-assunto', text: e.assunto }),
      e.pasta === 'lixo' && e.denunciado ? h('p', { class: 'email-faixa perigo' }, icone('flag', { tamanho: 16 }), 'Você denunciou esta mensagem como phishing. Ela fica aqui no Lixo Eletrônico.') : null,
      e.bloqueado ? h('p', { class: 'email-faixa' }, icone('prohibited', { tamanho: 16 }), `Remetente bloqueado: as próximas mensagens de ${e.de.endereco} vão direto para o Lixo Eletrônico.`) : null,
      h(
        'header',
        { class: 'email-cabecalho' },
        h('span', { class: 'email-avatar grande', style: { background: corDoAvatar(e.de.nome) }, text: iniciais(e.de.nome) }),
        h(
          'div',
          { class: 'email-cabecalho-texto' },
          remetente,
          this.mostrandoEndereco ? h('small', { class: 'email-endereco-dica', text: `Este é o endereço de verdade. O nome (${e.de.nome}) qualquer um pode escrever; o endereço termina em ${dominioDe(e.de.endereco.split('@')[1] || '')}.` }) : null,
          h('small', { text: `Para: ${this.mundo.conta.email}` })
        ),
        h('small', { class: 'email-data', text: e.data || '' })
      ),
      h('div', { class: 'email-mensagem' }, ...(e.corpo || []).map((p) => this.paragrafo(p, e))),
      e.anexos.length ? h('div', { class: 'email-anexos' }, e.anexos.map((a) => this.anexo(a, e))) : null,
      e.pasta === 'entrada' ? h('div', { class: 'email-rodape-acoes' }, this.botao('Responder', 'arrow_reply', 'email.rodape.responder', () => this.responder(e))) : null,
    ].filter(Boolean));
  }

  paragrafo(texto, e) {
    const p = h('p', {});
    for (const pedaco of String(texto).split(/(\[\[[a-z0-9-]+\]\])/)) {
      const chave = pedaco.match(/^\[\[([a-z0-9-]+)\]\]$/)?.[1];
      if (!chave) {
        if (pedaco) p.append(pedaco);
        continue;
      }
      const link = e.links?.[chave];
      if (!link) continue;
      const a = h('a', { class: link.botao ? 'email-link-botao' : 'email-link', href: '#', 'data-alvo': `email.link.${chave}`, text: link.texto });
      a.addEventListener('pointerenter', () => this.verLink(e, chave, link));
      a.addEventListener('pointerleave', () => (this.status.hidden = true));
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        this.clicarLink(e, chave, link);
      });
      p.append(a);
    }
    return p;
  }

  anexo(anexo, e) {
    return h(
      'button',
      { type: 'button', class: 'email-anexo', 'data-alvo': `email.anexo.${anexo.nome}`, onClick: () => this.abrirAnexo(anexo, e) },
      icone(anexo.icone || 'img:document-48-color', { tamanho: 28 }),
      h('span', {}, h('strong', { text: anexo.nome }), h('small', { text: anexo.tamanho || '84 KB' }))
    );
  }

  // ================= ações =================

  irPara(pasta) {
    this.pasta = pasta;
    if (!this.emailAberto) this.aberto = null;
    this.mostrandoEndereco = false;
    this.desenhar();
    this.emitir({ acao: 'pasta', pasta, marco: `email:pasta:${pasta}` });
  }

  abrir(id) {
    const e = this.mundo.email(id);
    if (!e) return;
    this.aberto = id;
    this.mostrandoEndereco = false;
    this.status.hidden = true;
    e.lido = true;
    this.mundo.mudou();
    this.emitir({ acao: 'abrir', email: id, marco: `email:abrir:${id}` });
  }

  alternarEndereco(e) {
    this.mostrandoEndereco = !this.mostrandoEndereco;
    this.desenharLeitura();
    if (this.mostrandoEndereco) this.emitir({ acao: 'remetente', email: e.id, endereco: e.de.endereco, marco: `email:remetente:${e.id}` });
  }

  verLink(e, chave, link) {
    this.status.textContent = `https://${link.url}`;
    this.status.hidden = false;
    // conta uma vez por link (o mouse passa várias vezes)
    if (this.linksVistos.has(`${e.id}:${chave}`)) return;
    this.linksVistos.add(`${e.id}:${chave}`);
    this.emitir({ acao: 'ver-link', email: e.id, link: chave, url: link.url, marcos: [`email:link-visto:${e.id}`, `email:link-visto:${e.id}:${chave}`] });
  }

  clicarLink(e, chave, link) {
    this.status.hidden = true;
    const falso = Boolean(e.phishing);
    this.emitir({ acao: 'clicar-link', email: e.id, link: chave, url: link.url, falso, deslize: falso, marco: `email:clicou:${e.id}` });
    const navegador = this.sim.abrirApp('edge', { via: 'email' });
    navegador?.navegar(link.url, { via: 'link' });
  }

  abrirAnexo(anexo, e) {
    this.emitir({ acao: 'anexo', email: e.id, nome: anexo.nome, marco: `email:anexo:${e.id}` });
    const item = { id: `anexo-${e.id}`, nome: anexo.nome, tipo: anexo.tipo, conteudo: anexo.conteudo || {}, pasta: 'Downloads' };
    this.sim.abrirArquivo(item, { via: 'email' });
  }

  menuRelatar(botao, e) {
    MenuDeContexto.abrir({
      ancora: botao,
      raiz: this.sim.el,
      itens: [
        { rotulo: 'Relatar phishing', icone: 'flag', alvo: 'email.relatar.phishing', acao: () => this.denunciar(e) },
        { rotulo: 'Relatar lixo eletrônico', icone: 'mail_warning', alvo: 'email.relatar.lixo', acao: () => this.denunciar(e, { lixo: true }) },
      ],
    });
    this.emitir({ acao: 'menu-relatar', email: e.id });
    this.sim.emitir({ tipo: 'menu', menu: 'email.relatar' });
  }

  denunciar(e, { lixo = false } = {}) {
    e.pasta = 'lixo';
    e.denunciado = true;
    this.aberto = null;
    this.mundo.mudou();
    this.emitir({ acao: 'denunciar', email: e.id, phishing: Boolean(e.phishing), comoLixo: lixo, marco: `email:denunciar:${e.id}` });
  }

  naoELixo(e) {
    e.pasta = 'entrada';
    e.denunciado = false;
    this.mundo.mudou();
    this.emitir({ acao: 'nao-e-lixo', email: e.id, marco: `email:restaurar:${e.id}` });
  }

  excluir(e) {
    e.pasta = 'excluidos';
    this.aberto = null;
    this.mundo.mudou();
    this.emitir({ acao: 'excluir', email: e.id, phishing: Boolean(e.phishing), marco: `email:excluir:${e.id}` });
  }

  bloquear(e) {
    e.bloqueado = true;
    for (const outro of this.mundo.emails) if (outro.de.endereco === e.de.endereco) outro.bloqueado = true;
    this.mundo.mudou();
    this.emitir({ acao: 'bloquear', email: e.id, phishing: Boolean(e.phishing), marco: `email:bloquear:${e.id}` });
  }

  responder(e) {
    this.emitir({ acao: 'responder', email: e.id, phishing: Boolean(e.phishing), deslize: Boolean(e.phishing), marco: `email:responder:${e.id}` });
    if (e.phishing) return;
    this.leitura.querySelector('.email-resposta')?.remove();
    const campo = h('textarea', { class: 'email-resposta-campo', rows: 3, placeholder: 'Escreva sua resposta...', 'data-alvo': 'email.resposta.texto' });
    const caixa = h(
      'div',
      { class: 'email-resposta' },
      h('small', { text: `Para: ${e.de.endereco}` }),
      campo,
      h('div', {}, h('button', { type: 'button', class: 'email-enviar', 'data-alvo': 'email.resposta.enviar', onClick: () => {
        caixa.replaceChildren(h('p', { class: 'email-faixa', text: 'Resposta enviada.' }));
        this.emitir({ acao: 'enviar-resposta', email: e.id, marco: `email:respondeu:${e.id}` });
      } }, icone('send', { tamanho: 16 }), 'Enviar'))
    );
    this.leitura.append(caixa);
    campo.focus();
  }

  novoEmail() {
    this.emitir({ acao: 'novo' });
  }

  // ================= missão =================

  estado() {
    return { pasta: this.pasta, aberto: this.emailAberto?.id || null, mostrandoEndereco: this.mostrandoEndereco };
  }

  /** Mostre-me: o passo é de outro e-mail ou de outra pasta? Leva até lá primeiro. */
  prerequisito(passo, guia) {
    const alvo = passo.alvo || passo.alvos?.[0] || '';
    const id = passo.email || (alvo.startsWith('email.item.') ? alvo.slice('email.item.'.length) : null);
    const e = id ? this.mundo.email(id) : null;
    if (e && e.pasta !== this.pasta) {
      const pasta = PASTAS.find((p) => p.id === e.pasta);
      return guia.apontar(`email.pasta.${e.pasta}`, `O e-mail "${e.assunto}" está em ${pasta.nome}: clique nessa pasta.`);
    }
    if (e && this.aberto !== e.id && !alvo.startsWith('email.item.')) return guia.apontar(`email.item.${e.id}`, `Abra o e-mail "${e.assunto}".`);
    if (alvo.startsWith('email.relatar.')) return guia.apontar('email.acao.relatar', 'Clique em Relatar, na barra de cima.');
    return null;
  }
}

function previa(e) {
  return (e.corpo || [])
    .join(' ')
    .replace(/\[\[([a-z0-9-]+)\]\]/g, (_, chave) => e.links?.[chave]?.texto || '')
    .slice(0, 90);
}
