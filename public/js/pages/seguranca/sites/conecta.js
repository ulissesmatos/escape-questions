import { h } from '../../../core/dom.js';
import { icone } from '../../word/sistema/icones.js';
import { MenuDeContexto } from '../../word/sistema/MenuDeContexto.js';
import { interruptor } from './comum.js';
import { dadosPessoais } from '../regras/privacidade.js';

/**
 * Conecta: uma rede social inventada (conecta.com.br). Páginas pelo
 * caminho do endereço: perfil, editar, privacidade, amigos, mensagens.
 */
const PAGINAS = [
  { id: 'perfil', nome: 'Meu perfil', icone: 'person' },
  { id: 'editar', nome: 'Editar perfil', icone: 'edit' },
  { id: 'privacidade', nome: 'Privacidade', icone: 'lock_closed' },
  { id: 'amigos', nome: 'Amigos', icone: 'people' },
  { id: 'mensagens', nome: 'Mensagens', icone: 'chat' },
];

const avatar = (nome, cor = '#e3008c', classe = '') => h('span', { class: `conecta-avatar ${classe}`.trim(), style: { background: cor }, text: String(nome || '?').replace(/[^\p{L}]/gu, '')[0]?.toUpperCase() || '?' });

export const CONECTA = {
  id: 'conecta',
  hosts: ['conecta.com.br'],
  titulo: 'Conecta',
  cor: '#e3008c',
  letra: 'C',
  render(ctx) {
    const pagina = PAGINAS.find((p) => p.id === ctx.caminho.split('/')[0]) || PAGINAS[0];
    const { mundo } = ctx;
    const pendentes = mundo.conecta.pedidos.filter((p) => p.estado === 'pendente').length;
    const naoLidas = mundo.conecta.conversas.filter((c) => !c.lida && !c.bloqueado).length;
    return h(
      'div',
      { class: 'conecta' },
      h('header', { class: 'conecta-topo' }, h('strong', { class: 'conecta-marca', text: 'conecta' }), h('span', { class: 'conecta-busca' }, icone('search', { tamanho: 14 }), 'Pesquisar')),
      h(
        'div',
        { class: 'conecta-corpo' },
        h(
          'nav',
          { class: 'conecta-menu' },
          PAGINAS.map((p) =>
            h(
              'button',
              { type: 'button', class: `conecta-menu-item${p === pagina ? ' ativo' : ''}`, 'data-alvo': `site.conecta.menu.${p.id}`, onClick: () => ctx.ir(`conecta.com.br/${p.id}`) },
              icone(p.icone, { tamanho: 18 }),
              h('span', { text: p.nome }),
              p.id === 'amigos' && pendentes ? h('small', { text: String(pendentes) }) : null,
              p.id === 'mensagens' && naoLidas ? h('small', { text: String(naoLidas) }) : null
            )
          )
        ),
        h('main', { class: 'conecta-principal' }, PAGINAS_RENDER[pagina.id](ctx))
      )
    );
  },
  prerequisito(passo, guia) {
    const pagina = passo.alvo.match(/^site\.conecta\.(perfil|editar|bio|salvar|privado|localizacao|mensagensDeQualquerUm|pedido|amigo|conversa)/)?.[1];
    const precisa = { bio: 'editar', salvar: 'editar', editar: 'editar', privado: 'privacidade', localizacao: 'privacidade', mensagensDeQualquerUm: 'privacidade', pedido: 'amigos', amigo: 'amigos', conversa: 'mensagens', perfil: 'perfil' }[pagina];
    const atual = guia.sim.apps.edge.host === 'conecta.com.br' ? guia.sim.apps.edge.url.split('/')[1] || 'perfil' : null;
    if (precisa && atual !== precisa) {
      const nome = PAGINAS.find((p) => p.id === precisa).nome;
      return guia.apontar(`site.conecta.menu.${precisa}`, `Clique em ${nome}, no menu da esquerda da Conecta.`);
    }
    if (passo.alvo.endsWith('.mais') === false && /^site\.conecta\.pedido\.[^.]+\.(denunciar|bloquear)$/.test(passo.alvo)) {
      const id = passo.alvo.split('.')[3];
      return guia.apontar(`site.conecta.pedido.${id}.mais`, 'Clique nos três pontinhos (⋯) do pedido para ver mais opções.');
    }
    return null;
  },
};

// ---------------- páginas ----------------

const PAGINAS_RENDER = {
  perfil(ctx) {
    const { perfil, privacidade, amigos } = ctx.mundo.conecta;
    return h(
      'div',
      { class: 'conecta-perfil' },
      h('div', { class: 'conecta-capa' }),
      h(
        'div',
        { class: 'conecta-perfil-topo' },
        avatar(perfil.nome, '#e3008c', 'grande'),
        h('div', {}, h('h1', { text: perfil.nome }), h('p', { class: 'conecta-usuario', text: `@${perfil.usuario}` }), h('p', { class: 'conecta-visibilidade' }, icone(privacidade.privado ? 'lock_closed' : 'globe', { tamanho: 14 }), privacidade.privado ? 'Conta privada: só seus amigos veem suas publicações' : 'Conta pública: qualquer pessoa na internet vê tudo'))
      ),
      h('p', { class: 'conecta-bio', text: perfil.bio || 'Sem bio.' }),
      h('p', { class: 'conecta-numeros', text: `${amigos.length} amigos` }),
      h('h2', { text: 'Publicações' }),
      ...(ctx.mundo.conecta.publicacoes || []).map((p) =>
        h(
          'article',
          { class: 'conecta-post' },
          h('div', { class: 'conecta-post-topo' }, avatar(perfil.nome, '#e3008c'), h('div', {}, h('strong', { text: perfil.nome }), privacidade.localizacao && p.local ? h('small', {}, icone('location', { tamanho: 12 }), p.local) : h('small', { text: p.quando }))),
          h('p', { text: p.texto }),
          h('div', { class: 'conecta-post-foto', style: `--matiz: ${p.matiz || '200deg'}` })
        )
      )
    );
  },

  editar(ctx) {
    const { perfil } = ctx.mundo.conecta;
    const bio = h('textarea', { class: 'conecta-bio-campo', rows: 4, 'data-alvo': 'site.conecta.bio', maxlength: 200 });
    bio.value = perfil.bio;
    const alertas = h('ul', { class: 'conecta-alertas' });
    const atualizar = () => {
      const achados = dadosPessoais(bio.value);
      alertas.replaceChildren(...achados.map((d) => h('li', {}, icone('warning', { tamanho: 14 }), `Parece ${d.descricao}: "${d.trecho}"`)));
    };
    bio.addEventListener('keydown', (e) => e.stopPropagation());
    bio.addEventListener('input', atualizar);
    atualizar();
    const salvo = h('p', { class: 'postal-mensagem ok', hidden: true, text: 'Perfil salvo!' });
    return h(
      'div',
      { class: 'conecta-pagina' },
      h('h1', { text: 'Editar perfil' }),
      h('label', { class: 'site-rotulo' }, h('span', { text: 'Bio (aparece para quem visita o seu perfil)' }), bio),
      alertas,
      h('p', { class: 'conecta-dica', text: 'Fale do que você gosta, não de onde você está: endereço, telefone e escola ajudam um estranho a te encontrar.' }),
      h('button', {
        type: 'button',
        class: 'site-botao',
        'data-alvo': 'site.conecta.salvar',
        text: 'Salvar',
        onClick: () => {
          perfil.bio = bio.value.trim();
          salvo.hidden = false;
          ctx.emitir({ acao: 'salvar-perfil', dados: dadosPessoais(perfil.bio).map((d) => d.tipo), marco: 'conecta:perfil-salvo' });
          ctx.mundo.mudou();
        },
      }),
      salvo
    );
  },

  privacidade(ctx) {
    const p = ctx.mundo.conecta.privacidade;
    const mudar = (chave) => (valor) => {
      p[chave] = valor;
      ctx.emitir({ acao: 'privacidade', chave, valor, marco: `conecta:${chave}:${valor ? 'ligado' : 'desligado'}` });
      ctx.mundo.mudou();
    };
    return h(
      'div',
      { class: 'conecta-pagina' },
      h('h1', { text: 'Privacidade' }),
      interruptor('Conta privada', p.privado, { alvo: 'site.conecta.privado', explicacao: 'Só as pessoas que você aceitou como amigas veem suas fotos e publicações.', aoMudar: mudar('privado') }),
      interruptor('Mostrar minha localização nas publicações', p.localizacao, { alvo: 'site.conecta.localizacao', explicacao: 'Coloca o lugar onde você estava em cada foto (rua, escola, casa).', aoMudar: mudar('localizacao') }),
      interruptor('Receber mensagens de qualquer pessoa', p.mensagensDeQualquerUm, { alvo: 'site.conecta.mensagensDeQualquerUm', explicacao: 'Desligado: só amigos podem mandar mensagem.', aoMudar: mudar('mensagensDeQualquerUm') })
    );
  },

  amigos(ctx) {
    const { mundo } = ctx;
    const pendentes = mundo.conecta.pedidos.filter((p) => p.estado === 'pendente');
    return h(
      'div',
      { class: 'conecta-pagina' },
      h('h1', { text: 'Pedidos de amizade' }),
      pendentes.length ? h('div', { class: 'conecta-pedidos' }, pendentes.map((p) => cartaoPedido(ctx, p))) : h('p', { class: 'conecta-vazio', text: 'Nenhum pedido pendente.' }),
      h('h2', { text: `Seus amigos (${mundo.conecta.amigos.length})` }),
      h(
        'div',
        { class: 'conecta-amigos' },
        mundo.conecta.amigos.map((a) => {
          const pedido = mundo.pedido(a.id);
          // aceitou sem querer? dá para desfazer (o pedido volta para a lista)
          const desfazer = pedido
            ? h('button', { type: 'button', class: 'conecta-desfazer', 'data-alvo': `site.conecta.amigo.${a.id}.remover`, text: 'Desfazer amizade', onClick: () => {
                pedido.estado = 'pendente';
                mundo.conecta.amigos = mundo.conecta.amigos.filter((x) => x !== a);
                ctx.emitir({ acao: 'desfazer-amizade', pedido: a.id });
                mundo.mudou();
              } })
            : null;
          return h('div', { class: 'conecta-amigo', 'data-alvo': `site.conecta.amigo.${a.id}` }, avatar(a.nome, a.cor), h('span', {}, h('strong', { text: a.nome }), h('small', { text: a.info || '' })), desfazer);
        })
      )
    );
  },

  mensagens(ctx) {
    const { mundo } = ctx;
    const conversas = mundo.conecta.conversas.filter((c) => !c.bloqueado);
    const bloqueadas = mundo.conecta.conversas.filter((c) => c.bloqueado);
    return h(
      'div',
      { class: 'conecta-pagina' },
      h('h1', { text: 'Mensagens' }),
      ...conversas.map((c) => {
        if (!c.lida) {
          c.lida = true;
          ctx.emitir({ acao: 'ler-mensagem', conversa: c.id, marco: `conecta:leu:${c.id}` });
        }
        return h(
          'article',
          { class: 'conecta-conversa' },
          h('header', {}, avatar(c.nome, c.cor || '#5c2e91'), h('div', {}, h('strong', { text: c.nome }), h('small', { text: c.info || '' }))),
          h('div', { class: 'conecta-balões' }, c.mensagens.map((m) => h('p', { class: `conecta-balao ${m.de === 'eu' ? 'meu' : ''}`, text: m.texto }))),
          h(
            'div',
            { class: 'conecta-conversa-acoes' },
            h('button', { type: 'button', class: 'site-botao perigo', 'data-alvo': `site.conecta.conversa.${c.id}.bloquear`, onClick: () => {
              c.bloqueado = true;
              c.denunciado = true;
              ctx.emitir({ acao: 'bloquear-conversa', conversa: c.id, marco: `conecta:bloqueou:${c.id}` });
              mundo.mudou();
            } }, icone('prohibited', { tamanho: 16 }), 'Bloquear e denunciar'),
            ...(c.respostas || []).map((r) =>
              h('button', { type: 'button', class: 'site-botao contorno', 'data-alvo': `site.conecta.conversa.${c.id}.resposta.${r.id}`, text: r.texto, onClick: () => {
                c.mensagens.push({ de: 'eu', texto: r.texto });
                c.respondidas = [...(c.respondidas || []), r.id];
                ctx.emitir({ acao: 'responder', conversa: c.id, resposta: r.id, deslize: Boolean(r.perigosa), alerta: r.alerta || null, marco: `conecta:respondeu:${c.id}:${r.id}` });
                mundo.mudou();
              } })
            )
          )
        );
      }),
      !conversas.length ? h('p', { class: 'conecta-vazio', text: 'Nenhuma conversa.' }) : null,
      bloqueadas.length ? h('p', { class: 'conecta-bloqueados', text: `Bloqueados: ${bloqueadas.map((c) => c.nome).join(', ')}` }) : null
    );
  },
};

function cartaoPedido(ctx, p) {
  const { mundo } = ctx;
  const decidir = (estado, extra = {}) => {
    p.estado = estado;
    Object.assign(p, extra);
    if (estado === 'aceito') mundo.conecta.amigos.push({ id: p.id, nome: p.nome, cor: p.cor, info: p.info, falso: p.falso, estranho: p.estranho });
    ctx.emitir({ acao: 'pedido', pedido: p.id, estado, ...extra, deslize: estado === 'aceito' && Boolean(p.falso || p.estranho), marco: `conecta:pedido:${p.id}:${estado}` });
    mundo.mudou();
  };
  const mais = (e) => {
    MenuDeContexto.abrir({
      ancora: e.currentTarget,
      raiz: ctx.sim.el,
      itens: [
        { rotulo: 'Denunciar perfil falso', icone: 'flag', alvo: `site.conecta.pedido.${p.id}.denunciar`, acao: () => decidir('recusado', { denunciado: true }) },
        { rotulo: 'Bloquear', icone: 'prohibited', alvo: `site.conecta.pedido.${p.id}.bloquear`, acao: () => decidir('recusado', { bloqueado: true }) },
      ],
    });
    ctx.emitir({ acao: 'menu-pedido', pedido: p.id });
  };
  return h(
    'div',
    { class: 'conecta-pedido', 'data-alvo': `site.conecta.pedido.${p.id}` },
    avatar(p.nome, p.cor, 'medio'),
    h('div', { class: 'conecta-pedido-texto' }, h('strong', { text: p.nome }), h('small', { text: p.info }), h('small', { class: p.amigosEmComum ? '' : 'alerta', text: `${p.amigosEmComum} amigos em comum` })),
    h(
      'div',
      { class: 'conecta-pedido-acoes' },
      h('button', { type: 'button', class: 'site-botao', 'data-alvo': `site.conecta.pedido.${p.id}.aceitar`, text: 'Aceitar', onClick: () => decidir('aceito') }),
      h('button', { type: 'button', class: 'site-botao contorno', 'data-alvo': `site.conecta.pedido.${p.id}.recusar`, text: 'Recusar', onClick: () => decidir('recusado') }),
      h('button', { type: 'button', class: 'site-botao contorno icone-so', 'data-alvo': `site.conecta.pedido.${p.id}.mais`, title: 'Mais opções', onClick: mais }, icone('more_horizontal', { tamanho: 16 }))
    )
  );
}
