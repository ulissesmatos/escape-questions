/**
 * Fábricas de objetivos da Operação Anzol (mesmo formato da Operação Word,
 * ver word/regras/objetivos.js): texto, verificar(estado), dica, caminho do
 * Mostre-me, util e diagnosticar.
 *
 * O estado tem, além do da Operação Word:
 *   mundo   → regras/Mundo.js (e-mails, celular, conta, Conecta...)
 *   edge    → { url, host, site }   email → { pasta, aberto }
 *   celular → { tela, conversa }    seguranca → { pagina, encontradas }
 *   explorador → { pasta }
 *
 * Passos do Mostre-me com dicas para os programas novos:
 *   email: id   → o Email abre esse e-mail antes (e a pasta dele)
 *   conversa: id → o Celular abre essa conversa antes
 *   site: host (+ favorito: id) → o Edge vai até esse site antes
 */
import { passo, comparavel } from '../../word/regras/objetivos.js';
import { dadosPessoais } from './privacidade.js';

export { passo };

const aspas = (t) => `"${t}"`;
const CONTA = 'conta.postal.com.br';
const CONECTA = 'conecta.com.br';
const PIXEL = 'pixelarena.com.br';

/** Passo "abra este e-mail": feito quando ele está aberto no painel de leitura */
const passoEmail = (id, assunto) => ({ alvo: `email.item.${id}`, texto: `Clique no e-mail ${aspas(assunto)} para abrir.`, feito: (c) => c.app('email')?.emailAberto?.id === id });
/** Passo "abra esta conversa" no Celular */
const passoConversa = (id, nome) => ({ alvo: `cel.conversa.${id}`, texto: `Toque na conversa de ${nome} para abrir.`, feito: (c) => c.app('celular')?.tela === 'conversa' && c.app('celular')?.atual === id });

// ================= programas =================

export function abrirPrograma(id, { texto, nome, viaIniciar = false, conceito = null, dica } = {}) {
  return {
    texto: texto || `Abra o ${nome}`,
    conceito,
    verificar: (e) => e.marcos.has(`app:abrir:${id}`) || e.apps.abertos.includes(id),
    dica: dica || (viaIniciar ? `Clique no botão Iniciar (o logotipo do Windows, na barra de baixo) e depois em ${nome}.` : `O ${nome} está na barra de tarefas, embaixo. Clique no ícone dele.`),
    caminho: viaIniciar
      ? [passo('barra.iniciar', 'Clique no botão Iniciar (o logotipo do Windows, na barra de baixo).'), passo(`iniciar.app.${id}`, `Clique em ${nome}.`)]
      : [passo(`barra.${id}`, `Clique no ${nome}, na barra de tarefas.`)],
    util: (ev) => ev.tipo === 'menu' && ev.menu === 'iniciar',
    diagnosticar: (ev) => (ev.tipo === 'app' && ev.acao === 'abrir' && ev.app !== id ? `Esse é o ${ev.nome}. A missão pede o ${nome}.` : null),
  };
}

// ================= e-mail =================

export function abrirEmail(id, assunto, { texto, conceito = null } = {}) {
  return {
    texto: texto || `Abra o e-mail ${aspas(assunto)}`,
    conceito,
    verificar: (e) => e.marcos.has(`email:abrir:${id}`),
    dica: `No Email, clique na mensagem ${aspas(assunto)} da Caixa de Entrada. Ela aparece à direita.`,
    caminho: [passoEmail(id, assunto)],
    util: (ev) => ev.tipo === 'email' || (ev.tipo === 'app' && ev.app === 'email'),
  };
}

export function verRemetente(id, assunto, { texto } = {}) {
  return {
    texto: texto || 'Clique no nome de quem enviou para ver o endereço de verdade',
    conceito: 'remetente',
    verificar: (e) => e.marcos.has(`email:remetente:${id}`),
    dica: 'No alto da mensagem, ao lado da bolinha com as iniciais, clique no nome de quem enviou: o endereço completo aparece entre < >.',
    caminho: [passoEmail(id, assunto), passo('email.remetente', 'Clique no nome de quem enviou.', { email: id })],
    util: (ev) => ev.tipo === 'email' && ev.email === id,
  };
}

export function verLink(id, assunto, chave, { texto } = {}) {
  return {
    texto: texto || 'Pare o mouse em cima do link (sem clicar!) e veja para onde ele leva',
    conceito: 'link-disfarcado',
    verificar: (e) => e.marcos.has(`email:link-visto:${id}:${chave}`),
    dica: 'Leve o mouse até o link azul e deixe parado em cima dele, SEM clicar. Olhe o cantinho de baixo da mensagem: ali aparece o endereço de verdade.',
    caminho: [passoEmail(id, assunto), passo(`email.link.${chave}`, 'Pare o mouse em cima do link, SEM clicar. Olhe o endereço que aparece embaixo.', { email: id, acao: 'passar' })],
    util: (ev) => ev.tipo === 'email' && ev.email === id,
  };
}

/** Abrir um link de propósito (só quando a Central manda analisar um site suspeito) */
export function abrirLinkDoEmail(id, assunto, chave, siteId, { texto } = {}) {
  return {
    texto,
    conceito: 'cadeado',
    verificar: (e) => e.marcos.has(`web:site:${siteId}`),
    dica: 'No e-mail da Central, clique no link azul: ele abre no Edge. Aqui pode, porque a Central mandou analisar e o computador é de testes.',
    caminho: [passoEmail(id, assunto), passo(`email.link.${chave}`, 'Clique no link (a Central autorizou: é para analisar o site).', { email: id })],
  };
}

export function denunciarEmail(id, assunto, { texto } = {}) {
  return {
    texto: texto || `Denuncie o e-mail ${aspas(assunto)} como phishing`,
    conceito: 'denunciar-phishing',
    verificar: (e) => Boolean(e.mundo.email(id)?.denunciado),
    dica: `Abra o e-mail ${aspas(assunto)}, clique em Relatar (a bandeirinha, na barra de cima) e escolha "Relatar phishing".`,
    caminho: [passoEmail(id, assunto), passo('email.acao.relatar', 'Clique em Relatar (a bandeirinha).', { email: id }), passo('email.relatar.phishing', 'Clique em "Relatar phishing".', { email: id })],
    util: (ev) => ev.tipo === 'email' && ev.email === id,
    diagnosticar: (ev, e) => {
      if (ev.tipo !== 'email') return null;
      if (ev.acao === 'excluir' && ev.email === id) return 'Excluir só tira da sua caixa. "Relatar phishing" também avisa a Postal, que bloqueia o golpista para todo mundo. Abra Itens Excluídos e denuncie.';
      if (ev.acao === 'bloquear' && ev.email === id && !e.mundo.email(id)?.denunciado) return 'Bloquear é bom, mas falta denunciar: Relatar › Relatar phishing.';
      return null;
    },
  };
}

/**
 * Caça aos golpes da Caixa de Entrada: todos os phishing denunciados e
 * nenhum e-mail verdadeiro denunciado.
 */
export function cacarPhishing(ids, { texto, assuntos }) {
  return {
    texto,
    conceito: 'denunciar-phishing',
    verificar: (e) => ids.every((id) => e.mundo.email(id)?.denunciado),
    dica: 'Abra cada e-mail e clique no nome de quem enviou. Endereço estranho (que não é do site oficial) + pressa ou ameaça = golpe. Denuncie com Relatar › Relatar phishing.',
    // um golpe de cada vez: abrir → Relatar → Relatar phishing (os já denunciados contam como feitos)
    caminho: ids.flatMap((id) => [
      { ...passoEmail(id, assuntos[id]), feito: (c) => Boolean(c.mundo().email(id)?.denunciado) || c.app('email')?.emailAberto?.id === id },
      passo('email.acao.relatar', 'Este é golpe: clique em Relatar.', { email: id }),
      { ...passo('email.relatar.phishing', 'Clique em "Relatar phishing".', { email: id }), feito: (c) => Boolean(c.mundo().email(id)?.denunciado) },
    ]),
    util: (ev) => ev.tipo === 'email',
  };
}

/** Depois da caça: nenhum e-mail verdadeiro foi parar no Lixo Eletrônico */
export function manterVerdadeiros(ids, { texto = 'Deixe os e-mails verdadeiros na Caixa de Entrada (não denuncie o que é de verdade)' } = {}) {
  return {
    texto,
    conceito: 'remetente',
    aposAnteriores: true,
    verificar: (e) => ids.every((id) => e.mundo.email(id)?.pasta === 'entrada'),
    dica: 'Se você denunciou um e-mail verdadeiro, abra o Lixo Eletrônico, clique nele e depois em "Não é lixo eletrônico".',
    caminho: [passo('email.pasta.lixo', 'Abra o Lixo Eletrônico.'), passo('email.acao.naoELixo', 'Clique em "Não é lixo eletrônico" para devolver o e-mail verdadeiro.')],
  };
}

// ================= perguntas da Central =================

/**
 * Pergunta de escolher na Central. explicacao: o que a Central diz ao
 * acertar; errou: (valor) → texto ao errar.
 */
export function escolher(id, pergunta, opcoes, certa, { conceito = null, dica, caminho = [], explicacao = null, errou = null } = {}) {
  return {
    texto: pergunta,
    conceito,
    pergunta: { id, opcoes },
    verificar: (e) => e.respostas[id] !== undefined,
    conferir: (valor) => valor === certa,
    aoAcertar: explicacao,
    aoErrar: errou || (() => 'Não é essa. Leia de novo com calma e tente outra vez.'),
    dica,
    caminho,
  };
}

// ================= navegador =================

/** Ir a um site digitando o endereço (ou pelos Favoritos), e não pelo link da mensagem */
export function visitarDigitando(host, { texto, conceito = 'digitar-endereco', aceitaFavorito = true } = {}) {
  return {
    texto: texto || `Abra o Edge e digite ${host} na barra de endereços`,
    conceito,
    verificar: (e) => e.marcos.has(`web:digitado:${host}`) || (aceitaFavorito && e.marcos.has(`web:favorito:${host}`)),
    dica: `Abra o Edge (o ícone azul e verde da barra de tarefas), clique na barra de endereços lá em cima, apague o que estiver lá, digite ${host} e aperte Enter.`,
    caminho: [{ alvo: 'nav.endereco', valor: host, texto: `Clique na barra de endereços e digite: ${host}` }, passo('nav.endereco', 'Agora aperte Enter.')],
    util: (ev) => ev.tipo === 'web' || (ev.tipo === 'app' && ev.app === 'edge'),
    diagnosticar: (ev) => {
      if (ev.tipo !== 'web' || ev.acao !== 'visitar') return null;
      if (ev.host === host && ev.via === 'link') return `Você chegou pelo link. Desta vez digite o endereço você mesmo: clique na barra de endereços, digite ${host} e aperte Enter.`;
      if (ev.via === 'digitado' && !ev.existe && comparavel(ev.host).replace(/ /g, '') !== comparavel(host).replace(/ /g, '')) return `Esse endereço não existe. Confira letra por letra: ${host}`;
      return null;
    },
  };
}

/** Visitar um site pelos Favoritos (ou digitando) */
export function visitarSite(host, favorito, nome, { texto, conceito = null } = {}) {
  return {
    texto: texto || `Abra o site ${nome} (está nos Favoritos do Edge)`,
    conceito,
    verificar: (e) => e.marcos.has(`web:visitar:${host}`),
    dica: `Abra o Edge e clique em ${aspas(nome)} na barra de Favoritos (logo abaixo do endereço). Ou digite ${host}.`,
    caminho: [passo(`nav.fav.${favorito}`, `Clique em ${aspas(nome)} na barra de Favoritos.`)],
    util: (ev) => ev.tipo === 'web' || (ev.tipo === 'app' && ev.app === 'edge'),
  };
}

export function verCadeado(host, { texto, conceito = 'cadeado' } = {}) {
  return {
    texto: texto || 'Clique no cadeado (ou no "Não seguro") ao lado do endereço',
    conceito,
    verificar: (e) => e.marcos.has(`web:cadeado:${host}`),
    dica: 'No Edge, bem no começo da barra de endereços (à esquerda do endereço), tem um cadeado ou um aviso "Não seguro". Clique nele.',
    caminho: [{ alvo: 'nav.cadeado', texto: 'Clique aqui, no começo da barra de endereços.', site: host }],
    util: (ev) => ev.tipo === 'web',
  };
}

// ================= conta Postal =================

export function trocarSenha({ texto = 'Crie uma senha forte e salve', atual = '123456' } = {}) {
  const valor = (c, alvo) => c.valorDoCampo(alvo) || '';
  return {
    texto,
    conceito: 'senha-forte',
    verificar: (e) => e.mundo.conta.senhaTrocada && e.mundo.senhaForte,
    dica: `Em Minha Conta, no cartão Senha: digite a senha atual (${atual}), invente uma senha nova com 12 ou mais caracteres misturando letras, números e símbolos (ou 3 palavras: Gato-Azul-Pula7), repita no campo de confirmar e clique em Alterar senha.`,
    caminho: [
      { alvo: 'site.conta.senha.atual', valor: atual, texto: `Digite a senha atual: ${atual}`, site: CONTA, favorito: 'conta' },
      { alvo: 'site.conta.senha.nova', texto: 'Invente uma senha forte (12 ou mais caracteres, com letras, números e símbolos). Siga o medidor de força!', site: CONTA, feito: (c) => c.mundo().avaliar(valor(c, 'site.conta.senha.nova')).forte },
      { alvo: 'site.conta.senha.confirmar', texto: 'Digite a mesma senha nova de novo.', site: CONTA, feito: (c) => valor(c, 'site.conta.senha.confirmar') !== '' && valor(c, 'site.conta.senha.confirmar') === valor(c, 'site.conta.senha.nova') },
      passo('site.conta.senha.salvar', 'Clique em Alterar senha.', { site: CONTA }),
    ],
    util: (ev) => ev.tipo === 'web',
    diagnosticar: (ev) => (ev.tipo === 'web' && ev.acao === 'senha-recusada' ? ev.motivo : null),
  };
}

export function ativarDuasEtapas({ texto = 'Ative a verificação em duas etapas com o código que chega no Celular' } = {}) {
  return {
    texto,
    conceito: 'duas-etapas',
    verificar: (e) => e.mundo.conta.duasEtapas,
    dica: 'Em Minha Conta, clique em "Ativar verificação em duas etapas". Depois abra o Celular (barra de tarefas), leia o código da Postal e digite ele no site.',
    caminho: [
      { alvo: 'site.conta.2fa.ativar', texto: 'Clique em "Ativar verificação em duas etapas".', site: CONTA, favorito: 'conta', feito: (c) => Boolean(c.mundo().conta.codigo) },
      { alvo: 'cel.conversa.postal-codigo', texto: 'A Postal mandou um código: abra a mensagem no Celular.', feito: (c) => Boolean(c.mundo().conversa('postal-codigo')?.lida) },
      { alvo: 'site.conta.2fa.codigo', texto: 'Digite aqui o código de 6 números que chegou no Celular.', site: CONTA, feito: (c) => (c.valorDoCampo('site.conta.2fa.codigo') || '').replace(/\D/g, '') === c.mundo().conta.codigo },
      passo('site.conta.2fa.confirmar', 'Clique em Confirmar.', { site: CONTA }),
    ],
    util: (ev) => ev.tipo === 'web' || ev.tipo === 'celular',
    diagnosticar: (ev) => (ev.tipo === 'web' && ev.acao === 'codigo-errado' ? 'Código errado. Abra o Celular, veja a mensagem da Postal e copie os 6 números com atenção.' : null),
  };
}

export function encerrarSessao(id, descricao, { texto } = {}) {
  return {
    texto: texto || `Desconecte o aparelho que você não conhece (${descricao})`,
    conceito: 'aparelhos-conectados',
    verificar: (e) => Boolean(e.mundo.conta.sessoes.find((s) => s.id === id)?.encerrada),
    dica: 'Em Minha Conta, desça até "Aparelhos conectados" e clique em Sair no aparelho que não é seu.',
    caminho: [{ alvo: `site.conta.sessao.${id}`, texto: 'Clique em Sair neste aparelho desconhecido.', site: CONTA, favorito: 'conta' }],
    util: (ev) => ev.tipo === 'web',
    diagnosticar: (ev) => (ev.tipo === 'web' && ev.acao === 'encerrar-sessao' && ev.sessao !== id ? 'Esse aparelho é seu! Desconecte só o que você não reconhece.' : null),
  };
}

// ================= celular =================

export function abrirConversa(id, nome, { texto, conceito = null } = {}) {
  return {
    texto: texto || `Abra o Celular e leia a mensagem de ${nome}`,
    conceito,
    verificar: (e) => e.marcos.has(`cel:abrir:${id}`),
    dica: 'O Celular está na barra de tarefas (o ícone de celular). Abra e toque na conversa.',
    caminho: [passoConversa(id, nome)],
    util: (ev) => ev.tipo === 'celular' || (ev.tipo === 'app' && ev.app === 'celular'),
  };
}

export function bloquearConversa(id, nome, { texto } = {}) {
  return {
    texto: texto || `Bloqueie e denuncie ${nome}`,
    conceito: 'bloquear-denunciar',
    verificar: (e) => Boolean(e.mundo.conversa(id)?.bloqueado && e.mundo.conversa(id)?.denunciado),
    dica: 'Na conversa, toque nos três pontinhos (⋮) lá em cima e escolha "Bloquear e denunciar como spam".',
    caminho: [passoConversa(id, nome), passo('cel.menu', 'Toque nos três pontinhos (⋮).', { conversa: id }), passo('cel.menu.bloquear', 'Toque em "Bloquear e denunciar como spam".', { conversa: id })],
    util: (ev) => ev.tipo === 'celular',
    diagnosticar: (ev) => (ev.tipo === 'celular' && ev.acao === 'excluir' && ev.conversa === id && !ev.bloqueado ? 'Apagou, mas o número continua podendo mandar mensagens. Bloqueie e denuncie primeiro.' : null),
  };
}

export function excluirConversa(id, nome, { texto } = {}) {
  return {
    texto: texto || `Apague a conversa de ${nome}`,
    conceito: 'bloquear-denunciar',
    aposAnteriores: true,
    verificar: (e) => Boolean(e.mundo.conversa(id)?.excluida),
    dica: 'Na conversa, toque nos três pontinhos (⋮) e escolha "Excluir conversa".',
    caminho: [passoConversa(id, nome), passo('cel.menu', 'Toque nos três pontinhos (⋮).', { conversa: id }), passo('cel.menu.excluir', 'Toque em "Excluir conversa".', { conversa: id })],
  };
}

export function responderConversa(id, nome, resposta, textoResposta, { texto, conceito = null } = {}) {
  return {
    texto,
    conceito,
    verificar: (e) => e.marcos.has(`cel:respondeu:${id}:${resposta}`),
    dica: `Na conversa de ${nome}, toque na resposta ${aspas(textoResposta)}.`,
    caminho: [passoConversa(id, nome), passo(`cel.resposta.${resposta}`, `Toque em ${aspas(textoResposta)}.`, { conversa: id })],
    util: (ev) => ev.tipo === 'celular',
  };
}

export function ligarPara(contato, nome, { texto, conceito = 'confirmar-pessoa' } = {}) {
  return {
    texto: texto || `Ligue para ${nome} pelo número que está nos Contatos`,
    conceito,
    verificar: (e) => e.marcos.has(`cel:ligacao:${contato}`),
    dica: `No Celular, toque no botão de início (a bolinha embaixo), abra Contatos e toque no telefone verde ao lado de ${nome}. Escute até o fim.`,
    caminho: [passo(`cel.contato.${contato}.ligar`, `Toque no telefone verde para ligar para ${nome}.`)],
    util: (ev) => ev.tipo === 'celular',
  };
}

// ================= Segurança do Windows =================

export function verificarAntivirus({ texto = 'Faça uma Verificação rápida na Segurança do Windows' } = {}) {
  return {
    texto,
    conceito: 'antivirus',
    verificar: (e) => e.marcos.has('seg:verificacao'),
    dica: 'Abra o menu Iniciar, clique em Segurança do Windows, depois em "Proteção contra vírus e ameaças" e em "Verificação rápida".',
    caminho: [passo('seg.menu.virus', 'Clique em "Proteção contra vírus e ameaças".', { feito: (c) => c.app('seguranca')?.pagina === 'virus' }), passo('seg.verificar', 'Clique em "Verificação rápida".')],
    util: (ev) => ev.tipo === 'seguranca' || ev.tipo === 'menu',
  };
}

export function removerAmeacas({ texto = 'Remova a ameaça encontrada' } = {}) {
  return {
    texto,
    conceito: 'antivirus',
    aposAnteriores: true,
    verificar: (e) => e.marcos.has('seg:removido') && !e.mundo.infectado && !e.fs.itens.some((i) => i.tipo === 'exe' && i.conteudo?.ameaca),
    dica: 'Depois da verificação, clique em "Iniciar ações" na Segurança do Windows. Se não aparecer, faça a Verificação rápida de novo.',
    caminho: [passo('seg.remover', 'Clique em "Iniciar ações" para remover a ameaça.')],
  };
}

// ================= Explorador =================

export function abrirPasta(pasta, { texto, conceito = null } = {}) {
  return {
    texto: texto || `Abra a pasta ${pasta} no Explorador de Arquivos`,
    conceito,
    verificar: (e) => e.marcos.has(`navegar:${pasta}`) || e.explorador?.pasta === pasta,
    dica: `Clique na pasta amarela da barra de tarefas (Explorador de Arquivos) e depois em ${pasta}, no painel da esquerda.`,
    caminho: [passo(`explorador.nav.${pasta}`, `Clique em ${pasta}, no painel da esquerda.`, { feito: (c) => c.pastaDoExplorador() === pasta })],
    util: (ev) => ev.tipo === 'navegar' || (ev.tipo === 'app' && ev.app === 'explorador'),
  };
}

// ================= Conecta =================

export function limparBio(tipos = ['endereco', 'telefone', 'escola'], { texto = 'Tire da bio o endereço, o telefone e a escola e salve' } = {}) {
  const limpo = (bio) => !dadosPessoais(bio).some((d) => tipos.includes(d.tipo));
  return {
    texto,
    conceito: 'dados-pessoais',
    verificar: (e) => limpo(e.mundo.conecta.perfil.bio),
    dica: 'Na Conecta, clique em "Editar perfil", apague da bio a rua, o telefone e a escola/turma (pode deixar o que você gosta de fazer) e clique em Salvar. A página avisa o que ainda está lá.',
    caminho: [
      { alvo: 'site.conecta.bio', texto: 'Apague da bio a rua, o telefone e a escola. Pode deixar seus gostos!', site: CONECTA, favorito: 'conecta', feito: (c) => limpo(c.valorDoCampo('site.conecta.bio') ?? c.mundo().conecta.perfil.bio) },
      passo('site.conecta.salvar', 'Clique em Salvar.', { site: CONECTA }),
    ],
    util: (ev) => ev.tipo === 'web',
    diagnosticar: (ev) => {
      if (ev.tipo !== 'web' || ev.acao !== 'salvar-perfil') return null;
      const restam = ev.dados.filter((d) => tipos.includes(d));
      const nomes = { endereco: 'o endereço', telefone: 'o telefone', escola: 'a escola' };
      return restam.length ? `Salvou, mas ainda tem ${restam.map((d) => nomes[d]).join(' e ')} na bio. Apague e salve de novo.` : null;
    },
  };
}

export function configurarPrivacidade(chave, ligado, { texto, conceito = 'conta-privada' } = {}) {
  const alvo = `site.conecta.${chave}`;
  return {
    texto,
    conceito,
    verificar: (e) => e.mundo.conecta.privacidade[chave] === ligado,
    dica: 'Na Conecta, clique em Privacidade (menu da esquerda) e use o interruptor.',
    caminho: [{ alvo, texto: `Clique no interruptor para ${ligado ? 'ligar' : 'desligar'}.`, site: CONECTA, favorito: 'conecta', feito: (c) => c.mundo().conecta.privacidade[chave] === ligado }],
    util: (ev) => ev.tipo === 'web',
  };
}

export function responderPedido(id, nome, estado, { texto, conceito = 'pedido-de-amizade' } = {}) {
  const verbo = estado === 'aceito' ? 'Aceitar' : 'Recusar';
  return {
    texto: texto || `${verbo} o pedido de ${nome}`,
    conceito,
    verificar: (e) => e.mundo.pedido(id)?.estado === estado,
    dica: `Na Conecta, abra Amigos e clique em ${verbo} no pedido de ${nome}.`,
    caminho: [{ alvo: `site.conecta.pedido.${id}.${estado === 'aceito' ? 'aceitar' : 'recusar'}`, texto: `Clique em ${verbo}.`, site: CONECTA, favorito: 'conecta' }],
    util: (ev) => ev.tipo === 'web',
  };
}

export function denunciarPerfil(id, nome, { texto } = {}) {
  return {
    texto: texto || `Denuncie o perfil falso de ${nome}`,
    conceito: 'pedido-de-amizade',
    verificar: (e) => Boolean(e.mundo.pedido(id)?.denunciado),
    dica: `Em Amigos, clique nos três pontinhos (⋯) do pedido de ${nome} e escolha "Denunciar perfil falso".`,
    caminho: [
      { alvo: `site.conecta.pedido.${id}.mais`, texto: 'Clique nos três pontinhos (⋯) deste pedido.', site: CONECTA, favorito: 'conecta' },
      { alvo: `site.conecta.pedido.${id}.denunciar`, texto: 'Clique em "Denunciar perfil falso".', site: CONECTA },
    ],
    util: (ev) => ev.tipo === 'web',
  };
}

export function bloquearNaConecta(id, nome, { texto } = {}) {
  return {
    texto: texto || `Bloqueie e denuncie ${nome}`,
    conceito: 'adulto-de-confianca',
    verificar: (e) => Boolean(e.mundo.conversaConecta(id)?.bloqueado),
    dica: 'Na Conecta, abra Mensagens e clique em "Bloquear e denunciar" na conversa.',
    caminho: [{ alvo: `site.conecta.conversa.${id}.bloquear`, texto: 'Clique em "Bloquear e denunciar".', site: CONECTA, favorito: 'conecta' }],
    util: (ev) => ev.tipo === 'web',
  };
}

// ================= Pixel Arena (anúncio) =================

export function denunciarAnuncio({ texto = 'Denuncie o anúncio enganoso (pelo ⓘ do cantinho)' } = {}) {
  return {
    texto,
    conceito: 'anuncio-enganoso',
    verificar: (e) => Boolean(e.mundo.pixel.denunciado),
    dica: 'No cantinho de cima do anúncio tem um ⓘ pequenininho. Clique nele e escolha "Denunciar anúncio". Não clique no X grande nem no botão!',
    caminho: [
      { alvo: 'site.anuncio.info', texto: 'Clique no ⓘ pequeno, no cantinho do anúncio.', site: PIXEL, favorito: 'pixel' },
      { alvo: 'site.anuncio.denunciar', texto: 'Clique em "Denunciar anúncio".', site: PIXEL },
    ],
    util: (ev) => ev.tipo === 'web',
  };
}

export function fecharAnuncio({ texto = 'Feche o anúncio pelo botão certo' } = {}) {
  return {
    texto,
    conceito: 'anuncio-enganoso',
    aposAnteriores: true,
    verificar: (e) => !e.mundo.pixel.anuncio,
    dica: 'O X grande faz parte da imagem do anúncio (é armadilha). Use o "Fechar anúncio" pequeno, no canto de cima.',
    caminho: [{ alvo: 'site.anuncio.fechar', texto: 'Clique em "Fechar anúncio", aqui no cantinho.', site: PIXEL, favorito: 'pixel' }],
    util: (ev) => ev.tipo === 'web',
  };
}
