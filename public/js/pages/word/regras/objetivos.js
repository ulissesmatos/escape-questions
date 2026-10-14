/**
 * Fábricas de objetivos das missões. Cada objetivo sabe:
 *
 * - texto: o que aparece na lista da Central;
 * - verificar(estado): se já está cumprido (olhando o computador simulado);
 * - dica: a pista em texto (nível 2 de ajuda);
 * - caminho: os passos na tela para o "Mostre-me" (cada passo aponta um
 *   elemento com data-alvo, um trecho do texto ou um campo a preencher);
 * - util(evento, estado): se uma ação do aluno é um passo na direção certa
 *   (zera o detector de "perdido");
 * - diagnosticar(evento, estado): uma mensagem para um erro conhecido
 *   ("você deixou em negrito a palavra errada"), ou null;
 * - aposAnteriores: só conta depois dos objetivos anteriores (salvar, por
 *   exemplo, só vale depois das mudanças).
 *
 * O estado vem do simulador (sistema/Simulador.js → estado()):
 *   { arroba, fs, marcos: Set, copias: [{app, texto}], respostas: {},
 *     apps: { abertos, ativo },
 *     word: null | { tela, arquivo: {pasta, nome} | null, sujo, doc (Inspetor),
 *                    layout: {orientacao, margens, colunas}, cabecalho, rodape,
 *                    numeroPagina, painelNavegacao } }
 */
import { LIXEIRA } from './SistemaDeArquivos.js';

// ---------------- texto ----------------

/** Para comparar o que o aluno digitou: sem acento, minúsculo, sem pontuação */
export function comparavel(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export const contem = (palheiro, agulha) => ` ${comparavel(palheiro)} `.includes(` ${comparavel(agulha)} `);

/** Distância de edição, para o "quase!" de quem digitou com um errinho */
export function distancia(a, b) {
  if (a === b) return 0;
  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    anterior = atual;
  }
  return anterior[b.length];
}

const doc = (e) => (e.word && e.word.tela === 'documento' ? e.word.doc : null);
const aspas = (t) => `"${t}"`;

/** Passo do Mostre-me */
export const passo = (alvo, texto, extra = {}) => ({ alvo, texto, ...extra });
export const passoTrecho = (trecho, texto, extra = {}) => ({ trecho, texto: texto || `Selecione ${aspas(trecho)}: dê dois cliques na palavra ou arraste o mouse sobre ela.`, ...extra });
/** Cursor dentro do parágrafo (para comandos que valem para o parágrafo inteiro) */
export const passoCursor = (trecho, texto) => ({ trecho, dentro: true, noParagrafo: true, texto: texto || `Clique dentro de ${aspas(typeof trecho === 'string' ? trecho : 'do parágrafo')}.` });
export const passoCampo = (alvo, valor, texto) => ({ alvo, valor, texto: texto || `Digite: ${valor}` });

// ---------------- caminhos prontos ----------------

export const CAMINHO_ABRIR_WORD = [
  passo('barra.iniciar', 'Clique no botão Iniciar (o logotipo do Windows, na barra de baixo).'),
  passo('iniciar.app.word', 'Clique no Word.'),
];

export const caminhoSalvarComo = (nome, pasta = 'Documentos') => [
  passo('word.guia.arquivo', 'Clique em Arquivo.'),
  passo('word.arquivo.salvarComo', 'Clique em Salvar como.'),
  passo('word.salvarComo.procurar', 'Clique em Procurar para escolher a pasta.'),
  passo(`dialogo.salvar.nav.${pasta}`, `Escolha a pasta ${pasta} no painel da esquerda.`, { feito: (c) => c.pastaDoDialogo() === pasta }),
  passoCampo('dialogo.salvar.nome', nome, `Apague o nome que está ali e digite: ${nome}`),
  passo('dialogo.salvar.ok', 'Clique em Salvar.'),
];

export const CAMINHO_SALVAR = [passo('word.qat.salvar', 'Clique no disquete (Salvar), no alto da janela. Ou aperte Ctrl + B.')];

const caminhoFaixa = (guia, comando, textoGuia, textoComando) => [
  passo(`word.guia.${guia}`, textoGuia),
  passo(`word.faixa.${guia}.${comando}`, textoComando),
];

// ---------------- Windows e programas ----------------

export function abrirWord({ texto = 'Abra o Word pelo menu Iniciar', conceito = 'menu-iniciar' } = {}) {
  return {
    texto,
    conceito,
    verificar: (e) => e.marcos.has('app:abrir:word'),
    dica: 'O botão Iniciar é o logotipo do Windows (quatro quadradinhos azuis) na barra de baixo. Clique nele e depois no ícone azul do Word.',
    caminho: CAMINHO_ABRIR_WORD,
    util: (ev) => ev.tipo === 'menu' && ev.menu === 'iniciar',
    diagnosticar: (ev) =>
      ev.tipo === 'app' && ev.acao === 'abrir' && ev.app !== 'word' ? `Esse é o ${ev.nome}. O Word tem um ícone azul com a letra W.` : null,
  };
}

export function documentoEmBranco({ texto = 'Crie um documento em branco' } = {}) {
  return {
    texto,
    conceito: 'documento-em-branco',
    verificar: (e) => e.marcos.has('word:novo') && Boolean(doc(e)),
    dica: 'Na tela inicial do Word, clique no primeiro quadro: "Documento em branco".',
    caminho: [passo('word.inicio.embranco', 'Clique em "Documento em branco".')],
  };
}

export function digitar(frase, { texto, conceito = null, dica } = {}) {
  return {
    texto: texto || `Digite: ${frase}`,
    conceito,
    verificar: (e) => Boolean(doc(e)) && contem(doc(e).texto(), frase),
    dica: dica || `Clique na folha branca e digite exatamente: ${frase}`,
    caminho: [passo('word.folha', `Clique na folha e digite: ${frase}`, { digitar: frase })],
    util: (ev) => ev.tipo === 'digitar' && ev.app === 'word',
    diagnosticar: (ev, e) => {
      if (ev.tipo !== 'digitar' || !doc(e)) return null;
      const alvo = comparavel(frase);
      const linhas = doc(e).texto().split('\n').map(comparavel);
      // só depois de digitar a frase inteira (o "quase" no meio da digitação atrapalha)
      const perto = linhas.find((l) => l.length >= alvo.length && distancia(l.slice(0, alvo.length + 3), alvo) <= Math.max(2, alvo.length / 10));
      return perto && !contem(doc(e).texto(), frase) ? `Quase! Confira letra por letra: a missão pede ${aspas(frase)}.` : null;
    },
  };
}

export function abrirArquivo(nome, { tipo = 'docx', pasta = 'Documentos', texto, conceito = 'explorador' } = {}) {
  const app = tipo === 'txt' ? 'bloco' : 'word';
  return {
    texto: texto || `Abra o arquivo ${aspas(nome)} da pasta ${pasta}`,
    conceito,
    verificar: (e) => e.marcos.has(`arquivo:abrir:${nome}`),
    dica:
      pasta === 'Área de Trabalho'
        ? `O arquivo ${nome} está na Área de Trabalho. Dê dois cliques rápidos nele.`
        : `Abra o Explorador de Arquivos (a pasta amarela na barra de tarefas), entre em ${pasta} e dê dois cliques em ${nome}.`,
    caminho:
      pasta === 'Área de Trabalho'
        ? [passo(`area.icone.${nome}`, `Dê dois cliques em ${nome}.`, { acao: 'duplo' })]
        : [
            passo('barra.explorador', 'Clique na pasta amarela da barra de tarefas para abrir o Explorador de Arquivos.'),
            passo(`explorador.nav.${pasta}`, `Clique em ${pasta}, no painel da esquerda.`, { feito: (c) => c.pastaDoExplorador() === pasta }),
            passo(`explorador.item.${nome}`, `Dê dois cliques em ${nome}.`, { acao: 'duplo' }),
          ],
    util: (ev) => (ev.tipo === 'app' && ev.app === 'explorador') || (ev.tipo === 'navegar' && ev.pasta === pasta),
    diagnosticar: (ev) =>
      ev.tipo === 'arquivo' && ev.acao === 'abrir' && ev.nome !== nome && ev.app === app
        ? `Você abriu ${aspas(ev.nome)}. A missão pede o arquivo ${aspas(nome)}.`
        : null,
  };
}

// ---------------- salvar ----------------

export function salvarComo(nome, { pasta = 'Documentos', texto } = {}) {
  return {
    texto: texto || `Salve na pasta ${pasta} com o nome ${aspas(nome)}`,
    conceito: 'salvar-como',
    aposAnteriores: true,
    verificar: (e) =>
      Boolean(doc(e)) &&
      !e.word.sujo &&
      e.word.arquivo?.pasta === pasta &&
      comparavel(e.word.arquivo.nome) === comparavel(nome),
    dica: `Clique em Arquivo › Salvar como › Procurar. Escolha ${pasta} à esquerda, digite o nome ${nome} e clique em Salvar.`,
    caminho: caminhoSalvarComo(nome, pasta),
    util: (ev) => (ev.tipo === 'menu' && ev.menu === 'arquivo') || (ev.tipo === 'dialogo' && ev.nome === 'salvar'),
    diagnosticar: (ev) => {
      if (ev.tipo !== 'arquivo' || ev.acao !== 'salvar') return null;
      if (ev.pasta !== pasta) return `O arquivo foi salvo em ${ev.pasta}, mas a missão pede a pasta ${pasta}. Use Arquivo › Salvar como de novo.`;
      if (comparavel(ev.nome) !== comparavel(nome)) return `Você salvou com o nome ${aspas(ev.nome)}. O nome pedido é ${aspas(nome)}: use Arquivo › Salvar como de novo.`;
      return null;
    },
  };
}

/** Salvar no mesmo arquivo, depois das mudanças */
export function salvar(nome, { texto } = {}) {
  return {
    texto: texto || 'Salve as alterações (Ctrl + B)',
    conceito: 'salvar',
    aposAnteriores: true,
    verificar: (e) => Boolean(doc(e)) && !e.word.sujo && comparavel(e.word.arquivo?.nome) === comparavel(nome),
    dica: 'Clique no disquete no alto da janela do Word, ou aperte Ctrl + B. Como o arquivo já tem nome, o Word salva direto.',
    caminho: CAMINHO_SALVAR,
    diagnosticar: (ev) =>
      ev.tipo === 'arquivo' && ev.acao === 'salvar' && comparavel(ev.nome) !== comparavel(nome)
        ? `Você criou outro arquivo (${aspas(ev.nome)}). Era só salvar no mesmo: Ctrl + B.`
        : null,
  };
}

// ---------------- copiar, colar, desfazer ----------------

export function copiarDoBloco(trecho, { texto = 'Selecione todo o texto e copie (Ctrl + A, Ctrl + C)' } = {}) {
  return {
    texto,
    conceito: 'copiar-colar',
    verificar: (e) => e.copias.some((c) => c.app === 'bloco' && contem(c.texto, trecho)),
    dica: 'No Bloco de Notas, aperte Ctrl + A (seleciona tudo) e depois Ctrl + C (copia). Ou use o menu Editar.',
    caminho: [
      {
        alvos: ['bloco.editar.selecionarTudo', 'bloco.menu.editar'],
        texto: 'Selecione todo o texto: menu Editar › Selecionar tudo (ou clique no texto e aperte Ctrl + A).',
        feito: (c) => c.blocoTemSelecao(),
      },
      passo('bloco.menu.editar', 'Agora clique em Editar.'),
      passo('bloco.editar.copiar', 'Clique em Copiar (ou aperte Ctrl + C).'),
    ],
    util: (ev) => ev.tipo === 'selecionar-tudo' || (ev.tipo === 'menu' && ev.menu === 'bloco.editar'),
    diagnosticar: (ev) =>
      ev.tipo === 'copiar' && ev.app === 'bloco' && !contem(ev.texto, trecho) ? 'Você copiou só um pedaço. Selecione TUDO antes (Ctrl + A) e copie de novo.' : null,
  };
}

export function colarNoWord(trecho, { texto = 'Cole as coordenadas no relatório (Ctrl + V)', semTexto = null } = {}) {
  return {
    texto,
    conceito: 'copiar-colar',
    verificar: (e) => Boolean(doc(e)) && contem(doc(e).texto(), trecho) && (!semTexto || !contem(doc(e).texto(), semTexto)),
    dica: semTexto
      ? `No Word, selecione ${aspas(semTexto)} e aperte Ctrl + V: o que você colar entra no lugar.`
      : 'Clique no Word onde quer colar e aperte Ctrl + V (ou botão direito › Colar).',
    caminho: [
      ...(semTexto ? [passoTrecho(semTexto, `Selecione ${aspas(semTexto)} arrastando o mouse sobre ele.`)] : []),
      passo('word.faixa.inicio.colar', 'Clique em Colar.'),
    ],
    diagnosticar: (ev, e) =>
      ev.tipo === 'colar' && ev.app === 'word' && semTexto && doc(e) && contem(doc(e).texto(), semTexto)
        ? `Colou! Agora apague ${aspas(semTexto)} (selecione e aperte Delete).`
        : null,
  };
}

export function desfazer(trechoRecuperado, { texto = 'Use Desfazer (Ctrl + Z) para recuperar o parágrafo', marco = 'desfazer', espera = null } = {}) {
  return {
    texto,
    conceito: 'desfazer',
    aposAnteriores: true,
    espera,
    verificar: (e) => e.marcos.has(marco) && Boolean(doc(e)) && contem(doc(e).texto(), trechoRecuperado),
    dica: 'Aperte Ctrl + Z, ou clique na seta curva para trás no alto da janela do Word.',
    caminho: [passo('word.qat.desfazer', 'Clique em Desfazer (a seta curva para trás).')],
  };
}

// ---------------- arquivos e pastas ----------------

const naoNaLixeira = (e, nome, tipo) => e.fs.procurar(nome, tipo).length > 0;

export function restaurar(nome, { tipo = 'docx', texto } = {}) {
  return {
    texto: texto || `Restaure ${aspas(nome)} da Lixeira`,
    conceito: 'lixeira',
    verificar: (e) => e.marcos.has(`arquivo:restaurar:${nome}`) || naoNaLixeira(e, nome, tipo),
    dica: `Dê dois cliques na Lixeira (Área de Trabalho), clique com o botão direito em ${nome} e escolha Restaurar.`,
    caminho: [
      passo('area.icone.Lixeira', 'Dê dois cliques na Lixeira.', { acao: 'duplo' }),
      passo(`explorador.item.${nome}`, `Clique com o botão direito em ${nome}.`, { acao: 'direito' }),
      passo('contexto.restaurar', 'Clique em Restaurar.'),
    ],
    util: (ev) => ev.tipo === 'navegar' && ev.pasta === LIXEIRA,
  };
}

export function renomear(de, para, { tipo = 'docx', texto } = {}) {
  return {
    texto: texto || `Renomeie ${aspas(de)} para ${aspas(para)}`,
    conceito: 'renomear',
    verificar: (e) => e.fs.procurar(para, tipo).length > 0 && e.fs.procurar(de, tipo).length === 0,
    dica: `Clique com o botão direito em ${de} e escolha Renomear (ou selecione e aperte F2). Digite ${para} e aperte Enter.`,
    caminho: [
      passo(`explorador.item.${de}`, `Clique com o botão direito em ${de}.`, { acao: 'direito' }),
      passo('contexto.renomear', 'Clique em Renomear.'),
      passo('explorador.renomeando', `Digite ${para} e aperte Enter.`, { valor: para, confirmar: 'enter' }),
    ],
    diagnosticar: (ev) =>
      ev.tipo === 'arquivo' && ev.acao === 'renomear' && ev.antigo === de && comparavel(ev.nome) !== comparavel(para)
        ? `O nome ficou ${aspas(ev.nome)}. A missão pede ${aspas(para)}: renomeie de novo (F2).`
        : null,
  };
}

export function criarPasta(nome, { dentro = 'Documentos', texto } = {}) {
  const caminho = `${dentro}/${nome}`;
  return {
    texto: texto || `Crie a pasta ${aspas(nome)} dentro de ${dentro}`,
    conceito: 'nova-pasta',
    verificar: (e) => e.fs.pastaExiste(caminho),
    dica: `No Explorador, entre em ${dentro}, clique em Novo › Pasta, digite ${nome} e aperte Enter.`,
    caminho: [
      passo('barra.explorador', 'Abra o Explorador de Arquivos (pasta amarela na barra de tarefas).'),
      passo(`explorador.nav.${dentro}`, `Entre em ${dentro}.`, { feito: (c) => c.pastaDoExplorador() === dentro }),
      passo('explorador.novo', 'Clique em Novo.'),
      passo('explorador.novo.pasta', 'Clique em Pasta.'),
      passo('explorador.renomeando', `Digite ${nome} e aperte Enter.`, { valor: nome, confirmar: 'enter' }),
    ],
    diagnosticar: (ev) =>
      ev.tipo === 'arquivo' && ev.acao === 'renomear' && ev.tipoItem === 'pasta' && comparavel(ev.nome) !== comparavel(nome) && ev.antigo.startsWith('Nova pasta')
        ? `A pasta ficou com o nome ${aspas(ev.nome)}. Renomeie para ${aspas(nome)} (botão direito › Renomear).`
        : null,
  };
}

export function moverPara(nome, pasta, { tipo = 'docx', texto } = {}) {
  return {
    texto: texto || `Mova ${aspas(nome)} para a pasta ${aspas(pasta.split('/').pop())}`,
    conceito: 'nova-pasta',
    verificar: (e) => Boolean(e.fs.obter(pasta, nome, tipo)),
    dica: `Arraste ${nome} até a pasta ${pasta.split('/').pop()}. Ou clique com o botão direito › Recortar, entre na pasta e clique com o botão direito › Colar.`,
    caminho: [
      passo(`explorador.item.${nome}`, `Clique com o botão direito em ${nome}. (Também dá para arrastar até a pasta.)`, { acao: 'direito' }),
      passo('contexto.recortar', 'Clique em Recortar.', { feito: (c) => c.arquivoRecortado(nome) }),
      passo(`explorador.item.${pasta.split('/').pop()}`, `Agora dê dois cliques na pasta ${pasta.split('/').pop()} para entrar nela.`, {
        acao: 'duplo',
        feito: (c) => c.arquivoRecortado(nome) && c.pastaDoExplorador() === pasta,
      }),
      passo('explorador.lista', 'Clique com o botão direito no espaço vazio da pasta.', { acao: 'direito' }),
      passo('contexto.colar', 'Clique em Colar.'),
    ],
    diagnosticar: (ev) =>
      ev.tipo === 'arquivo' && ev.acao === 'copiar' && ev.nome.startsWith(nome)
        ? 'Você COPIOU o arquivo (agora existem dois). Para mover, use Recortar em vez de Copiar.'
        : null,
  };
}

export function excluir(nome, { tipo = 'txt', texto } = {}) {
  return {
    texto: texto || `Exclua ${aspas(nome)}`,
    conceito: 'lixeira',
    verificar: (e) => e.fs.procurar(nome, tipo).length === 0,
    dica: `Clique em ${nome} e aperte Delete (ou botão direito › Excluir). Ele vai para a Lixeira.`,
    caminho: [passo(`explorador.item.${nome}`, `Clique com o botão direito em ${nome}.`, { acao: 'direito' }), passo('contexto.excluir', 'Clique em Excluir.')],
    diagnosticar: (ev) =>
      ev.tipo === 'arquivo' && ev.acao === 'excluir' && ev.nome !== nome ? `Ops, você excluiu ${aspas(ev.nome)}. Restaure da Lixeira e exclua ${aspas(nome)}.` : null,
  };
}

// ---------------- formatação de caracteres ----------------

const COMANDO_DA_PROPRIEDADE = {
  negrito: ['negrito'],
  italico: ['italico'],
  sublinhado: ['sublinhado'],
  fonte: ['fonte'],
  tamanho: ['tamanho', 'aumentarFonte', 'diminuirFonte'],
  cor: ['cor'],
  realce: ['realce'],
};

const NOMES = { negrito: 'Negrito', italico: 'Itálico', sublinhado: 'Sublinhado', fonte: 'a fonte', tamanho: 'o tamanho', cor: 'a cor', realce: 'o realce' };

/** Cores pedidas pelo nome; o teste aceita qualquer tom parecido */
export const CORES = {
  vermelho: ([r, g, b]) => r >= 150 && g <= 90 && b <= 90,
  azul: ([r, g, b]) => b >= 130 && r <= 90 && g <= 160,
  verde: ([r, g, b]) => g >= 110 && r <= 110 && b <= 110,
  amarelo: ([r, g, b]) => r >= 200 && g >= 200 && b <= 140,
  automatico: ([r, g, b]) => r <= 60 && g <= 60 && b <= 60,
};

function confere(estilo, props) {
  if (!estilo) return false;
  return Object.entries(props).every(([prop, esperado]) => {
    const valor = estilo[prop];
    if (prop === 'fonte') return typeof valor === 'string' && comparavel(valor) === comparavel(esperado);
    if (prop === 'tamanho') return typeof valor === 'number' && Math.abs(valor - esperado) < 0.6;
    if (prop === 'cor' || prop === 'realce') return Array.isArray(valor) && CORES[esperado](valor);
    return valor === esperado;
  });
}

function descreverProps(props) {
  return Object.entries(props)
    .map(([p, v]) => {
      if (p === 'fonte') return `fonte ${v}`;
      if (p === 'tamanho') return `tamanho ${v}`;
      if (p === 'cor') return `cor ${v}`;
      if (p === 'realce') return `realce ${v}`;
      return v ? NOMES[p] : `sem ${NOMES[p]}`;
    })
    .join(' e ');
}

/**
 * O trecho precisa ter todas as propriedades. props: { negrito: true,
 * fonte: 'Arial Black', tamanho: 28, cor: 'vermelho', realce: 'amarelo' }
 */
export function formatarTrecho(trechoOuTrechos, props, { texto, conceito = 'negrito-italico-sublinhado', dica, caminho } = {}) {
  const trechos = [trechoOuTrechos].flat();
  const [trecho] = trechos;
  const comandos = Object.keys(props).flatMap((p) => COMANDO_DA_PROPRIEDADE[p] || []);
  const algumTrecho = (selecao) => trechos.some((t) => contem(selecao, t) || contem(t, selecao));
  return {
    texto: texto || `Aplique ${descreverProps(props)} em ${trechos.map(aspas).join(' e ')}`,
    conceito,
    verificar: (e) => Boolean(doc(e)) && trechos.every((t) => confere(doc(e).estilo(t), props)),
    dica: dica || `Selecione ${aspas(trecho)} (dois cliques na palavra) e use ${descreverProps(props)} na guia Página Inicial.`,
    caminho: caminho || [passoTrecho(trecho), ...caminhoFaixa('inicio', comandos[0], 'Clique na guia Página Inicial.', `Clique em ${NOMES[Object.keys(props)[0]]}.`)],
    util: (ev) => ev.tipo === 'comando' && comandos.includes(ev.comando) && algumTrecho(ev.selecao || ''),
    diagnosticar: (ev) => {
      if (ev.tipo !== 'comando' || !comandos.includes(ev.comando)) return null;
      if (ev.vazio) return `Nada estava selecionado, então a formatação não foi para ${aspas(trecho)}. Primeiro selecione: dois cliques na palavra.`;
      if (ev.selecao && !algumTrecho(ev.selecao)) {
        return `Você aplicou em ${aspas(ev.selecao.trim().slice(0, 40))}, mas a missão pede em ${aspas(trecho)}. Desfaça com Ctrl + Z se quiser.`;
      }
      return null;
    },
  };
}

/**
 * Trocou "de" por "para"? Se o texto novo contém o antigo ("Esconderijo" →
 * "Esconderijo secreto"), conta: toda ocorrência do antigo tem que fazer
 * parte de uma do novo.
 */
export function trocou(d, de, para) {
  const novos = d.contarOcorrencias(para);
  if (novos === 0) return false;
  return contem(para, de) ? d.contarOcorrencias(de) === novos : d.contarOcorrencias(de) === 0;
}

/** Trocar um pedaço do texto por outro (digitando por cima) */
export function trocarTexto(de, para, { texto, conceito = 'editar-texto' } = {}) {
  return {
    texto: texto || `Troque ${aspas(de)} por ${aspas(para)}`,
    conceito,
    verificar: (e) => Boolean(doc(e)) && trocou(doc(e), de, para),
    dica: `Dê dois cliques em ${de} para selecionar e digite ${para}: o que você digita entra no lugar do que estava selecionado.`,
    caminho: [passoTrecho(de, `Dê dois cliques em ${aspas(de)} para selecionar.`), passo('word.folha', `Agora digite ${para}: o texto selecionado é trocado pelo que você digitar.`, { digitar: para })],
    util: (ev) => ev.tipo === 'digitar' && ev.app === 'word',
    diagnosticar: (ev, e) =>
      ev.tipo === 'digitar' && doc(e) && doc(e).contarOcorrencias(para) > 0 && !trocou(doc(e), de, para)
        ? `Você escreveu ${aspas(para)}, mas ${aspas(de)} continua lá. Apague (selecione e aperte Delete).`
        : null,
  };
}

/** Formato igual ao de outro trecho (missão do Pincel) */
export function mesmoFormato(trecho, modelo, { texto, props } = {}) {
  return {
    texto: texto || `Use o Pincel de Formatação para deixar ${aspas(trecho)} igual a ${aspas(modelo)}`,
    conceito: 'pincel',
    verificar: (e) => {
      const d = doc(e);
      return Boolean(d) && e.marcos.has('comando:pincel') && confere(d.estilo(trecho), props);
    },
    dica: `Clique em ${modelo}, depois no Pincel de Formatação (Página Inicial, à esquerda): o cursor vira um pincel. Então dê dois cliques em ${trecho} (ou arraste o mouse sobre ela) para "pintar".`,
    caminho: [
      passoTrecho(modelo, `1º Clique dentro da palavra ${modelo}: é dela que o pincel vai copiar a formatação.`, {
        dentro: true,
        feito: (c) => Boolean(c.word()?.pincel) || c.cursorDentro(modelo),
      }),
      passo('word.guia.inicio', 'Clique na guia Página Inicial.'),
      passo('word.faixa.inicio.pincel', `2º Clique no Pincel de Formatação. Ele copia a formatação de ${modelo}.`, { feito: (c) => Boolean(c.word()?.pincel) }),
      passoTrecho(trecho, `3º O cursor virou um pincel! Agora "pinte" ${trecho}: dê dois cliques na palavra (ou arraste o mouse sobre ela).`, { acao: 'duplo' }),
    ],
    util: (ev) => ev.tipo === 'comando' && ev.comando === 'pincel',
    diagnosticar: (ev, e) => {
      if (ev.tipo === 'comando' && ev.comando === 'pincelAplicado' && !contem(ev.selecao || '', trecho)) {
        return `O pincel pintou ${aspas((ev.selecao || '').trim().slice(0, 30))}, mas a missão pede ${aspas(trecho)}. Desfaça (Ctrl + Z) e tente de novo.`;
      }
      if (ev.tipo === 'comando' && ['negrito', 'cor'].includes(ev.comando) && doc(e) && confere(doc(e).estilo(trecho), props) && !e.marcos.has('comando:pincel')) {
        return `Ficou igual, mas feito à mão. A missão é usar o Pincel de Formatação: clique em ${modelo}, depois no Pincel e pinte ${trecho}.`;
      }
      return null;
    },
  };
}

export function textoIgual(trecho, esperado, { texto, conceito = 'maiusculas', dica, caminho } = {}) {
  return {
    texto,
    conceito,
    verificar: (e) => Boolean(doc(e)) && doc(e).texto().includes(esperado),
    dica,
    caminho: caminho || [passoTrecho(trecho)],
    util: (ev) => ev.tipo === 'comando' && ev.comando === 'maiusculas',
    diagnosticar: (ev, e) =>
      ev.tipo === 'comando' && ['maiusculas', 'maiusculasCiclo'].includes(ev.comando) && doc(e) && !doc(e).texto().includes(esperado)
        ? `Ainda não ficou como pedido: ${aspas(esperado)}. Selecione o parágrafo inteiro (três cliques nele) e escolha de novo.`
        : null,
  };
}

export function semFormatacaoExtra(trecho, { texto, dica } = {}) {
  return {
    texto: texto || `Limpe a formatação do parágrafo que começa com ${aspas(trecho)}`,
    conceito: 'limpar-formatacao',
    verificar: (e) => {
      const d = doc(e);
      const p = d && d.paragrafo(trecho);
      return Boolean(p) && p.uniforme && !p.colorido;
    },
    dica: dica || 'Selecione o parágrafo inteiro (três cliques nele) e clique em Limpar Toda a Formatação (o "A" com a borracha, na guia Página Inicial).',
    caminho: [
      passoTrecho(trecho, 'Dê três cliques rápidos no parágrafo para selecionar ele inteiro.', { paragrafoInteiro: true }),
      passo('word.guia.inicio', 'Clique na guia Página Inicial.'),
      passo('word.faixa.inicio.limparFormatacao', 'Clique em Limpar Toda a Formatação (o A com a borracha).'),
    ],
    util: (ev) => ev.tipo === 'comando' && ev.comando === 'limparFormatacao',
    diagnosticar: (ev, e) => {
      const p = ev.tipo === 'comando' && ev.comando === 'limparFormatacao' && doc(e)?.paragrafo(trecho);
      return p && (!p.uniforme || p.colorido) ? 'Limpou só um pedaço: ainda tem cor ou fonte diferente no parágrafo. Selecione ele inteiro (três cliques) e limpe de novo.' : null;
    },
  };
}

// ---------------- parágrafo ----------------

const ALINHAMENTOS = {
  center: { nome: 'centralizado', comando: 'centralizar', botao: 'Centralizar', atalho: 'Ctrl + E' },
  right: { nome: 'alinhado à direita', comando: 'alinharDireita', botao: 'Alinhar à Direita', atalho: 'Ctrl + G' },
  left: { nome: 'alinhado à esquerda', comando: 'alinharEsquerda', botao: 'Alinhar à Esquerda', atalho: 'Ctrl + Q' },
  justify: { nome: 'justificado', comando: 'justificar', botao: 'Justificar', atalho: 'Ctrl + J' },
};

export function alinhar(trecho, alinhamento, { texto, rotulo } = {}) {
  const a = ALINHAMENTOS[alinhamento];
  return {
    texto: texto || `Deixe ${rotulo || aspas(trecho)} ${a.nome}`,
    conceito: 'alinhamento',
    verificar: (e) => doc(e)?.paragrafo(trecho)?.alinhamento === alinhamento,
    dica: `Clique em qualquer lugar de ${aspas(trecho)} e use ${a.botao} na guia Página Inicial (${a.atalho}).`,
    caminho: [passoCursor(trecho, `Clique em qualquer lugar de ${aspas(trecho)} (não precisa selecionar).`), ...caminhoFaixa('inicio', a.comando, 'Clique na guia Página Inicial.', `Clique em ${a.botao}.`)],
    util: (ev) => ev.tipo === 'comando' && ev.comando === a.comando && contem(ev.paragrafo || '', trecho),
    diagnosticar: (ev) =>
      ev.tipo === 'comando' && ev.comando === a.comando && ev.paragrafo && !contem(ev.paragrafo, trecho)
        ? `Esse alinhamento foi para o parágrafo ${aspas(ev.paragrafo.slice(0, 40))}. Clique primeiro dentro de ${aspas(trecho)}.`
        : null,
  };
}

export function lista(itens, tipo, { texto } = {}) {
  const nome = tipo === 'numerada' ? 'Numeração' : 'Marcadores';
  return {
    texto: texto || `Transforme ${itens.map(aspas).join(', ')} numa lista com ${nome.toLowerCase()}`,
    conceito: 'listas',
    verificar: (e) => Boolean(doc(e)) && itens.every((i) => doc(e).paragrafo(i)?.lista === tipo),
    dica: `Selecione as linhas (arraste de ${itens[0]} até ${itens[itens.length - 1]}) e clique em ${nome} na guia Página Inicial.`,
    caminho: [
      { trecho: itens[0], ate: itens[itens.length - 1], texto: `Arraste o mouse de ${aspas(itens[0])} até ${aspas(itens[itens.length - 1])}.` },
      ...caminhoFaixa('inicio', tipo === 'numerada' ? 'numeracao' : 'marcadores', 'Clique na guia Página Inicial.', `Clique em ${nome}.`),
    ],
    util: (ev) => ev.tipo === 'comando' && ['marcadores', 'numeracao'].includes(ev.comando),
    diagnosticar: (ev) => {
      if (ev.tipo !== 'comando' || !['marcadores', 'numeracao'].includes(ev.comando)) return null;
      const certo = tipo === 'numerada' ? 'numeracao' : 'marcadores';
      if (ev.comando !== certo) return `Esta lista é com ${nome.toLowerCase()}, não com ${ev.comando === 'numeracao' ? 'números' : 'marcadores'}. Clique no outro botão.`;
      return null;
    },
  };
}

export function itemNaLista(item, tipo, { texto, depoisDe } = {}) {
  return {
    texto: texto || `Acrescente o item ${aspas(item)} na lista`,
    conceito: 'listas',
    verificar: (e) => doc(e)?.paragrafo(item)?.lista === tipo,
    dica: `Clique no fim de ${aspas(depoisDe)}, aperte Enter (aparece um item novo) e digite ${item}.`,
    caminho: [
      {
        trecho: depoisDe,
        fim: true,
        enter: true,
        texto: `Clique logo depois de ${aspas(depoisDe)} (no fim da linha) e aperte Enter: aparece um item novo.`,
        feito: (c) => c.cursorNoItemDepois(depoisDe),
      },
      passo('word.folha', `Agora digite ${item}.`, { digitar: item }),
    ],
    util: (ev) => ev.tipo === 'digitar',
  };
}

export function recuoPrimeiraLinha(trechos, cm, { texto } = {}) {
  return {
    texto: texto || `Recue a primeira linha dos parágrafos em ${String(cm).replace('.', ',')} cm`,
    conceito: 'recuo-espacamento',
    verificar: (e) => Boolean(doc(e)) && trechos.every((t) => Math.abs((doc(e).paragrafo(t)?.recuoPrimeiraLinhaCm ?? 0) - cm) <= 0.15),
    dica: `Selecione os parágrafos, abra a janela Parágrafo (setinha no canto do grupo Parágrafo), em Especial escolha "Primeira linha" e em Por digite ${String(cm).replace('.', ',')} cm.`,
    caminho: [
      { trecho: trechos[0], ate: trechos[trechos.length - 1], texto: 'Selecione os parágrafos (arraste do primeiro até o último).' },
      passo('word.guia.inicio', 'Clique na guia Página Inicial.'),
      passo('word.faixa.inicio.paragrafoDialogo', 'Clique na setinha no canto do grupo Parágrafo.'),
      passo('dialogo.paragrafo.especial', 'Em Especial, escolha "Primeira linha".', { escolher: 'primeira' }),
      passoCampo('dialogo.paragrafo.por', `${String(cm).replace('.', ',')} cm`, `Em Por, deixe ${String(cm).replace('.', ',')} cm.`),
      passo('dialogo.paragrafo.ok', 'Clique em OK.'),
    ],
    util: (ev) => ev.tipo === 'dialogo' && ev.nome === 'paragrafo',
  };
}

export function entreLinhas(trechos, valor, { texto } = {}) {
  const rotulo = String(valor).replace('.', ',');
  return {
    texto: texto || `Use espaçamento de ${rotulo} entre linhas`,
    conceito: 'recuo-espacamento',
    verificar: (e) => Boolean(doc(e)) && trechos.every((t) => Math.abs((doc(e).paragrafo(t)?.entreLinhas ?? 0) - valor) < 0.05),
    dica: `Selecione os parágrafos e clique no botão Espaçamento de Linha e Parágrafo (as setinhas para cima e para baixo) › ${rotulo}.`,
    caminho: [
      { trecho: trechos[0], ate: trechos[trechos.length - 1], texto: 'Selecione os parágrafos.' },
      ...caminhoFaixa('inicio', 'entreLinhas', 'Clique na guia Página Inicial.', 'Clique em Espaçamento de Linha e Parágrafo.'),
      passo(`word.menu.entreLinhas.${rotulo}`, `Escolha ${rotulo}.`),
    ],
    util: (ev) => ev.tipo === 'comando' && ev.comando === 'entreLinhas',
  };
}

const ESTILOS = { titulo1: 'Título 1', titulo2: 'Título 2', titulo: 'Título', normal: 'Normal' };

export function estiloParagrafo(trechos, estilo, { texto } = {}) {
  return {
    texto: texto || `Aplique o estilo ${ESTILOS[estilo]} em ${trechos.map(aspas).join(', ')}`,
    conceito: 'estilos',
    verificar: (e) => Boolean(doc(e)) && trechos.every((t) => doc(e).paragrafo(t)?.estilo === estilo),
    dica: `Clique em cada título e escolha ${ESTILOS[estilo]} na galeria Estilos (Página Inicial, à direita).`,
    caminho: [
      passoCursor(
        (e) => trechos.find((t) => doc(e)?.paragrafo(t)?.estilo !== estilo) || trechos[0],
        `Clique no título que ainda falta (${trechos.length > 1 ? 'um de cada vez' : 'não precisa selecionar'}).`
      ),
      ...caminhoFaixa('inicio', `estilo.${estilo}`, 'Clique na guia Página Inicial.', `Clique em ${ESTILOS[estilo]} na galeria de estilos.`),
    ],
    util: (ev) => ev.tipo === 'comando' && ev.comando === `estilo.${estilo}`,
    diagnosticar: (ev) =>
      ev.tipo === 'comando' && ev.comando?.startsWith('estilo.') && ev.comando !== `estilo.${estilo}` && trechos.some((t) => contem(ev.paragrafo || '', t))
        ? `Esse é o estilo ${ESTILOS[ev.comando.slice(7)] || 'errado'}. A missão pede ${ESTILOS[estilo]}.`
        : null,
  };
}

export function painelNavegacao({ texto = 'Abra o Painel de Navegação para ver os títulos' } = {}) {
  return {
    texto,
    conceito: 'painel-navegacao',
    verificar: (e) => Boolean(e.word?.painelNavegacao),
    dica: 'Na guia Exibir, marque a caixinha "Painel de Navegação".',
    caminho: caminhoFaixa('exibir', 'painelNavegacao', 'Clique na guia Exibir.', 'Marque "Painel de Navegação".'),
  };
}

// ---------------- inserir ----------------

export function inserirImagem(nome, { texto } = {}) {
  return {
    texto: texto || `Insira a imagem ${aspas(nome)} da pasta Imagens`,
    conceito: 'imagem',
    verificar: (e) => Boolean(doc(e)) && doc(e).imagens().some((i) => comparavel(i.nome) === comparavel(nome)),
    dica: `Clique onde a imagem deve entrar, vá em Inserir › Imagens › Este Dispositivo, escolha ${nome} e clique em Inserir.`,
    caminho: [
      passo('word.guia.inserir', 'Clique na guia Inserir.'),
      passo('word.faixa.inserir.imagens', 'Clique em Imagens.'),
      passo('word.menu.imagens.dispositivo', 'Clique em Este Dispositivo...'),
      passo(`dialogo.abrir.item.${nome}`, `Clique em ${nome}.`, { feito: (c) => comparavel(c.valorDoCampo('dialogo.abrir.nome')) === comparavel(nome) }),
      passo('dialogo.abrir.ok', 'Clique em Inserir.'),
    ],
    util: (ev) => ev.tipo === 'dialogo' && ev.nome === 'inserirImagem',
  };
}

export function tamanhoDaImagem(nome, { maxCm, minCm = 2, texto } = {}) {
  return {
    texto: texto || `Diminua a imagem para no máximo ${maxCm} cm de largura`,
    conceito: 'imagem',
    verificar: (e) => Boolean(doc(e)) && doc(e).imagens().some((i) => comparavel(i.nome) === comparavel(nome) && i.larguraCm <= maxCm + 0.05 && i.larguraCm >= minCm),
    dica: `Clique na imagem e arraste uma bolinha do canto para dentro. Ou, na guia Formato da Imagem, mude a Largura para ${maxCm} cm.`,
    caminho: [
      { imagem: nome, texto: 'Clique na imagem para selecionar (aparecem bolinhas nos cantos).' },
      passo('word.guia.formatoImagem', 'Clique na guia Formato da Imagem.'),
      { ...passoCampo('word.faixa.formatoImagem.larguraImagem', `${maxCm} cm`, `Em Largura, digite ${maxCm} e aperte Enter. (Arrastar a bolinha do canto também funciona.)`), confirmar: 'enter' },
    ],
    util: (ev) => ev.tipo === 'comando' && ev.comando === 'tamanhoImagem',
  };
}

export function imagemCentralizada(nome, { texto = 'Centralize a imagem' } = {}) {
  return {
    texto,
    conceito: 'alinhamento',
    verificar: (e) => Boolean(doc(e)) && doc(e).imagens().some((i) => comparavel(i.nome) === comparavel(nome) && i.alinhamento === 'center'),
    dica: 'Clique na imagem e use Centralizar (Página Inicial) ou Ctrl + E.',
    caminho: [{ imagem: nome, texto: 'Clique na imagem para selecionar.' }, ...caminhoFaixa('inicio', 'centralizar', 'Clique na guia Página Inicial.', 'Clique em Centralizar.')],
  };
}

export function inserirTabela(colunas, linhas, { texto } = {}) {
  return {
    texto: texto || `Insira uma tabela com ${colunas} colunas e ${linhas} linhas`,
    conceito: 'tabela',
    verificar: (e) => Boolean(doc(e)) && doc(e).tabelas().some((t) => t.colunas === colunas && t.linhas >= linhas),
    dica: `Vá em Inserir › Tabela e passe o mouse pelos quadradinhos até aparecer "Tabela ${colunas}x${linhas}" (${colunas} colunas, ${linhas} linhas). Aí clique.`,
    caminho: [
      passo('word.guia.inserir', 'Clique na guia Inserir.'),
      passo('word.faixa.inserir.tabela', 'Clique em Tabela.'),
      passo(`word.menu.tabela.${colunas}x${linhas}`, `Passe o mouse até marcar ${colunas} colunas e ${linhas} linhas, e clique.`),
    ],
    diagnosticar: (ev) =>
      ev.tipo === 'comando' && ev.comando === 'inserirTabela' && (ev.colunas !== colunas || ev.linhas !== linhas)
        ? `Essa tabela tem ${ev.colunas} colunas e ${ev.linhas} linhas. A missão pede ${colunas} colunas e ${linhas} linhas. Desfaça (Ctrl + Z) e tente de novo.`
        : null,
  };
}

export function cabecalhoDaTabela(textos, { texto, negrito = true } = {}) {
  return {
    texto: texto || `Na primeira linha da tabela, escreva ${textos.map(aspas).join(', ')}${negrito ? ' em negrito' : ''}`,
    conceito: 'tabela',
    verificar: (e) =>
      Boolean(doc(e)) &&
      doc(e)
        .tabelas()
        .some((t) => textos.every((txt, i) => comparavel(t.celulas[0]?.[i]) === comparavel(txt)) && (!negrito || t.primeiraLinhaNegrito)),
    dica: 'Clique na primeira célula, digite e aperte Tab para ir para a próxima. Depois selecione a linha toda e aperte Negrito (Ctrl + N).',
    caminho: [
      ...textos.map((t, i) => ({ tabela: { linha: 0, coluna: i }, valor: t, texto: i === 0 ? `Clique nesta célula e digite ${t}. (Tab passa para a célula ao lado.)` : `Digite ${t} nesta célula.` })),
      ...(negrito
        ? [
            { tabelaLinha: 0, texto: 'Selecione a primeira linha inteira: arraste o mouse da primeira até a última célula.' },
            ...caminhoFaixa('inicio', 'negrito', 'Clique na guia Página Inicial.', 'Clique em Negrito (N).'),
          ]
        : []),
    ],
    util: (ev) => ev.tipo === 'digitar',
  };
}

export function linhasDaTabela(minimo, { texto } = {}) {
  return {
    texto: texto || 'Acrescente uma linha no fim da tabela',
    conceito: 'tabela',
    aposAnteriores: true,
    verificar: (e) => Boolean(doc(e)) && doc(e).tabelas().some((t) => t.linhas >= minimo),
    dica: 'Clique com o botão direito na última linha › Inserir › Inserir Linhas Abaixo. Ou clique na última célula e aperte Tab.',
    caminho: [
      { tabela: { ultimaLinha: true }, acao: 'direito', texto: 'Clique com o botão direito na última linha da tabela.' },
      passo('contexto.inserir', 'Aponte para Inserir.'),
      passo('contexto.inserirLinhaAbaixo', 'Clique em Inserir Linhas Abaixo.'),
    ],
  };
}

export function comecaNovaPagina(trecho, { texto } = {}) {
  return {
    texto: texto || `Faça ${aspas(trecho)} começar numa página nova`,
    conceito: 'quebra-pagina',
    verificar: (e) => Boolean(doc(e)) && doc(e).comecaPaginaNova(trecho),
    dica: `Clique bem no começo de ${aspas(trecho)} e use Inserir › Quebra de Página (ou Ctrl + Enter).`,
    caminho: [{ trecho, inicio: true, texto: `Clique bem no começo de ${aspas(trecho)}, antes da primeira letra.` }, ...caminhoFaixa('inserir', 'quebraPagina', 'Clique na guia Inserir.', 'Clique em Quebra de Página.')],
    util: (ev) => ev.tipo === 'comando' && ev.comando === 'quebraPagina',
    diagnosticar: (ev, e) =>
      ev.tipo === 'digitar' && ev.tecla === 'Enter' && doc(e) && doc(e).paragrafosVaziosSeguidos() >= 4
        ? 'Apertar Enter várias vezes até a próxima página dá trabalho e bagunça quando o texto muda. Use a Quebra de Página (Ctrl + Enter).'
        : null,
  };
}

export function cabecalho(textoCabecalho, { texto } = {}) {
  return {
    texto: texto || `Escreva ${aspas(textoCabecalho)} no cabeçalho`,
    conceito: 'cabecalho-rodape',
    verificar: (e) => contem(e.word?.cabecalho || '', textoCabecalho),
    dica: `Vá em Inserir › Cabeçalho › Em branco (ou dê dois cliques no alto da página), digite ${textoCabecalho} e clique em Fechar Cabeçalho e Rodapé.`,
    caminho: [
      passo('word.cabecalho', 'Dê dois cliques aqui, no alto da página, para abrir o cabeçalho. (Ou use Inserir › Cabeçalho › Em branco.)', {
        acao: 'duplo',
        feito: (c) => c.word()?.editandoMargem === 'cabecalho',
      }),
      passo('word.cabecalho', `Digite ${textoCabecalho}. Depois é só clicar em Fechar Cabeçalho e Rodapé.`, { digitar: textoCabecalho }),
    ],
  };
}

export function numeroDePagina({ texto = 'Coloque o número da página no rodapé' } = {}) {
  return {
    texto,
    conceito: 'cabecalho-rodape',
    verificar: (e) => Boolean(e.word?.numeroPagina),
    dica: 'Vá em Inserir › Número de Página › Fim da Página e escolha um modelo.',
    caminho: [
      passo('word.guia.inserir', 'Clique na guia Inserir.'),
      passo('word.faixa.inserir.numeroPagina', 'Clique em Número de Página.'),
      passo('word.menu.numeroPagina.fim', 'Aponte para Fim da Página.'),
      passo('word.menu.numeroPagina.centro', 'Escolha o número no centro.'),
    ],
  };
}

export function inserirSumario({ texto = 'Insira um Sumário Automático no começo' } = {}) {
  return {
    texto,
    conceito: 'sumario',
    verificar: (e) => Boolean(doc(e)?.sumario()),
    dica: 'Clique no começo do documento, vá em Referências › Sumário e escolha Sumário Automático 1.',
    caminho: [
      { trecho: null, inicioDoDocumento: true, texto: 'Clique no comecinho do documento (antes da primeira palavra).' },
      passo('word.guia.referencias', 'Clique na guia Referências.'),
      passo('word.faixa.referencias.sumario', 'Clique em Sumário.'),
      passo('word.menu.sumario.auto1', 'Escolha Sumário Automático 1.'),
    ],
  };
}

export function sumarioAtualizado({ texto = 'Atualize o Sumário para ele mostrar o título novo', contendo } = {}) {
  return {
    texto,
    conceito: 'sumario',
    aposAnteriores: true,
    verificar: (e) => {
      const s = doc(e)?.sumario();
      return Boolean(s) && s.atualizado && (!contendo || s.entradas.some((t) => contem(t, contendo)));
    },
    dica: 'Clique no Sumário e em "Atualizar Sumário" (ou Referências › Atualizar Sumário).',
    caminho: caminhoFaixa('referencias', 'atualizarSumario', 'Clique na guia Referências.', 'Clique em Atualizar Sumário.'),
  };
}

// ---------------- revisão ----------------

export function substituirTudo(de, para, { texto, minimo = 1 } = {}) {
  return {
    texto: texto || `Troque todos os ${aspas(de)} por ${aspas(para)}`,
    conceito: 'localizar-substituir',
    verificar: (e) => Boolean(doc(e)) && doc(e).contarOcorrencias(de) === 0 && doc(e).contarOcorrencias(para) >= minimo,
    dica: `Use Página Inicial › Substituir (Ctrl + U). Em Localizar escreva ${de}, em Substituir por escreva ${para} e clique em Substituir tudo.`,
    caminho: [
      ...caminhoFaixa('inicio', 'substituir', 'Clique na guia Página Inicial.', 'Clique em Substituir (à direita).'),
      passoCampo('dialogo.substituir.de', de),
      passoCampo('dialogo.substituir.para', para),
      passo('dialogo.substituir.tudo', 'Clique em Substituir tudo.'),
    ],
    util: (ev) => ev.tipo === 'dialogo' && ev.nome === 'substituir',
    diagnosticar: (ev, e) => {
      if (ev.tipo === 'digitar' && doc(e) && doc(e).contarOcorrencias(de) >= 3) {
        return null;
      }
      if (ev.tipo === 'comando' && ev.comando === 'substituirTudo' && ev.quantidade === 0) return `O Word não achou ${aspas(ev.de)}. Confira se escreveu igualzinho: ${de}.`;
      return null;
    },
  };
}

/**
 * Pergunta respondida no painel da Central (ex.: quantas vezes aparece...).
 * resposta pode ser um valor ou uma função do estado (ex.: contar as palavras
 * do documento como ele está agora).
 */
export function responder(id, pergunta, resposta, { conceito, dica, caminho = [] } = {}) {
  const certa = (e) => String(typeof resposta === 'function' ? resposta(e) : resposta);
  return {
    texto: pergunta,
    conceito,
    pergunta: { id },
    verificar: (e) => e.respostas[id] !== undefined && String(e.respostas[id]).trim() === certa(e),
    conferir: (valor, e) => String(valor).trim() === certa(e),
    dica,
    caminho,
  };
}

export function semErrosDeOrtografia(corretas, { texto = 'Corrija as palavras sublinhadas de vermelho' } = {}) {
  return {
    texto,
    conceito: 'ortografia',
    verificar: (e) => Boolean(doc(e)) && doc(e).errosOrtografia().length === 0 && corretas.every((c) => contem(doc(e).texto(), c)),
    dica: 'Clique com o botão direito em cada palavra sublinhada de vermelho e escolha a sugestão certa (a primeira da lista). Ou use Revisão › Ortografia (F7).',
    caminho: [
      { erro: true, acao: 'direito', texto: 'Clique com o botão direito nesta palavra sublinhada de vermelho.' },
      passo('contexto.sugestao.0', 'Escolha a palavra certa (a primeira da lista).'),
    ],
    util: (ev) => ev.tipo === 'comando' && ev.comando === 'corrigir',
  };
}

// ---------------- layout e PDF ----------------

export function orientacao(valor, { texto } = {}) {
  return {
    texto: texto || `Mude a orientação da página para ${valor === 'paisagem' ? 'Paisagem' : 'Retrato'}`,
    conceito: 'orientacao',
    verificar: (e) => e.word?.layout?.orientacao === valor,
    dica: `Na guia Layout, clique em Orientação › ${valor === 'paisagem' ? 'Paisagem' : 'Retrato'}.`,
    caminho: [...caminhoFaixa('layout', 'orientacao', 'Clique na guia Layout.', 'Clique em Orientação.'), passo(`word.menu.orientacao.${valor}`, `Escolha ${valor === 'paisagem' ? 'Paisagem' : 'Retrato'}.`)],
  };
}

export function margens(valor, { texto } = {}) {
  const nome = { estreita: 'Estreita', normal: 'Normal', moderada: 'Moderada', larga: 'Larga' }[valor];
  return {
    texto: texto || `Use margens ${nome.toLowerCase()}s`,
    conceito: 'orientacao',
    verificar: (e) => e.word?.layout?.margens === valor,
    dica: `Na guia Layout, clique em Margens › ${nome}.`,
    caminho: [...caminhoFaixa('layout', 'margens', 'Clique na guia Layout.', 'Clique em Margens.'), passo(`word.menu.margens.${valor}`, `Escolha ${nome}.`)],
  };
}

export function colunas(n, { texto } = {}) {
  return {
    texto: texto || `Divida o texto em ${n} colunas`,
    conceito: 'colunas',
    verificar: (e) => e.word?.layout?.colunas === n,
    dica: `Na guia Layout, clique em Colunas › ${n === 2 ? 'Duas' : 'Três'}.`,
    caminho: [...caminhoFaixa('layout', 'colunas', 'Clique na guia Layout.', 'Clique em Colunas.'), passo(`word.menu.colunas.${n}`, `Escolha ${n === 2 ? 'Duas' : 'Três'}.`)],
  };
}

export function exportarPdf(nome, { pasta = 'Documentos', texto } = {}) {
  return {
    texto: texto || `Salve uma cópia em PDF com o nome ${aspas(nome)} em ${pasta}`,
    conceito: 'pdf',
    aposAnteriores: true,
    verificar: (e) => Boolean(e.fs.obter(pasta, nome, 'pdf')),
    dica: `Vá em Arquivo › Exportar › Criar PDF/XPS. Escolha ${pasta}, confira o nome ${nome} e clique em Publicar.`,
    caminho: [
      passo('word.guia.arquivo', 'Clique em Arquivo.'),
      passo('word.arquivo.exportar', 'Clique em Exportar.'),
      passo('word.exportar.pdf', 'Clique em Criar PDF/XPS.'),
      passo(`dialogo.salvar.nav.${pasta}`, `Escolha ${pasta}.`, { feito: (c) => c.pastaDoDialogo() === pasta }),
      passoCampo('dialogo.salvar.nome', nome),
      passo('dialogo.salvar.ok', 'Clique em Publicar.'),
    ],
  };
}
