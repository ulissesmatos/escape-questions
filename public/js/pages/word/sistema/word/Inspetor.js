import { estiloCalculado, todosOsBlocos } from './Formatacao.js';
import { CM } from './Paginas.js';
import { estiloDoBloco, mapaDoBloco } from './Documento.js';
import { contarPalavras } from '../../regras/missoes.js';

/** Sem acento e minúsculo, letra por letra (mesmo tamanho do original) */
const dobrar = (t) => [...String(t)].map((c) => c.normalize('NFD')[0].toLowerCase()).join('');
const comparavel = (t) => dobrar(t).replace(/\s+/g, ' ').trim();

/**
 * Lê o documento como o aluno vê na tela, para os objetivos das missões:
 * texto, estilo de um trecho, parágrafo, imagens, tabelas, páginas...
 * O sumário (gerado pelo Word) fica de fora do texto.
 */
export class Inspetor {
  constructor(documento) {
    this.d = documento;
  }

  blocos() {
    return todosOsBlocos(this.d.corpo).filter((b) => !b.closest('.doc-sumario'));
  }

  texto() {
    return this.blocos()
      .map((b) => mapaDoBloco(b).texto)
      .join('\n');
  }

  contem(trecho) {
    return comparavel(this.texto()).includes(comparavel(trecho));
  }

  /** Primeira ocorrência: { bloco, intervalo } (sem diferenciar maiúsculas e acentos) */
  achar(trecho) {
    return this.acharTodas(trecho)[0] || null;
  }

  acharTodas(trecho) {
    const alvo = dobrar(trecho);
    if (!alvo.trim()) return [];
    const lista = [];
    for (const bloco of this.blocos()) {
      const mapa = mapaDoBloco(bloco);
      const texto = dobrar(mapa.texto);
      let i = texto.indexOf(alvo);
      while (i >= 0) {
        lista.push({ bloco, mapa, inicio: i, fim: i + alvo.length });
        i = texto.indexOf(alvo, i + alvo.length);
      }
    }
    return lista;
  }

  estiloDe({ mapa, inicio, fim }) {
    const estilos = mapa.nos
      .filter(({ no, inicio: ini }) => ini < fim && ini + no.data.length > inicio)
      .map(({ no }) => estiloCalculado(no, this.d.corpo));
    if (!estilos.length) return null;
    const igual = (k) => (estilos.every((e) => JSON.stringify(e[k]) === JSON.stringify(estilos[0][k])) ? estilos[0][k] : null);
    return {
      negrito: estilos.every((e) => e.negrito),
      italico: estilos.every((e) => e.italico),
      sublinhado: estilos.every((e) => e.sublinhado),
      tachado: estilos.every((e) => e.tachado),
      fonte: igual('fonte'),
      tamanho: igual('tamanho'),
      cor: igual('cor'),
      realce: igual('realce'),
    };
  }

  /** Estilo do trecho (todas as letras): { negrito, italico, sublinhado, fonte, tamanho, cor, realce } */
  estilo(trecho) {
    const achado = this.achar(trecho);
    return achado ? this.estiloDe(achado) : null;
  }

  ocorrencias(trecho) {
    return this.acharTodas(trecho).map((a) => this.estiloDe(a));
  }

  contarOcorrencias(trecho) {
    return this.acharTodas(trecho).length;
  }

  /** Parágrafo onde o trecho aparece */
  paragrafo(trecho) {
    const achado = this.achar(trecho);
    return achado ? this.descreverBloco(achado.bloco) : null;
  }

  descreverBloco(bloco) {
    const cs = getComputedStyle(bloco);
    const alinhamento = { start: 'left', end: 'right', left: 'left', right: 'right', center: 'center', justify: 'justify' }[cs.textAlign] || 'left';
    const estilos = mapaDoBloco(bloco).nos.filter(({ no }) => no.data.trim()).map(({ no }) => estiloCalculado(no, this.d.corpo));
    const chave = (e) => JSON.stringify([e.fonte, e.tamanho, e.negrito, e.italico, e.sublinhado, e.cor, e.realce]);
    const lista = bloco.tagName === 'LI' ? (bloco.parentElement.tagName === 'OL' ? 'numerada' : 'marcadores') : null;
    return {
      texto: bloco.textContent,
      alinhamento,
      recuoPrimeiraLinhaCm: (parseFloat(cs.textIndent) || 0) / CM,
      recuoEsquerdoCm: (parseFloat(cs.marginLeft) || 0) / CM,
      entreLinhas: Number(bloco.dataset.entreLinhas || 1.08),
      estilo: estiloDoBloco(bloco),
      lista,
      uniforme: estilos.every((e) => chave(e) === chave(estilos[0] || e)),
      colorido: estilos.some((e) => !e.cor || e.cor.some((v) => v > 70) || e.realce),
      pagina: this.d.paginas.paginaDe(bloco),
    };
  }

  imagens() {
    return [...this.d.corpo.querySelectorAll('img')].map((img) => {
      const bloco = img.closest('p, li, h1, h2, h3');
      const cs = bloco ? getComputedStyle(bloco) : null;
      return {
        nome: img.dataset.arquivo || img.alt || '',
        larguraCm: img.offsetWidth / CM,
        alinhamento: cs ? { start: 'left', end: 'right' }[cs.textAlign] || cs.textAlign : 'left',
        pagina: this.d.paginas.paginaDe(img),
      };
    });
  }

  tabelas() {
    return [...this.d.corpo.querySelectorAll('table')].map((t) => {
      const linhas = [...t.rows];
      const celulas = linhas.map((tr) => [...tr.cells].map((td) => td.textContent.trim()));
      const textosLinha0 = linhas[0] ? [...linhas[0].cells].flatMap((td) => mapaDoBloco(td).nos.filter(({ no }) => no.data.trim())) : [];
      return {
        linhas: linhas.length,
        colunas: Math.max(0, ...linhas.map((tr) => tr.cells.length)),
        celulas,
        primeiraLinhaNegrito: textosLinha0.length > 0 && textosLinha0.every(({ no }) => estiloCalculado(no, this.d.corpo).negrito),
      };
    });
  }

  /** O trecho começa numa página nova por causa de uma quebra de página? */
  comecaPaginaNova(trecho) {
    const achado = this.achar(trecho);
    if (!achado) return false;
    let topo = achado.bloco;
    while (topo && topo.parentNode !== this.d.corpo) topo = topo.parentNode;
    let anterior = topo?.previousElementSibling;
    while (anterior && /^(P|H\d)$/.test(anterior.tagName) && !anterior.textContent.trim() && !anterior.querySelector('img')) anterior = anterior.previousElementSibling;
    return Boolean(anterior?.classList.contains('doc-quebra'));
  }

  /** Maior sequência de parágrafos vazios seguidos (Enter, Enter, Enter...) */
  paragrafosVaziosSeguidos() {
    let maior = 0;
    let atual = 0;
    for (const el of this.d.corpo.children) {
      if (el.tagName === 'P' && !el.textContent.trim() && !el.querySelector('img')) maior = Math.max(maior, ++atual);
      else atual = 0;
    }
    return maior;
  }

  paginas() {
    return this.d.paginas.total;
  }

  links() {
    return [...this.d.corpo.querySelectorAll('a[href]')].map((a) => ({ texto: a.textContent, url: a.getAttribute('href') }));
  }

  /** Sumário: entradas e se está em dia com os títulos e as páginas */
  sumario() {
    const s = this.d.corpo.querySelector('.doc-sumario');
    if (!s) return null;
    const guardadas = JSON.parse(s.dataset.entradas || '[]');
    const atuais = this.d.titulos().map((t) => [t.texto, t.pagina]);
    return { entradas: guardadas.map(([texto]) => texto), atualizado: JSON.stringify(guardadas) === JSON.stringify(atuais) };
  }

  errosOrtografia() {
    return this.d.erros().map((e) => e.palavra);
  }

  contarPalavras() {
    return contarPalavras(this.texto());
  }
}
