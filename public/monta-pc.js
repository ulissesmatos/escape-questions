const OBRIGATORIAS = [
  { id: 'placa_mae', nome: 'Placa-mãe', icone: '🔌' },
  { id: 'cpu', nome: 'Processador (CPU)', icone: '🧠' },
  { id: 'ram', nome: 'Memória RAM', icone: '🧩' },
  { id: 'armazenamento', nome: 'Armazenamento (HD/SSD)', icone: '💾' },
  { id: 'fonte', nome: 'Fonte de Alimentação', icone: '🔋' },
  { id: 'gabinete', nome: 'Gabinete', icone: '🖥️' },
];

const OPCIONAIS = [
  { id: 'gpu', nome: 'Placa de vídeo (GPU)' },
  { id: 'cooler', nome: 'Cooler' },
  { id: 'monitor', nome: 'Monitor' },
  { id: 'teclado', nome: 'Teclado' },
  { id: 'mouse', nome: 'Mouse' },
  { id: 'extra', nome: 'Outro periférico/extra' },
];

const identificacaoDiv = document.getElementById('identificacao');
const participantesInput = document.getElementById('participantes');
const turmaInput = document.getElementById('turma');
const btnComecar = document.getElementById('btn-comecar');
const erroIdentificacao = document.getElementById('erro-identificacao');

const areaMissoes = document.getElementById('area-missoes');
const gridMissoes = document.getElementById('grid-missoes');

const areaMontagem = document.getElementById('area-montagem');
const btnTrocarMissao = document.getElementById('btn-trocar-missao');
const missaoEmojiEl = document.getElementById('missao-emoji');
const missaoNomeEl = document.getElementById('missao-nome');
const missaoDescricaoEl = document.getElementById('missao-descricao');
const missaoNecessidadeEl = document.getElementById('missao-necessidade');
const missaoOrcamentoEl = document.getElementById('missao-orcamento');
const listaObrigatorias = document.getElementById('lista-obrigatorias');
const listaExtras = document.getElementById('lista-extras');
const btnAddExtra = document.getElementById('btn-add-extra');
const orcamentoTotalTexto = document.getElementById('orcamento-total-texto');
const orcamentoStatus = document.getElementById('orcamento-status');
const orcamentoResumo = document.getElementById('orcamento-resumo');
const justificativaInput = document.getElementById('justificativa');
const erroMontagem = document.getElementById('erro-montagem');
const btnEnviarProposta = document.getElementById('btn-enviar-proposta');

const areaSucesso = document.getElementById('area-sucesso');
const sucessoResumo = document.getElementById('sucesso-resumo');
const btnNovaMissao = document.getElementById('btn-nova-missao');

const carregandoEl = document.getElementById('carregando');

let participantes = '';
let turma = '';
let missoes = [];
let missaoSelecionada = null;
let enviando = false;

function el(tag, props = {}, filhos = []) {
  const elemento = document.createElement(tag);
  Object.entries(props).forEach(([chave, valor]) => {
    if (chave === 'texto') elemento.textContent = valor;
    else if (chave === 'classe') elemento.className = valor;
    else elemento.setAttribute(chave, valor);
  });
  filhos.forEach((f) => elemento.appendChild(f));
  return elemento;
}

function formatarReais(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ---------- Identificação ----------

participantesInput.value = localStorage.getItem('pc_participantes') || '';
turmaInput.value = localStorage.getItem('pc_turma') || '';

btnComecar.addEventListener('click', async () => {
  erroIdentificacao.classList.remove('mostrar');
  const p = participantesInput.value.trim();
  const t = turmaInput.value.trim();

  if (!p || !t) {
    erroIdentificacao.textContent = 'Preencha seu nome (ou do grupo) e a turma para começar.';
    erroIdentificacao.classList.add('mostrar');
    return;
  }

  participantes = p;
  turma = t;
  localStorage.setItem('pc_participantes', p);
  localStorage.setItem('pc_turma', t);

  identificacaoDiv.style.display = 'none';
  carregandoEl.style.display = 'block';
  await carregarMissoes();
});

// ---------- Missões ----------

async function carregarMissoes() {
  try {
    const resp = await fetch('/api/pcbuild/missoes');
    if (!resp.ok) throw new Error('Falha ao carregar as missões.');
    missoes = await resp.json();

    renderizarMissoes();
    carregandoEl.style.display = 'none';
    areaMontagem.style.display = 'none';
    areaSucesso.style.display = 'none';
    areaMissoes.style.display = 'block';
  } catch (err) {
    carregandoEl.textContent = 'Não foi possível carregar as missões. Recarregue a página.';
  }
}

function renderizarMissoes() {
  gridMissoes.innerHTML = '';

  missoes.forEach((missao) => {
    const badge = el('span', {
      classe: 'card-badge',
      texto: `Orçamento: ${formatarReais(missao.orcamentoCentavos)}`,
    });

    const card = el(
      'a',
      { classe: 'card-atividade', href: '#' },
      [
        el('span', { classe: 'card-icone', texto: missao.emoji }),
        el('h2', { texto: missao.personaNome }),
        el('p', { texto: missao.personaDescricao }),
        badge,
      ]
    );
    card.addEventListener('click', (event) => {
      event.preventDefault();
      selecionarMissao(missao);
    });
    gridMissoes.appendChild(card);
  });
}

btnTrocarMissao.addEventListener('click', () => {
  areaMontagem.style.display = 'none';
  areaMissoes.style.display = 'block';
});

btnNovaMissao.addEventListener('click', () => {
  areaSucesso.style.display = 'none';
  areaMissoes.style.display = 'block';
});

// ---------- Montagem da proposta ----------

function selecionarMissao(missao) {
  missaoSelecionada = missao;

  missaoEmojiEl.textContent = missao.emoji;
  missaoNomeEl.textContent = missao.personaNome;
  missaoDescricaoEl.textContent = missao.personaDescricao;
  missaoNecessidadeEl.textContent = `💡 ${missao.necessidade}`;
  missaoOrcamentoEl.textContent = `💰 Orçamento: ${formatarReais(missao.orcamentoCentavos)}`;

  renderObrigatorias();
  listaExtras.innerHTML = '';
  justificativaInput.value = '';
  erroMontagem.classList.remove('mostrar');
  atualizarTotal();

  areaMissoes.style.display = 'none';
  areaMontagem.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderObrigatorias() {
  listaObrigatorias.innerHTML = '';
  OBRIGATORIAS.forEach((categoria) => {
    const nomeInput = el('input', { type: 'text', classe: 'campo-nome-peca', placeholder: 'Nome da peça pesquisada' });
    const precoInput = el('input', { type: 'number', classe: 'campo-preco-peca', min: '0', step: '0.01', placeholder: '0,00' });
    const linkInput = el('input', { type: 'text', classe: 'campo-link-peca', placeholder: 'Link da peça (opcional)' });
    precoInput.addEventListener('input', atualizarTotal);

    const linha = el('div', { classe: 'categoria-item' }, [
      el('span', { classe: 'categoria-label' }, [
        el('span', { classe: 'categoria-icone', texto: categoria.icone }),
        el('span', { texto: categoria.nome }),
      ]),
      nomeInput,
      el('div', { classe: 'campo-preco-wrap' }, [el('span', { classe: 'prefixo-real', texto: 'R$' }), precoInput]),
      linkInput,
    ]);
    linha.dataset.categoria = categoria.nome;
    listaObrigatorias.appendChild(linha);
  });
}

function criarSelectOpcionais() {
  const select = el('select', { classe: 'campo-categoria-extra' });
  OPCIONAIS.forEach((op) => {
    select.appendChild(el('option', { value: op.nome, texto: op.nome }));
  });
  return select;
}

btnAddExtra.addEventListener('click', () => {
  const select = criarSelectOpcionais();
  const nomeInput = el('input', { type: 'text', classe: 'campo-nome-peca', placeholder: 'Nome da peça pesquisada' });
  const precoInput = el('input', { type: 'number', classe: 'campo-preco-peca', min: '0', step: '0.01', placeholder: '0,00' });
  const linkInput = el('input', { type: 'text', classe: 'campo-link-peca', placeholder: 'Link da peça (opcional)' });
  const btnRemover = el('button', { type: 'button', classe: 'btn-remover-item', texto: '✕' });

  precoInput.addEventListener('input', atualizarTotal);

  const linha = el('div', { classe: 'categoria-item categoria-item-extra' }, [
    select,
    nomeInput,
    el('div', { classe: 'campo-preco-wrap' }, [el('span', { classe: 'prefixo-real', texto: 'R$' }), precoInput]),
    linkInput,
    btnRemover,
  ]);

  btnRemover.addEventListener('click', () => {
    linha.remove();
    atualizarTotal();
  });

  listaExtras.appendChild(linha);
});

function coletarItens() {
  const itens = [];

  listaObrigatorias.querySelectorAll('.categoria-item').forEach((linha) => {
    const nome = linha.querySelector('.campo-nome-peca').value.trim();
    const preco = parseFloat(linha.querySelector('.campo-preco-peca').value);
    const link = linha.querySelector('.campo-link-peca').value.trim();
    if (nome && Number.isFinite(preco) && preco >= 0) {
      itens.push({ categoria: linha.dataset.categoria, nomePeca: nome, precoCentavos: Math.round(preco * 100), link });
    }
  });

  listaExtras.querySelectorAll('.categoria-item-extra').forEach((linha) => {
    const categoria = linha.querySelector('.campo-categoria-extra').value;
    const nome = linha.querySelector('.campo-nome-peca').value.trim();
    const preco = parseFloat(linha.querySelector('.campo-preco-peca').value);
    const link = linha.querySelector('.campo-link-peca').value.trim();
    if (nome && Number.isFinite(preco) && preco >= 0) {
      itens.push({ categoria, nomePeca: nome, precoCentavos: Math.round(preco * 100), link });
    }
  });

  return itens;
}

function atualizarTotal() {
  const itens = coletarItens();
  const totalCentavos = itens.reduce((soma, item) => soma + item.precoCentavos, 0);
  orcamentoTotalTexto.textContent = `Total gasto: ${formatarReais(totalCentavos)}`;

  if (!missaoSelecionada) return;

  const orcamento = missaoSelecionada.orcamentoCentavos;
  orcamentoResumo.classList.remove('orcamento-ok', 'orcamento-estourado');
  if (totalCentavos <= orcamento) {
    orcamentoStatus.textContent = `✅ Dentro do orçamento (sobram ${formatarReais(orcamento - totalCentavos)})`;
    orcamentoResumo.classList.add('orcamento-ok');
  } else {
    orcamentoStatus.textContent = `⚠️ Estourou o orçamento em ${formatarReais(totalCentavos - orcamento)}`;
    orcamentoResumo.classList.add('orcamento-estourado');
  }
}

btnEnviarProposta.addEventListener('click', async () => {
  if (enviando || !missaoSelecionada) return;

  erroMontagem.classList.remove('mostrar');

  const obrigatoriasPreenchidas = Array.from(listaObrigatorias.querySelectorAll('.categoria-item')).every((linha) => {
    const nome = linha.querySelector('.campo-nome-peca').value.trim();
    const preco = parseFloat(linha.querySelector('.campo-preco-peca').value);
    return nome && Number.isFinite(preco) && preco >= 0;
  });

  if (!obrigatoriasPreenchidas) {
    erroMontagem.textContent = 'Preencha o nome e o preço pesquisado de todas as 6 peças obrigatórias.';
    erroMontagem.classList.add('mostrar');
    return;
  }

  const justificativa = justificativaInput.value.trim();
  if (!justificativa) {
    erroMontagem.textContent = 'Explique por que as peças escolhidas são compatíveis entre si.';
    erroMontagem.classList.add('mostrar');
    return;
  }

  const itens = coletarItens();

  enviando = true;
  btnEnviarProposta.disabled = true;
  btnEnviarProposta.textContent = 'Enviando...';

  try {
    const resp = await fetch('/api/pcbuild/submissoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantes, turma, missaoId: missaoSelecionada.id, itens, justificativa }),
    });
    const dados = await resp.json();
    if (!resp.ok) throw new Error(dados.erro || 'Erro ao enviar a proposta.');

    const dentro = dados.dentroOrcamento
      ? `dentro do orçamento de ${missaoSelecionada.personaNome.split(' ')[0]}! 🎯`
      : `um pouco acima do orçamento — dá uma olhada nas peças mais caras da próxima vez.`;
    sucessoResumo.textContent = `Total da proposta: ${formatarReais(dados.totalCentavos)} — ${dentro}`;

    areaMontagem.style.display = 'none';
    areaSucesso.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    erroMontagem.textContent = err.message || 'Não foi possível conectar ao servidor. Tente novamente.';
    erroMontagem.classList.add('mostrar');
  } finally {
    enviando = false;
    btnEnviarProposta.disabled = false;
    btnEnviarProposta.textContent = 'Enviar proposta';
  }
});
