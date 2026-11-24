import { h } from '../../../core/dom.js';
import { icone } from '../../word/sistema/icones.js';
import { MenuDeContexto } from '../../word/sistema/MenuDeContexto.js';
import { formularioFalso } from './comum.js';

/**
 * Pixel Arena: um site de jogo (inventado) com um anúncio enganoso de
 * "gemas grátis". O anúncio tem um X grande falso (faz parte da imagem e
 * leva ao golpe); o jeito certo é o ⓘ do anúncio (Denunciar anúncio) e o
 * "Fechar anúncio" pequeno do cantinho.
 */
export const PIXEL = {
  id: 'pixel',
  hosts: ['pixelarena.com.br'],
  titulo: 'Pixel Arena - Jogue grátis',
  cor: '#8764b8',
  letra: 'P',
  render(ctx) {
    const { mundo } = ctx;
    const jogos = ['Corrida Pixel', 'Castelo Mágico', 'Futebol 8 bits', 'Mundo dos Blocos', 'Nave Estelar', 'Quebra-cabeça'];
    const pagina = h(
      'div',
      { class: 'pixel' },
      h('header', { class: 'pixel-topo' }, h('strong', { class: 'pixel-marca', text: 'PIXEL ARENA' }), h('nav', {}, ['Jogos', 'Ranking', 'Loja de gemas', 'Ajuda'].map((t) => h('span', { text: t })))),
      h(
        'div',
        { class: 'pixel-conteudo' },
        h('h1', { text: 'Jogos em destaque' }),
        h('div', { class: 'pixel-jogos' }, jogos.map((j, i) => h('div', { class: 'pixel-jogo', style: `--matiz: ${i * 55}deg` }, h('span', { class: 'pixel-capa' }), h('strong', { text: j })))),
        h('p', { class: 'pixel-aviso', text: 'Gemas só são compradas na Loja de gemas oficial. A equipe Pixel Arena nunca pede a sua senha.' })
      )
    );
    if (mundo.pixel.anuncio) pagina.append(anuncio(ctx));
    return pagina;
  },
};

function anuncio(ctx) {
  const { mundo } = ctx;
  const golpe = () => {
    ctx.emitir({ acao: 'clicar-anuncio', deslize: true, marco: 'web:clicou-anuncio' });
    ctx.ir('gemas-gratis.click/resgatar');
  };
  const info = h('button', {
    type: 'button',
    class: 'anuncio-info',
    'data-alvo': 'site.anuncio.info',
    title: 'Opções do anúncio',
    onClick: (e) => {
      MenuDeContexto.abrir({
        ancora: e.currentTarget,
        raiz: ctx.sim.el,
        itens: [
          {
            rotulo: 'Denunciar anúncio',
            icone: 'flag',
            alvo: 'site.anuncio.denunciar',
            acao: () => {
              mundo.pixel.denunciado = true;
              mundo.web.anunciosDenunciados.push('gemas');
              ctx.emitir({ acao: 'denunciar-anuncio', marco: 'web:anuncio-denunciado' });
              mundo.mudou();
            },
          },
          { rotulo: 'Por que estou vendo este anúncio?', icone: 'info', acao: () => ctx.emitir({ acao: 'por-que-anuncio' }) },
        ],
      });
      ctx.emitir({ acao: 'menu-anuncio' });
    },
  }, icone('info', { tamanho: 12 }));
  const fechar = h('button', {
    type: 'button',
    class: 'anuncio-fechar',
    'data-alvo': 'site.anuncio.fechar',
    onClick: () => {
      mundo.pixel.anuncio = false;
      ctx.emitir({ acao: 'fechar-anuncio', marco: 'web:anuncio-fechado' });
      mundo.mudou();
    },
  }, 'Fechar anúncio ', icone('dismiss', { tamanho: 10 }));
  return h(
    'div',
    { class: 'anuncio-fundo' },
    h(
      'div',
      { class: 'anuncio' },
      h('div', { class: 'anuncio-controles' }, mundo.pixel.denunciado ? h('span', { class: 'anuncio-denunciado', text: 'Anúncio denunciado ✓' }) : null, info, fechar),
      h(
        'div',
        { class: 'anuncio-arte', 'data-alvo': 'site.anuncio.arte', onClick: golpe },
        h('span', { class: 'anuncio-x-falso', 'data-alvo': 'site.anuncio.xFalso', text: '✕' }),
        icone('img:gift-24-color', { tamanho: 72 }),
        h('strong', { class: 'anuncio-titulo', text: 'PARABÉNS!!! VOCÊ GANHOU 10.000 GEMAS!' }),
        h('p', { text: 'Você é o visitante nº 1.000.000! Resgate agora antes que acabe.' }),
        h('span', { class: 'anuncio-botao', text: 'RESGATAR GEMAS GRÁTIS' }),
        h('small', { class: 'anuncio-tempo', text: 'Oferta expira em 00:59' })
      ),
      h('small', { class: 'anuncio-rotulo', text: 'Anúncio' })
    )
  );
}

export const GEMAS_FALSO = {
  id: 'gemas-falso',
  hosts: ['gemas-gratis.click'],
  titulo: 'GEMAS GRÁTIS - Pixel Arena',
  cor: '#8764b8',
  letra: 'G',
  seguro: false,
  falso: true,
  alerta: 'O nome deste site é gemas-gratis.click. Não tem nada a ver com a Pixel Arena: é golpe para roubar contas.',
  render(ctx) {
    return h(
      'div',
      { class: 'pixel' },
      h('header', { class: 'pixel-topo' }, h('strong', { class: 'pixel-marca', text: 'PIXEL ARENA ★ GEMAS' })),
      h(
        'div',
        { class: 'pixel-conteudo estreito' },
        formularioFalso(ctx, {
          titulo: 'Resgate suas 10.000 gemas',
          texto: 'Entre com o seu usuário e a sua senha do jogo para receber as gemas na hora!',
          campos: [{ rotulo: 'Usuário do jogo' }, { rotulo: 'Senha do jogo', tipo: 'password' }],
          botao: 'Receber gemas',
        })
      )
    );
  },
};
