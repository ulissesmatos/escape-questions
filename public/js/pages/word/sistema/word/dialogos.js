import { h } from '../../../../core/dom.js';
import { Dialogo } from '../Dialogo.js';
import { FONTES, TAMANHOS } from './Faixa.js';

const numero = (texto) => parseFloat(String(texto).replace(',', '.').replace(/[^\d.]/g, '')) || 0;
const cm = (v) => `${String(Math.round(v * 100) / 100).replace('.', ',')} cm`;

/** Janela Parágrafo: alinhamento, recuos (com "Especial: Primeira linha") e espaçamento */
export async function dialogoParagrafo(word) {
  const p = word.estadoFaixa?.paragrafo || {};
  const sim = word.sim;
  const campo = (alvo, valor) => h('input', { type: 'text', class: 'dlg-campo', value: valor, 'data-alvo': alvo, spellcheck: false });
  const alinhamento = h(
    'select',
    { class: 'dlg-campo', 'data-alvo': 'dialogo.paragrafo.alinhamento' },
    [
      ['left', 'Esquerda'],
      ['center', 'Centralizado'],
      ['right', 'Direita'],
      ['justify', 'Justificada'],
    ].map(([v, r]) => h('option', { value: v, text: r, selected: p.alinhamento === v }))
  );
  const esquerda = campo('dialogo.paragrafo.esquerda', cm(p.recuoEsquerdoCm || 0));
  const especial = h(
    'select',
    { class: 'dlg-campo', 'data-alvo': 'dialogo.paragrafo.especial' },
    h('option', { value: 'nenhum', text: '(nenhum)' }),
    h('option', { value: 'primeira', text: 'Primeira linha', selected: (p.recuoPrimeiraLinhaCm || 0) > 0.01 }),
    h('option', { value: 'deslocamento', text: 'Deslocamento' })
  );
  const por = campo('dialogo.paragrafo.por', (p.recuoPrimeiraLinhaCm || 0) > 0.01 ? cm(p.recuoPrimeiraLinhaCm) : '');
  especial.addEventListener('change', () => {
    if (especial.value === 'primeira' && !numero(por.value)) por.value = '1,25 cm';
    if (especial.value === 'nenhum') por.value = '';
  });
  const antes = campo('dialogo.paragrafo.antes', `${p.espacoAntes ?? 0} pt`);
  const depois = campo('dialogo.paragrafo.depois', `${p.espacoDepois ?? 8} pt`);
  const entre = h(
    'select',
    { class: 'dlg-campo', 'data-alvo': 'dialogo.paragrafo.entreLinhas' },
    [
      [1, 'Simples'],
      [1.15, '1,15'],
      [1.5, '1,5 linha'],
      [2, 'Duplo'],
    ].map(([v, r]) => h('option', { value: v, text: r, selected: Math.abs((p.entreLinhas || 1.08) - v) < 0.05 }))
  );
  if (![1, 1.15, 1.5, 2].some((v) => Math.abs((p.entreLinhas || 1.08) - v) < 0.05)) entre.prepend(h('option', { value: p.entreLinhas || 1.08, text: 'Múltiplos (1,08)', selected: true }));

  const dlg = new Dialogo(sim, {
    nome: 'paragrafo',
    titulo: 'Parágrafo',
    largura: 460,
    classe: 'dlg-office',
    botoes: [
      { rotulo: 'OK', primario: true, valor: 'ok', alvo: 'dialogo.paragrafo.ok' },
      { rotulo: 'Cancelar', valor: null },
    ],
  });
  const linha = (rotulo, ...campos) => h('label', { class: 'dlg-linha' }, h('span', { text: rotulo }), ...campos);
  dlg.corpo.append(
    h('div', { class: 'dlg-abas' }, h('span', { class: 'ativa', text: 'Recuos e espaçamento' }), h('span', { text: 'Quebras de linha e de página' })),
    h('fieldset', { class: 'dlg-grupo' }, h('legend', { text: 'Geral' }), linha('Alinhamento:', alinhamento)),
    h('fieldset', { class: 'dlg-grupo' }, h('legend', { text: 'Recuo' }), linha('Esquerdo:', esquerda), h('div', { class: 'dlg-duas' }, linha('Especial:', especial), linha('Por:', por))),
    h('fieldset', { class: 'dlg-grupo' }, h('legend', { text: 'Espaçamento' }), h('div', { class: 'dlg-duas' }, linha('Antes:', antes), linha('Entre linhas:', entre)), linha('Depois:', depois))
  );
  if ((await dlg.abrir()) !== 'ok') return null;
  const primeira = especial.value === 'primeira' ? numero(por.value) : 0;
  return {
    alinhamento: alinhamento.value,
    esquerda: numero(esquerda.value),
    primeiraLinha: primeira,
    antes: numero(antes.value),
    depois: numero(depois.value),
    entreLinhas: Number(entre.value),
  };
}

/** Localizar e substituir (guias Localizar / Substituir / Ir para) */
export function dialogoSubstituir(word, { guia = 'substituir' } = {}) {
  const sim = word.sim;
  const de = h('input', { type: 'text', class: 'dlg-campo', 'data-alvo': 'dialogo.substituir.de', spellcheck: false, value: word.documento.textoSelecionado().slice(0, 60) || word.ultimaBusca || '' });
  const para = h('input', { type: 'text', class: 'dlg-campo', 'data-alvo': 'dialogo.substituir.para', spellcheck: false });
  const linhaPara = h('label', { class: 'dlg-linha' }, h('span', { text: 'Substituir por:' }), para);
  const abas = h('div', { class: 'dlg-abas' });
  const botoesSubstituir = [];
  const dlg = new Dialogo(sim, {
    nome: 'substituir',
    titulo: 'Localizar e substituir',
    largura: 480,
    classe: 'dlg-office',
    botoes: [],
  });
  const mostrarGuia = (g) => {
    guia = g;
    abas.replaceChildren(
      ...[
        ['localizar', 'Localizar'],
        ['substituir', 'Substituir'],
        ['irpara', 'Ir para'],
      ].map(([id, rotulo]) => h('button', { type: 'button', class: id === g ? 'ativa' : '', text: rotulo, onClick: () => mostrarGuia(id) }))
    );
    linhaPara.hidden = g !== 'substituir';
    botoesSubstituir.forEach((b) => (b.hidden = g !== 'substituir'));
  };
  const avisar = (texto) => Dialogo.mensagem(sim, { titulo: 'Microsoft Word', texto, nome: 'avisoBusca' });
  const proxima = async () => {
    word.ultimaBusca = de.value;
    if (!de.value) return;
    if (!word.documento.localizarProxima(de.value)) await avisar('Concluímos a pesquisa do documento. O item pesquisado não foi encontrado.');
    word.sim.emitir({ tipo: 'comando', comando: 'localizarProxima', origem: 'dialogo' });
  };
  const substituir = async () => {
    if (!de.value) return;
    if (word.documento.substituirSelecao(de.value, para.value)) word.sim.emitir({ tipo: 'comando', comando: 'substituir', origem: 'dialogo', de: de.value });
    await proxima();
  };
  const tudo = async () => {
    if (!de.value) return;
    const n = word.documento.substituirTudo(de.value, para.value);
    word.sim.emitir({ tipo: 'comando', comando: 'substituirTudo', origem: 'dialogo', de: de.value, para: para.value, quantidade: n });
    await avisar(n ? `Tudo pronto. Fizemos ${n} ${n === 1 ? 'substituição' : 'substituições'}.` : 'Não encontramos o texto que você está procurando.');
  };
  const botao = (rotulo, acao, alvo, classe = '') => h('button', { type: 'button', class: `dlg-botao ${classe}`, text: rotulo, 'data-alvo': alvo, onClick: acao });
  const bSubst = botao('Substituir', substituir, 'dialogo.substituir.um');
  const bTudo = botao('Substituir tudo', tudo, 'dialogo.substituir.tudo');
  botoesSubstituir.push(bSubst, bTudo);
  dlg.corpo.append(
    abas,
    h('label', { class: 'dlg-linha' }, h('span', { text: 'Localizar:' }), de),
    linhaPara,
    h('div', { class: 'dlg-botoes-linha' }, botao('Mais >>', () => {}, null, 'dlg-sem-acao'), bSubst, bTudo, botao('Localizar próxima', proxima, 'dialogo.substituir.proxima', 'dlg-primario'), botao('Cancelar', () => dlg.fechar(null), 'dialogo.substituir.cancelar'))
  );
  mostrarGuia(guia);
  return dlg.abrir();
}

export function dialogoContarPalavras(word) {
  const texto = word.inspetor.texto();
  const palavras = word.inspetor.contarPalavras();
  const dlg = new Dialogo(word.sim, { nome: 'contarPalavras', titulo: 'Contar palavras', largura: 340, classe: 'dlg-office', botoes: [{ rotulo: 'Fechar', primario: true }] });
  const linhas = [
    ['Páginas', word.documento.paginas.total],
    ['Palavras', palavras],
    ['Caracteres (sem espaços)', texto.replace(/\s/g, '').length],
    ['Caracteres (com espaços)', texto.replace(/\n/g, '').length],
    ['Parágrafos', texto.split('\n').filter((l) => l.trim()).length],
  ];
  dlg.corpo.append(h('p', { class: 'dlg-subtitulo', text: 'Estatísticas:' }), h('table', { class: 'dlg-tabela' }, linhas.map(([r, v]) => h('tr', {}, h('td', { text: r }), h('td', { text: v.toLocaleString('pt-BR') })))));
  return dlg.abrir();
}

export async function dialogoInserirTabela(word) {
  const colunas = h('input', { type: 'number', class: 'dlg-campo', value: 5, min: 1, max: 20 });
  const linhas = h('input', { type: 'number', class: 'dlg-campo', value: 2, min: 1, max: 50 });
  const dlg = new Dialogo(word.sim, {
    nome: 'inserirTabela',
    titulo: 'Inserir Tabela',
    largura: 320,
    classe: 'dlg-office',
    botoes: [
      { rotulo: 'OK', primario: true, valor: 'ok' },
      { rotulo: 'Cancelar', valor: null },
    ],
  });
  dlg.corpo.append(h('fieldset', { class: 'dlg-grupo' }, h('legend', { text: 'Tamanho da tabela' }), h('label', { class: 'dlg-linha' }, h('span', { text: 'Número de colunas:' }), colunas), h('label', { class: 'dlg-linha' }, h('span', { text: 'Número de linhas:' }), linhas)));
  if ((await dlg.abrir()) !== 'ok') return null;
  return { colunas: Math.max(1, Math.min(20, Number(colunas.value) || 1)), linhas: Math.max(1, Math.min(50, Number(linhas.value) || 1)) };
}

/** Janela Fonte (Ctrl+D) */
export async function dialogoFonte(word) {
  const e = word.estadoFaixa?.estilo || {};
  const fonte = h('select', { class: 'dlg-campo' }, FONTES.map((f) => h('option', { value: f, text: f, selected: f === e.fonte })));
  const estilo = h(
    'select',
    { class: 'dlg-campo' },
    ['Regular', 'Itálico', 'Negrito', 'Negrito Itálico'].map((r, i) => h('option', { value: i, text: r, selected: i === (e.negrito ? 2 : 0) + (e.italico ? 1 : 0) }))
  );
  const tamanho = h('select', { class: 'dlg-campo' }, TAMANHOS.map((t) => h('option', { value: t, text: String(t).replace('.', ','), selected: t === e.tamanho })));
  const sublinhado = h('input', { type: 'checkbox', checked: Boolean(e.sublinhado) });
  const tachado = h('input', { type: 'checkbox', checked: Boolean(e.tachado) });
  const amostra = h('div', { class: 'dlg-amostra', text: 'Calibri (Corpo)' });
  const atualizar = () => {
    Object.assign(amostra.style, {
      fontFamily: `"${fonte.value}"`,
      fontSize: `${Math.min(28, Number(tamanho.value))}pt`,
      fontWeight: Number(estilo.value) >= 2 ? 700 : 400,
      fontStyle: Number(estilo.value) % 2 ? 'italic' : 'normal',
      textDecorationLine: [sublinhado.checked && 'underline', tachado.checked && 'line-through'].filter(Boolean).join(' ') || 'none',
    });
    amostra.textContent = fonte.value;
  };
  for (const c of [fonte, estilo, tamanho, sublinhado, tachado]) c.addEventListener('change', atualizar);
  atualizar();
  const dlg = new Dialogo(word.sim, {
    nome: 'fonte',
    titulo: 'Fonte',
    largura: 460,
    classe: 'dlg-office',
    botoes: [
      { rotulo: 'OK', primario: true, valor: 'ok' },
      { rotulo: 'Cancelar', valor: null },
    ],
  });
  const linha = (r, c) => h('label', { class: 'dlg-linha' }, h('span', { text: r }), c);
  dlg.corpo.append(
    h('div', { class: 'dlg-tres' }, linha('Fonte:', fonte), linha('Estilo da fonte:', estilo), linha('Tamanho:', tamanho)),
    h('fieldset', { class: 'dlg-grupo' }, h('legend', { text: 'Efeitos' }), h('label', { class: 'dlg-check' }, sublinhado, ' Sublinhado'), h('label', { class: 'dlg-check' }, tachado, ' Tachado')),
    h('fieldset', { class: 'dlg-grupo' }, h('legend', { text: 'Visualização' }), amostra)
  );
  if ((await dlg.abrir()) !== 'ok') return null;
  return { fonte: fonte.value, tamanho: Number(tamanho.value), negrito: Number(estilo.value) >= 2, italico: Number(estilo.value) % 2 === 1, sublinhado: sublinhado.checked, tachado: tachado.checked };
}

export async function dialogoLink(word) {
  const selecionado = word.documento.textoSelecionado();
  const texto = h('input', { type: 'text', class: 'dlg-campo', value: selecionado, spellcheck: false });
  const url = h('input', { type: 'text', class: 'dlg-campo', value: 'https://', spellcheck: false, autofocus: true });
  const dlg = new Dialogo(word.sim, {
    nome: 'link',
    titulo: 'Inserir Hiperlink',
    largura: 460,
    classe: 'dlg-office',
    botoes: [
      { rotulo: 'OK', primario: true, valor: 'ok' },
      { rotulo: 'Cancelar', valor: null },
    ],
  });
  dlg.corpo.append(h('label', { class: 'dlg-linha' }, h('span', { text: 'Texto para exibição:' }), texto), h('label', { class: 'dlg-linha' }, h('span', { text: 'Endereço:' }), url));
  if ((await dlg.abrir()) !== 'ok' || !/^https?:\/\/\S+\.\S+/.test(url.value)) return null;
  return { texto: texto.value || url.value, url: url.value };
}

export async function dialogoDataHora(word) {
  const agora = new Date();
  const formatos = [
    agora.toLocaleDateString('pt-BR'),
    agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    agora.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
    agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    agora.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  ];
  const lista = h('select', { class: 'dlg-campo dlg-lista', size: formatos.length }, formatos.map((f, i) => h('option', { value: f, text: f, selected: i === 0 })));
  const dlg = new Dialogo(word.sim, {
    nome: 'dataHora',
    titulo: 'Data e Hora',
    largura: 380,
    classe: 'dlg-office',
    botoes: [
      { rotulo: 'OK', primario: true, valor: 'ok' },
      { rotulo: 'Cancelar', valor: null },
    ],
  });
  dlg.corpo.append(h('p', { class: 'dlg-subtitulo', text: 'Formatos disponíveis:' }), lista);
  lista.addEventListener('dblclick', () => dlg.clicar({ valor: 'ok' }));
  return (await dlg.abrir()) === 'ok' ? lista.value : null;
}

export async function dialogoZoom(word) {
  const opcoes = [200, 150, 100, 75, 50];
  const campo = h('input', { type: 'number', class: 'dlg-campo', value: Math.round(word.zoom * 100), min: 10, max: 500 });
  const dlg = new Dialogo(word.sim, {
    nome: 'zoom',
    titulo: 'Zoom',
    largura: 300,
    classe: 'dlg-office',
    botoes: [
      { rotulo: 'OK', primario: true, valor: 'ok' },
      { rotulo: 'Cancelar', valor: null },
    ],
  });
  dlg.corpo.append(
    h('fieldset', { class: 'dlg-grupo' }, h('legend', { text: 'Zoom para' }), ...opcoes.map((p) => h('label', { class: 'dlg-check' }, h('input', { type: 'radio', name: 'zoom', onChange: () => (campo.value = p) }), ` ${p}%`))),
    h('label', { class: 'dlg-linha' }, h('span', { text: 'Porcentagem:' }), campo)
  );
  return (await dlg.abrir()) === 'ok' ? Math.max(10, Math.min(500, Number(campo.value) || 100)) / 100 : null;
}
