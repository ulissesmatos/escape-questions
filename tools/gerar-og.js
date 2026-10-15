#!/usr/bin/env node
/**
 * Gera as imagens de compartilhamento (Open Graph, 1200x630) em
 * public/images/og/: uma do site e uma por atividade. É o cartão que o
 * WhatsApp e as redes mostram quando alguém cola o link.
 *
 *   npm run og
 *
 * Fundo chapado de propósito: o WhatsApp só mostra a prévia de imagens
 * pequenas (~300 KB), e degradê vira PNG pesado.
 *
 * Usa o Chrome ou o Edge instalado (em headless). `CHROME` aponta outro
 * navegador. Rode de novo ao mudar o nome, o ícone ou a cor de uma atividade
 * em src/seo/conteudo.js; o resultado vai para o git.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { SITE, ATIVIDADES, HOME } = require('../src/seo/conteudo');

const LARGURA = 1200;
const ALTURA = 630;
const SAIDA = path.join(__dirname, '..', 'public', 'images', 'og');

const CANDIDATOS = [
  process.env.CHROME,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

function achar() {
  const navegador = CANDIDATOS.find((c) => c && fs.existsSync(c));
  if (!navegador) {
    console.error('Não achei o Chrome ou o Edge. Defina CHROME com o caminho do executável.');
    process.exit(1);
  }
  return navegador;
}

const escapar = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function cartao({ icone, etiqueta, titulo, cor, escura }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: ${LARGURA}px; height: ${ALTURA}px; }
  body { box-sizing: border-box; padding: 64px 72px; position: relative; overflow: hidden; color: #fff;
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    background: ${cor};
    display: flex; flex-direction: column; justify-content: space-between; }
  .circulo { position: absolute; right: -140px; top: -160px; width: 600px; height: 600px; border-radius: 50%; background: ${escura}; }
  .circulo.b { right: 120px; top: 380px; width: 360px; height: 360px; background: ${escura}; opacity: .55; }
  .topo { position: relative; display: flex; align-items: center; gap: 28px; }
  .icone { width: 150px; height: 150px; border-radius: 36px; background: rgba(255,255,255,.2); display: grid; place-items: center; font-size: 96px; line-height: 1; }
  .etiqueta { background: rgba(255,255,255,.22); padding: 10px 24px; border-radius: 999px; font-size: 30px; font-weight: 700; }
  h1 { position: relative; margin: 0; font-size: 76px; line-height: 1.08; letter-spacing: -0.02em; font-weight: 800; max-width: 980px; }
  .rodape { position: relative; font-size: 30px; font-weight: 600; opacity: .93; }
</style></head><body>
  <div class="circulo"></div><div class="circulo b"></div>
  <div class="topo"><div class="icone">${icone}</div><div class="etiqueta">${escapar(etiqueta)}</div></div>
  <h1>${escapar(titulo)}</h1>
  <div class="rodape">${escapar(SITE.nome)} · grátis, direto no navegador</div>
</body></html>`;
}

const cartoes = [
  { arquivo: 'site', icone: '🎓', etiqueta: '6º ao 9º ano', titulo: HOME.titulo, cor: '#5046e5', escura: '#3f36c9' },
  ...ATIVIDADES.map((a) => ({
    arquivo: a.slug,
    icone: a.icone,
    etiqueta: a.etiqueta,
    titulo: a.nome,
    cor: a.cores.cor,
    escura: a.cores.escura,
  })),
];

const navegador = achar();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'og-'));
fs.mkdirSync(SAIDA, { recursive: true });

for (const c of cartoes) {
  const html = path.join(temp, `${c.arquivo}.html`);
  const png = path.join(SAIDA, `${c.arquivo}.png`);
  fs.writeFileSync(html, cartao(c));
  const r = spawnSync(
    navegador,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${LARGURA},${ALTURA}`,
      `--user-data-dir=${path.join(temp, 'perfil')}`,
      `--screenshot=${png}`,
      `file:///${html.replace(/\\/g, '/')}`,
    ],
    { encoding: 'utf8', timeout: 60000 }
  );
  if (!fs.existsSync(png)) {
    console.error(`Falhou em ${c.arquivo}:`, r.stderr || r.error);
    process.exit(1);
  }
  const cab = fs.readFileSync(png).subarray(16, 24);
  console.log(`${c.arquivo}.png  ${cab.readUInt32BE(0)}x${cab.readUInt32BE(4)}  ${Math.round(fs.statSync(png).size / 1024)} KB`);
}

fs.rmSync(temp, { recursive: true, force: true });
