// Driver mínimo do Chrome (DevTools Protocol), sem dependências, usado pelo robô.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PASTA = path.join(os.tmpdir(), 'robo-word');
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export async function abrirChrome({ largura = 1366, altura = 768, porta = 9333 } = {}) {
  const perfil = path.join(PASTA, `perfil-${porta}`);
  const proc = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${porta}`,
    `--user-data-dir=${perfil}`,
    `--window-size=${largura},${altura}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank',
  ], { stdio: 'ignore' });
  let lista;
  for (let i = 0; i < 50; i++) {
    try {
      lista = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json();
      if (lista.find((t) => t.type === 'page')) break;
    } catch {}
    await esperar(200);
  }
  const alvo = lista.find((t) => t.type === 'page');
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pendentes = new Map();
  const erros = [];
  const logs = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pendentes.has(msg.id)) {
      const { ok, falha } = pendentes.get(msg.id);
      pendentes.delete(msg.id);
      if (msg.error) falha(new Error(msg.error.message));
      else ok(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      erros.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const texto = msg.params.args.map((a) => a.value ?? a.description).join(' ');
      if (msg.params.type === 'error') erros.push(texto);
      logs.push(`${msg.params.type}: ${texto}`);
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      erros.push(`${msg.params.entry.text} ${msg.params.entry.url || ''}`);
    }
  });
  const enviar = (method, params = {}) =>
    new Promise((ok, falha) => {
      const meu = ++id;
      pendentes.set(meu, { ok, falha });
      ws.send(JSON.stringify({ id: meu, method, params }));
    });
  await enviar('Runtime.enable');
  await enviar('Page.enable');
  await enviar('Log.enable');
  await enviar('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 1, mobile: false });

  const api = {
    enviar,
    erros,
    logs,
    async ir(url) {
      await enviar('Page.navigate', { url });
      await esperar(1200);
    },
    async avaliar(expr) {
      const r = await enviar('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(`${r.exceptionDetails.exception?.description || r.exceptionDetails.text}\n  em: ${expr.slice(0, 200)}`);
      return r.result.value;
    },
    async foto(nome) {
      const r = await enviar('Page.captureScreenshot', { format: 'png' });
      const arquivo = path.join(PASTA, 'fotos', `${nome}.png`);
      fs.mkdirSync(path.dirname(arquivo), { recursive: true });
      fs.writeFileSync(arquivo, Buffer.from(r.data, 'base64'));
      return arquivo;
    },
    async clicar(x, y, { botao = 'left', cliques = 1 } = {}) {
      await enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      for (let c = 1; c <= cliques; c++) {
        await enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: botao, clickCount: c });
        await enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: botao, clickCount: c });
      }
      await esperar(120);
    },
    /** Clica no centro de um elemento (seletor CSS ou data-alvo) */
    async clicarEm(seletor, opcoes = {}) {
      const sel = seletor.startsWith('alvo:') ? `[data-alvo="${seletor.slice(5)}"]` : seletor;
      const r = await api.avaliar(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; el.scrollIntoView({block:'nearest'}); const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
      if (!r) throw new Error(`Elemento não encontrado: ${seletor}`);
      await api.clicar(r.x, r.y, opcoes);
      return r;
    },
    async arrastar(de, para, passos = 8) {
      await enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x: de.x, y: de.y });
      await enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x: de.x, y: de.y, button: 'left', clickCount: 1 });
      for (let i = 1; i <= passos; i++) {
        await enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x: de.x + ((para.x - de.x) * i) / passos, y: de.y + ((para.y - de.y) * i) / passos, button: 'left', buttons: 1 });
      }
      await enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: para.x, y: para.y, button: 'left', clickCount: 1 });
      await esperar(150);
    },
    async digitar(texto) {
      for (const c of texto) {
        await enviar('Input.dispatchKeyEvent', { type: 'keyDown', text: c, key: c, unmodifiedText: c });
        await enviar('Input.dispatchKeyEvent', { type: 'keyUp', key: c });
      }
      await esperar(80);
    },
    /** tecla('Enter'), tecla('n', { ctrl: true }) */
    async tecla(key, { ctrl = false, shift = false, alt = false } = {}) {
      const mod = (alt ? 1 : 0) | (ctrl ? 2 : 0) | (shift ? 8 : 0);
      const codigos = { Enter: 13, Tab: 9, Escape: 27, Backspace: 8, Delete: 46, F2: 113, F3: 114, F7: 118, F12: 123, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, Home: 36, End: 35 };
      const kc = codigos[key] || key.toUpperCase().charCodeAt(0);
      const code = codigos[key] ? key : /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : /^\d$/.test(key) ? `Digit${key}` : key;
      const texto = !ctrl && !alt && key.length === 1 ? key : key === 'Enter' ? '\r' : undefined;
      await enviar('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: kc, modifiers: mod });
      if (texto) await enviar('Input.dispatchKeyEvent', { type: 'char', key, text: texto, modifiers: mod });
      await enviar('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: kc, modifiers: mod });
      await esperar(100);
    },
    esperar,
    fechar() {
      ws.close();
      proc.kill();
    },
  };
  return api;
}
