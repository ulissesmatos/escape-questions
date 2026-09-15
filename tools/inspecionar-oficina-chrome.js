// Uso: node tools/inspecionar-oficina-chrome.js <porta-devtools> <arquivo.png> [expressao-js]
// Pequeno cliente CDP sem dependências para inspecionar/capturar o jogo no Chrome.
const fs = require('fs');

const [porta = '9225', arquivo, expressao = '({ jogo: Boolean(window.jogoOficina), carregando: document.querySelector(".jogo-carregando")?.textContent, canvas: [...document.querySelectorAll("canvas")].map(c => ({ largura: c.width, altura: c.height })) })'] = process.argv.slice(2);

async function abrirAlvo() {
  const alvos = await (await fetch(`http://127.0.0.1:${porta}/json`)).json();
  const alvo = alvos.find((item) => item.type === 'page' && item.url.includes('oficina.html'));
  if (!alvo) throw new Error('A aba da Oficina não foi encontrada no Chrome.');
  return alvo.webSocketDebuggerUrl;
}

async function executar(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let proximoId = 0;
  const pendentes = new Map();
  ws.onmessage = (evento) => {
    const mensagem = JSON.parse(evento.data);
    if (pendentes.has(mensagem.id)) {
      pendentes.get(mensagem.id)(mensagem);
      pendentes.delete(mensagem.id);
    }
  };
  const chamar = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++proximoId;
    pendentes.set(id, (resposta) => resposta.error ? reject(new Error(resposta.error.message)) : resolve(resposta.result));
    ws.send(JSON.stringify({ id, method, params }));
  });

  const resultado = await chamar('Runtime.evaluate', { expression: expressao, returnByValue: true, awaitPromise: true });
  console.log(JSON.stringify(resultado.result.value ?? resultado.result, null, 2));
  if (arquivo) {
    const captura = await chamar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(arquivo, Buffer.from(captura.data, 'base64'));
    console.log(`Captura salva em ${arquivo}`);
  }
  ws.close();
}

abrirAlvo().then(executar).catch((erro) => { console.error(erro.stack || erro.message); process.exitCode = 1; });
