import { LAYOUT_PLACAS, LAYOUT_GABINETES } from './manifesto.js';

/**
 * Zonas de encaixe desenhadas sobre a arte (frações 0–1 da imagem).
 *
 * Os valores padrão ficam no manifesto. O editor visual (oficina-zonas.html)
 * grava só o que foi ajustado em /images/oficina/zonas.json, junto das
 * imagens; o jogo aplica esse arquivo por cima dos padrões ao abrir.
 * Usado pelo jogo, pelo editor e pelo servidor (que valida antes de gravar).
 */

export const ARQUIVO_ZONAS = '/images/oficina/zonas.json';

export const GRUPOS_DE_ZONAS = {
  placas: { nome: 'Placas-mãe', layouts: LAYOUT_PLACAS },
  gabinetes: { nome: 'Gabinetes', layouts: LAYOUT_GABINETES },
};

/** Nome de cada tipo de zona (as listas, como `ram`, ganham o número do slot) */
const CAMPOS_DE_ZONA = {
  socket: { nome: 'Socket do processador', curto: 'Socket' },
  ram: { nome: 'Slot de memória', curto: 'RAM' },
  m2: { nome: 'Slot M.2', curto: 'M.2' },
  pcie: { nome: 'Slot PCI Express', curto: 'PCIe' },
  conector24: { nome: 'Conector de energia 24 pinos', curto: '24 pinos' },
  conectorCpu: { nome: 'Conector de energia do processador', curto: 'CPU' },
  placa: { nome: 'Espaço da placa-mãe', curto: 'Placa-mãe' },
  fonte: { nome: 'Baia da fonte', curto: 'Fonte' },
  sata: { nome: 'Baia SATA', curto: 'SATA' },
};

// Capturado ao carregar o módulo, antes de qualquer ajuste ser aplicado
const PADRAO = {
  placas: structuredClone(LAYOUT_PLACAS),
  gabinetes: structuredClone(LAYOUT_GABINETES),
};

export function zonasPadrao(grupo, chave) {
  return structuredClone(PADRAO[grupo][chave]);
}

/** Cópia de todos os layouts em uso: { placas: {...}, gabinetes: {...} } */
export function layoutsEmUso() {
  return Object.fromEntries(Object.entries(GRUPOS_DE_ZONAS).map(([grupo, { layouts }]) => [grupo, structuredClone(layouts)]));
}

/** Lista plana das zonas de um layout: [{ id: 'ram.1', campo: 'ram', indice: 1, nome, curto, ret }] */
export function listarZonas(layout) {
  const zonas = [];
  for (const [campo, valor] of Object.entries(layout)) {
    const { nome, curto } = CAMPOS_DE_ZONA[campo] || { nome: campo, curto: campo };
    if (Array.isArray(valor[0])) {
      valor.forEach((ret, indice) => zonas.push({ id: `${campo}.${indice}`, campo, indice, nome: `${nome} ${indice + 1}`, curto: `${curto} ${indice + 1}`, ret }));
    } else {
      zonas.push({ id: campo, campo, indice: null, nome, curto, ret: valor });
    }
  }
  return zonas;
}

function partesDoId(id) {
  const [campo, indice] = id.split('.');
  return { campo, indice: indice === undefined ? null : Number(indice) };
}

export function lerZona(layout, id) {
  const { campo, indice } = partesDoId(id);
  return indice === null ? layout[campo] : layout[campo][indice];
}

export function escreverZona(layout, id, ret) {
  const { campo, indice } = partesDoId(id);
  if (indice === null) layout[campo] = ret;
  else layout[campo][indice] = ret;
}

export function zonaPadrao(grupo, chave, id) {
  return structuredClone(lerZona(PADRAO[grupo][chave], id));
}

const arredondar = (valor) => Math.round(valor * 10000) / 10000;
const ehObjeto = (valor) => Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);

function retanguloValido(valor) {
  if (!Array.isArray(valor) || valor.length !== 4 || !valor.every(Number.isFinite)) return null;
  const [x, y, w, h] = valor.map(arredondar);
  const dentro = x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 1.0001 && y + h <= 1.0001;
  return dentro ? [x, y, w, h] : null;
}

/**
 * Confere zonas (vindas do editor ou do arquivo) contra os layouts padrão:
 * só imagens e campos conhecidos, com a mesma quantidade de slots e
 * retângulos dentro da imagem. Devolve { zonas, avisos } com uma cópia limpa.
 * No modo tolerante, o que não serve é ignorado (e explicado em `avisos`).
 */
export function validarZonas(dados, { tolerante = false } = {}) {
  const avisos = [];
  const problema = (mensagem) => {
    if (!tolerante) throw new Error(mensagem);
    avisos.push(mensagem);
  };
  const zonas = {};
  if (!ehObjeto(dados)) {
    problema('O arquivo de zonas precisa ser um objeto JSON.');
    return { zonas, avisos };
  }

  for (const [grupo, imagens] of Object.entries(dados)) {
    if (!PADRAO[grupo] || !ehObjeto(imagens)) {
      problema(`Grupo desconhecido: "${grupo}".`);
      continue;
    }
    for (const [chave, layout] of Object.entries(imagens)) {
      const padrao = PADRAO[grupo][chave];
      if (!padrao || !ehObjeto(layout)) {
        problema(`Imagem desconhecida: "${chave}".`);
        continue;
      }
      for (const [campo, valor] of Object.entries(layout)) {
        const referencia = padrao[campo];
        if (referencia === undefined) {
          problema(`${chave}: zona desconhecida "${campo}".`);
          continue;
        }
        let limpo;
        if (Array.isArray(referencia[0])) {
          const lista = Array.isArray(valor) && valor.length === referencia.length ? valor.map(retanguloValido) : null;
          if (!lista || lista.includes(null)) {
            problema(`${chave}: "${campo}" precisa de ${referencia.length} retângulos dentro da imagem.`);
            continue;
          }
          limpo = lista;
        } else {
          limpo = retanguloValido(valor);
          if (!limpo) {
            problema(`${chave}: "${campo}" precisa ser [x, y, largura, altura] dentro da imagem.`);
            continue;
          }
        }
        zonas[grupo] ??= {};
        zonas[grupo][chave] ??= {};
        zonas[grupo][chave][campo] = limpo;
      }
    }
  }
  return { zonas, avisos };
}

/** Aplica o zonas.json por cima dos padrões (o que não estiver no arquivo continua padrão) */
export function aplicarZonas(dados) {
  const { zonas } = validarZonas(dados);
  for (const [grupo, { layouts }] of Object.entries(GRUPOS_DE_ZONAS)) {
    for (const chave of Object.keys(PADRAO[grupo])) {
      layouts[chave] = { ...zonasPadrao(grupo, chave), ...structuredClone(zonas[grupo]?.[chave] || {}) };
    }
  }
}

/** Só os campos que mudaram em relação ao padrão (é isso que vai para o arquivo) */
export function diferencasDoPadrao(layoutsPorGrupo) {
  const saida = {};
  for (const [grupo, imagens] of Object.entries(layoutsPorGrupo)) {
    for (const [chave, layout] of Object.entries(imagens)) {
      for (const [campo, valor] of Object.entries(layout)) {
        if (JSON.stringify(valor) === JSON.stringify(PADRAO[grupo]?.[chave]?.[campo])) continue;
        saida[grupo] ??= {};
        saida[grupo][chave] ??= {};
        saida[grupo][chave][campo] = valor;
      }
    }
  }
  return saida;
}

/** JSON legível, com cada retângulo numa linha só (diffs pequenos no Git) */
export function formatarZonas(zonas) {
  const texto = JSON.stringify(zonas, null, 2);
  return `${texto.replace(/\[\s+(-?[\d.e-]+),\s+(-?[\d.e-]+),\s+(-?[\d.e-]+),\s+(-?[\d.e-]+)\s+\]/g, '[$1, $2, $3, $4]')}\n`;
}
