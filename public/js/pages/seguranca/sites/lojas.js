import { h } from '../../../core/dom.js';
import { icone } from '../../word/sistema/icones.js';
import { campo, avisoDoSite, formularioFalso } from './comum.js';

/**
 * Banco Pátria, Mega Loja e EnviaJá: cada um com o site verdadeiro e a
 * cópia falsa que os golpistas usam. Todos os nomes são inventados.
 */

const topo = (classe, marca, ...extra) => h('header', { class: `loja-topo ${classe}` }, h('strong', { class: 'loja-marca', text: marca }), ...extra);

// ---------------- Banco Pátria ----------------

export const BANCO = {
  id: 'banco',
  hosts: ['bancopatria.com.br'],
  titulo: 'Banco Pátria',
  cor: '#00754a',
  letra: 'B',
  render(ctx) {
    return h(
      'div',
      { class: 'loja banco' },
      topo('banco-topo', 'Banco Pátria', h('nav', {}, ['Para você', 'Cartões', 'Pix', 'Ajuda'].map((t) => h('span', { text: t })))),
      h(
        'div',
        { class: 'loja-conteudo' },
        avisoDoSite('O Banco Pátria NUNCA manda links por e-mail ou SMS pedindo para atualizar dados, senha ou cadastro.', { alvo: 'site.banco.aviso' }),
        h('h1', { text: 'Olá! Está tudo certo com a sua conta.' }),
        h('p', { text: 'Nenhuma pendência, nenhum bloqueio. Se você recebeu uma mensagem dizendo o contrário, é golpe: apague e não clique em nada.' }),
        h('div', { class: 'loja-cartoes' }, ['Pix', 'Extrato', 'Cartão', 'Investir'].map((t) => h('div', { class: 'loja-cartao', text: t })))
      )
    );
  },
};

export const BANCO_FALSO = {
  id: 'banco-falso',
  hosts: ['bancopatria.atualiza-cadastro.com'],
  titulo: 'Banco Pátria - Atualização',
  cor: '#00754a',
  letra: 'B',
  seguro: false,
  falso: true,
  alerta: 'O nome deste site é atualiza-cadastro.com. "bancopatria" no começo é só um disfarce.',
  render(ctx) {
    return h(
      'div',
      { class: 'loja banco' },
      topo('banco-topo', 'Banco Pátria'),
      h(
        'div',
        { class: 'loja-conteudo estreito' },
        h('p', { class: 'loja-urgente', text: 'ATENÇÃO: sua conta será BLOQUEADA hoje se você não atualizar o cadastro!' }),
        formularioFalso(ctx, {
          titulo: 'Atualização cadastral',
          campos: [{ rotulo: 'CPF' }, { rotulo: 'Agência e conta' }, { rotulo: 'Senha do cartão', tipo: 'password' }],
          botao: 'Atualizar agora',
        })
      )
    );
  },
};

// ---------------- Mega Loja ----------------

export const LOJA = {
  id: 'loja',
  hosts: ['megaloja.com.br'],
  titulo: 'Mega Loja',
  cor: '#d13438',
  letra: 'M',
  render(ctx) {
    return h(
      'div',
      { class: 'loja megaloja' },
      topo('megaloja-topo', 'Mega Loja', h('span', { class: 'loja-busca' }, icone('search', { tamanho: 14 }), 'O que você procura?')),
      h(
        'div',
        { class: 'loja-conteudo' },
        avisoDoSite('A Mega Loja não sorteia prêmios por e-mail, SMS ou rede social. Mensagens assim são golpe.', { alvo: 'site.loja.aviso' }),
        h('h1', { text: 'Ofertas da semana' }),
        h(
          'div',
          { class: 'loja-produtos' },
          [
            ['Fone de ouvido', 'R$ 89,90'],
            ['Mochila escolar', 'R$ 129,00'],
            ['Caderno 10 matérias', 'R$ 32,50'],
            ['Mouse sem fio', 'R$ 59,90'],
          ].map(([nome, preco]) => h('div', { class: 'loja-produto' }, h('span', { class: 'loja-foto' }), h('strong', { text: nome }), h('span', { text: preco })))
        )
      )
    );
  },
};

export const LOJA_FALSA = {
  id: 'loja-falsa',
  hosts: ['megaloja-premios.xyz'],
  titulo: 'Mega Loja - Resgate seu prêmio',
  cor: '#d13438',
  letra: 'M',
  seguro: false,
  falso: true,
  alerta: 'O nome deste site é megaloja-premios.xyz, e não megaloja.com.br.',
  render(ctx) {
    return h(
      'div',
      { class: 'loja megaloja' },
      topo('megaloja-topo', 'Mega Loja'),
      h(
        'div',
        { class: 'loja-conteudo estreito' },
        h('p', { class: 'loja-urgente', text: '🎁 PARABÉNS! Vale-presente de R$ 1.000,00 — expira em 10 minutos!' }),
        formularioFalso(ctx, {
          titulo: 'Resgate seu prêmio',
          texto: 'Para receber, confirme seus dados e pague só o frete de R$ 19,90.',
          campos: [{ rotulo: 'Nome completo' }, { rotulo: 'Número do cartão' }, { rotulo: 'Código de segurança (CVV)', tipo: 'password' }],
          botao: 'Resgatar prêmio',
        })
      )
    );
  },
};

// ---------------- EnviaJá (entregas) ----------------

export const ENVIAJA = {
  id: 'enviaja',
  hosts: ['enviaja.com.br'],
  titulo: 'EnviaJá - Rastreamento',
  cor: '#ffb900',
  letra: 'E',
  redesenharAoMudar: false,
  render(ctx) {
    const codigo = campo('Código de rastreio', { alvo: 'site.enviaja.codigo', placeholder: 'Ex.: EJ123456789BR' });
    const resultado = h('div', { class: 'enviaja-resultado' });
    const rastrear = () => {
      const valor = codigo.entrada.value.replace(/\s+/g, '').toUpperCase();
      const certo = valor === String(ctx.mundo.web.rastreio || '').toUpperCase();
      resultado.replaceChildren(
        certo
          ? h(
              'div',
              { class: 'enviaja-status' },
              h('strong', { text: `Objeto ${valor}` }),
              h('ol', {}, ['Postado', 'Em trânsito para São Paulo', 'Saiu para entrega amanhã'].map((t, i) => h('li', { class: i === 2 ? 'atual' : '', text: t }))),
              h('p', { class: 'postal-ok', text: 'Nenhuma taxa pendente. Não há nada para pagar.' })
            )
          : h('p', { class: 'postal-mensagem erro', text: 'Código não encontrado. Confira o código que está na mensagem do Celular.' })
      );
      ctx.emitir({ acao: 'rastrear', certo, marco: certo ? 'web:rastreio' : null });
    };
    codigo.entrada.addEventListener('keydown', (e) => e.key === 'Enter' && rastrear());
    return h(
      'div',
      { class: 'loja enviaja' },
      topo('enviaja-topo', 'EnviaJá'),
      h(
        'div',
        { class: 'loja-conteudo estreito' },
        avisoDoSite('A EnviaJá não cobra taxas por SMS nem por WhatsApp. Taxas de importação só aparecem aqui, no site oficial.', { alvo: 'site.enviaja.aviso' }),
        h('h1', { text: 'Rastreie sua encomenda' }),
        codigo.el,
        h('button', { type: 'button', class: 'site-botao', 'data-alvo': 'site.enviaja.rastrear', text: 'Rastrear', onClick: rastrear }),
        resultado
      )
    );
  },
};

export const ENVIAJA_FALSO = {
  id: 'enviaja-falso',
  hosts: ['enviaja-taxa.site'],
  titulo: 'EnviaJá - Pagamento de taxa',
  cor: '#ffb900',
  letra: 'E',
  seguro: false,
  falso: true,
  alerta: 'O nome deste site é enviaja-taxa.site, e não enviaja.com.br.',
  render(ctx) {
    return h(
      'div',
      { class: 'loja enviaja' },
      topo('enviaja-topo', 'EnviaJá'),
      h(
        'div',
        { class: 'loja-conteudo estreito' },
        h('p', { class: 'loja-urgente', text: 'Sua encomenda está RETIDA. Pague a taxa de R$ 9,90 em até 24h ou ela será devolvida.' }),
        formularioFalso(ctx, {
          titulo: 'Pagamento da taxa',
          campos: [{ rotulo: 'CPF' }, { rotulo: 'Número do cartão' }, { rotulo: 'Validade' }, { rotulo: 'CVV', tipo: 'password' }],
          botao: 'Pagar R$ 9,90',
        })
      )
    );
  },
};
