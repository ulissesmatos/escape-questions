import { h } from '../../../core/dom.js';
import { icone } from '../../word/sistema/icones.js';
import { comparavel } from '../../word/regras/objetivos.js';
import { CONTA_POSTAL, POSTAL, POSTAL_FALSO } from './postal.js';
import { BANCO, BANCO_FALSO, LOJA, LOJA_FALSA, ENVIAJA, ENVIAJA_FALSO } from './lojas.js';
import { PIXEL, GEMAS_FALSO } from './pixel.js';
import { CONECTA } from './conecta.js';

/**
 * A internet de mentira da Operação Anzol. Cada site:
 * { id, hosts, titulo, cor, letra (ícone), seguro (false = "Não seguro"),
 *   falso (golpe), alerta (o que o cadeado explica), render(ctx),
 *   prerequisito(passo, guia) para o Mostre-me, redesenharAoMudar }
 *
 * Todos os nomes (Postal, Banco Pátria, Mega Loja, EnviaJá, Pixel Arena,
 * Conecta) são inventados.
 */

/** Sites que aparecem na busca (o buscador também é de mentira) */
const INDICE = [
  { url: 'conta.postal.com.br', titulo: 'Minha Conta - Postal', texto: 'Senha, verificação em duas etapas e aparelhos conectados da sua conta Postal.', termos: 'postal email e-mail conta senha' },
  { url: 'postal.com.br', titulo: 'Postal - E-mail grátis', texto: 'Crie seu e-mail grátis na Postal.', termos: 'postal email e-mail' },
  { url: 'bancopatria.com.br', titulo: 'Banco Pátria - Site oficial', texto: 'Conta, cartões e Pix. O Banco Pátria nunca pede dados por link.', termos: 'banco patria pix conta' },
  { url: 'megaloja.com.br', titulo: 'Mega Loja - Ofertas', texto: 'Compre com segurança no site oficial da Mega Loja.', termos: 'mega loja megaloja ofertas compras premio' },
  { url: 'enviaja.com.br', titulo: 'EnviaJá - Rastreamento oficial', texto: 'Rastreie sua encomenda pelo código.', termos: 'enviaja envia ja encomenda rastreio rastrear correio entrega' },
  { url: 'pixelarena.com.br', titulo: 'Pixel Arena - Jogos grátis', texto: 'Jogue grátis no navegador.', termos: 'pixel arena jogo jogos gemas' },
  { url: 'conecta.com.br', titulo: 'Conecta - Rede social', texto: 'Converse com seus amigos.', termos: 'conecta rede social amigos' },
];

export const FAVORITOS_PADRAO = [
  { id: 'conta', nome: 'Minha Conta', url: 'conta.postal.com.br' },
  { id: 'banco', nome: 'Banco Pátria', url: 'bancopatria.com.br' },
  { id: 'loja', nome: 'Mega Loja', url: 'megaloja.com.br' },
  { id: 'pixel', nome: 'Pixel Arena', url: 'pixelarena.com.br' },
  { id: 'conecta', nome: 'Conecta', url: 'conecta.com.br' },
];

const NOVA_GUIA = {
  id: 'nova-guia',
  hosts: [],
  titulo: 'Nova guia',
  render(ctx) {
    const campo = h('input', { type: 'text', class: 'nova-guia-busca', placeholder: 'Pesquisar na Web', 'data-alvo': 'site.novaGuia.busca' });
    campo.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && campo.value.trim()) ctx.ir(campo.value, 'digitado');
    });
    const favoritos = ctx.mundo.web.favoritos || FAVORITOS_PADRAO;
    return h(
      'div',
      { class: 'nova-guia' },
      h('div', { class: 'nova-guia-caixa' }, icone('search', { tamanho: 18 }), campo),
      h(
        'div',
        { class: 'nova-guia-atalhos' },
        favoritos.map((f) => {
          const site = siteDoHost(f.url.split('/')[0]);
          return h(
            'button',
            { type: 'button', class: 'nova-guia-atalho', onClick: () => ctx.ir(f.url, 'favorito') },
            h('span', { class: 'nav-favicon grande', style: { background: site?.cor || '#5f6b7a' }, text: site?.letra || f.nome[0] }),
            h('span', { text: f.nome })
          );
        })
      )
    );
  },
};

const BUSCA = {
  id: 'busca',
  hosts: ['busca.com.br'],
  titulo: 'Busca',
  cor: '#0f6cbd',
  letra: 'B',
  render(ctx) {
    const termo = decodeURIComponent((ctx.url.split('?q=')[1] || '').replace(/\+/g, ' '));
    const palavras = comparavel(termo).split(' ').filter(Boolean);
    const resultados = INDICE.filter((r) => palavras.some((p) => comparavel(`${r.titulo} ${r.termos}`).includes(p)));
    return h(
      'div',
      { class: 'busca' },
      h('header', { class: 'busca-topo' }, h('strong', { class: 'busca-marca', text: 'Busca' }), h('span', { class: 'busca-termo', text: termo })),
      h(
        'div',
        { class: 'busca-resultados' },
        resultados.length
          ? resultados.map((r) => h('div', { class: 'busca-resultado' }, h('small', { text: `https://${r.url}` }), ctx.link(r.titulo, r.url, { classe: 'busca-titulo', alvo: `site.busca.${r.url}` }), h('p', { text: r.texto })))
          : h('p', { text: `Nenhum resultado para "${termo}". Confira se digitou certo.` })
      )
    );
  },
};

export const SITES = {
  novaGuia: NOVA_GUIA,
  busca: BUSCA,
  contaPostal: CONTA_POSTAL,
  postal: POSTAL,
  postalFalso: POSTAL_FALSO,
  banco: BANCO,
  bancoFalso: BANCO_FALSO,
  loja: LOJA,
  lojaFalsa: LOJA_FALSA,
  enviaja: ENVIAJA,
  enviajaFalso: ENVIAJA_FALSO,
  pixel: PIXEL,
  gemasFalso: GEMAS_FALSO,
  conecta: CONECTA,
};

const POR_HOST = new Map(Object.values(SITES).flatMap((s) => s.hosts.map((host) => [host, s])));

export function siteDoHost(host) {
  return POR_HOST.get(String(host || '').toLowerCase()) || null;
}
