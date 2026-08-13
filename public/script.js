const form = document.getElementById('quiz-form');
const resultadoDiv = document.getElementById('resultado');
const erroDiv = document.getElementById('erro-msg');
const btnEnviar = document.getElementById('btn-enviar');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  erroDiv.classList.remove('mostrar');
  erroDiv.textContent = '';

  const participantes = document.getElementById('participantes').value;
  const turma = document.getElementById('turma').value;

  const respostas = {};
  document.querySelectorAll('[data-pista]').forEach((input) => {
    const id = input.dataset.pista;
    const textoInput = document.querySelector(`[data-resposta-texto="${id}"]`);
    respostas[id] = { texto: textoInput ? textoInput.value : '', digito: input.value };
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

    dados.detalhes.forEach((item) => {
      const card = document.querySelector(`.pista[data-id="${item.id}"]`);
      const icon = card.querySelector('.status-icon');
      card.classList.remove('correta', 'incorreta');
      card.classList.add(item.correta ? 'correta' : 'incorreta');
      icon.textContent = item.correta ? '✅' : '❌';
    });

    resultadoDiv.className = dados.completo ? 'mostrar sucesso' : 'mostrar parcial';
    resultadoDiv.innerHTML = dados.completo
      ? `<h2>🎉 Parabéns!</h2><p>Vocês acertaram todas as ${dados.total} pistas! Chamem o professor para liberar a próxima etapa do escape room.</p>`
      : `<h2>Quase lá!</h2><p>Vocês acertaram ${dados.acertos} de ${dados.total} pistas. Revisem as pistas marcadas com ❌ e enviem novamente.</p>`;

    resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    erroDiv.textContent = 'Não foi possível conectar ao servidor. Tente novamente.';
    erroDiv.classList.add('mostrar');
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar respostas';
  }
});
