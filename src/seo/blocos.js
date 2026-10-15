/**
 * Blocos de conteúdo: o texto de uma página é descrito uma única vez, como uma
 * lista de blocos, e sai em dois formatos (HTML para o navegador e Markdown
 * para assistentes de IA que pedem `Accept: text/markdown`).
 *
 *   { tipo: 'titulo',   texto }                      → h2
 *   { tipo: 'subtitulo', texto }                     → h3
 *   { tipo: 'paragrafo', texto }
 *   { tipo: 'lista',    itens: [texto] }
 *   { tipo: 'passos',   itens: [texto] }             → lista numerada
 *   { tipo: 'ficha',    linhas: [[rotulo, valor]] }  → tabela
 *   { tipo: 'perguntas', itens: [[pergunta, resposta]], nivel?: 3 }  → h3 (ou h4)
 *   { tipo: 'links',    itens: [{ texto, href, detalhe }] }
 *   { tipo: 'cartoes',  itens: [{ href, icone, nome, resumo, etiqueta, acao, cores }] }
 *   { tipo: 'nota',     texto }
 */

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}

/** Texto para dentro de uma célula de tabela Markdown */
function celula(texto) {
  return String(texto).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

const HTML = {
  titulo: (b) => `<h2>${escapar(b.texto)}</h2>`,
  subtitulo: (b) => `<h3>${escapar(b.texto)}</h3>`,
  paragrafo: (b) => `<p>${escapar(b.texto)}</p>`,
  nota: (b) => `<p class="nota">${escapar(b.texto)}</p>`,
  lista: (b) => `<ul class="lista-simples">${b.itens.map((i) => `<li>${escapar(i)}</li>`).join('')}</ul>`,
  passos: (b) => `<ol class="lista-passos">${b.itens.map((i) => `<li>${escapar(i)}</li>`).join('')}</ol>`,
  ficha: (b) =>
    `<table class="ficha"><tbody>${b.linhas
      .map(([rotulo, valor]) => `<tr><th scope="row">${escapar(rotulo)}</th><td>${escapar(valor)}</td></tr>`)
      .join('')}</tbody></table>`,
  perguntas: (b) =>
    `<div class="faq">${b.itens.map(([p, r]) => `<h${b.nivel || 3}>${escapar(p)}</h${b.nivel || 3}><p>${escapar(r)}</p>`).join('')}</div>`,
  links: (b) =>
    `<ul class="lista-links">${b.itens
      .map((i) => `<li><a href="${escapar(i.href)}">${escapar(i.texto)}</a>${i.detalhe ? `: ${escapar(i.detalhe)}` : ''}</li>`)
      .join('')}</ul>`,
  cartoes: (b) =>
    `<div class="grid-atividades">${b.itens
      .map(
        (i) => `<a href="${escapar(i.href)}" class="card-atividade" style="--card-cor:${i.cores.cor};--card-cor-light:${i.cores.clara}">
  <div class="card-topo"><span class="card-icone" aria-hidden="true">${i.icone}</span><span class="card-badge card-badge-destaque">${escapar(i.etiqueta)}</span></div>
  <h3>${escapar(i.nome)}</h3>
  <p>${escapar(i.resumo)}</p>
  <div class="card-rodape"><span class="card-acao">${escapar(i.acao)}</span></div>
</a>`
      )
      .join('')}</div>`,
};

const MARKDOWN = {
  titulo: (b) => `## ${b.texto}`,
  subtitulo: (b) => `### ${b.texto}`,
  paragrafo: (b) => b.texto,
  nota: (b) => `*${b.texto}*`,
  lista: (b) => b.itens.map((i) => `- ${i}`).join('\n'),
  passos: (b) => b.itens.map((i, n) => `${n + 1}. ${i}`).join('\n'),
  ficha: (b) => ['| Item | Detalhe |', '| --- | --- |', ...b.linhas.map(([r, v]) => `| ${celula(r)} | ${celula(v)} |`)].join('\n'),
  perguntas: (b) => b.itens.map(([p, r]) => `${'#'.repeat(b.nivel || 3)} ${p}\n\n${r}`).join('\n\n'),
  links: (b) => b.itens.map((i) => `- [${i.texto}](${i.href})${i.detalhe ? `: ${i.detalhe}` : ''}`).join('\n'),
  cartoes: (b) => b.itens.map((i) => `- [${i.nome}](${i.href}): ${i.resumo}`).join('\n'),
};

function paraHtml(blocos) {
  return blocos.map((b) => HTML[b.tipo](b)).join('\n');
}

/** No Markdown os links relativos viram absolutos: o texto sai do contexto da página. */
function paraMarkdown(blocos, { absoluta = (c) => c } = {}) {
  const comLinksAbsolutos = blocos.map((b) => {
    if (b.tipo === 'links' || b.tipo === 'cartoes') {
      return { ...b, itens: b.itens.map((i) => ({ ...i, href: i.href.startsWith('/') ? absoluta(i.href) : i.href })) };
    }
    return b;
  });
  return comLinksAbsolutos.map((b) => MARKDOWN[b.tipo](b)).join('\n\n');
}

module.exports = { escapar, paraHtml, paraMarkdown };
