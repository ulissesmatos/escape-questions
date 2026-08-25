const identificacaoDiv = document.getElementById('identificacao');
const participantesInput = document.getElementById('participantes');
const turmaInput = document.getElementById('turma');
const btnComecar = document.getElementById('btn-comecar');
const erroIdentificacao = document.getElementById('erro-identificacao');

const areaMapa = document.getElementById('area-mapa');
const carregandoEl = document.getElementById('carregando');
const nosContainer = document.getElementById('mapa-nos');
const svg = document.getElementById('mapa-svg');
const progressoTexto = document.getElementById('progresso-texto');
const progressoPercent = document.getElementById('progresso-percent');
const progressoBarra = document.getElementById('progresso-barra');

const modalOverlay = document.getElementById('modal-overlay');
const modalIcone = document.getElementById('modal-icone');
const modalImagem = document.getElementById('modal-imagem');
const modalNome = document.getElementById('modal-nome');
const modalEnunciado = document.getElementById('modal-enunciado');
const modalPergunta = document.getElementById('modal-pergunta');
const modalOpcoes = document.getElementById('modal-opcoes');
const modalErro = document.getElementById('modal-erro');
const modalSucesso = document.getElementById('modal-sucesso');
const modalConfirmar = document.getElementById('modal-confirmar');
const modalFechar = document.getElementById('modal-fechar');

let participantes = '';
let turma = '';
let mapaData = { componentes: [], conexoes: [] };
let componentesPorId = {};
let vizinhosPorComponente = {};
let descobertos = new Set();
let componenteAberto = null;
let enviandoResposta = false;

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

// ---------- Identificação ----------

participantesInput.value = localStorage.getItem('hw_participantes') || '';
turmaInput.value = localStorage.getItem('hw_turma') || '';

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
  localStorage.setItem('hw_participantes', p);
  localStorage.setItem('hw_turma', t);

  identificacaoDiv.style.display = 'none';
  carregandoEl.style.display = 'block';

  await iniciarExploracao();
});

// ---------- Carregamento do mapa e progresso ----------

async function iniciarExploracao() {
  try {
    const [mapaResp, progressoResp] = await Promise.all([
      fetch('/api/hardware/mapa'),
      fetch('/api/hardware/progresso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantes, turma }),
      }),
    ]);

    if (!mapaResp.ok) throw new Error('Falha ao carregar o mapa.');
    mapaData = await mapaResp.json();

    componentesPorId = {};
    mapaData.componentes.forEach((c) => {
      componentesPorId[c.id] = c;
    });

    vizinhosPorComponente = {};
    mapaData.conexoes.forEach((cx) => {
      (vizinhosPorComponente[cx.deId] ||= []).push(cx.paraId);
      (vizinhosPorComponente[cx.paraId] ||= []).push(cx.deId);
    });

    if (progressoResp.ok) {
      const progresso = await progressoResp.json();
      descobertos = new Set(progresso.descobertos || []);
    }

    carregandoEl.style.display = 'none';
    areaMapa.style.display = 'block';
    renderizarMapa();
  } catch (err) {
    carregandoEl.textContent = 'Não foi possível carregar o mapa. Recarregue a página.';
  }
}

// ---------- Renderização do mapa ----------

function calcularEstado(componente) {
  if (descobertos.has(componente.id)) return 'descoberto';
  if (componente.inicial) return 'desbloqueado';
  const vizinhos = vizinhosPorComponente[componente.id] || [];
  return vizinhos.some((id) => descobertos.has(id)) ? 'desbloqueado' : 'bloqueado';
}

function renderizarMapa() {
  nosContainer.innerHTML = '';

  mapaData.componentes.forEach((componente) => {
    const estado = calcularEstado(componente);

    const bolha = el('div', { classe: 'no-bolha' });
    if (estado !== 'bloqueado' && componente.imagem) {
      bolha.appendChild(el('img', { classe: 'no-foto', src: componente.imagem, alt: componente.nome }));
    } else {
      bolha.textContent = estado === 'bloqueado' ? '🔒' : componente.icone;
    }

    const label = el('span', { classe: 'no-label', texto: estado === 'bloqueado' ? '???' : componente.nome });

    const filhos = [bolha, label];
    if (estado === 'descoberto') {
      filhos.push(el('span', { classe: 'no-check', texto: '✅' }));
    }

    const no = el('div', { classe: `no no-${estado}` }, filhos);
    no.style.left = `${componente.posX}%`;
    no.style.top = `${componente.posY}%`;

    if (estado !== 'bloqueado') {
      no.addEventListener('click', () => abrirModal(componente, estado));
    }

    nosContainer.appendChild(no);
  });

  renderizarConexoes();
  atualizarProgresso();
}

function renderizarConexoes() {
  svg.innerHTML = '';

  mapaData.conexoes.forEach((cx) => {
    const a = componentesPorId[cx.deId];
    const b = componentesPorId[cx.paraId];
    if (!a || !b) return;

    const estadoA = calcularEstado(a);
    const estadoB = calcularEstado(b);

    let classe = 'linha-oculta';
    if (estadoA === 'descoberto' && estadoB === 'descoberto') classe = 'linha-completa';
    else if (estadoA !== 'bloqueado' && estadoB !== 'bloqueado') classe = 'linha-ativa';

    const linha = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    linha.setAttribute('x1', a.posX);
    linha.setAttribute('y1', a.posY);
    linha.setAttribute('x2', b.posX);
    linha.setAttribute('y2', b.posY);
    linha.setAttribute('class', classe);
    svg.appendChild(linha);
  });
}

function atualizarProgresso() {
  const total = mapaData.componentes.length;
  const total_descobertos = mapaData.componentes.filter((c) => descobertos.has(c.id)).length;
  const percentual = total > 0 ? Math.round((total_descobertos / total) * 100) : 0;

  progressoTexto.textContent = `${total_descobertos} de ${total} componentes descobertos`;
  progressoPercent.textContent = `${percentual}%`;
  progressoBarra.style.width = `${percentual}%`;
}

// ---------- Modal de pergunta ----------

function abrirModal(componente, estado) {
  componenteAberto = componente;
  modalErro.classList.remove('mostrar');
  modalErro.textContent = '';
  modalSucesso.classList.remove('mostrar');
  modalSucesso.textContent = '';

  if (componente.imagem) {
    modalImagem.src = componente.imagem;
    modalImagem.alt = componente.nome;
    modalImagem.style.display = 'block';
    modalIcone.style.display = 'none';
  } else {
    modalImagem.style.display = 'none';
    modalIcone.style.display = 'block';
    modalIcone.textContent = componente.icone;
  }
  modalNome.textContent = componente.nome;
  modalEnunciado.textContent = componente.enunciado || 'Pesquise sobre esse componente.';
  modalPergunta.textContent = componente.pergunta || '';

  modalOpcoes.innerHTML = '';

  if (estado === 'descoberto') {
    modalOpcoes.style.display = 'none';
    modalConfirmar.style.display = 'none';
    modalSucesso.textContent = '✅ Você já descobriu esse componente! Pode revisar a pesquisa acima quando quiser.';
    modalSucesso.classList.add('mostrar');
  } else {
    modalOpcoes.style.display = 'flex';
    modalConfirmar.style.display = 'block';
    modalConfirmar.disabled = false;
    modalConfirmar.textContent = 'Confirmar resposta';

    (componente.opcoes || []).forEach((opcao) => {
      const radio = el('input', { type: 'radio', name: 'modal-opcao', value: opcao.id });
      const label = el('label', { classe: 'opcao' }, [radio, el('span', { texto: opcao.texto })]);
      modalOpcoes.appendChild(label);
    });
  }

  modalOverlay.classList.add('mostrar');
}

function fecharModal() {
  modalOverlay.classList.remove('mostrar');
  componenteAberto = null;
}

modalFechar.addEventListener('click', fecharModal);
modalOverlay.addEventListener('click', (event) => {
  if (event.target === modalOverlay) fecharModal();
});

modalConfirmar.addEventListener('click', async () => {
  if (!componenteAberto || enviandoResposta) return;

  const selecionado = modalOpcoes.querySelector('input[name="modal-opcao"]:checked');
  if (!selecionado) {
    modalErro.textContent = 'Escolha uma opção antes de confirmar.';
    modalErro.classList.add('mostrar');
    return;
  }

  modalErro.classList.remove('mostrar');
  enviandoResposta = true;
  modalConfirmar.disabled = true;
  modalConfirmar.textContent = 'Enviando...';

  try {
    const resp = await fetch('/api/hardware/responder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantes,
        turma,
        componentId: componenteAberto.id,
        opcaoId: selecionado.value,
      }),
    });
    const dados = await resp.json();
    if (!resp.ok) throw new Error(dados.erro || 'Erro ao enviar resposta.');

    if (dados.correta) {
      descobertos.add(componenteAberto.id);
      modalOpcoes.style.display = 'none';
      modalConfirmar.style.display = 'none';
      modalSucesso.textContent = '🎉 Isso mesmo! Novos componentes foram desbloqueados no mapa.';
      modalSucesso.classList.add('mostrar');
      renderizarMapa();
      setTimeout(fecharModal, 1600);
    } else {
      modalErro.textContent = '❌ Não é essa... pesquise mais um pouco e tente de novo!';
      modalErro.classList.add('mostrar');
      modalConfirmar.disabled = false;
      modalConfirmar.textContent = 'Confirmar resposta';
    }
  } catch (err) {
    modalErro.textContent = 'Não foi possível conectar ao servidor. Tente novamente.';
    modalErro.classList.add('mostrar');
    modalConfirmar.disabled = false;
    modalConfirmar.textContent = 'Confirmar resposta';
  } finally {
    enviandoResposta = false;
  }
});
