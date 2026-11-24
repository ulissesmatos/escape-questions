import { h } from '../../../core/dom.js';
import { icone } from '../../word/sistema/icones.js';
import { campo, avisoDoSite, formularioFalso } from './comum.js';

/**
 * Postal: o serviço de e-mail do aluno.
 * - conta.postal.com.br: Minha Conta (senha, verificação em duas etapas,
 *   aparelhos conectados);
 * - postal-verificacao.net: página falsa que copia o login da Postal.
 */

function barraPostal(ctx, titulo) {
  return h(
    'header',
    { class: 'postal-topo' },
    h('span', { class: 'postal-logo' }, icone('mail', { tamanho: 20 }), 'Postal'),
    h('span', { class: 'postal-topo-titulo', text: titulo }),
    h('span', { class: 'postal-topo-conta', text: ctx.mundo.conta.email })
  );
}

function medidor(avaliacao) {
  const cores = ['#c50f1f', '#da3b01', '#c19c00', '#13a10e', '#0b6a0b'];
  return h(
    'div',
    { class: 'postal-medidor' },
    h('div', { class: 'postal-medidor-barra' }, [0, 1, 2, 3, 4].map((i) => h('span', { style: { background: i <= avaliacao.pontos && avaliacao.pontos > 0 ? cores[avaliacao.pontos] : '' } }))),
    h('strong', { style: { color: cores[avaliacao.pontos] }, text: `Força: ${avaliacao.nivel}` }),
    avaliacao.problemas.length ? h('ul', {}, avaliacao.problemas.map((p) => h('li', { text: p }))) : h('p', { class: 'postal-medidor-ok', text: avaliacao.fraseSenha ? 'Frase-senha forte: longa e fácil de lembrar.' : 'Senha forte!' })
  );
}

function cartaoSenha(ctx) {
  const { mundo } = ctx;
  const mensagem = h('p', { class: 'postal-mensagem', hidden: true });
  const caixaMedidor = h('div', {}, medidor(mundo.avaliar('')));
  const atual = campo('Senha atual', { tipo: 'password', alvo: 'site.conta.senha.atual' });
  const nova = campo('Nova senha', { tipo: 'text', alvo: 'site.conta.senha.nova', aoDigitar: (valor) => caixaMedidor.replaceChildren(medidor(mundo.avaliar(valor))) });
  const confirmar = campo('Confirme a nova senha', { tipo: 'text', alvo: 'site.conta.senha.confirmar' });
  const avisar = (texto, tipo) => {
    mensagem.hidden = false;
    mensagem.className = `postal-mensagem ${tipo}`;
    mensagem.textContent = texto;
  };
  const salvar = () => {
    const avaliacao = mundo.avaliar(nova.entrada.value);
    let erro = null;
    if (atual.entrada.value !== mundo.conta.senha) erro = 'A senha atual está errada. (Dica da Central: ela está no e-mail da missão.)';
    else if (!nova.entrada.value) erro = 'Digite a nova senha.';
    else if (nova.entrada.value === mundo.conta.senha) erro = 'A nova senha precisa ser diferente da atual.';
    else if (!avaliacao.forte) erro = `Senha fraca: ${avaliacao.problemas[0] || 'use pelo menos 12 caracteres misturando letras, números e símbolos.'}`;
    else if (nova.entrada.value !== confirmar.entrada.value) erro = 'As duas senhas novas não são iguais. Digite a mesma senha nos dois campos.';
    if (erro) {
      avisar(erro, 'erro');
      ctx.emitir({ acao: 'senha-recusada', motivo: erro });
      return;
    }
    mundo.conta.senha = nova.entrada.value;
    mundo.conta.senhaTrocada = true;
    // trocar a senha desconecta os outros aparelhos (como nos serviços de verdade, quando você marca a opção)
    avisar('Senha alterada! Guarde bem: não conte para ninguém e não use a mesma senha em outros sites.', 'ok');
    ctx.emitir({ acao: 'trocar-senha', forte: true, marco: 'conta:senha-trocada' });
    mundo.mudou();
    ctx.redesenhar();
  };
  return h(
    'section',
    { class: 'postal-cartao', id: 'senha' },
    h('h2', {}, icone('key', { tamanho: 20 }), 'Senha'),
    mundo.conta.senhaTrocada
      ? h('p', { class: 'postal-ok' }, icone('checkmark_circle', { tamanho: 18 }), 'Senha alterada hoje. Força: ', h('strong', { text: mundo.avaliar(mundo.conta.senha).nivel }))
      : h('p', { class: 'postal-alerta' }, icone('warning', { tamanho: 18 }), 'Sua senha é fraca e já apareceu em vazamentos de dados. Troque agora.'),
    h('p', { class: 'postal-lembrete', text: '⚠ Invente uma senha só para o jogo. Nunca digite aqui uma senha que você usa de verdade.' }),
    h('div', { class: 'postal-form' }, atual.el, nova.el, caixaMedidor, confirmar.el, h('button', { type: 'button', class: 'site-botao', 'data-alvo': 'site.conta.senha.salvar', text: 'Alterar senha', onClick: salvar }), mensagem)
  );
}

function cartaoDuasEtapas(ctx) {
  const { mundo } = ctx;
  const conta = mundo.conta;
  const corpo = [];
  if (conta.duasEtapas) {
    corpo.push(h('p', { class: 'postal-ok' }, icone('shield_checkmark', { tamanho: 18 }), 'Ativada. Ao entrar num computador novo, a Postal pede também o código que chega no seu celular.'));
  } else if (!conta.codigo) {
    corpo.push(
      h('p', { text: 'Com as duas etapas, mesmo que alguém descubra a sua senha, não consegue entrar: falta o código que chega só no seu celular.' }),
      h('button', {
        type: 'button',
        class: 'site-botao',
        'data-alvo': 'site.conta.2fa.ativar',
        text: 'Ativar verificação em duas etapas',
        onClick: () => {
          mundo.enviarCodigo();
          ctx.emitir({ acao: 'codigo-enviado', marco: 'conta:codigo-enviado' });
          ctx.redesenhar();
        },
      })
    );
  } else {
    const codigo = campo('Código de 6 números', { alvo: 'site.conta.2fa.codigo', maximo: 6, placeholder: '000000' });
    const mensagem = h('p', { class: 'postal-mensagem erro', hidden: true });
    corpo.push(
      h('p', {}, 'Enviamos um código por SMS para o seu celular (final ', h('strong', { text: '42' }), '). Abra o ', h('strong', { text: 'Celular' }), ' na barra de tarefas e digite o código aqui.'),
      codigo.el,
      h('button', {
        type: 'button',
        class: 'site-botao',
        'data-alvo': 'site.conta.2fa.confirmar',
        text: 'Confirmar',
        onClick: () => {
          if (codigo.entrada.value.replace(/\D/g, '') !== conta.codigo) {
            mensagem.hidden = false;
            mensagem.textContent = 'Código errado. Confira no Celular a mensagem da Postal.';
            ctx.emitir({ acao: 'codigo-errado' });
            return;
          }
          conta.duasEtapas = true;
          ctx.emitir({ acao: 'duas-etapas', marco: 'conta:duas-etapas' });
          mundo.mudou();
          ctx.redesenhar();
        },
      }),
      mensagem
    );
  }
  return h('section', { class: 'postal-cartao', id: 'duas-etapas' }, h('h2', {}, icone('phone', { tamanho: 20 }), 'Verificação em duas etapas'), ...corpo);
}

function cartaoAparelhos(ctx) {
  const { mundo } = ctx;
  const sessoes = mundo.conta.sessoes.filter((s) => !s.encerrada);
  return h(
    'section',
    { class: 'postal-cartao', id: 'aparelhos' },
    h('h2', {}, icone('desktop', { tamanho: 20 }), 'Aparelhos conectados'),
    h('p', { text: 'Onde a sua conta está aberta agora. Não reconhece algum? Clique em Sair dele e troque a senha.' }),
    h(
      'ul',
      { class: 'postal-sessoes' },
      sessoes.map((s) =>
        h(
          'li',
          { class: s.suspeita ? 'suspeita' : '' },
          icone(s.atual ? 'desktop' : s.suspeita ? 'warning' : 'phone', { tamanho: 22 }),
          h('div', {}, h('strong', { text: s.dispositivo }), h('small', { text: `${s.local} · ${s.quando}` })),
          s.atual
            ? h('span', { class: 'postal-este', text: 'Este aparelho' })
            : h('button', {
                type: 'button',
                class: 'site-botao contorno',
                'data-alvo': `site.conta.sessao.${s.id}`,
                text: 'Sair',
                onClick: () => {
                  s.encerrada = true;
                  ctx.emitir({ acao: 'encerrar-sessao', sessao: s.id, suspeita: Boolean(s.suspeita), marco: `conta:sessao-encerrada:${s.id}` });
                  mundo.mudou();
                  ctx.redesenhar();
                },
              })
        )
      )
    )
  );
}

export const CONTA_POSTAL = {
  id: 'conta-postal',
  hosts: ['conta.postal.com.br'],
  titulo: 'Minha Conta - Postal',
  cor: '#0f6cbd',
  letra: 'P',
  // tem formulários: só redesenha quando o próprio site pede (para não apagar o que o aluno digitou)
  redesenharAoMudar: false,
  render(ctx) {
    return h(
      'div',
      { class: 'postal' },
      barraPostal(ctx, 'Minha Conta'),
      h(
        'div',
        { class: 'postal-conteudo' },
        h('h1', {}, 'Segurança da conta'),
        avisoDoSite('A Postal nunca pede sua senha ou o código do celular por e-mail, SMS ou telefone.'),
        cartaoSenha(ctx),
        cartaoDuasEtapas(ctx),
        cartaoAparelhos(ctx)
      )
    );
  },
  /** Mostre-me: o cartão certo pode estar mais para baixo na página */
  prerequisito(passo, guia) {
    const el = guia.elemento(passo.alvo);
    if (el && !guia.visivel(el)) el.scrollIntoView({ block: 'center' });
    return null;
  },
};

export const POSTAL = {
  id: 'postal',
  hosts: ['postal.com.br'],
  titulo: 'Postal - E-mail grátis',
  cor: '#0f6cbd',
  letra: 'P',
  render(ctx) {
    return h(
      'div',
      { class: 'postal' },
      barraPostal(ctx, ''),
      h(
        'div',
        { class: 'postal-conteudo' },
        h('h1', { text: 'Postal: seu e-mail' }),
        avisoDoSite('Para cuidar da sua senha e da segurança, use Minha Conta: conta.postal.com.br'),
        h('p', {}, ctx.link('Ir para Minha Conta', 'conta.postal.com.br', { classe: 'site-botao', alvo: 'site.postal.minhaConta' }))
      )
    );
  },
};

export const POSTAL_FALSO = {
  id: 'postal-falso',
  hosts: ['postal-verificacao.net'],
  titulo: 'Postal - Verificação de conta',
  cor: '#0f6cbd',
  letra: 'P',
  seguro: false,
  falso: true,
  alerta: 'O nome deste site é postal-verificacao.net, e não postal.com.br. É uma cópia para roubar senhas.',
  render(ctx) {
    return h(
      'div',
      { class: 'postal' },
      barraPostal(ctx, 'Verificação'),
      h(
        'div',
        { class: 'postal-conteudo estreito' },
        formularioFalso(ctx, {
          titulo: 'Sua conta será excluída em 24 horas',
          texto: 'Confirme seu e-mail e sua senha para manter a conta ativa.',
          campos: [{ rotulo: 'E-mail' }, { rotulo: 'Senha', tipo: 'password' }],
          botao: 'Manter minha conta',
        })
      )
    );
  },
};
