// Gera a versão para baixar da Oficina de PCs: um único arquivo .html com o
// jogo, a arte e a fonte embutidos. Abre com dois cliques e roda sem internet
// e sem servidor (nada de node, nada de instalar).
//
//   npm run empacotar
//
// Saída: dist/oficina-de-pcs.html (e uma cópia em public/downloads/, que o
// site oferece como download).

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const RAIZ = path.join(__dirname, '..');
const caminho = (...partes) => path.join(RAIZ, ...partes);
const ARTE = caminho('public', 'images', 'oficina');
const SAIDAS = [caminho('dist', 'oficina-de-pcs.html'), caminho('public', 'downloads', 'oficina-de-pcs.html')];

/** O jogo pede o Phaser por /vendor/phaser (servido pelo site); aqui vem do node_modules */
const phaserLocal = {
  name: 'phaser-local',
  setup(build) {
    build.onResolve({ filter: /^\/vendor\/phaser\// }, () => ({
      path: path.join(path.dirname(require.resolve('phaser/package.json')), 'dist', 'phaser.esm.min.js'),
    }));
  },
};

function lerArte() {
  const imagens = {};
  for (const arquivo of fs.readdirSync(ARTE).filter((a) => a.endsWith('.png'))) {
    const chave = arquivo.replace(/\.png$/, '');
    imagens[chave] = `data:image/png;base64,${fs.readFileSync(path.join(ARTE, arquivo)).toString('base64')}`;
  }
  return imagens;
}

function lerZonas() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ARTE, 'zonas.json'), 'utf8'));
  } catch {
    return {};
  }
}

function fonteEmbutida() {
  const arquivo = caminho('public', 'fonts', 'dotgothic16-latin.woff2');
  if (!fs.existsSync(arquivo)) return '';
  const base64 = fs.readFileSync(arquivo).toString('base64');
  return `@font-face {
      font-family: 'DotGothic16';
      font-style: normal;
            src: url(data:font/woff2;base64,${base64}) format('woff2');
    }`;
}

async function gerarHtml() {
  const imagens = lerArte();
  const zonas = lerZonas();
  const entrada = caminho('dist', 'entrada-offline.js');
  fs.mkdirSync(caminho('dist'), { recursive: true });
  fs.writeFileSync(entrada, `
import { criarJogo } from ${JSON.stringify(caminho('public/js/pages/oficina/jogo/criarJogo.js'))};
import { aplicarZonas } from ${JSON.stringify(caminho('public/js/pages/oficina/jogo/sprites/zonas.js'))};

const IMAGENS = ${JSON.stringify(imagens)};
const ZONAS = ${JSON.stringify(zonas)};

if (Object.keys(ZONAS).length) aplicarZonas(ZONAS);
document.fonts.load('16px "DotGothic16"').catch(() => null).then(() => {
  document.querySelector('.carregando').remove();
  window.jogoOficina = criarJogo(document.getElementById('jogo'), { spritesDisponiveis: Object.keys(IMAGENS), fontesDeSprite: IMAGENS });
});
`);

  const { outputFiles } = await esbuild.build({
    entryPoints: [entrada],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    minify: true,
    legalComments: 'none',
    plugins: [phaserLocal],
    write: false,
    outfile: 'jogo.js',
  });
  fs.unlinkSync(entrada);

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Oficina de PCs</title>
  <style>
    ${fonteEmbutida()}
    html, body { height: 100%; margin: 0; background: #12152a; color: #f1f3fb; font-family: 'DotGothic16', system-ui, sans-serif; }
    body { display: grid; place-items: center; }
    #jogo { width: 100vw; height: 100vh; }
    #jogo canvas { display: block; }
    .carregando { position: absolute; font-size: 20px; color: #a9b0cf; }
  </style>
</head>
<body>
  <p class="carregando">Abrindo a oficina...</p>
  <div id="jogo"></div>
  <script type="module">
${outputFiles[0].text}
  </script>
</body>
</html>
`;

  for (const saida of SAIDAS) {
    fs.mkdirSync(path.dirname(saida), { recursive: true });
    fs.writeFileSync(saida, html);
  }
  const tamanho = (Buffer.byteLength(html) / 1024 / 1024).toFixed(1);
  console.log(`Oficina de PCs empacotada (${tamanho} MB, ${Object.keys(imagens).length} imagens):`);
  for (const saida of SAIDAS) console.log(`  ${path.relative(RAIZ, saida)}`);
  return html;
}

module.exports = { gerarHtml };

if (require.main === module) {
  gerarHtml().catch((erro) => {
    console.error(erro);
    process.exit(1);
  });
}
