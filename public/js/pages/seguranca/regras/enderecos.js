/**
 * Leitura de endereços de sites, do jeito que o aluno precisa aprender:
 * o "nome verdadeiro" (domínio) é o que vem logo antes do .com / .com.br,
 * não o começo do endereço.
 *
 *   bancopatria.atualiza-cadastro.com/login → atualiza-cadastro.com
 *   www.megaloja.com.br/ofertas             → megaloja.com.br
 */
const SUFIXOS_DUPLOS = ['com.br', 'edu.br', 'gov.br', 'org.br', 'net.br'];

/** Tira https://, www. e a barra do fim: "Https://www.Site.com/" → "site.com" */
export function normalizarUrl(texto) {
  let url = String(texto ?? '').trim().toLowerCase();
  url = url.replace(/^[a-z]+:\/\//, '').replace(/^www\./, '');
  return url.replace(/\/+$/, '');
}

/** Parte do endereço antes da primeira barra (o "host") */
export function hostDe(url) {
  return normalizarUrl(url).split(/[/?#]/)[0];
}

/** O domínio registrado: as duas últimas partes (ou três, em .com.br) */
export function dominioDe(url) {
  const partes = hostDe(url).split('.').filter(Boolean);
  const duplo = partes.length >= 3 && SUFIXOS_DUPLOS.includes(partes.slice(-2).join('.'));
  return partes.slice(duplo ? -3 : -2).join('.');
}

/** Caminho depois do host ("/login"), sem a barra do começo */
export function caminhoDe(url) {
  const normal = normalizarUrl(url);
  const i = normal.search(/[/?#]/);
  return i === -1 ? '' : normal.slice(i + 1);
}

/** Parece um endereço (tem ponto e nada de espaço)? Senão é uma pesquisa */
export function pareceEndereco(texto) {
  const t = String(texto ?? '').trim();
  return /^[^\s]+\.[a-z]{2,}([/?#].*)?$/i.test(t.replace(/^[a-z]+:\/\//i, ''));
}
