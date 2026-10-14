/**
 * Baixa os ícones reais usados pela Operação Word e grava no projeto.
 * Rodar só quando quiser trocar/adicionar ícones (o resultado fica no git):
 *
 *   node tools/baixar-icones-word.js
 *
 * Fontes (todas com licença livre; os logotipos continuam sendo marcas da
 * Microsoft, usados aqui só para o aluno reconhecer os programas):
 * - Fluent UI System Icons (MIT): os ícones da faixa de opções do Office.
 *   Os monocromáticos viram um módulo JS (iconesFluent.js) para herdar a cor
 *   do texto; os coloridos viram arquivos .svg.
 * - Fluent Emoji (MIT): pastas, lixeira e arquivos no estilo do Windows 11.
 * - Wikimedia Commons: logotipos do Word, Windows, Bloco de Notas e Edge.
 */
const fs = require('fs');
const path = require('path');

const FLUENT = 'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons@1.1.324/icons';
const EMOJI = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@62ecdc0d7ca5c6df32148c169556bc8d3782fca4/assets';
const COMMONS = 'https://upload.wikimedia.org/wikipedia/commons';

const RAIZ = path.join(__dirname, '..', 'public');
const PASTA_IMAGENS = path.join(RAIZ, 'images', 'word', 'icones');
const MODULO = path.join(RAIZ, 'js', 'pages', 'word', 'sistema', 'iconesFluent.js');

// Monocromáticos (20 px, traço fino como na faixa do Word)
const MONO = [
  'clipboard_paste', 'cut', 'copy', 'paint_brush', 'text_bold', 'text_italic', 'text_underline', 'text_strikethrough',
  'text_subscript', 'text_superscript', 'text_change_case', 'text_color', 'highlight', 'text_clear_formatting',
  'text_bullet_list_ltr', 'text_number_list_ltr', 'text_indent_decrease_ltr', 'text_indent_increase_ltr',
  'text_align_left', 'text_align_center', 'text_align_right', 'text_align_justify', 'text_line_spacing',
  'text_paragraph', 'search', 'arrow_swap', 'image', 'table', 'document_page_break', 'document_header',
  'document_footer', 'document_page_number', 'link', 'math_symbols', 'shapes', 'textbox', 'document_margins',
  'document_landscape', 'orientation', 'text_column_two', 'text_proofing_tools', 'text_word_count', 'save',
  'arrow_undo', 'arrow_redo', 'print', 'document_pdf', 'folder', 'folder_open', 'folder_add', 'delete',
  'bin_recycle', 'document', 'document_text', 'document_add', 'arrow_left', 'arrow_right', 'arrow_up',
  'chevron_down', 'chevron_right', 'chevron_up', 'more_horizontal', 'dismiss', 'subtract', 'maximize',
  'square_multiple', 'share', 'comment', 'person', 'settings', 'power', 'wifi_1', 'speaker_2', 'lightbulb',
  'text_font', 'text_font_size', 'text_effects', 'document_one_page', 'zoom_in', 'zoom_out', 'ruler', 'eye',
  'select_all_on', 'rename', 'open', 'document_copy', 'color_fill', 'table_insert_row', 'table_delete_row',
  'table_insert_column', 'table_add', 'image_add', 'info', 'question_circle', 'checkmark', 'add', 'home',
  'arrow_clockwise', 'arrow_counterclockwise', 'arrow_sort', 'grid', 'apps', 'calendar_ltr', 'text_t',
  'navigation', 'panel_left', 'arrow_download', 'desktop', 'arrow_reset', 'clock', 'star', 'text_quote',
  'resize_image', 'text_wrap', 'battery_10', 'mic', 'emoji', 'pin', 'arrow_maximize', 'keyboard',
  'text_case_uppercase', 'text_case_lowercase', 'text_case_title', 'document_header_footer', 'list',
  'text_bullet_list_square', 'checkbox_checked', 'arrow_export_ltr', 'sparkle', 'text_grammar_wand',
  'cursor_click', 'book_open', 'text_header_1', 'document_bullet_list',
];

// Coloridos (botões grandes da faixa, Explorador e janelas)
const COR = ['image_32_color', 'table_32_color', 'clipboard_32_color', 'link_32_color', 'paint_brush_32_color',
  'document_text_48_color', 'document_48_color', 'image_48_color', 'lightbulb_24_color', 'checkmark_circle_24_color',
  'warning_24_color', 'question_circle_24_color', 'star_24_color', 'settings_24_color', 'person_48_color',
  'home_24_color', 'comment_24_color'];

const EMOJIS = {
  pasta: 'File folder/Color/file_folder_color.svg',
  'pasta-aberta': 'Open file folder/Color/open_file_folder_color.svg',
  lixeira: 'Wastebasket/Color/wastebasket_color.svg',
  pagina: 'Page facing up/Color/page_facing_up_color.svg',
  quadro: 'Framed picture/Color/framed_picture_color.svg',
  computador: 'Desktop computer/Color/desktop_computer_color.svg',
  agente: 'Detective/Default/Color/detective_color_default.svg',
  medalha: 'Sports medal/Color/sports_medal_color.svg',
  trofeu: 'Trophy/Color/trophy_color.svg',
  cadeado: 'Locked/Color/locked_color.svg',
  satelite: 'Satellite antenna/Color/satellite_antenna_color.svg',
};

const LOGOS = {
  word: '1/19/Microsoft_Office_Word_%282019%E2%80%932025%29.svg',
  windows: '8/87/Windows_logo_-_2021.svg',
  'bloco-de-notas': '0/07/Notepad_Win11.svg',
  edge: '9/98/Microsoft_Edge_logo_%282019%29.svg',
};

const AGENTE = { 'User-Agent': 'OperacaoWord/1.0 (projeto escolar; ferramenta de download de icones)' };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Baixa com até 4 tentativas (CDNs limitam muitos downloads seguidos); 404 desiste na hora */
async function baixar(url) {
  let ultimoErro;
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    try {
      const resposta = await fetch(url, { headers: AGENTE, signal: AbortSignal.timeout(20000) });
      if (resposta.ok) return await resposta.text();
      if (resposta.status === 404) throw Object.assign(new Error(`404 em ${url}`), { definitivo: true });
      ultimoErro = new Error(`${resposta.status} em ${url}`);
    } catch (erro) {
      if (erro.definitivo) throw erro;
      ultimoErro = erro;
    }
    await esperar(2000 * tentativa);
  }
  throw ultimoErro;
}

/** Tira comentários, DOCTYPE e metadados do Illustrator para o arquivo ficar pequeno */
function limparSvg(texto) {
  return texto
    .replace(/<\?xml[^>]*>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!DOCTYPE[\s\S]*?\]>/g, '')
    .replace(/<!DOCTYPE[^>]*>/g, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/g, '')
    .replace(/<sodipodi:[\s\S]*?\/>/g, '')
    .replace(/\s[\w:]+="&[\w.]+;"/g, '') // atributos que usavam entidades do DOCTYPE do Illustrator
    .replace(/\s+/g, ' ')
    .replace(/> </g, '><')
    .trim();
}

async function main() {
  fs.mkdirSync(PASTA_IMAGENS, { recursive: true });
  fs.mkdirSync(path.dirname(MODULO), { recursive: true });

  const icones = {};
  const faltando = [];
  for (const nome of MONO) {
    try {
      const svg = await baixar(`${FLUENT}/${nome}_20_regular.svg`);
      icones[nome] = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1].replace(/\s+/g, ' ').trim();
    } catch {
      faltando.push(nome);
    }
  }
  const linhas = Object.entries(icones).map(([nome, miolo]) => `  ${JSON.stringify(nome)}: ${JSON.stringify(miolo)},`);
  fs.writeFileSync(
    MODULO,
    `// Gerado por tools/baixar-icones-word.js — não edite à mão.\n` +
      `// Fluent UI System Icons (MIT) © Microsoft: https://github.com/microsoft/fluentui-system-icons\n` +
      `// Cada valor é o conteúdo de um <svg viewBox="0 0 20 20">.\n` +
      `export const ICONES = {\n${linhas.join('\n')}\n};\n`
  );
  console.log(`${Object.keys(icones).length} ícones monocromáticos → ${path.relative(RAIZ, MODULO)}`);
  if (faltando.length) console.log('Não encontrados:', faltando.join(', '));

  for (const nome of COR) {
    try {
      fs.writeFileSync(path.join(PASTA_IMAGENS, `${nome.replace(/_/g, '-')}.svg`), limparSvg(await baixar(`${FLUENT}/${nome}.svg`)));
    } catch (erro) {
      console.log('Sem ícone colorido:', nome, erro.message);
    }
  }
  for (const [arquivo, caminho] of Object.entries(EMOJIS)) {
    try {
      fs.writeFileSync(path.join(PASTA_IMAGENS, `${arquivo}.svg`), limparSvg(await baixar(`${EMOJI}/${encodeURI(caminho)}`)));
    } catch (erro) {
      console.log('Sem emoji:', arquivo, erro.message);
    }
  }
  for (const [arquivo, caminho] of Object.entries(LOGOS)) {
    fs.writeFileSync(path.join(PASTA_IMAGENS, `logo-${arquivo}.svg`), limparSvg(await baixar(`${COMMONS}/${caminho}`)));
    await esperar(1500); // o Commons limita downloads seguidos
  }
  console.log('Imagens →', path.relative(RAIZ, PASTA_IMAGENS));
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
