/**
 * Corretor ortográfico do Word simulado. Não é um dicionário completo: marca
 * erros comuns de alunos (e os das missões) e palavras com letra repetida no
 * fim ("computadorr"), para o sublinhado vermelho e as sugestões do botão
 * direito funcionarem como no Word de verdade, sem marcar palavras certas.
 */
const ERROS = {
  // usados nas missões
  'mençagem': ['mensagem', 'mensagens'],
  secretu: ['secreto', 'secreta', 'secretos'],
  'tanbém': ['também'],
  'inpossível': ['impossível', 'impossíveis'],
  inpossivel: ['impossível'],
  agenti: ['agente', 'agentes'],
  // comuns
  computadorr: ['computador'],
  tambem: ['também'],
  voce: ['você'],
  nao: ['não'],
  entao: ['então'],
  exesso: ['excesso'],
  excessão: ['exceção'],
  excessao: ['exceção'],
  concerteza: ['com certeza'],
  derrepente: ['de repente'],
  enchergar: ['enxergar'],
  previlégio: ['privilégio'],
  mortandela: ['mortadela'],
  beneficiente: ['beneficente'],
  advinhar: ['adivinhar'],
  iorgute: ['iogurte'],
  cabelereiro: ['cabeleireiro'],
  bicabornato: ['bicarbonato'],
  asterístico: ['asterisco'],
  impecilho: ['empecilho'],
  mendingo: ['mendigo'],
  pobrema: ['problema'],
  menas: ['menos'],
  seje: ['seja'],
  esteje: ['esteja'],
  ancioso: ['ansioso'],
  paralizar: ['paralisar'],
  analizar: ['analisar'],
  pesquizar: ['pesquisar'],
  rúbrica: ['rubrica'],
  ezemplo: ['exemplo'],
  exelente: ['excelente'],
  porisso: ['por isso'],
  apartir: ['a partir'],
};

const LETRA = /[\p{L}]/u;

/** Sugestões para a palavra, ou null se ela está certa */
export function sugestoes(palavra) {
  const p = String(palavra).toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ERROS, p)) return ERROS[p].map((s) => manterMaiuscula(palavra, s));
  // "computadorr", "casaa": letra repetida no fim de palavra longa. Ficam de
  // fora as duplas que aparecem em palavras estrangeiras (coffee, class, jazz...)
  if (p.length >= 6 && /([raiumndtbcgpvã])$/u.test(p)) return [manterMaiuscula(palavra, p.slice(0, -1))];
  return null;
}

function manterMaiuscula(original, sugestao) {
  if (original === original.toUpperCase() && original.length > 1) return sugestao.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return sugestao[0].toUpperCase() + sugestao.slice(1);
  return sugestao;
}

/** Palavras com erro num texto: [{ palavra, inicio, fim, sugestoes }] */
export function errosNoTexto(texto) {
  const erros = [];
  const re = /[\p{L}\p{M}]+(?:[-'][\p{L}\p{M}]+)*/gu;
  let m;
  while ((m = re.exec(texto))) {
    if (!LETRA.test(m[0])) continue;
    const lista = sugestoes(m[0]);
    if (lista) erros.push({ palavra: m[0], inicio: m.index, fim: m.index + m[0].length, sugestoes: lista });
  }
  return erros;
}

/** Texto do =rand() do Word em português (5 parágrafos, 3 frases cada) */
export const TEXTO_RAND = [
  'O vídeo fornece uma maneira poderosa de ajudar você a provar seu argumento. Ao clicar em Vídeo Online, você pode colar o código de inserção do vídeo que deseja adicionar. Você também pode digitar uma palavra-chave para pesquisar online o vídeo mais adequado ao seu documento.',
  'Para dar ao documento uma aparência profissional, o Word fornece designs de cabeçalho, rodapé, folha de rosto e caixa de texto que se complementam entre si. Por exemplo, você pode adicionar uma folha de rosto, um cabeçalho e uma barra lateral correspondentes. Clique em Inserir e escolha os elementos desejados nas diferentes galerias.',
  'Temas e estilos também ajudam a manter seu documento coordenado. Quando você clica em Design e escolhe um novo tema, as imagens, gráficos e elementos gráficos SmartArt são alterados para corresponder ao novo tema. Quando você aplica estilos, os títulos são alterados para coincidir com o novo tema.',
  'Economize tempo no Word com novos botões que são mostrados no local em que você precisa deles. Para alterar a maneira como uma imagem se ajusta ao seu documento, clique nela e um botão de opções de layout será exibido ao lado dela. Quando você trabalha em uma tabela, clique onde deseja adicionar uma linha ou coluna e clique no sinal de mais.',
  'A leitura também é mais fácil no novo modo de exibição de leitura. Você pode recolher partes do documento e se concentrar no texto desejado. Se você precisar parar de ler antes de chegar ao final, o Word se lembrará de onde você parou, até mesmo em outro dispositivo.',
];

/** =rand(p,f): p parágrafos com f frases (padrão 5 e 3), como no Word */
export function textoRand(paragrafos = 5, frases = 3) {
  const p = Math.max(1, Math.min(20, paragrafos));
  const f = Math.max(1, Math.min(10, frases));
  return Array.from({ length: p }, (_, i) => {
    const sentencas = TEXTO_RAND[i % TEXTO_RAND.length].match(/[^.]+\./g);
    return Array.from({ length: f }, (_, j) => sentencas[j % sentencas.length].trim()).join(' ');
  });
}
