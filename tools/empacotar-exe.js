// Gera o aplicativo do Windows (.exe) da Oficina de PCs.
//
//   npm run empacotar:exe
//
// Usa o Neutralino: uma janela nativa que mostra o jogo pelo WebView2 (o motor
// do Edge, que já vem no Windows 10 e 11). Por isso o aplicativo fica pequeno
// (uns 5 MB) e leve, em vez dos ~150 MB de um Electron.
//
// Saída:
//   dist/windows/                      → o app pronto (exe + dados + LEIA-ME)
//   dist/oficina-de-pcs-windows.zip    → o mesmo, zipado para compartilhar
//   public/downloads/...zip            → o site oferece como download

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { gerarHtml } = require('./empacotar-oficina');
const { criarZip } = require('./zip');

const RAIZ = path.join(__dirname, '..');
const caminho = (...partes) => path.join(RAIZ, ...partes);
const PROJETO = caminho('dist', 'app-windows'); // projeto Neutralino (reaproveitado entre builds)
const NOME = 'oficina-de-pcs';

const LEIA_ME = `Oficina de PCs
==============

Para jogar: dê dois cliques em "Oficina de PCs.exe".

- Mantenha os dois arquivos (o .exe e o resources.neu) na MESMA pasta.
- Não precisa de internet nem de instalar nada.
- Windows 10 ou 11 (usa o WebView2, que já vem com o Edge).
- Se o Windows avisar que o programa é desconhecido, clique em
  "Mais informações" e depois em "Executar assim mesmo".

Tecla F liga a tela cheia. O progresso fica salvo no próprio computador.
`;

const configuracao = {
  applicationId: 'br.turma.oficinadepcs',
  version: '1.0.0',
  defaultMode: 'window',
  port: 0,
  documentRoot: '/resources/',
  url: '/',
  enableServer: true,
  enableNativeAPI: false,
  tokenSecurity: 'one-time',
  logging: { enabled: false, writeToLogFile: false },
  nativeAllowList: [],
  modes: {
    window: {
      title: 'Oficina de PCs',
      width: 1280,
      height: 760,
      minWidth: 800,
      minHeight: 520,
      center: true,
      resizable: true,
      maximize: false,
      exitProcessOnClose: true,
      enableInspector: false,
      icon: '/resources/icone.png',
    },
  },
  cli: {
    binaryName: NOME,
    resourcesPath: '/resources/',
    extensionsPath: '/extensions/',
    clientLibrary: '',
    binaryVersion: '6.9.0',
    clientVersion: '6.9.0',
  },
};

// Chama o CLI do Neutralino pelo Node (evita diferenças de npx entre sistemas)
const CLI_NEU = require.resolve('@neutralinojs/neu/bin/neu.js');
const neu = (...argumentos) => {
  execFileSync(process.execPath, [CLI_NEU, ...argumentos], { cwd: PROJETO, stdio: 'inherit' });
};

async function empacotarExe() {
  const html = await gerarHtml();

  // Projeto Neutralino: só os recursos mudam a cada build (os binários ficam em bin/)
  fs.mkdirSync(path.join(PROJETO, 'resources'), { recursive: true });
  fs.writeFileSync(path.join(PROJETO, 'neutralino.config.json'), `${JSON.stringify(configuracao, null, 2)}\n`);
  fs.writeFileSync(path.join(PROJETO, 'resources', 'index.html'), html);
  fs.copyFileSync(caminho('public', 'images', 'oficina', 'gabinete-mid.png'), path.join(PROJETO, 'resources', 'icone.png'));

  if (!fs.existsSync(path.join(PROJETO, 'bin', `${NOME}-win_x64.exe`.replace(NOME, 'neutralino')))) neu('update');
  neu('build');

  // Só o que interessa para o Windows (o build também gera Linux e macOS)
  const gerados = path.join(PROJETO, 'dist', NOME);
  const arquivos = [
    { nome: 'Oficina de PCs.exe', dados: fs.readFileSync(path.join(gerados, `${NOME}-win_x64.exe`)) },
    { nome: 'resources.neu', dados: fs.readFileSync(path.join(gerados, 'resources.neu')) },
    { nome: 'LEIA-ME.txt', dados: Buffer.from(LEIA_ME, 'utf8') },
  ];

  const pasta = caminho('dist', 'windows');
  fs.rmSync(pasta, { recursive: true, force: true });
  fs.mkdirSync(pasta, { recursive: true });
  for (const { nome, dados } of arquivos) fs.writeFileSync(path.join(pasta, nome), dados);

  const zips = [caminho('dist', `${NOME}-windows.zip`), caminho('public', 'downloads', `${NOME}-windows.zip`)];
  let tamanho = 0;
  for (const zip of zips) {
    fs.mkdirSync(path.dirname(zip), { recursive: true });
    tamanho = criarZip(zip, arquivos);
  }

  console.log(`\nAplicativo do Windows pronto (${(tamanho / 1024 / 1024).toFixed(1)} MB no zip):`);
  console.log(`  ${path.relative(RAIZ, pasta)}  (para testar aqui mesmo)`);
  for (const zip of zips) console.log(`  ${path.relative(RAIZ, zip)}`);
}

empacotarExe().catch((erro) => {
  console.error(erro.message || erro);
  process.exit(1);
});
