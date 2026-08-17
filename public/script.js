const form = document.getElementById('quiz-form');
const perguntasContainer = document.getElementById('perguntas-container');
const resultadoDiv = document.getElementById('resultado');
const erroDiv = document.getElementById('erro-msg');
const btnEnviar = document.getElementById('btn-enviar');
const progressoTexto = document.getElementById('progresso-texto');
const progressoPercent = document.getElementById('progresso-percent');
const progressoBarra = document.getElementById('progresso-barra');

const CORES_ACENTO = [
  { cor: '#6366f1', fundo: '#eef2ff' },
  { cor: '#0d9488', fundo: '#f0fdfa' },
  { cor: '#e11d48', fundo: '#fff1f2' },
  { cor: '#0284c7', fundo: '#f0f9ff' },
  { cor: '#7c3aed', fundo: '#f5f3ff' },
];

let perguntas = [];

function criarElemento(tag, opcoes = {}, filhos = []) {
  const elemento = document.createElement(tag);
  Object.entries(opcoes).forEach(([chave, valor]) => {
    if (chave === 'texto') {
      elemento.textContent = valor;
    } else if (chave === 'classe') {
      elemento.className = valor;
    } else {
      elemento.setAttribute(chave, valor);
    }
  });
  filhos.forEach((filho) => elemento.appendChild(filho));
  return elemento;
}

function renderizarRespostaDigito(pergunta) {
  const campoTexto = criarElemento('div', { classe: 'campo-texto' }, [
    criarElemento('label', { for: `texto-${pergunta.id}`, texto: '✏️ O que você descobriu?' }),
    criarElemento('input', {
      type: 'text',
      id: `texto-${pergunta.id}`,
      'data-resposta-texto': pergunta.id,
      placeholder: 'Escreva aqui a palavra ou resposta',
      autocomplete: 'off',
      required: 'required',
    }),
  ]);

  const campoDigito = criarElemento('div', { classe: 'campo-digito' }, [
    criarElemento('label', { for: `digito-${pergunta.id}`, texto: '🔢 Número' }),
    criarElemento('input', {
      type: 'text',
      inputmode: 'numeric',
      pattern: '[0-9]',
      maxlength: '1',
      id: `digito-${pergunta.id}`,
      'data-resposta-digito': pergunta.id,
      required: 'required',
    }),
    criarElemento('span', { classe: 'campo-digito-ajuda', texto: 'Só o número pedido acima' }),
  ]);

  return criarElemento('div', { classe: 'resposta-campos' }, [campoTexto, campoDigito]);
}

function renderizarRespostaOpcoes(pergunta) {
  const opcoesEls = (pergunta.opcoes || []).map((opcao) =>
    criarElemento('label', { classe: 'opcao' }, [
      criarElemento('input', {
        type: 'radio',
        name: `opcao-${pergunta.id}`,
        value: opcao.id,
        required: 'required',
      }),
      criarElemento('span', { texto: opcao.texto }),
    ])
  );

  return criarElemento('div', { classe: 'opcoes-lista' }, opcoesEls);
}

function renderizarZonaResposta(pergunta) {
  const ehDigito = pergunta.tipo === 'digito';
  const titulo = ehDigito ? '✏️ Escreva sua resposta aqui' : '✏️ Escolha sua resposta aqui';
  const conteudo = ehDigito ? renderizarRespostaDigito(pergunta) : renderizarRespostaOpcoes(pergunta);

  return criarElemento('div', { classe: 'zona-resposta' }, [
    criarElemento('span', { classe: 'zona-resposta-titulo', texto: titulo }),
    conteudo,
  ]);
}

function renderizarPerguntas() {
  perguntasContainer.innerHTML = '';

  if (perguntas.length === 0) {
    perguntasContainer.appendChild(
      criarElemento('p', { classe: 'carregando', texto: 'Nenhuma pergunta cadastrada ainda. Fale com o professor.' })
    );
    atualizarProgresso();
    return;
  }

  perguntas.forEach((pergunta, indice) => {
    const numero = String(indice + 1).padStart(2, '0');
    const acento = CORES_ACENTO[indice % CORES_ACENTO.length];

    const cabecalho = criarElemento('div', { classe: 'pergunta-cabecalho' }, [
      criarElemento('span', { classe: 'pista-badge' }, [
        document.createTextNode(`Pista ${numero} `),
        criarElemento('span', { classe: 'status-check', texto: '✓' }),
      ]),
      criarElemento('h2', { texto: pergunta.titulo }),
    ]);

    const filhos = [cabecalho];

    if (pergunta.enunciado) {
      filhos.push(
        criarElemento('div', { classe: 'secao secao-contexto' }, [
          criarElemento('span', { classe: 'secao-titulo', texto: '🔎 Pesquise antes de responder' }),
          criarElemento('p', { texto: pergunta.enunciado }),
        ])
      );
    }
    if (pergunta.pergunta) {
      filhos.push(
        criarElemento('div', { classe: 'secao secao-pergunta' }, [
          criarElemento('span', { classe: 'secao-titulo', texto: '❓ Sua missão' }),
          criarElemento('p', { texto: pergunta.pergunta }),
        ])
      );
    }

    filhos.push(renderizarZonaResposta(pergunta));

    const card = criarElemento('div', { classe: 'pergunta-card', 'data-id': pergunta.id }, filhos);
    card.style.setProperty('--accent', acento.cor);
    card.style.setProperty('--accent-bg', acento.fundo);
    card.style.animationDelay = `${Math.min(indice * 0.07, 0.6)}s`;

    perguntasContainer.appendChild(card);
  });

  ativarAcompanhamentoDeRespostas();
  atualizarProgresso();
}

function perguntaFoiRespondida(pergunta) {
  if (pergunta.tipo === 'digito') {
    const textoInput = document.querySelector(`[data-resposta-texto="${pergunta.id}"]`);
    const digitoInput = document.querySelector(`[data-resposta-digito="${pergunta.id}"]`);
    const textoPreenchido = Boolean(textoInput && textoInput.value.trim());
    const digitoValido = Boolean(digitoInput && /^[0-9]$/.test(digitoInput.value.trim()));
    return textoPreenchido && digitoValido;
  }
  return Boolean(document.querySelector(`input[name="opcao-${pergunta.id}"]:checked`));
}

function atualizarProgresso() {
  const total = perguntas.length;
  const respondidas = perguntas.filter(perguntaFoiRespondida).length;
  const percentual = total > 0 ? Math.round((respondidas / total) * 100) : 0;

  progressoTexto.textContent = `${respondidas} de ${total} pistas respondidas`;
  progressoPercent.textContent = `${percentual}%`;
  progressoBarra.style.width = `${percentual}%`;
}

function ativarAcompanhamentoDeRespostas() {
  perguntas.forEach((pergunta) => {
    const card = perguntasContainer.querySelector(`.pergunta-card[data-id="${pergunta.id}"]`);
    if (!card) return;

    const digitoInput = card.querySelector('[data-resposta-digito]');

    const atualizarCard = () => {
      if (digitoInput) {
        digitoInput.classList.toggle('preenchido', /^[0-9]$/.test(digitoInput.value.trim()));
      }
      card.classList.toggle('respondida', perguntaFoiRespondida(pergunta));
      atualizarProgresso();
    };

    card.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', atualizarCard);
      input.addEventListener('change', atualizarCard);
    });
  });
}

async function carregarPerguntas() {
  try {
    const resp = await fetch('/api/questions');
    if (!resp.ok) throw new Error('Falha ao carregar perguntas');
    perguntas = await resp.json();
    renderizarPerguntas();
  } catch (err) {
    perguntasContainer.innerHTML = '';
    perguntasContainer.appendChild(
      criarElemento('p', { classe: 'carregando', texto: 'Não foi possível carregar as perguntas. Recarregue a página.' })
    );
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  erroDiv.classList.remove('mostrar');
  erroDiv.textContent = '';

  const participantes = document.getElementById('participantes').value;
  const turma = document.getElementById('turma').value;

  const respostas = {};
  perguntas.forEach((pergunta) => {
    if (pergunta.tipo === 'digito') {
      const textoInput = document.querySelector(`[data-resposta-texto="${pergunta.id}"]`);
      const digitoInput = document.querySelector(`[data-resposta-digito="${pergunta.id}"]`);
      respostas[pergunta.id] = {
        texto: textoInput ? textoInput.value : '',
        digito: digitoInput ? digitoInput.value : '',
      };
    } else {
      const selecionado = document.querySelector(`input[name="opcao-${pergunta.id}"]:checked`);
      respostas[pergunta.id] = { opcaoId: selecionado ? selecionado.value : null };
    }
  });

  btnEnviar.disabled = true;
  btnEnviar.textContent = 'Enviando...';

  try {
    const resp = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantes, turma, respostas }),
    });

    const dados = await resp.json();

    if (!resp.ok) {
      erroDiv.textContent = dados.erro || 'Ocorreu um erro ao enviar suas respostas.';
      erroDiv.classList.add('mostrar');
      return;
    }

    resultadoDiv.className = 'mostrar enviado';
    resultadoDiv.innerHTML = '';
    resultadoDiv.appendChild(criarElemento('h2', { texto: '✅ Respostas enviadas!' }));
    resultadoDiv.appendChild(
      criarElemento('p', { texto: 'Suas respostas foram registradas com sucesso. Aguarde as instruções do professor.' })
    );

    resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    erroDiv.textContent = 'Não foi possível conectar ao servidor. Tente novamente.';
    erroDiv.classList.add('mostrar');
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar respostas';
  }
});

carregarPerguntas();
