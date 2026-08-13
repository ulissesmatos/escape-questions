const form = document.getElementById('quiz-form');
const perguntasContainer = document.getElementById('perguntas-container');
const resultadoDiv = document.getElementById('resultado');
const erroDiv = document.getElementById('erro-msg');
const btnEnviar = document.getElementById('btn-enviar');

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
    criarElemento('label', { for: `texto-${pergunta.id}`, texto: 'Sua resposta' }),
    criarElemento('input', {
      type: 'text',
      id: `texto-${pergunta.id}`,
      'data-resposta-texto': pergunta.id,
      placeholder: 'Escreva aqui',
      required: 'required',
    }),
  ]);

  const campoDigito = criarElemento('div', { classe: 'campo-digito' }, [
    criarElemento('label', { for: `digito-${pergunta.id}`, texto: 'Dígito' }),
    criarElemento('input', {
      type: 'text',
      inputmode: 'numeric',
      pattern: '[0-9]',
      maxlength: '1',
      id: `digito-${pergunta.id}`,
      'data-resposta-digito': pergunta.id,
      required: 'required',
    }),
  ]);

  return criarElemento('div', { classe: 'resposta-linha' }, [campoTexto, campoDigito]);
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

function renderizarPerguntas() {
  perguntasContainer.innerHTML = '';

  if (perguntas.length === 0) {
    perguntasContainer.appendChild(
      criarElemento('p', { classe: 'carregando', texto: 'Nenhuma pergunta cadastrada ainda. Fale com o professor.' })
    );
    return;
  }

  perguntas.forEach((pergunta) => {
    const filhos = [criarElemento('h2', { texto: pergunta.titulo })];

    if (pergunta.enunciado) {
      filhos.push(criarElemento('p', { texto: pergunta.enunciado }));
    }
    if (pergunta.pergunta) {
      filhos.push(criarElemento('p', { classe: 'pergunta', texto: pergunta.pergunta }));
    }

    filhos.push(
      pergunta.tipo === 'digito' ? renderizarRespostaDigito(pergunta) : renderizarRespostaOpcoes(pergunta)
    );

    perguntasContainer.appendChild(criarElemento('div', { classe: 'pergunta-card', 'data-id': pergunta.id }, filhos));
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
