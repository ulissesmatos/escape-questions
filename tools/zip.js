const fs = require('fs');
const zlib = require('zlib');

/**
 * Cria um .zip (formato padrão, com compressão deflate) sem depender de
 * biblioteca externa nem de programa instalado no sistema.
 *
 * arquivos: [{ nome: 'oficina.exe', dados: Buffer }]
 */
function criarZip(destino, arquivos) {
  const locais = [];
  const central = [];
  let posicao = 0;

  for (const { nome, dados } of arquivos) {
    const nomeBytes = Buffer.from(nome, 'utf8');
    const comprimido = zlib.deflateRawSync(dados, { level: 9 });
    const crc = crc32(dados);

    const cabecalho = Buffer.alloc(30);
    cabecalho.writeUInt32LE(0x04034b50, 0); // assinatura
    cabecalho.writeUInt16LE(20, 4); // versão mínima
    cabecalho.writeUInt16LE(0x0800, 6); // nomes em UTF-8
    cabecalho.writeUInt16LE(8, 8); // método: deflate
    cabecalho.writeUInt32LE(0, 10); // data/hora
    cabecalho.writeUInt32LE(crc, 14);
    cabecalho.writeUInt32LE(comprimido.length, 18);
    cabecalho.writeUInt32LE(dados.length, 22);
    cabecalho.writeUInt16LE(nomeBytes.length, 26);
    locais.push(cabecalho, nomeBytes, comprimido);

    const entrada = Buffer.alloc(46);
    entrada.writeUInt32LE(0x02014b50, 0);
    entrada.writeUInt16LE(20, 4);
    entrada.writeUInt16LE(20, 6);
    entrada.writeUInt16LE(0x0800, 8);
    entrada.writeUInt16LE(8, 10);
    entrada.writeUInt32LE(0, 12);
    entrada.writeUInt32LE(crc, 16);
    entrada.writeUInt32LE(comprimido.length, 20);
    entrada.writeUInt32LE(dados.length, 24);
    entrada.writeUInt16LE(nomeBytes.length, 28);
    entrada.writeUInt32LE(posicao, 42); // onde começa o arquivo
    central.push(entrada, nomeBytes);

    posicao += cabecalho.length + nomeBytes.length + comprimido.length;
  }

  const diretorio = Buffer.concat(central);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(arquivos.length, 8);
  fim.writeUInt16LE(arquivos.length, 10);
  fim.writeUInt32LE(diretorio.length, 12);
  fim.writeUInt32LE(posicao, 16);

  fs.writeFileSync(destino, Buffer.concat([...locais, diretorio, fim]));
  return fs.statSync(destino).size;
}

let tabelaCrc = null;
function crc32(buffer) {
  if (!tabelaCrc) {
    tabelaCrc = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      tabelaCrc[i] = c;
    }
  }
  let crc = -1;
  for (const byte of buffer) crc = (crc >>> 8) ^ tabelaCrc[(crc ^ byte) & 0xff];
  return (crc ^ -1) >>> 0;
}

module.exports = { criarZip };
